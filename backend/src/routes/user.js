import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../utils/auth.js';
import { User } from '../models/user.js';
import { Course } from '../models/course.js';
import { readJSON } from '../storage/fileStore.js';
import { loadModules } from '../services/scrollsStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const MATERIAL_DIR = path.join(ROOT_DIR, 'material');
const USER_COURSES_KEY = 'user_courses_access.json';

export const router = Router();

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

function resolveRoles(user) {
  if (!user) return [];
  if (Array.isArray(user.roles) && user.roles.length) return user.roles;
  if (user.role === 'admin') return ['gato'];
  if (user.role) return ['genin'];
  return [];
}

async function ensureCoursesSeeded() {
  let list = await Course.find({}).sort({ createdAt: 1 }).lean();
  if (Array.isArray(list) && list.length) return list;
  let fallback = await readJSON('courses.json', []);
  if (!Array.isArray(fallback) || !fallback.length) {
    try {
      const fallbackPath = path.join(ROOT_DIR, 'frontend', 'public', 'api', 'courses.json');
      if (fs.existsSync(fallbackPath)) {
        const raw = fs.readFileSync(fallbackPath);
        const parsed = JSON.parse(String(raw));
        if (Array.isArray(parsed)) fallback = parsed;
      }
    } catch {}
  }
  if (Array.isArray(fallback) && fallback.length) {
    try {
      const docs = fallback.map(c => ({
        title: c.title,
        description: c.description || '',
        image: c.image || '',
        tags: Array.isArray(c.tags) ? c.tags : [],
        modalidad: (c.modalidad || c.modality) || 'virtual',
        price: c.price != null ? String(c.price) : undefined,
        link: c.link || undefined,
        category: c.category || undefined,
      }));
      if (docs.length) await Course.insertMany(docs);
      list = await Course.find({}).sort({ createdAt: 1 }).lean();
    } catch {}
  }
  return Array.isArray(list) ? list : [];
}

router.get('/profile', requireAuth, async (req, res) => {
  try {
    const u = await User.findById(req.user.sub).lean();
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({
      username: u.username,
      name: u.name || u.displayName || '',
      displayName: u.displayName || u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      roles: (Array.isArray(u.roles) && u.roles.length) ? u.roles : (u.role === 'admin' ? ['gato'] : (u.role ? ['genin'] : [])),
      avatarUrl: u.avatarUrl || '',
    });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo obtener el perfil' });
  }
});

router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, email, phone } = req.body || {};
    const u = await User.findById(req.user.sub).exec();
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (name && typeof name === 'string') {
      u.name = name; u.displayName = name;
    }
    if (email != null) {
      if (!isValidEmail(email)) return res.status(400).json({ error: 'Correo invalido' });
      u.email = email;
    }
    if (phone != null) {
      if (!isValidPhone(phone)) return res.status(400).json({ error: 'Celular invalido' });
      u.phone = phone;
    }
    await u.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo actualizar el perfil' });
  }
});

router.post('/avatar', requireAuth, async (req, res) => {
  try {
    const { dataUrl } = req.body || {};
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Imagen invalida' });
    }
    const m = /^data:(image\/(png|jpe?g|webp));base64,(.+)$/.exec(dataUrl);
    if (!m) return res.status(400).json({ error: 'Formato no soportado' });
    const ext = m[2] === 'jpeg' ? 'jpg' : (m[2] || 'png');
    const buf = Buffer.from(m[3], 'base64');
    const userId = req.user.sub;
    const dir = path.join(MATERIAL_DIR, 'avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${userId}.${ext}`);
    fs.writeFileSync(file, buf);
    const url = `/material/avatars/${userId}.${ext}`;
    await User.updateOne({ _id: userId }, { $set: { avatarUrl: url } }).exec();
    res.json({ ok: true, url });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo actualizar el avatar' });
  }
});

router.get('/courses', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).lean();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const roles = resolveRoles(user);
    const canAccessAll = roles.includes('gato') || roles.includes('sensei');
    let courses = [];
    if (canAccessAll) {
      courses = await ensureCoursesSeeded();
    } else if (roles.includes('genin')) {
      const map = await readJSON(USER_COURSES_KEY, {});
      const allowed = Array.isArray(map?.[String(user._id)]) ? map[String(user._id)] : [];
      if (allowed.length) {
        courses = await Course.find({ _id: { $in: allowed } }).sort({ createdAt: 1 }).lean();
      } else {
        courses = [];
      }
    }
    res.json({ courses, roles });
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron obtener cursos' });
  }
});

router.get('/courses/:courseId/modules', requireAuth, async (req, res) => {
  try {
    const courseId = decodeURIComponent(req.params.courseId || '');
    if (!courseId) return res.status(400).json({ error: 'Curso requerido' });
    const user = await User.findById(req.user.sub).lean();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const roles = resolveRoles(user);
    const allowedRoles = ['gato', 'sensei', 'genin'];
    if (!roles.some(r => allowedRoles.includes(r))) return res.status(403).json({ error: 'Sin permisos' });
    if (roles.includes('genin')) {
      const map = await readJSON(USER_COURSES_KEY, {});
      const allowed = Array.isArray(map?.[String(user._id)]) ? map[String(user._id)] : [];
      if (!allowed.includes(courseId)) {
        return res.status(403).json({ error: 'Curso no asignado' });
      }
    }
    const modules = await loadModules();
    const filtered = modules
      .filter(m => (m.course || '') === courseId)
      .sort((a, b) => (a.order || 0) - (b.order || 0) || (a.createdAt || '').localeCompare(b.createdAt || ''));
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron obtener modulos' });
  }
});

router.put('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Las contrasenas no coinciden' });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ error: 'La contrasena debe tener al menos 8 caracteres, una mayuscula y un simbolo' });
    }
    const user = await User.findById(req.user.sub).exec();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }
    const reused = await bcrypt.compare(newPassword, user.passwordHash);
    if (reused) {
      return res.status(400).json({ error: 'La nueva contraseña debe ser diferente a la actual' });
    }
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo actualizar la contraseña' });
  }
});
