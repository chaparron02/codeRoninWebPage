import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { router as apiRouter } from './routes/api.js';
import { router as healthRouter } from './routes/health.js';
import { formsApiRouter, formsWebRouter } from './routes/forms.js';
import { router as authRouter } from './routes/auth.js';
import { router as userRouter } from './routes/user.js';
import { router as instructorRouter } from './routes/instructor.js';
import { router as adminRouter } from './routes/admin.js';
import { router as reportsRouter } from './routes/reports.js';
import { extractToken, verifyToken } from './utils/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend', 'public');
const STORAGE_DIR = path.join(ROOT_DIR, 'backend', 'storage');
const MATERIAL_DIR = path.join(STORAGE_DIR, 'material');
const PUBLIC_MATERIAL_DIR = path.join(FRONTEND_DIR, 'material');

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
    contentSecurityPolicy: false, // CSP already enforced at the frontend
  }));
  app.use(cors({
    origin: 'https://coderonin.site',
    credentials: true,
  }));
  app.options('*', cors({
    origin: 'https://coderonin.site',
    credentials: true,
  }));
  app.use(express.json());
  app.use(morgan('dev'));

  app.use((req, res, next) => {
    const raw = req.originalUrl || req.url || '';
    try {
      const decoded = decodeURIComponent(raw);
      if (decoded.includes('..')) {
        if (req.path && req.path.startsWith('/api')) {
          return res.status(400).json({ error: 'Invalid path' });
        }
        return res.status(400).send('Invalid path');
      }
    } catch {
      return res.status(400).send('Invalid path encoding');
    }
    next();
  });

  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
  if (!fs.existsSync(MATERIAL_DIR)) {
    fs.mkdirSync(MATERIAL_DIR, { recursive: true });
  }
  if (!fs.existsSync(PUBLIC_MATERIAL_DIR)) {
    fs.mkdirSync(PUBLIC_MATERIAL_DIR, { recursive: true });
  }

  // API first, so static files under /frontend/public/api no shadow backend endpoints
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/user', userRouter);
  app.use('/api/instructor', instructorRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/forms', formsApiRouter);
  app.use('/api', apiRouter);

  // Web form fallbacks (non-API endpoints)
  app.use(formsWebRouter);

  // Direct SPA routes -> serve index.html (no hash routing)
  const indexPath = path.join(FRONTEND_DIR, 'index.html');
  const spaRoutes = ['/','/login','/crear-usuario','/signup','/admin','/dojo','/misiones','/armeria','/about','/formulario','/form-mision','/perfil','/profile','/pergaminos','/entrenamientos','/reporte','/politicas','/recursos','/servicios','/cursos','/projects','/contact'];
  app.get(spaRoutes, (_req, res) => {
    if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
    res.status(404).end();
  });

  const staticOptions = {
    dotfiles: 'ignore',
    index: false,
    setHeaders(res, filePath) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (path.extname(filePath).toLowerCase() === '.html') {
        res.setHeader('Cache-Control', 'no-store');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=300');
      }
    }
  };

  function protectedStatic(dir, allowedRoles) {
    const serve = express.static(dir, staticOptions);
    return (req, res, next) => {
      try {
        const token = extractToken(req);
        if (!token) return res.status(401).send('No autorizado');
        const payload = verifyToken(token);
        const roles = Array.isArray(payload.roles) ? payload.roles : [];
        if (!allowedRoles.some((role) => roles.includes(role))) {
          return res.status(403).send('Acceso restringido');
        }
      } catch {
        return res.status(401).send('Sesion invalida');
      }
      return serve(req, res, next);
    };
  }

  // Protected media
  app.use('/material/videos', protectedStatic(path.join(PUBLIC_MATERIAL_DIR, 'videos'), ['gato','sensei']));
  app.use('/material/pergaminos', protectedStatic(path.join(PUBLIC_MATERIAL_DIR, 'pergaminos'), ['gato','sensei']));
  app.use('/material/images', protectedStatic(path.join(PUBLIC_MATERIAL_DIR, 'images'), ['gato','sensei']));
  app.use('/material/missions', protectedStatic(path.join(PUBLIC_MATERIAL_DIR, 'missions'), ['gato']));

  // Static assets
  app.use('/material', express.static(MATERIAL_DIR, staticOptions));
  app.use(express.static(FRONTEND_DIR, staticOptions));

  app.use((req, res, next) => {
    if (!req.path.startsWith('/api')) {
      const indexPath = path.join(FRONTEND_DIR, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }
    next();
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  return app;
}
