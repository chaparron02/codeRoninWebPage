import { createEl, getJSON } from '../lib/core.js';
import { EmbedInstagram, EmbedTikTok } from '../lib/components.js';

export async function HomePage() {
  const main = createEl('main', { className: 'home-vortex' });

  const hero = buildHero();
  main.appendChild(hero.section);

  const latest = await loadLatestHighlights();
  main.appendChild(buildSignalDeck(latest));
  main.appendChild(buildSwitchboard());
  const consoleBlock = buildTelemetryConsole();
  main.appendChild(consoleBlock.section);
  main.appendChild(await buildMediaWall());
  main.appendChild(buildCallToAction());

  animateStats(hero.counters);
  cycleDeck();
  startConsoleStream(consoleBlock.feed);
  setupScrollLinks(consoleBlock.anchor);

  return main;
}

function buildHero() {
  const section = createEl('section', { className: 'hero-vortex pane' });
  section.appendChild(heroVideo());
  section.appendChild(createEl('div', { className: 'hero-overlay', ariaHidden: 'true' }));

  const copy = createEl('div', { className: 'hero-copy' });
  copy.appendChild(createEl('p', { className: 'hero-tag', text: 'canal seguro // protocolo ronin // modo sigilo' }));
  copy.appendChild(createEl('h1', { text: 'Misiones ofensivas, labs descargables, conferencias y capacitaciones con evidencia audiovisual.' }));
  copy.appendChild(createEl('p', { className: 'hero-subtext', text: 'Somos un dojo independiente en Colombia. Combinamos hacking ético, documentación y sesiones de entrenamiento para convencer a dirección y a equipos técnicos sin slides eternos.' }));

  const counters = [
    { label: 'misiones ejecutadas', target: 128 },
    { label: 'playbooks armeria', target: 48 },
    { label: 'labs ofensivos', target: 37 },
  ];
  const grid = createEl('div', { className: 'hero-counters' });
  counters.forEach(entry => {
    const card = createEl('div', { className: 'counter-card' });
    const value = createEl('span', { className: 'counter-value', text: '0', attrs: { 'data-target': entry.target } });
    entry.el = value;
    card.append(value, createEl('span', { className: 'counter-label', text: entry.label }));
    grid.appendChild(card);
  });
  copy.appendChild(grid);

  const actions = createEl('div', { className: 'hero-actions' });
  actions.append(
    createEl('a', { className: 'btn hero-primary', text: 'Activar misión', attrs: { href: '/form-mision' } }),
    createEl('a', { className: 'btn hero-ghost', text: 'Entrar al Dojo', attrs: { href: '/dojo' } }),
    createEl('button', { className: 'btn hero-ghost', text: 'Ver telemetria', attrs: { type: 'button', 'data-scroll': 'telemetry-console' } }),
  );
  copy.appendChild(actions);

  const holo = createEl('div', { className: 'hero-holo' });
  holo.appendChild(createEl('span', { className: 'badge', text: 'telemetria en vivo' }));
  holo.appendChild(createEl('p', { className: 'muted', text: 'Rastreamos exposicion, ejecutamos ataques controlados y documentamos con video, audio y dashboards listos para el board.' }));
  holo.appendChild(createEl('img', { attrs: { src: '/assets/material/ninja1.webp', alt: 'Overlay', loading: 'lazy' } }));

  section.append(copy, holo);
  return { section, counters };
}

function heroVideo() {
  const video = createEl('video', {
    className: 'hero-bg',
    attrs: {
      autoplay: '',
      muted: '',
      loop: '',
      playsinline: '',
      poster: '/assets/material/ninja3.webp'
    }
  });
  video.appendChild(createEl('source', { attrs: { src: '/assets/material/hero-loop.mp4', type: 'video/mp4' } }));
  return video;
}

function buildSignalDeck(items) {
  const section = createEl('section', { className: 'pane signal-pane' });
  section.appendChild(createEl('h2', { text: 'Intel en caliente' }));
  section.appendChild(createEl('p', { className: 'muted', text: 'Cursos, herramientas y misiones que acabamos de liberar esta semana.' }));

  const deck = createEl('div', { className: 'signal-deck', attrs: { 'data-cycle': 'deck' } });
  items.forEach((item, idx) => {
    const card = createEl('article', { className: 'signal-card', attrs: { 'data-index': String(idx) } });
    if (item.image) {
      card.style.setProperty('--cover', `url(${item.image})`);
      card.classList.add('has-cover');
    }
    card.appendChild(createEl('span', { className: 'signal-tag', text: item.tags?.[0] || 'update' }));
    card.appendChild(createEl('h3', { text: item.title }));
    card.appendChild(createEl('p', { className: 'muted', text: item.text }));
    if (item.action) {
      card.appendChild(createEl('a', {
        className: 'link-pill',
        text: item.action.label,
        attrs: { href: item.action.href, ...(item.action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {}) },
      }));
    }
    deck.appendChild(card);
  });
  section.appendChild(deck);
  return section;
}

