import { createEl, getJSON } from '../lib/core.js'

const createStat = (value, label) => {
  const stat = createEl('div', { className: 'armory-stat' })
  stat.append(
    createEl('strong', { text: String(value).padStart(1, '0') }),
    createEl('span', { text: label })
  )
  return stat
}

const createToolCard = (tool, variant = 'active') => {
  const card = createEl('article', { className: 'tool-card-pro', attrs: { 'data-variant': variant } })
  const statusRow = createEl('div', { className: 'badge-row' })
  statusRow.appendChild(createEl('span', { className: variant === 'active' ? 'badge role-sensei' : 'badge soon', text: variant === 'active' ? 'Disponible' : 'Prototipo' }))
  card.appendChild(statusRow)
  card.appendChild(createEl('h4', { text: tool.title || 'Herramienta' }))
  card.appendChild(createEl('p', { text: tool.description || 'Descripcion no disponible.' }))
  if (Array.isArray(tool.tags) && tool.tags.length) {
    const row = createEl('div', { className: 'badge-row' })
    tool.tags.forEach(tag => row.appendChild(createEl('span', { className: 'badge', text: tag })))
    card.appendChild(row)
  }
  const cta = variant === 'active' && tool.link
    ? createEl('a', { className: 'btn btn-sm btn-primary', text: 'Abrir repositorio', attrs: { href: tool.link, target: '_blank', rel: 'noopener noreferrer' } })
    : createEl('span', { className: 'btn btn-sm btn-ghost disabled', text: 'Proximamente' })
  card.appendChild(cta)
  return card
}

export async function ResourcesPage() {
  const main = createEl('main')
  const [toolsData, pdfsData] = await Promise.all([
    getJSON('/api/tools.json', []),
    getJSON('/api/pdfs.json', []),
  ])
  const tools = Array.isArray(toolsData) ? toolsData : []
  const pdfs = Array.isArray(pdfsData) ? pdfsData : []
  const activeTools = tools.filter(t => t.link)
  const upcomingTools = tools.filter(t => !t.link)

  const hero = createEl('section', { className: 'armory-hero' })
  const heroGrid = createEl('div', { className: 'container armory-hero-grid' })
  const heroCopy = createEl('div', { className: 'armory-hero-copy' })
  heroCopy.append(
    createEl('h1', { text: 'Armeria codeRonin' }),
    createEl('p', { text: 'Suite propia de OSINT, automatizacion e ingenieria social para respaldar engagements reales.' })
  )
  const stats = createEl('div', { className: 'armory-stats' })
  stats.append(
    createStat(activeTools.length, 'Herramientas activas'),
    createStat(upcomingTools.length, 'Prototipos IA'),
    createStat(pdfs.length, 'Conocimientos')
  )
  heroCopy.appendChild(stats)
  const actions = createEl('div', { className: 'armory-actions' })
  actions.append(
    createEl('a', { className: 'btn btn-primary', text: 'Hablar con el equipo', attrs: { href: 'mailto:coderonin404@gmail.com' } }),
    createEl('a', { className: 'btn btn-ghost', text: 'Ver GitHub', attrs: { href: 'https://github.com/coderonin404', target: '_blank', rel: 'noopener noreferrer' } })
  )
  heroCopy.appendChild(actions)
  const heroPanel = createEl('div', { className: 'armory-hero-panel' })
  heroPanel.append(
    createEl('h3', { text: 'Inteligencia + Ingenieria Social' }),
    createEl('p', { className: 'muted', text: 'Monitoreo temprano de leaks, campañas con IA y manuales accionables.' })
  )
  const panelList = createEl('ul', { className: 'armory-panel-list' })
  ;[
    'Dark Finder combina Ahmia más agregadores propios para alertar sobre credenciales expuestas.',
    'Coderonin AI arma campañas de clonacion de voz con IA y guiones listos para equipos de social engineering.',
    'Los PDFs de la Armeria documentan metodologias listas para clientes y squads internos.'
  ].forEach(text => {
    const item = createEl('li')
    item.append(createEl('span', { className: 'armory-panel-dot' }), createEl('span', { text }))
    panelList.appendChild(item)
  })
  heroPanel.appendChild(panelList)
  heroGrid.append(heroCopy, heroPanel)
  hero.appendChild(heroGrid)
  main.appendChild(hero)

  const toolsSection = createEl('section', { className: 'section armory-section' })
  const toolsContainer = createEl('div', { className: 'container' })
  const toolsHeader = createEl('div', { className: 'armory-section-header' })
  toolsHeader.append(
    createEl('h3', { text: 'Herramientas' }),
    createEl('p', { text: 'Desarrollos internos para OSINT, automatizacion y campañas de social engineering.' })
  )
  toolsContainer.appendChild(toolsHeader)
  const gallery = createEl('div', { className: 'tool-gallery' })
  if (!tools.length) {
    gallery.appendChild(createEl('p', { className: 'muted small', text: 'Estamos preparando nuevas herramientas. Vuelve pronto.' }))
  } else {
    activeTools.forEach(tool => gallery.appendChild(createToolCard(tool, 'active')))
    upcomingTools.forEach(tool => gallery.appendChild(createToolCard(tool, 'soon')))
  }
  toolsContainer.appendChild(gallery)
  toolsSection.appendChild(toolsContainer)
  main.appendChild(toolsSection)

  const knowledgeSection = createEl('section', { className: 'section armory-section knowledge-section' })
  const knowledgeContainer = createEl('div', { className: 'container' })
  const knowledgeHeader = createEl('div', { className: 'armory-section-header' })
  knowledgeHeader.append(
    createEl('h3', { text: 'Conocimientos' }),
    createEl('p', { text: 'Biblioteca PDF para documentar hallazgos y procesos.' })
  )
  knowledgeContainer.appendChild(knowledgeHeader)
  if (!pdfs.length) {
    knowledgeContainer.appendChild(createEl('p', { className: 'muted small', text: 'Aun no hay PDFs cargados. Proximamente.' }))
  } else {
    const grid = createEl('div', { className: 'pdf-mini-grid knowledge-grid' })
    pdfs.forEach(pdf => {
      const card = createEl('div', { className: 'knowledge-card' })
      card.appendChild(createEl('strong', { text: pdf.name || 'PDF' }))
      const cta = pdf.url
        ? createEl('a', { className: 'btn btn-sm btn-primary', text: 'Ver PDF', attrs: { href: pdf.url, target: '_blank', rel: 'noopener noreferrer' } })
        : createEl('span', { className: 'btn btn-sm btn-ghost disabled', text: 'Proximamente' })
      card.appendChild(cta)
      grid.appendChild(card)
    })
    knowledgeContainer.appendChild(grid)
  }
  knowledgeSection.appendChild(knowledgeContainer)
  main.appendChild(knowledgeSection)

  return main
}
