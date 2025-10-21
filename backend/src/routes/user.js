import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../utils/auth.js';
import { User } from '../models/user.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const MATERIAL_DIR = path.join(ROOT_DIR, 'material');

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