function buildSwitchboard() {
  const section = createEl('section', { className: 'pane matrix-pane' });
  section.appendChild(createEl('h2', { text: 'Switchboard ronin' }));
  section.appendChild(createEl('p', { className: 'muted', text: 'Activa misiones, Dojo o Armería para desbloquear entregables visuales y evidencia accionable.' }));

  const config = {
    misiones: {
      title: 'Misiones',
      bullets: [
        'Ataques controlados Red / Blue / Social.',
        'Briefings holo con video y audio cifrado.',
        'Asistencia en vivo para Daimyo y Shinobi.',
      ],
      action: { label: 'Solicitar misión', href: '/form-mision' },
    },
    dojo: {
      title: 'Dojo',
      bullets: [
        'Labs descargables con correcciones en vivo.',
        'Lives privados, comunidad y proyectos capstone.',
        'Reportes con métricas para RR. HH. y Tech Leads.',
      ],
      action: { label: 'Explorar Dojo', href: '/dojo' },
    },
    armeria: {
      title: 'Armería',
      bullets: [
        'Playbooks, scripts OSINT y plantillas narrativas.',
        'Contenido multimedia para awareness corporativo.',
        'Integraciones con tus repositorios internos.',
      ],
      action: { label: 'Entrar a Armería', href: '/armeria' },
    },
  };

  const grid = createEl('div', { className: 'matrix-grid' });
  const tabs = createEl('div', { className: 'matrix-tabs' });
  const display = createEl('div', { className: 'matrix-display' });

  const render = (key) => {
    const data = config[key];
    display.innerHTML = '';
    display.appendChild(createEl('h3', { text: data.title }));
    const list = createEl('ul', { className: 'matrix-list' });
    data.bullets.forEach(item => list.appendChild(createEl('li', { text: item })));
    display.appendChild(list);
    display.appendChild(createEl('a', { className: 'btn hero-primary', text: data.action.label, attrs: { href: data.action.href } }));
  };

  Object.keys(config).forEach((key, idx) => {
    const tab = createEl('button', { className: `matrix-tab${idx === 0 ? ' active' : ''}`, text: config[key].title, attrs: { type: 'button' } });
    tab.addEventListener('click', () => {
      tabs.querySelectorAll('.matrix-tab').forEach(btn => btn.classList.remove('active'));
      tab.classList.add('active');
      render(key);
    });
    tabs.appendChild(tab);
  });
  render('misiones');

  grid.append(tabs, display);
  section.appendChild(grid);
  return section;
}

function buildTelemetryConsole() {
  const section = createEl('section', { className: 'pane console-pane', attrs: { id: 'telemetry-console' } });
  section.appendChild(createEl('h2', { text: 'Telemetria ronin' }));
  section.appendChild(createEl('p', { className: 'muted', text: 'Feed en vivo de hallazgos, capacitaciones y señales de riesgo.' }));
  const feed = createEl('div', { className: 'console-feed' });
  section.appendChild(feed);
  return { section, feed, anchor: section };
}

async function buildMediaWall() {
  const section = createEl('section', { className: 'pane media-pane' });
  section.appendChild(createEl('h2', { text: 'Contenido vivo' }));
  section.appendChild(createEl('p', { className: 'muted', text: 'Clips, lives y retos que usamos para educar sin filtros.' }));
  const grid = createEl('div', { className: 'media-grid' });
  try { grid.appendChild(EmbedInstagram('https://www.instagram.com/code_ronin/embed')); } catch {}
  try { grid.appendChild(EmbedTikTok('@code.ronin')); } catch {}
  section.appendChild(grid);
  return section;
}

function buildCallToAction() {
  const section = createEl('section', { className: 'pane cta-pane' });
  section.appendChild(createEl('h2', { text: '¿Listo para la siguiente misión?' }));
  section.appendChild(createEl('p', { className: 'muted', text: 'Deja que nos encarguemos de la ofensiva, la narrativa y la capacitación.' }));
  const actions = createEl('div', { className: 'hero-actions' });
  actions.append(
    createEl('a', { className: 'btn hero-primary', text: 'Diseñar misión', attrs: { href: '/form-mision' } }),
    createEl('a', { className: 'btn hero-ghost', text: 'Solicitar demo Dojo', attrs: { href: '/formulario' } }),
  );
  section.appendChild(actions);
  return section;
}

