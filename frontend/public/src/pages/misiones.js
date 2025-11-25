import { createEl, getJSON } from '../lib/core.js'

const SERVICE_CATEGORIES = [
  {
    id: 'offensive',
    title: 'Ofensiva dirigida',
    tagline: 'Red Team, pentesting avanzado y operaciones especializadas con alcance definido.',
    highlights: ['Intrusiones multi-vector', 'Evidencia audiovisual verificable', 'Plan de remediación priorizado'],
    services: [
      {
        name: 'Red Team completo',
        desc: 'Ataques controlados sobre infra, cloud y aplicaciones criticas para medir deteccion y respuesta.',
        specs: ['Alcance personalizado', 'Ventanas 2-6 semanas', 'Check-ins con demo de hallazgos'],
        sla: 'Entrega final: informe tecnico + briefing ejecutivo'
      },
      {
        name: 'Pentest Web / API',
        desc: 'Evaluacion basada en OWASP + negocio con explotacion manual y pruebas de abuso real.',
        specs: ['Cobertura OWASP Top 10 + API', 'Pru ebas con PoC grabado', 'Soporte post-entrega 30 dias'],
        sla: 'Severidad y roadmap priorizado con responsables'
      },
      {
        name: 'Ataques de ingeniería fisica',
        desc: 'Simulaciones on-site (tailgating, rogue devices) para validar controles fisicos y procesos.',
        specs: ['Planeacion con RRHH/Seguridad', 'Evidencia foto/video', 'Reporte para legal/compliance'],
        sla: 'Informe ejecutivo + plan de mejoras operativas'
      }
    ]
  },
  {
    id: 'defensive',
    title: 'Respuesta azul 24/7',
    tagline: 'DFIR, threat hunting y fortalecimiento SOC operado como servicio.',
    highlights: ['Laboratorio forense portatil', 'Casos SIEM basados en ataques reales', 'Coaching para SOC y lideres'],
    services: [
      {
        name: 'DFIR bajo demanda',
        desc: 'Captura de evidencia, timeline y acompanamiento legal ante incidentes reales.',
        specs: ['Activacion 24/7', 'Imagenes bit a bit + cadena de custodia', 'Mentoria para comunicacion interna'],
        sla: 'Reporte forense + playbook actualizado'
      },
      {
        name: 'Threat Hunting as a Service',
        desc: 'Hipotesis semanales, IOCs y scripts listos para tu stack SIEM/EDR.',
        specs: ['Hipotesis personalizadas', 'Dashboards interactivos', 'Transferencia de conocimiento'],
        sla: 'Bitacora de hallazgos + roadmap trimestral'
      },
      {
        name: 'SOC Readiness',
        desc: 'Casos de uso MITRE ATT&CK, simulaciones adversariales y validacion de alertas.',
        specs: ['Desarrollo de casos', 'Purple teaming ligera', 'Sesiones de mejora rapida'],
        sla: 'Kits de deteccion + backlog priorizado'
      }
    ]
  },
  {
    id: 'social',
    title: 'Contraingeniería humana',
    tagline: 'Campañas de phishing/vishing, social engineering onsite y entrenamiento inmersivo.',
    highlights: ['Casos basados en incidentes reales', 'Contenido multimedia propio', 'Metricas de riesgo accionables'],
    services: [
      {
        name: 'Phishing y vishing',
        desc: 'Campañas segmentadas con guiones reales y seguimiento por canal.',
        specs: ['Email, voz, chat y smishing', 'Dashboards en tiempo real', 'Mensajes inmediatos para usuarios'],
        sla: 'Reporte para RRHH + plan de refuerzo'
      },
      {
        name: 'Workshops y storyliving',
        desc: 'Sesiones hibridas para areas claves combinando demostraciones tecnicas y narrativas.',
        specs: ['Escenarios personalizados', 'Material descargable', 'Evaluaciones antes/despues'],
        sla: 'Pack multimedia + recomendaciones por perfil'
      },
      {
        name: 'Simulaciones onsite',
        desc: 'Pruebas fisicas (tailgating, drop devices, rogue booths) coordinadas con seguridad corporativa.',
        specs: ['Briefing legal y RRHH', 'Evidencia foto/video', 'Entrega para compliance'],
        sla: 'Informe detallado + plan de mitigacion'
      }
    ]
  }
]

