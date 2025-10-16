// codeRonin frontend SPA (framework-less)
// Security: no eval, no inline handlers; CSP enforced via headers

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function setActiveNav(route) {
  const links = $$('#nav-links a');
  links.forEach(a => {
    const href = a.getAttribute('href') || '';
    let to = href.startsWith('#') ? href.replace(/^#\/?/, '') : href.replace(/^\//, '');
    to = to.split('?')[0] || '/';
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

// Simple modal popup (no deps)
function showModal(message, { title = 'Listo', onClose } = {}) {
  const overlay = createEl('div', { className: 'modal-overlay', attrs: { role: 'dialog', 'aria-modal': 'true' } });
  const box = createEl('div', { className: 'modal' });
  const heading = createEl('h3', { text: title });
  const body = createEl('p', { text: message });
  const actions = createEl('div', { className: 'modal-actions' });
  const okBtn = createEl('button', { className: 'btn btn-primary', text: 'Aceptar' });
  actions.appendChild(okBtn);
  box.append(heading, body, actions);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  function close() {
    overlay.remove();
    if (typeof onClose === 'function') try { onClose(); } catch {}
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  okBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', onKey);

  try { okBtn.focus(); } catch {}
}

// Client-side navigation without hash (History API)
function navigate(path, { replace = false } = {}) {
  if (replace) history.replaceState({}, '', path); else history.pushState({}, '', path);
  render();
}

function getToken() {
  try { return localStorage.getItem('cr_token') || ''; } catch { return ''; }
}

function setToken(tok) {
  try {
    if (!tok) localStorage.removeItem('cr_token'); else localStorage.setItem('cr_token', tok);
  } catch {}
  try { updateAuthNav(); } catch {}
}

async function updateAuthNav() {
  const nav = document.getElementById('nav-links');
  if (!nav) return;
  let me = null;
  try { me = await getJSON('/api/auth/me', null); } catch {}
  const existing = nav.querySelector('a[data-id="nav-admin"]');
  const loginLink = nav.querySelector('a[data-id="nav-login"]');
  const profileLink = nav.querySelector('a[data-id="nav-profile"]');
  const classesLink = nav.querySelector('a[data-id="nav-classes"]');
  const isAdmin = !!(me && Array.isArray(me.roles) && me.roles.includes('gato'));
  const isInstructor = !!(me && Array.isArray(me.roles) && (me.roles.includes('gato') || me.roles.includes('sensei')));
  // Update user chip
  try {
    const chip = document.getElementById('user-chip');
    if (chip) {
      chip.innerHTML = '';
      const label = me && me.username ? me.username : '';
      if (label) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'user-button';
        btn.textContent = label;
        btn.setAttribute('aria-label', 'Abrir menu de usuario');
        btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleUserMenu(btn); });
        btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleUserMenu(btn); } });
        chip.appendChild(btn);
      }
    }
  } catch {}
  if (isAdmin && !existing) {
    const link = document.createElement('a');
    link.href = '/admin';
    link.textContent = 'Admin';
    link.setAttribute('data-id', 'nav-admin');
    nav.appendChild(link);
  } else if (!isAdmin && existing) {
    existing.remove();
  }
  if (!me && !loginLink) {
    const link = document.createElement('a');
    link.href = '/login';
    link.textContent = 'Login';
    link.setAttribute('data-id', 'nav-login');
    nav.appendChild(link);
  } else if (me && loginLink) {
    loginLink.remove();
  }
  if (me && !profileLink) {
    const link = document.createElement('a');
    link.href = '/perfil';
    link.textContent = 'Perfil';
    link.setAttribute('data-id', 'nav-profile');
    nav.appendChild(link);
  } else if (!me && profileLink) {
    profileLink.remove();
  }
}

function toggleUserMenu(anchor) {
  const existing = document.getElementById('user-menu');
  if (existing) { existing.remove(); return; }
  const rect = anchor.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.id = 'user-menu';
  menu.className = 'user-menu';
  const toPerfil = document.createElement('a');
  toPerfil.href = '/perfil';
  toPerfil.textContent = 'Perfil';
  const toLogout = document.createElement('button');
  toLogout.type = 'button';
  toLogout.textContent = 'Salir';
  toLogout.className = 'menu-danger';
  toLogout.addEventListener('click', async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    setToken('');
    closeUserMenu();
    navigate('/');
  });
  menu.append(toPerfil, toLogout);
  document.body.appendChild(menu);
  const top = rect.bottom + 6 + window.scrollY;
  const left = Math.min(rect.left + window.scrollX, window.innerWidth - menu.offsetWidth - 8);
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;
  setTimeout(() => {
    const onDoc = (e) => { if (!menu.contains(e.target) && e.target !== anchor) closeUserMenu(); };
    const onKey = (e) => { if (e.key === 'Escape') closeUserMenu(); };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    menu._cleanup = () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
  }, 0);
}

function closeUserMenu() {
  const m = document.getElementById('user-menu');
  if (m) { try { m._cleanup && m._cleanup(); } catch {} m.remove(); }
}

