import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { models } from '../db/models/index.js';
import { readJSON, writeJSON } from '../storage/fileStore.js';

const { Course, Mission, Service, Tool } = models;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const FRONTEND_API_DIR = path.join(ROOT_DIR, 'frontend', 'public', 'api');
const PUBLIC_MATERIAL_DIR = path.join(ROOT_DIR, 'frontend', 'public', 'material');
const PDF_DIR = path.join(PUBLIC_MATERIAL_DIR, 'pdfs');

export const router = Router();

const DEFAULT_COURSES = [
  { title: 'Hacking Etico', description: 'Fundamentos y metodologia de pruebas.', tags: ['pentesting', 'etica'] },
  { title: 'Cybersecurity Fundamentals', description: 'Conceptos clave y control de riesgos.', tags: ['fundamentos'] },
  { title: 'Seguridad en Redes', description: 'Arquitecturas y segmentacion.', tags: ['redes'] },
  { title: 'Analisis Forense', description: 'Adquisicion y analisis de evidencia.', tags: ['forense'] },
];

const DEFAULT_SERVICES = [
  { title: 'Pentesting Web', description: 'Evaluacion OWASP, reporte y remediacion.', tags: ['owasp', 'web'] },
  { title: 'Hardening y Auditoria', description: 'Endurecimiento de sistemas.', tags: ['infra', 'linux'] },
];

const DEFAULT_PRESENCIAL_COURSES = [
  { title: 'Introduccion y Metodologia', description: 'Sesion presencial enfocada en practica.', image: '/assets/material/ninja1.webp', category: 'Hacking etico' },
  { title: 'Pentesting Web', description: 'Simulaciones OWASP y ejercicios para equipos.', image: '/assets/material/ninja3.webp', category: 'Hacking etico' },
  { title: 'Pentesting Infraestructura', description: 'Refuerza deteccion y respuesta en redes internas.', image: '/assets/material/ninja2.webp', category: 'Hacking etico' },
  { title: 'Concientizacion y talleres', description: 'Entrenamiento con enfoque humano y simulaciones.', image: '/assets/material/ninja4.webp', category: 'Ingenieria social' },
];

const DEFAULT_PROJECTS = [
  { name: 'Recon Toolkit', description: 'Suite para reconocimiento ofensivo en entornos web.', tags: ['recon', 'osint', 'cli'], repoUrl: 'https://github.com/your-org/recon-toolkit', demoUrl: '' },
  { name: 'DFIR Playbook', description: 'Guias y scripts para respuesta a incidentes.', tags: ['dfir', 'scripts'], repoUrl: 'https://github.com/your-org/dfir-playbook', demoUrl: '' },
];

const DEFAULT_MISSIONS = { red: [], blue: [], social: [] };

const DEFAULT_ACHIEVEMENTS = [
  { name: 'Conferencia: Seguridad Ofensiva 101', description: 'Charla sobre fundamentos de pentesting y etica.' },
  { name: 'Caso: Endurecimiento Linux', description: 'Reduccion de superficie de ataque y mejora de visibilidad en 60 dias.' },
  { name: 'Workshop: DFIR Hands-On', description: 'Taller practico de respuesta a incidentes con ejercicios guiados.' },
];

function safeArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function normalizeCoursePayload(raw) {
  return {
    title: String(raw?.title || '').trim() || 'Curso',
    description: raw?.description || '',
    image: raw?.image || '',
    tags: safeArray(raw?.tags).map((tag) => String(tag || '').trim()).filter(Boolean),
    modalidad: raw?.modalidad || raw?.modality || 'virtual',
    price: raw?.price != null && raw?.price !== '' ? String(raw.price) : null,
    link: raw?.link || null,
    category: raw?.category || null,
  };
}

function normalizeServicePayload(raw) {
  return {
    title: String(raw?.title || '').trim() || 'Servicio',
    description: raw?.description || raw?.desc || '',
    image: raw?.image || '',
    tags: safeArray(raw?.tags).map((tag) => String(tag || '').trim()).filter(Boolean),
  };
}

