import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { Op } from 'sequelize';
import { requireAuth } from '../utils/auth.js';
import { deriveRoles } from '../utils/roles.js';
import { models } from '../db/models/index.js';

const { Report, User, ReportAttachment, ReportChatMessage, ReportChatAttachment } = models;

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

function isDaimyo(roles) {
  return Array.isArray(roles) && roles.includes('daimyo');
}

async function findUserById(id) {
  if (!id) return null;
  return User.findByPk(id);
}

function safeFilename(original = 'file') {
  return String(original || 'file').replace(/[^a-zA-Z0-9._-]+/g, '_');
}

function attachmentDownloadUrl(reportId, attachmentId) {
  return `/api/reports/${encodeURIComponent(reportId)}/attachments/${encodeURIComponent(attachmentId)}/download`;
}

function chatAttachmentDownloadUrl(reportId, attachmentId) {
  return `/api/reports/${encodeURIComponent(reportId)}/chat/${encodeURIComponent(attachmentId)}/download`;
}

async function ensureReportAccess(report, userId) {
  if (!report || !userId) return null;
  const user = await User.findByPk(userId);
  if (!user) return null;
  const roles = deriveRoles(user.toJSON());
  const isAssigned = report.shogunId === user.id;
  const isOwner = report.clientId === user.id;
  const isSponsor = report.sponsorId === user.id;
  if (isShogun(roles) || isAssigned || isOwner || isSponsor) {
    return { user, roles };
  }
  return null;
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

const baseReportInclude = [
  { model: ReportAttachment, as: 'attachments' },
  { model: User, as: 'client', attributes: ['id', 'username', 'name', 'displayName'] },
  { model: User, as: 'shogun', attributes: ['id', 'username', 'name', 'displayName'] },
  { model: User, as: 'sponsor', attributes: ['id', 'username', 'name', 'displayName'] },
];

const chatInclude = [
  {
    model: ReportChatMessage,
    as: 'chat',
    include: [
      { model: User, as: 'author', attributes: ['id', 'username', 'name', 'displayName'] },
      { model: ReportChatAttachment, as: 'attachments', include: [{ model: User, as: 'chatAttachmentUploader', attributes: ['id', 'username'] }] },
    ],
    order: [['createdAt', 'ASC']],
  },
];

function serializeReport(report, { includeChat = false } = {}) {
  if (!report) return null;
  const plain = typeof report.toJSON === 'function' ? report.toJSON() : report;
  const base = {
    id: plain.id,
    title: plain.title,
    summary: plain.summary || '',
    clientId: plain.clientId,
    shogunId: plain.shogunId,
    sponsorId: plain.sponsorId,
    service: plain.service || '',
    progress: plain.progress ?? 0,
    status: plain.status || '',
    tags: plain.tags || [],
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    attachments: safeArray(plain.attachments).map((att) => ({
      id: att.id,
      name: att.name,
      url: att.url || attachmentDownloadUrl(plain.id, att.id),
      mime: att.mime || '',
      size: att.size || 0,
      uploadedBy: att.uploadedByUserId
        ? {
            userId: att.uploadedByUserId,
            username: att.uploadedByUsername || '',
            role: att.uploadedByRole || '',
          }
        : null,
      createdAt: att.createdAt,
    })),
  };
  if (plain.client) {
    base.client = {
      id: plain.client.id,
      username: plain.client.username,
      name: plain.client.displayName || plain.client.name || '',
    };
  }
  if (plain.shogun) {
    base.shogun = {
      id: plain.shogun.id,
      username: plain.shogun.username,
      name: plain.shogun.displayName || plain.shogun.name || '',
    };
  }
  if (plain.sponsor) {
    base.sponsor = {
      id: plain.sponsor.id,
      username: plain.sponsor.username,
      name: plain.sponsor.displayName || plain.sponsor.name || '',
    };
  }
  if (includeChat) {
    base.chat = safeArray(plain.chat).map((msg) => ({
      id: msg.id,
      user: msg.userId
        ? {
            userId: msg.userId,
            username: msg.username || msg.author?.username || '',
            role: msg.role || '',
          }
        : null,
      message: msg.message || '',
      attachments: safeArray(msg.attachments).map((att) => ({
        id: att.id,
        name: att.name,
        url: att.url || chatAttachmentDownloadUrl(plain.id, att.id),
        mime: att.mime || '',
        size: att.size || 0,
        uploadedBy: att.uploadedByUserId
          ? {
              userId: att.uploadedByUserId,
              username: att.uploadedByUsername || att.chatAttachmentUploader?.username || '',
              role: att.uploadedByRole || '',
            }
          : null,
        createdAt: att.createdAt,
      })),
      createdAt: msg.createdAt,
    }));
  }
  return base;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

router.get('/', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.sub);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const roles = deriveRoles(user.toJSON());
    const where = {};
    if (isShogun(roles)) {
      // full access
    } else {
      const clauses = [];
      if (isShinobi(roles)) clauses.push({ clientId: user.id });
      if (isDaimyo(roles)) clauses.push({ sponsorId: user.id });
      if (!clauses.length) {
        return res.status(403).json({ error: 'Sin permisos' });
      }
      Object.assign(where, clauses.length === 1 ? clauses[0] : { [Op.or]: clauses });
    }
    const reports = await Report.findAll({
      where,
      include: baseReportInclude,
      order: [['updatedAt', 'DESC']],
    });
    res.json(reports.map((r) => serializeReport(r)));
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron obtener reportes' });
  }
});

