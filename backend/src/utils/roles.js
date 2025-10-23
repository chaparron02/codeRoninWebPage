export function deriveRoles(user) {
  if (!user) return [];
  const base = Array.isArray(user.roles) ? user.roles : [];
  const normalized = base
    .map(r => String(r || '').trim().toLowerCase())
    .filter(Boolean);
  if (normalized.length) return Array.from(new Set(normalized));
  const legacy = String(user.role || '').trim().toLowerCase();
  if (legacy === 'admin') return ['gato'];
  if (legacy) return ['genin'];
  return [];
}
