import { $, $$, createEl, getJSON } from '../lib/core.js'
import { Card } from '../lib/components.js'

export async function MissionsPage() {
  const main = createEl('main');
  const sec = createEl('section', { className: 'section page' });
  const c = createEl('div', { className: 'container' });
  c.append(
    createEl('h2', { className: 'section-title', text: 'Misiones' }),
    createEl('p', { text: 'Pon a prueba tus defensas con misiones de hacking etico: simulamos ataques reales de forma controlada para fortalecer tus controles.' })
  );
  const chips = createEl('div', { className: 'chips' });
  const chipDefs = [ { id: 'todo', label: 'Todo' }, { id: 'red', label: 'Red Team' }, { id: 'blue', label: 'Blue Team' }, { id: 'social', label: 'Ing. Social' } ];
  let activeFilter = 'todo';
  chipDefs.forEach(d => {
    const ch = createEl('div', { className: 'chip' + (d.id === activeFilter ? ' active' : ''), text: d.label, attrs: { 'data-id': d.id } });
    ch.addEventListener('click', () => { activeFilter = d.id; updateFilter(); });
    chips.appendChild(ch);
  });
  c.appendChild(chips);
  function missionSection(title, intro, items, catKey) {
    const s = createEl('section', { className: 'section mission-section', attrs: { 'data-cat': catKey } });
    const cc = createEl('div', { className: 'container' });
    cc.appendChild(createEl('h3', { text: title }));
    cc.appendChild(createEl('p', { text: intro }));
    const grid = createEl('div', { className: 'card-grid' });
    (items||[]).forEach(it => {
      const href = `/form-mision?interes=${encodeURIComponent(it.title||'')}&categoria=${encodeURIComponent(title)}&tipo=${encodeURIComponent(catKey)}`;
      const btn = createEl('a', { className: 'btn btn-sm btn-primary', text: 'Llenar formulario', attrs: { href } });
      grid.appendChild(Card({ title: it.title, desc: it.desc||'', tags: it.tags || [], image: it.image, cta: btn }));
    });
    cc.appendChild(grid);
    s.appendChild(cc);
    return s;
  }
  const DEFAULT_MISSIONS = {
    red: [
      { title: 'Red Team', tags: ['adversarial'], desc: 'Campanas adversariales para medir deteccion y respuesta.', image: '/assets/material/ninja1.webp' },
      { title: 'Pentesting Web', tags: ['owasp'], desc: 'Pruebas OWASP con explotacion controlada y plan por riesgo.', image: '/assets/material/ninja3.webp' },
      { title: 'Pentesting Infraestructura', tags: ['infra','ad'], desc: 'Evaluacion interna/externa, AD y rutas de ataque.', image: '/assets/material/ninja2.webp' },
    ],
    blue: [
      { title: 'SOC Readiness y Detecciones', tags: ['SOC','detections'], desc: 'Mapeo ATT&CK, casos de uso SIEM y pruebas de deteccion.', image: '/assets/material/dojo1.webp' },
      { title: 'Gestion de Vulnerabilidades', tags: ['vulns','riesgo'], desc: 'Descubrimiento, priorizacion, parchado y verificacion.', image: '/assets/material/ninja2.webp' },
      { title: 'DFIR y Respuesta a Incidentes', tags: ['dfir','ir'], desc: 'Forense, contencion, erradicacion y mejora continua.', image: '/assets/material/ninja4.webp' },
    ],
    social: [
      { title: 'Campanas de phishing', tags: ['phishing'], desc: 'Simulaciones con metricas y retroalimentacion.', image: '/assets/material/ninja2.webp' },
      { title: 'Concientizacion de seguridad', tags: ['awareness'], desc: 'Sesiones para reducir riesgo humano con ejemplos reales.', image: '/assets/material/dojo1.webp' },
      { title: 'Simulaciones y talleres', tags: ['taller'], desc: 'Entrenamiento practico para lideres y equipos.', image: '/assets/material/ninja3.webp' },
    ]
  };
  let data = await getJSON('/api/missions.json', DEFAULT_MISSIONS);
  if (!data || typeof data !== 'object') data = DEFAULT_MISSIONS;
  if (!(Array.isArray(data.red) || Array.isArray(data.blue) || Array.isArray(data.social))) data = DEFAULT_MISSIONS;
  if ((Array.isArray(data.red) && data.red.length === 0) && (Array.isArray(data.blue) && data.blue.length === 0) && (Array.isArray(data.social) && data.social.length === 0)) data = DEFAULT_MISSIONS;
  const ofensiva = Array.isArray(data.red) ? data.red : [];
  const blue = Array.isArray(data.blue) ? data.blue : [];
  const social = Array.isArray(data.social) ? data.social : [];
  c.appendChild(missionSection('Red Team / Seguridad ofensiva', 'Descubre como un atacante veria tu organizacion. Validamos controles y capacidad de contencion.', ofensiva, 'red'));
  c.appendChild(missionSection('Blue Team / Seguridad defensiva', 'Fortalece controles, visibilidad y respuesta.', blue, 'blue'));
  c.appendChild(missionSection('Ingenieria social', 'Reduce el riesgo humano con simulaciones y talleres.', social, 'social'));
  function updateFilter() {
    chips.querySelectorAll('.chip').forEach(ch => ch.classList.toggle('active', ch.getAttribute('data-id') === activeFilter));
    $$('.mission-section', c).forEach(sec => { const cat = sec.getAttribute('data-cat'); sec.style.display = (activeFilter === 'todo' || cat === activeFilter) ? '' : 'none'; });
  }
  updateFilter();
  sec.appendChild(c);
  main.appendChild(sec);
  return main;
}