function normalizeToolPayload(raw) {
  return {
    title: String(raw?.title || '').trim() || 'Herramienta',
    description: raw?.description || raw?.desc || '',
    link: typeof raw?.link === 'string' ? raw.link : '',
    image: typeof raw?.image === 'string' ? raw.image : '',
    tags: safeArray(raw?.tags).map((tag) => String(tag || '').trim()).filter(Boolean),
    badge: raw?.badge || '',
    isPublished: Boolean(raw?.isPublished ?? raw?.published ?? false),
  };
}

function courseToResponse(course) {
  const plain = typeof course.toJSON === 'function' ? course.toJSON() : course;
  const tags = safeArray(plain.tags).map((tag) => String(tag || '').trim()).filter(Boolean);
  return {
    ...plain,
    id: plain.id,
    _id: plain.id,
    tags,
    isArchived: Boolean(plain.isArchived),
  };
}

function serviceToResponse(service) {
  const plain = typeof service.toJSON === 'function' ? service.toJSON() : service;
  return { ...plain, id: plain.id, _id: plain.id };
}

function toolToResponse(tool) {
  const plain = typeof tool.toJSON === 'function' ? tool.toJSON() : tool;
  return { ...plain, id: plain.id, _id: plain.id };
}

async function readFrontendFallback(filename, fallback) {
  const file = path.join(FRONTEND_API_DIR, filename);
  if (!fs.existsSync(file)) return fallback;
  try {
    const raw = fs.readFileSync(file);
    const parsed = JSON.parse(String(raw));
    return parsed;
  } catch {
    return fallback;
  }
}

async function ensureCoursesSeeded() {
  let rows = await Course.findAll({ order: [['createdAt', 'ASC']] });
  if (rows.length) return rows;

  let fallback = await readJSON('courses.json', null);
  if (!Array.isArray(fallback) || !fallback.length) {
    fallback = await readFrontendFallback('courses.json', DEFAULT_COURSES);
  }
  const payload = [
    ...safeArray(fallback).map(normalizeCoursePayload),
    ...DEFAULT_PRESENCIAL_COURSES.map((c) => ({ ...normalizeCoursePayload(c), modalidad: 'presencial' })),
  ];
  if (payload.length) {
    await Course.bulkCreate(
      payload.map((item) => ({ ...item, isArchived: false, archivedAt: null })),
      { ignoreDuplicates: true }
    );
  }
  rows = await Course.findAll({ order: [['createdAt', 'ASC']] });
  return rows;
}

async function ensureServicesSeeded() {
  let rows = await Service.findAll({ order: [['createdAt', 'ASC']] });
  if (rows.length) return rows;
  let fallback = await readJSON('services.json', DEFAULT_SERVICES);
  if (!Array.isArray(fallback) || !fallback.length) {
    fallback = await readFrontendFallback('services.json', DEFAULT_SERVICES);
  }
  const payload = safeArray(fallback).map(normalizeServicePayload);
  if (payload.length) await Service.bulkCreate(payload, { ignoreDuplicates: true });
  rows = await Service.findAll({ order: [['createdAt', 'ASC']] });
  return rows;
}

async function ensureMissionsSeeded() {
  let rows = await Mission.findAll({ order: [['createdAt', 'ASC']] });
  if (rows.length) return rows;
  const fallback = await readJSON('missions.json', DEFAULT_MISSIONS);
  const docs = [];
  ['red', 'blue', 'social'].forEach((cat) => {
    safeArray(fallback?.[cat]).forEach((mission) => {
      docs.push({
        category: cat,
        title: mission.title || 'Mision',
        summary: mission.summary || mission.desc || '',
        description: mission.description || mission.desc || '',
        tags: safeArray(mission.tags).map((tag) => String(tag || '').trim()).filter(Boolean),
        image: mission.image || '',
        status: mission.status || 'borrador',
      });
    });
  });
  if (docs.length) await Mission.bulkCreate(docs);
  rows = await Mission.findAll({ order: [['createdAt', 'ASC']] });
  return rows;
}

async function ensureToolsSeeded() {
  let rows = await Tool.findAll({ order: [['createdAt', 'DESC']] });
  if (rows.length) return rows;
  let fallback = await readJSON('tools.json', null);
  if (!Array.isArray(fallback) || !fallback.length) {
    fallback = await readFrontendFallback('tools.json', []);
  }
  const payload = safeArray(fallback).map(normalizeToolPayload);
  if (payload.length) await Tool.bulkCreate(payload);
  rows = await Tool.findAll({ order: [['createdAt', 'DESC']] });
  return rows;
}

