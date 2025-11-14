import { sequelize } from './models/index.js';

const state = {
  ready: false,
  dialect: null,
  storage: null,
};

async function cleanupBackupTables() {
  if (sequelize.getDialect() !== 'sqlite') return;
  const qi = sequelize.getQueryInterface();
  let tables = [];
  try {
    tables = await qi.showAllTables();
  } catch (err) {
    console.warn('No se pudieron listar tablas para limpiar backups', err?.message || err);
    return;
  }
  const normalize = (entry) => {
    if (typeof entry === 'string') return entry;
    if (entry && typeof entry === 'object') {
      return entry.tableName || entry.name || '';
    }
    return '';
  };
  const backupTables = tables
    .map(normalize)
    .filter((name) => typeof name === 'string' && name.endsWith('_backup'));
  for (const table of backupTables) {
    if (!table) continue;
    try {
      await qi.dropTable(table);
    } catch (err) {
      console.warn(`No se pudo eliminar la tabla temporal ${table}`, err?.message || err);
    }
  }
}

export async function connectDatabase() {
  await sequelize.authenticate();
  await cleanupBackupTables();
  await sequelize.sync({ alter: true });
  state.ready = true;
  state.dialect = sequelize.getDialect();
  state.storage = sequelize.options.storage || process.env.DATABASE_URL || null;
  return { ...state };
}

export async function disconnectDatabase() {
  try {
    await sequelize.close();
  } finally {
    state.ready = false;
  }
}

export function databaseState() {
  return { ...state };
}
