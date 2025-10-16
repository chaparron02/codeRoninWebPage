// core helpers (ascii-only to avoid encoding issues)
export const $ = (sel, ctx = document) => ctx.querySelector(sel);
export const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

export function createEl(tag, opts = {}) {
  const el = document.createElement(tag);
  if (opts.className) el.className = opts.className;
  if (opts.text) el.textContent = opts.text;
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) el.setAttribute(k, v);
  if (opts.children) opts.children.forEach(c => el.appendChild(c));
  return el;
}

export function showModal(message, { title = 'Listo', onClose } = {}) {
  const overlay = createEl('div', { className: 'modal-overlay', attrs: { role: 'dialog', 'aria-modal': 'true' } });
  const box = createEl('div', { className: 'modal' });
  const heading = createEl('h3', { text: title });
  const body = createEl('p', { text: message });
  const actions = createEl('div', { className: 'modal-actions' });
  const okBtn = createEl('button', { className: 'btn btn-primary', text: 'Aceptar' });
  actions.appendChild(okBtn);
  box.append(heading, body, actions);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  function close() {
    try { overlay.remove(); } catch {}
    if (typeof onClose === 'function') try { onClose(); } catch {}
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }
  okBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', onKey);
}

export function getToken() {
  try { return localStorage.getItem('cr_token') || ''; } catch { return ''; }
}

export function setToken(tok) {
  try { if (!tok) localStorage.removeItem('cr_token'); else localStorage.setItem('cr_token', tok); } catch {}
  try { updateAuthNav(); } catch {}
}

export async function getJSON(path, fallback = []) {
  try {
    const token = getToken();
    const headers = { 'accept': 'application/json' };
    if (token) headers['authorization'] = `Bearer ${token}`;
    const res = await fetch(path, { headers, credentials: 'include' });
    if (!res.ok) throw new Error('request failed');
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (res.status === 204) return fallback;
    if (ct.includes('application/json')) return await res.json();
    try { return JSON.parse(await res.text()); } catch { return fallback; }
  } catch { return fallback; }
}

export function setActiveNav(route) {
  const links = $$('#nav-links a');
  links.forEach(a => {
    const href = a.getAttribute('href') || '';
    let to = href.startsWith('#') ? href.replace(/^#\/?/, '') : href.replace(/^\//, '');
    to = to.split('?')[0] || '/';
    const base = (route || '/').split('?')[0];
    a.classList.toggle('active', base === to);
  });
}

export function navigate(path, { replace = false } = {}) {
  if (replace) history.replaceState({}, '', path); else history.pushState({}, '', path);
  try { window.render && window.render(); } catch {}
}

export function closeUserMenu() {
  const m = document.getElementById('user-menu');
  if (m) { try { m._cleanup && m._cleanup(); } catch {} m.remove(); }
}

export function toggleUserMenu(anchor) {
  const existing = document.getElementById('user-menu');
  if (existing) { existing.remove(); return; }
  const rect = anchor.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.id = 'user-menu';
  menu.className = 'user-menu';
  const toPerfil = document.createElement('a'); toPerfil.href = '/perfil'; toPerfil.textContent = 'Perfil';
  const toLogout = document.createElement('button'); toLogout.type = 'button'; toLogout.textContent = 'Salir'; toLogout.className = 'menu-danger';
  toLogout.addEventListener('click', async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    setToken('');
    closeUserMenu();
    navigate('/');
  });
  menu.append(toPerfil, toLogout);
  document.body.appendChild(menu);
  const top = rect.bottom + 6 + window.scrollY;
  const left = Math.min(rect.left + window.scrollX, window.innerWidth - menu.offsetWidth - 8);
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;
  setTimeout(() => {
    const onDoc = (e) => { if (!menu.contains(e.target) && e.target !== anchor) closeUserMenu(); };
    const onKey = (e) => { if (e.key === 'Escape') closeUserMenu(); };
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    menu._cleanup = () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
  }, 0);
}

export async function updateAuthNav() {
  const nav = document.getElementById('nav-links');
  if (!nav) return;
  let me = null;
  try { me = await getJSON('/api/auth/me', null); } catch {}
  const existing = nav.querySelector('a[data-id="nav-admin"]');
  const loginLink = nav.querySelector('a[data-id="nav-login"]');
  const profileLink = nav.querySelector('a[data-id="nav-profile"]');
  const classesLink = nav.querySelector('a[data-id="nav-classes"]');
  const isAdmin = !!(me && Array.isArray(me.roles) && me.roles.includes('gato'));
  const isInstructor = !!(me && Array.isArray(me.roles) && (me.roles.includes('gato') || me.roles.includes('sensei')));
  try {
    const chip = document.getElementById('user-chip');
    if (chip) {
      chip.innerHTML = '';
      const label = me && me.username ? me.username : '';
      if (label) {
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'user-button'; btn.textContent = label;
        btn.setAttribute('aria-label', 'Abrir menu de usuario');
        btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleUserMenu(btn); });
        btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleUserMenu(btn); } });
        chip.appendChild(btn);
      }
    }
  } catch {}
  if (isAdmin && !existing) {
    const link = document.createElement('a'); link.href = '/admin'; link.textContent = 'Admin'; link.setAttribute('data-id', 'nav-admin'); nav.appendChild(link);
  } else if (!isAdmin && existing) { existing.remove(); }
  if (!me && !loginLink) {
    const link = document.createElement('a'); link.href = '/login'; link.textContent = 'Login'; link.setAttribute('data-id', 'nav-login'); nav.appendChild(link);
  } else if (me && loginLink) { loginLink.remove(); }
  if (me && !profileLink) {
    const link = document.createElement('a'); link.href = '/perfil'; link.textContent = 'Perfil'; link.setAttribute('data-id', 'nav-profile'); nav.appendChild(link);
  } else if (!me && profileLink) { profileLink.remove(); }
  if (isInstructor && !classesLink) {
    const link = document.createElement('a'); link.href = '/clases'; link.textContent = 'Clases'; link.setAttribute('data-id', 'nav-classes'); nav.appendChild(link);
  } else if (!isInstructor && classesLink) { classesLink.remove(); }
}

export function showLoaderOnce() {
  try { if (localStorage.getItem('cr_seen_loader')) return; } catch {}
  const overlay = createEl('div', { className: 'loader-overlay', attrs: { role: 'status', 'aria-live': 'polite' } });
  const inner = createEl('div', { className: 'loader-inner' });
  const ring = createEl('div', { className: 'loader-ring' });
  const symbol = createEl('div', { className: 'loader-symbol', text: 'cr' });
  inner.append(ring, symbol);
  overlay.appendChild(inner);
  document.body.appendChild(overlay);
  setTimeout(() => {
    overlay.classList.add('hide');
    setTimeout(() => overlay.remove(), 450);
    try { localStorage.setItem('cr_seen_loader', '1'); } catch {}
  }, 1200);
}

