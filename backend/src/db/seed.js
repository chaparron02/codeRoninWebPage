import bcrypt from 'bcryptjs';
import { User } from '../models/user.js';

export async function seedInitialData() {
  const adminU = 'admin';
  const adminPass = 'Admin123.'; // segun requerimiento (8+, mayuscula y simbolo)
  const existing = await User.findOne({ username: adminU }).exec();
  const hash = await bcrypt.hash(adminPass, 10);
  if (!existing) {
    await User.create({ username: adminU, passwordHash: hash, role: 'admin', displayName: 'Administrador', name: 'Administrador', email: '', phone: '' });
  } else {
    existing.passwordHash = hash;
    if (existing.role !== 'admin') existing.role = 'admin';
    if (!existing.displayName) existing.displayName = 'Administrador';
    await existing.save();
  }
}
