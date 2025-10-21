import { createEl, showModal, updateAuthNav, getJSON } from '../lib/core.js'

export async function ProfilePage() {
  const wrap = createEl('section', { className: 'section page profile-page', attrs: { id: 'perfil' } });
  const container = createEl('div', { className: 'container profile-container' });
  container.appendChild(createEl('h2', { className: 'section-title', text: 'Perfil' }));

  const me = await getJSON('/api/auth/me', null);
  if (!me || !me.username) {
    const cc = createEl('div', { className: 'container' });
    cc.appendChild(createEl('h2', { className: 'section-title', text: '403 - Forbidden' }));
    cc.appendChild(createEl('p', { text: 'No tienes permisos para acceder a esta seccion.' }));
    wrap.appendChild(cc);
    return wrap;
  }

  const prof = await getJSON('/api/user/profile', { username: '', name: '', email: '', phone: '', avatarUrl: '' });
  const roles = Array.isArray(prof.roles) ? prof.roles : (me && Array.isArray(me.roles) ? me.roles : []);
  const isInstructor = Array.isArray(roles) && (roles.includes('sensei') || roles.includes('gato'));

  const nav = document.getElementById('nav-links');
  const classesLink = nav ? nav.querySelector('[data-id="nav-classes"]') : null;
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

  const layout = createEl('div', { className: 'profile-layout' });

  const headerCard = createEl('div', { className: 'card profile-card profile-card-header' });
  const headerGrid = createEl('div', { className: 'profile-card-grid' });
  const avatarWrap = createEl('div', { className: 'profile-avatar-wrap' });
  const avatar = createEl('img', { className: 'avatar profile-avatar', attrs: { src: prof.avatarUrl || '/assets/material/logo.webp', alt: 'avatar', width: '120', height: '120' } });
  const avatarInput = createEl('input', { className: 'hidden-input', attrs: { type: 'file', accept: 'image/*' } });
  const upBtn = createEl('button', { className: 'btn btn-ghost btn-sm', text: 'Cambiar foto' });
  const avatarHint = createEl('span', { className: 'hint', text: 'PNG, JPG o WEBP hasta 2MB.' });

  upBtn.addEventListener('click', () => avatarInput.click());
  avatarInput.addEventListener('change', async () => {
    const f = avatarInput.files && avatarInput.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      showModal('Imagen muy pesada (max 2MB)', { title: 'Error' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/user/avatar', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'accept': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ dataUrl: reader.result })
        });
        if (!res.ok) {
          let msg = 'No se pudo actualizar el avatar';
          try {
            const ct = (res.headers.get('content-type') || '').toLowerCase();
            const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text());
            msg = err?.error || err?.message || msg;
          } catch {}
          throw new Error(msg);
        }
        const j = await res.json();
        avatar.src = (j.url || avatar.src) + `?t=${Date.now()}`;
        updateAuthNav();
      } catch (err) {
        showModal(err.message || 'No se pudo actualizar el avatar', { title: 'Error' });
      }
    };
    reader.readAsDataURL(f);
  });

  avatarWrap.append(avatar, upBtn, avatarInput, avatarHint);
  headerGrid.appendChild(avatarWrap);

  const identity = createEl('div', { className: 'profile-identity' });
  identity.appendChild(createEl('h3', { className: 'profile-name', text: prof.name || me.displayName || me.username }));
  identity.appendChild(createEl('p', { className: 'profile-username', text: '@' + (prof.username || me.username) }));
  identity.appendChild(createEl('p', { className: 'muted small', text: 'Mantene tus datos al dia para que podamos contactarte cuando haya nuevas misiones.' }));

  if (roles && roles.length) {
    const badges = createEl('div', { className: 'badge-row profile-roles' });
    roles.forEach(r => {
      const label = (r === 'gato') ? 'shogun' : r;
      const cls = r === 'gato' ? 'badge role-shogun' : (r === 'sensei' ? 'badge role-sensei' : (r === 'shinobi' ? 'badge role-shinobi' : 'badge role-genin'));
      badges.appendChild(createEl('span', { className: cls, text: label }));
    });
    identity.appendChild(badges);
  }

  headerGrid.appendChild(identity);
  headerCard.appendChild(headerGrid);

  const detailsCard = createEl('div', { className: 'card profile-card profile-card-details' });
  detailsCard.appendChild(createEl('h3', { className: 'profile-card-title', text: 'Datos personales' }));
  detailsCard.appendChild(createEl('p', { className: 'muted small', text: 'Edita tu informacion basica y guarda los cambios para sincronizarla con el dojo.' }));

  const form = createEl('form', { className: 'cr-form profile-form', attrs: { autocomplete: 'off' } });
  const makeRow = (labelText, inputEl) => {
    const row = createEl('div', { className: 'form-row' });
    row.append(createEl('label', { text: labelText }));
    row.append(inputEl);
    return row;
  };

  const iName = createEl('input', { attrs: { type: 'text', value: prof.name || '' } });
  const iUser = createEl('input', { attrs: { type: 'text', value: prof.username || me.username, disabled: '' } });
  const iEmail = createEl('input', { attrs: { type: 'email', value: prof.email || '', placeholder: 'ejemplo@correo.com' } });
  const iPhone = createEl('input', { attrs: { type: 'tel', value: prof.phone || '', placeholder: '+52...' } });

  form.append(
    makeRow('Nombre', iName),
    makeRow('Usuario', iUser),
    makeRow('Correo', iEmail),
    makeRow('Celular', iPhone)
  );

  const infoHint = createEl('p', { className: 'hint', text: 'El usuario es de solo lectura. Usa un correo verificado y un celular activo.' });
  const actions = createEl('div', { className: 'form-actions' });
  const save = createEl('button', { className: 'btn btn-primary', text: 'Guardar cambios' });
  actions.appendChild(save);
  form.append(infoHint, actions);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    save.disabled = true;
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: iName.value, email: iEmail.value, phone: iPhone.value })
      });
      if (!res.ok) {
        let msg = 'No se pudo actualizar el perfil';
        try {
          const ct = (res.headers.get('content-type') || '').toLowerCase();
          const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text());
          msg = err?.error || err?.message || msg;
        } catch {}
        throw new Error(msg);
      }
      showModal('Perfil actualizado', { title: 'Listo' });
      updateAuthNav();
    } catch (err) {
      showModal(err.message || 'Error al guardar los cambios', { title: 'Error' });
    } finally {
      save.disabled = false;
    }
  });

  detailsCard.appendChild(form);

  const securityCard = createEl('div', { className: 'card profile-card profile-card-security' });
  securityCard.appendChild(createEl('h3', { className: 'profile-card-title', text: 'Seguridad' }));
  securityCard.appendChild(createEl('p', { className: 'muted small', text: 'Establece una contrasena robusta y unica. Nunca la compartas con nadie.' }));

  const securityForm = createEl('form', { className: 'cr-form security-form', attrs: { autocomplete: 'off' } });
  const buildPwdRow = (labelText, inputEl) => {
    const row = createEl('div', { className: 'form-row column' });
    row.append(createEl('label', { text: labelText }));
    row.append(inputEl);
    return row;
  };

  const currentInput = createEl('input', { attrs: { type: 'password', autocomplete: 'current-password', placeholder: '********' } });
  const newInput = createEl('input', { attrs: { type: 'password', autocomplete: 'new-password', placeholder: '********' } });
  const confirmInput = createEl('input', { attrs: { type: 'password', autocomplete: 'new-password', placeholder: '********' } });

  securityForm.append(
    buildPwdRow('Contrasena actual', currentInput),
    buildPwdRow('Nueva contrasena', newInput),
    buildPwdRow('Repite la nueva contrasena', confirmInput)
  );

  const policy = createEl('ul', { className: 'profile-policy' });
  const policyChecks = [
    { key: 'length', text: 'Minimo 8 caracteres', test: (pw) => (pw || '').length >= 8 },
    { key: 'upper', text: 'Al menos una mayuscula', test: (pw) => /[A-Z]/.test(pw || '') },
    { key: 'symbol', text: 'Al menos un simbolo (!@#$% etc.)', test: (pw) => /[^A-Za-z0-9]/.test(pw || '') }
  ];
  policyChecks.forEach(rule => {
    policy.appendChild(createEl('li', { attrs: { 'data-check': rule.key }, text: rule.text }));
  });
  securityForm.append(policy);

  const secActions = createEl('div', { className: 'form-actions start' });
  const secButton = createEl('button', { className: 'btn btn-primary', text: 'Actualizar contrasena' });
  secActions.appendChild(secButton);
  securityForm.append(secActions);

  const passwordRegex = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
  const updatePolicy = () => {
    const value = newInput.value || '';
    policyChecks.forEach(rule => {
      const li = policy.querySelector(`[data-check="${rule.key}"]`);
      if (!li) return;
      if (rule.test(value)) {
        li.classList.add('ok');
      } else {
        li.classList.remove('ok');
      }
    });
  };
  newInput.addEventListener('input', updatePolicy);

  securityForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    updatePolicy();
    const current = currentInput.value || '';
    const next = newInput.value || '';
    const confirm = confirmInput.value || '';

    if (!current || !next || !confirm) {
      showModal('Completa todos los campos antes de continuar.', { title: 'Error' });
      return;
    }
    if (next === current) {
      showModal('La nueva contrasena debe ser diferente a la actual.', { title: 'Error' });
      return;
    }
    if (!passwordRegex.test(next)) {
      showModal('La nueva contrasena no cumple los requisitos de seguridad.', { title: 'Error' });
      return;
    }
    if (next !== confirm) {
      showModal('Las contrasenas no coinciden.', { title: 'Error' });
      return;
    }

    secButton.disabled = true;
    try {
      const res = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: current, newPassword: next, confirmPassword: confirm })
      });
      if (!res.ok) {
        let msg = 'No se pudo actualizar la contrasena';
        try {
          const ct = (res.headers.get('content-type') || '').toLowerCase();
          const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text());
          msg = err?.error || err?.message || msg;
        } catch {}
        throw new Error(msg);
      }
      showModal('Contrasena actualizada', { title: 'Listo' });
      currentInput.value = '';
      newInput.value = '';
      confirmInput.value = '';
      updatePolicy();
    } catch (err) {
      showModal(err.message || 'No se pudo actualizar la contrasena', { title: 'Error' });
    } finally {
      secButton.disabled = false;
    }
  });

  securityCard.appendChild(securityForm);

  layout.append(headerCard, detailsCard, securityCard);
  container.appendChild(layout);
  wrap.appendChild(container);
  return wrap;
}

