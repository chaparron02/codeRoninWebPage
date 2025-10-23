import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import mongoose from 'mongoose';
import { requireAuth } from '../utils/auth.js';
import { deriveRoles } from '../utils/roles.js';
import { Report } from '../models/report.js';
import { User } from '../models/user.js';

export const router = Router();

router.use(requireAuth);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const MATERIAL_DIR = path.join(ROOT_DIR, 'material');
const REPORT_DIR = path.join(MATERIAL_DIR, 'reports');
const REPORT_FILES_DIR = path.join(REPORT_DIR, 'files');
const CHAT_FILES_DIR = path.join(REPORT_DIR, 'chat');

[REPORT_DIR, REPORT_FILES_DIR, CHAT_FILES_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function isShogun(roles) {
  return Array.isArray(roles) && roles.includes('gato');
}

function isShinobi(roles) {
  return Array.isArray(roles) && roles.includes('shinobi');
}

async function findUserById(id) {
  if (!id) return null;
  try {
    const user = await User.findById(id).lean();
    return user;
  } catch {
    return null;
  }
}

function safeFilename(original = 'file') {
  return String(original || 'file').replace(/[^a-zA-Z0-9._-]+/g, '_');
}

const reportStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, REPORT_FILES_DIR),
  filename: (_req, file, cb) => cb(null, `${Date.now()}_${safeFilename(file.originalname)}`),
});

const chatStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CHAT_FILES_DIR),
  filename: (_req, file, cb) => cb(null, `${Date.now()}_${safeFilename(file.originalname)}`),
});

