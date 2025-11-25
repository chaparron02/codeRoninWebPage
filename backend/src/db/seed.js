import bcrypt from 'bcryptjs';
import { models } from './models/index.js';

const { User } = models;

export async function seedInitialData() {
  await ensureUser({
    username: 'admin',
    password: 'Admin1.',
    role: 'admin',
    roles: ['gato'],
    displayName: 'Administrador',
    name: 'Administrador',
    email: 'coderonin404@gmail.com',
  });

  await ensureUser({
    username: 'gato',
    password: 'Gato1.',
    role: 'user',
    roles: ['genin'],
    displayName: 'Gato',
    name: 'Usuario Gato',
    email: 'gato@example.com',
  });

  await ensureUser({
    username: 'daimyo',
    password: 'Daimyo1.',
    role: 'user',
    roles: ['daimyo'],
    displayName: 'Daimyo',
    name: 'Cliente Daimyo',
    email: 'daimyo@example.com',
  });
}

async function ensureUser({ username, password, role, roles, displayName, name, email }) {
  const existing = await User.findOne({ where: { username } });
  const hash = await bcrypt.hash(password, 12);
  if (!existing) {
    await User.create({
      username,
      passwordHash: hash,
      role,
      roles,
      displayName,
      name,
      email,
      phone: '',
      active: true,
    });
    return;
  }
  existing.passwordHash = hash;
  existing.role = role;
  existing.roles = roles;
  existing.displayName = displayName;
  existing.name = name;
  if (email) existing.email = email;
  await existing.save();
}