const WORKFLOW_STEPS = [
  { title: 'Briefing autorizado', detail: 'Alcance, activos, responsables y NDA firmado por todas las partes.' },
  { title: 'Ejecucion controlada', detail: 'Misiones con ventanas definidas, evidencia firmada y comunicaciones cifradas.' },
  { title: 'Check-ins y alertas', detail: 'Respuestas rapidas para hallazgos criticos; se notifica a SOC y liderazgo.' },
  { title: 'Entrega multicapa', detail: 'Informe tecnico, storytelling ejecutivo, tableros y assets multimedia.' },
  { title: 'Acompanamiento', detail: 'Soporte post-entrega, sesiones de cierre y asesorias para remediar.' }
]

export async function MissionsPage() {
  const main = createEl('main', { className: 'missions-page' })
  main.appendChild(buildHero())

  const data = await getJSON('/api/missions.json', null)
  main.appendChild(buildServiceWall())
  main.appendChild(buildWorkflow())
  main.appendChild(buildCipherFeed())
  main.appendChild(buildShowcase(data))
  main.appendChild(buildDeliverables())
  main.appendChild(buildCTA())

  return main
}

function buildHero() {
  const section = createEl('section', { className: 'missions-hero pane' })
  const copy = createEl('div', { className: 'missions-hero-copy' })
  copy.appendChild(createEl('p', { className: 'hero-tag', text: 'misiones profesionales // codigo operativo' }))
  copy.appendChild(createEl('h1', { text: 'Servicios de seguridad ejecutados como una misión, no como un curso.' }))
  copy.appendChild(createEl('p', { className: 'muted', text: 'Trabajamos sobre tus activos autorizados, con briefs claros y evidencia legal. Ofrecemos ofensiva dirigida, respuesta azul 24/7 e ingeniería social para cerrar brechas de manera tangible.' }))

  const stats = [
    { label: 'Misiones concluidas', value: '120+' },
    { label: 'Sectores cubiertos', value: '12' },
    { label: 'Horas en campo', value: '7.000+' }
  ]
  const statGrid = createEl('div', { className: 'missions-stat-grid' })
  stats.forEach(stat => {
    const card = createEl('article', { className: 'missions-stat' })
    card.appendChild(createEl('span', { className: 'missions-stat-value', text: stat.value }))
    card.appendChild(createEl('span', { className: 'missions-stat-label', text: stat.label }))
    statGrid.appendChild(card)
  })
  copy.appendChild(statGrid)

  const actions = createEl('div', { className: 'hero-actions' })
  actions.append(
    createEl('a', { className: 'btn hero-primary', text: 'Solicitar misión', attrs: { href: '/form-mision' } }),
    createEl('a', { className: 'btn hero-ghost', text: 'Ver entregables', attrs: { href: '/reporte' } })
  )
  copy.appendChild(actions)

  const media = createEl('div', { className: 'missions-hero-media' })
  const video = createEl('video', {
    className: 'missions-hero-video',
    attrs: { autoplay: '', muted: '', loop: '', playsinline: '', poster: '/assets/material/ninja1.webp' }
  })
  video.appendChild(createEl('source', { attrs: { src: '/assets/material/gif%20ninja4.mp4', type: 'video/mp4' } }))
  media.appendChild(video)
  media.appendChild(createEl('span', { className: 'hero-tag inverted', text: 'operacion en vivo' }))

  section.append(copy, media)
  return section
}