router.post('/', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.sub);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const roles = deriveRoles(user.toJSON());
    if (!isShogun(roles)) return res.status(403).json({ error: 'Solo shogun puede crear reportes' });

    const { title, service, clientId, shogunId, sponsorId, summary = '', status = 'iniciando', tags = [] } = req.body || {};
    if (!title || !service || !clientId) return res.status(400).json({ error: 'Titulo, servicio y cliente son requeridos' });
    const clientUser = await findUserById(clientId);
    if (!clientUser) return res.status(404).json({ error: 'Cliente no encontrado' });
    const clientRoles = deriveRoles(clientUser.toJSON());
    if (!clientRoles.includes('shinobi')) return res.status(400).json({ error: 'El cliente debe tener rol shinobi' });
    const shogunUser = shogunId ? await findUserById(shogunId) : user;
    if (!shogunUser) return res.status(404).json({ error: 'Shogun no encontrado' });
    const shogunRoles = deriveRoles(shogunUser.toJSON());
    if (!shogunRoles.includes('gato')) return res.status(400).json({ error: 'El shogun debe tener rol gato' });

    let sponsor = null;
    if (sponsorId) {
      sponsor = await findUserById(sponsorId);
      if (!sponsor) return res.status(404).json({ error: 'Daimyo no encontrado' });
      const sponsorRoles = deriveRoles(sponsor.toJSON());
      if (!sponsorRoles.includes('daimyo')) return res.status(400).json({ error: 'El daimyo debe tener rol valido' });
    }

    const doc = await Report.create({
      title,
      summary,
      service,
      clientId: clientUser.id,
      shogunId: shogunUser.id,
      sponsorId: sponsor ? sponsor.id : null,
      progress: 0,
      status: status || 'iniciando',
      tags: Array.isArray(tags) ? tags : [],
    });
    const lookupReport = await Report.findByPk(doc.id, { include: baseReportInclude });
    res.status(201).json(serializeReport(lookupReport));
  } catch (err) {
    res.status(500).json({ error: 'No se pudo crear el reporte' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findByPk(id, { include: [...baseReportInclude, ...chatInclude] });
    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });
    const user = await User.findByPk(req.user.sub);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const roles = deriveRoles(user.toJSON());
    const isOwner = report.clientId === user.id;
    const isAssigned = report.shogunId === user.id;
    const isSponsor = report.sponsorId === user.id;
    if (!(isShogun(roles) || isOwner || isAssigned || isSponsor)) {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    res.json(serializeReport(report, { includeChat: true }));
  } catch (err) {
    res.status(500).json({ error: 'No se pudo obtener el reporte' });
  }
});

router.put('/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { progress, status } = req.body || {};
    const report = await Report.findByPk(id, { include: baseReportInclude });
    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });
    const user = await User.findByPk(req.user.sub);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const roles = deriveRoles(user.toJSON());
    const isAssigned = report.shogunId === user.id;
    if (!isShogun(roles) && !isAssigned) {
      return res.status(403).json({ error: 'Solo shogun puede actualizar progreso' });
    }
    if (progress != null) {
      const value = Math.min(Math.max(Number(progress) || 0, 0), 100);
      report.progress = value;
    }
    if (status != null) {
      report.status = String(status || '').trim().slice(0, 160) || report.status;
    }
    await report.save();
    const fresh = await Report.findByPk(report.id, { include: baseReportInclude });
    res.json(serializeReport(fresh));
  } catch (err) {
    res.status(500).json({ error: 'No se pudo actualizar el progreso' });
  }
});

