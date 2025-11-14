import { models } from '../db/models/index.js';

const { CourseModule, Course } = models;
const ALLOWED_TYPES = ['video', 'pdf', 'link', 'image'];

export function sanitizeResource(payload = {}) {
  if (!payload) return { type: 'link', url: '', name: '', mime: '' };
  if (typeof payload === 'string') return { type: 'link', url: payload, name: '', mime: '' };
  const rawType = (payload.type || payload.resourceType || 'link').toLowerCase();
  const type = ALLOWED_TYPES.includes(rawType) ? rawType : 'link';
  const url = payload.url || payload.resourceUrl || '';
  const name = payload.name || payload.resourceName || '';
  const mime = payload.mime || payload.resourceMime || '';
  return { type, url, name, mime };
}

export function normalizeModule(record) {
  if (!record) return null;
  const resource = {
    type: record.resourceType,
    url: record.resourceUrl || '',
    name: record.resourceName || record.title,
    mime: record.resourceMime || '',
    path: record.resourcePath || '',
  };
  return {
    id: record.id,
    courseId: record.courseId,
    course: record.courseName,
    title: record.title,
    description: record.description || '',
    order: record.ordering ?? 0,
    resource,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function findCourse({ courseId, courseName }) {
  if (courseId) {
    const byId = await Course.findByPk(courseId);
    if (byId) return byId;
  }
  if (courseName) {
    const name = String(courseName).trim();
    if (name) {
      const byName = await Course.findOne({ where: { title: name } });
      if (byName) return byName;
    }
  }
  return null;
}

export async function loadModules({ courseId, courseName } = {}) {
  const where = {};
  if (courseId) {
    where.courseId = courseId;
  } else if (courseName) {
    const name = String(courseName).trim();
    if (name) where.courseName = name;
  }
  const rows = await CourseModule.findAll({
    where: Object.keys(where).length ? where : undefined,
    order: [['courseName', 'ASC'], ['ordering', 'ASC'], ['createdAt', 'ASC']],
    raw: true,
  });
  return rows.map(normalizeModule).filter(Boolean);
}

export async function createModule({ courseId, courseName, title, description = '', order = 0, resource }) {
  const course = await findCourse({ courseId, courseName });
  if (!course) throw new Error('Curso no encontrado');
  const cleanResource = sanitizeResource(resource);
  if (cleanResource.type !== 'link' && !cleanResource.url) throw new Error('Recurso invalido');

  const item = await CourseModule.create({
    courseId: course.id,
    courseName: course.title,
    title,
    description,
    ordering: Number(order) || 0,
    resourceType: cleanResource.type,
    resourceUrl: cleanResource.url,
    resourcePath: cleanResource.path || null,
    resourceName: cleanResource.name || title,
    resourceMime: cleanResource.mime || '',
  });
  return normalizeModule(item.toJSON());
}

export async function updateModule(id, payload = {}) {
  const mod = await CourseModule.findByPk(id);
  if (!mod) return null;
  if (payload.courseId != null || payload.course != null || payload.courseName != null) {
    const nextCourse = await findCourse({
      courseId: payload.courseId,
      courseName: payload.courseName ?? payload.course,
    });
    if (!nextCourse) throw new Error('Curso no encontrado');
    mod.courseId = nextCourse.id;
    mod.courseName = nextCourse.title;
  }
  if (payload.title != null) mod.title = String(payload.title);
  if (payload.description != null) mod.description = String(payload.description);
  if (payload.order != null) mod.ordering = Number(payload.order) || 0;
  if (payload.resource != null) {
    const cleanResource = sanitizeResource(payload.resource);
    if (cleanResource.type !== 'link' && !cleanResource.url) throw new Error('Recurso invalido');
    mod.resourceType = cleanResource.type;
    mod.resourceUrl = cleanResource.url;
    mod.resourcePath = cleanResource.path || mod.resourcePath;
    mod.resourceName = cleanResource.name || mod.title;
    mod.resourceMime = cleanResource.mime || '';
  }
  await mod.save();
  return normalizeModule(mod.toJSON());
}

export async function removeModule(id) {
  return CourseModule.destroy({ where: { id } });
}
