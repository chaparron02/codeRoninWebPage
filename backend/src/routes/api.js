import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readJSON, writeJSON } from '../storage/fileStore.js';
import { Course } from '../models/course.js';
import { Mission } from '../models/mission.js';
import { Service } from '../models/service.js';
import { loadModules } from '../services/scrollsStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
const MATERIAL_DIR = path.join(ROOT_DIR, 'material');

export const router = Router();

// Defaults (se guardan la primera vez que se consultan si decides usarlos)
const DEFAULT_COURSES = [
  {
    title: 'Hacking Etico',
    description: 'Metodologia ofensiva completa con enfoque profesional y reportes accionables.',
    tags: ['pentesting', 'ofensiva', 'labs'],
    skills: ['Metodologia OSSTMM/OWASP', 'Recon y enumeracion', 'Escalada controlada', 'Reporte ejecutivo y tecnico'],
    outcome: 'Guiar un pentest de punta a punta documentando hallazgos con impacto claro.',
    level: 'Intermedio',
    duration: '8 semanas',
    price: '420000',
    link: 'https://pay.coderonin.co/hacking-etico',
    image: '/assets/material/ninja1.webp'
  },
  {
    title: 'Cybersecurity Fundamentals',
    description: 'Gobierno, gestion de riesgos y controles esenciales para despegar una estrategia de seguridad.',
    tags: ['fundamentos', 'gobierno'],
    skills: ['Modelos CIA y Zero Trust', 'Mapeo de amenazas y riesgos', 'Diseno de controles base', 'Lectura de marcos (ISO, NIST)'],
    outcome: 'Priorizar controles y comunicar riesgos de forma efectiva al negocio.',
    level: 'Inicial',
    duration: '4 semanas',
    price: '260000',
    link: 'https://pay.coderonin.co/cyber-fundamentals',
    image: '/assets/material/dojo1.webp'
  },
  {
    title: 'Seguridad en Redes',
    description: 'Arquitecturas defensivas modernas, segmentacion, monitoreo y respuesta.',
    tags: ['redes', 'defensiva'],
    skills: ['Diseno de segmentacion', 'Hardening de perimetro y nube', 'Telemetria y monitoreo', 'Playbooks de respuesta'],
    outcome: 'Disenar y operar redes endurecidas con visibilidad y tiempos de respuesta medibles.',
    level: 'Intermedio',
    duration: '6 semanas',
    price: '320000',
    link: 'https://pay.coderonin.co/seguridad-redes',
    image: '/assets/material/ninja3.webp'
  },
  {
    title: 'Analisis Forense Digital',
    description: 'Procesos DFIR de punta a punta: preservacion, parsing y construccion de timeline.',
    tags: ['forense', 'incidentes'],
    skills: ['Cadena de custodia', 'Parsing de artefactos', 'Reconstruccion de eventos', 'Reporte forense'],
    outcome: 'Responder incidentes documentando evidencias defensibles tecnica y legalmente.',
    level: 'Avanzado',
    duration: '6 semanas',
    price: '340000',
    link: 'https://pay.coderonin.co/analisis-forense',
    image: '/assets/material/ninja4.webp'
  },
];

const DEFAULT_SERVICES = [
  { title: 'Pentesting Web', description: 'Evaluacion OWASP, reporte y remediacion.', tags: ['owasp','web'] },
  { title: 'Hardening y Auditoria', description: 'Endurecimiento de sistemas.', tags: ['infra','linux'] },
];