router.get('/courses.json', async (_req, res) => {
  try {
    const courses = await ensureCoursesSeeded();
    res.json(courses.filter((course) => !course.isArchived).map(courseToResponse));
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron obtener cursos' });
  }
});

router.post('/courses.json', async (req, res) => {
  try {
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Se espera un array' });
    const docs = req.body.map((item) => ({ ...normalizeCoursePayload(item), isArchived: false, archivedAt: null }));
    await Course.destroy({ where: {} });
    if (docs.length) await Course.bulkCreate(docs);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron actualizar cursos' });
  }
});

router.get('/services.json', async (_req, res) => {
  try {
    const services = await ensureServicesSeeded();
    res.json(services.map(serviceToResponse));
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron obtener servicios' });
  }
});

router.post('/services.json', async (req, res) => {
  try {
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Se espera un array' });
    const docs = req.body.map(normalizeServicePayload);
    await Service.destroy({ where: {} });
    if (docs.length) await Service.bulkCreate(docs);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron actualizar servicios' });
  }
});

router.get('/projects.json', async (_req, res) => {
  const data = await readJSON('projects.json', DEFAULT_PROJECTS);
  res.json(data);
});

router.post('/projects.json', async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Se espera un array' });
  await writeJSON('projects.json', req.body);
  res.status(204).end();
});

router.get('/achievements.json', async (_req, res) => {
  const data = await readJSON('achievements.json', DEFAULT_ACHIEVEMENTS);
  res.json(data);
});

router.post('/achievements.json', async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Se espera un array' });
  await writeJSON('achievements.json', req.body);
  res.status(204).end();
});

router.get('/missions.json', async (_req, res) => {
  try {
    const missions = await ensureMissionsSeeded();
    const grouped = { red: [], blue: [], social: [] };
    missions.forEach((mission) => {
      const item = {
        title: mission.title,
        desc: mission.summary || mission.description || '',
        tags: mission.tags || [],
        image: mission.image || '',
      };
      if (mission.category === 'blue') grouped.blue.push(item);
      else if (mission.category === 'social') grouped.social.push(item);
      else grouped.red.push(item);
    });
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron obtener misiones' });
  }
});

router.post('/missions.json', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'Se espera un objeto' });
    const { red = [], blue = [], social = [] } = req.body;
    const docs = [];
    safeArray(red).forEach((mission) => docs.push({ ...normalizeServicePayload(mission), category: 'red', title: String(mission?.title || 'Mision') }));
    safeArray(blue).forEach((mission) => docs.push({ ...normalizeServicePayload(mission), category: 'blue', title: String(mission?.title || 'Mision') }));
    safeArray(social).forEach((mission) => docs.push({ ...normalizeServicePayload(mission), category: 'social', title: String(mission?.title || 'Mision') }));
    await Mission.destroy({ where: {} });
    if (docs.length) {
      const prepared = docs.map((doc) => ({
        category: doc.category,
        title: doc.title,
        summary: doc.description,
        description: doc.description,
        tags: doc.tags,
        image: doc.image || '',
        status: 'publicado',
      }));
      await Mission.bulkCreate(prepared);
    }
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron actualizar misiones' });
  }
});

router.get('/tools.json', async (_req, res) => {
  try {
    const tools = await ensureToolsSeeded();
    res.json(tools.map(toolToResponse));
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron obtener herramientas' });
  }
});

router.post('/tools.json', async (req, res) => {
  try {
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Se espera un array' });
    const payload = req.body.map(normalizeToolPayload);
    await Tool.destroy({ where: {} });
    if (payload.length) await Tool.bulkCreate(payload);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron actualizar herramientas' });
  }
});

router.get('/pdfs.json', (_req, res) => {
  try {
    if (!fs.existsSync(PDF_DIR)) {
      fs.mkdirSync(PDF_DIR, { recursive: true });
    }
    const files = fs.readdirSync(PDF_DIR)
      .filter((name) => name.toLowerCase().endsWith('.pdf'))
      .map((name) => ({
        name,
        url: `/material/pdfs/${encodeURIComponent(name)}`,
      }));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron obtener PDFs' });
  }
});
