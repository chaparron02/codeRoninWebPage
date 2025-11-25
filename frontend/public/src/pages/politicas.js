import { createEl } from '../lib/core.js'

export async function PoliticasPage() {
  const page = createEl('section', { className: 'section page policy-page neon-policy', attrs: { id: 'politicas' } })
  page.appendChild(buildHero())
  page.appendChild(buildPolicyTimeline())
  page.appendChild(buildPolicyDeck())
  page.appendChild(buildPolicyFaq())
  page.appendChild(buildPolicyContact())
  return page
}

function buildHero() {
  const hero = createEl('div', { className: 'policy-hero pane' })
  hero.appendChild(createEl('p', { className: 'hero-tag', text: 'legal + compliance' }))
  hero.appendChild(createEl('h1', { text: 'Políticas transparentes para cursos, misiones y tratamiento de datos.' }))
  hero.appendChild(createEl('p', { className: 'muted lead', text: 'Somos un emprendimiento colombiano y operamos bajo Ley 1581 de 2012, decretos reglamentarios y contratos firmados por los fundadores de codeRonin. Aquí condensamos privacidad, venta de cursos, servicios ofensivos y soporte.' }))

  const stats = createEl('div', { className: 'policy-stats' })
  ;[
    { label: 'Respuestas a derechos ARCO', value: '< 15 días hábiles' },
    { label: 'Canales oficiales', value: 'correo, WhatsApp, Discord' },
    { label: 'Registros', value: 'evidencia cifrada + sellos de tiempo' }
  ].forEach(entry => {
    const card = createEl('article', { className: 'policy-stat' })
    card.appendChild(createEl('span', { className: 'policy-stat-value', text: entry.value }))
    card.appendChild(createEl('span', { className: 'policy-stat-label', text: entry.label }))
    stats.appendChild(card)
  })
  hero.appendChild(stats)

  return hero
}

function buildPolicyTimeline() {
  const section = createEl('section', { className: 'pane policy-pane' })
  section.appendChild(createEl('p', { className: 'hero-tag', text: 'tratamiento de datos' }))
  section.appendChild(createEl('h2', { text: 'Ciclo de vida de tu información dentro del dojo.' }))

  const steps = [
    { title: 'Captura mínima', text: 'Solicitamos nombre, correo, teléfono y rol dentro del cliente para coordinar acceso a cursos, labs o misiones.' },
    { title: 'Custodia cifrada', text: 'Los registros viven en proveedores con cifrado en reposo dentro de la región. Auditamos accesos cada trimestre.' },
    { title: 'Derechos ARCO', text: 'Puedes consultar, actualizar o suprimir datos escribiendo a coderonin404@gmail.com. Respondemos en máximo quince días hábiles.' },
    { title: 'Eliminación/transferencia', text: 'Solo compartimos datos con aliados técnicos cuando el contrato lo exige. Transferencias internacionales incluyen cláusulas espejo.' }
  ]

  const timeline = createEl('div', { className: 'policy-timeline' })
  steps.forEach((step, idx) => {
    const item = createEl('article', { className: 'policy-step' })
    item.appendChild(createEl('span', { className: 'policy-step-index', text: `0${idx + 1}` }))
    item.appendChild(createEl('h3', { text: step.title }))
    item.appendChild(createEl('p', { className: 'muted', text: step.text }))
    timeline.appendChild(item)
  })
  section.appendChild(timeline)
  return section
}

function buildPolicyDeck() {
  const section = createEl('section', { className: 'pane policy-pane' })
  section.appendChild(createEl('p', { className: 'hero-tag', text: 'lineamientos clave' }))
  section.appendChild(createEl('h2', { text: 'Privacidad, cursos virtuales, servicios y soporte posventa.' }))

  const grid = createEl('div', { className: 'policy-grid' })
  getPolicyBlocks().forEach(block => grid.appendChild(createPolicyCard(block)))
  section.appendChild(grid)
  return section
}

