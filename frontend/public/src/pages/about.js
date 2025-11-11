import { createEl } from '../lib/core.js'
import { AchievementsSection } from '../lib/components.js'
import { buildPageHero, buildSection } from '../lib/layouts.js'

export async function AboutPage() {
  const main = createEl('main')

  const heroMedia = createEl('video', { attrs: { src: '/assets/material/armeriagif.mp4', autoplay: '', muted: '', loop: '', playsinline: '' }, className: 'about-hero-video' })

  main.appendChild(buildPageHero({
    kicker: 'hecho en colombia',
    title: 'codeRonin: laboratorio de ciberseguridad',
    description: 'Acompanamos comunidades, equipos tecnicos y emprendedores para que comprendan el ofensivo y fortalezcan el defensivo sin drama corporativo.',
    stats: [
      { label: 'Experiencias en vivo', value: '20+' },
      { label: 'Labs descargables', value: '35+' },
      { label: 'Horas de asesoria', value: '500+' },
    ],
    panelTitle: 'Manifesto ronin',
    panelList: [
      'Practica antes que diapositivas.',
      'Seguridad con narrativa clara.',
      'Comunidad abierta, cero dogmas.',
    ],
    media: heroMedia, variant: 'about',
  }))

  main.appendChild(buildSection({
    kicker: 'vision',
    title: 'Como trabajamos',
    description: 'Todo lo que construimos pasa por tres filtros: practica, narrativa y comunidad.',
    cards: [
      { title: 'Practica antes que diapositivas', text: 'Cada curso incluye ejercicios reproducibles, playbooks y escenarios para practicar sin depender de infraestructura externa.' },
      { title: 'Seguridad con narrativa', text: 'Historias, retos y contenido audiovisual para conectar con perfiles tecnicos y no tecnicos.' },
      { title: 'Comunidad primero', text: 'Compartimos labs, streams y workshops abiertos para que cualquiera pueda sumarse.' },
    ],
  }))

  main.appendChild(buildSection({
    kicker: 'servicios',
    title: 'Lo que hacemos',
    cards: [
      { title: 'Misiones', text: 'Simulaciones ofensivas y defensivas con reportes listos para decision makers.', action: { label: 'Ver misiones', href: '/misiones' } },
      { title: 'Dojo', text: 'Entrenamientos virtuales y presenciales con labs descargables.', action: { label: 'Visitar dojo', href: '/dojo' } },
      { title: 'Armeria', text: 'Herramientas, plantillas y PDFs para documentar y ejecutar.', action: { label: 'Ir a Armeria', href: '/armeria' } },
    ],
  }))

  const achievements = await AchievementsSection()
  main.appendChild(buildSection({
    kicker: 'casos',
    title: 'Proyectos realizados',
    description: 'Una seleccion de conferencias, casos y workshops que hemos realizado con clientes y comunidad.',
    content: achievements,
  }))

  return main
}