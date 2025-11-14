import { createEl, getJSON } from '../lib/core.js'
import { Courses } from '../lib/components.js'

export async function DojoPage() {
  const page = createEl('main', { className: 'dojo-vortex' })

  page.appendChild(buildHero())
  const presenciales = await loadPrograms()
  page.appendChild(buildProgramMatrix(presenciales))
  page.appendChild(await buildVirtualDeck())
  page.appendChild(buildImmersionTimeline())
  page.appendChild(buildSupportDeck())

  return page
}

function buildHero() {
  const section = createEl('section', { className: 'pane dojo-hero' })

  const copy = createEl('div', { className: 'dojo-hero-copy' })
  copy.appendChild(createEl('p', { className: 'hero-tag', text: 'dojo ronin // labs + misiones' }))
  copy.appendChild(createEl('h1', { text: 'Entrena con labs reales, briefings holográficos y residencias presenciales.' }))
  copy.appendChild(createEl('p', { className: 'hero-subtext', text: 'Diseñamos rutas de hacking ético, OSINT y liderazgo técnico. Mezclamos descargas, mentorías y misiones controladas para que tu equipo practique antes de exponer la marca.' }))

  const bullets = createEl('ul', { className: 'dojo-hero-list' })
  ;[
    'Briefings holo + evidencia audiovisual',
    'Mentoring mensual con Sensei y Shogun',
    'Canal cifrado para Daimyo y RR. HH.'
  ].forEach(item => bullets.appendChild(createEl('li', { text: item })))
  copy.appendChild(bullets)

  const actions = createEl('div', { className: 'hero-actions' })
  actions.append(
    createEl('a', { className: 'btn hero-primary', text: 'Activar residencia', attrs: { href: '/form-mision' } }),
    createEl('a', { className: 'btn hero-ghost', text: 'Ver cursos virtuales', attrs: { href: '#cursos' } })
  )
  copy.appendChild(actions)

  const stats = createEl('div', { className: 'dojo-hero-stats' })
  ;[
    { label: 'Labs ofensivos', value: '37' },
    { label: 'Equipos entrenados', value: '58' },
    { label: 'Horas de mentoring', value: '500+' }
  ].forEach(stat => {
    const card = createEl('div', { className: 'dojo-stat' })
    card.appendChild(createEl('span', { className: 'dojo-stat-value', text: stat.value }))
    card.appendChild(createEl('span', { className: 'dojo-stat-label', text: stat.label }))
    stats.appendChild(card)
  })
  copy.appendChild(stats)

  const holo = createEl('div', { className: 'dojo-holo' })
  holo.appendChild(createEl('span', { className: 'badge', text: 'metodología ronin' }))
  holo.appendChild(createEl('p', { className: 'muted', text: 'Cada módulo cierra con entregables audiovisuales y checklist alineado a OWASP, MITRE ATT&CK y marcos de gobierno latinoamericanos.' }))
  copy.appendChild(holo)

  const media = createEl('div', { className: 'dojo-hero-media' })
  const video = createEl('video', {
    className: 'dojo-hero-video',
    attrs: {
      autoplay: '',
      muted: '',
      loop: '',
      playsinline: '',
      poster: '/assets/material/ninja4.webp'
    }
  })
  video.appendChild(createEl('source', { attrs: { src: '/assets/material/gif%20dojo.mp4', type: 'video/mp4' } }))
  media.appendChild(video)

  section.append(copy, media)
  return section
}