function buildServiceWall() {
  const section = createEl('section', { className: 'missions-pane service-wall' })
  section.appendChild(createEl('h2', { text: 'Portafolio de misiones' }))
  section.appendChild(createEl('p', { className: 'muted', text: 'Selecciona el frente que necesitas cubrir. Cada módulo incluye briefing, ejecución autorizada, evidencia y plan de remediación.' }))

  const tabs = createEl('div', { className: 'service-tabs' })
  const panels = createEl('div', { className: 'service-panels' })

  SERVICE_CATEGORIES.forEach((cat, index) => {
    const btn = createEl('button', { className: `service-tab${index === 0 ? ' active' : ''}`, text: cat.title, attrs: { type: 'button' } })
    btn.addEventListener('click', () => {
      tabs.querySelectorAll('.service-tab').forEach(tab => tab.classList.remove('active'))
      panels.querySelectorAll('.service-panel').forEach(panel => panel.classList.remove('active'))
      btn.classList.add('active')
      const panel = panels.querySelector(`[data-panel="${cat.id}"]`)
      if (panel) panel.classList.add('active')
    })
    tabs.appendChild(btn)

    const panel = createEl('div', { className: `service-panel${index === 0 ? ' active' : ''}`, attrs: { 'data-panel': cat.id } })
    panel.appendChild(createEl('p', { className: 'muted', text: cat.tagline }))

    const highlights = createEl('div', { className: 'service-highlights' })
    cat.highlights.forEach(text => highlights.appendChild(createEl('span', { className: 'badge', text })))
    panel.appendChild(highlights)

    const grid = createEl('div', { className: 'service-card-grid' })
    cat.services.forEach(service => {
      const card = createEl('article', { className: 'service-card' })
      card.appendChild(createEl('h3', { text: service.name }))
      card.appendChild(createEl('p', { className: 'muted', text: service.desc }))
      const list = createEl('ul', { className: 'service-specs' })
      service.specs.forEach(spec => list.appendChild(createEl('li', { text: spec })))
      card.appendChild(list)
      card.appendChild(createEl('p', { className: 'service-sla', text: service.sla }))
      card.appendChild(createEl('a', { className: 'link-pill', text: 'Agendar briefing', attrs: { href: `/form-mision?categoria=${encodeURIComponent(service.name)}` } }))
      grid.appendChild(card)
    })
    panel.appendChild(grid)
    panels.appendChild(panel)
  })

  section.append(tabs, panels)
  return section
}

function buildWorkflow() {
  const section = createEl('section', { className: 'missions-pane workflow-pane' })
  section.appendChild(createEl('h2', { text: 'Cómo operamos cada misión' }))

  const timeline = createEl('div', { className: 'workflow-timeline' })
  WORKFLOW_STEPS.forEach((step, idx) => {
    const item = createEl('article', { className: 'workflow-step' })
    item.appendChild(createEl('span', { className: 'workflow-index', text: `0${idx + 1}` }))
    item.appendChild(createEl('h3', { text: step.title }))
    item.appendChild(createEl('p', { className: 'muted', text: step.detail }))
    timeline.appendChild(item)
  })
  section.appendChild(timeline)
  return section
}

function buildShowcase(data) {
  const section = createEl('section', { className: 'missions-pane showcase-pane' })
  section.appendChild(createEl('h2', { text: 'Log de misiones decodificadas' }))
  section.appendChild(createEl('p', { className: 'muted', text: 'Feed en tiempo real de operaciones (ofensivas, defensivas e ing. social) reducidas a mensajes cifrados.' }))

  const feed = createEl('div', { className: 'missions-feed' })
  const randomFeed = buildCipherEntries(data)
  randomFeed.forEach(entry => {
    const row = createEl('article', { className: 'cipher-row' })
    row.appendChild(createEl('span', { className: 'cipher-tag', text: entry.tag }))
    row.appendChild(createEl('p', { className: 'cipher-body', text: entry.body }))
    row.appendChild(createEl('span', { className: 'cipher-time', text: entry.time }))
    row.appendChild(createEl('a', { className: 'link-pill', text: 'Briefing', attrs: { href: `/form-mision?interes=${encodeURIComponent(entry.link)}` } }))
    feed.appendChild(row)
  })
  section.appendChild(feed)
  return section
}

function buildCipherFeed() {
  const section = createEl('section', { className: 'missions-pane cipher-pane' })
  section.appendChild(createEl('h2', { text: 'Telemetría operativa' }))
  section.appendChild(createEl('p', { className: 'muted', text: 'Panel de actividad: cada ping corresponde a una operacion en curso o cerrada.' }))

  const grid = createEl('div', { className: 'cipher-grid' })
  const entries = ['Σ-RT-904', 'Δ-BL-221', 'Ω-SOC-113', 'ψ-SOC-404', 'λ-RD-778', 'χ-OS-332']
  entries.forEach((code, idx) => {
    const card = createEl('div', { className: 'cipher-card' })
    card.appendChild(createEl('span', { className: 'cipher-code', text: code }))
    card.appendChild(createEl('p', { className: 'cipher-desc', text: idx % 2 ? 'Ping estabilizado. Brief en curso.' : 'Alertas verdes. Esperando siguiente ventana.' }))
    grid.appendChild(card)
  })
  section.appendChild(grid)
  return section
}

