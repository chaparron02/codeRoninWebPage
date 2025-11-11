import { createEl, getJSON } from '../lib/core.js'
import { EmbedInstagram, EmbedTikTok } from '../lib/components.js'
import { buildPageHero, buildSection } from '../lib/layouts.js'

export async function HomePage() {
  const main = createEl('main')

  const heroMedia = createEl('img', { attrs: { src: '/assets/material/ninja3.webp', alt: 'codeRonin hero', loading: 'lazy' } })

  main.appendChild(buildPageHero({
    kicker: 'dojo coderonin',
    title: 'Hacking y ciberseguridad con mentalidad ronin',
    description: 'Labs descargables, misiones reales y herramientas listas para equipo ofensivo y defensivo.',
    stats: [
      { label: 'Labs y retos', value: '35+' },
      { label: 'Misiones entregadas', value: '120+' },
      { label: 'Plantillas Armeria', value: '40+' },
    ],
    actions: [
      { label: 'Explorar misiones', href: '/misiones', primary: true },
      { label: 'Entrar al Dojo', href: '/dojo' },
    ],
    panelTitle: 'Ruta recomendada',
    panelText: 'Activa Dojo + Misiones + Armeria para entrenar, atacar y documentar con la misma narrativa.',
    panelList: [
      'Entrena con labs realistas antes de desplegar ataques controlados.',
      'Alinea hallazgos y recomendaciones con plantillas Armeria.',
      'Comparte contenido multimedia para concientizar sin drama corporativo.',
    ],
    media: heroMedia,
    variant: 'home',
  }))

  const latest = await loadLatestHighlights()
  main.appendChild(buildSection({
    kicker: 'lo mas nuevo',
    title: 'Fresh intel',
    description: 'Cursos, herramientas y misiones que acabamos de lanzar.',
    cards: latest,
  }))

  const mantras = [
    'Observa. Comprende. Actua.',
    'Disciplina y curiosidad permanente.',
    'La defensa nace del ataque.',
    'Mide, no supongas.',
    'Rompe para aprender.',
    'Piensa como atacante.',
    'Invisible, no ausente.',
    'Simple > Complejo.',
    'Usa narrativa para explicar seguridad.',
  ]

  main.appendChild(buildSection({
    kicker: 'mantras',
    title: 'Principios ronin',
    description: 'Nuestro dojo se basa en aprendizaje constante, narrativa clara y respeto por la etica.',
    cards: mantras.map(text => ({ title: text })),
  }))

  const badgeRow = createEl('div', { className: 'badge-row' })
  ;['OWASP', 'MITRE ATT&CK', 'NIST', 'ISO 27001', 'OSINT'].forEach(tag => badgeRow.appendChild(createEl('span', { className: 'badge', text: tag })))

  main.appendChild(buildSection({
    kicker: 'equipos',
    title: 'Por que contactarnos',
    description: 'Un pentest bien ejecutado reduce exposicion, mejora la toma de decisiones y acelera la madurez de seguridad.',
    list: [
      'Revela vulnerabilidades antes que los atacantes',
      'Prioriza inversion enfocada en riesgo real',
      'Documenta hallazgos con plantillas accionables',
      'Entrena equipos con ejercicios y evidencia visual',
    ],
    content: badgeRow,
    actions: [
      { label: 'Reservar una mision', href: '/form-mision', primary: true },
      { label: 'Agendar entrenamiento', href: '/formulario' },
    ],
  }))

  const storyContent = createEl('div')
  storyContent.appendChild(createEl('p', { text: 'codeRonin es un dojo de ciberseguridad hecho en Colombia. Creemos en practicar antes que presentar, por eso todo contenido tiene labs, scripts y plantillas listas para usar.' }))
  const socials = createEl('div', { className: 'social-row' })
  ;[
    { label: 'Instagram', href: 'https://www.instagram.com/code_ronin?igsh=aTRrcWtmdzQxZnI0' },
    { label: 'TikTok', href: 'https://www.tiktok.com/@code.ronin?_t=ZS-90Rb6qcPCVt&_r=1' },
    { label: 'WhatsApp', href: 'https://wa.me/573054402340' },
    { label: 'Email', href: 'mailto:coderonin404@gmail.com' }
  ].forEach(link => socials.appendChild(createEl('a', { text: link.label, attrs: { href: link.href, target: '_blank', rel: 'noopener noreferrer' } })))
  storyContent.appendChild(socials)

  main.appendChild(buildSection({
    kicker: 'historia',
    title: 'Quienes somos',
    description: 'Un laboratorio independiente que acompana comunidades, emprendedores y equipos tecnicos.',
    content: storyContent,
  }))

  const embeds = createEl('div', { className: 'embed-grid' })
  try { embeds.appendChild(EmbedInstagram('https://www.instagram.com/code_ronin/embed')) } catch {}
  try { embeds.appendChild(EmbedTikTok('@code.ronin')) } catch {}

  main.appendChild(buildSection({
    kicker: 'media',
    title: 'Contenido',
    description: 'Clips, lives y retos que usamos para entrenar equipos y comunicar de forma visual.',
    content: embeds,
  }))

  return main
}

async function loadLatestHighlights() {
  const [courses, tools, missionsRaw] = await Promise.all([
    getJSON('/api/courses.json', []),
    getJSON('/api/tools.json', []),
    getJSON('/api/missions.json', null),
  ])

  const latestCourse = (Array.isArray(courses) && courses.find(c => c.link)) || courses?.[0] || {
    title: 'Curso de Pentesting',
    description: 'Ruta practica de ofensiva web.',
    image: '/assets/material/ninja3.webp',
    link: '/dojo',
  }

  const activeTools = Array.isArray(tools) ? tools.filter(t => t.link) : []
  const latestTool = activeTools[0] || tools?.[0] || {
    title: 'Ronin Toolkit',
    description: 'Scripts y plantillas para OSINT.',
    link: '/armeria',
    image: '/assets/material/ninja2.webp',
  }

  const DEFAULT_MISSIONS = {
    red: [
      { title: 'Red Team', desc: 'Simulacion adversarial completa.', tags: ['red'], image: '/assets/material/ninja1.webp' },
    ],
  }
  const missionPool = missionsRaw && typeof missionsRaw === 'object' ? missionsRaw : DEFAULT_MISSIONS
  const missionList = Array.isArray(missionPool.red) && missionPool.red.length ? missionPool.red : DEFAULT_MISSIONS.red
  const latestMission = missionList[0]

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
      text: latestTool.description || 'Nueva herramienta en Armeria.',
      tags: ['Herramienta'],
      image: latestTool.image || '/assets/material/ninja2.webp',
      action: { label: latestTool.link ? 'Abrir' : 'Ver Armeria', href: latestTool.link || '/armeria', external: !!latestTool.link?.startsWith('http') },
    },
    {
      title: latestMission?.title || 'Mision',
      text: latestMission?.desc || 'Engagement ofensivo listo para ejecutar.',
      tags: ['Mision'],
      image: latestMission?.image || '/assets/material/ninja1.webp',
      action: { label: 'Solicitar', href: '/form-mision?interes=' + encodeURIComponent(latestMission?.title || 'Mision') },
    },
  ]
}

