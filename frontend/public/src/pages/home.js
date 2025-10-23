import { createEl } from '../lib/core.js'
import { EmbedInstagram, EmbedTikTok } from '../lib/components.js'

const heroWords = [
  'pentesting',
  'defensa activa',
  'amenazas reales',
  'dojos ofensivos',
  'inteligencia tecnica'
]

const heroHighlights = [
  { title: 'Misiones ofensivas', text: 'Equipos mixtos de ronin ejecutan pentests, red teaming y ejercicios purple con reportes accionables.' },
  { title: 'Dojo vivo', text: 'Clases en vivo, labs guiados y comunidades privadas para elevar la disciplina tecnica.' },
  { title: 'Armeria curada', text: 'Checklists, playbooks, scripts y herramientas listas para desplegar en tus defensas.' }
]

const heroSignals = [
  { label: 'Clientes recurrentes', value: 24, suffix: '+' },
  { label: 'Laboratorios activos', value: 38, suffix: '' },
  { label: 'Horas de hardening', value: 1200, suffix: '+' }
]

const mantraPhrases = [
  'Observa. Comprende. Actua.',
  'Sigilo sobre ruido.',
  'Disciplina y curiosidad.',
  'La defensa nace del ataque.',
  'Mide, no supongas.',
  'Rompe para aprender.',
  'Simple > Complejo.',
  'Piensa como atacante.',
  'Invisible, no ausente.'
]

