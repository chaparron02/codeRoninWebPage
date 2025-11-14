import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { requireAdmin } from '../utils/auth.js';
import { deriveRoles } from '../utils/roles.js';
import { models, sequelize } from '../db/models/index.js';
import { loadModules, sanitizeResource, createModule, updateModule, removeModule } from '../services/scrollsStore.js';
import { getAccessMap, setUserAccess } from '../services/accessStore.js';

export const router = Router();

router.use(requireAdmin);

const { CourseInquiry, MissionInquiry, User, Report, Tool, Course, CourseModule, MissionFile, PasswordResetRequest } = models;

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
const BANNED_USER_PARTS = [
  'admin','root','system','sys','support','help','seguridad','security','password','pass','coderonin','owner','god','sudo',
  'puta','puto','mierda','verga','pene','vagina','culo','zorra','perra','chingar','joder','cono','cabron',
  'fuck','shit','bitch','ass','dick','pussy','porn','xxx'
];

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function isValidUsername(username) {
  if (!username || typeof username !== 'string') return false;
  const clean = username.trim().toLowerCase();
  if (clean.length < 3 || clean.length > 32) return false;
  if (!USERNAME_PATTERN.test(clean)) return false;
  return !BANNED_USER_PARTS.some((part) => clean.includes(part));
}

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function isStrongPassword(pw) {
  if (!pw || typeof pw !== 'string') return false;
  return /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/.test(pw);
}

function sanitizeLink(value) {
  const str = String(value || '').trim();
  if (!str) return '';
  if (/^https?:\/\//i.test(str)) return str;
  if (str.startsWith('/')) return str;
  return '';
}

function parseTags(value, fallback = []) {
  if (Array.isArray(value)) return value.map((v) => String(v || '').trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean);
  return Array.isArray(fallback) ? fallback : [];
}

function normalizeToolInput(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    title: (raw.title != null ? String(raw.title) : '').trim() || 'Herramienta',
    description: raw.description != null ? String(raw.description) : raw.desc || '',
    link: sanitizeLink(raw.link),
    image: raw.image != null ? String(raw.image) : '',
    tags: parseTags(raw.tags),
    badge: raw.badge != null ? String(raw.badge) : '',
    isPublished: Boolean(raw.isPublished ?? raw.published ?? false),
  };
}

function toolToResponse(tool) {
  const plain = typeof tool.toJSON === 'function' ? tool.toJSON() : tool;
  return { ...plain, id: plain.id, tags: parseTags(plain.tags, []) };
}

function normalizeCourseInput(raw = {}, { partial = false } = {}) {
  const payload = {};
  const has = (key) => Object.prototype.hasOwnProperty.call(raw, key);

  if (!partial || has('title')) {
    const title = String(raw.title ?? '').trim();
    if (!title) return null;
    payload.title = title;
  }
  if (!partial || has('description')) {
    payload.description = raw.description != null ? String(raw.description) : '';
  }
  if (!partial || has('image')) {
    payload.image = raw.image != null ? String(raw.image) : '';
  }
  if (!partial || has('tags')) {
    payload.tags = parseTags(raw.tags, []);
  }
  if (!partial || has('modalidad') || has('modality')) {
    payload.modalidad = String(raw.modalidad || raw.modality || 'virtual').toLowerCase();
  }
  if (!partial || has('price')) {
    payload.price = raw.price != null && raw.price !== '' ? String(raw.price) : null;
  }
  if (!partial || has('link')) {
    payload.link = raw.link ? sanitizeLink(raw.link) : '';
  }
  if (!partial || has('category')) {
    payload.category = raw.category != null ? String(raw.category) : '';
  }
  if (!partial) {
    payload.isArchived = false;
    payload.archivedAt = null;
  }
  return payload;
}

function courseToAdminResponse(course, moduleCount = 0) {
  const plain = typeof course.toJSON === 'function' ? course.toJSON() : course;
  return {
    ...plain,
    id: plain.id,
    tags: parseTags(plain.tags, []),
    moduleCount,
    isArchived: Boolean(plain.isArchived),
  };
}

