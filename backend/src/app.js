import express from 'express';
import cors from 'cors';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend', 'public');
const MATERIAL_DIR = path.join(ROOT_DIR, 'material');

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(morgan('dev'));

  if (!fs.existsSync(MATERIAL_DIR)) {
    fs.mkdirSync(MATERIAL_DIR, { recursive: true });
  }

  // API first, so static files under /frontend/public/api no shadow backend endpoints
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/user', userRouter);
  app.use('/api/instructor', instructorRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/forms', formsApiRouter);
  app.use('/api', apiRouter);

  // Web form fallbacks (non-API endpoints)
  app.use(formsWebRouter);

  // Direct SPA routes -> serve index.html (no hash routing)
  const indexPath = path.join(FRONTEND_DIR, 'index.html');
  const spaRoutes = ['/','/login','/signup','/admin','/dojo','/misiones','/armeria','/about','/formulario','/form-mision','/perfil','/profile','/recursos','/servicios','/cursos','/projects','/contact'];
  app.get(spaRoutes, (_req, res) => {
    if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
    res.status(404).end();
  });

  // Static assets
  app.use('/material', express.static(MATERIAL_DIR));
  app.use(express.static(FRONTEND_DIR));

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