router.post('/:id/attachment', uploadReportFile.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findByPk(id);
    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });
    const user = await User.findByPk(req.user.sub);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const roles = deriveRoles(user.toJSON());
    const isAssigned = report.shogunId === user.id;
    const isOwner = report.clientId === user.id;
    if (!(isShogun(roles) || isAssigned || isOwner)) {
      return res.status(403).json({ error: 'Sin permisos para subir informes' });
    }
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
    const storagePath = path.join(REPORT_FILES_DIR, req.file.filename);
    const info = await ReportAttachment.create({
      reportId: report.id,
      name: req.file.originalname || req.file.filename,
      url: '',
      storagePath,
      mime: req.file.mimetype || '',
      size: req.file.size || 0,
      uploadedByUserId: user.id,
      uploadedByUsername: user.username,
      uploadedByRole: roles[0] || '',
    });
    const downloadUrl = attachmentDownloadUrl(report.id, info.id);
    info.url = downloadUrl;
    await info.save();
    res.status(201).json({
      id: info.id,
      name: info.name,
      url: downloadUrl,
      mime: info.mime,
      size: info.size,
      uploadedBy: { userId: user.id, username: user.username, role: roles[0] || '' },
      createdAt: info.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo subir el archivo' });
  }
});

router.post('/:id/chat', uploadChatFile.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findByPk(id);
    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });
    const user = await User.findByPk(req.user.sub);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const roles = deriveRoles(user.toJSON());
    const isAssigned = report.shogunId === user.id;
    const isOwner = report.clientId === user.id;
    const isSponsor = report.sponsorId === user.id;
    if (!(isShogun(roles) || isAssigned || isOwner || isSponsor)) {
      return res.status(403).json({ error: 'Sin permisos para participar en el reporte' });
    }
    const messageText = req.body?.message ? String(req.body.message).trim() : '';
    if (!messageText && !req.file) {
      return res.status(400).json({ error: 'Mensaje o archivo requerido' });
    }
    const chatEntry = await ReportChatMessage.create({
      reportId: report.id,
      userId: user.id,
      username: user.username,
      role: roles[0] || '',
      message: messageText,
    });
    if (req.file) {
      const storagePath = path.join(CHAT_FILES_DIR, req.file.filename);
      const chatFile = await ReportChatAttachment.create({
        messageId: chatEntry.id,
        name: req.file.originalname || req.file.filename,
        url: '',
        storagePath,
        mime: req.file.mimetype || '',
        size: req.file.size || 0,
        uploadedByUserId: user.id,
        uploadedByUsername: user.username,
        uploadedByRole: roles[0] || '',
      });
      chatFile.url = chatAttachmentDownloadUrl(report.id, chatFile.id);
      await chatFile.save();
    }
    const freshMessage = await ReportChatMessage.findByPk(chatEntry.id, { include: chatInclude[0].include });
    res.status(201).json({
      id: freshMessage.id,
      user: { userId: user.id, username: user.username, role: roles[0] || '' },
      message: freshMessage.message || '',
      attachments: safeArray(freshMessage.attachments).map((att) => ({
        id: att.id,
        name: att.name,
        url: att.url || chatAttachmentDownloadUrl(report.id, att.id),
        mime: att.mime || '',
        size: att.size || 0,
        uploadedBy: { userId: user.id, username: user.username, role: roles[0] || '' },
        createdAt: att.createdAt,
      })),
      createdAt: freshMessage.createdAt,
    });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo guardar el mensaje' });
  }
});

router.get('/:id/attachments/:attachmentId/download', async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const report = await Report.findByPk(id);
    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });
    const attachment = await ReportAttachment.findByPk(attachmentId);
    if (!attachment || attachment.reportId !== report.id) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    const access = await ensureReportAccess(report, req.user.sub);
    if (!access) return res.status(403).json({ error: 'Sin permisos' });
    const fallbackName = attachment.url ? path.basename(attachment.url) : '';
    const filePath = attachment.storagePath || (fallbackName ? path.join(REPORT_FILES_DIR, fallbackName) : null);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no disponible' });
    }
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.name || 'archivo')}"`);
    res.sendFile(path.resolve(filePath));
  } catch (err) {
    res.status(500).json({ error: 'No se pudo descargar el archivo' });
  }
});

router.get('/:id/chat/:attachmentId/download', async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const report = await Report.findByPk(id);
    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' });
    const attachment = await ReportChatAttachment.findByPk(attachmentId, {
      include: [{ model: ReportChatMessage, attributes: ['reportId'] }],
    });
    if (!attachment || !attachment.messageId) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    const messageReportId = attachment.ReportChatMessage?.reportId;
    if (!messageReportId || messageReportId !== report.id) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    const access = await ensureReportAccess(report, req.user.sub);
    if (!access) return res.status(403).json({ error: 'Sin permisos' });
    const fallbackName = attachment.url ? path.basename(attachment.url) : '';
    const filePath = attachment.storagePath || (fallbackName ? path.join(CHAT_FILES_DIR, fallbackName) : null);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo no disponible' });
    }
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.name || 'archivo')}"`);
    res.sendFile(path.resolve(filePath));
  } catch (err) {
    res.status(500).json({ error: 'No se pudo descargar el archivo del chat' });
  }
});
