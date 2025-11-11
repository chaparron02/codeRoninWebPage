import { createEl, getJSON } from '../lib/core.js'
import { buildPageHero, buildSection } from '../lib/layouts.js'

export async function MissionsPage() {
  const main = createEl('main')

  let data = await getJSON('/api/missions.json', null)
  const DEFAULT_MISSIONS = {
    red: [
      { title: 'Red Team', tags: ['adversarial'], desc: 'Campanas adversariales para medir deteccion y respuesta.', image: '/assets/material/ninja1.webp' },
      { title: 'Pentesting Web', tags: ['owasp'], desc: 'Pruebas OWASP con explotacion controlada y plan por riesgo.', image: '/assets/material/ninja3.webp' },
      { title: 'Pentesting Infraestructura', tags: ['infra','ad'], desc: 'Evaluacion interna/externa, AD y rutas de ataque.', image: '/assets/material/ninja2.webp' },
    ],
    blue: [
      { title: 'SOC Readiness', tags: ['SOC','detections'], desc: 'Mapeo ATT&CK, casos de uso SIEM y pruebas de deteccion.', image: '/assets/material/dojo1.webp' },
      { title: 'Gestion de Vulnerabilidades', tags: ['vulns','riesgo'], desc: 'Descubrimiento, priorizacion, parchado y verificacion.', image: '/assets/material/ninja2.webp' },
      { title: 'DFIR y Respuesta a Incidentes', tags: ['dfir','ir'], desc: 'Forense, contencion, erradicacion y mejora continua.', image: '/assets/material/ninja4.webp' },
    ],
    social: [
      { title: 'Campanas de phishing', tags: ['phishing'], desc: 'Simulaciones con metricas y retroalimentacion.', image: '/assets/material/ninja2.webp' },
      { title: 'Concientizacion', tags: ['awareness'], desc: 'Sesiones para reducir riesgo humano con ejemplos reales.', image: '/assets/material/dojo1.webp' },
      { title: 'Simulaciones y talleres', tags: ['taller'], desc: 'Entrenamiento practico para lideres y equipos.', image: '/assets/material/ninja3.webp' },
    ],
  }
  if (!data || typeof data !== 'object') data = DEFAULT_MISSIONS
  const ofensiva = Array.isArray(data.red) && data.red.length ? data.red : DEFAULT_MISSIONS.red
  const blue = Array.isArray(data.blue) && data.blue.length ? data.blue : DEFAULT_MISSIONS.blue
  const social = Array.isArray(data.social) && data.social.length ? data.social : DEFAULT_MISSIONS.social

  const heroMedia = createEl('img', { attrs: { src: '/assets/material/ninja1.webp', alt: 'Misiones', loading: 'lazy' } })

  main.appendChild(buildPageHero({
    kicker: 'ofensiva controlada',
    title: 'Misiones de hacking etico',
    description: 'Simulamos ataques reales para revelar brechas y fortalecer deteccion, respuesta y narrativa.',
    stats: [
      { label: 'Ofensivas', value: String(ofensiva.length).padStart(2, '0') },
      { label: 'Defensivas', value: String(blue.length).padStart(2, '0') },
      { label: 'Ing. Social', value: String(social.length).padStart(2, '0') },
    ],
    actions: [
      { label: 'Solicitar una mision', href: '/form-mision', primary: true },
      { label: 'Ver entregables', href: '/reporte' },
    ],
    panelTitle: 'Como trabajamos',
    panelList: [
      'Briefing inicial + definicion de reglas del juego.',
      'Ejecucion adversarial con check-ins semanales.',
      'Reporte narrativo + call to action para directivos.',
    ],
    media: heroMedia,
    variant: 'misiones',
  }))

  const filters = createEl('div', { className: 'chips mission-filters' })
  const chipDefs = [
    { id: 'todo', label: 'Todo' },
    { id: 'red', label: 'Red Team' },
    { id: 'blue', label: 'Blue Team' },
    { id: 'social', label: 'Ing. Social' },
  ]
  let activeFilter = 'todo'
  chipDefs.forEach(def => {
    const chip = createEl('div', { className: `chip${def.id === activeFilter ? ' active' : ''}`, text: def.label, attrs: { 'data-id': def.id } })
    chip.addEventListener('click', () => {
      activeFilter = def.id
      updateFilter()
    })
    filters.appendChild(chip)
  })
  main.appendChild(filters)

  const sections = []
  const buildMissionCards = (items, title) => (items || []).map(it => ({
    title: it.title,
    text: it.desc,
    tags: it.tags,
    action: { label: 'Llenar formulario', href: `/form-mision?interes=${encodeURIComponent(it.title || '')}&categoria=${encodeURIComponent(title)}` },
  }))

  const redSection = buildSection({
    kicker: 'Ofensivo',
    title: 'Red Team / Seguridad ofensiva',
    description: 'Exploramos rutas reales de ataque para validar deteccion y respuesta.',
    cards: buildMissionCards(ofensiva, 'Red Team'),
  })
  redSection.classList.add('mission-section')
  redSection.setAttribute('data-cat', 'red')
  sections.push(redSection)

  const blueSection = buildSection({
    kicker: 'Defensivo',
    title: 'Blue Team / Seguridad defensiva',
    description: 'Fortalece controles, visibilidad y respuesta con simulaciones controladas.',
    cards: buildMissionCards(blue, 'Blue Team'),
  })
  blueSection.classList.add('mission-section')
  blueSection.setAttribute('data-cat', 'blue')
  sections.push(blueSection)

  const socialSection = buildSection({
    kicker: 'human firewall',
    title: 'Ingenieria social',
    description: 'Reduce el riesgo humano con campañas creativas y metricas claras.',
    cards: buildMissionCards(social, 'Ingenieria social'),
  })
  socialSection.classList.add('mission-section')
  socialSection.setAttribute('data-cat', 'social')
  sections.push(socialSection)

  sections.forEach(sec => main.appendChild(sec))

  function updateFilter() {
    filters.querySelectorAll('.chip').forEach(ch => ch.classList.toggle('active', ch.getAttribute('data-id') === activeFilter))
    sections.forEach(section => {
      const cat = section.getAttribute('data-cat')
      section.style.display = (activeFilter === 'todo' || activeFilter === cat) ? '' : 'none'
    })
  }

  updateFilter()
  return main
}