import { createEl, showModal, navigate, updateAuthNav, getJSON, setToken, getToken } from '../lib/core.js';

const DELETE_SECRET = 'gatito';

function requireSecret() {
  const value = window.prompt('Clave de seguridad');
  if (value === null) return false;
  if (value !== DELETE_SECRET) {
    showModal('Clave incorrecta', { title: 'Error' });
    return false;
  }
  return true;
}

function info(text) {
  return createEl('p', { className: 'muted small', text });
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function csvButton(label, url, filename) {
  const btn = createEl('button', { className: 'btn btn-primary btn-sm', text: label });
  btn.addEventListener('click', async () => {
    try {
      const token = getToken();
      const res = await fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {}, credentials: 'include' });
      if (!res.ok) throw new Error('No se pudo descargar');
      const blob = await res.blob();
      const anchor = document.createElement('a');
      anchor.href = URL.createObjectURL(blob);
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => { URL.revokeObjectURL(anchor.href); anchor.remove(); }, 150);
    } catch (err) {
      showModal(err.message || 'No se pudo descargar', { title: 'Error' });
    }
  });
  return btn;
}

function buildStat(label, value) {
  const box = createEl('div', { className: 'stat' });
  box.appendChild(createEl('div', { className: 'label', text: label }));
  box.appendChild(createEl('div', { className: 'value', text: String(value) }));
  return box;
}

