import { createEl } from './core.js'

function buildAction(action) {
  if (!action || !action.label) return null
  const attrs = action.href ? { href: action.href } : { type: 'button' }
  if (action.href) {
    attrs.target = action.target || (action.external ? '_blank' : undefined)
    if (action.external) attrs.rel = 'noopener noreferrer'
  }
  const el = createEl(action.href ? 'a' : 'button', { className: `btn ${action.primary ? 'btn-primary' : 'btn-ghost'}`, text: action.label, attrs })
  if (!action.href && typeof action.onClick === 'function') {
    el.addEventListener('click', action.onClick)
  }
  return el
}

function buildList(items = []) {
  if (!items.length) return null
  const list = createEl('ul', { className: 'page-list' })
  items.forEach(text => list.appendChild(createEl('li', { text })))
  return list
}

export function buildPageHero({ kicker, title, description, stats = [], actions = [], panelTitle, panelText, panelList = [], panelNodes = [], media, variant = 'default' } = {}) {
  const hero = createEl('section', { className: 'page-hero' })
  if (variant) hero.classList.add(`page-hero--${variant}`)
  const grid = createEl('div', { className: 'container page-hero-grid' })

  const copy = createEl('div', { className: 'page-hero-copy' })
  if (kicker) copy.appendChild(createEl('span', { className: 'page-hero-kicker', text: kicker }))
  if (title) copy.appendChild(createEl('h1', { text: title }))
  if (description) copy.appendChild(createEl('p', { text: description }))
  if (stats.length) {
    const statGrid = createEl('div', { className: 'armory-stats page-hero-stats' })
    stats.forEach(s => {
      const card = createEl('div', { className: 'armory-stat' })
      card.append(
        createEl('strong', { text: s.value || '00' }),
        createEl('span', { text: s.label || '' })
      )
      statGrid.appendChild(card)
    })
    copy.appendChild(statGrid)
  }
  if (actions.length) {
    const actionRow = createEl('div', { className: 'armory-actions' })
    actions.forEach(action => {
      const btn = buildAction(action)
      if (btn) actionRow.appendChild(btn)
    })
    copy.appendChild(actionRow)
  }

  const panel = createEl('div', { className: 'page-hero-panel' })
  if (panelTitle) panel.appendChild(createEl('h3', { text: panelTitle }))
  if (panelText) panel.appendChild(createEl('p', { className: 'muted', text: panelText }))
  if (panelList.length) {
    const list = createEl('ul', { className: 'armory-panel-list' })
    panelList.forEach(item => {
      const li = createEl('li')
      li.append(createEl('span', { className: 'armory-panel-dot' }), createEl('span', { text: item }))
      list.appendChild(li)
    })
    panel.appendChild(list)
  }
  if (media) panel.appendChild(media)
  panelNodes.forEach(node => panel.appendChild(node))

  grid.append(copy, panel)
  if (media) {
    const slot = createEl('div', { className: 'page-hero-media' })
    const nodes = Array.isArray(media) ? media : [media]
    nodes.filter(Boolean).forEach(node => slot.appendChild(node))
    grid.appendChild(slot)
  }
  hero.appendChild(grid)
  return hero
}

export function createGlowCard({ title, text, badge, tags = [], action, media, image } = {}) {
  const card = createEl('article', { className: 'glow-card' })
  if (badge) card.appendChild(createEl('span', { className: 'badge role-sensei', text: badge }))
  if (title) card.appendChild(createEl('h4', { text: title }))
  if (text) card.appendChild(createEl('p', { text }))
  if (image) {
    card.appendChild(createEl('img', { className: 'glow-card-media', attrs: { src: image, alt: title || 'media', loading: 'lazy' } }))
  }
  if (media) card.appendChild(media)
  if (Array.isArray(tags) && tags.length) {
    const row = createEl('div', { className: 'badge-row' })
    tags.forEach(tag => row.appendChild(createEl('span', { className: 'badge', text: tag })))
    card.appendChild(row)
  }
  const btn = buildAction(action)
  if (btn) card.appendChild(btn)
  return card
}

export function buildSection({ kicker, title, description, cards = [], list = [], actions = [], content, gridClass = 'page-card-grid' } = {}) {
  const section = createEl('section', { className: 'section page-section' })
  const container = createEl('div', { className: 'container page-section-shell' })
  if (kicker) container.appendChild(createEl('span', { className: 'section-kicker', text: kicker }))
  if (title) container.appendChild(createEl('h3', { className: 'section-heading', text: title }))
  if (description) container.appendChild(createEl('p', { className: 'section-desc', text: description }))
  if (cards.length) {
    const grid = createEl('div', { className: gridClass })
    cards.forEach(card => grid.appendChild(createGlowCard(card)))
    container.appendChild(grid)
  }
  const listNode = buildList(list)
  if (listNode) container.appendChild(listNode)
  if (content) container.appendChild(content)
  if (actions.length) {
    const row = createEl('div', { className: 'page-section-actions' })
    actions.forEach(action => {
      const btn = buildAction(action)
      if (btn) row.appendChild(btn)
    })
    container.appendChild(row)
  }
  section.appendChild(container)
  return section
}
