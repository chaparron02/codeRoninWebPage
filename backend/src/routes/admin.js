import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { requireAdmin } from '../utils/auth.js';
import { CourseInquiry, MissionInquiry } from '../models/inquiry.js';
import { User } from '../models/user.js';
import { Report } from '../models/report.js';
import { loadModules, saveModules, sanitizeResource } from '../services/scrollsStore.js';
import { getAccessMap, setUserAccess } from '../services/accessStore.js';
import { readJSON, writeJSON } from '../storage/fileStore.js';

export const router = Router();

router.use(requireAdmin);

const TOOLS_KEY = 'tools.json';
const randomId = () => Math.random().toString(36).slice(2);

function sanitizeLink(value) {
  const str = String(value || '').trim();
  if (!str) return '';
  if (/^https?:\/\//i.test(str)) return str;
  if (str.startsWith('/')) return str;
  return '';
}

function parseTags(value, fallback = []) {
  if (Array.isArray(value)) return value.map(v => String(v || '').trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(Boolean);
  return Array.isArray(fallback) ? fallback : [];
}

function normalizeTool(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id.trim()
    ? raw.id.trim()
    : (raw._id ? String(raw._id) : randomId());
  const title = (raw.title != null ? String(raw.title) : '').trim() || 'Herramienta';
  const description = raw.description != null
    ? String(raw.description)
    : (raw.desc != null ? String(raw.desc) : '');
  const link = sanitizeLink(raw.link);
  const image = raw.image != null ? String(raw.image) : '';
  const tags = parseTags(raw.tags);
  const badge = raw.badge != null ? String(raw.badge) : '';
  const isPublished = Boolean(raw.isPublished ?? raw.published ?? false);
  const createdAt = raw.createdAt || new Date().toISOString();
  const updatedAt = raw.updatedAt || createdAt;
  return { id, title, description, link, image, tags, badge, isPublished, createdAt, updatedAt };
}

async function loadTools() {
  try {
    const list = await readJSON(TOOLS_KEY, []);
    if (!Array.isArray(list)) return [];
    return list.map(normalizeTool).filter(Boolean);
  } catch {
    return [];
  }
}

async function saveTools(list) {
  const clean = Array.isArray(list) ? list.map(normalizeTool).filter(Boolean) : [];
  await writeJSON(TOOLS_KEY, clean);
  return clean;
}

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

// Upload dirs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const MATERIAL_DIR = path.join(ROOT_DIR, 'material');
const VIDEOS_DIR = path.join(MATERIAL_DIR, 'videos');
const IMAGES_DIR = path.join(MATERIAL_DIR, 'images');
const PDF_DIR = path.join(MATERIAL_DIR, 'pdfs');
if (!fs.existsSync(VIDEOS_DIR)) fs.mkdirSync(VIDEOS_DIR, { recursive: true });
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
if (!fs.existsSync(PDF_DIR)) fs.mkdirSync(PDF_DIR, { recursive: true });

// Video upload
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
  } catch {
    return res.status(400).json({ error: 'Upload failed' });
  }
});

// Image upload
const imgStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, IMAGES_DIR),
  filename: (_req, file, cb) => {
    const safeBase = String(file.originalname || 'image').replace(/[^a-zA-Z0-9._-]+/g, '_');
    const ts = Date.now();
    cb(null, `${ts}_${safeBase}`);
  }
});
const uploadImg = multer({
  storage: imgStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/png','image/jpeg','image/jpg','image/webp','image/gif','image/svg+xml'].includes(file.mimetype);
    cb(ok ? null : new Error('Unsupported image type'), ok);
  }
});
router.post('/upload/image', uploadImg.single('file'), (req, res) => {
  try {
    const name = req.file.filename;
    const url = `/material/images/${encodeURIComponent(name)}`;
    return res.json({ ok: true, url, name });
  } catch {
    return res.status(400).json({ error: 'Upload failed' });
  }
});

const pdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PDF_DIR),
  filename: (_req, file, cb) => {
    const safeBase = String(file.originalname || 'document').replace(/[^a-zA-Z0-9._-]+/g, '_');
    const ts = Date.now();
    cb(null, `${ts}_${safeBase}`);
  }
});
const uploadPdf = multer({
  storage: pdfStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype === 'application/pdf';
    cb(ok ? null : new Error('Unsupported pdf type'), ok);
  }
});
router.post('/upload/pdf', uploadPdf.single('file'), (req, res) => {
  try {
    const name = req.file.filename;
    const url = `/material/pdfs/${encodeURIComponent(name)}`;
    return res.json({ ok: true, url, name });
  } catch {
    return res.status(400).json({ error: 'Upload failed' });
  }
});


function clampProgress(value) {
  const num = Number(value) || 0;
  if (num < 0) return 0;
  if (num > 100) return 100;
  return num;
}

// Course modules JSON (kept for legacy)
router.get('/courses/modules', async (_req, res) => {
  const list = await loadModules();
  res.json(list);
});
router.post('/courses/modules', async (req, res) => {
  try {
    const { title, description = '', order = 0, course = '', resource: inputResource } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title required' });
    const resource = sanitizeResource(inputResource ?? req.body);
    if (resource.type !== 'link' && !resource.url) return res.status(400).json({ error: 'resource required' });
    const now = new Date().toISOString();
    const list = await loadModules();
    const id = Math.random().toString(36).slice(2);
    const item = {
      id,
      course: String(course || ''),
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
  } catch {
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
    const { title, description, order, resource: inputResource, course } = req.body || {};
    if (title != null) item.title = String(title);
    if (description != null) item.description = String(description);
    if (order != null) item.order = Number(order)||0;
    if (course != null) item.course = String(course);
    if (inputResource != null) {
      const resource = sanitizeResource(inputResource ?? req.body);
      if (resource.type !== 'link' && !resource.url) return res.status(400).json({ error: 'resource required' });
      item.resource = resource;
    }
    item.updatedAt = new Date().toISOString();
    list[idx] = item;
    list.sort((a,b)=> (a.course||'').localeCompare(b.course||'') || (a.order||0)-(b.order||0) || (a.createdAt||'').localeCompare(b.createdAt||''));
    await saveModules(list);
    res.json(item);
  } catch {
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
  } catch {
    res.status(500).json({ error: 'Cannot delete module' });
  }
});

async function buildMissionPayload(doc) {
  if (!doc) return null;
  const ids = [];
  if (doc.clientId) ids.push(doc.clientId);
  if (doc.shogunId) ids.push(doc.shogunId);
  const users = ids.length
    ? await User.find({ _id: { $in: ids } }, { username: 1, name: 1 }).lean()
    : [];
  const lookup = new Map(users.map(u => [String(u._id), u]));
  const client = doc.clientId ? lookup.get(String(doc.clientId)) : null;
  const shogun = doc.shogunId ? lookup.get(String(doc.shogunId)) : null;
  return {
    id: String(doc._id),
    title: doc.title,
    service: doc.service || '',
    summary: doc.summary || '',
    status: doc.status || '',
    progress: doc.progress ?? 0,
    client: client ? { id: String(doc.clientId), username: client.username || '', name: client.name || '' } : null,
    shogun: shogun ? { id: String(doc.shogunId), username: shogun.username || '', name: shogun.name || '' } : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

router.get('/missions', async (_req, res) => {
  try {
    const docs = await Report.find({}).sort({ updatedAt: -1 }).lean();
    const payload = await Promise.all(docs.map(buildMissionPayload));
    res.json(payload);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener misiones' });
  }
});

router.post('/missions', async (req, res) => {
  try {
    const { title, service, summary = '', shinobiId, shogunId } = req.body || {};
    if (!title || !service || !shinobiId) {
      return res.status(400).json({ error: 'Titulo, servicio y shinobi son requeridos' });
    }
    const shinobi = await User.findById(shinobiId).lean();
    if (!shinobi) return res.status(404).json({ error: 'Shinobi no encontrado' });
    const shinobiRoles = Array.isArray(shinobi.roles) ? shinobi.roles : [];
    if (!shinobiRoles.includes('shinobi')) {
      return res.status(400).json({ error: 'El shinobi seleccionado no es valido' });
    }
    let shogun = null;
    if (shogunId) {
      shogun = await User.findById(shogunId).lean();
      if (!shogun) return res.status(404).json({ error: 'Shogun no encontrado' });
      const shogunRoles = Array.isArray(shogun.roles) ? shogun.roles : [];
      if (!shogunRoles.includes('gato')) {
        return res.status(400).json({ error: 'El shogun seleccionado no es valido' });
      }
    }
    const doc = await Report.create({
      title,
      service,
      summary,
      clientId: shinobi._id,
      shogunId: shogun ? shogun._id : req.user.sub,
      progress: 0,
      status: 'iniciando',
      tags: [],
    });
    const payload = await buildMissionPayload(await Report.findById(doc._id).lean());
    res.status(201).json(payload);
  } catch {
    res.status(500).json({ error: 'No se pudo crear la mision' });
  }
});

router.put('/missions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Report.findById(id).exec();
    if (!doc) return res.status(404).json({ error: 'Mision no encontrada' });
    const { title, service, summary, shinobiId, shogunId, status, progress } = req.body || {};
    if (title != null) doc.title = String(title).trim() || doc.title;
    if (service != null) doc.service = String(service).trim() || doc.service;
    if (summary != null) doc.summary = String(summary);
    if (status != null) doc.status = String(status).trim() || doc.status;
    if (progress != null) doc.progress = clampProgress(progress);
    if (shinobiId != null) {
      const shinobi = await User.findById(shinobiId).lean();
      if (!shinobi) return res.status(404).json({ error: 'Shinobi no encontrado' });
      const shinobiRoles = Array.isArray(shinobi.roles) ? shinobi.roles : [];
      if (!shinobiRoles.includes('shinobi')) return res.status(400).json({ error: 'El shinobi seleccionado no es valido' });
      doc.clientId = shinobi._id;
    }
    if (shogunId != null) {
      if (!shogunId) {
        doc.shogunId = undefined;
      } else {
        const shogun = await User.findById(shogunId).lean();
        if (!shogun) return res.status(404).json({ error: 'Shogun no encontrado' });
        const shogunRoles = Array.isArray(shogun.roles) ? shogun.roles : [];
        if (!shogunRoles.includes('gato')) return res.status(400).json({ error: 'El shogun seleccionado no es valido' });
        doc.shogunId = shogun._id;
      }
    }
    await doc.save();
    const payload = await buildMissionPayload(await Report.findById(doc._id).lean());
    res.json(payload);
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar la mision' });
  }
});

router.delete('/missions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Report.findById(id).exec();
    if (!doc) return res.status(404).json({ error: 'Mision no encontrada' });
    await doc.deleteOne();
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'No se pudo eliminar la mision' });
  }
});

