import { $$, createEl, getJSON } from '../lib/core.js'

export function Card({ title, desc, tags = [], cta, image }) {
  const card = createEl('div', { className: 'card' });
  if (image) {
    const img = createEl('img', { className: 'card-media', attrs: { src: image, alt: title || 'imagen' } });
    card.appendChild(img);
  }
  card.append(
    createEl('h3', { text: title || 'Item' }),
    createEl('p', { text: desc || 'Descripcion no disponible' }),
  );
  const row = createEl('div', { className: 'badge-row' });
  tags.forEach(t => row.appendChild(createEl('span', { className: 'badge', text: t })));
  card.appendChild(row);
  if (cta) card.appendChild(cta);
  return card;
}

export async function Courses() {
  const items = await getJSON('/api/courses.json', [
    { title: 'Hacking Etico', description: 'Fundamentos y metodologia de pruebas.', tags: ['pentesting','etica'] },
    { title: 'Cybersecurity Fundamentals', description: 'Conceptos clave y control de riesgos.', tags: ['fundamentos'] },
    { title: 'Seguridad en Redes', description: 'Arquitecturas y segmentacion.', tags: ['redes'] },
    { title: 'Analisis Forense', description: 'Adquisicion y analisis de evidencia.', tags: ['forense'] },
  ]);
  const grid = createEl('div', { className: 'card-grid' });
  items.forEach(c => {
    const body = Card({ title: c.title, desc: c.description, tags: c.tags, image: c.image });
    grid.appendChild(body);
  });
  return grid;
}

export async function Services() {
  const items = await getJSON('/api/services.json', [
    { title: 'Pentesting Web', description: 'Evaluacion OWASP, reporte y remediacion.', tags: ['owasp','web'] },
    { title: 'Hardening y Auditoria', description: 'Endurecimiento de sistemas.', tags: ['infra','linux'] },
  ]);
  const grid = createEl('div', { className: 'card-grid' });
  items.forEach(s => {
    grid.appendChild(Card({ title: s.title, desc: s.description, tags: s.tags }));
  });
  return grid;
}

export async function Projects() {
  const items = await getJSON('/api/projects.json', []);
  const section = createEl('section', { className: 'section', attrs: { id: 'proyectos' } });
  const container = createEl('div', { className: 'container' });
  container.appendChild(createEl('h2', { className: 'section-title', text: 'Proyectos' }));
  const grid = createEl('div', { className: 'card-grid' });
  items.forEach(p => {
    grid.appendChild(Card({ title: p.name, desc: p.description, tags: p.tags }));
  });
  container.appendChild(grid);
  section.appendChild(container);
  return section;
}

export async function PDFs() {
  const items = await getJSON('/api/pdfs.json', []);
  const wrap = createEl('div');
  const list = createEl('div', { className: 'pdf-list' });
  items.forEach(f => {
    const item = createEl('div', { className: 'pdf-item' });
    const a = createEl('a', { attrs: { href: f.url, target: '_blank', rel: 'noopener noreferrer' } });
    a.textContent = f.name;
    item.appendChild(a);
    list.appendChild(item);
  });
  wrap.appendChild(list);
  return wrap;
}

export async function AchievementsSection() {
  const wrap = createEl('section');
  const title = createEl('h2', { className: 'section-title', text: 'Proyectos realizados' });
  const grid = createEl('div', { className: 'card-grid' });
  const items = await getJSON('/api/achievements.json', [
    { name: 'Conferencia: Seguridad Ofensiva 101', description: 'Charla sobre fundamentos de pentesting y etica.' },
    { name: 'Caso: Endurecimiento Linux', description: 'Reduccion de superficie de ataque y mejora de visibilidad en 60 dias.' },
    { name: 'Workshop: DFIR Hands-On', description: 'Taller practico de respuesta a incidentes con ejercicios guiados.' }
  ]);
  items.forEach(i => grid.appendChild(Card({ title: i.name, desc: i.description, tags: i.tags || [] })));
  wrap.append(title, grid);
  return wrap;
}

export function EmbedInstagram(url = 'https://www.instagram.com/reel/CxLr7qHh3QK/embed') {
  const wrap = createEl('div', { className: 'embed-item' });
  const iframe = createEl('iframe', { attrs: { src: url, title: 'Instagram', loading: 'lazy', sandbox: 'allow-scripts allow-same-origin allow-popups', allow: 'encrypted-media; clipboard-write' } });
  wrap.appendChild(iframe);
  return wrap;
}

