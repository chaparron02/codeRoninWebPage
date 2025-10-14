import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { requireRoles } from '../utils/auth.js';
import { readJSON, writeJSON } from '../storage/fileStore.js';

export const router = Router();

// Require either gato (admin) or sensei (instructor)
router.use(requireRoles(['gato','sensei']));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const MATERIAL_DIR = path.join(ROOT_DIR, 'material');
const VIDEOS_DIR = path.join(MATERIAL_DIR, 'videos');
if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VIDEOS_DIR),
  filename: (_req, file, cb) => {
    const safeBase = String(file.originalname || 'video').replace(/[^a-zA-Z0-9._-]+/g, '_');
    cb(null, `${Date.now()}_${safeBase}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-matroska'].includes(file.mimetype);
    cb(ok ? null : new Error('Unsupported video type'), ok);
  }
});

router.post('/upload/video', upload.single('file'), (req, res) => {
  try {
    const name = req.file.filename;
    const url = `/material/videos/${encodeURIComponent(name)}`;
    return res.json({ ok: true, url, name });
  } catch (err) {
    return res.status(400).json({ error: 'Upload failed' });
  }
});

const MODULES_KEY = 'course_modules.json';

router.get('/courses/modules', async (req, res) => {
  try {
    const list = await readJSON(MODULES_KEY, []);
    const course = (req.query.course || '').toString();
    const filtered = course ? list.filter(m => (m.course || '') === course) : list;
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: 'Cannot read modules' });
  }
});

router.post('/courses/modules', async (req, res) => {
  try {
    const { title, description = '', order = 0, videoUrl = '', course = '' } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title required' });
    if (!course) return res.status(400).json({ error: 'course required' });
    const now = new Date().toISOString();
    const list = await readJSON(MODULES_KEY, []);
    const id = Math.random().toString(36).slice(2);
    const item = { id, course, title, description, order: Number(order)||0, videoUrl, createdAt: now };
    list.push(item);
    list.sort((a,b)=> (a.course||'').localeCompare(b.course||'') || (a.order||0)-(b.order||0) || a.createdAt.localeCompare(b.createdAt));
    await writeJSON(MODULES_KEY, list);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Cannot create module' });
  }
});

router.put('/courses/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const list = await readJSON(MODULES_KEY, []);
    const idx = list.findIndex(x => x.id === id);
    if (idx < 0) return res.status(404).json({ error: 'Not found' });
    const item = list[idx];
    const { title, description, order, videoUrl, course } = req.body || {};
    if (title != null) item.title = String(title);
    if (description != null) item.description = String(description);
    if (order != null) item.order = Number(order)||0;
    if (videoUrl != null) item.videoUrl = String(videoUrl);
    if (course != null) item.course = String(course);
    list[idx] = item;
    list.sort((a,b)=> (a.course||'').localeCompare(b.course||'') || (a.order||0)-(b.order||0) || a.createdAt.localeCompare(b.createdAt));
    await writeJSON(MODULES_KEY, list);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Cannot update module' });
  }
});

router.delete('/courses/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const list = await readJSON(MODULES_KEY, []);
    const next = list.filter(x => x.id !== id);
    if (next.length === list.length) return res.status(404).json({ error: 'Not found' });
    await writeJSON(MODULES_KEY, next);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Cannot delete module' });
  }
});