// Users
router.get('/users', async (_req, res) => {
  try {
    const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 }).lean();
    const accessMap = await getAccessMap();
    const mapped = users.map(u => ({
      ...u,
      roles: (Array.isArray(u.roles) && u.roles.length) ? u.roles : (u.role === 'admin' ? ['gato'] : (u.role ? ['genin'] : [])),
      access: accessMap[String(u._id)] || null,
    }));
  res.json(mapped);
} catch {
    res.status(500).json({ error: 'No se pudieron obtener usuarios' });
  }
});

router.put('/users/:id/role', async (req, res) => {
  // Backward-compatible: map single role to roles array
  try {
    const { id } = req.params;
    const { role } = req.body || {};
    if (!role) return res.status(400).json({ error: 'Rol requerido' });
    const u = await User.findById(id).exec();
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (role === 'admin') {
      u.role = 'admin';
      u.roles = Array.isArray(u.roles) ? Array.from(new Set([...u.roles, 'gato'])) : ['gato'];
    } else if (role === 'user') {
      u.role = 'user';
      if (!Array.isArray(u.roles) || u.roles.length === 0) u.roles = ['genin'];
    } else {
      return res.status(400).json({ error: 'Rol invalido' });
    }
    await u.save();
    res.json({ ok: true, roles: u.roles });
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar el rol' });
  }
});