async function fetchCourseModuleCounts() {
  const rows = await CourseModule.findAll({
    attributes: ['courseId', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
    group: ['courseId'],
    raw: true,
  });
  const map = {};
  rows.forEach((row) => {
    map[row.courseId] = Number(row.total) || 0;
  });
  return map;
}

async function fetchTools() {
  const rows = await Tool.findAll({ order: [['createdAt', 'DESC']] });
  return rows;
}

router.get('/stats', async (_req, res) => {
  try {
    const [coursesCount, missionsCount, usersCount, lastCourse, lastMission] = await Promise.all([
      CourseInquiry.count(),
      MissionInquiry.count(),
      User.count(),
      CourseInquiry.findOne({ order: [['createdAt', 'DESC']] }),
      MissionInquiry.findOne({ order: [['createdAt', 'DESC']] }),
    ]);
    res.json({
      coursesCount,
      missionsCount,
      usersCount,
      lastCourse: lastCourse ? lastCourse.toJSON() : null,
      lastMission: lastMission ? lastMission.toJSON() : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron obtener estadisticas' });
  }
});

// Upload dirs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend', 'public');
const PUBLIC_MATERIAL_DIR = path.join(FRONTEND_DIR, 'material');
const VIDEOS_DIR = path.join(PUBLIC_MATERIAL_DIR, 'videos');
const IMAGES_DIR = path.join(PUBLIC_MATERIAL_DIR, 'images');
const PDF_DIR = path.join(PUBLIC_MATERIAL_DIR, 'pdfs');
const MISSION_MEDIA_DIR = path.join(PUBLIC_MATERIAL_DIR, 'missions');
[VIDEOS_DIR, IMAGES_DIR, PDF_DIR, MISSION_MEDIA_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const SAFE_SEGMENT = /[^a-zA-Z0-9_-]/g;

function sanitizeSegment(value, fallback = 'mission') {
  const clean = String(value || '').replace(SAFE_SEGMENT, '_');
  return clean || fallback;
}

function safeFilename(original = 'file') {
  return String(original || 'file').replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function ensureWithin(baseDir, targetPath) {
  const base = path.resolve(baseDir);
  const target = path.resolve(targetPath);
  if (!target.startsWith(base + path.sep) && target !== base) {
    throw new Error('Ruta invalida');
  }
  return target;
}

function resolveMissionDir(missionId) {
  const dirName = sanitizeSegment(missionId);
  const dir = path.join(MISSION_MEDIA_DIR, dirName);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

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

const missionFileStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      const dir = resolveMissionDir(req.params.id);
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (_req, file, cb) => cb(null, `${Date.now()}_${safeFilename(file.originalname || 'file')}`),
});

const missionUpload = multer({
  storage: missionFileStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
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

const baseReportInclude = [
  { model: User, as: 'client', attributes: ['id', 'username', 'name', 'displayName'] },
  { model: User, as: 'shogun', attributes: ['id', 'username', 'name', 'displayName'] },
  { model: User, as: 'sponsor', attributes: ['id', 'username', 'name', 'displayName'] },
];

router.get('/courses/modules', async (req, res) => {
  try {
    const courseId = String(req.query.courseId || req.query.course || '');
    const list = await loadModules(courseId ? { courseId } : undefined);
    res.json(list);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener pergaminos' });
  }
});

router.post('/courses/modules', async (req, res) => {
  try {
    const { title, description = '', order = 0, courseId: bodyCourseId, course, resource: inputResource } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Titulo requerido' });
    const resource = sanitizeResource(inputResource ?? req.body);
    if (resource.type !== 'link' && !resource.url) return res.status(400).json({ error: 'Recurso invalido' });
    const courseId = bodyCourseId || course;
    if (!courseId) return res.status(400).json({ error: 'Curso requerido' });
    const item = await createModule({
      courseId,
      title: String(title),
      description: String(description),
      order: Number(order) || 0,
      resource,
    });
    res.status(201).json(item);
  } catch {
    res.status(500).json({ error: 'No se pudo crear el pergamino' });
  }
});

router.put('/courses/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, order, courseId: bodyCourseId, course, resource: inputResource } = req.body || {};
    const payload = {};
    if (title !== undefined) payload.title = title;
    if (description !== undefined) payload.description = description;
    if (order !== undefined) payload.order = order;
    const courseId = bodyCourseId || course;
    if (courseId) payload.courseId = courseId;
    if (inputResource !== undefined) {
      const resource = sanitizeResource(inputResource ?? req.body);
      if (resource.type !== 'link' && !resource.url) return res.status(400).json({ error: 'Recurso invalido' });
      payload.resource = resource;
    }
    const updated = await updateModule(id, payload);
    if (!updated) return res.status(404).json({ error: 'Pergamino no encontrado' });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar el pergamino' });
  }
});

router.delete('/courses/modules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await removeModule(id);
    if (!deleted) return res.status(404).json({ error: 'Pergamino no encontrado' });
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'No se pudo eliminar el pergamino' });
  }
});

