import { $, createEl, showModal, navigate, updateAuthNav, getJSON, setToken } from '../lib/core.js'
import { Hero, Card, Courses, Services, Projects, PDFs, AchievementsSection, EmbedInstagram, EmbedTikTok } from '../lib/components.js'

export async function InstructorPage() {
  const wrap = createEl('section', { className: 'section page', attrs: { id: 'clases' } });
  const c = createEl('div', { className: 'container admin-container' });
  c.appendChild(createEl('h2', { className: 'section-title', text: 'Clases y Módulos' }));

  const me = await getJSON('/api/auth/me', null);
  if (!me || !Array.isArray(me.roles) || !(me.roles.includes('gato') || me.roles.includes('sensei'))) {
    navigate('/login', { replace: true });
    return wrap;
  }

  // Load courses from Dojo (API)
  const courses = await getJSON('/api/courses.json', []);
  const top = createEl('div', { className: 'admin-toolbar' });
  const selCourse = document.createElement('select');
  const opt0 = document.createElement('option'); opt0.value=''; opt0.textContent='Selecciona un curso'; selCourse.appendChild(opt0);
  (courses || []).forEach(cs => { const o = document.createElement('option'); o.value = cs.title || cs.name || ''; o.textContent = cs.title || cs.name || ''; selCourse.appendChild(o); });
  top.appendChild(selCourse);
  c.appendChild(top);

  const grid = createEl('div', { className: 'admin-split' }); grid.style.setProperty('--left', '360px');
  const left = createEl('div', { className: 'admin-pane left' });
  const handle = createEl('div', { className: 'split-handle', attrs: { role: 'separator', 'aria-orientation': 'vertical' } });
  const right = createEl('div', { className: 'admin-pane' });
  grid.append(left, handle, right);
  c.appendChild(grid);

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const start = parseInt(getComputedStyle(grid).getPropertyValue('--left')) || 360;
    const onMove = (ev) => { const dx = ev.clientX - startX; let w = start + dx; w = Math.max(240, Math.min(w, 640)); grid.style.setProperty('--left', w + 'px'); };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
  });

  // Left: form to add module
  left.append(createEl('h3', { text: 'Agregar módulo' }), createEl('p', { className: 'muted', text: 'Sube un video o define una URL y asigna el curso.' }));
  const form = createEl('form', { className: 'cr-form' });
  const fr1 = createEl('div', { className: 'form-row' }); fr1.append(createEl('label', { text: 'Título' })); const iTitle = createEl('input', { attrs: { type: 'text', required: '' } }); fr1.appendChild(iTitle);
  const fr2 = createEl('div', { className: 'form-row' }); fr2.append(createEl('label', { text: 'Descripción' })); const iDesc = createEl('input', { attrs: { type: 'text' } }); fr2.appendChild(iDesc);
  const fr3 = createEl('div', { className: 'form-row' }); fr3.append(createEl('label', { text: 'Orden' })); const iOrder = createEl('input', { attrs: { type: 'number', value: '0' } }); fr3.appendChild(iOrder);
  const fr4 = createEl('div', { className: 'form-row' }); fr4.append(createEl('label', { text: 'Video (archivo)' })); const iFile = createEl('input', { attrs: { type: 'file', accept: 'video/*' } }); fr4.appendChild(iFile);
  const fr5 = createEl('div', { className: 'form-row' }); fr5.append(createEl('label', { text: 'o URL de video' })); const iUrl = createEl('input', { attrs: { type: 'url', placeholder: 'https://...' } }); fr5.appendChild(iUrl);
  const frA = createEl('div', { className: 'form-actions' }); const btnAdd = createEl('button', { className: 'btn btn-primary', text: 'Agregar' }); frA.appendChild(btnAdd);
  form.append(fr1, fr2, fr3, fr4, fr5, frA);
  left.appendChild(form);

  // Right: list of modules
  const tableWrap = createEl('div', { className: 'table-wrap' }); const table = createEl('table', { className: 'table' }); tableWrap.appendChild(table);
  right.appendChild(tableWrap);

  async function listModules(course) {
    table.innerHTML = '';
    if (!course) return;
    const items = await getJSON(`/api/instructor/courses/modules?course=${encodeURIComponent(course)}`, []);
    const thead = createEl('thead'); const trh = createEl('tr'); ['orden','titulo','video','acciones'].forEach(h=> trh.appendChild(createEl('th',{text:h}))); thead.appendChild(trh);
    const tbody = createEl('tbody');
    (items||[]).forEach(m => {
      const tr = createEl('tr');
      tr.append(createEl('td',{ text: String(m.order||0) }), createEl('td',{ text: m.title||'' }), createEl('td',{ children: [ createEl('a',{ text: 'ver', attrs: { href: m.videoUrl||'#', target: '_blank', rel: 'noopener noreferrer' } }) ] }));
      const tdAct = createEl('td');
      const del = createEl('button', { className: 'btn', text: 'Eliminar' });
      del.addEventListener('click', async () => {
        if (!confirm('Eliminar módulo?')) return;
        const token = getToken();
        await fetch(`/api/instructor/courses/modules/${encodeURIComponent(m.id)}`, { method: 'DELETE', headers: token ? { authorization: `Bearer ${token}` } : {} });
        await listModules(course);
      });
      tdAct.appendChild(del);
      tr.appendChild(tdAct);
      tbody.appendChild(tr);
    });
    table.append(thead, tbody);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); btnAdd.disabled = true;
    try {
      const course = selCourse.value || '';
      if (!course) throw new Error('Selecciona un curso');
      let videoUrl = iUrl.value.trim();
      if (!videoUrl && iFile.files && iFile.files[0]) {
        const fd = new FormData(); fd.append('file', iFile.files[0]);
        const token = getToken();
        const up = await fetch('/api/instructor/upload/video', { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: fd });
        if (!up.ok) throw new Error('No se pudo subir');
        const uj = await up.json(); videoUrl = uj.url;
      }
      const token = getToken(); const headers = { 'content-type': 'application/json' }; if (token) headers['authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/instructor/courses/modules', { method: 'POST', headers, body: JSON.stringify({ title: iTitle.value, description: iDesc.value, order: iOrder.value, videoUrl, course }) });
      if (!res.ok) throw new Error('No se pudo crear');
      iTitle.value=''; iDesc.value=''; iOrder.value='0'; iFile.value=''; iUrl.value='';
      await listModules(course);
    } catch (err) { showModal(err.message||'Error', { title: 'Error' }); }
    finally { btnAdd.disabled = false; }
  });

  selCourse.addEventListener('change', async () => { await listModules(selCourse.value || ''); });

  wrap.appendChild(c);
  return wrap;
}

