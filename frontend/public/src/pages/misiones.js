import { $, createEl, showModal, navigate, updateAuthNav, getJSON, setToken } from '../lib/core.js'
import { Hero, Card, Courses, Services, Projects, PDFs, AchievementsSection, EmbedInstagram, EmbedTikTok } from '../lib/components.js'

export async function MissionsPage() {
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
    { title: 'Pruebas de redes WiaFi', desc: 'AuditorAa de WLAN, cifrados, segregaciA3n y ataques comunes (capturas/evil twin).', tags: ['wifi','802.11'], image: '/assets/material/armería.webp' },
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
    { title: 'Hardening y Baselines', desc: 'Benchmarks CIS y polAticas de configuraciA3n para reducir superficie de ataque.', tags: ['cis','baseline'], image: '/assets/material/armería.webp' },
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