function observeRemoval(node, cleanup) {
  const observer = new MutationObserver(() => {
    if (!document.body.contains(node)) {
      cleanup();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

function buildDynamicHero() {
  const hero = createEl('section', { className: 'hero hero-dynamic', attrs: { id: 'inicio' } });
  const container = createEl('div', { className: 'container hero-grid' });

  const copy = createEl('div', { className: 'hero-copy' });
  copy.appendChild(createEl('span', { className: 'hero-kicker', text: 'codeRonin dojo' }));

  const title = createEl('h1', { className: 'hero-title' });
  title.append('Ciberseguridad de alto impacto con ');
  const rotator = createEl('span', { className: 'hero-rotate', text: heroWords[0] });
  title.appendChild(rotator);
  copy.appendChild(title);

  copy.appendChild(createEl('p', {
    className: 'hero-subtitle',
    text: 'Misiones ofensivas, entrenamientos inmersivos y playbooks listos para tu defensa. Nuestro dojo conecta estrategia, tecnica y ejecucion.'
  }));

  const ctas = createEl('div', { className: 'hero-actions' });
  ctas.append(
    createEl('a', { className: 'btn btn-primary', text: 'Explorar Misiones', attrs: { href: '/misiones' } }),
    createEl('a', { className: 'btn btn-ghost', text: 'Entrar al Dojo', attrs: { href: '/dojo' } }),
    createEl('a', { className: 'btn btn-ghost', text: 'Equipar Armeria', attrs: { href: '/armeria' } })
  );
  copy.appendChild(ctas);

  const signalGrid = createEl('div', { className: 'hero-signals' });
  heroSignals.forEach(sig => {
    const card = createEl('div', { className: 'hero-signal-card' });
    const val = createEl('span', { className: 'hero-signal-value', text: '0' + sig.suffix });
    val.dataset.target = String(sig.value);
    const label = createEl('span', { className: 'hero-signal-label', text: sig.label });
    card.append(val, label);
    signalGrid.appendChild(card);
  });
  copy.appendChild(signalGrid);

  const visual = createEl('div', { className: 'hero-visual' });
  const orb = createEl('div', { className: 'hero-orb' });
  const scan = createEl('div', { className: 'hero-scan' });
  const stream = createEl('div', { className: 'hero-stream' });
  const video = createEl('video', {
    className: 'hero-video',
    attrs: {
      autoplay: 'true',
      muted: 'true',
      loop: 'true',
      playsinline: 'true'
    }
  });
  const source = createEl('source', { attrs: { src: '/assets/material/gif codeRonin.mp4', type: 'video/mp4' } });
  video.appendChild(source);
  visual.append(orb, scan, stream, video);

  container.append(copy, visual);
  hero.appendChild(container);

  let rotIdx = 0;
  const timers = [];

  function cycleWords() {
    rotIdx = (rotIdx + 1) % heroWords.length;
    rotator.classList.remove('is-visible');
    void rotator.offsetWidth;
    rotator.textContent = heroWords[rotIdx];
    rotator.classList.add('is-visible');
  }

  rotator.classList.add('is-visible');
  timers.push(setInterval(cycleWords, 2800));

  const rafIds = [];

  function animateSignal(el, target, suffix = '') {
    const duration = 1500;
    const start = performance.now();
    function step(now) {
      if (!document.body.contains(el)) return;
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      el.textContent = `${value}${suffix}`;
      if (progress < 1) {
        const id = requestAnimationFrame(step);
        rafIds.push(id);
      }
    }
    const id = requestAnimationFrame(step);
    rafIds.push(id);
  }

  signalGrid.querySelectorAll('.hero-signal-value').forEach(node => {
    const target = Number(node.dataset.target || '0');
    const suffix = heroSignals.find(sig => String(sig.value) === node.dataset.target)?.suffix || '';
    animateSignal(node, target, suffix);
  });

  observeRemoval(hero, () => {
    timers.forEach(id => clearInterval(id));
    rafIds.forEach(id => cancelAnimationFrame(id));
  });

  return hero;
}

function buildHeroHighlights() {
  const wrap = createEl('section', { className: 'section hero-highlights' });
  const container = createEl('div', { className: 'container highlight-grid' });
  heroHighlights.forEach((item, idx) => {
    const card = createEl('article', { className: 'highlight-card' });
    card.appendChild(createEl('span', { className: 'highlight-index', text: String(idx + 1).padStart(2, '0') }));
    card.appendChild(createEl('h3', { text: item.title }));
    card.appendChild(createEl('p', { className: 'muted', text: item.text }));
    container.appendChild(card);
  });
  wrap.appendChild(container);
  return wrap;
}

function buildMantras() {
  const section = createEl('section', { className: 'section mantras-section' });
  const container = createEl('div', { className: 'container' });
  container.appendChild(createEl('h2', { className: 'section-title', text: 'Mantras Ronin' }));
  const grid = createEl('div', { className: 'mantras-grid' });
  mantraPhrases.forEach((phrase, idx) => {
    const tile = createEl('div', { className: 'mantra-tile', text: phrase });
    tile.style.setProperty('--tile-delay', `${idx * 60}ms`);
    grid.appendChild(tile);
  });
  container.appendChild(grid);
  section.appendChild(container);
  return section;
}

function buildWhyUs() {
  const section = createEl('section', { className: 'section why-section' });
  const container = createEl('div', { className: 'container why-grid' });
  const copy = createEl('div', { className: 'why-copy' });
  copy.appendChild(createEl('h2', { className: 'section-title', text: 'Por que contactarnos' }));
  copy.appendChild(createEl('p', {
    className: 'muted lead',
    text: 'Un pentest riguroso reduce superficie de ataque, alinea inversiones de seguridad y acelera la madurez de tus equipos.'
  }));
  const list = createEl('ul', { className: 'why-list' });
  [
    'Revela vulnerabilidades antes que los atacantes',
    'Prioriza inversion: enfoque en riesgos reales',
    'Mejora cumplimiento (OWASP, ISO, NIST)',
    'Entrena equipos con evidencias y casos reales'
  ].forEach(item => list.appendChild(createEl('li', { text: item })));
  copy.appendChild(list);
  copy.appendChild(createEl('div', {
    className: 'hero-actions tight',
    children: [
      createEl('a', { className: 'btn btn-primary', text: 'Solicitar mision', attrs: { href: '/misiones' } }),
      createEl('a', { className: 'btn btn-ghost', text: 'Revisar entrenamientos', attrs: { href: '/dojo' } })
    ]
  }));

  const panel = createEl('div', { className: 'why-panel' });
  const bullets = [
    { label: 'Stack ofensivo', value: 'Burp, Cobalt, BloodHound, Havoc' },
    { label: 'Metodologias', value: 'OWASP WSTG, PTES, MITRE ATT&CK' },
    { label: 'Modos de entrega', value: 'Reportes clasicos, dashboards, simulaciones en vivo' }
  ];
  bullets.forEach(({ label, value }) => {
    const row = createEl('div', { className: 'why-row' });
    row.appendChild(createEl('span', { className: 'why-label', text: label }));
    row.appendChild(createEl('span', { className: 'why-value', text: value }));
    panel.appendChild(row);
  });

  container.append(copy, panel);
  section.appendChild(container);
  return section;
}

function buildWho() {
  const section = createEl('section', { className: 'section who-section' });
  const container = createEl('div', { className: 'container who-grid' });
  const copy = createEl('div', { className: 'who-copy' });
  copy.appendChild(createEl('h2', { className: 'section-title', text: 'Quienes somos' }));
  copy.appendChild(createEl('p', { className: 'lead', text: 'Somos un dojo de ciberseguridad con espiritu ronin. Disenamos misiones ofensivas, reforzamos defensas y formamos equipos listos para la accion.' }));
  copy.appendChild(createEl('p', { className: 'muted', text: 'Entrena en el Dojo (virtual/presencial), pon a prueba tus defensas con Misiones y equipa tu dia a dia en la Armeria con playbooks y herramientas.' }));

  const socials = createEl('div', { className: 'social-row' });
  [
    { label: 'Instagram', href: 'https://www.instagram.com/code_ronin?igsh=aTRrcWtmdzQxZnI0' },
    { label: 'TikTok', href: 'https://www.tiktok.com/@code.ronin?_t=ZS-90Rb6qcPCVt&_r=1' },
    { label: 'WhatsApp', href: 'https://wa.me/573054402340' },
    { label: 'Email', href: 'mailto:coderonin404@gmail.com' }
  ].forEach(s => socials.appendChild(createEl('a', { text: s.label, attrs: { href: s.href, target: '_blank', rel: 'noopener noreferrer' } })));
  copy.appendChild(createEl('div', { className: 'who-actions', children: [socials] }));

  const promo = createEl('div', { className: 'who-promo' });
  promo.append(
    createEl('span', { className: 'promo-label', text: 'Proximo streaming' }),
    createEl('strong', { text: 'Laboratorio de hardening con exploits reales' }),
    createEl('span', { className: 'promo-meta', text: 'Viernes 20:00 UTC-5 · Acceso privado' })
  );

  container.append(copy, promo);
  section.appendChild(container);
  return section;
}

function buildMedia() {
  const section = createEl('section', { className: 'section media-section' });
  const container = createEl('div', { className: 'container' });
  container.appendChild(createEl('h2', { className: 'section-title', text: 'Media' }));
  const embeds = createEl('div', { className: 'embed-grid' });
  try { embeds.appendChild(EmbedInstagram('https://www.instagram.com/code_ronin/embed')); } catch {}
  try { embeds.appendChild(EmbedTikTok('@code.ronin')); } catch {}
  container.appendChild(embeds);
  section.appendChild(container);
  return section;
}

export async function HomePage() {
  const main = document.createDocumentFragment();
  main.appendChild(buildDynamicHero());
  main.appendChild(buildHeroHighlights());
  main.appendChild(buildMantras());
  main.appendChild(buildWhyUs());
  main.appendChild(buildWho());
  main.appendChild(buildMedia());
  return main;
}
