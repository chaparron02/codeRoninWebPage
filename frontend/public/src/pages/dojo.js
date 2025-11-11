import { createEl, getJSON } from '../lib/core.js'
import { Courses } from '../lib/components.js'
import { buildPageHero, buildSection, createGlowCard } from '../lib/layouts.js'

export async function DojoPage() {
  const main = createEl('main')

  const heroVideo = createEl('video', { attrs: { src: '/assets/material/gif%20codeRonin.mp4', autoplay: '', muted: '', loop: '', playsinline: '' } })

  main.appendChild(buildPageHero({
    kicker: 'entrena como ronin',
    title: 'Dojo: labs, rutas y sesiones presenciales',
    description: 'Programas virtuales y presenciales para equipos que necesitan practicar antes de desplegar.',
    stats: [
      { label: 'Cursos virtuales', value: '12' },
      { label: 'Experiencias presenciales', value: '8' },
      { label: 'Horas de mentoring', value: '500+' },
    ],
    actions: [
      { label: 'Ver cursos', href: '#cursos', primary: true },
      { label: 'Solicitar presencial', href: '/formulario' },
    ],
    panelTitle: 'Metodologia del dojo',
    panelList: [
      'Cada modulo tiene labs y entregables reales.',
      'Refuerza con sesiones en vivo opcionales cada mes.',
      'Discord privado para dudas y comunidad.',
    ],
    media: heroVideo,
    variant: 'dojo',
  }))

  const virtualContent = await Courses()
  virtualContent.id = 'cursos'

  main.appendChild(buildSection({
    kicker: 'virtual',
    title: 'Cursos a tu ritmo',
    description: 'Laboratorios descargables, comunidad y soporte asincronico.',
    content: virtualContent,
    list: [
      'Acceso de por vida y actualizaciones incluidas',
      'Soporte por email/Discord para dudas especificas',
      'Material basado en OWASP, MITRE ATT&CK y practicas reales',
    ],
  }))

  const baseCategories = [
    { title: 'Hacking etico', text: 'Introduccion, Pentesting Web e Infraestructura para equipos tecnicos.', tag: 'presencial' },
    { title: 'Fundamentos y liderazgo', text: 'Cybersecurity Fundamentals, Redes y talleres para lideres.', tag: 'team' },
    { title: 'OSINT e ingenieria social', text: 'Talleres de OSINT, concientizacion y simulaciones de phishing.', tag: 'social' },
  ]

  let presCards = baseCategories.map(cat => ({
    title: cat.title,
    text: cat.text,
    tags: [cat.tag],
    action: { label: 'Solicitar agenda', href: `/formulario?modalidad=presencial&categoria=${encodeURIComponent(cat.title)}` },
  }))

  try {
    const list = await getJSON('/api/courses.json', [])
    const presList = Array.isArray(list) ? list.filter(c => (c.modalidad || c.modality) === 'presencial') : []
    presCards = presCards.concat(presList.map(course => ({
      title: course.title,
      text: course.description || 'Sesion presencial con enfoque practico.',
      tags: Array.isArray(course.tags) ? course.tags : ['presencial'],
      action: { label: 'Llenar formulario', href: `/formulario?modalidad=presencial&interes=${encodeURIComponent(course.title || '')}&categoria=${encodeURIComponent(course.category || 'Presencial')}` },
    })))
  } catch {}

  main.appendChild(buildSection({
    kicker: 'presencial',
    title: 'Experiencias guiadas',
    description: 'Inmersion en sitio para alinear practicas, acelerar adopcion y cerrar brechas con tu equipo.',
    cards: presCards,
  }))

  const supportGrid = createEl('div', { className: 'page-card-grid' })
  ;[
    { title: 'Mentoring mensual', text: 'Sesiones 1:1 o grupales para revisar avances y ajustar roadmaps.', action: { label: 'Agenda una llamada', href: 'mailto:coderonin404@gmail.com' } },
    { title: 'Labs personalizados', text: 'Adaptamos labs a tu stack (cloud, redes, dev) con datasets propios.', action: { label: 'Solicitar demo', href: '/formulario' } },
    { title: 'Evaluacion de equipo', text: 'Pruebas de nivel y roadmap para equipos internos o academias.', action: { label: 'Escribenos', href: 'https://wa.me/573054402340', external: true } },
  ].forEach(card => supportGrid.appendChild(createGlowCard(card)))

  main.appendChild(buildSection({
    kicker: 'acompanamiento',
    title: 'Soporte continuo',
    description: 'No solo vendemos cursos: te acompanamos con mentoring, labs y evaluaciones constantes.',
    content: supportGrid,
  }))

  return main
}