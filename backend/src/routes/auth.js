import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { models } from '../db/models/index.js';
import { signToken, requireAuth } from '../utils/auth.js';
import { deriveRoles } from '../utils/roles.js';

const { User, PasswordResetRequest } = models;

const MAX_LOGIN_ATTEMPTS = 3;
const LOGIN_LOCK_MS = 30 * 60 * 1000;
const loginAttempts = new Map();

const RECOVERY_LIMIT = 3;
const RECOVERY_WINDOW_MS = 60 * 60 * 1000;
const recoveryLimiter = new Map();

export const router = Router();

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function getAttempt(uname) {
  const entry = loginAttempts.get(uname) || { attempts: 0, lockedUntil: null };
  if (entry.lockedUntil && entry.lockedUntil < Date.now()) {
    entry.attempts = 0;
    entry.lockedUntil = null;
    loginAttempts.set(uname, entry);
  }
  return entry;
}

function recordFailure(uname) {
  const entry = getAttempt(uname);
  entry.attempts += 1;
  if (entry.attempts >= MAX_LOGIN_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOGIN_LOCK_MS;
  }
  loginAttempts.set(uname, entry);
  return entry.lockedUntil;
}

function clearAttempts(uname) {
  loginAttempts.delete(uname);
}

function canSubmitRecovery(key) {
  const now = Date.now();
  const history = recoveryLimiter.get(key) || [];
  const fresh = history.filter((ts) => now - ts < RECOVERY_WINDOW_MS);
  if (fresh.length >= RECOVERY_LIMIT) return false;
  fresh.push(now);
  recoveryLimiter.set(key, fresh);
  return true;
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Faltan credenciales' });
    const uname = normalizeKey(username);
    const attempt = getAttempt(uname);
    if (attempt.lockedUntil && attempt.lockedUntil > Date.now()) {
      const minutes = Math.ceil((attempt.lockedUntil - Date.now()) / 60000);
      return res.status(423).json({ error: `Cuenta bloqueada temporalmente. Intenta en ${minutes} min.` });
    }
    const user = await User.findOne({ where: { username: uname, active: true } });
    if (!user) {
      recordFailure(uname);
      return res.status(401).json({ error: 'Usuario o clave invalidos' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      const lockUntil = recordFailure(uname);
      if (lockUntil) {
        return res.status(423).json({ error: 'Cuenta bloqueada temporalmente. Intenta en 30 min.' });
      }
      return res.status(401).json({ error: 'Usuario o clave invalidos' });
    }
    clearAttempts(uname);
    const plain = user.toJSON();
    const roles = deriveRoles(plain);
    const payload = { sub: String(user.id), username: user.username, roles };
    const token = signToken(payload);
    res.cookie?.('cr_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 8,
      path: '/',
    });
    res.json({ token, user: { username: user.username, roles, displayName: user.displayName || user.username } });
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

router.post('/recover', async (req, res) => {
  try {
    const { username = '', email = '', message = '' } = req.body || {};
    if (!username && !email) {
      return res.status(400).json({ error: 'Usuario o correo requerido' });
    }
    const key = normalizeKey(username || email || req.ip || 'anon');
    if (!canSubmitRecovery(key)) {
      return res.status(429).json({ error: 'Has enviado demasiadas solicitudes. Intenta en unos minutos.' });
    }
    const requestIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || req.ip || '';
    await PasswordResetRequest.create({
      username: username || null,
      email: email || null,
      message: String(message || ''),
      requestIp,
      status: 'pending',
    });
    res.json({ ok: true, message: 'Solicitud registrada. Un administrador revisará tu cuenta.' });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo registrar la solicitud' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { sub } = req.user || {};
    if (!sub) return res.status(401).json({ error: 'No autorizado' });
    const user = await User.findByPk(sub);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const roles = deriveRoles(user.toJSON());
    res.json({
      username: user.username,
      roles,
      displayName: user.displayName || user.username,
      email: user.email || '',
    });
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
    const exists = await User.findOne({ where: { username: uname } });
    if (exists) return res.status(409).json({ error: 'El usuario ya existe' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: uname,
      passwordHash: hash,
      role: 'user',
      roles: ['genin'],
      displayName: nombre,
      name: nombre,
      email: correo,
      phone: celular,
      active: true,
    });
    const payload = { sub: String(user.id), username: user.username, roles: user.roles };
    const token = signToken(payload);
    res.json({ token, user: { username: user.username, roles: user.roles, displayName: user.displayName || user.username } });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo registrar el usuario' });
  }
});
