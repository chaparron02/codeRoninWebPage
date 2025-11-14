// viewport-driven reveal animations shared across pages (ascii-only)
const REVEAL_SELECTORS = [
  '.pane',
  '.panel',
  '.card',
  '.login-panel',
  '.login-meta',
  '.matrix-pane',
  '.matrix-grid > *',
  '.signal-card',
  '.mission-card',
  '.mission-track > *',
  '.dojo-card',
  '.dojo-carousel > *',
  '.report-card',
  '.policy-card',
  '.form-card',
  '.course-card',
  '.stat-card',
  '.grid-card',
  '.timeline-item',
  '.chat-card',
  '.admin-widget',
  '.telemetry-card',
  '.profile-card',
  '.profile-form',
  '.profile-panel',
  '.mission-log-card',
  '.reveal-block',
]

const VARIANTS = ['up', 'left', 'right', 'fade']

let revealObserver = null

function ensureObserver() {
  if (revealObserver) return revealObserver
  revealObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('reveal-visible')
        obs.unobserve(entry.target)
      })
    },
    { threshold: 0.16, rootMargin: '0px 0px -10% 0px' }
  )
  return revealObserver
}

function shouldSkip(el) {
  if (!el) return true
  if (el.dataset && el.dataset.reveal === 'off') return true
  if (el.closest('.no-anim')) return true
  return false
}

export function initPageAnimations(container) {
  if (!container) return
  const observer = ensureObserver()
  const pool = new Set()

  container.querySelectorAll('[data-reveal]').forEach((el) => pool.add(el))
  REVEAL_SELECTORS.forEach((selector) => {
    container.querySelectorAll(selector).forEach((el) => pool.add(el))
  })

  let index = 0
  pool.forEach((el) => {
    if (shouldSkip(el)) return
    if (el.dataset && el.dataset.revealBound === '1') return
    el.dataset.revealBound = '1'
    if (!el.hasAttribute('data-reveal')) {
      const variant = VARIANTS[index % VARIANTS.length]
      el.setAttribute('data-reveal', variant)
    }
    if (!el.style.getPropertyValue('--reveal-delay')) {
      const delay = (index % 6) * 70
      el.style.setProperty('--reveal-delay', `${delay}ms`)
    }
    observer.observe(el)
    index += 1
  })
}
