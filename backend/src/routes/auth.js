import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User } from '../models/user.js';
import { PasswordReset } from '../models/passwordReset.js';
import { sendMail } from '../services/mailer.js';
import { signToken, requireAuth } from '../utils/auth.js';
import { deriveRoles } from '../utils/roles.js';

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
    // derive roles (legacy mapping)
    const roles = deriveRoles(user);
    const payload = { sub: String(user._id), username: user.username, roles };
    const token = signToken(payload);
    // Enviar tambien en cookie (opcional)
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

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { sub } = req.user || {};
    if (!sub) return res.status(401).json({ error: 'No autorizado' });
    const user = await User.findById(sub).lean();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const roles = deriveRoles(user);
    res.json({ username: user.username, roles, displayName: user.displayName || user.username });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo obtener el usuario' });
  }
});

router.post('/request-reset', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!isValidEmail(email)) return res.status(200).json({ ok: true });
    const normalized = email.trim().toLowerCase();
    const user = await User.findOne({ $or: [{ email: normalized }, { username: normalized }] }).lean();
    if (!user) return res.status(200).json({ ok: true });

    await PasswordReset.deleteMany({ email: normalized });
    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXP_MINUTES * 60 * 1000);

    await PasswordReset.create({ email: normalized, otpHash, expiresAt, attempts: 0, used: false });
    await sendOtpEmail(normalized, otp);

    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] request-reset error', err);
    res.status(500).json({ error: 'No se pudo procesar la solicitud' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, password, confirmPassword } = req.body || {};
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Correo invalido' });
    if (!otp || typeof otp !== 'string' || otp.trim().length < 4) {
      return res.status(400).json({ error: 'OTP invalido' });
    }
    if (!password || password !== confirmPassword) {
      return res.status(400).json({ error: 'Las contrasenas no coinciden' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: 'La contrasena debe tener al menos 8 caracteres, una mayuscula y un simbolo' });
    }

    const normalized = email.trim().toLowerCase();
    const token = await PasswordReset.findOne({ email: normalized, used: false }).sort({ createdAt: -1 }).exec();
    if (!token) return res.status(400).json({ error: 'OTP invalido o expirado' });
    if (token.expiresAt < new Date()) {
      await PasswordReset.deleteOne({ _id: token._id });
      return res.status(400).json({ error: 'OTP expirado' });
    }

    token.attempts = (token.attempts || 0) + 1;
    const matches = await bcrypt.compare(String(otp).trim(), token.otpHash);
    if (!matches) {
      await token.save();
      if (token.attempts >= MAX_RESET_ATTEMPTS) {
        await PasswordReset.deleteOne({ _id: token._id });
      }
      return res.status(400).json({ error: 'OTP invalido' });
    }

    const user = await User.findOne({ $or: [{ email: normalized }, { username: normalized }] }).exec();
    if (!user) {
      await PasswordReset.deleteOne({ _id: token._id });
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();

    token.used = true;
    await token.save();

    await sendMail({
      to: normalized,
      subject: 'codeRonin · Contraseña actualizada',
      text: `Hola,

Tu contraseña fue actualizada correctamente el ${new Date().toISOString()}.
Si no realizaste este cambio, contacta de inmediato a coderonin404@gmail.com.

codeRonin dojo`,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] reset-password error', err);
    res.status(500).json({ error: 'No se pudo restablecer la contraseña' });
  }
});

// Helpers for signup validation
const BANNED_USER_PARTS = [
  'admin','root','system','sys','support','help','seguridad','security','password','pass','coderonin','owner','god','sudo',
  // groserias comunes en espanol/ingles
  'puta','puto','mierda','verga','pene','vagina','culo','zorra','perra','chingar','joder','cono','cabron','fuck','shit','bitch','ass','dick','pussy','porn','xxx'
];

const OTP_EXP_MINUTES = Number(process.env.OTP_EXP_MINUTES || 15);
const MAX_RESET_ATTEMPTS = 5;

function generateOtp() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

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

async function sendOtpEmail(email, otp) {
  const subject = 'codeRonin · Recuperacion de acceso';
  const text = `Hola,

Recibimos una solicitud para restablecer tu contraseña.
Tu codigo OTP es: ${otp}

El codigo expira en ${OTP_EXP_MINUTES} minutos.
Si no solicitaste este cambio, puedes ignorar este mensaje.

codeRonin dojo`;
  try {
    await sendMail({ to: email, subject, text });
  } catch (err) {
    console.error('[auth] No se pudo enviar OTP', err);
  }
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
      roles: ['genin'],
      displayName: nombre,
      name: nombre,
      email: correo,
      phone: celular,
      active: true,
    });
    const payload = { sub: String(user._id), username: user.username, roles: user.roles };
    const token = signToken(payload);
    res.json({ token, user: { username: user.username, roles: user.roles, displayName: user.displayName || user.username } });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo registrar el usuario' });
  }
});