const DEFAULT_PRESENCIAL_COURSES = [
  { title: 'Introduccion y Metodologia', description: 'Sesion presencial con enfoque practico y objetivos claros.', image: '/assets/material/ninja1.webp', category: 'Hacking etico' },
  { title: 'Pentesting Web', description: 'Simulaciones OWASP y ejercicios para equipos.', image: '/assets/material/ninja3.webp', category: 'Hacking etico' },
  { title: 'Pentesting Infraestructura', description: 'Reforzar deteccion y respuesta en redes internas.', image: '/assets/material/ninja2.webp', category: 'Hacking etico' },
  { title: 'Concientizacion y talleres', description: 'Entrenamiento con enfoque humano y simulaciones.', image: '/assets/material/ninja4.webp', category: 'Ingenieria social' },
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

// Missions default structure (empty; frontend falls back to built-ins)
const DEFAULT_MISSIONS = { red: [], blue: [], social: [] };

const DEFAULT_ACHIEVEMENTS = [
  { name: 'Conferencia: Seguridad Ofensiva 101', description: 'Charla sobre fundamentos de pentesting y etica.' },
  { name: 'Caso: Endurecimiento Linux', description: 'Reduccion de superficie de ataque y mejora de visibilidad en 60 dias.' },
  { name: 'Workshop: DFIR Hands-On', description: 'Taller practico de respuesta a incidentes con ejercicios guiados.' },
];

// Courses in MongoDB with bootstrap fallback
router.get('/courses.json', async (_req, res) => {
  try {
    let list = await Course.find({}).sort({ createdAt: 1 }).lean();
    if (!list || list.length === 0) {
      let fallback = await readJSON('courses.json', null);
      if (!Array.isArray(fallback)) {
        try {
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');
          const fallbackPath = path.join(ROOT_DIR, 'frontend', 'public', 'api', 'courses.json');
          if (fs.existsSync(fallbackPath)) {
            const raw = fs.readFileSync(fallbackPath);
            const arr = JSON.parse(String(raw));
            if (Array.isArray(arr)) fallback = arr;
          }
        } catch {}
      }
      if (!Array.isArray(fallback)) fallback = DEFAULT_COURSES;
      try {
        const baseList = Array.isArray(fallback) && fallback.length ? fallback : DEFAULT_COURSES;
        const docs = baseList.map(c => ({
          title: c.title,
          description: c.description || '',
          image: c.image || '',
          tags: Array.isArray(c.tags) ? c.tags : [],
          modalidad: (c.modalidad || c.modality) || 'virtual',
          price: c.price != null ? String(c.price) : undefined,
          link: c.link || undefined,
          category: c.category || undefined,
          skills: Array.isArray(c.skills) ? c.skills : [],
          outcome: c.outcome || c.outcomes || '',
          level: c.level || '',
          duration: c.duration || '',
        }));
        DEFAULT_PRESENCIAL_COURSES.forEach(c => {
          docs.push({
            title: c.title,
            description: c.description || '',
            image: c.image || '',
            tags: Array.isArray(c.tags) ? c.tags : [],
            modalidad: 'presencial',
            price: undefined,
            link: undefined,
            category: c.category || '',
            skills: Array.isArray(c.skills) ? c.skills : [],
            outcome: c.outcome || c.outcomes || '',
            level: c.level || '',
            duration: c.duration || '',
          });
        });
        if (docs.length) await Course.insertMany(docs);
        list = await Course.find({}).sort({ createdAt: 1 }).lean();
      } catch {}
    }
    if (Array.isArray(list) && !list.some(c => (c.modalidad || c.modality) === 'presencial')) {
      try {
        const docs = DEFAULT_PRESENCIAL_COURSES.map(c => ({
          title: c.title,
          description: c.description || '',
          image: c.image || '',
          tags: Array.isArray(c.tags) ? c.tags : [],
          modalidad: 'presencial',
          price: undefined,
          link: undefined,
          category: c.category || '',
        }));
        if (docs.length) await Course.insertMany(docs);
        list = await Course.find({}).sort({ createdAt: 1 }).lean();
      } catch {}
    }
    res.json(list || []);
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron obtener cursos' });
  }
});

router.post('/courses.json', async (req, res) => {
  try {
    const body = req.body;
    if (!Array.isArray(body)) return res.status(400).json({ error: 'Se espera un array' });
    const docs = body.map(c => ({
      title: c.title,
      description: c.description || '',
      image: c.image || '',
      tags: Array.isArray(c.tags) ? c.tags : [],
      modalidad: (c.modalidad || c.modality) || 'virtual',
      price: c.price != null ? String(c.price) : undefined,
      link: c.link || undefined,
      category: c.category || undefined,
      skills: Array.isArray(c.skills) ? c.skills : [],
      outcome: c.outcome || c.outcomes || '',
      level: c.level || '',
      duration: c.duration || '',
    }));
    await Course.deleteMany({});
    if (docs.length) await Course.insertMany(docs);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron actualizar cursos' });
  }
});

router.get('/course-modules', async (req, res) => {
  try {
    const course = (req.query.course || '').toString().trim();
    if (!course) return res.status(400).json({ error: 'Curso requerido' });
    const modules = await loadModules();
    const filtered = modules
      .filter(m => (m.course || '') === course)
      .sort((a, b) => (a.order || 0) - (b.order || 0) || (a.createdAt || '').localeCompare(b.createdAt || ''))
      .map(m => ({ id: m.id, title: m.title, description: m.description || '', order: m.order || 0 }));
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron obtener modulos' });
  }
});

// Services persisted in MongoDB (for About and other pages)
router.get('/services.json', async (_req, res) => {
  try {
    let list = await Service.find({}).sort({ createdAt: 1 }).lean();
    if (!list || list.length === 0) {
      const fallback = await readJSON('services.json', DEFAULT_SERVICES);
      const docs = (fallback || []).map(s => ({
        title: s.title,
        description: s.description || '',
        image: s.image || '',
        tags: Array.isArray(s.tags) ? s.tags : [],
      }));
      if (docs.length) await Service.insertMany(docs);
      list = await Service.find({}).sort({ createdAt: 1 }).lean();
    }
    res.json(list || []);
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron obtener servicios' });
  }
});

router.post('/services.json', async (req, res) => {
  try {
    const body = req.body;
    if (!Array.isArray(body)) return res.status(400).json({ error: 'Se espera un array' });
    const docs = body.map(s => ({
      title: s.title,
      description: s.description || '',
      image: s.image || '',
      tags: Array.isArray(s.tags) ? s.tags : [],
    }));
    await Service.deleteMany({});
    if (docs.length) await Service.insertMany(docs);
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

// Missions in MongoDB; grouped by category for compatibility
router.get('/missions.json', async (_req, res) => {
  try {
    let list = await Mission.find({}).sort({ createdAt: 1 }).lean();
    if (!list || list.length === 0) {
      const fallback = await readJSON('missions.json', DEFAULT_MISSIONS);
      const all = [];
      ['red','blue','social'].forEach(cat => {
        const arr = Array.isArray(fallback?.[cat]) ? fallback[cat] : [];
        arr.forEach(m => all.push({ category: cat, title: m.title, desc: m.desc || '', tags: Array.isArray(m.tags)?m.tags:[], image: m.image || '' }));
      });
      if (all.length) await Mission.insertMany(all);
      list = await Mission.find({}).sort({ createdAt: 1 }).lean();
    }
    const grouped = { red: [], blue: [], social: [] };
    (list || []).forEach(m => {
      const item = { title: m.title, desc: m.desc || '', tags: m.tags || [], image: m.image || '' };
      if (m.category === 'blue') grouped.blue.push(item);
      else if (m.category === 'social') grouped.social.push(item);
      else grouped.red.push(item);
    });
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron obtener misiones' });
  }
});

router.post('/missions.json', async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object') return res.status(400).json({ error: 'Se espera un objeto' });
    const { red = [], blue = [], social = [] } = body;
    if (!Array.isArray(red) || !Array.isArray(blue) || !Array.isArray(social)) return res.status(400).json({ error: 'Estructura invalida' });
    const docs = [];
    red.forEach(x => docs.push({ category: 'red', title: x.title, desc: x.desc || '', tags: Array.isArray(x.tags)?x.tags:[], image: x.image || '' }));
    blue.forEach(x => docs.push({ category: 'blue', title: x.title, desc: x.desc || '', tags: Array.isArray(x.tags)?x.tags:[], image: x.image || '' }));
    social.forEach(x => docs.push({ category: 'social', title: x.title, desc: x.desc || '', tags: Array.isArray(x.tags)?x.tags:[], image: x.image || '' }));
    await Mission.deleteMany({});
    if (docs.length) await Mission.insertMany(docs);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'No se pudieron actualizar misiones' });
  }
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

