import { $, $$, createEl } from '../lib/core.js'
import { Hero, EmbedInstagram, EmbedTikTok } from '../lib/components.js'

export async function HomePage() {
  const main = document.createDocumentFragment();
  // Hero completo
  try { main.appendChild(Hero()); } catch {
    const hero = createEl('section', { className: 'hero', attrs: { id: 'inicio' } });
    const container = createEl('div', { className: 'container' });
    const h1 = createEl('h1'); h1.append('Aprende hacking y ciberseguridad ');
    h1.appendChild(createEl('span', { className: 'neon-red', text: 'como un ronin' }));
    const p = createEl('p', { text: 'Laboratorios, proyectos reales y material practico.' });
    const cta = createEl('div', { className: 'cta' });
    cta.append(
      createEl('a', { className: 'btn btn-primary', text: 'Ir a Misiones', attrs: { href: '/misiones' } }),
      createEl('a', { className: 'btn btn-ghost', text: 'Ir al Dojo', attrs: { href: '/dojo' } }),
      createEl('a', { className: 'btn btn-ghost', text: 'Ir a Armeria', attrs: { href: '/armeria' } })
    );
    container.append(h1, p, cta);
    hero.appendChild(container);
    main.appendChild(hero);
  }
  // Mantras Ronin
  const secTiles = createEl('section', { className: 'section' });
  const cTiles = createEl('div', { className: 'container' });
  cTiles.appendChild(createEl('h2', { className: 'section-title', text: 'Mantras Ronin' }));
  const tiles = createEl('div', { className: 'tiles' });
  const phrases = [ 'Observa. Comprende. Actua.', 'Sigilo sobre ruido.', 'Disciplina y curiosidad.', 'La defensa nace del ataque.', 'Mide, no supongas.', 'Rompe para aprender.', 'Simple > Complejo.', 'Piensa como atacante.', 'Invisible, no ausente.' ];
  phrases.forEach((t, i) => { const cls = i % 3 === 0 ? 'tile wide' : (i % 4 === 0 ? 'tile tall' : 'tile'); tiles.appendChild(createEl('div', { className: cls, text: t })); });
  cTiles.appendChild(tiles); secTiles.appendChild(cTiles);
  // Por que contactarnos
  const sec2 = createEl('section', { className: 'section' });
  const c2 = createEl('div', { className: 'container' });
  c2.appendChild(createEl('h2', { className: 'section-title', text: 'Por que contactarnos' }));
  const list = createEl('ul', { className: 'list' });
  [ 'Revela vulnerabilidades antes que los atacantes', 'Prioriza inversion: enfoque en riesgos reales', 'Mejora cumplimiento (OWASP, ISO, NIST)', 'Entrena equipos con evidencias y casos reales' ].forEach(i => list.appendChild(createEl('li', { text: i })));
  c2.append(
    createEl('p', { text: 'Un pentest bien ejecutado reduce exposicion, mejora decisiones de riesgo y acelera la madurez de seguridad.' }),
    list,
    createEl('div', { className: 'cta', children: [
      createEl('a', { className: 'btn btn-primary', text: 'Ir a Misiones', attrs: { href: '/misiones' } }),
      createEl('a', { className: 'btn btn-ghost', text: 'Ir al Dojo', attrs: { href: '/dojo' } }),
      createEl('a', { className: 'btn btn-ghost', text: 'Ir a Armeria', attrs: { href: '/armeria' } })
    ] })
  );
  sec2.appendChild(c2);
  // Quienes somos
  const sec1 = createEl('section', { className: 'section' });
  const c1 = createEl('div', { className: 'container' });
  c1.appendChild(createEl('h2', { className: 'section-title', text: 'Quienes somos' }));
  c1.appendChild(createEl('p', { text: 'codeRonin es un dojo de ciberseguridad con espiritu ronin: construimos, probamos y aprendemos con etica y metodo.' }));
  c1.appendChild(createEl('p', { text: 'Entrena en el Dojo (virtual/presencial), pon a prueba tus defensas con Misiones y equipa tu dia a dia en la Armeria con guias y checklists.' }));
  const promo = createEl('div', { className: 'cta-banner' }); promo.appendChild(createEl('div', { text: 'Espacio para banners y promociones (proximamente).' })); c1.appendChild(promo);
  const socials = createEl('div', { className: 'social-row' });
  [
    { label: 'Instagram', href: 'https://www.instagram.com/code_ronin?igsh=aTRrcWtmdzQxZnI0' },
    { label: 'TikTok', href: 'https://www.tiktok.com/@code.ronin?_t=ZS-90Rb6qcPCVt&_r=1' },
    { label: 'WhatsApp', href: 'https://wa.me/573054402340' },
    { label: 'Email', href: 'mailto:coderonin404@gmail.com' }
  ].forEach(s => socials.appendChild(createEl('a', { text: s.label, attrs: { href: s.href, target: '_blank', rel: 'noopener noreferrer' } })));
  c1.appendChild(socials); sec1.appendChild(c1);
  // Media
  const secMedia = createEl('section', { className: 'section' });
  const cMedia = createEl('div', { className: 'container' });
  cMedia.appendChild(createEl('h2', { className: 'section-title', text: 'Media' }));
  const embeds = createEl('div', { className: 'embed-grid' });
  try { embeds.appendChild(EmbedInstagram('https://www.instagram.com/code_ronin/embed')); } catch {}
  try { embeds.appendChild(EmbedTikTok('@code.ronin')); } catch {}
  cMedia.append(embeds); secMedia.appendChild(cMedia);
  // Append all
  main.append(secTiles, sec2, sec1, secMedia);
  return main;
}