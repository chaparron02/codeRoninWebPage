import { createEl } from '../lib/core.js'
import { AchievementsSection } from '../lib/components.js'

export async function AboutPage() {
  const page = createEl('section', { className: 'section page about-page', attrs: { id: 'nosotros' } })
  const shell = createEl('div', { className: 'container about-shell' })

  const hero = createEl('div', { className: 'about-hero' })
  const heroText = createEl('div', { className: 'about-hero-text' })
  heroText.appendChild(createEl('h2', { text: 'codeRonin: laboratorio de ciberseguridad hecho en Colombia' }))
  heroText.appendChild(createEl('p', { className: 'muted', text: 'Acompanamos a comunidades, equipos tecnicos y emprendedores para que comprendan el ofensivo y fortalezcan el defensivo sin drama corporativo. Somos un dojo: disciplina, practica y curiosidad constante.' }))
  const heroStats = createEl('div', { className: 'about-hero-stats' })
  ;[
    { label: 'Experiencias en vivo', value: '20+' },
    { label: 'Labs descargables', value: '35+' },
    { label: 'Horas de asesorias', value: '500+' }
  ].forEach(item => {
    const card = createEl('div', { className: 'about-stat' })
    card.appendChild(createEl('span', { className: 'about-stat-value', text: item.value }))
    card.appendChild(createEl('span', { className: 'about-stat-label', text: item.label }))
    heroStats.appendChild(card)
  })
  heroText.appendChild(heroStats)
  hero.appendChild(heroText)
  hero.appendChild(createEl('div', { className: 'about-hero-media', children: [createEl('video', { attrs: { src: '/assets/material/armeriagif.mp4', autoplay: '', muted: '', loop: '', playsinline: '' }, className: 'about-hero-video' })] }))
  shell.appendChild(hero)

  const pillars = createEl('section', { className: 'about-section' })
  pillars.appendChild(createEl('h3', { text: 'Vision ronin' }))
  const pillarGrid = createEl('div', { className: 'about-grid' })
  ;[
    {
      title: 'Practica antes que diapositivas',
      text: 'Cada curso y taller incluye ejercicios reproducibles, playbooks y escenarios para que el equipo practique sin depender de infraestructura externa.'
    },
    {
      title: 'Seguridad con narrativa',
      text: 'Usamos historias, retos breves y contenido audiovisual para conectar con perfiles tecnicos y no tecnicos. El objetivo es accionar, no solo cumplir con la capacitacion.'
    },
    {
      title: 'Ejecucion legal y responsable',
      text: 'Todas las misiones y servicios se desarrollan bajo contratos, acuerdos de confidencialidad y protocolos de reporte firmados por los fundadores y el cliente.'
    }
  ].forEach(card => {
    const item = createEl('article', { className: 'about-card' })
    item.appendChild(createEl('h4', { text: card.title }))
    item.appendChild(createEl('p', { className: 'muted', text: card.text }))
    pillarGrid.appendChild(item)
  })
  pillars.appendChild(pillarGrid)
  shell.appendChild(pillars)

  const tracks = createEl('section', { className: 'about-section' })
  tracks.appendChild(createEl('h3', { text: 'Rutas de aprendizaje' }))
  const trackList = createEl('div', { className: 'about-tracks' })
  ;[
    {
      title: 'Operaciones ofensivas controladas',
      bullets: ['Labs de wifi, phishing y reconocimiento', 'Informes accionables con recomendaciones locales', 'Coaching para equipos rojos y azules']
    },
    {
      title: 'Formacion corporativa en vivo',
      bullets: ['Charlas teatrales y demostraciones tecnicas', 'Material de refuerzo semanal para los asistentes', 'Metrica de impacto y ruta de madurez']
    },
    {
      title: 'Servicios para pymes y startups',
      bullets: ['Evaluacion de postura y planes de respuesta', 'Asesorias en procesos legales y contractuales', 'Acompanamiento al equipo interno durante la ejecucion']
    }
  ].forEach(track => {
    const box = createEl('article', { className: 'about-track-card' })
    box.appendChild(createEl('h4', { text: track.title }))
    const list = createEl('ul', { className: 'about-list' })
    track.bullets.forEach(line => list.appendChild(createEl('li', { text: line })))
    box.appendChild(list)
    trackList.appendChild(box)
  })
  tracks.appendChild(trackList)
  shell.appendChild(tracks)

  const eventsSection = createEl('section', { className: 'about-section' })
  eventsSection.appendChild(createEl('h3', { text: 'Hitos recientes' }))
  const eventsGrid = createEl('div', { className: 'about-events' })
  ;[
    { title: 'Labs WiFi 2020', detail: 'Reto universitario con defensas en vivo y guia para instructores.' },
    { title: 'Gira corporativa 2021', detail: 'Sesiones teatrales de phishing y talleres de respuesta a incidentes con equipos mixtos.' },
    { title: 'Cursos on-demand 2023', detail: 'Lanzamiento de plataforma con descargas ilimitadas y comunidad privada.' },
    { title: 'Misiones gestionadas 2024', detail: 'Servicios de hardening y simulaciones con reportes en tiempo real para cliente y shinobi asignado.' }
  ].forEach(ev => {
    const card = createEl('article', { className: 'about-event-card' })
    card.appendChild(createEl('h4', { text: ev.title }))
    card.appendChild(createEl('p', { className: 'muted', text: ev.detail }))
    eventsGrid.appendChild(card)
  })
  eventsSection.appendChild(eventsGrid)
  shell.appendChild(eventsSection)

  const achievements = await AchievementsSection()
  achievements.classList.add('about-section')
  shell.appendChild(achievements)

  const aiSection = createEl('section', { className: 'about-section about-ai' })
  aiSection.appendChild(createEl('h3', { text: 'CodeRonin AI Toolkit (Pronto)' }))
  aiSection.appendChild(createEl('p', { className: 'muted', text: 'Construimos un toolkit de ingenieria social impulsado por IA: clonacion de voz controlada, guiones dinamicos y asistente para documentar las evidencias. La plataforma genera reportes y trazabilidad legal de cada simulacion.' }))
  aiSection.appendChild(createEl('p', { className: 'muted', text: 'Estamos en fase piloto con clientes aliados y equipos legales para validar riesgos y permisos. Abriremos el acceso cuando el proceso de compliance este completo.' }))
  aiSection.appendChild(createEl('div', { className: 'badge-row', children: [createEl('span', { className: 'badge role-shogun', text: 'Toolkit en validacion' })] }))
  shell.appendChild(aiSection)

  const cta = createEl('section', { className: 'about-section about-cta' })
  cta.appendChild(createEl('h3', { text: 'Construyamos un plan a medida' }))
  cta.appendChild(createEl('p', { className: 'muted', text: 'Escribenos para recibir una propuesta con alcance tecnico, plan legal y plan de adopcion cultural. Todo se ejecuta bajo contratos firmados con los fundadores y con resguardo de la informacion sensible.' }))
  const links = createEl('div', { className: 'about-cta-links' })
  ;[
    { label: 'Contacto general', href: 'mailto:coderonin404@gmail.com' },
    { label: 'Politicas y contratos', href: '/politicas' }
  ].forEach(link => links.appendChild(createEl('a', { text: link.label, attrs: { href: link.href } })))
  cta.appendChild(links)
  shell.appendChild(cta)

  page.appendChild(shell)
  return page
}
