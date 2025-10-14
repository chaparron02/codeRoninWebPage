import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readJSON, writeJSON } from '../storage/fileStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const MATERIAL_DIR = path.join(ROOT_DIR, 'material');

export const router = Router();

// Defaults (se guardan la primera vez que se consultan si decides usarlos)
const DEFAULT_COURSES = [
  { title: 'Hacking Etico', description: 'Fundamentos y metodologia de pruebas.', tags: ['pentesting','etica'] },
  { title: 'Cybersecurity Fundamentals', description: 'Conceptos clave y control de riesgos.', tags: ['fundamentos'] },
  { title: 'Seguridad en Redes', description: 'Arquitecturas y segmentacion.', tags: ['redes'] },
  { title: 'Analisis Forense', description: 'Adquisicion y analisis de evidencia.', tags: ['forense'] },
];

const DEFAULT_SERVICES = [
  { title: 'Pentesting Web', description: 'Evaluacion OWASP, reporte y remediacion.', tags: ['owasp','web'] },
  { title: 'Hardening y Auditoria', description: 'Endurecimiento de sistemas.', tags: ['infra','linux'] },
];

const DEFAULT_PROJECTS = [
  {
    name: 'Recon Toolkit',
    description: 'Suite para reconocimiento ofensivo en entornos web.',
    tags: ['recon','osint','cli'],
    repoUrl: 'https://github.com/your-org/recon-toolkit',
    demoUrl: ''
  },
  {
    name: 'DFIR Playbook',
    description: 'Guias y scripts para respuesta a incidentes.',
    tags: ['dfir','scripts'],
    repoUrl: 'https://github.com/your-org/dfir-playbook',
    demoUrl: ''
  }
];

const DEFAULT_ACHIEVEMENTS = [
  { name: 'Conferencia: Seguridad Ofensiva 101', description: 'Charla sobre fundamentos de pentesting y etica.' },
  { name: 'Caso: Endurecimiento Linux', description: 'Reduccion de superficie de ataque y mejora de visibilidad en 60 dias.' },
  { name: 'Workshop: DFIR Hands-On', description: 'Taller practico de respuesta a incidentes con ejercicios guiados.' },
];

router.get('/courses.json', async (_req, res) => {
  const data = await readJSON('courses.json', DEFAULT_COURSES);
  res.json(data);
});

router.post('/courses.json', async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Se espera un array' });
  await writeJSON('courses.json', req.body);
  res.status(204).end();
});

router.get('/services.json', async (_req, res) => {
  const data = await readJSON('services.json', DEFAULT_SERVICES);
  res.json(data);
});

router.post('/services.json', async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Se espera un array' });
  await writeJSON('services.json', req.body);
  res.status(204).end();
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

router.get('/pdfs.json', (_req, res) => {
  try {
    const dir = MATERIAL_DIR;
    if (!fs.existsSync(dir)) return res.json([]);
    const files = fs.readdirSync(dir)
      .filter(f => f.toLowerCase().endsWith('.pdf'))
      .map(name => ({ name, url: `/material/${encodeURIComponent(name)}` }));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo listar PDFs' });
  }
});

