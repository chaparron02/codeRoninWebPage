// codeRonin frontend SPA (framework-less)
// Security: no eval, no inline handlers; CSP enforced via headers

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function setActiveNav(route) {
  const links = $$('#nav-links a');
  links.forEach(a => {
    const to = a.getAttribute('href').replace(/^#\/?/, '').split('?')[0] || '/';
    const base = (route || '/').split('?')[0];
    a.classList.toggle('active', base === to);
  });
}

function createEl(tag, opts = {}) {
  const el = document.createElement(tag);
  if (opts.className) el.className = opts.className;
  if (opts.text) el.textContent = opts.text;
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) el.setAttribute(k, v);
  if (opts.children) opts.children.forEach(c => el.appendChild(c));
  return el;
}

async function getJSON(path, fallback = []) {
  try {
    const res = await fetch(path, { headers: { 'accept': 'application/json' } });
    if (!res.ok) throw new Error('bad status');
    return await res.json();
  } catch (e) {
    return fallback;
  }
}

// Loading overlay (first visit only)
function showLoaderOnce() {
  try {
    if (localStorage.getItem('cr_seen_loader')) return;
  } catch {}
  const overlay = createEl('div', { className: 'loader-overlay', attrs: { role: 'status', 'aria-live': 'polite' } });
  const inner = createEl('div', { className: 'loader-inner' });
  const ring = createEl('div', { className: 'loader-ring' });
  const symbol = createEl('div', { className: 'loader-symbol', text: '忍' });
  inner.append(ring, symbol);
  overlay.appendChild(inner);
  document.body.appendChild(overlay);
  setTimeout(() => {
    overlay.classList.add('hide');
    setTimeout(() => overlay.remove(), 450);
    try { localStorage.setItem('cr_seen_loader', '1'); } catch {}
  }, 1500);
}

// Components
function Hero() {
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
        title: 'Misiones de hacking etico',
        body: [
          'Desafios reales, impacto real: ejecutamos ataques controlados para revelar brechas con evidencia accionable.',
          'Transforma hallazgos en mejoras priorizadas por riesgo y mide el avance de tu seguridad en cada iteracion.'
        ],
        link: '#/misiones',
        img: '/assets/material/ninja1.webp'
      },
      dojo: {
        title: 'Dojo',
        body: [
          'Forja habilidades con rutas practicas en pentesting, redes y forense, pensadas para el dia a dia.',
          'Aprende haciendo: labs guiados, proyectos y feedback para subir de nivel de forma consistente.'
        ],
        link: '#/dojo',
        img: '/assets/material/dojo1.webp'
      },
      armeria: {
        title: 'Armeria',
        body: [
          'Tu kit esencial del ronin digital: guias, checklists y plantillas listas para aplicar.',
          'Estandariza procesos, acelera entregables y evita reinventar la rueda en cada mision.'
        ],
        link: '#/armeria',
        img: '/assets/material/armeria.webp'
      }
    };
    const data = map[kind];
    if (!data) return;
    setActive(kind);
    info.classList.add('open');
    info.innerHTML = '';
    const left = createEl('div');
    left.append(
      createEl('h3', { text: data.title })
    );
    if (Array.isArray(data.body)) {
      data.body.forEach(t => left.appendChild(createEl('p', { text: t })));
    } else {
      left.appendChild(createEl('p', { text: data.body }));
    }
    left.appendChild(createEl('div', { className: 'cta', children: [ createEl('a', { className: 'btn btn-primary', text: 'Saber mas', attrs: { href: data.link } }) ] }));
    const right = createEl('div');
    right.appendChild(createEl('img', { className: 'hero-decor', attrs: { src: data.img, alt: data.title, loading: 'lazy' } }));
    info.append(left, right);
    info.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  btnMis.addEventListener('click', () => showHeroInfo('misiones'));
  btnDojo.addEventListener('click', () => showHeroInfo('dojo'));
  btnArm.addEventListener('click', () => showHeroInfo('armeria'));
  return section;
}

