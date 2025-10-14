import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/user.js';
import { signToken, requireAuth } from '../utils/auth.js';

export const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Faltan credenciales' });
    const uname = String(username).trim().toLowerCase();
    const user = await User.findOne({ username: uname, active: true }).lean();
    if (!user) return res.status(401).json({ error: 'Usuario o clave invalidos' });
    const freshUser = await User.findById(user._id); // obtener doc para seleccionar hash
    const ok = await bcrypt.compare(password, freshUser.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Usuario o clave invalidos' });
    const payload = { sub: String(user._id), username: user.username, role: user.role };
    const token = signToken(payload);
    // Enviar tambien en cookie (opcional)
    res.cookie?.('cr_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 8,
      path: '/',
    });
    res.json({ token, user: { username: user.username, role: user.role, displayName: user.displayName || user.username } });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo iniciar sesion' });
  }
});

router.post('/logout', (_req, res) => {
  try {
    res.cookie?.('cr_token', '', { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 0, path: '/' });
  } catch {}
  res.status(204).end();
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { sub } = req.user || {};
    if (!sub) return res.status(401).json({ error: 'No autorizado' });
    const user = await User.findById(sub).lean();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ username: user.username, role: user.role, displayName: user.displayName || user.username });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo obtener el usuario' });
  }
});

// Helpers for signup validation
const BANNED_USER_PARTS = [
  'admin','root','system','sys','support','help','seguridad','security','password','pass','coderonin','owner','god','sudo',
  // groserias comunes en espanol/ingles
  'puta','puto','mierda','verga','pene','vagina','culo','zorra','perra','chingar','joder','cono','cabron','fuck','shit','bitch','ass','dick','pussy','porn','xxx'
];

function hasBannedPart(username) {
  const u = String(username).toLowerCase();
  return BANNED_USER_PARTS.some(w => u.includes(w));
}

function isValidUsername(username) {
  if (typeof username !== 'string') return false;
  const u = username.trim();
  if (u.length < 3 || u.length > 32) return false;
  if (!/^[a-zA-Z0-9._-]+$/.test(u)) return false;
  if (hasBannedPart(u)) return false;
  return true;
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
  // 8+ chars, at least one uppercase and one symbol
  return /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/.test(pw);
}

router.post('/signup', async (req, res) => {
  try {
    const { nombre, usuario, correo, celular, password, password2 } = req.body || {};
    if (!nombre || !usuario || !correo || !celular || !password || !password2) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    if (!isValidUsername(usuario)) {
      return res.status(400).json({ error: 'Usuario invalido o no permitido' });
    }
    if (!isValidEmail(correo)) {
      return res.status(400).json({ error: 'Correo invalido' });
    }
    if (!isValidPhone(celular)) {
      return res.status(400).json({ error: 'Numero de celular invalido' });
    }
    if (password !== password2) {
      return res.status(400).json({ error: 'Las contrasenas no coinciden' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: 'La contrasena debe tener al menos 8 caracteres, una mayuscula y un simbolo' });
    }
    const uname = String(usuario).trim().toLowerCase();
    const exists = await User.findOne({ username: uname }).lean();
    if (exists) return res.status(409).json({ error: 'El usuario ya existe' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: uname,
      passwordHash: hash,
      role: 'user',
      displayName: nombre,
      name: nombre,
      email: correo,
      phone: celular,
      active: true,
    });
    const payload = { sub: String(user._id), username: user.username, role: user.role };
    const token = signToken(payload);
    res.json({ token, user: { username: user.username, role: user.role, displayName: user.displayName || user.username } });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo registrar el usuario' });
  }
});
