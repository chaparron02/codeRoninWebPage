import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/user.js';
import { Course } from '../models/course.js';
import { getUserAccess, setUserAccess } from '../services/accessStore.js';

export const router = Router();

function getValue(source, keys = []) {
  if (!source || typeof source !== 'object') return undefined;
  for (const key of keys) {
    if (source && typeof source === 'object' && key in source) {
      source = source[key];
    } else {
      return undefined;
    }
  }
  return source;
}

function collectEmail(payload = {}) {
  const candidates = [
    getValue(payload, ['buyer', 'email']),
    getValue(payload, ['data', 'buyer', 'email']),
    getValue(payload, ['purchase', 'buyer', 'email']),
    getValue(payload, ['customer', 'email']),
    payload.email,
    payload.contact_email,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim().toLowerCase();
  }
  return '';
}

function collectName(payload = {}) {
  const candidates = [
    getValue(payload, ['buyer', 'name']),
    getValue(payload, ['data', 'buyer', 'name']),
    getValue(payload, ['purchase', 'buyer', 'name']),
    payload.name,
    payload.full_name,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function collectProductId(payload = {}) {
  const product = getValue(payload, ['product'])
    || getValue(payload, ['data', 'product'])
    || getValue(payload, ['purchase', 'product'])
    || {};
  const candidates = [product.id, product.ID, payload.product_id, payload.idHotmart];
  for (const value of candidates) {
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return '';
}

function isApproved(payload = {}) {
  const event = String(payload.event || payload.event_name || payload.eventName || '').toUpperCase();
  const status = String(payload.status || payload.purchase?.status || payload.data?.status || '').toUpperCase();
  const purchaseStatus = String(getValue(payload, ['purchase', 'status']) || getValue(payload, ['data', 'purchase', 'status']) || '').toUpperCase();
  return event === 'PURCHASE_APPROVED' || status === 'APPROVED' || purchaseStatus === 'APPROVED';
}

async function ensureUser(email, name = '') {
  let user = await User.findOne({ $or: [{ email }, { username: email }] }).exec();
  if (user) {
    if (!user.email) {
      user.email = email;
      await user.save();
    }
    return user;
  }

  const baseUsername = (email || '').split('@')[0] || 'ronin';
  let candidate = (email || baseUsername).toLowerCase();
  if (!candidate) candidate = `ronin${Date.now()}`;
  let unique = candidate;
  let suffix = 1;
  while (await User.exists({ username: unique })) {
    unique = `${candidate}${suffix++}`;
  }

  const tempPassword = crypto.randomBytes(9).toString('base64');
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  user = await User.create({
    username: unique,
    passwordHash,
    email,
    displayName: name || baseUsername,
    name: name || baseUsername,
    role: 'user',
    roles: ['genin'],
    active: true,
  });

  console.info('[hotmart] nuevo usuario creado', email);
  return user;
}

router.post('/hotmart', async (req, res) => {
  try {
    const secret = process.env.HOTMART_HOTTOK || process.env.HOTMART_SECRET || '';
    if (secret) {
      const tokenHeader = req.headers['hotmart-hottok'] || req.headers['hotmart_token'] || req.query?.hottok;
      if (tokenHeader !== secret) {
        return res.status(401).json({ error: 'Token invalido' });
      }
    }

    let payload = req.body ?? {};
    if (Buffer.isBuffer(payload)) {
      try { payload = JSON.parse(payload.toString('utf8')); } catch { payload = {}; }
    } else if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch { payload = {}; }
    }

    if (!isApproved(payload)) {
      return res.status(200).json({ ok: true, ignored: true });
    }

    const productId = collectProductId(payload);
    if (!productId) {
      console.warn('[hotmart] webhook sin productId');
      return res.status(400).json({ error: 'Producto no identificado' });
    }

    const email = collectEmail(payload);
    if (!email) {
      console.warn('[hotmart] webhook sin email');
      return res.status(400).json({ error: 'Email requerido' });
    }

    const course = await Course.findOne({ productId }).lean();
    if (!course) {
      console.warn('[hotmart] producto sin curso asociado', productId);
      return res.status(404).json({ error: 'Curso no encontrado para producto' });
    }

    const buyerName = collectName(payload);
    const user = await ensureUser(email, buyerName);

    const access = await getUserAccess(String(user._id));
    const existingCourses = new Set(access.courses.map(String));
    existingCourses.add(String(course._id));
    await setUserAccess(String(user._id), { courses: Array.from(existingCourses), services: access.services });

    console.info('[hotmart] acceso otorgado', email, '->', course.title);

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[hotmart] error procesando webhook', err);
    res.status(500).json({ error: 'Procesamiento fallido' });
  }
});

router.get('/hotmart', (_req, res) => {
  res.status(200).json({ ok: true });
});
