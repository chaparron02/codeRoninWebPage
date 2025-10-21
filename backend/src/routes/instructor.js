import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { requireRoles } from '../utils/auth.js';
import { loadModules, saveModules, sanitizeResource, normalizeModule } from '../services/scrollsStore.js';

export const router = Router();

// Require either gato (admin) or sensei (instructor)
router.use(requireRoles(['gato','sensei']));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const MATERIAL_DIR = path.join(ROOT_DIR, 'material');
const SCROLLS_DIR = path.join(MATERIAL_DIR, 'pergaminos');
if (!fs.existsSync(SCROLLS_DIR)) fs.mkdirSync(SCROLLS_DIR, { recursive: true });

const UPLOAD_TYPES = {
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/ogg': 'video',
  'video/quicktime': 'video',
  'video/x-matroska': 'video',
  'application/pdf': 'pdf',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, SCROLLS_DIR),
  filename: (_req, file, cb) => {
    const safeBase = String(file.originalname || 'video').replace(/[^a-zA-Z0-9._-]+/g, '_');
    cb(null, `${Date.now()}_${safeBase}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const kind = UPLOAD_TYPES[file.mimetype];
    if (!kind) return cb(new Error('Tipo de archivo no soportado'));
    cb(null, true);
  }
});

router.post('/upload/video', upload.single('file'), (req, res) => {
  try {
    const name = req.file.filename;
    const original = req.file.originalname || name;
    const url = `/material/pergaminos/${encodeURIComponent(name)}`;
    const mime = req.file.mimetype || '';
    const kind = UPLOAD_TYPES[mime] || 'file';
    return res.json({ ok: true, url, name: original, storedName: name, type: kind, mime });
  } catch (err) {
    return res.status(400).json({ error: 'Upload failed' });
  }
});

router.get('/courses/modules', async (req, res) => {
  try {
    const list = await loadModules();
    const course = (req.query.course || '').toString();
    const filtered = course ? list.filter(m => (m.course || '') === course) : list;
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: 'Cannot read modules' });
  }
});

router.post('/courses/modules', async (req, res) => {
  try {
    const { title, description = '', order = 0, course = '', resource: inputResource } = req.body || {};
    const resource = sanitizeResource(inputResource ?? req.body);
    if (!title) return res.status(400).json({ error: 'title required' });
    if (!course) return res.status(400).json({ error: 'course required' });
    if (resource.type !== 'link' && !resource.url) {
      return res.status(400).json({ error: 'Recurso invalido' });
    }
    const now = new Date().toISOString();
    const list = await loadModules();
    const id = Math.random().toString(36).slice(2);
    const item = {
      id,
      course,
      title: String(title),
      description: String(description),
      order: Number(order) || 0,
      resource,
      createdAt: now,
      updatedAt: now,
    };
    list.push(item);
    list.sort((a,b)=> (a.course||'').localeCompare(b.course||'') || (a.order||0)-(b.order||0) || (a.createdAt||'').localeCompare(b.createdAt||''));
    await saveModules(list);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Cannot create module' });
  }
});

router.put('/courses/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const list = await loadModules();
    const idx = list.findIndex(x => x.id === id);
    if (idx < 0) return res.status(404).json({ error: 'Not found' });
    const item = list[idx];
    const { title, description, order, course, resource: inputResource } = req.body || {};
    if (title != null) item.title = String(title);
    if (description != null) item.description = String(description);
    if (order != null) item.order = Number(order)||0;
    if (course != null) item.course = String(course);
    if (inputResource != null) {
      const resource = sanitizeResource(inputResource ?? req.body);
      if (resource.type !== 'link' && !resource.url) return res.status(400).json({ error: 'Recurso invalido' });
      item.resource = resource;
    }
    item.updatedAt = new Date().toISOString();
    list[idx] = item;
    list.sort((a,b)=> (a.course||'').localeCompare(b.course||'') || (a.order||0)-(b.order||0) || (a.createdAt||'').localeCompare(b.createdAt||''));
    await saveModules(list);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Cannot update module' });
  }
});

router.delete('/courses/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const list = await loadModules();
    const next = list.filter(x => x.id !== id);
    if (next.length === list.length) return res.status(404).json({ error: 'Not found' });
    await saveModules(next);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Cannot delete module' });
  }
});