function Card({ title, desc, tags = [], cta, image }) {
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

async function Courses() {
  const items = await getJSON('/api/courses.json', [
    { title: 'Hacking Etico', description: 'Fundamentos y metodologia de pruebas.', tags: ['pentesting','etica'] },
    { title: 'Cybersecurity Fundamentals', description: 'Conceptos clave y control de riesgos.', tags: ['fundamentos'] },
    { title: 'Seguridad en Redes', description: 'Arquitecturas y segmentacion.', tags: ['redes'] },
    { title: 'Analisis Forense', description: 'Adquisicion y analisis de evidencia.', tags: ['forense'] },
  ]);
  const grid = createEl('div', { className: 'card-grid' });
  items.forEach(c => {
    const body = Card({ title: c.title, desc: c.description, tags: c.tags, image: c.image });
    if (Array.isArray(c.topics) && c.topics.length) {
      const ul = createEl('ul', { className: 'list' });
      c.topics.forEach(t => ul.appendChild(createEl('li', { text: `Tema: ${t}` })));
      body.appendChild(ul);
    }
    if (Array.isArray(c.skills) && c.skills.length) {
      const ul = createEl('ul', { className: 'list' });
      c.skills.forEach(s => ul.appendChild(createEl('li', { text: `Habilidad: ${s}` })));
      body.appendChild(ul);
    }
    if (c.outcomes) body.appendChild(createEl('p', { className: 'muted', text: `Resultado: ${c.outcomes}` }));
    const btn = c.url ? createEl('a', { className: 'btn btn-sm btn-primary', text: 'Ir al curso', attrs: { href: c.url, target: '_blank', rel: 'noopener noreferrer' } }) : null;
    if (btn) body.appendChild(btn);
    grid.appendChild(body);
  });
  return grid;
}

async function Services() {
  const items = await getJSON('/api/services.json', [
    { title: 'Pentesting Web', description: 'Evaluacion OWASP, reporte y remediacion.', tags: ['owasp','web'] },
    { title: 'Hardening y Auditoria', description: 'Endurecimiento de sistemas.', tags: ['infra','linux'] },
  ]);
  const grid = createEl('div', { className: 'card-grid' });
  items.forEach(s => {
    const btn = s.url ? createEl('a', { className: 'btn btn-sm btn-primary', text: 'Solicitar informacion', attrs: { href: s.url, target: '_blank', rel: 'noopener noreferrer' } }) : null;
    grid.appendChild(Card({ title: s.title, desc: s.description, tags: s.tags, cta: btn }));
  });
  return grid;
}

async function Projects() {
  const items = await getJSON('/api/projects.json', []);
  const section = createEl('section', { className: 'section', attrs: { id: 'proyectos' } });
  const container = createEl('div', { className: 'container' });
  container.appendChild(createEl('h2', { className: 'section-title', text: 'Proyectos' }));
  const grid = createEl('div', { className: 'card-grid' });
  items.forEach(p => {
    const actions = createEl('div');
    if (p.repoUrl) actions.appendChild(createEl('a', { className: 'btn btn-sm btn-ghost', text: 'Repo', attrs: { href: p.repoUrl, target: '_blank', rel: 'noopener noreferrer' } }));
    if (p.demoUrl) actions.appendChild(createEl('a', { className: 'btn btn-sm btn-primary', text: 'Demo', attrs: { href: p.demoUrl, target: '_blank', rel: 'noopener noreferrer' } }));
    grid.appendChild(Card({ title: p.name, desc: p.description, tags: p.tags, cta: actions.childNodes.length ? actions : null }));
  });
  container.appendChild(grid);
  section.appendChild(container);
  return section;
}

async function PDFs() {
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

async function AchievementsSection() {
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

// Pages
async function HomePage() {
  const main = document.createDocumentFragment();
  main.appendChild(Hero());

  // Mantras Ronin (just under GIF)
  const secTiles = createEl('section', { className: 'section' });
  const cTiles = createEl('div', { className: 'container' });
  cTiles.appendChild(createEl('h2', { className: 'section-title', text: 'Mantras Ronin' }));
  const tiles = createEl('div', { className: 'tiles' });
  const phrases = [
    'Observa. Comprende. Actua.',
    'Sigilo sobre ruido.',
    'Disciplina y curiosidad.',
    'La defensa nace del ataque.',
    'Mide, no supongas.',
    'Rompe para aprender.',
    'Simple > Complejo.',
    'Piensa como atacante.',
    'Invisible, no ausente.'
  ];
  phrases.forEach((t, i) => {
    const cls = i % 3 === 0 ? 'tile wide' : (i % 4 === 0 ? 'tile tall' : 'tile');
    tiles.appendChild(createEl('div', { className: cls, text: t }));
  });
  cTiles.appendChild(tiles);
  secTiles.appendChild(cTiles);

  // Por qué contactarnos
  const sec2 = createEl('section', { className: 'section' });
  const c2 = createEl('div', { className: 'container' });
  c2.appendChild(createEl('h2', { className: 'section-title', text: 'Por que contactarnos' }));
  const list = createEl('ul', { className: 'list' });
  [
    'Revela vulnerabilidades antes que los atacantes',
    'Prioriza inversion: enfoque en riesgos reales',
    'Mejora cumplimiento (OWASP, ISO, NIST)',
    'Entrena equipos con evidencias y casos reales'
  ].forEach(i => list.appendChild(createEl('li', { text: i })));
  c2.append(
    createEl('p', { text: 'Un pentest bien ejecutado reduce exposicion, mejora decisiones de riesgo y acelera la madurez de seguridad.' }),
    list,
    createEl('div', { className: 'cta', children: [
      createEl('a', { className: 'btn btn-primary', text: 'Ir a Misiones', attrs: { href: '#/misiones' } }),
      createEl('a', { className: 'btn btn-ghost', text: 'Ir al Dojo', attrs: { href: '#/dojo' } }),
      createEl('a', { className: 'btn btn-ghost', text: 'Ir a Armeria', attrs: { href: '#/armeria' } })
    ] })
  );
  sec2.appendChild(c2);

  // Quienes somos (ahora debajo del por qué)
  const sec1 = createEl('section', { className: 'section' });
  const c1 = createEl('div', { className: 'container' });
  c1.appendChild(createEl('h2', { className: 'section-title', text: 'Quienes somos' }));
  c1.appendChild(createEl('p', { text: 'codeRonin es un dojo de ciberseguridad con espíritu ronin: construimos, probamos y aprendemos con ética y método. Unimos mentalidad ofensiva y defensiva para pensar como atacante y diseñar mejores defensas.' }));
  c1.appendChild(createEl('p', { text: 'Entrena en el Dojo (virtual/presencial), pon a prueba tus defensas con Misiones y equipa tu día a día en la Armería con guías y checklists.' }));
  const promo = createEl('div', { className: 'cta-banner' });
  promo.appendChild(createEl('div', { text: 'Espacio para banners y promociones (proximamente).' }));
  c1.appendChild(promo);
  // Social quick links
  const socials = createEl('div', { className: 'social-row' });
  [
    { label: 'Instagram', href: 'https://www.instagram.com/code_ronin?igsh=aTRrcWtmdzQxZnI0' },
    { label: 'TikTok', href: 'https://www.tiktok.com/@code.ronin?_t=ZS-90Rb6qcPCVt&_r=1' },
    { label: 'WhatsApp', href: 'https://wa.me/573054402340' },
    { label: 'Email', href: 'mailto:coderonin404@gmail.com' }
  ].forEach(s => socials.appendChild(createEl('a', { text: s.label, attrs: { href: s.href, target: '_blank', rel: 'noopener noreferrer' } })));
  c1.appendChild(socials);
  sec1.appendChild(c1);

  // Social embeds at the end
  const secMedia = createEl('section', { className: 'section' });
  const cMedia = createEl('div', { className: 'container' });
  cMedia.appendChild(createEl('h2', { className: 'section-title', text: 'Media' }));
  const embeds = createEl('div', { className: 'embed-grid' });
  embeds.appendChild(EmbedInstagram('https://www.instagram.com/code_ronin/embed'));
  embeds.appendChild(EmbedTikTok('@code.ronin'));
  cMedia.append(embeds);
  secMedia.appendChild(cMedia);

  main.append(secTiles, sec2, sec1, secMedia);
  return main;
}

async function AboutPage() {
  const sec = createEl('section', { className: 'section page', attrs: { id: 'nosotros' } });
  const c = createEl('div', { className: 'container' });
  c.appendChild(createEl('h2', { className: 'section-title', text: 'Nosotros' }));

  // Filosofía
  c.appendChild(createEl('h3', { text: 'Filosofía' }));
  c.appendChild(createEl('p', { text: 'En codeRonin formamos “ninjas digitales”: disciplina, curiosidad y práctica. Operamos con ética y consentimiento en laboratorios controlados, para que pensar como atacante te ayude a diseñar mejores defensas.' }));

  // Motivación
  c.appendChild(createEl('h3', { text: 'Motivación' }));
  const ulMot = createEl('ul', { className: 'list' });
  [
    'Cerrar la brecha entre teoría y práctica con labs reproducibles.',
    'Elevar la cultura de seguridad con contenidos breves y accionables.',
    'Acelerar madurez: hardening, detección, respuesta y reporte ejecutivo.'
  ].forEach(t => ulMot.appendChild(createEl('li', { text: t })));
  c.appendChild(ulMot);

  // Conferencias y actividades
  c.appendChild(createEl('h3', { text: 'Conferencias y actividades' }));
  const ulAct = createEl('ul', { className: 'list' });
  [
    'Charlas (BSides/FLISoL): Evil Twin corporativo, DFIR exprés, Ingeniería social asistida por IA.',
    'Comunidad y contenidos: Reels/Shorts diarios, micro‑tutoriales de Wi‑Fi, phishing, logs, OSINT.',
    'Material descargable: guías, playbooks, checklists y plantillas de reporte.'
  ].forEach(t => ulAct.appendChild(createEl('li', { text: t })));
  c.appendChild(ulAct);
  const media = createEl('div', { className: 'media-grid' });
  media.appendChild(createEl('video', { attrs: { src: '/assets/material/armeriagif.mp4', autoplay: '', muted: '', loop: '', playsinline: '' } }));
  c.appendChild(media);

  // Proyectos
  c.appendChild(createEl('h3', { text: 'Proyectos' }));
  const ulProj = createEl('ul', { className: 'list' });
  [
    'Evil Twin en entorno controlado con matriz de mitigación.',
    'Análisis de logs con foco en sesiones fuera de horario y artefactos remotos.',
    'Metodología de artefactos para herramientas de control remoto (qué, dónde y por qué).'
  ].forEach(t => ulProj.appendChild(createEl('li', { text: t })));
  c.appendChild(ulProj);
  // Logros/cartas desde achievements.json
  c.appendChild(await AchievementsSection());
  // CodeRonin AI (Próximamente)
  const soon = Card({ title: 'CodeRonin AI (Próximamente)', desc: 'MVP de concientización e ingeniería social ética con IA: vishing/smishing simulados, métricas y consentimiento/auditoría. Comercialización prevista en la siguiente fase.' });
  const rowSoon = createEl('div', { className: 'badge-row' }); rowSoon.appendChild(createEl('span', { className: 'badge soon', text: 'En desarrollo' })); soon.appendChild(rowSoon);
  const gridSoon = createEl('div', { className: 'card-grid' }); gridSoon.appendChild(soon); c.appendChild(gridSoon);

  // Activos diferenciales
  c.appendChild(createEl('h3', { text: 'Activos diferenciales' }));
  const ulFounder = createEl('ul', { className: 'list' });
  [
    'CEH Master y experiencia aplicada en red team/DFIR orientada a formación.',
    'Performance y magia escénica para elevar efectividad de charlas (ética).',
    'Analítica y datos para instrumentar métricas y aprendizaje.',
    'Narrativa “ninja digital” para impulsar cultura de seguridad.'
  ].forEach(t => ulFounder.appendChild(createEl('li', { text: t })));
  c.appendChild(ulFounder);

  // Contacto
  c.appendChild(createEl('h3', { text: 'Contacto' }));
  const socials = createEl('div', { className: 'social-row' });
  [
    { label: 'Email', href: 'mailto:coderonin404@gmail.com' },
    { label: 'WhatsApp', href: 'https://wa.me/573054402340' },
    { label: 'Instagram', href: 'https://www.instagram.com/code_ronin?igsh=aTRrcWtmdzQxZnI0' },
    { label: 'TikTok', href: 'https://www.tiktok.com/@code.ronin?_t=ZS-90Rb6qcPCVt&_r=1' }
  ].forEach(s => socials.appendChild(createEl('a', { text: s.label, attrs: { href: s.href, target: '_blank', rel: 'noopener noreferrer' } })));
  c.appendChild(socials);

  sec.appendChild(c);
  return sec;
}

async function DojoPage() {
  const sec = createEl('section', { className: 'section page' });
  const c = createEl('div', { className: 'container' });
  c.appendChild(createEl('h2', { className: 'section-title', text: 'Dojo' }));
  c.appendChild(createEl('p', { text: 'Elige tu modalidad: cursos virtuales o experiencias presenciales para equipos.' }));

  const tabs = createEl('div', { className: 'tabs' });
  const panels = createEl('div');
  const defTabs = [ { id: 'virtuales', label: 'Cursos virtuales' }, { id: 'presenciales', label: 'Presenciales' } ];
  let active = 'virtuales';

  async function mount(id) {
    active = id;
    $$('.tab', tabs).forEach(x => x.classList.toggle('active', x.dataset.id === id));
    while (panels.firstChild) panels.removeChild(panels.firstChild);
    if (id === 'virtuales') {
      const banner = createEl('div', { className: 'cta-banner' });
      banner.appendChild(createEl('div', { text: 'Aprende a tu ritmo con labs y proyectos guiados.' }));
      panels.appendChild(banner);
      panels.appendChild(await Courses());
      const disc = createEl('div', { className: 'cta-banner' });
      disc.appendChild(createEl('div', { text: 'Todos los cursos son 100% reales, basados en escenarios y buenas prácticas.' }));
      const badges = createEl('div', { className: 'badge-row' });
      ['EC-Council','OWASP','MITRE ATT&CK','NIST','ISO 27001'].forEach(b => badges.appendChild(createEl('span', { className: 'badge', text: b })));
      disc.appendChild(badges);
      const ul = createEl('ul', { className: 'list' });
      [
        'Acceso de por vida y actualizaciones incluidas',
        'Soporte por email/Discord en dudas puntuales',
        'Factura disponible y proceso de compra transparente',
        'Metodología de preparación para exámenes como CEH, eJPT, OSCP (fundamentals) y Security+',
        'Sin DRM: aprende en tu propio entorno'
      ].forEach(t => ul.appendChild(createEl('li', { text: t })));
      disc.appendChild(ul);
      panels.appendChild(disc);
    } else {
      const wrap = createEl('div');
      wrap.appendChild(createEl('div', { className: 'cta-banner', children: [ createEl('div', { text: 'Presenciales: inmersion guiada para acelerar habilidades, alinear practicas y resolver dudas en vivo.' }) ] }));
      const categories = [
        { t: 'Hacking etico', image: '/assets/material/ninja1.webp', items: [ 'Introduccion y Metodologia', 'Pentesting Web', 'Pentesting Infraestructura' ] },
        { t: 'Fundamentos', image: '/assets/material/dojo1.webp', items: [ 'Cybersecurity Fundamentals', 'Redes y Segmentacion', 'Amenazas y Riesgo' ] },
        { t: 'Capacitaciones cortas', image: '/assets/material/ninja2.webp', items: [ 'Taller OSINT', 'DFIR 101', 'DevSecOps Essentials' ] },
        { t: 'Campanas de ingenieria social', image: '/assets/material/ninja3.webp', items: [ 'Concientizacion', 'Phishing simulado', 'Reporting y metricas' ] },
      ];
      categories.forEach(cat => {
        const secCat = createEl('section', { className: 'section' });
        const cc = createEl('div', { className: 'container' });
        cc.appendChild(createEl('h3', { text: cat.t }));
        const grid = createEl('div', { className: 'card-grid' });
        cat.items.forEach(name => {
          const ctaBtn = createEl('a', { className: 'btn btn-sm btn-primary', text: 'Llenar formulario', attrs: { href: `#/formulario?modalidad=presencial&interes=${encodeURIComponent(name)}&categoria=${encodeURIComponent(cat.t)}` } });
          grid.appendChild(Card({ title: name, desc: 'Sesion presencial con enfoque practico y objetivos claros para tu equipo.', tags: ['presencial'], image: cat.image, cta: ctaBtn }));
        });
        cc.appendChild(grid);
        secCat.appendChild(cc);
        wrap.appendChild(secCat);
      });
      panels.appendChild(wrap);
    }
  }
  defTabs.forEach(t => {
    const el = createEl('div', { className: 'tab' + (t.id === active ? ' active' : ''), text: t.label, attrs: { 'data-id': t.id } });
    el.addEventListener('click', () => mount(t.id));
    tabs.appendChild(el);
  });
  c.append(tabs, panels);
  await mount(active);
  sec.appendChild(c);
  return sec;
}

// Basic form page used by presenciales
async function FormPage() {
  const main = createEl('main');
  const sec = createEl('section', { className: 'section page' });
  const c = createEl('div', { className: 'container' });
  c.appendChild(createEl('h2', { className: 'section-title', text: 'Solicitud de informacion' }));
  c.appendChild(createEl('p', { text: 'Dejanos tus datos y el interes del curso/capacitacion. Te contactaremos para coordinar la mejor opcion.' }));
  const qs = new URLSearchParams(location.hash.split('?')[1] || '');
  const interes = qs.get('interes') || '';
  const categoria = qs.get('categoria') || '';
  const modalidad = qs.get('modalidad') || '';
  const form = createEl('form', { className: 'cr-form', attrs: { method: 'post', action: '/form/submit' } });
  const row = (label, el) => { const r = createEl('div', { className: 'form-row' }); r.appendChild(createEl('label', { text: label })); r.appendChild(el); return r; };
  const iNombre = createEl('input', { attrs: { type: 'text', name: 'nombre', required: 'true', placeholder: 'Nombre completo' } });
  const iEmail = createEl('input', { attrs: { type: 'email', name: 'email', required: 'true', placeholder: 'correo@empresa.com' } });
  const iEmpresa = createEl('input', { attrs: { type: 'text', name: 'empresa', placeholder: 'Empresa/Organizacion' } });
  // Interés como lista desplegable (cursos presenciales)
  const presCursos = [
    'Introduccion y Metodologia',
    'Pentesting Web',
    'Pentesting Infraestructura',
    'Cybersecurity Fundamentals',
    'Redes y Segmentacion',
    'Amenazas y Riesgo',
    'Taller OSINT',
    'DFIR 101',
    'DevSecOps Essentials',
    'Concientizacion',
    'Phishing simulado',
    'Reporting y metricas'
  ];
  const iInteres = createEl('select', { attrs: { name: 'interes', required: 'true' } });
  presCursos.forEach(n => {
    const opt = createEl('option', { text: n, attrs: { value: n } });
    iInteres.appendChild(opt);
  });
  if (interes && presCursos.includes(interes)) iInteres.value = interes;

  // Modalidad fija (no editable)
  const iModalidad = createEl('input', { attrs: { type: 'text', name: 'modalidad', value: modalidad || 'presencial', readOnly: 'true' } });
  const iMsg = createEl('textarea', { attrs: { name: 'mensaje', rows: '4', placeholder: 'Cuentanos objetivos y disponibilidad' } });
  const iSubmit = createEl('button', { className: 'btn btn-primary', text: 'Enviar solicitud', attrs: { type: 'submit' } });
  form.append(
    row('Nombre', iNombre),
    row('Email', iEmail),
    row('Empresa', iEmpresa),
    row('Interes', iInteres),
    row('Modalidad', iModalidad),
    row('Mensaje', iMsg),
    createEl('div', { className: 'cta', children: [ iSubmit ] })
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = createEl('div', { className: 'cta-banner', children: [ createEl('div', { text: 'Solicitud registrada. Pronto nos comunicaremos contigo.' }) ] });
    form.replaceWith(ok);
  });
  c.appendChild(form);
  sec.appendChild(c);
  main.appendChild(sec);
  return main;
}

// Specialized form for Misiones (escenarios)
async function FormMisionPage() {
  const main = createEl('main');
  const sec = createEl('section', { className: 'section page' });
  const c = createEl('div', { className: 'container' });
  c.appendChild(createEl('h2', { className: 'section-title', text: 'Solicitud de Misión' }));
  c.appendChild(createEl('p', { text: 'Cuéntanos sobre el escenario que necesitas evaluar. Usamos esta información para definir alcance y tiempos de forma segura.' }));

  const qs = new URLSearchParams(location.hash.split('?')[1] || '');
  const interes = qs.get('interes') || '';
  const categoria = qs.get('categoria') || '';
  const tipo = qs.get('tipo') || '';

  const form = createEl('form', { className: 'cr-form', attrs: { method: 'post', action: '/mission/submit' } });
  const row = (label, el) => { const r = createEl('div', { className: 'form-row' }); r.appendChild(createEl('label', { text: label })); r.appendChild(el); return r; };
  const iNombre = createEl('input', { attrs: { type: 'text', name: 'nombre', required: 'true', placeholder: 'Nombre completo' } });
  const iEmail = createEl('input', { attrs: { type: 'email', name: 'email', required: 'true', placeholder: 'correo@empresa.com' } });
  const iEmpresa = createEl('input', { attrs: { type: 'text', name: 'empresa', placeholder: 'Empresa/Organizacion' } });
  const iCategoria = createEl('input', { attrs: { type: 'text', name: 'categoria', value: categoria || 'Red Team', readOnly: 'true' } });
  // Interés como select según tipo de misión
  const catMap = {
    red: [ 'Red Team', 'Pentesting Web', 'Pentesting Infraestructura', 'Pruebas de sistema operativo', 'Intrusion fisica', 'Pruebas de redes Wi‑Fi' ],
    blue: [ 'SOC Readiness y Detecciones', 'Gestion de Vulnerabilidades', 'DFIR y Respuesta a Incidentes', 'Threat Modeling y Arquitectura Segura', 'Hardening y Baselines', 'Seguridad en la Nube' ],
    social: [ 'Campanas de phishing', 'Concientizacion de seguridad', 'Simulaciones y talleres', 'Intrusion fisica (SE)' ]
  };
  const opciones = catMap[tipo] || [...new Set([...(catMap.red||[]), ...(catMap.blue||[]), ...(catMap.social||[])])];
  const iInteres = createEl('select', { attrs: { name: 'interes', required: 'true' } });
  opciones.forEach(n => iInteres.appendChild(createEl('option', { text: n, attrs: { value: n } })));
  if (interes && opciones.includes(interes)) iInteres.value = interes;
  const iTipo = createEl('input', { attrs: { type: 'text', name: 'tipo', value: tipo || '', readOnly: 'true' } });
  const iAlcance = createEl('textarea', { attrs: { name: 'alcance', rows: '3', placeholder: 'Activos/alcance (dominios/IPs/ubicaciones)' } });
  const iVentanas = createEl('textarea', { attrs: { name: 'ventanas', rows: '2', placeholder: 'Ventanas de prueba preferidas (fechas/horarios)' } });
  const iRestricciones = createEl('textarea', { attrs: { name: 'restricciones', rows: '2', placeholder: 'Restricciones/consideraciones (sin DoS, horarios, etc.)' } });
  const iContacto = createEl('input', { attrs: { type: 'text', name: 'contacto', placeholder: 'Contacto técnico/negocio' } });
  const iSubmit = createEl('button', { className: 'btn btn-primary', text: 'Enviar solicitud de misión', attrs: { type: 'submit' } });
  form.append(
    row('Nombre', iNombre),
    row('Email', iEmail),
    row('Empresa', iEmpresa),
    row('Categoria', iCategoria),
    row('Misión', iInteres),
    row('Tipo', iTipo),
    row('Alcance', iAlcance),
    row('Ventanas', iVentanas),
    row('Restricciones', iRestricciones),
    row('Contacto', iContacto),
    createEl('div', { className: 'cta', children: [ iSubmit ] })
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = createEl('div', { className: 'cta-banner', children: [ createEl('div', { text: 'Solicitud registrada. Nuestro equipo te contactará para coordinar la misión.' }) ] });
    form.replaceWith(ok);
  });
  c.appendChild(form);
  sec.appendChild(c);
  main.appendChild(sec);
  return main;
}

async function CoursesPage() {
  const main = createEl('main');
  const sec = createEl('section', { className: 'section page' });
  const c = createEl('div', { className: 'container' });
  c.append(
    createEl('h2', { className: 'section-title', text: 'Cursos' }),
    createEl('p', { text: 'Aprende con rutas aplicables a la vida real: desde fundamentos hasta especializaciones.' })
  );
  c.appendChild(await Courses());
  sec.appendChild(c);
  main.appendChild(sec);
  return main;
}

async function ServicesPage() {
  const main = createEl('main');
  const sec = createEl('section', { className: 'section page' });
  const c = createEl('div', { className: 'container' });
  c.append(
    createEl('h2', { className: 'section-title', text: 'Servicios' }),
    createEl('p', { text: 'Reducimos riesgo con impacto medible: evaluaciones, hardening, formacion y respuesta.' })
  );
  const call = createEl('div', { className: 'cta-banner' });
  call.appendChild(createEl('div', { text: 'Misiones: simulamos ataques reales para fortalecer tus defensas.' }));
  call.appendChild(createEl('div', { className: 'cta', children: [ createEl('a', { className: 'btn btn-primary', text: 'Saber mas', attrs: { href: '#/misiones' } }) ] }));
  c.appendChild(call);
  c.appendChild(await Services());
  sec.appendChild(c);
  main.appendChild(sec);
  return main;
}

async function MissionsPage() {
  const main = createEl('main');
  const sec = createEl('section', { className: 'section page' });
  const c = createEl('div', { className: 'container' });
  c.append(
    createEl('h2', { className: 'section-title', text: 'Misiones' }),
    createEl('p', { text: 'Pon a prueba tus defensas con misiones de hacking etico: simulamos ataques reales de forma controlada para fortalecer tus controles con evidencia y priorizacion por riesgo.' })
  );
  // Media destacado para Misiones (nuevo video/gif)
  const heroM = createEl('div', { className: 'hero-video' });
  const vidM = createEl('video', { attrs: { src: '/assets/material/gif%20ninja2.mp4', muted: '', autoplay: '', loop: '', playsinline: '' } });
  heroM.appendChild(vidM);
  c.appendChild(heroM);
  // Filtros de vista
  const chips = createEl('div', { className: 'chips' });
  const chipDefs = [
    { id: 'todo', label: 'Todo' },
    { id: 'red', label: 'Red Team' },
    { id: 'blue', label: 'Blue Team' },
    { id: 'social', label: 'Ing. Social' },
  ];
  let activeFilter = 'todo';
  chipDefs.forEach(d => {
    const ch = createEl('div', { className: 'chip' + (d.id === activeFilter ? ' active' : ''), text: d.label, attrs: { 'data-id': d.id } });
    ch.addEventListener('click', () => { activeFilter = d.id; updateFilter(); });
    chips.appendChild(ch);
  });
  c.appendChild(chips);

  // Secciones organizadas
  function missionSection(title, intro, items, catKey) {
    const s = createEl('section', { className: 'section mission-section', attrs: { 'data-cat': catKey } });
    const cc = createEl('div', { className: 'container' });
    cc.appendChild(createEl('h3', { text: title }));
    cc.appendChild(createEl('p', { text: intro }));
    const grid = createEl('div', { className: 'card-grid' });
    items.forEach(it => {
      const href = `#/form-mision?interes=${encodeURIComponent(it.title)}&categoria=${encodeURIComponent(title)}&tipo=${encodeURIComponent(catKey)}`;
      const btn = createEl('a', { className: 'btn btn-sm btn-primary', text: 'Llenar formulario', attrs: { href } });
      grid.appendChild(Card({ title: it.title, desc: it.desc, tags: it.tags || [], image: it.image, cta: btn }));
    });
    cc.appendChild(grid);
    s.appendChild(cc);
    return s;
  }

  // 1) Red Team / Seguridad ofensiva
  const ofensiva = [
    { title: 'Red Team', desc: 'Campañas adversariales que emulan amenazas reales para medir detección, respuesta y resiliencia.', tags: ['adversarial','tácticas'], image: '/assets/material/ninja1.webp' },
    { title: 'Pentesting Web', desc: 'Pruebas OWASP con explotación controlada y plan de remediación priorizado por riesgo.', tags: ['owasp'], image: '/assets/material/ninja3.webp' },
    { title: 'Pentesting Infraestructura', desc: 'Evaluación interna/externa, Active Directory y rutas de ataque realistas.', tags: ['red','ad'], image: '/assets/material/ninja2.webp' },
    { title: 'Pruebas de sistema operativo', desc: 'Evaluación de configuración, servicios y privilegios en Windows/Linux.', tags: ['os','hardening'], image: '/assets/material/dojo1.webp' },
    { title: 'Intrusión física', desc: 'Pruebas controladas de acceso físico, tailgating y exposición de activos.', tags: ['fisico'], image: '/assets/material/ninja4.webp' },
    { title: 'Pruebas de redes Wi‑Fi', desc: 'Auditoría de WLAN, cifrados, segregación y ataques comunes (capturas/evil twin).', tags: ['wifi','802.11'], image: '/assets/material/armeria.webp' },
  ];
  c.appendChild(missionSection(
    'Red Team / Seguridad ofensiva',
    'Descubre cómo un atacante real vería tu organización. Estas misiones validan controles, tiempos de detección y capacidad de contención con evidencias accionables.',
    ofensiva,
    'red'
  ));

  // 2) Blue Team / Seguridad defensiva
  const blue = [
    { title: 'SOC Readiness y Detecciones', desc: 'Mapeo ATT&CK, casos de uso SIEM, telemetría y pruebas de detección.', tags: ['SOC','detections'], image: '/assets/material/dojo1.webp' },
    { title: 'Gestión de Vulnerabilidades', desc: 'Ciclo continuo: descubrimiento, priorización (CVSS/EPSS), parchado y verificación.', tags: ['vulns','riesgo'], image: '/assets/material/ninja2.webp' },
    { title: 'DFIR y Respuesta a Incidentes', desc: 'Forense, contención, erradicación y mejora continua con lecciones aprendidas.', tags: ['dfir','ir'], image: '/assets/material/ninja4.webp' },
    { title: 'Threat Modeling y Arquitectura Segura', desc: 'STRIDE/ATT&CK, patrones seguros y controles por diseño.', tags: ['arquitectura'], image: '/assets/material/ninja3.webp' },
    { title: 'Hardening y Baselines', desc: 'Benchmarks CIS y políticas de configuración para reducir superficie de ataque.', tags: ['cis','baseline'], image: '/assets/material/armeria.webp' },
    { title: 'Seguridad en la Nube', desc: 'Revisión IAM, redes y datos en AWS/Azure/GCP con hardening y monitoreo.', tags: ['cloud','iam'], image: '/assets/material/ninja1.webp' },
  ];
  c.appendChild(missionSection(
    'Blue Team / Seguridad defensiva',
    'Fortalece controles, visibilidad y respuesta. Estas misiones aceleran la madurez operativa para detectar y contener incidentes.',
    blue,
    'blue'
  ));

  // 3) Ingeniería Social
  const social = [
    { title: 'Campañas de phishing', desc: 'Simulaciones con métricas (clic, reporte) y retroalimentación para el equipo.', tags: ['phishing'], image: '/assets/material/ninja2.webp' },
    { title: 'Concientización de seguridad', desc: 'Sesiones breves y directas para reducir riesgo humano con ejemplos reales.', tags: ['awareness'], image: '/assets/material/dojo1.webp' },
    { title: 'Simulaciones y talleres', desc: 'Entrenamiento práctico para líderes y equipos técnicos/no técnicos.', tags: ['taller'], image: '/assets/material/ninja3.webp' },
    { title: 'Intrusión física (SE)', desc: 'Pruebas físicas con enfoque en ingeniería social y procesos de acceso.', tags: ['fisico','SE'], image: '/assets/material/ninja4.webp' },
  ];
  c.appendChild(missionSection(
    'Ingeniería social',
    'Reduce el riesgo humano: educa, prueba y mejora la cultura de seguridad con métricas claras y mensajes efectivos.',
    social,
    'social'
  ));

  function updateFilter() {
    chips.querySelectorAll('.chip').forEach(ch => ch.classList.toggle('active', ch.getAttribute('data-id') === activeFilter));
    $$('.mission-section', c).forEach(sec => {
      const cat = sec.getAttribute('data-cat');
      sec.style.display = (activeFilter === 'todo' || cat === activeFilter) ? '' : 'none';
    });
  }
  updateFilter();

  sec.appendChild(c);
  main.appendChild(sec);
  return main;
}

async function ResourcesPage() {
  const main = createEl('main');
  const sec = createEl('section', { className: 'section page' });
  const c = createEl('div', { className: 'container' });
  c.append(
    createEl('h2', { className: 'section-title', text: 'Armeria' }),
    createEl('p', { text: 'Instructivos, PDFs, checklists y material propio de codeRonin: tu kit esencial para planear, ejecutar y documentar.' })
  );
  // Store grid: promos + PDFs (sin embeds), solo nombre + precio; luego agregamos links
  const store = await getJSON('/api/store.json', { promos: [], pdfs: [] });
  // Promos
  if (store.promos && store.promos.length) {
    const s = createEl('section', { className: 'section' });
    const cc = createEl('div', { className: 'container' });
    cc.appendChild(createEl('h3', { text: 'Promociones' }));
    const grid = createEl('div', { className: 'card-grid' });
    store.promos.forEach(p => {
      const price = createEl('span', { className: 'badge price', text: `$${p.price}` });
      const cta = p.link ? createEl('a', { className: 'btn btn-sm btn-primary', text: 'Comprar', attrs: { href: p.link, target: '_blank', rel: 'noopener noreferrer' } }) : null;
      const card = Card({ title: p.name, desc: p.desc || '', image: p.image, cta });
      const row = createEl('div', { className: 'badge-row' }); row.appendChild(price); card.appendChild(row);
      grid.appendChild(card);
    });
    cc.appendChild(grid); s.appendChild(cc); c.appendChild(s);
  }
  // PDFs
  if (store.pdfs && store.pdfs.length) {
    const s = createEl('section', { className: 'section' });
    const cc = createEl('div', { className: 'container' });
    cc.appendChild(createEl('h3', { text: 'PDFs' }));
    const grid = createEl('div', { className: 'card-grid' });
    store.pdfs.forEach(p => {
      const price = createEl('span', { className: 'badge price', text: `$${p.price}` });
      const cta = p.link ? createEl('a', { className: 'btn btn-sm btn-primary', text: 'Comprar', attrs: { href: p.link, target: '_blank', rel: 'noopener noreferrer' } }) : null;
      const card = Card({ title: p.name, desc: p.desc || '', image: p.image, cta });
      const row = createEl('div', { className: 'badge-row' }); row.appendChild(price); card.appendChild(row);
      grid.appendChild(card);
    });
    cc.appendChild(grid); s.appendChild(cc); c.appendChild(s);
  }
  sec.appendChild(c);
  main.appendChild(sec);
  return main;
}

async function ProjectsPage() {
  return await Projects();
}

async function ContactPage() {
  const sec = createEl('section', { className: 'section page', attrs: { id: 'contacto' } });
  const c = createEl('div', { className: 'container' });
  c.append(
    createEl('h2', { className: 'section-title', text: 'Contacto' }),
    createEl('p', { text: '¿Quieres colaborar, proponer contenidos o unirte al equipo? Escríbenos o contáctanos:' })
  );
  const socials = createEl('div', { className: 'social-row' });
  [
    { label: 'Email', href: 'mailto:coderonin404@gmail.com' },
    { label: 'WhatsApp', href: 'https://wa.me/573054402340' },
    { label: 'Instagram', href: 'https://www.instagram.com/code_ronin?igsh=aTRrcWtmdzQxZnI0' },
    { label: 'TikTok', href: 'https://www.tiktok.com/@code.ronin?_t=ZS-90Rb6qcPCVt&_r=1' }
  ].forEach(s => socials.appendChild(createEl('a', { text: s.label, attrs: { href: s.href, target: '_blank', rel: 'noopener noreferrer' } })));
  c.appendChild(socials);
  c.appendChild(createEl('p', { className: 'muted', text: 'Síguenos para más contenido y novedades.' }));
  sec.appendChild(c);
  return sec;
}

// Embeds with sandboxing
function EmbedInstagram(url = 'https://www.instagram.com/reel/CxLr7qHh3QK/embed') {
  const wrap = createEl('div', { className: 'embed-item' });
  const iframe = createEl('iframe', { attrs: { src: url, title: 'Instagram', loading: 'lazy', sandbox: 'allow-scripts allow-same-origin allow-popups', allow: 'encrypted-media; clipboard-write' } });
  wrap.appendChild(iframe);
  return wrap;
}

function EmbedTikTok(id = '7267642037643296032') {
  // Allow both video ID or profile handle starting with '@'
  const src = String(id).startsWith('@')
    ? `https://www.tiktok.com/embed/${id}`
    : `https://www.tiktok.com/embed/v2/video/${id}?lang=es-ES`;
  const wrap = createEl('div', { className: 'embed-item' });
  const iframe = createEl('iframe', { attrs: { src, title: 'TikTok', loading: 'lazy', sandbox: 'allow-scripts allow-same-origin allow-popups' } });
  wrap.appendChild(iframe);
  return wrap;
}

// Router
const routes = {
  '/': HomePage,
  'dojo': DojoPage,
  'formulario': FormPage,
  'form-mision': FormMisionPage,
  'misiones': MissionsPage,
  'armeria': ResourcesPage,
  // Aliases
  'cursos': CoursesPage,
  'servicios': ServicesPage,
  'recursos': ResourcesPage,
  // Info pages
  'about': AboutPage,
  'projects': ProjectsPage,
  'contact': ContactPage,
};

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, '');
  const base = raw.split('?')[0];
  return base || '/';
}