function buildCipherEntries(data) {
  const entries = []
  if (Array.isArray(data)) {
    data.slice(0, 3).forEach(item => {
      entries.push({
        tag: (item.tags && item.tags[0] && item.tags[0].toUpperCase()) || randomTag(),
        body: `${randomCode()} :: ${truncateText(item.title, 20)} // ${truncateText(item.desc, 48)} :: ${randomHash()}`,
        time: randomTime(),
        link: item.title || 'Misión'
      })
    })
  }
  while (entries.length < 8) entries.push(generateRandomEntry())
  return entries
}

function generateRandomEntry() {
  const code = randomCode()
  const body = `${code} :: ${randomChoice(['breach_sim', 'dfir_snap', 'osint_wave', 'hunt_delta', 'social_ops'])} // ${randomChoice(['status:flux', 'status:contain', 'status:observe'])} :: ${randomHash()}`
  return {
    tag: randomTag(),
    body,
    time: randomTime(),
    link: 'Briefing ' + code
  }
}

function randomTag() {
  return randomChoice(['RED', 'BLUE', 'SOCIAL', 'DFIR', 'SOC', 'ING'])
}

function randomCode() {
  const prefix = randomChoice(['RT', 'BL', 'SOC', 'IS', 'DF'])
  return `${prefix}-${Math.floor(Math.random() * 900 + 100)}`
}

function randomHash() {
  const chars = 'abcdef0123456789'
  let hash = ''
  for (let i = 0; i < 6; i++) hash += chars[Math.floor(Math.random() * chars.length)]
  return `0x${hash}`
}

function randomTime() {
  const minutes = Math.floor(Math.random() * 50) + 1
  return `Hace ${minutes} min`
}

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function truncateText(text = '', size = 40) {
  const value = String(text || '').trim()
  if (!value) return 'actividad en curso'
  return value.length > size ? `${value.slice(0, size)}…` : value
}

function buildDeliverables() {
  const section = createEl('section', { className: 'missions-pane deliverables-pane' })
  section.appendChild(createEl('h2', { text: 'Entregables por defecto' }))
  const items = [
    { title: 'Informe tecnico', text: 'Hallazgos con evidencia, reproduccion y recomendaciones priorizadas.' },
    { title: 'Storytelling ejecutivo', text: 'Resumen visual con riesgos de negocio, impacto y decisiones recomendadas.' },
    { title: 'Assets multimedia', text: 'Clips, capturas y tableros interactivos que respaldan las conclusiones.' },
    { title: 'Plan de accion', text: 'Roadmap con responsables, effort y quick wins listos para seguimiento.' }
  ]
  const grid = createEl('div', { className: 'deliverables-grid' })
  items.forEach(item => {
    const card = createEl('article', { className: 'deliverable-card' })
    card.appendChild(createEl('h3', { text: item.title }))
    card.appendChild(createEl('p', { className: 'muted', text: item.text }))
    grid.appendChild(card)
  })
  section.appendChild(grid)
  return section
}

function buildCTA() {
  const section = createEl('section', { className: 'missions-pane missions-cta' })
  section.appendChild(createEl('h2', { text: 'Listo para iniciar la próxima misión?' }))
  section.appendChild(createEl('p', { className: 'muted', text: 'Agendamos un briefing de 30 minutos para definir alcance, responsables y ventanas autorizadas.' }))
  const actions = createEl('div', { className: 'hero-actions' })
  actions.append(
    createEl('a', { className: 'btn hero-primary', text: 'Agendar briefing', attrs: { href: '/form-mision' } }),
    createEl('a', { className: 'btn hero-ghost', text: 'Contactar por WhatsApp', attrs: { href: 'https://wa.me/573054402340', target: '_blank', rel: 'noopener noreferrer' } })
  )
  section.appendChild(actions)
  return section
}

function padCount(value) {
  const num = parseInt(value, 10) || 0
  return String(num).padStart(2, '0')
}
