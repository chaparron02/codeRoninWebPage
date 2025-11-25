import { createEl, showModal, updateAuthNav, getJSON } from '../lib/core.js'

export async function ProfilePage() {
  const wrap = createEl('section', { className: 'section page profile-page', attrs: { id: 'perfil' } });
  const container = createEl('div', { className: 'container profile-container' });
  container.appendChild(createEl('h2', { className: 'section-title', text: 'Perfil' }));

  const me = await getJSON('/api/auth/me', null);
  if (!me || !me.username) {
    const cc = createEl('div', { className: 'container' });
    cc.appendChild(createEl('h2', { className: 'section-title', text: '403 - Forbidden' }));
    cc.appendChild(createEl('p', { text: 'No tienes permisos para acceder a esta secci\u00f3n.' }));
    wrap.appendChild(cc);
    return wrap;
  }

  const prof = await getJSON('/api/user/profile', { username: '', name: '', email: '', phone: '', avatarUrl: '' });
  const rawRoles = Array.isArray(prof.roles) ? prof.roles : (me && Array.isArray(me.roles) ? me.roles : []);
  const roles = rawRoles.map(r => String(r || '').toLowerCase());
  const ROLE_LABELS = {
    gato: 'shogun',
    sensei: 'sensei',
    shinobi: 'shinobi',
    daimyo: 'daimyo',
    daymio: 'daimyo',
    genin: 'genin',
    cliente: 'cliente'
  };
  const toRoleLabel = (role) => {
    if (!role) return 'visitante';
    const normalized = String(role).toLowerCase();
    return ROLE_LABELS[normalized] || normalized;
  };
  const displayRoles = roles.length ? roles.map(toRoleLabel) : ['visitante'];
  const primaryRole = displayRoles[0];
  const isInstructor = roles.includes('sensei') || roles.includes('gato');

  const nav = document.getElementById('nav-links');
  const pergaminosLink = nav ? nav.querySelector('[data-id="nav-scrolls"]') : null;
  const trainingLink = nav ? nav.querySelector('[data-id="nav-training"]') : null;
  const reportLink = nav ? nav.querySelector('[data-id="nav-report"]') : null;
  if (nav) {
    const hasTrainingAccess = roles.some(r => ['gato','sensei','genin'].includes(r));
    const hasReportAccess = roles.some(r => ['gato','shinobi'].includes(r));
    if (!pergaminosLink && isInstructor) {
      const link = document.createElement('a');
      link.href = '/pergaminos';
      link.textContent = 'Pergaminos';
      link.setAttribute('data-id', 'nav-scrolls');
      nav.appendChild(link);
    } else if (pergaminosLink && !isInstructor) {
      pergaminosLink.remove();
    }
    if (!trainingLink && hasTrainingAccess) {
      const link = document.createElement('a');
      link.href = '/entrenamientos';
      link.textContent = 'Entrenamientos';
      link.setAttribute('data-id', 'nav-training');
      nav.appendChild(link);
    } else if (trainingLink && !hasTrainingAccess) {
      trainingLink.remove();
    }
    if (!reportLink && hasReportAccess) {
      const link = document.createElement('a');
      link.href = '/reporte';
      link.textContent = 'Reporte';
      link.setAttribute('data-id', 'nav-report');
      nav.appendChild(link);
    } else if (reportLink && !hasReportAccess) {
      reportLink.remove();
    }
  }

  const layout = createEl('div', { className: 'profile-layout neon-profile-layout' });
  const columnPrimary = createEl('div', { className: 'profile-column profile-column-primary' });
  const columnSecondary = createEl('div', { className: 'profile-column profile-column-secondary' });

  const headerCard = createEl('div', { className: 'card profile-card profile-card-header profile-card-holo' });
  const headerGrid = createEl('div', { className: 'profile-card-grid profile-holo-grid' });
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
  identity.appendChild(createEl('p', { className: 'profile-brief', text: 'Canal cifrado activo. Mant\u00e9n tus datos al d\u00eda para recibir nuevas misiones.' }));

  if (roles && roles.length) {
    const badges = createEl('div', { className: 'badge-row profile-roles' });
    roles.forEach(r => {
      const label = toRoleLabel(r);
      const cls = r === 'gato'
        ? 'badge role-shogun'
        : r === 'sensei'
          ? 'badge role-sensei'
          : r === 'shinobi'
            ? 'badge role-shinobi'
            : r === 'daimyo'
              ? 'badge role-daimyo'
              : 'badge role-genin';
      badges.appendChild(createEl('span', { className: cls, text: label }));
    });
    identity.appendChild(badges);
  }

  headerGrid.appendChild(identity);
  headerCard.appendChild(headerGrid);

  const holoStrip = createEl('div', { className: 'profile-holo-strip' });
  const stripData = [
    { label: 'Rol operativo', value: primaryRole },
    { label: 'Ubicaci\u00f3n', value: prof.location || prof.city || prof.country || 'Nodo reservado' },
    { label: 'Estado del perfil', value: prof.email && prof.phone ? 'Sincronizado' : 'Actualiza tus datos' }
  ];
  stripData.forEach((entry) => {
    const slot = createEl('span', { className: 'profile-holo-slot' });
    slot.appendChild(createEl('small', { text: entry.label }));
    slot.appendChild(createEl('strong', { text: entry.value }));
    holoStrip.appendChild(slot);
  });
  headerCard.appendChild(holoStrip);

  const statusCard = createEl('div', { className: 'card profile-card profile-card-status' });
  statusCard.appendChild(createEl('h3', { className: 'profile-card-title', text: 'Panel operativo' }));
  statusCard.appendChild(createEl('p', { className: 'muted small', text: 'Resumen en vivo de tu canal para Daimyo y comandancia.' }));

  const metricsGrid = createEl('div', { className: 'profile-metrics-grid' });
  const metrics = [
    { label: 'Roles activos', value: String(Math.max(displayRoles.length, 1)).padStart(2, '0'), detail: displayRoles.join(' \u00b7 ') },
    { label: 'Correo', value: prof.email ? 'OK' : 'PEND', detail: prof.email || 'Agrega un correo operativo' },
    { label: 'Celular', value: prof.phone ? 'OK' : 'FALTA', detail: prof.phone || 'Registra tu n\u00famero para alertas' }
  ];
  metrics.forEach((stat) => {
    const metric = createEl('div', { className: 'profile-metric' });
    metric.appendChild(createEl('span', { className: 'metric-value', text: stat.value }));
    metric.appendChild(createEl('span', { className: 'metric-label', text: stat.label }));
    metric.appendChild(createEl('p', { className: 'metric-detail', text: stat.detail }));
    metricsGrid.appendChild(metric);
  });
  statusCard.appendChild(metricsGrid);

  const tz = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  })();
  const statusStrip = createEl('div', { className: 'profile-status-strip' });
  [
    { label: 'Modo', value: roles.includes('shinobi') ? 'Campo activo' : 'Dojo y reportes' },
    { label: 'Zona horaria', value: tz || 'UTC' },
    { label: 'Sincronizaci\u00f3n', value: prof.email && prof.phone ? 'Completa' : 'Pendiente' }
  ].forEach((entry) => statusStrip.appendChild(createEl('span', { className: 'status-chip', text: `${entry.label}: ${entry.value}` })));
  statusCard.appendChild(statusStrip);

  const statusCtas = createEl('div', { className: 'profile-cta-row' });
  statusCtas.appendChild(createEl('a', { className: 'link-pill profile-link', text: 'Editar datos', attrs: { href: '#perfil-form' } }));
  statusCtas.appendChild(createEl('a', { className: 'link-pill profile-link secondary', text: 'Actualizar clave', attrs: { href: '#perfil-seguridad' } }));
  statusCard.appendChild(statusCtas);

  const detailsCard = createEl('div', { className: 'card profile-card profile-card-details' });
  detailsCard.appendChild(createEl('h3', { className: 'profile-card-title', text: 'Se\u00f1al de contacto' }));
  detailsCard.appendChild(createEl('p', { className: 'muted small', text: 'Edita tu informaci\u00f3n y sincroniza los canales de alerta del dojo.' }));

  const form = createEl('form', { className: 'cr-form profile-form', attrs: { id: 'perfil-form', autocomplete: 'off' } });
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
  securityCard.appendChild(createEl('h3', { className: 'profile-card-title', text: 'Blindaje de acceso' }));
  securityCard.appendChild(createEl('p', { className: 'muted small', text: 'Define una contrase\u00f1a robusta y exclusiva para este canal.' }));

  const securityForm = createEl('form', { className: 'cr-form security-form', attrs: { id: 'perfil-seguridad', autocomplete: 'off' } });
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
    buildPwdRow('Contrase\u00f1a actual', currentInput),
    buildPwdRow('Nueva contrase\u00f1a', newInput),
    buildPwdRow('Repite la nueva contrase\u00f1a', confirmInput)
  );

  const policy = createEl('ul', { className: 'profile-policy' });
  const policyChecks = [
    { key: 'length', text: 'M\u00ednimo 8 caracteres', test: (pw) => (pw || '').length >= 8 },
    { key: 'upper', text: 'Al menos una may\u00fascula', test: (pw) => /[A-Z]/.test(pw || '') },
    { key: 'symbol', text: 'Al menos un s\u00edmbolo (!@#$% etc.)', test: (pw) => /[^A-Za-z0-9]/.test(pw || '') }
  ];
  policyChecks.forEach(rule => {
    policy.appendChild(createEl('li', { attrs: { 'data-check': rule.key }, text: rule.text }));
  });
  securityForm.append(policy);

  const secActions = createEl('div', { className: 'form-actions start' });
  const secButton = createEl('button', { className: 'btn btn-primary', text: 'Actualizar contrase\u00f1a' });
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
      showModal('La nueva contrase\u00f1a debe ser diferente a la actual.', { title: 'Error' });
      return;
    }
    if (!passwordRegex.test(next)) {
      showModal('La nueva contrase\u00f1a no cumple los requisitos de seguridad.', { title: 'Error' });
      return;
    }
    if (next !== confirm) {
      showModal('Las contrase\u00f1as no coinciden.', { title: 'Error' });
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
        let msg = 'No se pudo actualizar la contrase\u00f1a';
        try {
          const ct = (res.headers.get('content-type') || '').toLowerCase();
          const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text());
          msg = err?.error || err?.message || msg;
        } catch {}
        throw new Error(msg);
      }
      showModal('Contrase\u00f1a actualizada', { title: 'Listo' });
      currentInput.value = '';
      newInput.value = '';
      confirmInput.value = '';
      updatePolicy();
    } catch (err) {
      showModal(err.message || 'No se pudo actualizar la contrase\u00f1a', { title: 'Error' });
    } finally {
      secButton.disabled = false;
    }
  });

  securityCard.appendChild(securityForm);

  columnPrimary.append(headerCard, statusCard);
  columnSecondary.append(detailsCard, securityCard);
  layout.append(columnPrimary, columnSecondary);
  container.appendChild(layout);
  wrap.appendChild(container);
  return wrap;
}