async function buildMissionPayload(doc) {
  if (!doc) return null;
  const plain = typeof doc.toJSON === 'function' ? doc.toJSON() : doc;
  const client = plain.client || null;
  const shogun = plain.shogun || null;
  const sponsor = plain.sponsor || null;
  return {
    id: plain.id,
    title: plain.title,
    service: plain.service || '',
    summary: plain.summary || '',
    status: plain.status || '',
    progress: plain.progress ?? 0,
    client: client
      ? { id: client.id, username: client.username || '', name: client.displayName || client.name || '' }
      : null,
    shogun: shogun
      ? { id: shogun.id, username: shogun.username || '', name: shogun.displayName || shogun.name || '' }
      : null,
    sponsor: sponsor
      ? { id: sponsor.id, username: sponsor.username || '', name: sponsor.displayName || sponsor.name || '' }
      : null,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

router.get('/missions', async (_req, res) => {
  try {
    const docs = await Report.findAll({ include: baseReportInclude, order: [['updatedAt', 'DESC']] });
    const payload = await Promise.all(docs.map(buildMissionPayload));
    res.json(payload);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener misiones' });
  }
});

router.post('/missions', async (req, res) => {
  try {
    const { title, service, summary = '', shinobiId, shogunId, sponsorId } = req.body || {};
    if (!title || !service || !shinobiId) {
      return res.status(400).json({ error: 'Titulo, servicio y shinobi son requeridos' });
    }
    const shinobi = await User.findByPk(shinobiId);
    if (!shinobi) return res.status(404).json({ error: 'Shinobi no encontrado' });
    const shinobiRoles = deriveRoles(shinobi.toJSON());
    if (!shinobiRoles.includes('shinobi')) {
      return res.status(400).json({ error: 'El shinobi seleccionado no es valido' });
    }
    let shogun = null;
    if (shogunId) {
      shogun = await User.findByPk(shogunId);
      if (!shogun) return res.status(404).json({ error: 'Shogun no encontrado' });
      const shogunRoles = deriveRoles(shogun.toJSON());
      if (!shogunRoles.includes('gato')) {
        return res.status(400).json({ error: 'El shogun seleccionado no es valido' });
      }
    }
    let sponsor = null;
    if (sponsorId) {
      sponsor = await User.findByPk(sponsorId);
      if (!sponsor) return res.status(404).json({ error: 'Daimyo no encontrado' });
      const sponsorRoles = deriveRoles(sponsor.toJSON());
      if (!sponsorRoles.includes('daimyo')) {
        return res.status(400).json({ error: 'El daimyo seleccionado no es valido' });
      }
    }
    const doc = await Report.create({
      title,
      service,
      summary,
      clientId: shinobi.id,
      shogunId: shogun ? shogun.id : req.user.sub,
      sponsorId: sponsor ? sponsor.id : null,
      progress: 0,
      status: 'iniciando',
      tags: [],
    });
    const payload = await buildMissionPayload(await Report.findByPk(doc.id, { include: baseReportInclude }));
    res.status(201).json(payload);
  } catch {
    res.status(500).json({ error: 'No se pudo crear la mision' });
  }
});

router.put('/missions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Report.findByPk(id);
    if (!doc) return res.status(404).json({ error: 'Mision no encontrada' });
    const { title, service, summary, shinobiId, shogunId, sponsorId, status, progress } = req.body || {};
    if (title != null) doc.title = String(title).trim() || doc.title;
    if (service != null) doc.service = String(service).trim() || doc.service;
    if (summary != null) doc.summary = String(summary);
    if (status != null) doc.status = String(status).trim() || doc.status;
    if (progress != null) doc.progress = clampProgress(progress);
    if (shinobiId != null) {
      const shinobi = await User.findByPk(shinobiId);
      if (!shinobi) return res.status(404).json({ error: 'Shinobi no encontrado' });
      const shinobiRoles = deriveRoles(shinobi.toJSON());
      if (!shinobiRoles.includes('shinobi')) return res.status(400).json({ error: 'El shinobi seleccionado no es valido' });
      doc.clientId = shinobi.id;
    }
    if (shogunId != null) {
      if (!shogunId) {
        doc.shogunId = undefined;
      } else {
        const shogun = await User.findByPk(shogunId);
        if (!shogun) return res.status(404).json({ error: 'Shogun no encontrado' });
        const shogunRoles = deriveRoles(shogun.toJSON());
        if (!shogunRoles.includes('gato')) return res.status(400).json({ error: 'El shogun seleccionado no es valido' });
        doc.shogunId = shogun.id;
      }
    }
    if (sponsorId !== undefined) {
      if (!sponsorId) {
        doc.sponsorId = null;
      } else {
        const sponsor = await User.findByPk(sponsorId);
        if (!sponsor) return res.status(404).json({ error: 'Daimyo no encontrado' });
        const sponsorRoles = deriveRoles(sponsor.toJSON());
        if (!sponsorRoles.includes('daimyo')) return res.status(400).json({ error: 'El daimyo seleccionado no es valido' });
        doc.sponsorId = sponsor.id;
      }
    }
    await doc.save();
    const payload = await buildMissionPayload(await Report.findByPk(doc.id, { include: baseReportInclude }));
    res.json(payload);
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar la mision' });
  }
});

