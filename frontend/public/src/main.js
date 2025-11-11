// entrypoint module that wires routes to per-page modules (ascii-only)
import { $, setActiveNav, showLoaderOnce, updateAuthNav, navigate } from './lib/core.js'
import { mountHeader } from './components/header.js'
import { mountFooter } from './components/footer.js'

// Dynamic imports so each page loads in isolation.
const routes = {
  '/': async () => (await import('./pages/home.js')).HomePage,
  'dojo': async () => (await import('./pages/dojo.js')).DojoPage,
  'misiones': async () => (await import('./pages/misiones.js')).MissionsPage,
  'armeria': async () => (await import('./pages/armeria.js')).ResourcesPage,
  'about': async () => (await import('./pages/about.js')).AboutPage,
  'login': async () => (await import('./pages/login.js')).LoginPage,
  'perfil': async () => (await import('./pages/perfil.js')).ProfilePage,
  'admin': async () => (await import('./pages/admin.js')).AdminPage,
  'pergaminos': async () => (await import('./pages/pergaminos.js')).PergaminosPage,
  'entrenamientos': async () => (await import('./pages/entrenamiento.js')).EntrenamientoPage,
  'reporte': async () => (await import('./pages/reporte.js')).ReportePage,
  'politicas': async () => (await import('./pages/politicas.js')).PoliticasPage,
  'formulario': async () => (await import('./pages/formulario.js')).FormPage,
  'form-mision': async () => (await import('./pages/form-mision.js')).FormMisionPage,
}

function parseRoute() {
  const rawPath = location.pathname || '/';
  if (rawPath === '/' || rawPath === '') return '/';
  const base = rawPath.replace(/^\/+/, '').split('/')[0];
  return base || '/';
}

export async function render() {
  const route = parseRoute();
  setActiveNav(route);
  const root = document.getElementById('root');
  root.innerHTML = '';
  try {
    const loader = routes[route] || routes['/'];
    const pageFn = await loader();
    const node = await pageFn();
    root.appendChild(node);
    decorateSections();
    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
    try { document.body.dataset.route = route.replace(/^\//,'') || 'home'; } catch {}
  } catch (err) {
    const fallback = document.createElement('div');
    fallback.className = 'container';
    fallback.appendChild(document.createElement('h2')).textContent = 'Se produjo un error en esta pagina';
    fallback.appendChild(document.createElement('p')).textContent = 'Intenta navegar a otra seccion mientras resolvemos el problema.';
    root.appendChild(fallback);
    try { console.error('Render error:', err); } catch {}
  }
}

function decorateSections() {
  document.querySelectorAll('.section.page').forEach(section => {
    if (!section.classList.contains('page-section')) {
      section.classList.add('page-section');
    }
    const container = section.querySelector(':scope > .container');
    if (container && !container.classList.contains('page-section-shell')) {
      container.classList.add('page-section-shell');
    }
  });
}

window.addEventListener('popstate', render);
window.addEventListener('DOMContentLoaded', () => {
  mountHeader();
  mountFooter();
  showLoaderOnce();
  render();
  updateAuthNav();
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(href, location.origin);
    if (url.origin !== location.origin) return;
    if (url.pathname.startsWith('/api')) return;
    e.preventDefault();
    navigate(url.pathname + url.search);
  });
});
try { window.render = render; } catch {}