export async function AdminPage() {
  const wrap = createEl('section', { className: 'section page', attrs: { id: 'admin' } });
  const root = createEl('div', { className: 'container admin-container' });
  root.appendChild(createEl('h2', { className: 'section-title', text: 'Panel Admin' }));

  const token = getToken();
  let me = null;
  if (token) {
    try { me = await getJSON('/api/auth/me', null); } catch {}
  }
  if (!me || !Array.isArray(me.roles) || !me.roles.includes('gato')) {
    navigate('/login', { replace: true });
    return wrap;
  }
  updateAuthNav();

  const badgeRow = createEl('div', { className: 'badge-row' });
  badgeRow.appendChild(createEl('span', { className: 'badge', text: `Usuario: ${me.username}` }));
  const logout = createEl('button', { className: 'btn', text: 'Salir' });
  logout.addEventListener('click', async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
    setToken('');
    navigate('/admin');
  });
  badgeRow.appendChild(logout);
  root.appendChild(badgeRow);

  const tabs = createEl('div', { className: 'admin-tabs' });
  const btnDash = createEl('button', { className: 'btn active', text: 'Dashboard' });
  const btnReq = createEl('button', { className: 'btn', text: 'Solicitudes' });
  const btnMissions = createEl('button', { className: 'btn', text: 'Misiones' });
  const btnPdfs = createEl('button', { className: 'btn', text: 'PDFs' });
  const btnTools = createEl('button', { className: 'btn', text: 'Herramientas' });
  const btnUsers = createEl('button', { className: 'btn', text: 'Usuarios' });
  tabs.append(btnDash, btnReq, btnMissions, btnPdfs, btnTools, btnUsers);
  root.appendChild(tabs);

  const split = createEl('div', { className: 'admin-split' });
  split.style.setProperty('--left', '320px');
  const left = createEl('div', { className: 'admin-pane left' });
  const handle = createEl('div', { className: 'split-handle', attrs: { role: 'separator', 'aria-orientation': 'vertical' } });
  const right = createEl('div', { className: 'admin-pane right' });
  split.append(left, handle, right);
  root.appendChild(split);

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startLeft = parseInt(getComputedStyle(split).getPropertyValue('--left')) || 320;
    const onMove = (ev) => {
      const next = Math.max(220, Math.min(600, startLeft + (ev.clientX - startX)));
      split.style.setProperty('--left', `${next}px`);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  function setTab(btn) {
    [btnDash, btnReq, btnMissions, btnPdfs, btnTools, btnUsers].forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  async function showDashboard() {
    setTab(btnDash);
    left.innerHTML = '';
    right.innerHTML = '';
    left.append(createEl('h3', { text: 'Resumen' }), info('Metricas generales del sistema.'));
    try {
      const stats = await getJSON('/api/admin/stats', { coursesCount: 0, missionsCount: 0, usersCount: 0 });
      const grid = createEl('div', { className: 'stat-grid' });
      grid.append(buildStat('Form. Cursos', stats.coursesCount || 0));
      grid.append(buildStat('Form. Misiones', stats.missionsCount || 0));
      grid.append(buildStat('Usuarios', stats.usersCount || 0));
      right.appendChild(grid);
    } catch {
      right.appendChild(info('No se pudo cargar el dashboard.'));
    }
  }

  async function showRequests() {
    setTab(btnReq);
    left.innerHTML = '';
    right.innerHTML = '';
    left.append(createEl('h3', { text: 'Solicitudes' }), info('Revisa formularios recibidos.'));

    const state = {
      active: 'course',
      data: {
        course: await getJSON('/api/forms/course', []),
        mission: await getJSON('/api/forms/mission', []),
      },
    };

    const switcher = createEl('div', { className: 'pill-group' });
    const btnCourse = createEl('button', { className: 'pill active', text: 'Cursos' });
    const btnMission = createEl('button', { className: 'pill', text: 'Misiones' });
    switcher.append(btnCourse, btnMission);
    left.appendChild(switcher);

    const listCard = createEl('div', { className: 'card' });
    right.appendChild(listCard);

    const render = () => {
      listCard.innerHTML = '';
      const current = state.data[state.active] || [];
      const header = createEl('div', { className: 'panel-header', text: state.active === 'course' ? 'Solicitudes de cursos' : 'Solicitudes de misiones' });
      header.appendChild(createEl('span', { className: 'muted tiny', text: `${current.length} registros` }));
      const url = state.active === 'course' ? '/api/forms/course.csv' : '/api/forms/mission.csv';
      const filename = state.active === 'course' ? 'course_inquiries.csv' : 'mission_inquiries.csv';
      header.appendChild(csvButton('Exportar CSV', url, filename));
      listCard.appendChild(header);

      if (!current.length) {
        listCard.appendChild(info('No hay solicitudes en esta categoria.'));
        return;
      }

      current.forEach(item => {
        const row = createEl('div', { className: 'request-card' });
        row.appendChild(createEl('h4', { text: item.nombre || item.email || 'Solicitud' }));
        if (item.email) row.appendChild(info(item.email));
        row.appendChild(info(formatDate(item.createdAt)));
        const remove = createEl('button', { className: 'btn btn-danger btn-sm', text: 'Eliminar' });
        remove.addEventListener('click', async () => {
          if (!requireSecret()) return;
          try {
            const endpoint = state.active === 'course'
              ? `/api/forms/course/${encodeURIComponent(item._id)}`
              : `/api/forms/mission/${encodeURIComponent(item._id)}`;
            const res = await fetch(endpoint, { method: 'DELETE', headers: token ? { authorization: `Bearer ${token}` } : {}, credentials: 'include' });
            if (!res.ok) throw new Error();
            state.data[state.active] = current.filter(x => x._id !== item._id);
            render();
          } catch {
            showModal('No se pudo eliminar la solicitud', { title: 'Error' });
          }
        });
        row.appendChild(remove);
        listCard.appendChild(row);
      });
    };

    btnCourse.addEventListener('click', () => {
      state.active = 'course';
      btnCourse.classList.add('active');
      btnMission.classList.remove('active');
      render();
    });
    btnMission.addEventListener('click', () => {
      state.active = 'mission';
      btnMission.classList.add('active');
      btnCourse.classList.remove('active');
      render();
    });
    render();
  }

  async function showMissions() {
    setTab(btnMissions);
    left.innerHTML = '';
    right.innerHTML = '';
    left.append(createEl('h3', { text: 'Misiones' }), info('Crea misiones y asigna shinobi.'));

    const [missions, users] = await Promise.all([
      getJSON('/api/admin/missions', []),
      getJSON('/api/admin/users', []),
    ]);

    const shinobiOptions = users.filter(u => Array.isArray(u.roles) && u.roles.includes('shinobi'));
    const shogunOptions = users.filter(u => Array.isArray(u.roles) && u.roles.includes('gato'));

    const formCard = createEl('div', { className: 'card' });
    formCard.appendChild(createEl('h3', { text: 'Nueva mision' }));
    formCard.appendChild(info('Define titulo, servicio y shinobi.'));
    const form = createEl('form', { className: 'cr-form' });
    const titleInput = createEl('input', { attrs: { type: 'text', placeholder: 'Titulo', required: '' } });
    const serviceInput = createEl('input', { attrs: { type: 'text', placeholder: 'Servicio', required: '' } });
    const summaryInput = createEl('textarea', { attrs: { rows: '2', placeholder: 'Resumen (opcional)' } });
    const shinobiSelect = document.createElement('select');
    shinobiSelect.className = 'access-select';
    shinobiSelect.appendChild(new Option('Selecciona shinobi', '', true, true));
    shinobiOptions.forEach(u => shinobiSelect.appendChild(new Option(u.username || u._id, u._id)));
    const shogunSelect = document.createElement('select');
    shogunSelect.className = 'access-select';
    shogunSelect.appendChild(new Option('Asignar shogun (opcional)', '', true, true));
    shogunOptions.forEach(u => shogunSelect.appendChild(new Option(u.username || u._id, u._id)));

    const addRow = (label, field) => {
      const row = createEl('div', { className: 'form-row' });
      row.append(createEl('label', { text: label }), field);
      form.appendChild(row);
    };
    addRow('Titulo', titleInput);
    addRow('Servicio', serviceInput);
    addRow('Resumen', summaryInput);
    addRow('Shinobi', shinobiSelect);
    addRow('Shogun', shogunSelect);
    const submit = createEl('button', { className: 'btn btn-primary', text: 'Crear mision' });
    const actions = createEl('div', { className: 'form-actions start' });
    actions.appendChild(submit);
    form.appendChild(actions);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submit.disabled = true;
      try {
        const payload = {
          title: titleInput.value.trim(),
          service: serviceInput.value.trim(),
          summary: summaryInput.value.trim(),
          shinobiId: shinobiSelect.value || '',
          shogunId: shogunSelect.value || '',
        };
        if (!payload.title || !payload.service || !payload.shinobiId) throw new Error('Completa los campos requeridos');
        const res = await fetch('/api/admin/missions', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('No se pudo crear la mision');
        const created = await res.json();
        missions.unshift(created);
        titleInput.value = '';
        serviceInput.value = '';
        summaryInput.value = '';
        shinobiSelect.value = '';
        shogunSelect.value = '';
        renderList();
      } catch (err) {
        showModal(err.message || 'No se pudo crear la mision', { title: 'Error' });
      } finally {
        submit.disabled = false;
      }
    });
    formCard.appendChild(form);
    right.appendChild(formCard);

    const listCard = createEl('div', { className: 'card mission-list' });
    right.appendChild(listCard);

    function renderList() {
      listCard.innerHTML = '';
      listCard.appendChild(createEl('h3', { text: `Misiones (${missions.length})` }));
      if (!missions.length) {
        listCard.appendChild(info('Aun no hay misiones activas.'));
        return;
      }
      missions.forEach(item => {
        const card = createEl('div', { className: 'mission-card' });
        card.appendChild(createEl('h4', { text: item.title || 'Mision' }));
        card.appendChild(info(`Servicio: ${item.service || 'N/A'}`));
        if (item.summary) card.appendChild(info(item.summary));
        if (item.client) card.appendChild(info(`Shinobi: ${item.client.username || item.client.id}`));
        if (item.shogun) card.appendChild(info(`Shogun: ${item.shogun.username || item.shogun.id}`));
        card.appendChild(info(`Estado: ${item.status || 'iniciando'} | Progreso: ${item.progress || 0}%`));
        card.appendChild(info(`Actualizado: ${formatDate(item.updatedAt || item.createdAt)}`));

        const actions = createEl('div', { className: 'mission-actions' });
        const shinobiSel = document.createElement('select');
        shinobiSel.className = 'access-select';
        shinobiSel.appendChild(new Option('Asignar shinobi', '', true, true));
        shinobiOptions.forEach(u => shinobiSel.appendChild(new Option(u.username || u._id, u._id)));
        shinobiSel.value = item.client ? item.client.id : '';

        const shogunSel = document.createElement('select');
        shogunSel.className = 'access-select';
        shogunSel.appendChild(new Option('Asignar shogun', '', true, true));
        shogunOptions.forEach(u => shogunSel.appendChild(new Option(u.username || u._id, u._id)));
        shogunSel.value = item.shogun ? item.shogun.id : '';

        const save = createEl('button', { className: 'btn btn-primary btn-sm', text: 'Actualizar' });
        save.addEventListener('click', async () => {
          try {
            const payload = {
              shinobiId: shinobiSel.value || '',
              shogunId: shogunSel.value || '',
            };
            const res = await fetch(`/api/admin/missions/${encodeURIComponent(item.id)}`, {
              method: 'PUT',
              headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('No se pudo actualizar');
            const updated = await res.json();
            const idx = missions.findIndex(m => m.id === updated.id);
            if (idx >= 0) missions[idx] = updated;
            renderList();
          } catch (err) {
            showModal(err.message || 'No se pudo actualizar la mision', { title: 'Error' });
          }
        });

        const remove = createEl('button', { className: 'btn btn-danger btn-sm', text: 'Eliminar' });
        remove.addEventListener('click', async () => {
          if (!requireSecret()) return;
          try {
            const res = await fetch(`/api/admin/missions/${encodeURIComponent(item.id)}`, {
              method: 'DELETE',
              headers: token ? { authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error();
            const idx = missions.findIndex(m => m.id === item.id);
            if (idx >= 0) missions.splice(idx, 1);
            renderList();
          } catch {
            showModal('No se pudo eliminar la mision', { title: 'Error' });
          }
        });

        const view = createEl('a', { className: 'btn btn-ghost btn-sm', text: 'Ver reporte', attrs: { href: `/reporte?id=${encodeURIComponent(item.id)}` } });
        actions.append(shinobiSel, shogunSel, save, remove, view);
        card.appendChild(actions);
        listCard.appendChild(card);
      });
    }

    renderList();
  }

  async function showPdfs() {
    setTab(btnPdfs);
    left.innerHTML = '';
    right.innerHTML = '';
    left.append(
      createEl('h3', { text: 'PDFs' }),
      info('Sube PDF individuales para que aparezcan en la Armeria.')
    );

    const formCard = createEl('div', { className: 'card' });
    formCard.appendChild(createEl('h3', { text: 'Subir PDF' }));
    const form = createEl('form', { className: 'cr-form' });
    const fileRow = createEl('div', { className: 'form-row' });
    const fileInput = createEl('input', { attrs: { type: 'file', accept: '.pdf', required: '' } });
    fileRow.append(createEl('label', { text: 'Archivo PDF' }), fileInput);
    form.appendChild(fileRow);
    const submit = createEl('button', { className: 'btn btn-primary', text: 'Subir PDF' });
    const actions = createEl('div', { className: 'form-actions start' });
    actions.appendChild(submit);
    form.appendChild(actions);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!fileInput.files || !fileInput.files[0]) {
        showModal('Selecciona un PDF antes de subir', { title: 'Aviso' });
        return;
      }
      submit.disabled = true;
      try {
        const body = new FormData();
        body.append('file', fileInput.files[0]);
        const headers = token ? { authorization: `Bearer ${token}` } : {};
        const res = await fetch('/api/admin/upload/pdf', { method: 'POST', headers, body });
        if (!res.ok) throw new Error('No se pudo subir el PDF');
        fileInput.value = '';
        await loadList();
        showModal('PDF subido correctamente', { title: 'Listo' });
      } catch (err) {
        showModal(err.message || 'No se pudo subir el PDF', { title: 'Error' });
      } finally {
        submit.disabled = false;
      }
    });
    formCard.appendChild(form);
    right.appendChild(formCard);

    const listCard = createEl('div', { className: 'card' });
    listCard.appendChild(createEl('h3', { text: 'Biblioteca' }));
    const listWrap = createEl('div', { className: 'pdf-admin-list' });
    listCard.appendChild(listWrap);
    right.appendChild(listCard);

    async function loadList() {
      const list = await getJSON('/api/pdfs.json', []);
      listWrap.innerHTML = '';
      if (!list.length) {
        listWrap.appendChild(info('Aun no hay PDFs subidos.'));
        return;
      }
      list.forEach(item => {
        const row = createEl('div', { className: 'pdf-admin-item' });
        row.appendChild(createEl('strong', { text: item.name }));
        const actions = createEl('div', { className: 'pdf-admin-actions' });
        const link = createEl('a', { className: 'btn btn-sm btn-ghost', text: 'Ver', attrs: { href: item.url, target: '_blank', rel: 'noopener noreferrer' } });
        actions.appendChild(link);
        row.appendChild(actions);
        listWrap.appendChild(row);
      });
    }

    loadList();
  }

  async function showTools() {
    setTab(btnTools);
    left.innerHTML = '';
    right.innerHTML = '';
    left.append(
      createEl('h3', { text: 'Herramientas' }),
      info('Publica scripts, plantillas y utilidades que apareceran en la Armeria.')
    );

    const tools = await getJSON('/api/admin/tools', []);

    const formCard = createEl('div', { className: 'card' });
    formCard.appendChild(createEl('h3', { text: 'Nueva herramienta' }));
    const form = createEl('form', { className: 'cr-form' });
    const addRow = (label, field) => {
      const row = createEl('div', { className: 'form-row' });
      row.append(createEl('label', { text: label }), field);
      form.appendChild(row);
    };
    const titleInput = createEl('input', { attrs: { type: 'text', placeholder: 'Nombre', required: '' } });
    const descInput = createEl('textarea', { attrs: { rows: '2', placeholder: 'Descripcion corta' } });
    const linkInput = createEl('input', { attrs: { type: 'url', placeholder: 'https://tu-herramienta' } });
    const imageInput = createEl('input', { attrs: { type: 'text', placeholder: '/assets/material/tool.webp' } });
    const tagsInput = createEl('input', { attrs: { type: 'text', placeholder: 'tags separados por coma' } });
    const publishWrap = createEl('div', { className: 'toggle-field' });
    const publishInput = document.createElement('input');
    publishInput.type = 'checkbox';
    const publishText = createEl('span', { className: 'muted small', text: 'Mostrar al instante en Armeria' });
    publishWrap.append(publishInput, publishText);
    addRow('Titulo', titleInput);
    addRow('Descripcion', descInput);
    addRow('Link', linkInput);
    addRow('Imagen', imageInput);
    addRow('Tags', tagsInput);
    addRow('Publicada', publishWrap);
    const submit = createEl('button', { className: 'btn btn-primary', text: 'Agregar' });
    const actions = createEl('div', { className: 'form-actions start' });
    actions.appendChild(submit);
    form.appendChild(actions);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submit.disabled = true;
      try {
        const payload = {
          title: titleInput.value.trim(),
          description: descInput.value.trim(),
          link: linkInput.value.trim(),
          image: imageInput.value.trim(),
          tags: tagsInput.value.split(',').map(t => t.trim()).filter(Boolean),
          isPublished: publishInput.checked,
        };
        if (!payload.title) throw new Error('El titulo es obligatorio');
        const res = await fetch('/api/admin/tools', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('No se pudo crear la herramienta');
        const created = await res.json();
        tools.unshift(created);
        titleInput.value = '';
        descInput.value = '';
        linkInput.value = '';
        imageInput.value = '';
        tagsInput.value = '';
        publishInput.checked = false;
        renderList();
      } catch (err) {
        showModal(err.message || 'No se pudo crear la herramienta', { title: 'Error' });
      } finally {
        submit.disabled = false;
      }
    });
    formCard.appendChild(form);
    right.appendChild(formCard);

    const listCard = createEl('div', { className: 'card tool-list' });
    right.appendChild(listCard);

    const makeRow = (label, field) => {
      const row = createEl('div', { className: 'form-row' });
      row.append(createEl('label', { text: label }), field);
      return row;
    };

    function renderList() {
      listCard.innerHTML = '';
      listCard.appendChild(createEl('h3', { text: `Herramientas (${tools.length})` }));
      if (!tools.length) {
        listCard.appendChild(info('Aun no has agregado herramientas.'));
        return;
      }
      tools.forEach((tool) => {
        const card = createEl('div', { className: 'tool-card' });
        const header = createEl('div', { className: 'tool-card-head' });
        header.appendChild(createEl('h4', { text: tool.title || 'Herramienta' }));
        const status = createEl('span', { className: tool.isPublished ? 'badge role-shogun' : 'badge', text: tool.isPublished ? 'Publicada' : 'Borrador' });
        header.appendChild(status);
        card.appendChild(header);

        const formWrap = createEl('div', { className: 'tool-form' });
        const titleField = createEl('input', { attrs: { type: 'text' } });
        titleField.value = tool.title || '';
        formWrap.appendChild(makeRow('Titulo', titleField));
        const descField = createEl('textarea', { attrs: { rows: '2' } });
        descField.value = tool.description || '';
        formWrap.appendChild(makeRow('Descripcion', descField));
        const linkField = createEl('input', { attrs: { type: 'text' } });
        linkField.value = tool.link || '';
        formWrap.appendChild(makeRow('Link', linkField));
        const imageField = createEl('input', { attrs: { type: 'text' } });
        imageField.value = tool.image || '';
        formWrap.appendChild(makeRow('Imagen', imageField));
        const tagsField = createEl('input', { attrs: { type: 'text' } });
        tagsField.value = Array.isArray(tool.tags) ? tool.tags.join(', ') : '';
        formWrap.appendChild(makeRow('Tags', tagsField));
        const publishField = createEl('div', { className: 'toggle-field' });
        const publishToggle = document.createElement('input');
        publishToggle.type = 'checkbox';
        publishToggle.checked = !!tool.isPublished;
        const publishHint = createEl('span', { className: 'muted small', text: 'Visible' });
        publishField.append(publishToggle, publishHint);
        formWrap.appendChild(makeRow('Publicada', publishField));

        const btnRow = createEl('div', { className: 'form-actions start' });
        const save = createEl('button', { className: 'btn btn-primary btn-sm', text: 'Guardar' });
        const remove = createEl('button', { className: 'btn btn-danger btn-sm', text: 'Eliminar' });
        btnRow.append(save, remove);
        formWrap.appendChild(btnRow);
        card.appendChild(formWrap);
        listCard.appendChild(card);

        save.addEventListener('click', async () => {
          save.disabled = true;
          try {
            const payload = {
              title: titleField.value.trim(),
              description: descField.value.trim(),
              link: linkField.value.trim(),
              image: imageField.value.trim(),
              tags: tagsField.value.split(',').map(t => t.trim()).filter(Boolean),
              isPublished: publishToggle.checked,
            };
            if (!payload.title) throw new Error('El titulo es obligatorio');
            const res = await fetch(`/api/admin/tools/${encodeURIComponent(tool.id)}`, {
              method: 'PUT',
              headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('No se pudo actualizar la herramienta');
            const updated = await res.json();
            const idx = tools.findIndex(t => t.id === tool.id);
            if (idx >= 0) tools[idx] = updated;
            renderList();
          } catch (err) {
            showModal(err.message || 'No se pudo actualizar la herramienta', { title: 'Error' });
          } finally {
            save.disabled = false;
          }
        });

        remove.addEventListener('click', async () => {
          if (!requireSecret()) return;
          remove.disabled = true;
          try {
            const res = await fetch(`/api/admin/tools/${encodeURIComponent(tool.id)}`, {
              method: 'DELETE',
              headers: token ? { authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error('No se pudo eliminar la herramienta');
            const idx = tools.findIndex(t => t.id === tool.id);
            if (idx >= 0) tools.splice(idx, 1);
            renderList();
          } catch (err) {
            showModal(err.message || 'No se pudo eliminar la herramienta', { title: 'Error' });
          } finally {
            remove.disabled = false;
          }
        });
      });
    }

    renderList();
  }

  async function showUsers() {
    setTab(btnUsers);
    left.innerHTML = '';
    right.innerHTML = '';
    left.append(createEl('h3', { text: 'Usuarios' }), info('Actualiza roles y accesos manuales.'));

    const tableWrap = createEl('div', { className: 'table-wrap' });
    const table = createEl('table', { className: 'table users-table' });
    tableWrap.appendChild(table);
    right.appendChild(tableWrap);

    const [users, courses] = await Promise.all([
      getJSON('/api/admin/users', []),
      getJSON('/api/courses.json', []),
    ]);

    const courseOptions = courses
      .filter(c => (c.modalidad || 'virtual') === 'virtual')
      .map(c => {
        const id = c && (c._id || c.id || c.title || c.name);
        if (!id) return null;
        return { id: String(id), label: c.title || c.name || String(id) };
      })
      .filter(Boolean);

    const thead = createEl('thead');
    const head = createEl('tr');
    ['usuario','roles','accesos','activo','creado'].forEach(label => head.appendChild(createEl('th', { text: label })));
    thead.appendChild(head);
    const tbody = createEl('tbody');

    users.forEach(user => {
      const tr = createEl('tr');
      tr.appendChild(createEl('td', { text: user.username }));

      const roleCell = createEl('td');
      const rolesSet = new Set(Array.isArray(user.roles) ? user.roles : []);
      ['genin','shinobi','sensei','gato'].forEach(role => {
        const label = document.createElement('label');
        label.style.marginRight = '8px';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = rolesSet.has(role);
        cb.setAttribute('data-role', role);
        label.append(cb, document.createTextNode(` ${role}`));
        roleCell.appendChild(label);
      });
      tr.appendChild(roleCell);

      const accessCell = createEl('td');
      const access = user.access && typeof user.access === 'object' ? user.access : {};
      const assignedCourses = new Set(Array.isArray(access.courses) ? access.courses.map(String) : []);
      const assignedServices = new Set(Array.isArray(access.services) ? access.services.map(String) : []);

      const courseBlock = createEl('div', { className: 'access-block' });
      courseBlock.appendChild(createEl('label', { className: 'muted small', text: 'Cursos (virtuales)' }));
      const courseChips = createEl('div', { className: 'access-chip-row' });
      const renderChips = () => {
        courseChips.innerHTML = '';
        if (!assignedCourses.size) {
          courseChips.appendChild(createEl('span', { className: 'muted tiny', text: 'Sin cursos asignados' }));
          return;
        }
        assignedCourses.forEach(id => {
          const chip = createEl('span', { className: 'access-chip' });
          const opt = courseOptions.find(o => o.id === id);
          chip.appendChild(document.createTextNode(opt ? opt.label : id));
          const remove = createEl('button', { className: 'access-chip-remove', text: 'x', attrs: { type: 'button' } });
          remove.addEventListener('click', () => {
            assignedCourses.delete(id);
            renderChips();
          });
          chip.appendChild(remove);
          courseChips.appendChild(chip);
        });
      };
      renderChips();

      const courseSelect = document.createElement('select');
      courseSelect.className = 'access-select';
      courseSelect.appendChild(new Option('Agregar curso', '', true, true));
      courseOptions.forEach(opt => courseSelect.appendChild(new Option(opt.label, opt.id)));
      courseSelect.addEventListener('change', () => {
        const val = courseSelect.value;
        if (val) {
          assignedCourses.add(val);
          renderChips();
          courseSelect.value = '';
        }
      });
      courseBlock.append(courseChips, courseSelect);

      const serviceBlock = createEl('div', { className: 'access-block' });
      serviceBlock.appendChild(createEl('label', { className: 'muted small', text: 'Servicios/Misiones' }));
      const serviceArea = createEl('textarea', { className: 'access-services', attrs: { rows: '2', placeholder: 'IDs uno por linea' } });
      serviceArea.value = Array.from(assignedServices).join('\n');
      serviceBlock.appendChild(serviceArea);

      accessCell.append(courseBlock, serviceBlock);
      tr.appendChild(accessCell);

      const actionsCell = createEl('td');
      const toggleBtn = createEl('button', { className: 'btn', text: user.active ? 'Desactivar' : 'Activar' });
      const saveBtn = createEl('button', { className: 'btn btn-primary', text: 'Guardar' });
      saveBtn.style.marginLeft = '8px';

      toggleBtn.addEventListener('click', async () => {
        try {
          const res = await fetch(`/api/admin/users/${user._id}/toggle-active`, {
            method: 'PUT',
            headers: token ? { authorization: `Bearer ${token}` } : {},
          });
          const result = await res.json();
          toggleBtn.textContent = result.active ? 'Desactivar' : 'Activar';
        } catch {}
      });

      saveBtn.addEventListener('click', async () => {
        try {
          const roleChecks = Array.from(roleCell.querySelectorAll('input[type="checkbox"][data-role]'));
          const roles = roleChecks.filter(x => x.checked).map(x => x.getAttribute('data-role'));
          const headers = { 'content-type': 'application/json' };
          if (token) headers['authorization'] = `Bearer ${token}`;
          const resRoles = await fetch(`/api/admin/users/${user._id}/roles`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ roles }),
          });
          if (!resRoles.ok) throw new Error();
          const coursesPayload = Array.from(assignedCourses);
          const servicesPayload = serviceArea.value.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean);
          const resAccess = await fetch(`/api/admin/access-map/${user._id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ courses: coursesPayload, services: servicesPayload }),
          });
          if (!resAccess.ok) throw new Error();
          showModal('Roles y accesos actualizados', { title: 'Listo' });
        } catch {
          showModal('No se pudieron actualizar los datos', { title: 'Error' });
        }
      });

      actionsCell.append(toggleBtn, saveBtn);
      tr.appendChild(actionsCell);
      tr.appendChild(createEl('td', { text: (user.createdAt || '').split('T')[0] }));
      tbody.appendChild(tr);
    });

    table.append(thead, tbody);
  }

  btnDash.addEventListener('click', showDashboard);
  btnReq.addEventListener('click', showRequests);
  btnMissions.addEventListener('click', showMissions);
  btnPdfs.addEventListener('click', showPdfs);
  btnTools.addEventListener('click', showTools);
  btnUsers.addEventListener('click', showUsers);

  await showDashboard();

  wrap.appendChild(root);
  return wrap;
}