async function loadPrograms() {
  const base = [
    {
      title: 'Hacking ofensivo',
      text: 'Laboratorios Red/Blue, scripting y simulaciones con evidencia para dirección.',
      tag: 'Ofensiva',
      points: ['Playbooks listos para SOC', 'Laboratorios escalables', 'Entrega con video + reporte'],
      action: { label: 'Solicitar agenda', href: '/formulario?modalidad=presencial&categoria=Ofensiva' }
    },
    {
      title: 'OSINT e ingeniería social',
      text: 'Talleres de inteligencia abierta, fraude corporativo y campañas de concientización.',
      tag: 'Social',
      points: ['Simulaciones phishing', 'Kit de awareness', 'Informe ejecutivo'],
      action: { label: 'Reservar briefing', href: '/formulario?modalidad=presencial&categoria=OSINT' }
    },
    {
      title: 'Fundamentos y liderazgo',
      text: 'Capacitaciones para líderes técnicos, RR. HH. y Daimyo que necesitan narrativa clara.',
      tag: 'Leadership',
      points: ['Roadmap de madurez', 'Sesiones híbridas', 'Soporte post-misión'],
      action: { label: 'Hablar con Sensei', href: '/formulario?modalidad=presencial&categoria=Liderazgo' }
    }
  ]

  try {
    const list = await getJSON('/api/courses.json', [])
    const presList = Array.isArray(list) ? list.filter(item => (item.modalidad || item.modality) === 'presencial') : []
    const mapped = presList.map(course => ({
      title: course.title,
      text: course.description || 'Sesión presencial adaptada a tu stack.',
      tag: (course.category || (Array.isArray(course.tags) ? course.tags[0] : '') || 'Presencial'),
      points: [
        'Agenda flexible y reportes diarios',
        'Material físico + digital',
        'Briefing final con video'
      ],
      action: {
        label: 'Llenar formulario',
        href: `/formulario?modalidad=presencial&interes=${encodeURIComponent(course.title || '')}&categoria=${encodeURIComponent(course.category || 'Presencial')}`
      }
    }))
    return base.concat(mapped)
  } catch {
    return base
  }
}

function buildProgramMatrix(cards) {
  const section = createEl('section', { className: 'pane dojo-pane' })
  section.appendChild(createEl('p', { className: 'hero-tag', text: 'residencias presenciales' }))
  section.appendChild(createEl('h2', { text: 'Experiencias guiadas para equipos que necesitan practicar con supervisión ronin.' }))
  section.appendChild(createEl('p', { className: 'muted', text: 'Elegimos el dojo que necesitas, documentamos todo con evidencia audiovisual y dejamos tareas accionables para Daimyo y Shinobi.' }))

  const grid = createEl('div', { className: 'dojo-grid' })
  cards.slice(0, 6).forEach(card => {
    const item = createEl('article', { className: 'dojo-card' })
    if (card.tag) item.appendChild(createEl('span', { className: 'dojo-chip', text: card.tag }))
    item.appendChild(createEl('h3', { text: card.title }))
    item.appendChild(createEl('p', { className: 'muted', text: card.text }))
    const list = createEl('ul', { className: 'dojo-card-list' })
    ;(card.points || []).forEach(point => list.appendChild(createEl('li', { text: point })))
    item.appendChild(list)
    if (card.action) {
      item.appendChild(createEl('a', {
        className: 'btn btn-sm dojo-card-cta',
        text: card.action.label,
        attrs: { href: card.action.href }
      }))
    }
    grid.appendChild(item)
  })
  section.appendChild(grid)
  return section
}

async function buildVirtualDeck() {
  const section = createEl('section', { className: 'pane dojo-pane dojo-virtual' })
  section.appendChild(createEl('p', { className: 'hero-tag', text: 'labs virtuales' }))
  section.appendChild(createEl('h2', { text: 'Cursos virtuales' }))
  section.appendChild(createEl('p', { className: 'muted', text: 'Estamos actualizando el repositorio de labs descargables. Activa las residencias presenciales o solicita un briefing para ser el primero en acceder.' }))

  const highlights = createEl('div', { className: 'dojo-highlight-row' })
  ;[
    'Labs ofensivos + narrativas',
    'Mentoring y comunidad privada',
    'Entrega multimedia para Daimyo'
  ].forEach(text => highlights.appendChild(createEl('span', { className: 'status-chip', text })))
  section.appendChild(highlights)

  const coming = createEl('div', { className: 'dojo-coming-grid' })
  const placeholders = [
    { title: 'Red Team Toolbox', text: 'Playbooks, scripts y labs para equipos internos.' },
    { title: 'Blue Defense Studio', text: 'Casos SIEM, hunting y DFIR simulados.' },
    { title: 'Ing. Social Media Pack', text: 'Contenido audiovisual y campañas guiadas.' }
  ]
  placeholders.forEach(item => {
    const card = createEl('article', { className: 'dojo-coming-card' })
    card.appendChild(createEl('span', { className: 'badge soon', text: 'Próximamente' }))
    card.appendChild(createEl('h3', { text: item.title }))
    card.appendChild(createEl('p', { className: 'muted', text: item.text }))
    coming.appendChild(card)
  })
  section.appendChild(coming)

  section.appendChild(createEl('p', { className: 'muted', text: 'Déjanos tus datos en el formulario general para recibir acceso anticipado cuando abramos la cohorte virtual.' }))
  return section
}

