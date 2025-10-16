import { $, createEl, showModal, navigate, updateAuthNav, getJSON, setToken } from '../lib/core.js'
import { Hero, Card, Courses, Services, Projects, PDFs, AchievementsSection, EmbedInstagram, EmbedTikTok } from '../lib/components.js'

export async function LoginPage() {
  const wrap = createEl('section', { className: 'section page', attrs: { id: 'login' } });
  const c = createEl('div', { className: 'container' });
  const grid = createEl('div', { className: 'auth-grid' });
  const media = createEl('div', { className: 'auth-media' });
  const art = createEl('img', { attrs: { src: '/assets/material/ninja1.webp', alt: 'codeRonin', loading: 'lazy' } });
  media.appendChild(art);
  const card = createEl('div', { className: 'card login-card' });
  const brand = createEl('div', { className: 'brand login-brand' });
  const logo = createEl('img', { className: 'logo', attrs: { src: '/assets/material/logo.webp', alt: 'codeRonin' } });
  const title = createEl('h2', { className: 'section-title', text: 'Iniciar sesiA3n' });
  const brandText = createEl('span', { className: 'brand-text', text: 'codeRonin' });
  brand.append(logo, brandText);
  card.append(brand, title);

  const form = createEl('form', { className: 'login-form', attrs: { autocomplete: 'on' } });
  const fg1 = createEl('div', { className: 'form-group' });
  const user = createEl('input', { attrs: { type: 'text', name: 'username', placeholder: 'Usuario', required: '', autocomplete: 'username' } });
  fg1.appendChild(user);
  const fg2 = createEl('div', { className: 'form-group' });
  const pass = createEl('input', { attrs: { type: 'password', name: 'password', placeholder: 'Clave', required: '', autocomplete: 'current-password' } });
  fg2.appendChild(pass);
  const actions = createEl('div', { className: 'btn-row' });
  const btn = createEl('button', { className: 'btn btn-accent', text: 'Entrar', attrs: { type: 'submit' } });
  const btnSignup = createEl('button', { className: 'btn btn-accent', text: 'Crear cuenta', attrs: { type: 'button' } });
  btnSignup.addEventListener('click', (e) => { e.preventDefault(); navigate('/signup'); });
  actions.append(btn, btnSignup);
  form.append(fg1, fg2, actions);
  card.appendChild(form);

  // If already logged-in admin (gato), go to admin
  try {
    const me = await getJSON('/api/auth/me', null);
    if (me && Array.isArray(me.roles) && me.roles.includes('gato')) {
      navigate('/admin');
    }
  } catch {}

  // Prefill last username
  try { const last = localStorage.getItem('cr_last_username'); if (last) user.value = last; } catch {}

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: user.value, password: pass.value })
      });
      if (!res.ok) { let msg = 'No se pudo iniciar sesion'; try { const ct = (res.headers.get('content-type') || '').toLowerCase(); const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text()); msg = err?.error || err?.message || msg; } catch {} throw new Error(msg); }
      const data = await res.json();
      try { localStorage.setItem('cr_last_username', String(user.value || '')); } catch {}
      setToken(data.token || '');
      if (data?.user?.roles && Array.isArray(data.user.roles) && data.user.roles.includes('gato')) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      showModal(err?.message || 'No se pudo iniciar sesion', { title: 'Error' });
    } finally {
      btn.disabled = false;
    }
  });

  grid.append(media, card);
  c.appendChild(grid);
  wrap.appendChild(c);
  return wrap;
}

