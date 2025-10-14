import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default to backend/src/memory (matches the requested absolute path on this machine)
const BACKEND_DIR = path.resolve(__dirname, '..', '..');
const DEFAULT_DATA_DIR = path.join(BACKEND_DIR, 'src', 'memory');

const DATA_DIR = path.resolve(process.env.DATA_DIR || DEFAULT_DATA_DIR);

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDirSync(DATA_DIR);

function sanitizeKey(key) {
  const base = path.basename(String(key).trim());
  if (!base) throw new Error('Invalid key');
  return base.endsWith('.json') ? base : base + '.json';
}

function fullPath(key) {
  const safe = sanitizeKey(key);
  return path.join(DATA_DIR, safe);
}

export function getDataDir() {
  return DATA_DIR;
}

export async function readJSON(key, fallback) {
  const file = fullPath(key);
  try {
    const buf = await fsp.readFile(file);
    return JSON.parse(String(buf));
  } catch (err) {
    return fallback;
  }
}

export async function writeJSON(key, value) {
  const file = fullPath(key);
  const tmp = file + '.tmp-' + Date.now();
  const data = JSON.stringify(value, null, 2);
  await fsp.writeFile(tmp, data, 'utf8');
  await fsp.rename(tmp, file);
}

