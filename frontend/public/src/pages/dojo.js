import { $, $$, createEl, getJSON } from '../lib/core.js'
import { Card } from '../lib/components.js'

const STATUS_OPEN = 'Inscripciones abiertas'
const STATUS_SOON = 'Proximamente'

function formatPriceCOP(value) {
  if (value == null || value === '') return ''
  const num = Number(String(value).replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(num)) return value
  try {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num)
  } catch {
    return `$${num}`
  }
}

function courseMetaBadge(label, value) {
  if (!value) return null
  const chip = createEl('span', { className: 'course-chip' })
  chip.appendChild(createEl('span', { className: 'course-chip-label', text: label }))
  chip.appendChild(createEl('span', { className: 'course-chip-value', text: value }))
  return chip
}

async function fetchCourseModules(course) {
  const name = course.title || ''
  if (!name) return []
  const fallback = Array.isArray(course.modules)
    ? course.modules.map((title, idx) => ({ title, order: idx + 1, description: '' }))
    : []
  const result = await getJSON(`/api/course-modules?course=${encodeURIComponent(name)}`, null)
  if (Array.isArray(result) && result.length) return result
  return fallback
}

function buildCourseCard(course, onOpen) {
  const card = createEl('article', { className: 'course-tile' })
  if (course.image) {
    const media = createEl('div', { className: 'course-media' })
    media.appendChild(createEl('img', { attrs: { src: course.image, alt: course.title || 'curso', loading: 'lazy' } }))
    card.appendChild(media)
  }

  const body = createEl('div', { className: 'course-body' })
  body.appendChild(createEl('h3', { text: course.title || 'Curso' }))
  body.appendChild(createEl('p', { className: 'muted', text: course.description || 'Descripcion pendiente.' }))

  const meta = createEl('div', { className: 'course-meta' })
  ;[
    courseMetaBadge('Nivel', course.level || ''),
    courseMetaBadge('Duracion', course.duration || ''),
    course.price ? courseMetaBadge('Valor', formatPriceCOP(course.price)) : null,
  ].forEach(chip => { if (chip) meta.appendChild(chip) })
  if (meta.hasChildNodes()) body.appendChild(meta)

  if (Array.isArray(course.tags) && course.tags.length) {
    const tags = createEl('div', { className: 'course-tags' })
    course.tags.forEach(tag => tags.appendChild(createEl('span', { className: 'badge', text: tag })))
    body.appendChild(tags)
  }

  const hasLink = Boolean(course.link)
  const status = createEl('span', { className: 'course-status', text: hasLink ? STATUS_OPEN : STATUS_SOON })
  body.appendChild(status)

  const actions = createEl('div', { className: 'course-actions' })
  if (hasLink) {
    const payBtn = createEl('a', {
      className: 'btn btn-primary btn-sm',
      text: 'Inscribirse',
      attrs: { href: course.link, target: '_blank', rel: 'noopener noreferrer' }
    })
    const detailBtn = createEl('button', { className: 'btn btn-ghost btn-sm', text: 'Ver detalle' })
    detailBtn.addEventListener('click', () => { if (typeof onOpen === 'function') onOpen(course) })
    actions.append(payBtn, detailBtn)
  } else {
    const detailBtn = createEl('button', { className: 'btn btn-primary btn-sm', text: 'Ver detalle' })
    detailBtn.addEventListener('click', () => { if (typeof onOpen === 'function') onOpen(course) })
    actions.appendChild(detailBtn)
  }
  body.appendChild(actions)

  card.appendChild(body)
  return card
}

function buildModulesList(modules) {
  const list = createEl('ol', { className: 'course-modules' })
  modules.forEach((mod, idx) => {
    const item = createEl('li')
    item.appendChild(createEl('strong', { text: mod.title || `Modulo ${idx + 1}` }))
    if (mod.description) item.appendChild(createEl('p', { className: 'muted', text: mod.description }))
    list.appendChild(item)
  })
  return list
}

function buildSkills(skills) {
  const wrap = createEl('div', { className: 'course-skills' })
  skills.forEach(skill => wrap.appendChild(createEl('span', { className: 'course-skill', text: skill })))
  return wrap
}

