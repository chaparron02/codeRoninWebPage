import { Router } from 'express';
import os from 'os';

import { databaseState } from '../db/connection.js';

export const router = Router();

router.get('/', (_req, res) => {
  const dbInfo = databaseState();
  res.json({
    ok: true,
    service: 'codeRonin-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    hostname: os.hostname(),
    db: dbInfo,
  });
});