async function render() {
  const route = parseRoute();
  setActiveNav(route);
  const root = $('#root');
  root.innerHTML = '';
  const page = routes[route] || HomePage;
  root.appendChild(await page());
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
  showLoaderOnce();
  render();
  const brand = document.querySelector('.brand-text.glitch');
  if (brand) setInterval(() => brand.classList.toggle('animate'), 2000);
  // mobile nav
  const btn = document.getElementById('nav-toggle');
  const nav = document.getElementById('nav-links');
  if (btn && nav) {
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }
  // Neon cursor for clickable elements (desktop only)
  try {
    if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
      document.body.classList.add('mouse-cursor-enabled');
      const cursor = document.createElement('div');
      cursor.className = 'cursor hidden';
      document.body.appendChild(cursor);
      let raf = null;
      let cx = 0, cy = 0;
      function update() { cursor.style.transform = `translate(${cx}px, ${cy}px)`; raf = null; }
      document.addEventListener('mousemove', (e) => {
        cursor.classList.remove('hidden');
        cx = e.clientX; cy = e.clientY; if (!raf) raf = requestAnimationFrame(update);
      }, { passive: true });
      function isClickable(el) { return !!el.closest('a, button, .btn, [role="button"], .nav a'); }
      document.addEventListener('mouseover', (e) => {
        if (isClickable(e.target)) cursor.classList.add('active'); else cursor.classList.remove('active');
      });
      document.addEventListener('mousedown', () => { cursor.classList.add('click'); setTimeout(() => cursor.classList.remove('click'), 350); });
      document.addEventListener('mouseleave', () => cursor.classList.add('hidden'));
    }
  } catch {}
  // Fix brand logo centered; no parallax movement
  const bgLogo = document.querySelector('#bg-brand .bg-logo');
  if (bgLogo) bgLogo.style.setProperty('--logo-y', '0px');
  const bg = document.getElementById('bg-brand');
  if (bg) bg.style.setProperty('--grid-y', '0px');
});
