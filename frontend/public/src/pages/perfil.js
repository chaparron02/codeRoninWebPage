import { $, createEl, showModal, navigate, updateAuthNav, getJSON, setToken } from '../lib/core.js'
import { Hero, Card, Courses, Services, Projects, PDFs, AchievementsSection, EmbedInstagram, EmbedTikTok } from '../lib/components.js'

export async function ProfilePage() {
  const wrap = createEl('section', { className: 'section page', attrs: { id: 'perfil' } });
  const c = createEl('div', { className: 'container' });
  c.appendChild(createEl('h2', { className: 'section-title', text: 'Perfil' }));
  const me = await getJSON('/api/auth/me', null);
  if (!me || !me.username) { const cc = createEl('div', { className: 'container' }); cc.appendChild(createEl('h2', { className: 'section-title', text: '403 - Forbidden' })); cc.appendChild(createEl('p', { text: 'No tienes permisos para acceder a esta seccion.' })); wrap.appendChild(cc); return wrap; }

  const prof = await getJSON('/api/user/profile', { username: '', name: '', email: '', phone: '', avatarUrl: '' });
  const roles = Array.isArray(prof.roles) ? prof.roles : (me && Array.isArray(me.roles) ? me.roles : []);
  const isInstructor = Array.isArray(roles) && (roles.includes('sensei') || roles.includes('gato'));
  const nav = document.getElementById('nav-links');
  const classesLink = nav ? nav.querySelector('[data-id="nav-classes"]') : null;
  const card = createEl('div', { className: 'card' });
  const row = createEl('div', { className: 'profile-row' });
  const avatar = createEl('img', { attrs: { src: prof.avatarUrl || '/assets/material/logo.webp', alt: 'avatar', width: '96', height: '96' }, className: 'avatar' });
  const avatarInput = createEl('input', { attrs: { type: 'file', accept: 'image/*' } });
  const upBtn = createEl('button', { className: 'btn', text: 'Cambiar foto' });
  upBtn.addEventListener('click', () => avatarInput.click());
  avatarInput.addEventListener('change', async () => {
    const f = avatarInput.files && avatarInput.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { showModal('Imagen muy pesada (mA!x 2MB)', { title: 'Error' }); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
      const res = await fetch('/api/user/avatar', { method: 'POST', headers: { 'content-type': 'application/json', 'accept': 'application/json' }, credentials: 'include', body: JSON.stringify({ dataUrl: reader.result }) });
        if (!res.ok) { let msg = 'No se pudo iniciar sesion'; try { const ct = (res.headers.get('content-type') || '').toLowerCase(); const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text()); msg = err?.error || err?.message || msg; } catch {} throw new Error(msg); }
        const j = await res.json();
        avatar.src = (j.url || avatar.src) + `?t=${Date.now()}`;
        updateAuthNav();
      } catch {
        showModal('No se pudo actualizar el avatar', { title: 'Error' });
      }
    };
    reader.readAsDataURL(f);
  });

  const form = createEl('form', { className: 'cr-form', attrs: { autocomplete: 'off' } });
  // Roles (read-only badges)
  if (roles && roles.length) {
    const badges = createEl('div', { className: 'badge-row' });
    roles.forEach(r => {
      const label = (r === 'gato') ? 'shogun' : r;
      const cls = r === 'gato' ? 'badge role-shogun' : (r === 'sensei' ? 'badge role-sensei' : (r === 'shinobi' ? 'badge role-shinobi' : 'badge role-genin'));
      badges.appendChild(createEl('span', { className: cls, text: label }));
    });
    c.appendChild(badges);
  }
  if (nav) {
    if (!classesLink && isInstructor) {
      const link = document.createElement('a');
      link.href = '/clases';
      link.textContent = 'Clases';
      link.setAttribute('data-id', 'nav-classes');
      nav.appendChild(link);
    } else if (classesLink && !isInstructor) {
      classesLink.remove();
    }
  }
  const r1 = createEl('div', { className: 'form-row' });
  r1.append(createEl('label', { text: 'Nombre' }));
  const iName = createEl('input', { attrs: { type: 'text', value: prof.name || '' } });
  r1.appendChild(iName);
  const r2 = createEl('div', { className: 'form-row' });
  r2.append(createEl('label', { text: 'Usuario' }));
  const iUser = createEl('input', { attrs: { type: 'text', value: prof.username || me.username, disabled: '' } });
  r2.appendChild(iUser);
  const r3 = createEl('div', { className: 'form-row' });
  r3.append(createEl('label', { text: 'Correo' }));
  const iEmail = createEl('input', { attrs: { type: 'email', value: prof.email || '' } });
  r3.appendChild(iEmail);
  const r4 = createEl('div', { className: 'form-row' });
  r4.append(createEl('label', { text: 'Celular' }));
  const iPhone = createEl('input', { attrs: { type: 'tel', value: prof.phone || '' } });
  r4.appendChild(iPhone);
  const actions = createEl('div', { className: 'form-actions' });
  const save = createEl('button', { className: 'btn btn-primary', text: 'Guardar' });
  actions.appendChild(save);
  form.append(r1, r2, r3, r4, actions);
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); save.disabled = true;
    try {
      const res = await fetch('/api/user/profile', { method: 'PUT', headers: { 'content-type': 'application/json', 'accept': 'application/json' }, credentials: 'include', body: JSON.stringify({ name: iName.value, email: iEmail.value, phone: iPhone.value }) });
      if (!res.ok) { let msg = 'No se pudo iniciar sesion'; try { const ct = (res.headers.get('content-type') || '').toLowerCase(); const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text()); msg = err?.error || err?.message || msg; } catch {} throw new Error(msg); }
      showModal('Perfil actualizado', { title: 'Listo' });
      updateAuthNav();
    } catch (err) {
      showModal(err.message || 'Error al guardar', { title: 'Error' });
    } finally { save.disabled = false; }
  });

  const left = createEl('div');
  left.append(avatar, upBtn, avatarInput);
  row.append(left, form);
  card.appendChild(row);
  c.appendChild(card);
  wrap.appendChild(c);
  return wrap;
}