router.delete('/missions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Report.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: 'Mision no encontrada' });
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'No se pudo eliminar la mision' });
  }
});

router.get('/missions/:id/files', async (req, res) => {
  try {
    const rows = await MissionFile.findAll({
      where: { missionId: req.params.id },
      order: [['createdAt', 'DESC']],
    });
    const payload = rows.map((row) => {
      const plain = row.toJSON();
      const rel = plain.relativePath ? plain.relativePath.replace(/\\/g, '/') : '';
      return { ...plain, url: rel ? `/${rel}` : null };
    });
    res.json(payload);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener archivos' });
  }
});

router.post('/missions/:id/files', missionUpload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const mission = await Report.findByPk(id);
    if (!mission) return res.status(404).json({ error: 'Mision no encontrada' });
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
    const dir = resolveMissionDir(id);
    const absolutePath = ensureWithin(dir, path.join(dir, req.file.filename));
    const relativePath = path.relative(FRONTEND_DIR, absolutePath).split(path.sep).join('/');
    const record = await MissionFile.create({
      missionId: mission.id,
      storageDir: dir,
      storedName: req.file.filename,
      displayName: req.file.originalname || req.file.filename,
      mime: req.file.mimetype || '',
      size: req.file.size || 0,
      relativePath,
      kind: req.file.mimetype?.startsWith('image/') ? 'image' : 'file',
      uploadedByUserId: req.user?.sub || null,
    });
    const plain = record.toJSON();
    res.status(201).json({ ...plain, url: `/${relativePath}` });
  } catch (err) {
    res.status(500).json({ error: err.message || 'No se pudo subir archivo' });
  }
});