async function openCourseModal(course) {
  const overlay = createEl('div', { className: 'course-modal-overlay', attrs: { role: 'dialog', 'aria-modal': 'true' } })
  const modal = createEl('div', { className: 'course-modal' })
  const closeBtn = createEl('button', { className: 'course-modal-close', text: 'x', attrs: { 'aria-label': 'Cerrar' } })
  const title = createEl('h3', { className: 'course-modal-title', text: course.title || 'Curso' })
  const desc = createEl('p', { className: 'course-modal-desc', text: course.description || '' })

  const meta = createEl('div', { className: 'course-modal-meta' })
  ;[
    courseMetaBadge('Nivel', course.level || ''),
    courseMetaBadge('Duracion', course.duration || ''),
    course.price ? courseMetaBadge('Valor', formatPriceCOP(course.price)) : null,
  ].forEach(chip => { if (chip) meta.appendChild(chip) })

  const outcome = course.outcome ? createEl('p', { className: 'course-outcome', text: course.outcome }) : null

  const modulesSection = createEl('div', { className: 'course-modal-section' })
  modulesSection.appendChild(createEl('h4', { text: 'Modulos' }))
  const loading = createEl('p', { className: 'muted', text: 'Cargando modulos...' })
  modulesSection.appendChild(loading)

  const skillsSection = createEl('div', { className: 'course-modal-section' })
  skillsSection.appendChild(createEl('h4', { text: 'Habilidades adquiridas' }))
  if (Array.isArray(course.skills) && course.skills.length) {
    skillsSection.appendChild(buildSkills(course.skills))
  } else {
    skillsSection.appendChild(createEl('p', { className: 'muted', text: 'Configura habilidades en Admin > Nuevos pergaminos.' }))
  }

  const cta = createEl('div', { className: 'course-modal-cta' })
  if (course.link) {
    cta.appendChild(createEl('a', {
      className: 'btn btn-primary',
      text: 'Inscribirse',
      attrs: { href: course.link, target: '_blank', rel: 'noopener noreferrer' }
    }))
  } else {
    cta.appendChild(createEl('span', { className: 'course-modal-placeholder', text: 'Inscripciones proximamente' }))
  }

  modal.append(closeBtn, title, desc)
  if (meta.hasChildNodes()) modal.appendChild(meta)
  if (outcome) {
    modal.appendChild(createEl('h4', { text: 'Impacto' }))
    modal.appendChild(outcome)
  }
  modal.append(modulesSection, skillsSection, cta)
  overlay.appendChild(modal)
  document.body.appendChild(overlay)

  function close() {
    overlay.remove()
    document.removeEventListener('keydown', onKey)
  }
  function onKey(e) { if (e.key === 'Escape') close() }
  closeBtn.addEventListener('click', close)
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  document.addEventListener('keydown', onKey)

  const modules = await fetchCourseModules(course)
  modulesSection.removeChild(loading)
  if (modules.length) {
    modulesSection.appendChild(buildModulesList(modules))
  } else {
    modulesSection.appendChild(createEl('p', { className: 'muted', text: 'Aun no hay modulos publicados. Usa Pergaminos para crearlos.' }))
  }
}

async function renderVirtuales(panels) {
  const banner = createEl('div', { className: 'cta-banner' })
  banner.appendChild(createEl('div', { text: 'Aprende a tu ritmo con labs y proyectos guiados.' }))
  panels.appendChild(banner)

  const grid = createEl('div', { className: 'course-grid' })
  panels.appendChild(grid)

  try {
    const list = await getJSON('/api/courses.json', [])
    const virtual = Array.isArray(list) ? list.filter(c => (c.modalidad || c.modality || 'virtual') === 'virtual') : []
    if (virtual.length) {
      virtual.forEach(course => grid.appendChild(buildCourseCard(course, openCourseModal)))
    } else {
      grid.appendChild(createEl('div', { className: 'course-empty', text: 'Aun no hay cursos virtuales publicados.' }))
    }
  } catch {
    grid.appendChild(createEl('div', { className: 'course-empty', text: 'No pudimos cargar los cursos. Intenta recargar.' }))
  }

  const disc = createEl('div', { className: 'cta-banner' })
  disc.appendChild(createEl('div', { text: 'Todos los cursos son 100% reales, basados en escenarios y buenas practicas.' }))
  const badges = createEl('div', { className: 'badge-row' })
  ;['EC-Council', 'OWASP', 'MITRE ATT&CK', 'NIST', 'ISO 27001'].forEach(b => badges.appendChild(createEl('span', { className: 'badge', text: b })))
  disc.appendChild(badges)
  const ul = createEl('ul', { className: 'list' })
  ;[
    'Acceso de por vida y actualizaciones incluidas',
    'Soporte por correo o Discord segun experiencia',
    'Factura disponible y proceso de compra transparente',
    'Rutas alineadas con certificaciones CEH, eJPT, OSCP fundamentals y Security+',
    'Sin DRM: aprende en tu propio entorno'
  ].forEach(text => ul.appendChild(createEl('li', { text })))
  disc.appendChild(ul)
  panels.appendChild(disc)
}