async function getJSON(path, fallback = []) {
  try {
    const token = getToken();
    const headers = { 'accept': 'application/json' };
    if (token) headers['authorization'] = `Bearer ${token}`;
    const res = await fetch(path, { headers, credentials: 'include' });
    if (!res.ok) { let msg = 'No se pudo iniciar sesion'; try { const ct = (res.headers.get('content-type') || '').toLowerCase(); const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text()); msg = err?.error || err?.message || msg; } catch {} throw new Error(msg); }
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (res.status === 204) return fallback;
    if (ct.includes('application/json')) return await res.json();
    try { return JSON.parse(await res.text()); } catch { return fallback; }
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
  const symbol = createEl('div', { className: 'loader-symbol', text: 'a?' });
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
  const p = createEl('p', { text: 'Laboratorios, proyectos reales, comunidad y material práctico para crecer en seguridad ofensiva y defensiva.' });
  const cta = createEl('div', { className: 'cta' });
  const btnMis = createEl('button', { className: 'btn', text: 'Ir a Misiones' });
  const btnDojo = createEl('button', { className: 'btn', text: 'Ir al Dojo' });
  const btnArm = createEl('button', { className: 'btn', text: 'Armería' });
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
        title: 'Misiones de hacking ético',
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
          'Forja habilidades con rutas prácticas en pentesting, redes y forense, pensadas para el dia a dia.',
          'Aprende haciendo: labs guiados, proyectos y feedback para subir de nivel de forma consistente.'
        ],
        link: '/dojo',
        img: '/assets/material/dojo1.webp'
      },
      armeria: {
        title: 'Armería',
        body: [
          'Tu kit esencial del ronin digital: guías, checklists y plantillas listas para aplicar.',
          'Estandariza procesos, acelera entregables y evita reinventar la rueda en cada misión.'
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
    left.append(
      createEl('h3', { text: data.title })
    );
    if (Array.isArray(data.body)) {
      data.body.forEach(t => left.appendChild(createEl('p', { text: t })));
    } else {
      left.appendChild(createEl('p', { text: data.body }));
    }
    left.appendChild(createEl('div', { className: 'cta', children: [ createEl('a', { className: 'btn btn-primary', text: 'Saber más', attrs: { href: data.link } }) ] }));
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
    { title: 'Hacking Ético', description: 'Fundamentos y metodología de pruebas.', tags: ['pentesting','ética'] },
    { title: 'Cybersecurity Fundamentals', description: 'Conceptos clave y control de riesgos.', tags: ['fundamentos'] },
    { title: 'Seguridad en Redes', description: 'Arquitecturas y segmentacion.', tags: ['redes'] },
    { title: 'Análisis Forense', description: 'Adquisicion y análisis de evidencia.', tags: ['forense'] },
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
    { name: 'Conferencia: Seguridad Ofensiva 101', description: 'Charla sobre fundamentos de pentesting y ética.' },
    { name: 'Caso: Endurecimiento Linux', description: 'Reduccion de superficie de ataque y mejora de visibilidad en 60 dias.' },
    { name: 'Workshop: DFIR Hands-On', description: 'Taller práctico de respuesta a incidentes con ejercicios guiados.' }
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

  // Por quA contactarnos
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
      createEl('a', { className: 'btn btn-primary', text: 'Ir a Misiones', attrs: { href: '/misiones' } }),
      createEl('a', { className: 'btn btn-ghost', text: 'Ir al Dojo', attrs: { href: '/dojo' } }),
      createEl('a', { className: 'btn btn-ghost', text: 'Ir a Armería', attrs: { href: '/armeria' } })
    ] })
  );
  sec2.appendChild(c2);

  // Quiénes somos (ahora debajo del por quA)
  const sec1 = createEl('section', { className: 'section' });
  const c1 = createEl('div', { className: 'container' });
  c1.appendChild(createEl('h2', { className: 'section-title', text: 'Quiénes somos' }));
  c1.appendChild(createEl('p', { text: 'codeRonin es un dojo de ciberseguridad con espAritu ronin: construimos, probamos y aprendemos con Atica y mAtodo. Unimos mentalidad ofensiva y defensiva para pensar como atacante y diseAar mejores defensas.' }));
  c1.appendChild(createEl('p', { text: 'Entrena en el Dojo (virtual/presencial), pon a prueba tus defensas con Misiones y equipa tu dAa a dAa en la ArmerAa con guAas y checklists.' }));
  const promo = createEl('div', { className: 'cta-banner' });
  promo.appendChild(createEl('div', { text: 'Espacio para banners y promociones (próximamente).' }));
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
  c.appendChild(createEl('p', { text: 'En codeRonin formamos "ninjas digitales": disciplina, curiosidad y práctica. Operamos con ética y consentimiento en laboratorios controlados, para que pensar como atacante te ayude a diseñar mejores defensas.' }));

  // Motivación
  c.appendChild(createEl('h3', { text: 'Motivación' }));
  const ulMot = createEl('ul', { className: 'list' });
  [
    'Cerrar la brecha entre teoría y práctica con labs reproducibles.',
    'Elevar la cultura de seguridad con contenidos breves y accionables.',
    'Acelerar la madurez: hardening, detección, respuesta y reporte ejecutivo.'
  ].forEach(t => ulMot.appendChild(createEl('li', { text: t })));
  c.appendChild(ulMot);

  // Conferencias y actividades
  c.appendChild(createEl('h3', { text: 'Conferencias y actividades' }));
  const ulAct = createEl('ul', { className: 'list' });
  [
    'Charlas (BSides/FLISoL): Evil Twin corporativo, DFIR exprés, Ingeniería social asistida por IA.',
    'Comunidad y contenidos: Reels/Shorts diarios, microtutoriales de Wi-Fi, phishing, logs, OSINT.',
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
    'Performance y magia escénica para elevar la efectividad de charlas.',
    'Analítica y datos para instrumentar métricas y aprendizaje.',
    'Narrativa "ninja digital" para impulsar la cultura de seguridad.'
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
      disc.appendChild(createEl('div', { text: 'Todos los cursos son 100% reales, basados en escenarios y buenas prA!cticas.' }));
      const badges = createEl('div', { className: 'badge-row' });
      ['EC-Council','OWASP','MITRE ATT&CK','NIST','ISO 27001'].forEach(b => badges.appendChild(createEl('span', { className: 'badge', text: b })));
      disc.appendChild(badges);
      const ul = createEl('ul', { className: 'list' });
      [
        'Acceso de por vida y actualizaciones incluidas',
        'Soporte por email/Discord en dudas puntuales',
        'Factura disponible y proceso de compra transparente',
        'MetodologAa de preparaciA3n para exA!menes como CEH, eJPT, OSCP (fundamentals) y Security+',
        'Sin DRM: aprende en tu propio entorno'
      ].forEach(t => ul.appendChild(createEl('li', { text: t })));
      disc.appendChild(ul);
      panels.appendChild(disc);
    } else {
      const wrap = createEl('div');
      wrap.appendChild(createEl('div', { className: 'cta-banner', children: [ createEl('div', { text: 'Presenciales: inmersion guiada para acelerar habilidades, alinear prácticas y resolver dudas en vivo.' }) ] }));
      const categories = [
        { t: 'Hacking ético', image: '/assets/material/ninja1.webp', items: [ 'Introduccion y Metodología', 'Pentesting Web', 'Pentesting Infraestructura' ] },
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
          const ctaBtn = createEl('a', { className: 'btn btn-sm btn-primary', text: 'Llenar formulario', attrs: { href: `/formulario?modalidad=presencial&interes=${encodeURIComponent(name)}&categoria=${encodeURIComponent(cat.t)}` } });
          grid.appendChild(Card({ title: name, desc: 'Sesion presencial con enfoque práctico y objetivos claros para tu equipo.', tags: ['presencial'], image: cat.image, cta: ctaBtn }));
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
  c.appendChild(createEl('h2', { className: 'section-title', text: 'Solicitud de información' }));
  c.appendChild(createEl('p', { text: 'Déjanos tus datos y el interés del curso/capacitación. Te contactaremos para coordinar la mejor opción.' }));
  const qs = new URLSearchParams(location.search || '');
  const interes = qs.get('interes') || '';
  const categoria = qs.get('categoria') || '';
  const modalidad = qs.get('modalidad') || '';
  const form = createEl('form', { className: 'cr-form', attrs: { method: 'post', action: '/form/submit' } });
  const row = (label, el) => { const r = createEl('div', { className: 'form-row' }); r.appendChild(createEl('label', { text: label })); r.appendChild(el); return r; };
  const iNombre = createEl('input', { attrs: { type: 'text', name: 'nombre', required: 'true', placeholder: 'Nombre completo' } });
  const iEmail = createEl('input', { attrs: { type: 'email', name: 'email', required: 'true', placeholder: 'correo@empresa.com' } });
  const iEmpresa = createEl('input', { attrs: { type: 'text', name: 'empresa', placeholder: 'Empresa/Organización' } });
  // InterAs como lista desplegable (cursos presenciales)
  const presCursos = [
    'Introduccion y Metodología',
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
  const presCursosFixed = [
    'Introducción y Metodología',
    'Pentesting Web',
    'Pentesting Infraestructura',
    'Cybersecurity Fundamentals',
    'Redes y Segmentación',
    'Amenazas y Riesgo',
    'Taller OSINT',
    'DFIR 101',
    'DevSecOps Essentials',
    'Concientización',
    'Phishing simulado',
    'Reportes y métricas'
  ];
  const iInteres = createEl('select', { attrs: { name: 'interes', required: 'true' } });
  presCursosFixed.forEach(n => {
    const opt = createEl('option', { text: n, attrs: { value: n } });
    iInteres.appendChild(opt);
  });
  if (interes && presCursosFixed.includes(interes)) iInteres.value = interes;

  // Modalidad fija (no editable)
  const iModalidad = createEl('input', { attrs: { type: 'text', name: 'modalidad', value: modalidad || 'presencial', readOnly: 'true' } });
  const iMsg = createEl('textarea', { attrs: { name: 'mensaje', rows: '4', placeholder: 'Cuéntanos objetivos y disponibilidad' } });
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
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());
      const res = await fetch('/api/forms/course', { method: 'POST', headers: { 'content-type': 'application/json', 'accept': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { let msg = 'No se pudo iniciar sesion'; try { const ct = (res.headers.get('content-type') || '').toLowerCase(); const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text()); msg = err?.error || err?.message || msg; } catch {} throw new Error(msg); }
      showModal('Tu solicitud fue enviada correctamente. Pronto nos comunicaremos contigo.', { title: 'Solicitud enviada', onClose: () => { try { form.reset(); } catch {} } });
    } catch (err) {
      showModal('Hubo un error al enviar la solicitud. Intenta de nuevo.', { title: 'Error' });
    }
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
  c.appendChild(createEl('h2', { className: 'section-title', text: 'Solicitud de MisiA3n' }));
  c.appendChild(createEl('p', { text: 'CuAntanos sobre el escenario que necesitas evaluar. Usamos esta informaciA3n para definir alcance y tiempos de forma segura.' }));

  const qs = new URLSearchParams(location.search || '');
  const interes = qs.get('interes') || '';
  const categoria = qs.get('categoria') || '';
  const tipo = qs.get('tipo') || '';

  const form = createEl('form', { className: 'cr-form', attrs: { method: 'post', action: '/mission/submit' } });
  const row = (label, el) => { const r = createEl('div', { className: 'form-row' }); r.appendChild(createEl('label', { text: label })); r.appendChild(el); return r; };
  const iNombre = createEl('input', { attrs: { type: 'text', name: 'nombre', required: 'true', placeholder: 'Nombre completo' } });
  const iEmail = createEl('input', { attrs: { type: 'email', name: 'email', required: 'true', placeholder: 'correo@empresa.com' } });
  const iEmpresa = createEl('input', { attrs: { type: 'text', name: 'empresa', placeholder: 'Empresa/Organizacion' } });
  const iCategoria = createEl('input', { attrs: { type: 'text', name: 'categoria', value: categoria || 'Red Team', readOnly: 'true' } });
  // InterAs como select segAon tipo de misiA3n
  const catMap = {
    red: [ 'Red Team', 'Pentesting Web', 'Pentesting Infraestructura', 'Pruebas de sistema operativo', 'Intrusion fisica', 'Pruebas de redes WiaFi' ],
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
  const iContacto = createEl('input', { attrs: { type: 'text', name: 'contacto', placeholder: 'Contacto tAcnico/negocio' } });
  const iSubmit = createEl('button', { className: 'btn btn-primary', text: 'Enviar solicitud de misiA3n', attrs: { type: 'submit' } });
  form.append(
    row('Nombre', iNombre),
    row('Email', iEmail),
    row('Empresa', iEmpresa),
    row('Categoria', iCategoria),
    row('MisiA3n', iInteres),
    row('Tipo', iTipo),
    row('Alcance', iAlcance),
    row('Ventanas', iVentanas),
    row('Restricciones', iRestricciones),
    row('Contacto', iContacto),
    createEl('div', { className: 'cta', children: [ iSubmit ] })
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());
      const res = await fetch('/api/forms/mission', { method: 'POST', headers: { 'content-type': 'application/json', 'accept': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { let msg = 'No se pudo iniciar sesion'; try { const ct = (res.headers.get('content-type') || '').toLowerCase(); const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text()); msg = err?.error || err?.message || msg; } catch {} throw new Error(msg); }
      showModal('Tu solicitud de misión fue registrada. Nuestro equipo te contactara para coordinar los siguientes pasos.', { title: 'Solicitud enviada', onClose: () => { try { form.reset(); } catch {} } });
      return;
    } catch (err) {
      showModal('Hubo un error al enviar la solicitud. Intenta de nuevo.', { title: 'Error' });
      return;
    }
    showModal('Tu solicitud de misiA3n fue registrada. Nuestro equipo te contactarA! para coordinar los siguientes pasos.', { title: 'Solicitud enviada', onClose: () => { try { form.reset(); } catch {} } });
    const ok = createEl('div', { className: 'cta-banner', children: [ createEl('div', { text: 'Solicitud registrada. Nuestro equipo te contactarA! para coordinar la misiA3n.' }) ] });
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
  call.appendChild(createEl('div', { className: 'cta', children: [ createEl('a', { className: 'btn btn-primary', text: 'Saber más', attrs: { href: '/misiones' } }) ] }));
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
    createEl('p', { text: 'Pon a prueba tus defensas con misiones de hacking ético: simulamos ataques reales de forma controlada para fortalecer tus controles con evidencia y priorizacion por riesgo.' })
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
      const href = `/form-mision?interes=${encodeURIComponent(it.title)}&categoria=${encodeURIComponent(title)}&tipo=${encodeURIComponent(catKey)}`;
      const btn = createEl('a', { className: 'btn btn-sm btn-primary', text: 'Llenar formulario', attrs: { href } });
      grid.appendChild(Card({ title: it.title, desc: it.desc, tags: it.tags || [], image: it.image, cta: btn }));
    });
    cc.appendChild(grid);
    s.appendChild(cc);
    return s;
  }

  // 1) Red Team / Seguridad ofensiva
  const ofensiva = [
    { title: 'Red Team', desc: 'CampaAas adversariales que emulan amenazas reales para medir detecciA3n, respuesta y resiliencia.', tags: ['adversarial','tA!cticas'], image: '/assets/material/ninja1.webp' },
    { title: 'Pentesting Web', desc: 'Pruebas OWASP con explotaciA3n controlada y plan de remediaciA3n priorizado por riesgo.', tags: ['owasp'], image: '/assets/material/ninja3.webp' },
    { title: 'Pentesting Infraestructura', desc: 'EvaluaciA3n interna/externa, Active Directory y rutas de ataque realistas.', tags: ['red','ad'], image: '/assets/material/ninja2.webp' },
    { title: 'Pruebas de sistema operativo', desc: 'EvaluaciA3n de configuraciA3n, servicios y privilegios en Windows/Linux.', tags: ['os','hardening'], image: '/assets/material/dojo1.webp' },
    { title: 'IntrusiA3n fAsica', desc: 'Pruebas controladas de acceso fAsico, tailgating y exposiciA3n de activos.', tags: ['fisico'], image: '/assets/material/ninja4.webp' },
    { title: 'Pruebas de redes WiFi', desc: 'Auditoría de WLAN, cifrados, segregación y ataques comunes (capturas/evil twin).', tags: ['wifi','802.11'], image: '/assets/material/armeria.webp' },
  ];
  c.appendChild(missionSection(
    'Red Team / Seguridad ofensiva',
    'Descubre cA3mo un atacante real verAa tu organizaciA3n. Estas misiones validan controles, tiempos de detecciA3n y capacidad de contenciA3n con evidencias accionables.',
    ofensiva,
    'red'
  ));

  // 2) Blue Team / Seguridad defensiva
  const blue = [
    { title: 'SOC Readiness y Detecciones', desc: 'Mapeo ATT&CK, casos de uso SIEM, telemetrAa y pruebas de detecciA3n.', tags: ['SOC','detections'], image: '/assets/material/dojo1.webp' },
    { title: 'GestiA3n de Vulnerabilidades', desc: 'Ciclo continuo: descubrimiento, priorizaciA3n (CVSS/EPSS), parchado y verificaciA3n.', tags: ['vulns','riesgo'], image: '/assets/material/ninja2.webp' },
    { title: 'DFIR y Respuesta a Incidentes', desc: 'Forense, contenciA3n, erradicaciA3n y mejora continua con lecciones aprendidas.', tags: ['dfir','ir'], image: '/assets/material/ninja4.webp' },
    { title: 'Threat Modeling y Arquitectura Segura', desc: 'STRIDE/ATT&CK, patrones seguros y controles por diseAo.', tags: ['arquitectura'], image: '/assets/material/ninja3.webp' },
    { title: 'Hardening y Baselines', desc: 'Benchmarks CIS y políticas de configuración para reducir superficie de ataque.', tags: ['cis','baseline'], image: '/assets/material/armeria.webp' },
    { title: 'Seguridad en la Nube', desc: 'RevisiA3n IAM, redes y datos en AWS/Azure/GCP con hardening y monitoreo.', tags: ['cloud','iam'], image: '/assets/material/ninja1.webp' },
  ];
  c.appendChild(missionSection(
    'Blue Team / Seguridad defensiva',
    'Fortalece controles, visibilidad y respuesta. Estas misiones aceleran la madurez operativa para detectar y contener incidentes.',
    blue,
    'blue'
  ));

  // 3) IngenierAa Social
  const social = [
    { title: 'CampaAas de phishing', desc: 'Simulaciones con mAtricas (clic, reporte) y retroalimentaciA3n para el equipo.', tags: ['phishing'], image: '/assets/material/ninja2.webp' },
    { title: 'ConcientizaciA3n de seguridad', desc: 'Sesiones breves y directas para reducir riesgo humano con ejemplos reales.', tags: ['awareness'], image: '/assets/material/dojo1.webp' },
    { title: 'Simulaciones y talleres', desc: 'Entrenamiento prA!ctico para lAderes y equipos tAcnicos/no tAcnicos.', tags: ['taller'], image: '/assets/material/ninja3.webp' },
    { title: 'IntrusiA3n fAsica (SE)', desc: 'Pruebas fAsicas con enfoque en ingenierAa social y procesos de acceso.', tags: ['fisico','SE'], image: '/assets/material/ninja4.webp' },
  ];
  c.appendChild(missionSection(
    'IngenierAa social',
    'Reduce el riesgo humano: educa, prueba y mejora la cultura de seguridad con mAtricas claras y mensajes efectivos.',
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
    createEl('h2', { className: 'section-title', text: 'Armería' }),
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
    createEl('p', { text: 'A?Quieres colaborar, proponer contenidos o unirte al equipo? EscrAbenos o contA!ctanos:' })
  );
  const socials = createEl('div', { className: 'social-row' });
  [
    { label: 'Email', href: 'mailto:coderonin404@gmail.com' },
    { label: 'WhatsApp', href: 'https://wa.me/573054402340' },
    { label: 'Instagram', href: 'https://www.instagram.com/code_ronin?igsh=aTRrcWtmdzQxZnI0' },
    { label: 'TikTok', href: 'https://www.tiktok.com/@code.ronin?_t=ZS-90Rb6qcPCVt&_r=1' }
  ].forEach(s => socials.appendChild(createEl('a', { text: s.label, attrs: { href: s.href, target: '_blank', rel: 'noopener noreferrer' } })));
  c.appendChild(socials);
  c.appendChild(createEl('p', { className: 'muted', text: 'SAguenos para mA!s contenido y novedades.' }));
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
  'login': LoginPage,
  'signup': SignupPage,
  'perfil': ProfilePage,
  'admin': AdminPage,
  'clases': InstructorPage,
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
  const rawPath = location.pathname || '/';
  if (rawPath === '/' || rawPath === '') return '/';
  const base = rawPath.replace(/^\/+/, '').split('/')[0];
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

window.addEventListener('popstate', render);
window.addEventListener('DOMContentLoaded', () => {
  showLoaderOnce();
  render();
  updateAuthNav();
  // Intercept internal links to use History API navigation
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(href, location.origin);
    if (url.origin !== location.origin) return;
    if (url.pathname.startsWith('/api')) return; // let API links pass
    e.preventDefault();
    navigate(url.pathname + url.search);
  });
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

// Login page (brand + form)
async function LoginPage() {
  const wrap = createEl('section', { className: 'section page', attrs: { id: 'login' } });
  const c = createEl('div', { className: 'container' });
  const grid = createEl('div', { className: 'auth-grid' });
  const media = createEl('div', { className: 'auth-media' });
  const art = createEl('img', { attrs: { src: '/assets/material/ninja1.webp', alt: 'codeRonin', loading: 'lazy' } });
  media.appendChild(art);
  const card = createEl('div', { className: 'card login-card' });
  const brand = createEl('div', { className: 'brand login-brand' });
  const logo = createEl('img', { className: 'logo', attrs: { src: '/assets/material/logo.webp', alt: 'codeRonin' } });
  const title = createEl('h2', { className: 'section-title', text: 'Iniciar sesiA3n' });
  const brandText = createEl('span', { className: 'brand-text', text: 'codeRonin' });
  brand.append(logo, brandText);
  card.append(brand, title);

  const form = createEl('form', { className: 'login-form', attrs: { autocomplete: 'on' } });
  const fg1 = createEl('div', { className: 'form-group' });
  const user = createEl('input', { attrs: { type: 'text', name: 'username', placeholder: 'Usuario', required: '', autocomplete: 'username' } });
  fg1.appendChild(user);
  const fg2 = createEl('div', { className: 'form-group' });
  const pass = createEl('input', { attrs: { type: 'password', name: 'password', placeholder: 'Clave', required: '', autocomplete: 'current-password' } });
  fg2.appendChild(pass);
  const actions = createEl('div', { className: 'btn-row' });
  const btn = createEl('button', { className: 'btn btn-accent', text: 'Entrar', attrs: { type: 'submit' } });
  const btnSignup = createEl('button', { className: 'btn btn-accent', text: 'Crear cuenta', attrs: { type: 'button' } });
  btnSignup.addEventListener('click', (e) => { e.preventDefault(); navigate('/signup'); });
  actions.append(btn, btnSignup);
  form.append(fg1, fg2, actions);
  card.appendChild(form);

  // If already logged-in admin (gato), go to admin
  try {
    const me = await getJSON('/api/auth/me', null);
    if (me && Array.isArray(me.roles) && me.roles.includes('gato')) {
      navigate('/admin');
    }
  } catch {}

  // Prefill last username
  try { const last = localStorage.getItem('cr_last_username'); if (last) user.value = last; } catch {}

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: user.value, password: pass.value })
      });
      if (!res.ok) { let msg = 'No se pudo iniciar sesion'; try { const ct = (res.headers.get('content-type') || '').toLowerCase(); const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text()); msg = err?.error || err?.message || msg; } catch {} throw new Error(msg); }
      const data = await res.json();
      try { localStorage.setItem('cr_last_username', String(user.value || '')); } catch {}
      setToken(data.token || '');
      if (data?.user?.roles && Array.isArray(data.user.roles) && data.user.roles.includes('gato')) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      showModal(err?.message || 'No se pudo iniciar sesion', { title: 'Error' });
    } finally {
      btn.disabled = false;
    }
  });

  grid.append(media, card);
  c.appendChild(grid);
  wrap.appendChild(c);
  return wrap;
}