router.delete('/missions/:missionId/files/:fileId', async (req, res) => {
  try {
    const { missionId, fileId } = req.params;
    const record = await MissionFile.findOne({ where: { id: fileId, missionId } });
    if (!record) return res.status(404).json({ error: 'Archivo no encontrado' });
    const dir = resolveMissionDir(missionId);
    const filePath = ensureWithin(dir, path.join(record.storageDir || dir, record.storedName));
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }
    await record.destroy();
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message || 'No se pudo eliminar archivo' });
  }
});

router.get('/recovery-requests', async (_req, res) => {
  try {
    const list = await PasswordResetRequest.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50,
      include: [{ model: User, as: 'resolver', attributes: ['id', 'username'] }],
    });
    res.json(list.map((item) => item.toJSON()));
  } catch {
    res.status(500).json({ error: 'No se pudieron cargar las solicitudes' });
  }
});

router.put('/recovery-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await PasswordResetRequest.findByPk(id);
    if (!entry) return res.status(404).json({ error: 'Solicitud no encontrada' });
    const statusRaw = req.body?.status || entry.status || 'pending';
    const status = String(statusRaw).toLowerCase();
    if (!['pending', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Estado invalido' });
    }
    entry.status = status;
    if (req.body?.notes !== undefined) entry.message = String(req.body.notes || '');
    if (status === 'pending') {
      entry.resolvedAt = null;
      entry.resolvedBy = null;
    } else {
      entry.resolvedAt = new Date();
      entry.resolvedBy = req.user?.sub || null;
    }
    await entry.save();
    res.json(entry.toJSON());
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar la solicitud' });
  }
});

// Users
router.get('/users', async (_req, res) => {
  try {
    const users = await User.findAll({ order: [['createdAt', 'DESC']] });
    const accessMap = await getAccessMap();
    const mapped = users.map((user) => {
      const plain = user.toJSON();
      const roles = deriveRoles(plain);
      return {
        ...plain,
        roles,
        access: accessMap[plain.id] || null,
      };
    });
    res.json(mapped);
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener usuarios' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Usuario requerido' });
    const { username, name, email, phone } = req.body || {};
    if ([username, name, email, phone].every((value) => value == null)) {
      return res.status(400).json({ error: 'Nada que actualizar' });
    }
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (username != null) {
      const nextUsername = normalizeUsername(username);
      if (!isValidUsername(nextUsername)) return res.status(400).json({ error: 'Usuario invalido' });
      const existing = await User.findOne({
        where: { username: nextUsername, id: { [Op.ne]: id } },
      });
      if (existing) return res.status(409).json({ error: 'El usuario ya existe' });
      user.username = nextUsername;
    }
    if (name != null) {
      const cleanName = String(name || '').trim();
      if (!cleanName) return res.status(400).json({ error: 'Nombre requerido' });
      user.name = cleanName;
      user.displayName = cleanName;
    }
    if (email != null) {
      const cleanEmail = String(email || '').trim();
      if (cleanEmail && !isValidEmail(cleanEmail)) return res.status(400).json({ error: 'Correo invalido' });
      user.email = cleanEmail || null;
    }
    if (phone != null) {
      const cleanPhone = String(phone || '').trim();
      if (cleanPhone && !isValidPhone(cleanPhone)) return res.status(400).json({ error: 'Celular invalido' });
      user.phone = cleanPhone || null;
    }
    await user.save();
    res.json({ ok: true, user: user.toJSON() });
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar el usuario' });
  }
});

router.put('/users/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password, confirmPassword } = req.body || {};
    if (!password) return res.status(400).json({ error: 'Contrasena requerida' });
    if (confirmPassword != null && confirmPassword !== password) {
      return res.status(400).json({ error: 'Las contrasenas no coinciden' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: 'La contrasena debe tener 8 caracteres, una mayuscula y un simbolo' });
    }
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar la contrasena' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Usuario requerido' });
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    try {
      await setUserAccess(id, { courses: [], services: [] });
    } catch {}
    await PasswordResetRequest.destroy({ where: { username: user.username } });
    await User.destroy({ where: { id } });
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'No se pudo eliminar el usuario' });
  }
});