function animateStats(counters) {
  counters.forEach(entry => {
    const target = Number(entry.el.getAttribute('data-target'));
    let current = 0;
    const tick = () => {
      current += Math.max(1, Math.round(target / 60));
      if (current >= target) {
        entry.el.textContent = `${target}+`;
        return;
      }
      entry.el.textContent = `${current}`;
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function cycleDeck() {
  const deck = document.querySelector('[data-cycle="deck"]');
  if (!deck) return;
  const cards = Array.from(deck.children);
  if (!cards.length) return;
  let index = 0;
  cards[0].classList.add('active');
  setInterval(() => {
    cards[index].classList.remove('active');
    index = (index + 1) % cards.length;
    cards[index].classList.add('active');
  }, 4000);
}

function startConsoleStream(feed) {
  if (!feed) return;
  const lines = [
    '🔐 [SIGMA-Δ] Intrusión controlada en fintech LATAM › briefing holo cifrado AES-256 entregado al board.',
    '🎓 [CTRL-ACADEMIA] Ruta Zero Trust Live ZTR-17 con demos inmersivas, badge NFT y reporte firmado PGP.',
    '🛰 [ORION-42] 56 credenciales expuestas en proveedor logística › entregamos mapa térmico + script de respuesta.',
    '🎥 [//CONFERENCIAS] Panel “Ransomware sin FUD” para sector salud con QA holográfico y métricas en vivo.',
    '🛡 [ARMERÍA] Playbook “Phishing cinematic” ahora incluye audio narrado y plantillas interactivas 4K.',
    '🚨 [MISIÓN DMY-α34] Brief en VR + PDF con clave de un solo uso desplegado en 2 horas.',
    '🛰 [RECON GAMMA] Scanner ORION detecta 42 leaks en logística; parche, video 4K y plan de comunicación listos.',
    '🎤 [CAPACITACIONES] Zero Trust & Storytelling en empresa CN-γ52 con cifrado perimetral y encuesta en tiempo real.',
  ];
  let pointer = 0;
  const renderLine = () => {
    const line = createEl('div', { className: 'console-line' });
    const text = lines[pointer % lines.length];
    pointer += 1;
    feed.prepend(line);
    type(line, text);
    const rows = feed.querySelectorAll('.console-line');
    if (rows.length > 6) rows[rows.length - 1].remove();
  };
  const type = (node, text, idx = 0) => {
    if (idx > text.length) {
      node.textContent = text;
      return;
    }
    node.textContent = `${text.slice(0, idx)}${idx < text.length ? '|' : ''}`;
    setTimeout(() => type(node, text, idx + 1), 18);
  };
  renderLine();
  setInterval(renderLine, 3600);
}

function setupScrollLinks(target) {
  document.querySelectorAll('[data-scroll="telemetry-console"]').forEach(btn => {
    btn.addEventListener('click', () => target?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  });
}

async function loadLatestHighlights() {
  const [courses, tools, missionsRaw] = await Promise.all([
    getJSON('/api/courses.json', []),
    getJSON('/api/tools.json', []),
    getJSON('/api/missions.json', null),
  ]);

  const latestCourse = (Array.isArray(courses) && courses.find(c => c.link)) || courses?.[0] || {
    title: 'Curso de Pentesting',
    description: 'Ruta práctica de ofensiva web.',
    image: '/assets/material/ninja3.webp',
    link: '/dojo',
  };

  const activeTools = Array.isArray(tools) ? tools.filter(t => t.link) : [];
  const latestTool = activeTools[0] || tools?.[0] || {
    title: 'Ronin Toolkit',
    description: 'Scripts y plantillas para OSINT.',
    link: '/armeria',
    image: '/assets/material/ninja2.webp',
  };

  const DEFAULT_MISSIONS = {
    red: [{ title: 'Red Team', desc: 'Simulacion adversarial completa.', tags: ['red'], image: '/assets/material/ninja1.webp' }],
  };
  const missionPool = missionsRaw && typeof missionsRaw === 'object' ? missionsRaw : DEFAULT_MISSIONS;
  const missionList = Array.isArray(missionPool.red) && missionPool.red.length ? missionPool.red : DEFAULT_MISSIONS.red;
  const latestMission = missionList[0];

  return [
    {
      title: latestCourse.title || 'Curso nuevo',
      text: latestCourse.description || 'Nuevo curso disponible.',
      tags: ['Curso'],
      image: latestCourse.image,
      action: { label: latestCourse.link ? 'Ver curso' : 'Ir al Dojo', href: latestCourse.link || '/dojo' },
    },
    {
      title: latestTool.title || 'Herramienta',
      text: latestTool.description || 'Nueva herramienta en Armería.',
      tags: ['Herramienta'],
      image: latestTool.image || '/assets/material/ninja2.webp',
      action: { label: latestTool.link ? 'Abrir' : 'Ver Armería', href: latestTool.link || '/armeria', external: !!latestTool.link?.startsWith('http') },
    },
    {
      title: latestMission?.title || 'Misión',
      text: latestMission?.desc || 'Engagement ofensivo listo para ejecutar.',
      tags: ['Misión'],
      image: latestMission?.image || '/assets/material/ninja1.webp',
      action: { label: 'Solicitar', href: `/form-mision?interes=${encodeURIComponent(latestMission?.title || 'Misión')}` },
    },
  ];
}