router.put('/users/:id/roles', async (req, res) => {
  try {
    const { id } = req.params;
    let { roles } = req.body || {};
    if (!Array.isArray(roles)) return res.status(400).json({ error: 'roles debe ser un array' });
    roles = roles.filter(r => ['gato','sensei','shinobi','genin'].includes(r));
    const uniq = Array.from(new Set(roles));
    const roleLegacy = uniq.includes('gato') ? 'admin' : 'user';
    await User.updateOne({ _id: id }, { $set: { roles: uniq, role: roleLegacy } }).exec();
    const updated = await User.findById(id).lean();
    if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ ok: true, roles: Array.isArray(updated.roles) ? updated.roles : [] });
  } catch {
    res.status(500).json({ error: 'No se pudieron actualizar roles' });
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
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar el estado' });
  }
});

router.get('/tools', async (_req, res) => {
  try {
    const list = await loadTools();
    res.json(list);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener las herramientas' });
  }
});

router.post('/tools', async (req, res) => {
  try {
    const { title, description = '', link = '', image = '', tags = [], badge = '', isPublished = false } = req.body || {};
    const safeTitle = String(title || '').trim();
    if (!safeTitle) return res.status(400).json({ error: 'El titulo es obligatorio' });
    const now = new Date().toISOString();
    const tool = {
      id: randomId(),
      title: safeTitle,
      description: String(description || ''),
      link: sanitizeLink(link),
      image: String(image || ''),
      tags: parseTags(tags),
      badge: String(badge || ''),
      isPublished: Boolean(isPublished),
      createdAt: now,
      updatedAt: now,
    };
    const list = await loadTools();
    await saveTools([tool, ...list]);
    res.status(201).json(tool);
  } catch {
    res.status(500).json({ error: 'No se pudo crear la herramienta' });
  }
});

router.put('/tools/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const list = await loadTools();
    const idx = list.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Herramienta no encontrada' });
    const payload = req.body || {};
    const current = list[idx];
    const next = { ...current };
    if (payload.title !== undefined) {
      const t = String(payload.title || '').trim();
      next.title = t || current.title;
    }
    if (payload.description !== undefined) next.description = String(payload.description || '');
    if (payload.link !== undefined) next.link = sanitizeLink(payload.link);
    if (payload.image !== undefined) next.image = String(payload.image || '');
    if (payload.tags !== undefined) next.tags = parseTags(payload.tags, current.tags);
    if (payload.badge !== undefined) next.badge = String(payload.badge || '');
    if (payload.isPublished !== undefined) next.isPublished = Boolean(payload.isPublished);
    next.updatedAt = new Date().toISOString();
    list[idx] = next;
    await saveTools(list);
    res.json(next);
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar la herramienta' });
  }
});

router.delete('/tools/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const list = await loadTools();
    const idx = list.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Herramienta no encontrada' });
    list.splice(idx, 1);
    await saveTools(list);
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'No se pudo eliminar la herramienta' });
  }
});

router.get('/access-map', async (_req, res) => {
  try {
    const map = await getAccessMap();
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo obtener accesos' });
  }
});

router.put('/access-map/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Usuario requerido' });
    const { courses = [], services = [] } = req.body || {};
    const entry = await setUserAccess(id, { courses, services });
    res.json({ ok: true, access: entry });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo actualizar accesos' });
  }
});
