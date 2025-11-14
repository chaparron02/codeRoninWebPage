import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { requireRoles } from '../utils/auth.js';
import { loadModules, sanitizeResource, createModule, updateModule, removeModule } from '../services/scrollsStore.js';

export const router = Router();

// Require either gato (admin) or sensei (instructor)
router.use(requireRoles(['gato','sensei']));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend', 'public');
const PUBLIC_MATERIAL_DIR = path.join(FRONTEND_DIR, 'material');
const SCROLLS_DIR = path.join(PUBLIC_MATERIAL_DIR, 'pergaminos');
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
    const courseId = req.query.courseId ? String(req.query.courseId) : '';
    const courseName = !courseId && req.query.course ? String(req.query.course) : '';
    const list = await loadModules({
      courseId: courseId || undefined,
      courseName: courseName || undefined,
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Cannot read modules' });
  }
});

router.post('/courses/modules', async (req, res) => {
  try {
    const { title, description = '', order = 0, courseId: bodyCourseId, course, resource: inputResource } = req.body || {};
    const resource = sanitizeResource(inputResource ?? req.body);
    if (!title) return res.status(400).json({ error: 'title required' });
    if (resource.type !== 'link' && !resource.url) {
      return res.status(400).json({ error: 'Recurso invalido' });
    }
    const item = await createModule({
      courseId: bodyCourseId || undefined,
      courseName: course || undefined,
      title: String(title),
      description: String(description),
      order: Number(order) || 0,
      resource,
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Cannot create module' });
  }
});

router.put('/courses/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, order, courseId: bodyCourseId, course, resource: inputResource } = req.body || {};
    const payload = {};
    if (title != null) payload.title = title;
    if (description != null) payload.description = description;
    if (order != null) payload.order = order;
    if (bodyCourseId != null) payload.courseId = bodyCourseId;
    if (course != null) payload.courseName = course;
    if (inputResource != null) {
      const resource = sanitizeResource(inputResource ?? req.body);
      if (resource.type !== 'link' && !resource.url) return res.status(400).json({ error: 'Recurso invalido' });
      payload.resource = resource;
    }
    const updated = await updateModule(id, payload);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Cannot update module' });
  }
});

router.delete('/courses/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await removeModule(id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'Cannot delete module' });
  }
});
