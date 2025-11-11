import { readJSON, writeJSON } from '../storage/fileStore.js';

const KEY = 'user_courses_access.json';

async function loadRaw() {
  const data = await readJSON(KEY, {});
  if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  if (Array.isArray(data)) {
    // Legacy array -> convert to empty map
    return {};
  }
  return {};
}

export async function getAccessMap() {
  return await loadRaw();
}

export async function getUserAccess(userId) {
  if (!userId) return { courses: [], services: [] };
  const map = await loadRaw();
  const entry = map[userId];
  if (!entry) return { courses: [], services: [] };
  if (Array.isArray(entry)) {
    // legacy: array of courses only
    return { courses: entry.map(String), services: [] };
  }
  const courses = Array.isArray(entry.courses) ? entry.courses.map(String) : [];
  const services = Array.isArray(entry.services) ? entry.services.map(String) : [];
  return { courses, services };
}

export async function setUserAccess(userId, { courses = [], services = [] } = {}) {
  if (!userId) throw new Error('userId required');
  const map = await loadRaw();
  const normCourses = Array.from(new Set((Array.isArray(courses) ? courses : []).map(String).filter(Boolean)));
  const normServices = Array.from(new Set((Array.isArray(services) ? services : []).map(String).filter(Boolean)));
  map[userId] = { courses: normCourses, services: normServices };
  await writeJSON(KEY, map);
  return map[userId];
}


export async function removeCourseFromAccess(courseId) {
  if (!courseId) return;
  const target = String(courseId);
  const map = await loadRaw();
  let changed = false;
  for (const [userId, entry] of Object.entries(map)) {
    if (entry && Array.isArray(entry.courses)) {
      const filtered = entry.courses.map(String).filter(id => id !== target);
      if (filtered.length !== entry.courses.length) {
        entry.courses = filtered;
        changed = true;
      }
    }
  }
  if (changed) await writeJSON(KEY, map);
}