// Perfil (ver/editar datos y cambiar avatar)
async function ProfilePage() {
  const wrap = createEl('section', { className: 'section page', attrs: { id: 'perfil' } });
  const c = createEl('div', { className: 'container' });
  c.appendChild(createEl('h2', { className: 'section-title', text: 'Perfil' }));
  const me = await getJSON('/api/auth/me', null);
  if (!me || !me.username) { navigate('/login', { replace: true }); return wrap; }

  const prof = await getJSON('/api/user/profile', { username: '', name: '', email: '', phone: '', avatarUrl: '' });
  const roles = Array.isArray(prof.roles) ? prof.roles : [];
  const card = createEl('div', { className: 'card' });
  const row = createEl('div', { className: 'profile-row' });
  const avatar = createEl('img', { attrs: { src: prof.avatarUrl || '/assets/material/logo.webp', alt: 'avatar', width: '96', height: '96' }, className: 'avatar' });
  const avatarInput = createEl('input', { attrs: { type: 'file', accept: 'image/*' } });
  const upBtn = createEl('button', { className: 'btn', text: 'Cambiar foto' });
  upBtn.addEventListener('click', () => avatarInput.click());
  avatarInput.addEventListener('change', async () => {
    const f = avatarInput.files && avatarInput.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { showModal('Imagen muy pesada (mA!x 2MB)', { title: 'Error' }); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
      const res = await fetch('/api/user/avatar', { method: 'POST', headers: { 'content-type': 'application/json', 'accept': 'application/json' }, credentials: 'include', body: JSON.stringify({ dataUrl: reader.result }) });
        if (!res.ok) { let msg = 'No se pudo iniciar sesion'; try { const ct = (res.headers.get('content-type') || '').toLowerCase(); const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text()); msg = err?.error || err?.message || msg; } catch {} throw new Error(msg); }
        const j = await res.json();
        avatar.src = (j.url || avatar.src) + `?t=${Date.now()}`;
        updateAuthNav();
      } catch {
        showModal('No se pudo actualizar el avatar', { title: 'Error' });
      }
    };
    reader.readAsDataURL(f);
  });

  const form = createEl('form', { className: 'cr-form', attrs: { autocomplete: 'off' } });
  // Roles (read-only badges)
  if (roles && roles.length) {
    const badges = createEl('div', { className: 'badge-row' });
    roles.forEach(r => {
      const label = (r === 'gato') ? 'shogun' : r;
      const cls = r === 'gato' ? 'badge role-shogun' : (r === 'sensei' ? 'badge role-sensei' : (r === 'shinobi' ? 'badge role-shinobi' : 'badge role-genin'));
      badges.appendChild(createEl('span', { className: cls, text: label }));
    });
    c.appendChild(badges);
  }
  if (!classesLink && isInstructor) {
    const link = document.createElement('a');
    link.href = '/clases';
    link.textContent = 'Clases';
    link.setAttribute('data-id', 'nav-classes');
    nav.appendChild(link);
  } else if (classesLink && !isInstructor) {
    classesLink.remove();
  }
  const r1 = createEl('div', { className: 'form-row' });
  r1.append(createEl('label', { text: 'Nombre' }));
  const iName = createEl('input', { attrs: { type: 'text', value: prof.name || '' } });
  r1.appendChild(iName);
  const r2 = createEl('div', { className: 'form-row' });
  r2.append(createEl('label', { text: 'Usuario' }));
  const iUser = createEl('input', { attrs: { type: 'text', value: prof.username || me.username, disabled: '' } });
  r2.appendChild(iUser);
  const r3 = createEl('div', { className: 'form-row' });
  r3.append(createEl('label', { text: 'Correo' }));
  const iEmail = createEl('input', { attrs: { type: 'email', value: prof.email || '' } });
  r3.appendChild(iEmail);
  const r4 = createEl('div', { className: 'form-row' });
  r4.append(createEl('label', { text: 'Celular' }));
  const iPhone = createEl('input', { attrs: { type: 'tel', value: prof.phone || '' } });
  r4.appendChild(iPhone);
  const actions = createEl('div', { className: 'form-actions' });
  const save = createEl('button', { className: 'btn btn-primary', text: 'Guardar' });
  actions.appendChild(save);
  form.append(r1, r2, r3, r4, actions);
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); save.disabled = true;
    try {
      const res = await fetch('/api/user/profile', { method: 'PUT', headers: { 'content-type': 'application/json', 'accept': 'application/json' }, credentials: 'include', body: JSON.stringify({ name: iName.value, email: iEmail.value, phone: iPhone.value }) });
      if (!res.ok) { let msg = 'No se pudo iniciar sesion'; try { const ct = (res.headers.get('content-type') || '').toLowerCase(); const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text()); msg = err?.error || err?.message || msg; } catch {} throw new Error(msg); }
      showModal('Perfil actualizado', { title: 'Listo' });
      updateAuthNav();
    } catch (err) {
      showModal(err.message || 'Error al guardar', { title: 'Error' });
    } finally { save.disabled = false; }
  });

  const left = createEl('div');
  left.append(avatar, upBtn, avatarInput);
  row.append(left, form);
  card.appendChild(row);
  c.appendChild(card);
  wrap.appendChild(c);
  return wrap;
}
// Signup page
async function SignupPage() {
  const wrap = createEl('section', { className: 'section page', attrs: { id: 'signup' } });
  const c = createEl('div', { className: 'container' });
  const card = createEl('div', { className: 'card login-card' });
  const brand = createEl('div', { className: 'brand login-brand' });
  const logo = createEl('img', { className: 'logo', attrs: { src: '/assets/material/logo.webp', alt: 'codeRonin' } });
  const title = createEl('h2', { className: 'section-title', text: 'Crear cuenta' });
  const brandText = createEl('span', { className: 'brand-text', text: 'codeRonin' });
  brand.append(logo, brandText);
  card.append(brand, title);

  const form = createEl('form', { className: 'login-form', attrs: { autocomplete: 'off' } });
  const fgNombre = createEl('div', { className: 'form-group' });
  const iNombre = createEl('input', { attrs: { type: 'text', name: 'nombre', placeholder: 'Nombre', required: '' } });
  fgNombre.appendChild(iNombre);
  const fgUsuario = createEl('div', { className: 'form-group' });
  const iUsuario = createEl('input', { attrs: { type: 'text', name: 'usuario', placeholder: 'Usuario', required: '', pattern: '^[a-zA-Z0-9._-]{3,32}$' } });
  fgUsuario.appendChild(iUsuario);
  const fgCorreo = createEl('div', { className: 'form-group' });
  const iCorreo = createEl('input', { attrs: { type: 'email', name: 'correo', placeholder: 'Correo', required: '' } });
  fgCorreo.appendChild(iCorreo);
  const fgCel = createEl('div', { className: 'form-group' });
  const iCel = createEl('input', { attrs: { type: 'tel', name: 'celular', placeholder: 'Celular', required: '' } });
  fgCel.appendChild(iCel);
  const fgPass = createEl('div', { className: 'form-group' });
  const iPass = createEl('input', { attrs: { type: 'password', name: 'password', placeholder: 'ContraseAa (8+, mayAoscula y sAmbolo)', required: '', minlength: '8' } });
  fgPass.appendChild(iPass);
  const fgPass2 = createEl('div', { className: 'form-group' });
  const iPass2 = createEl('input', { attrs: { type: 'password', name: 'password2', placeholder: 'Repetir contraseAa', required: '', minlength: '8' } });
  fgPass2.appendChild(iPass2);
  const hint = createEl('div', { className: 'muted', text: 'Debe contener al menos 8 caracteres, una mayAoscula y un sAmbolo.' });

  const actions = createEl('div', { className: 'form-actions' });
  const btn = createEl('button', { className: 'btn btn-accent', text: 'Crear cuenta' });
  actions.appendChild(btn);
  const linkRow = createEl('div', { className: 'muted' });
  const linkLogin = createEl('a', { text: 'Ya tengo cuenta', attrs: { href: '/login' } });
  linkRow.appendChild(linkLogin);
  form.append(fgNombre, fgUsuario, fgCorreo, fgCel, fgPass, fgPass2, hint, actions, linkRow);
  card.appendChild(form);

  function strong(p) { return /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/.test(p || ''); }
  function hasBanned(u) {
    const banned = ['admin','root','system','sys','support','help','seguridad','security','password','pass','coderonin','owner','god','sudo','puta','puto','mierda','verga','pene','vagina','culo','zorra','perra','chingar','joder','coAo','cabrA3n','fuck','shit','bitch','ass','dick','pussy','porn','xxx'];
    const s = String(u || '').toLowerCase();
    return banned.some(w => s.includes(w));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    try {
      const payload = {
        nombre: iNombre.value.trim(),
        usuario: iUsuario.value.trim(),
        correo: iCorreo.value.trim(),
        celular: iCel.value.trim(),
        password: iPass.value,
        password2: iPass2.value,
      };
      if (!payload.nombre || !payload.usuario || !payload.correo || !payload.celular || !payload.password || !payload.password2) {
        throw new Error('Completa todos los campos');
      }
      if (!/^[a-zA-Z0-9._-]{3,32}$/.test(payload.usuario) || hasBanned(payload.usuario)) {
        throw new Error('Usuario invA!lido o no permitido');
      }
      if (!/^\S+@\S+\.\S+$/.test(payload.correo)) {
        throw new Error('Correo invA!lido');
      }
      if (payload.password !== payload.password2) {
        throw new Error('Las contraseAas no coinciden');
      }
      if (!strong(payload.password)) {
        throw new Error('La contraseAa debe tener 8+, una mayAoscula y un sAmbolo');
      }
      const res = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'content-type': 'application/json', 'accept': 'application/json' }, credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        let msg = 'No se pudo registrar';
        try { const j = await res.json(); if (j && j.error) msg = j.error; } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      setToken(data.token || '');
      if (data?.user?.role === 'admin') navigate('/admin'); else navigate('/');
      showModal('Cuenta creada con Axito', { title: 'Bienvenido' });
    } catch (err) {
      showModal(err.message || 'Error al registrar', { title: 'Error' });
    } finally {
      btn.disabled = false;
    }
  });

  c.appendChild(card);
  wrap.appendChild(c);
  return wrap;
}
// Admin page (visor protegido)
async function AdminPage() {
  const wrap = createEl('section', { className: 'section page', attrs: { id: 'admin' } });
  const c = createEl('div', { className: 'container admin-container' });
  c.appendChild(createEl('h2', { className: 'section-title', text: 'Panel Admin' }));

  const token = getToken();
  let me = null;
  if (token) me = await getJSON('/api/auth/me', null);
  if (!me || !Array.isArray(me.roles) || !me.roles.includes('gato')) { navigate('/login', { replace: true }); return wrap; }

  // Logged in: visor
  const top = createEl('div', { className: 'badge-row' });
  top.appendChild(createEl('span', { className: 'badge', text: `Usuario: ${me.username}` }));
  const logout = createEl('button', { className: 'btn', text: 'Salir' });
  logout.addEventListener('click', async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
    setToken('');
    navigate('/admin');
  });
  top.appendChild(logout);
  c.appendChild(top);

  const tabs = createEl('div', { className: 'admin-tabs' });
  const tabDash = createEl('button', { className: 'btn active', text: 'Dashboard' });
  const tabSolic = createEl('button', { className: 'btn', text: 'Solicitudes' });
  const tabMods = createEl('button', { className: 'btn', text: 'Modulos' });
  const tabUsers = createEl('button', { className: 'btn', text: 'Usuarios' });
  tabs.append(tabDash, tabSolic, tabMods, tabUsers);
  c.appendChild(tabs);

  const split = createEl('div', { className: 'admin-split' });
  split.style.setProperty('--left', '320px');
  const leftPane = createEl('div', { className: 'admin-pane left' });
  const handle = createEl('div', { className: 'split-handle', attrs: { role: 'separator', 'aria-orientation': 'vertical' } });
  const rightPane = createEl('div', { className: 'admin-pane' });
  split.append(leftPane, handle, rightPane);
  c.appendChild(split);

  // Draggable handle
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const start = parseInt(getComputedStyle(split).getPropertyValue('--left')) || 320;
    const onMove = (ev) => {
      const dx = ev.clientX - startX; let w = start + dx; w = Math.max(200, Math.min(w, 600));
      split.style.setProperty('--left', w + 'px');
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
  });

  // Solicitudes table utilities
  const tableWrap = createEl('div', { className: 'table-wrap' });
  const table = createEl('table', { className: 'table' });
  tableWrap.appendChild(table);
  const tools = createEl('div', { className: 'admin-toolbar' });
  const dlBtn = createEl('button', { className: 'btn', text: 'Descargar CSV' });
  tools.appendChild(dlBtn);

  async function downloadCsv(url, filename) {
    const token = getToken();
    const res = await fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {}, credentials: 'include' });
    if (!res.ok) { showModal('No se pudo descargar CSV', { title: 'Error' }); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  }

  function renderRows(items, type) {
    table.innerHTML = '';
    const thead = createEl('thead');
    const trh = createEl('tr');
    const cols = type === 'course'
      ? ['fecha','nombre','email','empresa','interes','modalidad','mensaje','ip']
      : ['fecha','nombre','email','empresa','categoria','interes','tipo','alcance','ventanas','restricciones','contacto','ip'];
    cols.forEach(h => trh.appendChild(createEl('th', { text: h })));
    thead.appendChild(trh);
    const tbody = createEl('tbody');
    (items || []).forEach(r => {
      const tr = createEl('tr');
      const vals = type === 'course'
        ? [r.createdAt, r.nombre, r.email, r.empresa, r.interes, r.modalidad, r.mensaje, r.ip]
        : [r.createdAt, r.nombre, r.email, r.empresa, r.categoria, r.interes, r.tipo, r.alcance, r.ventanas, r.restricciones, r.contacto, r.ip];
      vals.forEach(v => tr.appendChild(createEl('td', { text: v || '' })));
      tbody.appendChild(tr);
    });
    table.append(thead, tbody);
  }

  async function load(type) {
    const url = type === 'course' ? '/api/forms/course' : '/api/forms/mission';
    const data = await getJSON(url, []);
    renderRows(data, type);
    dlBtn.onclick = () => downloadCsv(`${type === 'course' ? '/api/forms/course.csv' : '/api/forms/mission.csv'}`, `${type}_inquiries.csv`);
  }

  function setTab(btn) {
    [tabDash, tabSolic, tabMods, tabUsers].forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  // Dashboard tab
  async function showDashboard() {
    setTab(tabDash);
    leftPane.innerHTML = '';
    rightPane.innerHTML = '';
    const stats = await getJSON('/api/admin/stats', { coursesCount: 0, missionsCount: 0, usersCount: 0 });
    const grid = createEl('div', { className: 'stat-grid' });
    const cards = [
      { label: 'Form. Cursos', value: stats.coursesCount },
      { label: 'Form. Misiones', value: stats.missionsCount },
      { label: 'Usuarios', value: stats.usersCount },
    ];
    cards.forEach(s => {
      const el = createEl('div', { className: 'stat' });
      el.append(createEl('div', { className: 'label', text: s.label }), createEl('div', { className: 'value', text: String(s.value) }));
      grid.appendChild(el);
    });
    rightPane.appendChild(grid);
  }

  // Solicitudes tab
  async function showSolicitudes() {
    setTab(tabSolic);
    leftPane.innerHTML = '';
    rightPane.innerHTML = '';
    leftPane.append(createEl('h3', { text: 'Solicitudes' }), createEl('p', { className: 'muted', text: 'Filtra y descarga CSV.' }));
    const kindRow = createEl('div', { className: 'admin-toolbar' });
    const btnC = createEl('button', { className: 'btn', text: 'Cursos' });
    const btnM = createEl('button', { className: 'btn', text: 'Misiones' });
    kindRow.append(btnC, btnM);
    leftPane.append(kindRow, tools);
    rightPane.append(tableWrap);
    let current = 'course';
    btnC.classList.add('active');
    await load(current);
    btnC.addEventListener('click', async () => { current = 'course'; btnC.classList.add('active'); btnM.classList.remove('active'); await load('course'); });
    btnM.addEventListener('click', async () => { current = 'mission'; btnM.classList.add('active'); btnC.classList.remove('active'); await load('mission'); });
  }

  // Modules tab
  async function showModules() {
    setTab(tabMods);
    leftPane.innerHTML = '';
    rightPane.innerHTML = '';
    leftPane.append(createEl('h3', { text: 'Modulos' }), createEl('p', { className: 'muted', text: 'Sube videos o define URL.' }));
    const form = createEl('form', { className: 'cr-form' });
    const r1 = createEl('div', { className: 'form-row' }); r1.append(createEl('label', { text: 'Titulo' })); const iTitle = createEl('input', { attrs: { type: 'text', required: '' } }); r1.appendChild(iTitle);
    const r2 = createEl('div', { className: 'form-row' }); r2.append(createEl('label', { text: 'Descripcion' })); const iDesc = createEl('input', { attrs: { type: 'text' } }); r2.appendChild(iDesc);
    const r3 = createEl('div', { className: 'form-row' }); r3.append(createEl('label', { text: 'Orden' })); const iOrder = createEl('input', { attrs: { type: 'number', value: '0' } }); r3.appendChild(iOrder);
    const r4 = createEl('div', { className: 'form-row' }); r4.append(createEl('label', { text: 'Video (archivo)' })); const iFile = createEl('input', { attrs: { type: 'file', accept: 'video/*' } }); r4.appendChild(iFile);
    const r5 = createEl('div', { className: 'form-row' }); r5.append(createEl('label', { text: 'o URL de video' })); const iUrl = createEl('input', { attrs: { type: 'url', placeholder: 'https://...' } }); r5.appendChild(iUrl);
    const actions = createEl('div', { className: 'form-actions' }); const save = createEl('button', { className: 'btn btn-primary', text: 'Agregar' }); actions.appendChild(save);
    form.append(r1,r2,r3,r4,r5,actions);
    leftPane.appendChild(form);
    const modWrap = createEl('div', { className: 'table-wrap' }); const modTable = createEl('table', { className: 'table' }); modWrap.appendChild(modTable);
    rightPane.appendChild(modWrap);

    async function listModules() {
      const items = await getJSON('/api/admin/courses/modules', []);
      modTable.innerHTML = '';
      const thead = createEl('thead'); const trh = createEl('tr'); ['orden','titulo','video','acciones'].forEach(h=> trh.appendChild(createEl('th',{text:h}))); thead.appendChild(trh);
      const tbody = createEl('tbody');
      (items||[]).forEach(m => {
        const tr = createEl('tr');
        tr.append(createEl('td',{ text: String(m.order||0) }), createEl('td',{ text: m.title||'' }), createEl('td',{ children: [ createEl('a',{ text: 'ver', attrs: { href: m.videoUrl||'#', target: '_blank', rel: 'noopener noreferrer' } }) ] }));
        const tdAct = createEl('td');
        const del = createEl('button', { className: 'btn', text: 'Eliminar' });
        del.addEventListener('click', async () => {
          if (!confirm('Eliminar modulo?')) return;
          const token = getToken();
          await fetch(`/api/admin/courses/modules/${encodeURIComponent(m.id)}`, { method: 'DELETE', headers: token ? { authorization: `Bearer ${token}` } : {} });
          await listModules();
        });
        tdAct.appendChild(del);
        tr.appendChild(tdAct);
        tbody.appendChild(tr);
      });
      modTable.append(thead, tbody);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault(); save.disabled = true;
      try {
        let videoUrl = iUrl.value.trim();
        if (!videoUrl && iFile.files && iFile.files[0]) {
          const fd = new FormData(); fd.append('file', iFile.files[0]);
          const token = getToken();
          const up = await fetch('/api/admin/upload/video', { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: fd });
          if (!up.ok) throw new Error('No se pudo subir');
          const uj = await up.json(); videoUrl = uj.url;
        }
        const token = getToken();
        const headers = { 'content-type': 'application/json' };
        if (token) headers['authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/admin/courses/modules', { method: 'POST', headers, body: JSON.stringify({ title: iTitle.value, description: iDesc.value, order: iOrder.value, videoUrl }) });
        if (!res.ok) throw new Error('No se pudo crear');
        iTitle.value=''; iDesc.value=''; iOrder.value='0'; iFile.value=''; iUrl.value='';
        await listModules();
      } catch (err) { showModal(err.message||'Error', { title: 'Error' }); }
      finally { save.disabled = false; }
    });

    await listModules();
  }

  // Users tab
  async function showUsers() {
    setTab(tabUsers);
    leftPane.innerHTML = '';
    rightPane.innerHTML = '';
    leftPane.append(createEl('h3', { text: 'Usuarios' }), createEl('p', { className: 'muted', text: 'Gestiona roles y estado.' }));
    const uWrap = createEl('div', { className: 'table-wrap' }); const uTable = createEl('table', { className: 'table users-table' }); uWrap.appendChild(uTable);
    rightPane.appendChild(uWrap);
    const users = await getJSON('/api/admin/users', []);
    const thead = createEl('thead'); const trh = createEl('tr'); ['usuario','roles','activo','creado'].forEach(h => trh.appendChild(createEl('th',{text:h}))); thead.appendChild(trh);
    const tbody = createEl('tbody');
    (users||[]).forEach(u => {
      const tr = createEl('tr');
      tr.appendChild(createEl('td', { text: u.username }));
      const tdRole = createEl('td');
      const roleKeys = ['genin','shinobi','gato'];
      const roleLabels = { genin: 'genin', shinobi: 'shinobi', gato: 'sensei' };
      const current = Array.isArray(u.roles) ? new Set(u.roles) : new Set();
      roleKeys.forEach(rk => {
        const label = document.createElement('label');
        label.style.marginRight = '8px';
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = current.has(rk);
        cb.addEventListener('change', async () => {
          try {
            const roles = roleKeys.filter(k => (k===rk ? cb.checked : current.has(k)));
            const token = getToken(); const headers = { 'content-type': 'application/json' }; if (token) headers['authorization'] = `Bearer ${token}`;
            const res = await fetch(`/api/admin/users/${u._id}/roles`, { method: 'PUT', headers, body: JSON.stringify({ roles }) });
            if (res.ok) { const j = await res.json(); current.clear(); (j.roles||[]).forEach(x=>current.add(x)); }
          } catch {}
        });
        label.append(cb, document.createTextNode(' '+roleLabels[rk]));
        tdRole.appendChild(label);
      });
      tr.appendChild(tdRole);
      const tdAct = createEl('td'); const btnT = createEl('button', { className: 'btn', text: u.active ? 'Desactivar' : 'Activar' });
      btnT.addEventListener('click', async () => { const token = getToken(); const r = await fetch(`/api/admin/users/${u._id}/toggle-active`, { method: 'PUT', headers: token ? { authorization: `Bearer ${token}` } : {} }); const j = await r.json(); btnT.textContent = (j.active ? 'Desactivar' : 'Activar'); });
      tdAct.appendChild(btnT); tr.appendChild(tdAct);
      tr.appendChild(createEl('td', { text: (u.createdAt || '').split('T')[0] }));
      tbody.appendChild(tr);
    });
    uTable.append(thead, tbody);
  }

  // initial
  await showDashboard();
  tabDash.addEventListener('click', showDashboard);
  tabSolic.addEventListener('click', showSolicitudes);
  tabMods.addEventListener('click', showModules);
  tabUsers.addEventListener('click', showUsers);

  wrap.appendChild(c);
  return wrap;
}