function buildImmersionTimeline() {
  const section = createEl('section', { className: 'pane dojo-immersion' })
  section.appendChild(createEl('p', { className: 'hero-tag', text: 'metodología' }))
  section.appendChild(createEl('h2', { text: 'Así se vive una misión/residencia en el dojo.' }))

  const steps = [
    { title: 'Briefing cifrado', text: 'Levantamos alcance, activos y objetivos de negocio. Definimos los roles del cliente (Daimyo, Shinobi, RR. HH.).' },
    { title: 'Labs guiados', text: 'Entrega de playbooks, datasets y retos descargables. Documentamos cada hallazgo con video/fotos para board.' },
    { title: 'Mentoring y ajustes', text: 'Sensei revisa avances, valida entregables y propone acciones rápidas. Adaptamos los labs a tu stack real.' },
    { title: 'Reporte holográfico', text: 'Cerramos con storytelling audiovisual, checklist, métricas y plan de seguimiento posventa.' }
  ]

  const timeline = createEl('div', { className: 'dojo-timeline' })
  steps.forEach((step, idx) => {
    const item = createEl('article', { className: 'dojo-timeline-step' })
    item.appendChild(createEl('span', { className: 'dojo-step-index', text: `0${idx + 1}` }))
    item.appendChild(createEl('h3', { text: step.title }))
    item.appendChild(createEl('p', { className: 'muted', text: step.text }))
    timeline.appendChild(item)
  })
  section.appendChild(timeline)
  return section
}

function buildSupportDeck() {
  const section = createEl('section', { className: 'pane dojo-support' })
  section.appendChild(createEl('p', { className: 'hero-tag', text: 'acompañamiento ronin' }))
  section.appendChild(createEl('h2', { text: 'Después del curso seguimos contigo.' }))
  section.appendChild(createEl('p', { className: 'muted', text: 'Mentoring mensual, labs personalizados y evaluaciones de equipo para que los resultados no se diluyan al volver a la operación.' }))

  const grid = createEl('div', { className: 'dojo-support-grid' })
  ;[
    { title: 'Mentoring mensual', text: 'Sesiones 1:1 o grupales para revisar backlog, demos y siguientes misiones.', action: { label: 'Agenda llamada', href: 'mailto:coderonin404@gmail.com' } },
    { title: 'Labs personalizados', text: 'Adaptamos ejercicios a tu stack cloud, redes, desarrollo seguro u OT.', action: { label: 'Solicitar demo', href: '/formulario' } },
    { title: 'Evaluación de equipo', text: 'Pruebas de nivel, roadmap y métricas para RR. HH., Tech Leads y dirección.', action: { label: 'Escríbenos', href: 'https://wa.me/573054402340', external: true } }
  ].forEach(block => {
    const card = createEl('article', { className: 'dojo-support-card' })
    card.appendChild(createEl('h3', { text: block.title }))
    card.appendChild(createEl('p', { className: 'muted', text: block.text }))
    card.appendChild(createEl('a', {
      className: 'link-pill',
      text: block.action.label,
      attrs: { href: block.action.href, ...(block.action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {}) }
    }))
    grid.appendChild(card)
  })

  section.appendChild(grid)
  return section
}
