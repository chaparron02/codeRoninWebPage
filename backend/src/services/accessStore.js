import { Op } from 'sequelize';
import { models } from '../db/models/index.js';

const { UserCourseAccess, UserServiceAccess } = models;

function normalizeIds(list) {
  return Array.from(new Set((Array.isArray(list) ? list : []).map((value) => String(value || '')).filter(Boolean)));
}

export async function getAccessMap() {
  const [courseRows, serviceRows] = await Promise.all([
    UserCourseAccess.findAll({ raw: true }),
    UserServiceAccess.findAll({ raw: true }),
  ]);
  const map = {};
  for (const row of courseRows) {
    if (!map[row.userId]) map[row.userId] = { courses: [], services: [] };
    map[row.userId].courses.push(row.courseId);
  }
  for (const row of serviceRows) {
    if (!map[row.userId]) map[row.userId] = { courses: [], services: [] };
    map[row.userId].services.push(row.serviceId);
  }
  return map;
}

export async function getUserAccess(userId) {
  if (!userId) return { courses: [], services: [] };
  const [courseRows, serviceRows] = await Promise.all([
    UserCourseAccess.findAll({ where: { userId }, attributes: ['courseId'], raw: true }),
    UserServiceAccess.findAll({ where: { userId }, attributes: ['serviceId'], raw: true }),
  ]);
  return {
    courses: courseRows.map((row) => row.courseId),
    services: serviceRows.map((row) => row.serviceId),
  };
}

export async function setUserAccess(userId, { courses = [], services = [] } = {}) {
  if (!userId) throw new Error('userId required');
  const normCourses = normalizeIds(courses);
  const normServices = normalizeIds(services);

  await UserCourseAccess.destroy({
    where: {
      userId,
      ...(normCourses.length ? { courseId: { [Op.notIn]: normCourses } } : {}),
    },
  });
  await UserServiceAccess.destroy({
    where: {
      userId,
      ...(normServices.length ? { serviceId: { [Op.notIn]: normServices } } : {}),
    },
  });

  const existingCourses = await UserCourseAccess.findAll({ where: { userId }, attributes: ['courseId'], raw: true });
  const existingCourseIds = new Set(existingCourses.map((row) => String(row.courseId)));
  for (const courseId of normCourses) {
    if (!existingCourseIds.has(courseId)) {
      await UserCourseAccess.create({ userId, courseId });
    }
  }

  const existingServices = await UserServiceAccess.findAll({ where: { userId }, attributes: ['serviceId'], raw: true });
  const existingServiceIds = new Set(existingServices.map((row) => String(row.serviceId)));
  for (const serviceId of normServices) {
    if (!existingServiceIds.has(serviceId)) {
      await UserServiceAccess.create({ userId, serviceId });
    }
  }

  return { courses: normCourses, services: normServices };
}