const uploadReportFile = multer({
  storage: reportStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

const uploadChatFile = multer({
  storage: chatStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

function serializeReport(doc, { includeChat = false, userLookup = null } = {}) {
  if (!doc) return null;
  const base = {
    id: String(doc._id),
    title: doc.title,
    summary: doc.summary || '',
    clientId: doc.clientId ? String(doc.clientId) : null,
    shogunId: doc.shogunId ? String(doc.shogunId) : null,
    service: doc.service || '',
    progress: doc.progress ?? 0,
    status: doc.status || '',
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    attachments: (doc.attachments || []).map((att) => ({
      id: att._id ? String(att._id) : String(new mongoose.Types.ObjectId()),
      name: att.name,
      url: att.url,
      mime: att.mime || '',
      size: att.size || 0,
      uploadedBy: att.uploadedBy
        ? {
            userId: att.uploadedBy.userId ? String(att.uploadedBy.userId) : null,
            username: att.uploadedBy.username || '',
            role: att.uploadedBy.role || '',
          }
        : null,
      createdAt: att.createdAt,
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
  if (userLookup) {
    if (base.clientId && userLookup.has(base.clientId)) {
      const user = userLookup.get(base.clientId);
      base.client = { id: base.clientId, username: user.username || '', name: user.name || '' };
    }
    if (base.shogunId && userLookup.has(base.shogunId)) {
      const user = userLookup.get(base.shogunId);
      base.shogun = { id: base.shogunId, username: user.username || '', name: user.name || '' };
    }
  }
  if (includeChat) {
    base.chat = (doc.chat || []).map((msg) => ({
      id: msg._id ? String(msg._id) : String(new mongoose.Types.ObjectId()),
      user: msg.user
        ? {
            userId: msg.user.userId ? String(msg.user.userId) : null,
            username: msg.user.username || '',
            role: msg.user.role || '',
          }
        : null,
      message: msg.message || '',
      attachments: (msg.attachments || []).map((att) => ({
        id: att._id ? String(att._id) : String(new mongoose.Types.ObjectId()),
        name: att.name,
        url: att.url,
        mime: att.mime || '',
        size: att.size || 0,
        uploadedBy: att.uploadedBy
          ? {
              userId: att.uploadedBy.userId ? String(att.uploadedBy.userId) : null,
              username: att.uploadedBy.username || '',
              role: att.uploadedBy.role || '',
            }
          : null,
        createdAt: att.createdAt,
      })),
      createdAt: msg.createdAt,
    }));
  }
  return base;
}

router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).lean();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const roles = deriveRoles(user);
    const query = {};
    if (isShogun(roles)) {
      // Can see all; optionally filter by own id if desired.
    } else if (isShinobi(roles)) {
      query.clientId = user._id;
    } else {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    const reports = await Report.find(query).sort({ updatedAt: -1 }).lean();
    const ids = new Set();
    reports.forEach(r => {
      if (r.clientId) ids.add(String(r.clientId));
      if (r.shogunId) ids.add(String(r.shogunId));
    });
    const users = ids.size ? await User.find({ _id: { $in: Array.from(ids) } }, { username: 1, name: 1 }).lean() : [];
    const lookup = new Map(users.map(u => [String(u._id), u]));
    res.json(reports.map((r) => serializeReport(r, { userLookup: lookup })));
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron obtener reportes' });
  }
});

router.post('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).lean();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const roles = deriveRoles(user);
    if (!isShogun(roles)) return res.status(403).json({ error: 'Solo shogun puede crear reportes' });

    const { title, service, clientId, shogunId, summary = '', status = 'iniciando', tags = [] } = req.body || {};
    if (!title || !service || !clientId) return res.status(400).json({ error: 'Titulo, servicio y cliente son requeridos' });
    const clientUser = await findUserById(clientId);
    if (!clientUser) return res.status(404).json({ error: 'Cliente no encontrado' });
    const clientRoles = deriveRoles(clientUser);
    if (!clientRoles.includes('shinobi')) return res.status(400).json({ error: 'El cliente debe tener rol shinobi' });
    const shogunUser = shogunId ? await findUserById(shogunId) : user;
    if (!shogunUser) return res.status(404).json({ error: 'Shogun no encontrado' });
    const shogunRoles = deriveRoles(shogunUser);
    if (!shogunRoles.includes('gato')) return res.status(400).json({ error: 'El shogun debe tener rol gato' });

    const doc = await Report.create({
      title,
      summary,
      service,
      clientId: clientUser._id,
      shogunId: shogunUser._id,
      progress: 0,
      status: status || 'iniciando',
      tags: Array.isArray(tags) ? tags : [],
    });
    const lookup = new Map([[String(clientUser._id), clientUser],[String(shogunUser._id), shogunUser]]);
    res.status(201).json(serializeReport(doc, { userLookup: lookup }));
  } catch (err) {
    res.status(500).json({ error: 'No se pudo crear el reporte' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Report.findById(id).lean();
    if (!doc) return res.status(404).json({ error: 'Reporte no encontrado' });
    const user = await User.findById(req.user.sub).lean();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const roles = deriveRoles(user);
    const isOwner = doc.clientId && String(doc.clientId) === String(user._id);
    const isAssigned = doc.shogunId && String(doc.shogunId) === String(user._id);
    if (!(isShogun(roles) || isOwner || isAssigned)) {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    const ids = new Set();
    if (doc.clientId) ids.add(String(doc.clientId));
    if (doc.shogunId) ids.add(String(doc.shogunId));
    const users = ids.size ? await User.find({ _id: { $in: Array.from(ids) } }, { username: 1, name: 1 }).lean() : [];
    const lookup = new Map(users.map(u => [String(u._id), u]));
    res.json(serializeReport(doc, { includeChat: true, userLookup: lookup }));
  } catch (err) {
    res.status(500).json({ error: 'No se pudo obtener el reporte' });
  }
});

router.put('/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { progress, status } = req.body || {};
    const doc = await Report.findById(id).exec();
    if (!doc) return res.status(404).json({ error: 'Reporte no encontrado' });
    const user = await User.findById(req.user.sub).lean();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const roles = deriveRoles(user);
    const isAssigned = doc.shogunId && String(doc.shogunId) === String(user._id);
    if (!isShogun(roles) && !isAssigned) {
      return res.status(403).json({ error: 'Solo shogun puede actualizar progreso' });
    }
    if (progress != null) {
      const value = Math.min(Math.max(Number(progress) || 0, 0), 100);
      doc.progress = value;
    }
    if (status != null) {
      doc.status = String(status || '').trim().slice(0, 160) || doc.status;
    }
    await doc.save();
    res.json(serializeReport(doc));
  } catch (err) {
    res.status(500).json({ error: 'No se pudo actualizar el progreso' });
  }
});

router.post('/:id/attachment', uploadReportFile.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Report.findById(id).exec();
    if (!doc) return res.status(404).json({ error: 'Reporte no encontrado' });
    const user = await User.findById(req.user.sub).lean();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const roles = deriveRoles(user);
    const isAssigned = doc.shogunId && String(doc.shogunId) === String(user._id);
    if (!isShogun(roles) && !isAssigned) {
      return res.status(403).json({ error: 'Sin permisos para subir informes' });
    }
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
    const info = {
      name: req.file.originalname || req.file.filename,
      url: `/material/reports/files/${encodeURIComponent(req.file.filename)}`,
      mime: req.file.mimetype || '',
      size: req.file.size || 0,
      uploadedBy: {
        userId: user._id,
        username: user.username || '',
        role: roles[0] || '',
      },
      createdAt: new Date(),
    };
    doc.attachments.push(info);
    await doc.save();
    res.status(201).json(info);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo subir el archivo' });
  }
});

router.post('/:id/chat', uploadChatFile.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await Report.findById(id).exec();
    if (!doc) return res.status(404).json({ error: 'Reporte no encontrado' });
    const user = await User.findById(req.user.sub).lean();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const roles = deriveRoles(user);
    const isAssigned = doc.shogunId && String(doc.shogunId) === String(user._id);
    const isOwner = doc.clientId && String(doc.clientId) === String(user._id);
    if (!(isShogun(roles) || isAssigned || isOwner)) {
      return res.status(403).json({ error: 'Sin permisos para participar en el reporte' });
    }
    const messageText = req.body?.message ? String(req.body.message).trim() : '';
    if (!messageText && !req.file) {
      return res.status(400).json({ error: 'Mensaje o archivo requerido' });
    }
    const chatEntry = {
      user: {
        userId: user._id,
        username: user.username || '',
        role: roles[0] || '',
      },
      message: messageText,
      attachments: [],
      createdAt: new Date(),
    };
    if (req.file) {
      chatEntry.attachments.push({
        name: req.file.originalname || req.file.filename,
        url: `/material/reports/chat/${encodeURIComponent(req.file.filename)}`,
        mime: req.file.mimetype || '',
        size: req.file.size || 0,
        uploadedBy: {
          userId: user._id,
          username: user.username || '',
          role: roles[0] || '',
        },
        createdAt: new Date(),
      });
    }
    doc.chat.push(chatEntry);
    await doc.save();
    const lastMessage = doc.chat[doc.chat.length - 1];
    res.status(201).json({
      id: lastMessage._id ? String(lastMessage._id) : String(new mongoose.Types.ObjectId()),
      ...chatEntry,
    });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo guardar el mensaje' });
  }
});
