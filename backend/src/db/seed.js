import bcrypt from 'bcryptjs';
import { User } from '../models/user.js';

export async function seedInitialData() {
  const adminU = 'admin';
  const adminPass = 'Admin123.';
  const existing = await User.findOne({ username: adminU }).exec();
  const hash = await bcrypt.hash(adminPass, 10);
  if (!existing) {
    await User.create({ username: adminU, passwordHash: hash, role: 'admin', roles: ['gato'], displayName: 'Administrador', name: 'Administrador', email: '', phone: '' });
  } else {
    existing.passwordHash = hash;
    if (existing.role !== 'admin') existing.role = 'admin';
    if (!Array.isArray(existing.roles) || !existing.roles.includes('gato')) {
      existing.roles = Array.isArray(existing.roles) ? Array.from(new Set([...existing.roles, 'gato'])) : ['gato'];
    }
    if (!existing.displayName) existing.displayName = 'Administrador';
    await existing.save();
  }
}