async function renderPresenciales(panels) {
  const wrap = createEl('div')
  wrap.appendChild(createEl('div', { className: 'cta-banner', children: [createEl('div', { text: 'Presenciales: inmersion guiada para acelerar habilidades, alinear practicas y resolver dudas en vivo.' })] }))

  const categories = [
    { t: 'Hacking Etico', image: '/assets/material/ninja1.webp', items: ['Introduccion y Metodologia', 'Pentesting Web', 'Pentesting Infraestructura'] },
    { t: 'Fundamentos', image: '/assets/material/dojo1.webp', items: ['Cybersecurity Fundamentals', 'Redes y Segmentacion', 'Amenazas y Riesgo'] },
    { t: 'Capacitaciones cortas', image: '/assets/material/ninja2.webp', items: ['Taller OSINT', 'DFIR 101', 'DevSecOps Essentials'] },
    { t: 'Campanas de ingenieria social', image: '/assets/material/ninja3.webp', items: ['Concientizacion', 'Phishing simulado', 'Reporting y metricas'] },
  ]

  categories.forEach(cat => {
    const secCat = createEl('section', { className: 'section' })
    const cc = createEl('div', { className: 'container' })
    cc.appendChild(createEl('h3', { text: cat.t }))
    const grid = createEl('div', { className: 'card-grid' })
    cat.items.forEach(name => {
      const href = `/formulario?modalidad=presencial&interes=${encodeURIComponent(name)}&categoria=${encodeURIComponent(cat.t)}`
      const ctaBtn = createEl('a', { className: 'btn btn-sm btn-primary', text: 'Llenar formulario', attrs: { href } })
      grid.appendChild(Card({ title: name, desc: 'Sesion presencial con enfoque practico y objetivos claros para tu equipo.', tags: ['presencial'], image: cat.image, cta: ctaBtn }))
    })
    cc.appendChild(grid)
    secCat.appendChild(cc)
    wrap.appendChild(secCat)
  })

  panels.appendChild(wrap)

  try {
    const list = await getJSON('/api/courses.json', [])
    const pres = Array.isArray(list) ? list.filter(c => (c.modalidad || c.modality) === 'presencial') : []
    if (pres.length) {
      const secCat = createEl('section', { className: 'section' })
      const cc = createEl('div', { className: 'container' })
      cc.appendChild(createEl('h3', { text: 'Capacitaciones presenciales' }))
      const grid = createEl('div', { className: 'card-grid' })
      pres.forEach(course => {
        const href = `/formulario?modalidad=presencial&interes=${encodeURIComponent(course.title || '')}&categoria=${encodeURIComponent(course.category || 'Presencial')}`
        const btn = createEl('a', { className: 'btn btn-sm btn-primary', text: 'Llenar formulario', attrs: { href } })
        grid.appendChild(Card({ title: course.title, desc: course.description || 'Sesion presencial con enfoque practico.', tags: ['presencial', ...(Array.isArray(course.tags) ? course.tags : [])], image: course.image, cta: btn }))
      })
      cc.appendChild(grid)
      secCat.appendChild(cc)
      panels.appendChild(secCat)
    }
  } catch {}
}

export async function DojoPage() {
  const sec = createEl('section', { className: 'section page' })
  const c = createEl('div', { className: 'container' })
  c.appendChild(createEl('h2', { className: 'section-title', text: 'Dojo' }))
  c.appendChild(createEl('p', { text: 'Elige tu modalidad: cursos virtuales o experiencias presenciales para equipos.' }))

  const tabs = createEl('div', { className: 'tabs' })
  const panels = createEl('div')
  const defTabs = [
    { id: 'virtuales', label: 'Cursos virtuales' },
    { id: 'presenciales', label: 'Presenciales' }
  ]
  let active = 'virtuales'

  async function mount(id) {
    active = id
    $$('.tab', tabs).forEach(x => x.classList.toggle('active', x.dataset.id === id))
    while (panels.firstChild) panels.removeChild(panels.firstChild)
    if (id === 'virtuales') await renderVirtuales(panels)
    else await renderPresenciales(panels)
  }

  defTabs.forEach(t => {
    const el = createEl('div', { className: 'tab' + (t.id === active ? ' active' : ''), text: t.label, attrs: { 'data-id': t.id } })
    el.addEventListener('click', () => mount(t.id))
    tabs.appendChild(el)
  })

  c.append(tabs, panels)
  await mount(active)
  sec.appendChild(c)
  return sec
}
