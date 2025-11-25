import { createEl, showModal, updateAuthNav, getJSON, getToken, navigate } from '../lib/core.js'

const DELETE_SECRET = 'gatito';
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const MAX_PDF_BYTES = 25 * 1024 * 1024;

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

function emptyState(message) {
  const box = createEl('div', { className: 'scrolls-empty' });
  box.appendChild(createEl('h4', { text: 'Sin pergaminos' }));
  box.appendChild(createEl('p', { className: 'muted', text: message }));
  return box;
}

export async function PergaminosPage() {
  const wrap = createEl('section', { className: 'section page pergaminos-page', attrs: { id: 'pergaminos' } });
  const container = createEl('div', { className: 'container admin-container' });
  container.appendChild(createEl('h2', { className: 'section-title', text: 'Pergaminos' }));
  container.appendChild(info('Gestiona los modulos de cada curso. Solo sensei y shogun pueden editar estos pergaminos.'));

  const me = await getJSON('/api/auth/me', null);
  const rawRoles = Array.isArray(me?.roles) ? me.roles : [];
  const roles = rawRoles.map(r => String(r || '').toLowerCase());
  const authorized = roles.includes('gato') || roles.includes('sensei');
  if (!authorized) {
    const card = createEl('div', { className: 'card scrolls-alert' });
    card.appendChild(createEl('h3', { text: 'Acceso restringido' }));
    card.appendChild(createEl('p', { text: 'Solo sensei y shogun pueden abrir estos pergaminos.' }));
    const back = createEl('button', { className: 'btn btn-primary', text: 'Ir al inicio', attrs: { type: 'button' } });
    back.addEventListener('click', () => navigate('/'));
    card.appendChild(back);
    container.appendChild(card);
    wrap.appendChild(container);
    return wrap;
  }

  updateAuthNav();

  const courses = await getJSON('/api/courses.json', []);
  if (!Array.isArray(courses) || !courses.length) {
    container.appendChild(emptyState('Aun no hay cursos. Crea alguno en Admin para comenzar.'));
    wrap.appendChild(container);
    return wrap;
  }

  let currentCourse = '';
  let modulesCache = [];

  const grid = createEl('div', { className: 'pergaminos-grid' });
  const listCard = createEl('div', { className: 'card scrolls-card scrolls-card-list' });
  const formCard = createEl('div', { className: 'card scrolls-card scrolls-card-form' });

  const listHeader = createEl('div', { className: 'scrolls-header' });
  const courseLabel = createEl('label', { className: 'muted small', text: 'Curso' });
  const courseSelect = document.createElement('select');
  courseSelect.className = 'select';
  courseSelect.appendChild(new Option('Selecciona un curso', '', true, true));
  courses.forEach(course => {
    const title = course.title || course.name || '';
    const value = course.id || course._id || title;
    if (!title || !value) return;
    const option = new Option(title, value);
    option.dataset.slug = title;
    courseSelect.appendChild(option);
  });
  listHeader.append(courseLabel, courseSelect);
  listCard.appendChild(listHeader);

  const modulesContainer = createEl('div', { className: 'scrolls-list' });
  listCard.appendChild(modulesContainer);

  const refreshBtn = createEl('button', { className: 'btn btn-ghost btn-sm', text: 'Actualizar lista' });
  refreshBtn.disabled = true;
  refreshBtn.addEventListener('click', async () => {
    if (!currentCourse) return;
    await loadModules(currentCourse);
  });
  const listActions = createEl('div', { className: 'scrolls-actions-bar' });
  listActions.appendChild(refreshBtn);
  listCard.appendChild(listActions);

  formCard.appendChild(createEl('h3', { className: 'scrolls-title', text: 'Nuevo pergamino' }));
  formCard.appendChild(info('Sube video, PDF o asigna un enlace. Usa el campo de orden para controlar la secuencia.'));

  const form = createEl('form', { className: 'cr-form scrolls-form', attrs: { autocomplete: 'off' } });
  const titleRow = createEl('div', { className: 'form-row' });
  titleRow.append(createEl('label', { text: 'Titulo' }));
  const inputTitle = createEl('input', { attrs: { type: 'text', required: '', placeholder: 'Modulo 1 - Introduccion' } });
  titleRow.appendChild(inputTitle);

  const descRow = createEl('div', { className: 'form-row' });
  descRow.append(createEl('label', { text: 'Resumen' }));
  const inputDesc = createEl('textarea', { attrs: { rows: '3', placeholder: 'Contexto rapido del contenido' } });
  descRow.appendChild(inputDesc);

  const orderRow = createEl('div', { className: 'form-row' });
  orderRow.append(createEl('label', { text: 'Orden' }));
  const inputOrder = createEl('input', { attrs: { type: 'number', value: '0', min: '0', step: '1' } });
  orderRow.appendChild(inputOrder);

  form.append(titleRow, descRow, orderRow);

  const resourceSection = createEl('div', { className: 'resource-section' });
  resourceSection.appendChild(createEl('span', { className: 'resource-label', text: 'Tipo de recurso' }));

  const modeBar = createEl('div', { className: 'resource-mode-bar' });
  const modes = [
    { key: 'upload-video', label: 'Video local', hint: 'MP4/WEBM hasta 200MB' },
    { key: 'upload-pdf', label: 'PDF', hint: 'PDF hasta 25MB' },
    { key: 'external-video', label: 'Video externo', hint: 'Enlace de YouTube, Vimeo o MP4' },
  ];
  const state = { mode: 'upload-video' };

  const videoInput = createEl('input', { attrs: { type: 'file', accept: 'video/*' } });
  const pdfInput = createEl('input', { attrs: { type: 'file', accept: 'application/pdf' } });
  const urlInput = createEl('input', { attrs: { type: 'url', placeholder: 'https://...' } });
  const urlHint = info('Usa enlaces https validos. Para YouTube pega el link completo.');
  const hintLabel = createEl('p', { className: 'muted small', text: modes[0].hint });

  const videoPane = createEl('div', { className: 'resource-pane active' });
  videoPane.appendChild(videoInput);
  const pdfPane = createEl('div', { className: 'resource-pane' });
  pdfPane.appendChild(pdfInput);
  const urlPane = createEl('div', { className: 'resource-pane' });
  urlPane.append(urlInput, urlHint);
  const paneWrap = createEl('div', { className: 'resource-pane-wrap' });
  paneWrap.append(videoPane, pdfPane, urlPane);

  modes.forEach(({ key, label, hint }) => {
    const btn = createEl('button', { className: 'resource-mode', text: label, attrs: { type: 'button', 'data-mode': key } });
    if (key === state.mode) btn.classList.add('active');
    btn.addEventListener('click', () => {
      state.mode = key;
      hintLabel.textContent = hint;
      modeBar.querySelectorAll('.resource-mode').forEach(b => b.classList.toggle('active', b.dataset.mode === key));
      updateResourcePane();
    });
    modeBar.appendChild(btn);
  });

  resourceSection.append(modeBar, paneWrap, hintLabel);
  form.appendChild(resourceSection);

  const formActions = createEl('div', { className: 'form-actions' });
  const submitBtn = createEl('button', { className: 'btn btn-primary', text: 'Guardar pergamino' });
  formActions.appendChild(submitBtn);
  form.appendChild(formActions);

  function updateResourcePane() {
    videoPane.classList.toggle('active', state.mode === 'upload-video');
    pdfPane.classList.toggle('active', state.mode === 'upload-pdf');
    urlPane.classList.toggle('active', state.mode === 'external-video');
    if (state.mode !== 'upload-video') videoInput.value = '';
    if (state.mode !== 'upload-pdf') pdfInput.value = '';
    if (state.mode !== 'external-video') urlInput.value = '';
  }

  async function loadModules(courseId) {
    modulesContainer.innerHTML = '';
    modulesContainer.appendChild(info('Cargando pergaminos...'));
    const qs = courseId ? `?courseId=${encodeURIComponent(courseId)}` : '';
    const list = await getJSON(`/api/instructor/courses/modules${qs}`, []);
    modulesCache = Array.isArray(list) ? list : [];
    renderModules();
  }

  function renderModules() {
    modulesContainer.innerHTML = '';
    if (!modulesCache.length) {
      modulesContainer.appendChild(emptyState('Este curso aun no tiene pergaminos.'));
      return;
    }
    modulesCache.forEach(mod => {
      const card = createEl('article', { className: 'scrolls-item' });
      const head = createEl('div', { className: 'scrolls-item-head' });
      head.appendChild(createEl('span', { className: 'scrolls-pill', text: `#${mod.order ?? 0}` }));
      head.appendChild(createEl('h4', { text: mod.title || 'Sin titulo' }));
      const type = mod?.resource?.type === 'pdf' ? 'PDF' : 'Video';
      head.appendChild(createEl('span', { className: 'scrolls-pill type', text: type }));
      card.appendChild(head);
      if (mod.description) card.appendChild(createEl('p', { className: 'muted', text: mod.description }));
      const meta = createEl('div', { className: 'scrolls-meta' });
      if (mod.updatedAt || mod.createdAt) {
        try {
          const date = new Date(mod.updatedAt || mod.createdAt);
          meta.appendChild(createEl('span', { className: 'muted tiny', text: `Actualizado ${date.toLocaleDateString()}` }));
        } catch {}
      }
      card.appendChild(meta);
      const actions = createEl('div', { className: 'scrolls-item-actions' });
      if (mod?.resource?.url) {
        const label = mod.resource.type === 'pdf' ? 'Descargar' : 'Ver';
        actions.appendChild(createEl('a', { className: 'btn btn-ghost btn-sm', text: label, attrs: { href: mod.resource.url, target: '_blank', rel: 'noopener noreferrer' } }));
      }
      const remove = createEl('button', { className: 'btn btn-danger btn-sm', text: 'Eliminar' });
      remove.addEventListener('click', async () => {
        if (!requireSecret()) return;
        remove.disabled = true;
        try {
          const token = getToken();
          const headers = token ? { authorization: `Bearer ${token}` } : {};
          const resp = await fetch(`/api/instructor/courses/modules/${encodeURIComponent(mod.id)}`, { method: 'DELETE', headers, credentials: 'include' });
          if (!resp.ok) throw new Error('No se pudo eliminar');
          await loadModules(currentCourse);
        } catch (err) {
          showModal(err.message || 'Error al eliminar', { title: 'Error' });
        } finally {
          remove.disabled = false;
        }
      });
      actions.appendChild(remove);
      card.appendChild(actions);
      modulesContainer.appendChild(card);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentCourse) {
      showModal('Selecciona un curso primero.', { title: 'Atencion' });
      return;
    }
    const title = inputTitle.value.trim();
    if (!title) {
      showModal('El titulo es obligatorio.', { title: 'Atencion' });
      return;
    }
    submitBtn.disabled = true;
    try {
      const token = getToken();
      let resource = null;
      if (state.mode === 'upload-video') {
        const file = videoInput.files && videoInput.files[0];
        if (!file) throw new Error('Selecciona un video');
        if (file.size > MAX_VIDEO_BYTES) throw new Error('Limite 200MB para video');
        const fd = new FormData();
        fd.append('file', file);
        const headers = token ? { authorization: `Bearer ${token}` } : {};
        const up = await fetch('/api/instructor/upload/video', { method: 'POST', headers, body: fd, credentials: 'include' });
        if (!up.ok) throw new Error('No se pudo subir el archivo');
        const data = await up.json();
        resource = { type: data.type === 'pdf' ? 'pdf' : 'video', url: data.url, name: data.name || file.name, mime: data.mime };
      } else if (state.mode === 'upload-pdf') {
        const file = pdfInput.files && pdfInput.files[0];
        if (!file) throw new Error('Selecciona un PDF');
        if (file.size > MAX_PDF_BYTES) throw new Error('Limite 25MB para PDF');
        const fd = new FormData();
        fd.append('file', file);
        const headers = token ? { authorization: `Bearer ${token}` } : {};
        const up = await fetch('/api/instructor/upload/video', { method: 'POST', headers, body: fd, credentials: 'include' });
        if (!up.ok) throw new Error('No se pudo subir el archivo');
        const data = await up.json();
        resource = { type: 'pdf', url: data.url, name: data.name || file.name, mime: data.mime };
      } else {
        const rawUrl = urlInput.value.trim();
        if (!rawUrl) throw new Error('Pega la URL del video');
        try { new URL(rawUrl); } catch { throw new Error('URL invalida'); }
        resource = { type: 'video', url: rawUrl, name: title };
      }

      const payload = {
        courseId: currentCourse,
        title,
        description: inputDesc.value.trim(),
        order: Number(inputOrder.value) || 0,
        resource,
      };
      const headers = { 'content-type': 'application/json', 'accept': 'application/json' };
      if (token) headers.authorization = `Bearer ${token}`;
      const res = await fetch('/api/instructor/courses/modules', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = 'No se pudo guardar el pergamino';
        try {
          const ct = (res.headers.get('content-type') || '').toLowerCase();
          const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text());
          msg = err?.error || err?.message || msg;
        } catch {}
        throw new Error(msg);
      }
      showModal('Pergamino guardado', { title: 'Listo' });
      inputTitle.value = '';
      inputDesc.value = '';
      inputOrder.value = '0';
      videoInput.value = '';
      pdfInput.value = '';
      urlInput.value = '';
      await loadModules(currentCourse);
    } catch (err) {
      showModal(err.message || 'Error al guardar', { title: 'Error' });
    } finally {
      submitBtn.disabled = false;
    }
  });

  courseSelect.addEventListener('change', async () => {
    currentCourse = courseSelect.value || '';
    modulesCache = [];
    refreshBtn.disabled = !currentCourse;
    if (!currentCourse) {
      modulesContainer.innerHTML = '';
      modulesContainer.appendChild(emptyState('Selecciona un curso para ver sus pergaminos.'));
      return;
    }
    await loadModules(currentCourse);
  });

  updateResourcePane();
  modulesContainer.appendChild(emptyState('Selecciona un curso para ver sus pergaminos.'));
  formCard.appendChild(form);
  grid.append(listCard, formCard);
  container.appendChild(grid);
  wrap.appendChild(container);
  return wrap;
}