router.put('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};
    if (!role) return res.status(400).json({ error: 'Rol requerido' });
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (role === 'admin') {
      user.role = 'admin';
      user.roles = Array.isArray(user.roles) ? Array.from(new Set([...user.roles, 'gato'])) : ['gato'];
    } else if (role === 'user') {
      user.role = 'user';
      user.roles = Array.isArray(user.roles) && user.roles.length ? user.roles : ['genin'];
    } else {
      return res.status(400).json({ error: 'Rol invalido' });
    }
    await user.save();
    res.json({ ok: true, roles: user.roles });
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar el rol' });
  }
});

router.put('/users/:id/roles', async (req, res) => {
  try {
    const { id } = req.params;
    let { roles } = req.body || {};
    if (!Array.isArray(roles)) return res.status(400).json({ error: 'roles debe ser un array' });
    roles = roles.filter((r) => ['gato', 'sensei', 'shinobi', 'genin', 'daimyo'].includes(r));
    const uniq = Array.from(new Set(roles));
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    user.roles = uniq;
    user.role = uniq.includes('gato') ? 'admin' : 'user';
    await user.save();
    res.json({ ok: true, roles: uniq });
  } catch {
    res.status(500).json({ error: 'No se pudieron actualizar roles' });
  }
});

router.put('/users/:id/toggle-active', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    user.active = !user.active;
    await user.save();
    res.json({ ok: true, active: user.active });
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar el estado' });
  }
});

// Courses
router.get('/courses', async (_req, res) => {
  try {
    const courses = await Course.findAll({ order: [['createdAt', 'DESC']] });
    const counts = await fetchCourseModuleCounts();
    res.json(courses.map((course) => courseToAdminResponse(course, counts[course.id] || 0)));
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener los cursos' });
  }
});

router.post('/courses', async (req, res) => {
  try {
    const payload = normalizeCourseInput(req.body || {}, { partial: false });
    if (!payload) return res.status(400).json({ error: 'Titulo requerido' });
    const course = await Course.create(payload);
    res.status(201).json(courseToAdminResponse(course, 0));
  } catch {
    res.status(500).json({ error: 'No se pudo crear el curso' });
  }
});

router.put('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByPk(id);
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
    const payload = normalizeCourseInput(req.body || {}, { partial: true });
    if (payload === null) return res.status(400).json({ error: 'Titulo requerido' });
    if (payload && Object.keys(payload).length) Object.assign(course, payload);
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'isArchived')) {
      const archived = Boolean(req.body.isArchived);
      course.isArchived = archived;
      course.archivedAt = archived ? new Date() : null;
    }
    await course.save();
    const moduleCount = await CourseModule.count({ where: { courseId: course.id } });
    res.json(courseToAdminResponse(course, moduleCount));
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar el curso' });
  }
});

router.delete('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Course.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: 'Curso no encontrado' });
    res.status(204).end();
  } catch {
    res.status(500).json({ error: 'No se pudo eliminar el curso' });
  }
});

router.get('/tools', async (_req, res) => {
  try {
    const tools = await fetchTools();
    res.json(tools.map(toolToResponse));
  } catch {
    res.status(500).json({ error: 'No se pudieron obtener las herramientas' });
  }
});

router.post('/tools', async (req, res) => {
  try {
    const payload = normalizeToolInput(req.body);
    if (!payload) return res.status(400).json({ error: 'Payload invalido' });
    const tool = await Tool.create(payload);
    res.status(201).json(toolToResponse(tool));
  } catch {
    res.status(500).json({ error: 'No se pudo crear la herramienta' });
  }
});

router.put('/tools/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tool = await Tool.findByPk(id);
    if (!tool) return res.status(404).json({ error: 'Herramienta no encontrada' });
    const merged = { ...tool.toJSON(), ...req.body };
    const payload = normalizeToolInput(merged);
    Object.assign(tool, payload);
    await tool.save();
    res.json(toolToResponse(tool));
  } catch {
    res.status(500).json({ error: 'No se pudo actualizar la herramienta' });
  }
});

router.delete('/tools/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Tool.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: 'Herramienta no encontrada' });
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
