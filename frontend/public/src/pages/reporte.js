import { createEl, showModal, updateAuthNav, getJSON, getToken, navigate } from '../lib/core.js'

const STATUS_PRESETS = [
  'Iniciando con las pruebas',
  'Redactando informe',
  'En validacion interna',
  'Listo para entrega',
  'Completado',
];

function info(text) {
  return createEl('p', { className: 'muted small', text });
}

function tag(text) {
  const span = createEl('span', { className: 'report-tag', text });
  return span;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export async function ReportePage() {
  const wrap = createEl('section', { className: 'section page report-page', attrs: { id: 'reporte' } });
  const container = createEl('div', { className: 'container report-container' });
  container.appendChild(createEl('h2', { className: 'section-title', text: 'Reportes de Mision' }));
  container.appendChild(info('Revisa el progreso, comparte actualizaciones y descarga los informes finales.'));

  const me = await getJSON('/api/auth/me', {});
  if (!me || !me.username) {
    navigate('/login', { replace: true });
    return wrap;
  }
  const rawRoles = Array.isArray(me.roles) ? me.roles : [];
  const roles = rawRoles.map(r => String(r || '').toLowerCase());
  const isShogun = roles.includes('gato');
  const isShinobi = roles.includes('shinobi');
  if (!isShogun && !isShinobi) {
    const forbidden = createEl('div', { className: 'container' });
    forbidden.appendChild(createEl('h2', { className: 'section-title', text: '403 - Forbidden' }));
    forbidden.appendChild(createEl('p', { className: 'muted', text: 'No tienes permisos para esta seccion.' }));
    wrap.appendChild(forbidden);
    return wrap;
  }

  updateAuthNav();

  const layout = createEl('div', { className: 'report-layout' });
  const listPanel = createEl('div', { className: 'report-panel report-list' });
  const detailPanel = createEl('div', { className: 'report-panel report-detail' });
  detailPanel.appendChild(info('Selecciona una mision para ver los detalles.'));
  layout.append(listPanel, detailPanel);
  container.appendChild(layout);
  wrap.appendChild(container);

  const token = getToken();
  let reports = await getJSON('/api/reports', []);
  let activeId = null;

  function buildProgressBar(value = 0) {
    const bar = createEl('div', { className: 'report-progress' });
    const fill = createEl('div', { className: 'report-progress-fill' });
    fill.style.width = `${Math.min(Math.max(value, 0), 100)}%`;
    bar.append(fill, createEl('span', { className: 'report-progress-label', text: `${Math.round(value)}%` }));
    return bar;
  }

  async function loadDetail(id) {
    if (!id) return;
    const detail = await getJSON(`/api/reports/${encodeURIComponent(id)}`, null);
    if (!detail) {
      detailPanel.innerHTML = '';
      detailPanel.appendChild(info('No se pudo cargar el reporte.'));
      return;
    }
    activeId = id;
    reports = (reports || []).map(r => (r.id === detail.id ? { ...r, progress: detail.progress, status: detail.status, updatedAt: detail.updatedAt } : r));
    renderList();
    renderDetail(detail);
  }

  function renderList() {
    listPanel.innerHTML = '';
    listPanel.appendChild(createEl('h3', { text: isShogun ? 'Todas las misiones' : 'Mis misiones' }));
    if (!reports || !reports.length) {
      listPanel.appendChild(info('Aun no hay misiones registradas.'));
      return;
    }
    const list = createEl('div', { className: 'report-list-grid' });
    reports.forEach((rep) => {
      const card = createEl('article', { className: 'report-card', attrs: { 'data-id': rep.id } });
      card.appendChild(createEl('h4', { text: rep.title || 'mision' }));
      card.appendChild(buildProgressBar(rep.progress || 0));
      card.appendChild(tag(rep.status || 'Sin estado'));
      card.appendChild(info(`Actualizado ${formatDate(rep.updatedAt || rep.createdAt)}`));
      card.addEventListener('click', () => loadDetail(rep.id));
      if (rep.id === activeId) card.classList.add('active');
      list.appendChild(card);
    });
    listPanel.appendChild(list);
  }

  function renderAttachments(detail, containerEl) {
    containerEl.innerHTML = '';
    if (!detail.attachments || !detail.attachments.length) {
      containerEl.appendChild(info('Sin informes cargados Aun.'));
      return;
    }
    detail.attachments.forEach((att) => {
      const row = createEl('div', { className: 'report-attachment' });
      row.appendChild(createEl('a', { text: att.name || 'Archivo', attrs: { href: att.url, target: '_blank', rel: 'noopener noreferrer', download: att.name || 'informe' } }));
      if (att.uploadedBy?.username) {
        row.appendChild(info(`Por ${att.uploadedBy.username}`));
      }
      row.appendChild(info(formatDate(att.createdAt)));
      containerEl.appendChild(row);
    });
  }

  function renderChat(detail, containerEl) {
    containerEl.innerHTML = '';
    const messages = Array.isArray(detail.chat) ? detail.chat : [];
    if (!messages.length) {
      containerEl.appendChild(info('Aun no hay mensajes.')); return;
    }
    messages.forEach((msg) => {
      const block = createEl('div', { className: 'report-chat-message' });
      const header = createEl('div', { className: 'report-chat-head' });
      header.appendChild(createEl('strong', { text: msg.user?.username || 'Usuario' }));
      if (msg.user?.role) header.appendChild(tag(msg.user.role));
      header.appendChild(info(formatDate(msg.createdAt)));
      block.appendChild(header);
      if (msg.message) block.appendChild(createEl('p', { text: msg.message }));
      const files = Array.isArray(msg.attachments) ? msg.attachments : [];
      if (files.length) {
        const list = createEl('div', { className: 'report-chat-files' });
        files.forEach(file => {
          list.appendChild(createEl('a', { text: file.name || 'Archivo', attrs: { href: file.url, target: '_blank', rel: 'noopener noreferrer', download: file.name || 'archivo' } }));
        });
        block.appendChild(list);
      }
      containerEl.appendChild(block);
    });
  }

  function renderDetail(detail) {
    detailPanel.innerHTML = '';
    detailPanel.appendChild(createEl('h3', { text: detail.title || 'mision' }));
    if (detail.summary) detailPanel.appendChild(createEl('p', { className: 'muted', text: detail.summary }));
    detailPanel.appendChild(info(`Servicio: ${detail.service || 'N/A'}`));
    if (detail.client && detail.client.username) detailPanel.appendChild(info(`Shinobi: ${detail.client.username}`));
    if (detail.shogun && detail.shogun.username) detailPanel.appendChild(info(`Shogun: ${detail.shogun.username}`));
    detailPanel.appendChild(buildProgressBar(detail.progress || 0));
    detailPanel.appendChild(tag(detail.status || 'Sin estado'));

    if (isShogun) {
      const editor = createEl('form', { className: 'report-progress-form' });
      const rangeLabel = createEl('label', { text: `Progreso: ${detail.progress || 0}%` });
      const range = createEl('input', { attrs: { type: 'range', min: '0', max: '100', value: detail.progress || 0 } });
      range.addEventListener('input', () => { rangeLabel.textContent = `Progreso: ${range.value}%`; });
      const statusInput = createEl('input', { attrs: { type: 'text', value: detail.status || '', list: 'status-presets', placeholder: 'Estado de la mision' } });
      let datalist = document.getElementById('status-presets');
      if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'status-presets';
        STATUS_PRESETS.forEach(s => datalist.appendChild(createEl('option', { attrs: { value: s } })));
        document.body.appendChild(datalist);
      }
      const saveBtn = createEl('button', { className: 'btn btn-primary btn-sm', text: 'Actualizar estado', attrs: { type: 'submit' } });
      editor.append(rangeLabel, range, statusInput, saveBtn);
      editor.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveBtn.disabled = true;
        try {
          const res = await fetch(`/api/reports/${encodeURIComponent(detail.id)}/progress`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
            credentials: 'include',
            body: JSON.stringify({ progress: Number(range.value), status: statusInput.value }),
          });
          if (!res.ok) throw new Error('No se pudo actualizar');
          const updated = await res.json();
          detail.progress = updated.progress;
          detail.status = updated.status;
          reports = reports.map(r => (r.id === detail.id ? { ...r, progress: updated.progress, status: updated.status, updatedAt: updated.updatedAt } : r));
          renderList();
          renderDetail(updated);
        } catch (err) {
          showModal(err.message || 'Error al guardar', { title: 'Error' });
        } finally {
          saveBtn.disabled = false;
        }
      });
      detailPanel.appendChild(editor);
    }

    detailPanel.appendChild(createEl('h4', { text: 'Informes' }));
    const attachmentsBox = createEl('div', { className: 'report-attachments-box' });
    renderAttachments(detail, attachmentsBox);
    detailPanel.appendChild(attachmentsBox);

    if (isShogun) {
      const uploadForm = createEl('form', { className: 'report-upload-form', attrs: { enctype: 'multipart/form-data' } });
      const fileInput = createEl('input', { attrs: { type: 'file', name: 'file' } });
      const uploadBtn = createEl('button', { className: 'btn btn-primary btn-sm', text: 'Subir informe', attrs: { type: 'submit' } });
      uploadForm.append(fileInput, uploadBtn);
      uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!fileInput.files || !fileInput.files[0]) {
          showModal('Selecciona un archivo primero.', { title: 'Atencion' });
          return;
        }
        uploadBtn.disabled = true;
        try {
          const fd = new FormData();
          fd.append('file', fileInput.files[0]);
          const res = await fetch(`/api/reports/${encodeURIComponent(detail.id)}/attachment`, {
            method: 'POST',
            headers: token ? { authorization: `Bearer ${token}` } : {},
            body: fd,
            credentials: 'include',
          });
          if (!res.ok) throw new Error('No se pudo subir el archivo');
          const att = await res.json();
          detail.attachments.push(att);
          renderAttachments(detail, attachmentsBox);
          fileInput.value = '';
        } catch (err) {
          showModal(err.message || 'Error al subir archivo', { title: 'Error' });
        } finally {
          uploadBtn.disabled = false;
        }
      });
      detailPanel.appendChild(uploadForm);
    }

    detailPanel.appendChild(createEl('h4', { text: 'Chat de mision' }));
    const chatBox = createEl('div', { className: 'report-chat-box' });
    renderChat(detail, chatBox);
    detailPanel.appendChild(chatBox);

    const chatForm = createEl('form', { className: 'report-chat-form', attrs: { enctype: 'multipart/form-data' } });
    const chatMessage = createEl('textarea', { attrs: { rows: '3', placeholder: 'Comparte avances, preguntas o adjunta archivos...' } });
    const chatFile = createEl('input', { attrs: { type: 'file', name: 'file' } });
    const chatBtn = createEl('button', { className: 'btn btn-primary btn-sm', text: 'Enviar', attrs: { type: 'submit' } });
    chatForm.append(chatMessage, chatFile, chatBtn);
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!chatMessage.value.trim() && (!chatFile.files || !chatFile.files[0])) {
        showModal('Escribe un mensaje o adjunta un archivo.', { title: 'Atencion' });
        return;
      }
      chatBtn.disabled = true;
      try {
        const fd = new FormData();
        if (chatMessage.value.trim()) fd.append('message', chatMessage.value.trim());
        if (chatFile.files && chatFile.files[0]) fd.append('file', chatFile.files[0]);
        const res = await fetch(`/api/reports/${encodeURIComponent(detail.id)}/chat`, {
          method: 'POST',
          headers: token ? { authorization: `Bearer ${token}` } : {},
          body: fd,
          credentials: 'include',
        });
        if (!res.ok) throw new Error('No se pudo enviar el mensaje');
        await loadDetail(detail.id);
      } catch (err) {
        showModal(err.message || 'Error al enviar mensaje', { title: 'Error' });
      } finally {
        chatBtn.disabled = false;
        chatMessage.value = '';
        if (chatFile.value) chatFile.value = '';
      }
    });
    detailPanel.appendChild(chatForm);
  }

  renderList();
  if (reports && reports.length) {
    await loadDetail(reports[0].id);
  }

  return wrap;
}
