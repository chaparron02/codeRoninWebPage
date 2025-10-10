import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { router as apiRouter } from './routes/api.js';
import { router as healthRouter } from './routes/health.js';

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

  app.use('/material', express.static(MATERIAL_DIR));
  app.use(express.static(FRONTEND_DIR));

  app.use('/api/health', healthRouter);
  app.use('/api', apiRouter);

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