// Instructor page (full page for uploading modules)
async function InstructorPage() {
  const wrap = createEl('section', { className: 'section page', attrs: { id: 'clases' } });
  const c = createEl('div', { className: 'container admin-container' });
  c.appendChild(createEl('h2', { className: 'section-title', text: 'Clases y Módulos' }));

  const me = await getJSON('/api/auth/me', null);
  if (!me || !Array.isArray(me.roles) || !(me.roles.includes('gato') || me.roles.includes('sensei'))) {
    navigate('/login', { replace: true });
    return wrap;
  }

  // Load courses from Dojo (API)
  const courses = await getJSON('/api/courses.json', []);
  const top = createEl('div', { className: 'admin-toolbar' });
  const selCourse = document.createElement('select');
  const opt0 = document.createElement('option'); opt0.value=''; opt0.textContent='Selecciona un curso'; selCourse.appendChild(opt0);
  (courses || []).forEach(cs => { const o = document.createElement('option'); o.value = cs.title || cs.name || ''; o.textContent = cs.title || cs.name || ''; selCourse.appendChild(o); });
  top.appendChild(selCourse);
  c.appendChild(top);

  const grid = createEl('div', { className: 'admin-split' }); grid.style.setProperty('--left', '360px');
  const left = createEl('div', { className: 'admin-pane left' });
  const handle = createEl('div', { className: 'split-handle', attrs: { role: 'separator', 'aria-orientation': 'vertical' } });
  const right = createEl('div', { className: 'admin-pane' });
  grid.append(left, handle, right);
  c.appendChild(grid);

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const start = parseInt(getComputedStyle(grid).getPropertyValue('--left')) || 360;
    const onMove = (ev) => { const dx = ev.clientX - startX; let w = start + dx; w = Math.max(240, Math.min(w, 640)); grid.style.setProperty('--left', w + 'px'); };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
  });

  // Left: form to add module
  left.append(createEl('h3', { text: 'Agregar módulo' }), createEl('p', { className: 'muted', text: 'Sube un video o define una URL y asigna el curso.' }));
  const form = createEl('form', { className: 'cr-form' });
  const fr1 = createEl('div', { className: 'form-row' }); fr1.append(createEl('label', { text: 'Título' })); const iTitle = createEl('input', { attrs: { type: 'text', required: '' } }); fr1.appendChild(iTitle);
  const fr2 = createEl('div', { className: 'form-row' }); fr2.append(createEl('label', { text: 'Descripción' })); const iDesc = createEl('input', { attrs: { type: 'text' } }); fr2.appendChild(iDesc);
  const fr3 = createEl('div', { className: 'form-row' }); fr3.append(createEl('label', { text: 'Orden' })); const iOrder = createEl('input', { attrs: { type: 'number', value: '0' } }); fr3.appendChild(iOrder);
  const fr4 = createEl('div', { className: 'form-row' }); fr4.append(createEl('label', { text: 'Video (archivo)' })); const iFile = createEl('input', { attrs: { type: 'file', accept: 'video/*' } }); fr4.appendChild(iFile);
  const fr5 = createEl('div', { className: 'form-row' }); fr5.append(createEl('label', { text: 'o URL de video' })); const iUrl = createEl('input', { attrs: { type: 'url', placeholder: 'https://...' } }); fr5.appendChild(iUrl);
  const frA = createEl('div', { className: 'form-actions' }); const btnAdd = createEl('button', { className: 'btn btn-primary', text: 'Agregar' }); frA.appendChild(btnAdd);
  form.append(fr1, fr2, fr3, fr4, fr5, frA);
  left.appendChild(form);

  // Right: list of modules
  const tableWrap = createEl('div', { className: 'table-wrap' }); const table = createEl('table', { className: 'table' }); tableWrap.appendChild(table);
  right.appendChild(tableWrap);

  async function listModules(course) {
    table.innerHTML = '';
    if (!course) return;
    const items = await getJSON(`/api/instructor/courses/modules?course=${encodeURIComponent(course)}`, []);
    const thead = createEl('thead'); const trh = createEl('tr'); ['orden','titulo','video','acciones'].forEach(h=> trh.appendChild(createEl('th',{text:h}))); thead.appendChild(trh);
    const tbody = createEl('tbody');
    (items||[]).forEach(m => {
      const tr = createEl('tr');
      tr.append(createEl('td',{ text: String(m.order||0) }), createEl('td',{ text: m.title||'' }), createEl('td',{ children: [ createEl('a',{ text: 'ver', attrs: { href: m.videoUrl||'#', target: '_blank', rel: 'noopener noreferrer' } }) ] }));
      const tdAct = createEl('td');
      const del = createEl('button', { className: 'btn', text: 'Eliminar' });
      del.addEventListener('click', async () => {
        if (!confirm('Eliminar módulo?')) return;
        const token = getToken();
        await fetch(`/api/instructor/courses/modules/${encodeURIComponent(m.id)}`, { method: 'DELETE', headers: token ? { authorization: `Bearer ${token}` } : {} });
        await listModules(course);
      });
      tdAct.appendChild(del);
      tr.appendChild(tdAct);
      tbody.appendChild(tr);
    });
    table.append(thead, tbody);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); btnAdd.disabled = true;
    try {
      const course = selCourse.value || '';
      if (!course) throw new Error('Selecciona un curso');
      let videoUrl = iUrl.value.trim();
      if (!videoUrl && iFile.files && iFile.files[0]) {
        const fd = new FormData(); fd.append('file', iFile.files[0]);
        const token = getToken();
        const up = await fetch('/api/instructor/upload/video', { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: fd });
        if (!up.ok) throw new Error('No se pudo subir');
        const uj = await up.json(); videoUrl = uj.url;
      }
      const token = getToken(); const headers = { 'content-type': 'application/json' }; if (token) headers['authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/instructor/courses/modules', { method: 'POST', headers, body: JSON.stringify({ title: iTitle.value, description: iDesc.value, order: iOrder.value, videoUrl, course }) });
      if (!res.ok) throw new Error('No se pudo crear');
      iTitle.value=''; iDesc.value=''; iOrder.value='0'; iFile.value=''; iUrl.value='';
      await listModules(course);
    } catch (err) { showModal(err.message||'Error', { title: 'Error' }); }
    finally { btnAdd.disabled = false; }
  });

  selCourse.addEventListener('change', async () => { await listModules(selCourse.value || ''); });

  wrap.appendChild(c);
  return wrap;
}




