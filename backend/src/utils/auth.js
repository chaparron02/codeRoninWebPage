import jwt from 'jsonwebtoken';

const DEFAULT_TTL = '8h';

export function getJwtSecret() {
  return process.env.JWT_SECRET || 'dev-secret-change-me';
}

export function signToken(payload, opts = {}) {
  const secret = getJwtSecret();
  const options = { expiresIn: DEFAULT_TTL, ...opts };
  return jwt.sign(payload, secret, options);
}

export function verifyToken(token) {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
}

export function extractToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  const cookie = req.headers['cookie'] || '';
  const m = /(?:^|;\s*)cr_token=([^;]+)/.exec(cookie);
  if (m) return decodeURIComponent(m[1]);
  return null;
}

export function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: 'No autorizado' });
    const payload = verifyToken(token);
    req.user = payload;
    return next();
  } catch (_e) {
    return res.status(401).json({ error: 'Sesion invalida' });
  }
}

export function requireAdmin(req, res, next) {
  return requireAuth(req, res, () => {
    const roles = (req.user && Array.isArray(req.user.roles)) ? req.user.roles : [];
    if (!roles.includes('gato')) {
      return res.status(403).json({ error: 'Requiere rol gato' });
    }
    next();
  });
}

export function requireRoles(allowed = []) {
  return (req, res, next) =>
    requireAuth(req, res, () => {
      const roles = (req.user && Array.isArray(req.user.roles)) ? req.user.roles : [];
      const ok = allowed.some(r => roles.includes(r));
      if (!ok) return res.status(403).json({ error: 'Rol insuficiente' });
      next();
    });
}
