const headerTemplate = /* html */ `
<header class="cr-header" id="site-header">
  <div class="cr-header-glow" aria-hidden="true"></div>
  <div class="header-frame">
    <div class="brand-cluster">
      <a class="brand-chip" href="/" aria-label="Ir al inicio">
        <img src="/assets/material/logo.webp" alt="codeRonin" class="logo" />
        <div class="brand-names">
          <span class="brand-text glitch" data-text="codeRonin">codeRonin</span>
          <span class="brand-sub">dojo ofensivo</span>
        </div>
      </a>
      <div class="header-signal">
        <div class="header-status-pill">
          <span class="status-led" aria-hidden="true"></span>
          <span class="status-copy">canal seguro activo</span>
        </div>
        <div class="header-telemetry">
          <span class="telemetry-dot" aria-hidden="true"></span>
          <div class="telemetry-text">
            <span class="telemetry-label">latencia 42ms</span>
            <span class="telemetry-value">uptime 99.9%</span>
          </div>
        </div>
      </div>
    </div>
    <div class="header-controls">
      <a class="btn btn-primary primary-cta" href="/form-mision">Solicitar mision</a>
      <div id="user-chip" class="user-chip muted" aria-live="polite"></div>
      <button id="header-mode-toggle" class="header-mode-toggle" type="button" aria-label="Contraer header" aria-pressed="true">
        <span class="mode-icon" aria-hidden="true"></span>
      </button>
      <button id="nav-toggle" class="nav-toggle" type="button" aria-label="Abrir menu" aria-controls="nav-links" aria-expanded="false">
        <span class="nav-toggle-bars" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
        <span class="nav-toggle-label">Menu</span>
      </button>
    </div>
  </div>
  <div class="header-nav-shell">
    <nav class="header-nav" id="nav-links" aria-label="Navegacion principal">
      <a href="/" class="active">
        <span class="nav-label">Inicio</span>
        <span class="nav-desc">Briefing general</span>
      </a>
      <a href="/dojo">
        <span class="nav-label">Dojo</span>
        <span class="nav-desc">Labs y cursos</span>
      </a>
      <a href="/misiones">
        <span class="nav-label">Misiones</span>
        <span class="nav-desc">Operaciones activas</span>
      </a>
      <a href="/perfil" data-id="nav-profile">
        <span class="nav-label">Perfil</span>
        <span class="nav-desc">Tu dojo personal</span>
      </a>
      <a href="/armeria">
        <span class="nav-label">Armeria</span>
        <span class="nav-desc">Herramientas &amp; kits</span>
      </a>
      <a href="/about">
        <span class="nav-label">Nosotros</span>
        <span class="nav-desc">Equipo y doctrina</span>
      </a>
      <a href="/politicas" data-id="nav-policy">
        <span class="nav-label">Politicas</span>
        <span class="nav-desc">Protocolos legales</span>
      </a>
    </nav>
  </div>
  <div class="header-locator" aria-label="Estado del header">
    <div class="locator-status">
      <span class="status-led" aria-hidden="true"></span>
      <span class="status-text">canal seguro activo</span>
    </div>
    <div class="locator-controls">
      <button type="button" class="locator-btn" data-action="jump-header">Header ^</button>
      <button type="button" class="locator-btn" data-action="toggle-menu">Menu</button>
    </div>
  </div>
</header>
`;

let manualCollapse = true;
let cleanupHeader = null;

function renderHeader() {
  const tpl = document.createElement('template');
  tpl.innerHTML = headerTemplate.trim();
  return tpl.content.firstElementChild;
}

function bindHeaderInteractions(header) {
  const nav = header.querySelector('#nav-links');
  const navToggle = header.querySelector('#nav-toggle');
  const modeToggle = header.querySelector('#header-mode-toggle');
  const brand = header.querySelector('.brand-text.glitch');
  const locatorJump = header.querySelector('[data-action="jump-header"]');
  const locatorMenu = header.querySelector('[data-action="toggle-menu"]');
  const disposers = [];

  const bind = (node, evt, handler) => {
    if (!node) return;
    node.addEventListener(evt, handler);
    disposers.push(() => node.removeEventListener(evt, handler));
  };

  const canAutoCollapse = () => {
    return !window.matchMedia || window.matchMedia('(pointer: fine)').matches;
  };

  const applyHeaderState = (forceExpand = false) => {
    const reveal = forceExpand || (nav && nav.classList.contains('open'));
    const collapsed = !reveal && manualCollapse && canAutoCollapse();
    header.classList.toggle('is-collapsed', collapsed);
    if (modeToggle) {
      modeToggle.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
      modeToggle.setAttribute('aria-label', collapsed ? 'Expandir header' : 'Contraer header');
    }
  };

  const onMouseEnter = () => applyHeaderState(true);
  const onFocusIn = () => applyHeaderState(true);
  const onMouseLeave = () => applyHeaderState();
  const onFocusOut = () => {
    requestAnimationFrame(() => {
      if (!header.contains(document.activeElement)) applyHeaderState();
    });
  };

  const onResize = () => applyHeaderState();
  window.addEventListener('resize', onResize);
  disposers.push(() => window.removeEventListener('resize', onResize));

  bind(header, 'mouseenter', onMouseEnter);
  bind(header, 'focusin', onFocusIn);
  bind(header, 'mouseleave', onMouseLeave);
  bind(header, 'focusout', onFocusOut);

  bind(modeToggle, 'click', () => {
    manualCollapse = !manualCollapse;
    applyHeaderState();
  });

  bind(locatorJump, 'click', () => {
    manualCollapse = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    applyHeaderState(true);
  });

  if (locatorMenu && navToggle && nav) {
    bind(locatorMenu, 'click', () => {
      const open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      applyHeaderState(open);
    });
  }

  if (navToggle && nav) {
    bind(navToggle, 'click', () => {
      const open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      applyHeaderState(open);
    });
    bind(nav, 'click', (e) => {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        applyHeaderState();
      }
    });
  }

  let brandInterval = null;
  if (brand) {
    brandInterval = setInterval(() => brand.classList.toggle('animate'), 2000);
  }

  applyHeaderState();

  return () => {
    if (brandInterval) clearInterval(brandInterval);
    disposers.forEach((off) => {
      try { off(); } catch {}
    });
  };
}

export function mountHeader() {
  const anchor = document.getElementById('header-root') || document.body;
  if (!anchor) return null;
  if (cleanupHeader) {
    cleanupHeader();
    cleanupHeader = null;
  }
  anchor.innerHTML = '';
  const header = renderHeader();
  anchor.appendChild(header);
  cleanupHeader = bindHeaderInteractions(header);
  return header;
}

