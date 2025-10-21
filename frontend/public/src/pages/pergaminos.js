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

function createInfo(text) {
  return createEl('p', { className: 'muted small', text });
}

function buildEmptyState(message) {
  const box = createEl('div', { className: 'scrolls-empty' });
  box.appendChild(createEl('h4', { text: 'Sin pergaminos' }));
  box.appendChild(createEl('p', { className: 'muted', text: message }));
  return box;
}

export async function PergaminosPage() {
  const wrap = createEl('section', { className: 'section page pergaminos-page', attrs: { id: 'pergaminos' } });
  const container = createEl('div', { className: 'container admin-container' });
  container.appendChild(createEl('h2', { className: 'section-title', text: 'Pergaminos' }));
  container.appendChild(createInfo('Crea, organiza y comparte los modulos de cada curso. Solo sensei y shogun pueden editar este archivo legendario.'));

  const me = await getJSON('/api/auth/me', null);
  const roles = Array.isArray(me?.roles) ? me.roles : [];
  const authorized = roles.includes('gato') || roles.includes('sensei');
  if (!authorized) {
    const card = createEl('div', { className: 'card scrolls-alert' });
    card.appendChild(createEl('h3', { text: 'Acceso restringido' }));
    card.appendChild(createEl('p', { text: 'Solo sensei y shogun pueden abrir los pergaminos.' }));
    const backBtn = createEl('button', { className: 'btn btn-primary', text: 'Ir al inicio', attrs: { type: 'button' } });
    backBtn.addEventListener('click', () => navigate('/'));
    card.appendChild(backBtn);
    container.appendChild(card);
    wrap.appendChild(container);
    return wrap;
  }

  updateAuthNav();

  const courses = await getJSON('/api/courses.json', []);
  if (!courses || !courses.length) {
    const empty = buildEmptyState('Aun no hay cursos registrados. Agrega uno desde el panel de admin para comenzar.');
    container.appendChild(empty);
    wrap.appendChild(container);
    return wrap;
  }

  let currentCourse = '';
  let modulesCache = [];
  let loading = false;

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
    if (!title) return;
    courseSelect.appendChild(new Option(title, title));
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
  formCard.appendChild(createInfo('Los pergaminos pueden contener video para ver en sitio o PDF descargable. Usa orden para controlar la secuencia.'));

  const form = createEl('form', { className: 'cr-form scrolls-form', attrs: { autocomplete: 'off' } });
  const rowTitle = createEl('div', { className: 'form-row' });
  rowTitle.append(createEl('label', { text: 'Titulo' }));
  const inputTitle = createEl('input', { attrs: { type: 'text', required: '', placeholder: 'Modulo 1 - Introduccion' } });
  rowTitle.appendChild(inputTitle);

  const rowDesc = createEl('div', { className: 'form-row' });
  rowDesc.append(createEl('label', { text: 'Resumen' }));
  const inputDesc = createEl('textarea', { attrs: { rows: '3', placeholder: 'Contexto rapido del contenido' } });
  rowDesc.appendChild(inputDesc);

  const rowOrder = createEl('div', { className: 'form-row' });
  rowOrder.append(createEl('label', { text: 'Orden' }));
  const inputOrder = createEl('input', { attrs: { type: 'number', value: '0', min: '0', step: '1' } });
  rowOrder.appendChild(inputOrder);

  const resourceSection = createEl('div', { className: 'resource-section' });
  resourceSection.appendChild(createEl('span', { className: 'resource-label', text: 'Tipo de recurso' }));
  const modeBar = createEl('div', { className: 'resource-mode-bar' });
  const modes = [
    { key: 'upload-video', label: 'Video local', hint: 'MP4 o WEBM (max 200MB)' },
    { key: 'upload-pdf', label: 'PDF', hint: 'PDF hasta 25MB' },
    { key: 'external-video', label: 'Video externo', hint: 'Enlace de YouTube, Vimeo o archivo MP4' },
  ];
  const state = { mode: 'upload-video' };
  const videoInput = createEl('input', { attrs: { type: 'file', accept: 'video/*' } });
  const pdfInput = createEl('input', { attrs: { type: 'file', accept: 'application/pdf' } });
  const urlInput = createEl('input', { attrs: { type: 'url', placeholder: 'https://...' } });
  const urlHint = createInfo('Usa enlaces https validos. Para YouTube pega el link completo.');
  const hintLabel = createEl('p', { className: 'muted small', text: modes[0].hint });

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

  const videoPane = createEl('div', { className: 'resource-pane active' });
  videoPane.appendChild(videoInput);
  const pdfPane = createEl('div', { className: 'resource-pane' });
  pdfPane.appendChild(pdfInput);
  const urlPane = createEl('div', { className: 'resource-pane' });
  urlPane.append(urlInput, urlHint);

  const resourcePaneWrap = createEl('div', { className: 'resource-pane-wrap' });
  resourcePaneWrap.append(videoPane, pdfPane, urlPane);

  resourceSection.append(modeBar, resourcePaneWrap, hintLabel);

  form.append(rowTitle, rowDesc, rowOrder, resourceSection);

  const formActions = createEl('div', { className: 'form-actions' });
  const submitBtn = createEl('button', { className: 'btn btn-primary', text: 'Guardar pergamino' });
  formActions.appendChild(submitBtn);
  form.append(formActions);

  function updateResourcePane() {
    videoPane.classList.toggle('active', state.mode === 'upload-video');
    pdfPane.classList.toggle('active', state.mode === 'upload-pdf');
    urlPane.classList.toggle('active', state.mode === 'external-video');
    if (state.mode !== 'upload-video') videoInput.value = '';
    if (state.mode !== 'upload-pdf') pdfInput.value = '';
    if (state.mode !== 'external-video') urlInput.value = '';
  }

  async function loadModules(course) {
    if (!course) return;
    loading = true;
    refreshBtn.disabled = true;
    modulesContainer.innerHTML = '';
    modulesContainer.appendChild(createInfo('Cargando pergaminos...'));
    const mods = await getJSON(`/api/instructor/courses/modules?course=${encodeURIComponent(course)}`, []);
    modulesCache = Array.isArray(mods) ? mods : [];
    renderModules();
    loading = false;
    refreshBtn.disabled = false;
  }

  function renderModules() {
    modulesContainer.innerHTML = '';
    if (!modulesCache.length) {
      modulesContainer.appendChild(buildEmptyState('Todavia no hay modulos en este curso.'));
      return;
    }
    modulesCache.forEach(mod => {
      const item = createEl('article', { className: 'scrolls-item' });
      const header = createEl('div', { className: 'scrolls-item-head' });
      const badge = createEl('span', { className: 'scrolls-pill', text: `#${mod.order ?? 0}` });
      const type = mod?.resource?.type === 'pdf' ? 'PDF' : 'Video';
      const typeBadge = createEl('span', { className: 'scrolls-pill type', text: type });
      header.append(badge, createEl('h4', { text: mod.title || 'Sin titulo' }), typeBadge);
      item.appendChild(header);
      if (mod.description) {
        item.appendChild(createEl('p', { className: 'muted', text: mod.description }));
      }
      const meta = createEl('div', { className: 'scrolls-meta' });
      const updated = mod.updatedAt || mod.createdAt;
      if (updated) {
        try {
          const date = new Date(updated);
          meta.appendChild(createEl('span', { className: 'muted tiny', text: `Actualizado ${date.toLocaleDateString()}` }));
        } catch {}
      }
      item.appendChild(meta);
      const actions = createEl('div', { className: 'scrolls-item-actions' });
      if (mod?.resource?.url) {
        const view = createEl('a', { className: 'btn btn-ghost btn-sm', text: type === 'PDF' ? 'Descargar' : 'Ver', attrs: { href: mod.resource.url, target: '_blank', rel: 'noopener noreferrer' } });
        actions.appendChild(view);
      }
      const del = createEl('button', { className: 'btn btn-danger btn-sm', text: 'Eliminar' });
      del.addEventListener('click', async () => {
        if (!requireSecret()) return;
        del.disabled = true;
        try {
          const token = getToken();
          const headers = token ? { authorization: `Bearer ${token}` } : {};
          const resp = await fetch(`/api/instructor/courses/modules/${encodeURIComponent(mod.id)}`, { method: 'DELETE', headers, credentials: 'include' });
          if (!resp.ok) throw new Error('No se pudo eliminar');
          await loadModules(currentCourse);
        } catch (err) {
          showModal(err.message || 'Error al eliminar', { title: 'Error' });
        } finally {
          del.disabled = false;
        }
      });
      actions.appendChild(del);
      item.appendChild(actions);
      modulesContainer.appendChild(item);
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
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
        if (file.size > MAX_VIDEO_BYTES) throw new Error('El video supera el limite de 200MB');
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
        if (file.size > MAX_PDF_BYTES) throw new Error('El PDF supera el limite de 25MB');
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
        course: currentCourse,
        title,
        description: inputDesc.value.trim(),
        order: Number(inputOrder.value) || 0,
        resource,
      };
      const postHeaders = { 'content-type': 'application/json', 'accept': 'application/json' };
      if (token) postHeaders.authorization = `Bearer ${token}`;
      const res = await fetch('/api/instructor/courses/modules', {
        method: 'POST',
        headers: postHeaders,
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
    currentCourse = courseSelect.value;
    modulesCache = [];
    if (!currentCourse) {
      modulesContainer.innerHTML = '';
      modulesContainer.appendChild(buildEmptyState('Selecciona un curso para ver sus pergaminos.'));
      refreshBtn.disabled = true;
      return;
    }
    await loadModules(currentCourse);
  });

  updateResourcePane();

  modulesContainer.appendChild(buildEmptyState('Selecciona un curso para ver sus pergaminos.'));
  formCard.appendChild(form);
  grid.append(listCard, formCard);
  container.appendChild(grid);
  wrap.appendChild(container);
  return wrap;
}