export function EmbedTikTok(id = '7267642037643296032') {
  const src = String(id).startsWith('@')
    ? `https://www.tiktok.com/embed/${id}`
    : `https://www.tiktok.com/embed/v2/video/${id}?lang=es-ES`;
  const wrap = createEl('div', { className: 'embed-item' });
  const iframe = createEl('iframe', { attrs: { src, title: 'TikTok', loading: 'lazy', sandbox: 'allow-scripts allow-same-origin allow-popups' } });
  wrap.appendChild(iframe);
  return wrap;
}

export function Hero() {
  const section = createEl('section', { className: 'hero', attrs: { id: 'inicio' } });
  const container = createEl('div', { className: 'container' });
  const h1 = createEl('h1');
  h1.append('Aprende hacking y ciberseguridad ');
  h1.appendChild(createEl('span', { className: 'neon-red', text: 'como un ronin' }));
  const p = createEl('p', { text: 'Laboratorios, proyectos reales, comunidad y material practico para crecer en seguridad ofensiva y defensiva.' });
  const cta = createEl('div', { className: 'cta' });
  const btnMis = createEl('button', { className: 'btn', text: 'Ir a Misiones' });
  const btnDojo = createEl('button', { className: 'btn', text: 'Ir al Dojo' });
  const btnArm = createEl('button', { className: 'btn', text: 'Armeria' });
  cta.append(btnMis, btnDojo, btnArm);
  const heroVideo = createEl('div', { className: 'hero-video' });
  const video = createEl('video', { attrs: { src: '/assets/material/gif%20codeRonin.mp4', muted: '', autoplay: '', loop: '', playsinline: '' } });
  heroVideo.appendChild(video);
  const info = createEl('div', { className: 'hero-info', attrs: { id: 'hero-info' } });
  container.append(h1, p, cta, info, heroVideo);
  const mesh = createEl('img', { className: 'hero-media', attrs: { src: '/assets/images/mesh.svg', alt: 'esquema', loading: 'lazy', decoding: 'async' } });
  const grid = createEl('div', { className: 'hero-grid', attrs: { 'aria-hidden': 'true' } });
  section.append(container, mesh, grid);

  function setActive(kind) {
    const map = { misiones: btnMis, dojo: btnDojo, armeria: btnArm };
    [btnMis, btnDojo, btnArm].forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    const b = map[kind];
    if (b) { b.classList.add('active'); b.setAttribute('aria-pressed', 'true'); }
  }
  function showHeroInfo(kind) {
    const map = {
      misiones: {
        title: 'Misiones de hacking Etico',
        body: [
          'Desafios reales, impacto real: ejecutamos ataques controlados para revelar brechas con evidencia accionable.',
          'Transforma hallazgos en mejoras priorizadas por riesgo y mide el avance de tu seguridad en cada iteracion.'
        ],
        link: '/misiones',
        img: '/assets/material/ninja1.webp'
      },
      dojo: {
        title: 'Dojo',
        body: [
          'Forja habilidades con rutas practicas en pentesting, redes y forense, pensadas para el dia a dia.',
          'Aprende haciendo: labs guiados, proyectos y feedback para subir de nivel de forma consistente.'
        ],
        link: '/dojo',
        img: '/assets/material/dojo1.webp'
      },
      armeria: {
        title: 'Armeria',
        body: [
          'Tu kit esencial del ronin digital: guias, checklists y plantillas listas para aplicar.',
          'Estandariza procesos, acelera entregables y evita reinventar la rueda en cada mision.'
        ],
        link: '/armeria',
        img: '/assets/material/armeria.webp'
      }
    };
    const data = map[kind];
    if (!data) return;
    setActive(kind);
    info.classList.add('open');
    info.innerHTML = '';
    const left = createEl('div');
    left.append(createEl('h3', { text: data.title }));
    if (Array.isArray(data.body)) data.body.forEach(t => left.appendChild(createEl('p', { text: t })));
    else left.appendChild(createEl('p', { text: data.body }));
    left.appendChild(createEl('div', { className: 'cta', children: [ createEl('a', { className: 'btn btn-primary', text: 'Saber mas', attrs: { href: data.link } }) ] }));
    const right = createEl('div');
    right.appendChild(createEl('img', { className: 'hero-decor', attrs: { src: data.img, alt: data.title, loading: 'lazy' } }));
    info.append(left, right);
  }
  btnMis.addEventListener('click', () => showHeroInfo('misiones'));
  btnDojo.addEventListener('click', () => showHeroInfo('dojo'));
  btnArm.addEventListener('click', () => showHeroInfo('armeria'));
  return section;
}