function getPolicyBlocks() {
  return [
    {
      title: 'Política de privacidad',
      summary: 'Aplicamos Ley 1581/2012 y decretos reglamentarios para proteger la data de nuestra comunidad.',
      bullets: [
        'Usamos la información para gestionar accesos, emitir certificados, enviar recordatorios y coordinar soporte.',
        'Registros almacenados en proveedores con cifrado en reposo y monitoreo de accesos trimestral.',
        'Derechos de consulta, actualización y supresión vía coderonin404@gmail.com; respuesta máxima en quince días hábiles.',
        'Solo compartimos datos con aliados técnicos cuando el contrato lo exige e incluimos cláusulas de protección equivalentes.'
      ]
    },
    {
      title: 'Cursos virtuales',
      summary: 'Acceso de por vida mientras exista la plataforma. Podemos migrar contenidos y lo comunicaremos oportunamente.',
      bullets: [
        'Las credenciales son personales. Recursos descargables son de uso individual; republicar requiere autorización escrita.',
        'Actualizaciones continuas en temario, videos o labs bajo nuestro control; notificamos por correo o dentro de la plataforma.',
        'Soporte académico y técnico por correo/WhatsApp en horario Colombia (UTC-5), lunes a viernes.',
        'Podemos cambiar el canal de pago (ejemplo: migrar a Hotmart) y lo informamos en la página del curso.'
      ]
    },
    {
      title: 'Servicios y misiones',
      summary: 'Cada proyecto ofensivo se ejecuta como misión con alcance, contrato y NDA firmados por los fundadores.',
      bullets: [
        'Firmamos propuesta, contrato de servicios y acuerdo de confidencialidad antes de iniciar labores.',
        'Toda actividad ofensiva se realiza sobre activos autorizados y en ventanas aprobadas; mantenemos evidencias y cadena de custodia.',
        'El progreso vive en la plataforma de reportes para que el shinobi del cliente conozca tareas, porcentaje de avance y entregables.',
        'Pagos para servicios o cursos presenciales se pactan tras la reunión técnica y quedan consignados en el contrato.'
      ]
    },
    {
      title: 'Soporte posventa',
      summary: 'Pagos flexibles y acompañamiento posterior a consultorías, hardenings y labs.',
      bullets: [
        'Pagos por transferencia bancaria, pasarela local o criptomonedas previo acuerdo.',
        'Ofrecemos mantenimiento posventa para hardenings y consultorías por treinta días sin costo adicional.',
        'Inconformidades se escalan a soporte@coderonin.site o al canal corporativo de WhatsApp.',
        'Puedes solicitar copia de contratos, certificaciones y sellos digitales cuando lo necesites.'
      ]
    }
  ]
}

function createPolicyCard(block) {
  const card = createEl('article', { className: 'policy-card' })
  card.appendChild(createEl('h3', { text: block.title }))
  card.appendChild(createEl('p', { className: 'muted', text: block.summary }))
  const list = createEl('ul', { className: 'policy-list' })
  block.bullets.forEach(bullet => list.appendChild(createEl('li', { text: bullet })))
  card.appendChild(list)
  return card
}

function buildPolicyFaq() {
  const section = createEl('section', { className: 'pane policy-pane' })
  section.appendChild(createEl('p', { className: 'hero-tag', text: 'FAQ legal' }))
  section.appendChild(createEl('h2', { text: 'Preguntas frecuentes' }))

  const faq = createEl('div', { className: 'policy-faq' })
  ;[
    {
      q: '¿Cómo solicito eliminación de mis datos?',
      a: 'Envía un correo a coderonin404@gmail.com con asunto “Solicitud de supresión”. Adjunta documento que acredite tu identidad. Respondemos en máximo quince días hábiles y confirmamos cuando eliminamos la información.'
    },
    {
      q: '¿Qué pasa si un curso cambia de plataforma?',
      a: 'Podemos migrar contenido a otro LMS (ej. Hotmart). Mantendrás acceso usando tus credenciales o generando nuevas desde la pasarela oficial; notificamos por correo y en la página del curso.'
    },
    {
      q: '¿Quién firma los contratos de servicios?',
      a: 'Los fundadores de codeRonin. Todas las misiones incluyen NDA, alcance, plan de pruebas, responsables y cláusulas de confidencialidad alineadas al país donde opere el cliente.'
    },
    {
      q: '¿Cómo reporto una inconformidad?',
      a: 'Escríbenos a soporte@coderonin.site, coderonin404@gmail.com o al WhatsApp corporativo. Adjunta evidencias (capturas, contratos, número de misión) para responder en menos de 72 horas hábiles.'
    }
  ].forEach(item => {
    const details = createEl('details', { className: 'policy-faq-item' })
    details.appendChild(createEl('summary', { text: item.q }))
    details.appendChild(createEl('p', { className: 'muted', text: item.a }))
    faq.appendChild(details)
  })

  section.appendChild(faq)
  return section
}

function buildPolicyContact() {
  const section = createEl('section', { className: 'pane policy-pane policy-contact' })
  section.appendChild(createEl('h2', { text: 'Contactos oficiales' }))
  section.appendChild(createEl('p', { className: 'muted', text: 'Si necesitas contratos, certificaciones, sellos de tiempo o aclarar cláusulas, usa los canales cifrados del dojo.' }))

  const grid = createEl('div', { className: 'policy-contact-grid' })
  ;[
    { label: 'Legal & contratos', value: 'legal@coderonin.co (temporalmente coderonin404@gmail.com)' },
    { label: 'Soporte', value: 'soporte@coderonin.site + WhatsApp corporativo' },
    { label: 'Escalamiento urgente', value: 'Daimyo directo vía Discord privado / señal segura' }
  ].forEach(entry => {
    const card = createEl('article', { className: 'policy-contact-card' })
    card.appendChild(createEl('span', { className: 'policy-contact-label', text: entry.label }))
    card.appendChild(createEl('span', { className: 'policy-contact-value', text: entry.value }))
    grid.appendChild(card)
  })

  section.appendChild(grid)
  return section
}
