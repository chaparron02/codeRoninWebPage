import { readJSON, writeJSON } from '../storage/fileStore.js';

const MODULES_KEY = 'course_modules.json';
const ALLOWED_TYPES = ['video', 'pdf', 'link'];

export function sanitizeResource(payload = {}) {
  if (!payload) return { type: 'link', url: '', name: '', mime: '' };
  if (typeof payload === 'string') return { type: 'link', url: payload, name: '', mime: '' };
  const rawType = payload.type || payload.resourceType || 'link';
  const type = ALLOWED_TYPES.includes(rawType) ? rawType : 'link';
  const url = payload.url || payload.resourceUrl || '';
  const name = payload.name || payload.resourceName || '';
  const mime = payload.mime || payload.resourceMime || '';
  return { type, url, name, mime };
}

export function normalizeModule(raw = {}) {
  const base = {
    id: raw.id || Math.random().toString(36).slice(2),
    course: raw.course || '',
    title: raw.title || '',
    description: raw.description || '',
    order: Number(raw.order) || 0,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
  const legacyUrl = raw.videoUrl || '';
  const legacyType = legacyUrl && legacyUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'video';
  const resourceRaw = raw.resource && typeof raw.resource === 'object'
    ? raw.resource
    : { type: legacyUrl ? legacyType : 'link', url: legacyUrl, name: raw.title || '', mime: '' };
  const resource = sanitizeResource(resourceRaw);
  if (resource.type !== 'link' && !resource.url) resource.url = legacyUrl || '';
  if (!resource.name) resource.name = raw.title || '';
  return { ...base, resource };
}

export async function loadModules() {
  const list = await readJSON(MODULES_KEY, []);
  return list.map(normalizeModule);
}

export async function saveModules(list = []) {
  const normalized = list.map(normalizeModule);
  await writeJSON(MODULES_KEY, normalized);
  return normalized;
}
