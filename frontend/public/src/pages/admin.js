import { createEl, showModal, navigate, updateAuthNav, getJSON, setToken, getToken, requestJutsu } from '../lib/core.js';

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
  const btnCourses = createEl('button', { className: 'btn', text: 'Nuevos pergaminos' });
  const btnUsers = createEl('button', { className: 'btn', text: 'Usuarios' });
  tabs.append(btnDash, btnReq, btnMissions, btnCourses, btnUsers);
  root.appendChild(tabs);

  const split = createEl('div', { className: 'admin-split' });
  split.style.setProperty('--left', '440px');
  const left = createEl('div', { className: 'admin-pane left' });
  const handle = createEl('div', { className: 'split-handle', attrs: { role: 'separator', 'aria-orientation': 'vertical' } });
  const right = createEl('div', { className: 'admin-pane right' });
  split.append(left, handle, right);
  root.appendChild(split);

  handle.addEventListener('mousedown', (e) => {
    if (handle.classList.contains('hidden')) return;
    e.preventDefault();
    const startX = e.clientX;
    const startLeft = parseInt(getComputedStyle(split).getPropertyValue('--left')) || 440;
    const onMove = (ev) => {
      const next = Math.max(320, Math.min(720, startLeft + (ev.clientX - startX)));
      split.style.setProperty('--left', `${next}px`);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  function setLayout({ showRight = true, leftWidth = 440, expandRight = false } = {}) {
    const width = Math.max(320, Math.min(720, leftWidth));
    split.style.setProperty('--left', `${width}px`);
    if (showRight) {
      split.classList.remove('single');
      handle.classList.remove('hidden');
      right.classList.remove('hidden');
      if (expandRight) right.classList.add('expand'); else right.classList.remove('expand');
    } else {
      split.classList.add('single');
      handle.classList.add('hidden');
      right.classList.remove('expand');
      right.classList.add('hidden');
    }
  }

  function setTab(btn) {
    [btnDash, btnReq, btnMissions, btnCourses, btnUsers].forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  async function showDashboard() {
    setTab(btnDash);
    setLayout({ showRight: true, leftWidth: 420, expandRight: true });
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
    setLayout({ showRight: true, leftWidth: 400, expandRight: true });
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
          const jutsu = requestJutsu('Ingresa el jutsu sagrado para eliminar');
          if (!jutsu) return;
          try {
            const endpoint = state.active === 'course'
              ? `/api/forms/course/${encodeURIComponent(item._id)}`
              : `/api/forms/mission/${encodeURIComponent(item._id)}`;
            const headers = { 'content-type': 'application/json', 'accept': 'application/json' };
            if (token) headers.authorization = `Bearer ${token}`;
            const res = await fetch(endpoint, {
              method: 'DELETE',
              headers,
              credentials: 'include',
              body: JSON.stringify({ jutsu })
            });
            if (!res.ok) {
              let msg = 'No se pudo eliminar la solicitud';
              try {
                const ct = (res.headers.get('content-type') || '').toLowerCase();
                const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text());
                msg = err?.error || err?.message || msg;
              } catch {}
              throw new Error(msg);
            }
            state.data[state.active] = current.filter(x => x._id !== item._id);
            render();
          } catch (err) {
            showModal(err.message || 'No se pudo eliminar la solicitud', { title: 'Error' });
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
    setLayout({ showRight: true, leftWidth: 420, expandRight: true });
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
          const jutsu = requestJutsu('Ingresa el jutsu sagrado para eliminar la mision');
          if (!jutsu) return;
          try {
            const headers = { 'content-type': 'application/json', 'accept': 'application/json' };
            if (token) headers.authorization = `Bearer ${token}`;
            const res = await fetch(`/api/admin/missions/${encodeURIComponent(item.id)}`, {
              method: 'DELETE',
              headers,
              body: JSON.stringify({ jutsu }),
            });
            if (!res.ok) {
              let msg = 'No se pudo eliminar la mision';
              try {
                const ct = (res.headers.get('content-type') || '').toLowerCase();
                const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text());
                msg = err?.error || err?.message || msg;
              } catch {}
              throw new Error(msg);
            }
            const idx = missions.findIndex(m => m.id === item.id);
            if (idx >= 0) missions.splice(idx, 1);
            renderList();
          } catch (err) {
            showModal(err.message || 'No se pudo eliminar la mision', { title: 'Error' });
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


  async function showCourseCreator() {
    setTab(btnCourses);
    setLayout({ showRight: true, leftWidth: 520, expandRight: true });
    left.innerHTML = '';
    right.innerHTML = '';

    let editingCourse = null;

    const formCard = createEl('div', { className: 'card admin-course-editor' });
    const formHeading = createEl('h3', { text: 'Nuevo curso virtual' });
    const helper = info('Completa los datos base. Los modulos quedan listos en Pergaminos para agregar videos o material.');
    formCard.append(formHeading, helper);

    const form = createEl('form', { className: 'cr-form course-form', attrs: { autocomplete: 'off' } });

    const addRow = (label, node) => {
      const row = createEl('div', { className: 'form-row' });
      row.append(createEl('label', { text: label }));
      row.appendChild(node);
      form.appendChild(row);
      return node;
    };

    const inputTitle = addRow('Titulo', createEl('input', { attrs: { type: 'text', required: '', placeholder: 'Hacking Etico' } }));
    const inputDesc = addRow('Descripcion', createEl('textarea', { attrs: { rows: '4', placeholder: 'Descripcion corta del curso.' } }));

    const selectMod = document.createElement('select');
    selectMod.className = 'select';
    selectMod.append(new Option('Virtual', 'virtual', true, true), new Option('Presencial', 'presencial'));
    addRow('Modalidad', selectMod);

    const inputLevel = addRow('Nivel', createEl('input', { attrs: { type: 'text', placeholder: 'Intermedio' } }));
    const inputDuration = addRow('Duracion', createEl('input', { attrs: { type: 'text', placeholder: '6 semanas' } }));
    const inputPrice = addRow('Precio (COP)', createEl('input', { attrs: { type: 'text', placeholder: '320000' } }));
    const inputLink = addRow('Link de pago', createEl('input', { attrs: { type: 'url', placeholder: 'https://pay.coderonin.co/mi-curso' } }));
    form.appendChild(info('Si aun no tienes enlace de pago, deja el campo vacio para mostrar "Proximamente" en Dojo.'));
    const inputProductId = addRow('ID producto Hotmart', createEl('input', { attrs: { type: 'text', placeholder: 'HOTMART_PRODUCT_ID' } }));
    form.appendChild(info('Copia el ID del producto desde Hotmart Notify para enlazar compras automaticas.'));

    const inputTags = addRow('Tags', createEl('textarea', { attrs: { rows: '2', placeholder: 'pentesting, ofensiva, labs' } }));
    const inputSkills = addRow('Habilidades', createEl('textarea', { attrs: { rows: '3', placeholder: 'Una habilidad por linea' } }));
    const inputOutcome = addRow('Impacto', createEl('textarea', { attrs: { rows: '3', placeholder: 'Describe el resultado o promesa del curso.' } }));
    const inputModules = addRow('Modulos', createEl('textarea', { attrs: { rows: '4', placeholder: 'Modulo 1 - Introduccion' } }));
    form.appendChild(info('Los modulos se crean como pergaminos vacios. Completa videos o recursos desde la seccion Pergaminos.'));

    const imgRow = createEl('div', { className: 'form-row course-image-row' });
    imgRow.append(createEl('label', { text: 'Imagen' }));
    const imgField = createEl('div', { className: 'course-image-field' });
    const imgPreview = createEl('div', { className: 'course-image-preview', text: 'Sin imagen' });
    const inputImage = createEl('input', { attrs: { type: 'text', placeholder: 'https://...' } });
    const fileInput = createEl('input', { attrs: { type: 'file', accept: 'image/*' } });
    const uploadBtn = createEl('button', { className: 'btn btn-sm', text: 'Subir archivo', attrs: { type: 'button' } });
    imgField.append(imgPreview, inputImage, fileInput, uploadBtn);
    imgRow.appendChild(imgField);
    form.appendChild(imgRow);

    const actions = createEl('div', { className: 'form-actions' });
    const cancelBtn = createEl('button', { className: 'btn btn-ghost', text: 'Cancelar', attrs: { type: 'button' } });
    cancelBtn.style.display = 'none';
    const submitBtn = createEl('button', { className: 'btn btn-primary', text: 'Crear curso' });
    actions.append(cancelBtn, submitBtn);
    form.appendChild(actions);

    formCard.appendChild(form);
    left.appendChild(formCard);

    const parseList = (value) => value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
    const formatPrice = (value) => {
      if (value == null || value === '') return 'n/d';
      const num = Number(String(value).replace(/[^0-9.]/g, ''));
      if (!Number.isFinite(num)) return value;
      try {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);
      } catch {
        return `$${num}`;
      }
    };

    const updatePreview = () => {
      imgPreview.innerHTML = '';
      const url = (inputImage.value || '').trim();
      if (url) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'preview';
        img.loading = 'lazy';
        imgPreview.appendChild(img);
      } else {
        imgPreview.textContent = 'Sin imagen';
      }
    };

    cancelBtn.addEventListener('click', () => resetForm());

    uploadBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const file = fileInput.files && fileInput.files[0];
      if (!file) {
        showModal('Selecciona un archivo de imagen.', { title: 'Atencion' });
        return;
      }
      uploadBtn.disabled = true;
      try {
        const fd = new FormData();
        fd.append('file', file);
        const token = getToken();
        const headers = token ? { authorization: `Bearer ${token}` } : {};
        const res = await fetch('/api/admin/upload/image', { method: 'POST', headers, body: fd });
        if (!res.ok) throw new Error('No se pudo subir la imagen');
        const data = await res.json();
        inputImage.value = data.url || '';
        updatePreview();
      } catch (err) {
        showModal(err.message || 'Error al subir imagen', { title: 'Error' });
      } finally {
        uploadBtn.disabled = false;
      }
    });

    function resetForm() {
      editingCourse = null;
      formHeading.textContent = 'Nuevo curso virtual';
      submitBtn.textContent = 'Crear curso';
      cancelBtn.style.display = 'none';
      form.reset();
      selectMod.value = 'virtual';
      updatePreview();
    }

    function populateForm(course) {
      const courseId = course && (course._id || course.id);
      if (!courseId) return;
      editingCourse = {
        ...course,
        _id: String(courseId),
      };
      formHeading.textContent = `Editar ${course.title || 'curso'}`;
      submitBtn.textContent = 'Guardar cambios';
      cancelBtn.style.display = 'inline-flex';
      inputTitle.value = course.title || '';
      inputDesc.value = course.description || '';
      selectMod.value = course.modalidad || 'virtual';
      inputLevel.value = course.level || '';
      inputDuration.value = course.duration || '';
      inputPrice.value = course.price || '';
      inputLink.value = course.link || '';
      inputProductId.value = course.productId || '';
      inputTags.value = Array.isArray(course.tags) ? course.tags.join(', ') : '';
      inputSkills.value = Array.isArray(course.skills) ? course.skills.join(', ') : '';
      inputOutcome.value = course.outcome || '';
      inputModules.value = '';
      inputImage.value = course.image || '';
      updatePreview();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function loadCourses() {
      right.innerHTML = '';
      const summary = createEl('div', { className: 'card admin-course-summary' });
      summary.append(createEl('h3', { text: 'Cursos publicados' }), info('Aparecen automaticamente en Dojo y se pueden editar en Pergaminos.'));
      const data = await getJSON('/api/courses.json', []);
      if (!Array.isArray(data) || !data.length) {
        summary.appendChild(createEl('div', { className: 'course-empty', text: 'Aun no hay cursos registrados.' }));
        right.appendChild(summary);
        return;
      }
      const list = createEl('div', { className: 'course-admin-list' });
      data.forEach(course => {
        const courseId = course && (course._id || course.id || course.title);
        const stringId = courseId ? String(courseId) : '';
        const card = createEl('div', { className: 'admin-course-card' });
        card.appendChild(createEl('h4', { text: course.title || 'Curso' }));
        card.appendChild(createEl('p', { className: 'muted small', text: `Modalidad: ${course.modalidad || 'virtual'} � Nivel: ${course.level || 'n/d'} � Duracion: ${course.duration || 'n/d'}` }));
        card.appendChild(createEl('p', { className: 'muted small', text: `Valor: ${formatPrice(course.price)}` }));
        if (course.productId) {
          card.appendChild(createEl('p', { className: 'muted tiny', text: `Product ID: ${course.productId}` }));
        }
        const linkWrap = createEl('div', { className: 'course-admin-link' });
        const hasLink = Boolean(course.link);
        const anchor = createEl('a', { text: hasLink ? 'Ver link de pago' : 'Proximamente', attrs: hasLink ? { href: course.link, target: '_blank', rel: 'noopener noreferrer' } : {} });
        if (!hasLink) anchor.classList.add('disabled');
        linkWrap.appendChild(anchor);
        card.appendChild(linkWrap);
        card.appendChild(createEl('p', { className: 'muted tiny', text: 'Gestiona contenidos detallados desde Pergaminos.' }));

        const controls = createEl('div', { className: 'course-admin-actions' });
        const editBtn = createEl('button', { className: 'btn btn-sm btn-primary', text: 'Editar' });
        editBtn.addEventListener('click', () => populateForm({ ...course, id: stringId }));
        controls.appendChild(editBtn);

        const deleteBtn = createEl('button', { className: 'btn btn-sm btn-danger', text: 'Eliminar' });
        deleteBtn.addEventListener('click', async () => {
          const jutsu = requestJutsu('Ingresa el jutsu sagrado para eliminar el curso');
          if (!jutsu || !stringId) return;
          try {
            const headers = { 'content-type': 'application/json', 'accept': 'application/json' };
            const token = getToken();
            if (token) headers.authorization = `Bearer ${token}`;
            const res = await fetch(`/api/admin/courses/${encodeURIComponent(stringId)}`, {
              method: 'DELETE',
              headers,
              credentials: 'include',
              body: JSON.stringify({ jutsu })
            });
            if (!res.ok) {
              let msg = 'No se pudo eliminar el curso';
              try {
                const ct = (res.headers.get('content-type') || '').toLowerCase();
                const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text());
                msg = err?.error || err?.message || msg;
              } catch {}
              throw new Error(msg);
            }
            if (editingCourse && editingCourse._id === stringId) resetForm();
            await loadCourses();
          } catch (err) {
            showModal(err.message || 'No se pudo eliminar el curso', { title: 'Error' });
          }
        });
        controls.appendChild(deleteBtn);
        card.appendChild(controls);

        list.appendChild(card);
      });
      summary.appendChild(list);
      right.appendChild(summary);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      try {
        const title = inputTitle.value.trim();
        if (!title) throw new Error('El titulo es obligatorio');
        const link = inputLink.value.trim();
        if (!editingCourse && !link) throw new Error('El link de pago es obligatorio');

        const payload = {
          title,
          description: inputDesc.value.trim(),
          modalidad: selectMod.value,
          level: inputLevel.value.trim(),
          duration: inputDuration.value.trim(),
          price: inputPrice.value.trim(),
          link,
          image: inputImage.value.trim(),
          productId: inputProductId.value.trim(),
          tags: parseList(inputTags.value),
          skills: parseList(inputSkills.value),
          outcome: inputOutcome.value.trim(),
        };

        const headers = { 'content-type': 'application/json', 'accept': 'application/json' };
        const token = getToken();
        if (token) headers.authorization = `Bearer ${token}`;

        if (editingCourse) {
          const jutsu = requestJutsu('Ingresa el jutsu sagrado para actualizar el curso');
          if (!jutsu) {
            submitBtn.disabled = false;
            return;
          }
          payload.jutsu = jutsu;
          const res = await fetch(`/api/admin/courses/${encodeURIComponent(editingCourse._id)}`, {
            method: 'PUT',
            headers,
            credentials: 'include',
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            let message = 'No se pudo actualizar el curso';
            try {
              const ct = (res.headers.get('content-type') || '').toLowerCase();
              const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text());
              message = err?.error || err?.message || message;
            } catch {}
            throw new Error(message);
          }
          showModal('Curso actualizado', { title: 'Listo' });
        } else {
          payload.modules = parseList(inputModules.value);
          const res = await fetch('/api/admin/courses', {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            let message = 'No se pudo crear el curso';
            try {
              const err = await res.json();
              message = err?.error || message;
            } catch {}
            throw new Error(message);
          }
          showModal('Curso creado. Revisa Pergaminos para agregar contenido.', { title: 'Listo' });
        }

        resetForm();
        await loadCourses();
      } catch (err) {
        showModal(err.message || 'Error al guardar el curso', { title: 'Error' });
      } finally {
        submitBtn.disabled = false;
      }
    });

    resetForm();
    await loadCourses();
  }
  async function showUsers() {
    setTab(btnUsers);
    setLayout({ showRight: true, leftWidth: 420, expandRight: true });
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
      const passwordBtn = createEl('button', { className: 'btn btn-ghost', text: 'Cambiar clave' });
      passwordBtn.style.marginLeft = '8px';

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
    const parseList = (value) => value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
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

      passwordBtn.addEventListener('click', async () => {
        try {
          const newPassword = window.prompt('Nueva contraseña (8+ caracteres, una mayuscula y un simbolo)');
          if (!newPassword) return;
          const confirmPassword = window.prompt('Confirma la nueva contraseña');
          if (!confirmPassword || confirmPassword !== newPassword) {
            showModal('Las contraseñas no coinciden', { title: 'Error' });
            return;
          }
          const jutsu = requestJutsu('Ingresa el jutsu sagrado para cambiar la contraseña');
          if (!jutsu) return;
          const headers = { 'content-type': 'application/json', 'accept': 'application/json' };
          if (token) headers.authorization = `Bearer ${token}`;
          const res = await fetch(`/api/admin/users/${user._id}/password`, {
            method: 'PUT',
            headers,
            credentials: 'include',
            body: JSON.stringify({ password: newPassword, confirmPassword, jutsu })
          });
          if (!res.ok) {
            let msg = 'No se pudo cambiar la contraseña';
            try {
              const ct = (res.headers.get('content-type') || '').toLowerCase();
              const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text());
              msg = err?.error || err?.message || msg;
            } catch {}
            throw new Error(msg);
          }
          showModal('Contraseña actualizada', { title: 'Listo' });
        } catch (err) {
          showModal(err.message || 'No se pudo cambiar la contraseña', { title: 'Error' });
        }
      });

      actionsCell.append(toggleBtn, saveBtn, passwordBtn);
      tr.appendChild(actionsCell);
      tr.appendChild(createEl('td', { text: (user.createdAt || '').split('T')[0] }));
      tbody.appendChild(tr);
    });

    table.append(thead, tbody);
  }

  btnDash.addEventListener('click', showDashboard);
  btnReq.addEventListener('click', showRequests);
  btnMissions.addEventListener('click', showMissions);
  btnCourses.addEventListener('click', showCourseCreator);
  btnUsers.addEventListener('click', showUsers);

  await showDashboard();

  wrap.appendChild(root);
  return wrap;
}
