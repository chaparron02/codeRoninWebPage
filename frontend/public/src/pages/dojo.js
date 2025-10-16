import { $, createEl, showModal, navigate, updateAuthNav, getJSON, setToken } from '../lib/core.js'
import { Hero, Card, Courses, Services, Projects, PDFs, AchievementsSection, EmbedInstagram, EmbedTikTok } from '../lib/components.js'

export async function DojoPage() {
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

