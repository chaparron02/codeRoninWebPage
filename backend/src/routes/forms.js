import { Router } from 'express';
import { CourseInquiry, MissionInquiry } from '../models/inquiry.js';
import { requireAdmin } from '../utils/auth.js';

export const formsApiRouter = Router();
export const formsWebRouter = Router();

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj && Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  return out;
}

// Helpers: serialize CSV
function toCSV(rows, headers) {
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const head = headers.map(h => esc(h.label)).join(',');
  const body = rows.map(r => headers.map(h => esc(r[h.key])).join(',')).join('\n');
  return head + '\n' + body + '\n';
}

// API endpoints (JSON)
formsApiRouter.post('/course', async (req, res) => {
  try {
    const data = pick(req.body || {}, ['nombre','email','empresa','interes','modalidad','mensaje']);
    data.userAgent = req.headers['user-agent'] || '';
    data.ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const doc = await CourseInquiry.create(data);
    res.status(201).json({ ok: true, id: doc._id });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

formsApiRouter.get('/course', requireAdmin, async (_req, res) => {
  const list = await CourseInquiry.find().sort({ createdAt: -1 }).lean();
  res.json(list);
});

formsApiRouter.delete('/course/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await CourseInquiry.deleteOne({ _id: id }).exec();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'No se pudo eliminar la solicitud' });
  }
});

formsApiRouter.get('/course.csv', requireAdmin, async (_req, res) => {
  const list = await CourseInquiry.find().sort({ createdAt: -1 }).lean();
  const headers = [
    { key: 'createdAt', label: 'createdAt' },
    { key: 'nombre', label: 'nombre' },
    { key: 'email', label: 'email' },
    { key: 'empresa', label: 'empresa' },
    { key: 'interes', label: 'interes' },
    { key: 'modalidad', label: 'modalidad' },
    { key: 'mensaje', label: 'mensaje' },
    { key: 'ip', label: 'ip' },
    { key: 'userAgent', label: 'userAgent' },
  ];
  const csv = toCSV(list, headers);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="course_inquiries.csv"');
  res.send(csv);
});

formsApiRouter.post('/mission', async (req, res) => {
  try {
    const data = pick(req.body || {}, ['nombre','email','empresa','categoria','interes','tipo','alcance','ventanas','restricciones','contacto']);
    data.userAgent = req.headers['user-agent'] || '';
    data.ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const doc = await MissionInquiry.create(data);
    res.status(201).json({ ok: true, id: doc._id });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

formsApiRouter.get('/mission', requireAdmin, async (_req, res) => {
  const list = await MissionInquiry.find().sort({ createdAt: -1 }).lean();
  res.json(list);
});

formsApiRouter.delete('/mission/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await MissionInquiry.deleteOne({ _id: id }).exec();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'No se pudo eliminar la solicitud' });
  }
});

formsApiRouter.get('/mission.csv', requireAdmin, async (_req, res) => {
  const list = await MissionInquiry.find().sort({ createdAt: -1 }).lean();
  const headers = [
    { key: 'createdAt', label: 'createdAt' },
    { key: 'nombre', label: 'nombre' },
    { key: 'email', label: 'email' },
    { key: 'empresa', label: 'empresa' },
    { key: 'categoria', label: 'categoria' },
    { key: 'interes', label: 'interes' },
    { key: 'tipo', label: 'tipo' },
    { key: 'alcance', label: 'alcance' },
    { key: 'ventanas', label: 'ventanas' },
    { key: 'restricciones', label: 'restricciones' },
    { key: 'contacto', label: 'contacto' },
    { key: 'ip', label: 'ip' },
    { key: 'userAgent', label: 'userAgent' },
  ];
  const csv = toCSV(list, headers);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="mission_inquiries.csv"');
  res.send(csv);
});

// Web form fallbacks (x-www-form-urlencoded) for non-JS submissions
formsWebRouter.use((req, _res, next) => {
  // only parse urlencoded for these endpoints
  if (req.method === 'POST' && (req.path === '/form/submit' || req.path === '/mission/submit')) {
    return import('express').then(({ default: express }) => {
      express.urlencoded({ extended: true })(req, _res, next);
    });
  }
  next();
});

formsWebRouter.post('/form/submit', async (req, res) => {
  try {
    const data = pick(req.body || {}, ['nombre','email','empresa','interes','modalidad','mensaje']);
    data.userAgent = req.headers['user-agent'] || '';
    data.ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    await CourseInquiry.create(data);
    res.status(200).send('<!doctype html><meta charset="utf-8"><title>Solicitud registrada</title><p>Solicitud registrada. Puedes cerrar esta pestana.</p><p><a href="/">Volver al inicio</a></p>');
  } catch (err) {
    res.status(400).send('<!doctype html><meta charset="utf-8"><title>Error</title><p>No se pudo registrar tu solicitud.</p>');
  }
});

formsWebRouter.post('/mission/submit', async (req, res) => {
  try {
    const data = pick(req.body || {}, ['nombre','email','empresa','categoria','interes','tipo','alcance','ventanas','restricciones','contacto']);
    data.userAgent = req.headers['user-agent'] || '';
    data.ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    await MissionInquiry.create(data);
    res.status(200).send('<!doctype html><meta charset="utf-8"><title>Solicitud registrada</title><p>Solicitud de mision registrada. Puedes cerrar esta pestana.</p><p><a href="/">Volver al inicio</a></p>');
  } catch (err) {
    res.status(400).send('<!doctype html><meta charset="utf-8"><title>Error</title><p>No se pudo registrar tu solicitud de mision.</p>');
  }
});
