import { Router } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { requireAdmin } from '../utils/auth.js';
import { CourseInquiry, MissionInquiry } from '../models/inquiry.js';
import { User } from '../models/user.js';
import { readJSON, writeJSON } from '../storage/fileStore.js';

export const router = Router();

router.use(requireAdmin);

router.get('/stats', async (_req, res) => {
  try {
    const [coursesCount, missionsCount, usersCount, lastCourse, lastMission] = await Promise.all([
      CourseInquiry.countDocuments({}).exec(),
      MissionInquiry.countDocuments({}).exec(),
      User.countDocuments({}).exec(),
      CourseInquiry.findOne({}, null, { sort: { createdAt: -1 } }).lean(),
      MissionInquiry.findOne({}, null, { sort: { createdAt: -1 } }).lean(),
    ]);
    res.json({ coursesCount, missionsCount, usersCount, lastCourse, lastMission });
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron obtener estadisticas' });
  }
});

// Upload videos to material/videos
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
    const ts = Date.now();
    cb(null, `${ts}_${safeBase}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
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

// Course modules JSON
const MODULES_KEY = 'course_modules.json';

router.get('/courses/modules', async (_req, res) => {
  const list = await readJSON(MODULES_KEY, []);
  res.json(list);
});

router.post('/courses/modules', async (req, res) => {
  try {
    const { title, description = '', order = 0, videoUrl = '' } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title required' });
    const now = new Date().toISOString();
    const list = await readJSON(MODULES_KEY, []);
    const id = Math.random().toString(36).slice(2);
    const item = { id, title, description, order: Number(order)||0, videoUrl, createdAt: now };
    list.push(item);
    list.sort((a,b)=> (a.order||0)-(b.order||0) || a.createdAt.localeCompare(b.createdAt));
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
    const { title, description, order, videoUrl } = req.body || {};
    if (title != null) item.title = String(title);
    if (description != null) item.description = String(description);
    if (order != null) item.order = Number(order)||0;
    if (videoUrl != null) item.videoUrl = String(videoUrl);
    list[idx] = item;
    list.sort((a,b)=> (a.order||0)-(b.order||0) || a.createdAt.localeCompare(b.createdAt));
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

router.get('/users', async (_req, res) => {
  try {
    const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 }).lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron obtener usuarios' });
  }
});

router.put('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};
    if (!['admin', 'user'].includes(role)) return res.status(400).json({ error: 'Rol invalido' });
    const u = await User.findById(id).exec();
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
    u.role = role;
    await u.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo actualizar el rol' });
  }
});

router.put('/users/:id/toggle-active', async (req, res) => {
  try {
    const { id } = req.params;
    const u = await User.findById(id).exec();
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
    u.active = !u.active;
    await u.save();
    res.json({ ok: true, active: u.active });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo actualizar el estado' });
  }
});
