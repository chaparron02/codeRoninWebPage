import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const MATERIAL_DIR = path.join(ROOT_DIR, 'material');

export const router = Router();

// In-memory sample data. Replace with DB or files later if needed.
const courses = [
  { title: 'Hacking Etico', description: 'Fundamentos y metodología de pruebas.', tags: ['pentesting','etica'] },
  { title: 'Cybersecurity Fundamentals', description: 'Conceptos clave y control de riesgos.', tags: ['fundamentos'] },
  { title: 'Seguridad en Redes', description: 'Arquitecturas y segmentación.', tags: ['redes'] },
  { title: 'Analisis Forense', description: 'Adquisición y análisis de evidencia.', tags: ['forense'] },
];

const services = [
  { title: 'Pentesting Web', description: 'Evaluación OWASP, reporte y remediación.', tags: ['owasp','web'] },
  { title: 'Hardening y Auditoría', description: 'Endurecimiento de sistemas.', tags: ['infra','linux'] },
];

const projects = [
  {
    name: 'Recon Toolkit',
    description: 'Suite para reconocimiento ofensivo en entornos web.',
    tags: ['recon','osint','cli'],
    repoUrl: 'https://github.com/your-org/recon-toolkit',
    demoUrl: ''
  },
  {
    name: 'DFIR Playbook',
    description: 'Guías y scripts para respuesta a incidentes.',
    tags: ['dfir','scripts'],
    repoUrl: 'https://github.com/your-org/dfir-playbook',
    demoUrl: ''
  }
];

const achievements = [
  { name: 'Conferencia: Seguridad Ofensiva 101', description: 'Charla sobre fundamentos de pentesting y ética.' },
  { name: 'Caso: Endurecimiento Linux', description: 'Reducción de superficie de ataque y mejora de visibilidad en 60 días.' },
  { name: 'Workshop: DFIR Hands-On', description: 'Taller práctico de respuesta a incidentes con ejercicios guiados.' },
];

router.get('/courses.json', (_req, res) => {
  res.json(courses);
});

router.get('/services.json', (_req, res) => {
  res.json(services);
});

router.get('/projects.json', (_req, res) => {
  res.json(projects);
});

router.get('/achievements.json', (_req, res) => {
  res.json(achievements);
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

