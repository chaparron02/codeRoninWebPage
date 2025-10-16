import { $, createEl, showModal, navigate, updateAuthNav, getJSON, setToken } from '../lib/core.js'
import { Hero, Card, Courses, Services, Projects, PDFs, AchievementsSection, EmbedInstagram, EmbedTikTok } from '../lib/components.js'

export async function AdminPage() {
  const wrap = createEl('section', { className: 'section page', attrs: { id: 'admin' } });
  const c = createEl('div', { className: 'container admin-container' });
  c.appendChild(createEl('h2', { className: 'section-title', text: 'Panel Admin' }));

  const token = getToken();
  let me = null;
  if (token) me = await getJSON('/api/auth/me', null);
  if (!me || !Array.isArray(me.roles) || !me.roles.includes('gato')) { navigate('/login', { replace: true }); return wrap; }

  // Logged in: visor
  const top = createEl('div', { className: 'badge-row' });
  top.appendChild(createEl('span', { className: 'badge', text: `Usuario: ${me.username}` }));
  const logout = createEl('button', { className: 'btn', text: 'Salir' });
  logout.addEventListener('click', async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
    setToken('');
    navigate('/admin');
  });
  top.appendChild(logout);
  c.appendChild(top);

  const tabs = createEl('div', { className: 'admin-tabs' });
  const tabDash = createEl('button', { className: 'btn active', text: 'Dashboard' });
  const tabSolic = createEl('button', { className: 'btn', text: 'Solicitudes' });
  const tabMods = createEl('button', { className: 'btn', text: 'Modulos' });
  const tabUsers = createEl('button', { className: 'btn', text: 'Usuarios' });
  tabs.append(tabDash, tabSolic, tabMods, tabUsers);
  c.appendChild(tabs);

  const split = createEl('div', { className: 'admin-split' });
  split.style.setProperty('--left', '320px');
  const leftPane = createEl('div', { className: 'admin-pane left' });
  const handle = createEl('div', { className: 'split-handle', attrs: { role: 'separator', 'aria-orientation': 'vertical' } });
  const rightPane = createEl('div', { className: 'admin-pane' });
  split.append(leftPane, handle, rightPane);
  c.appendChild(split);

  // Draggable handle
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const start = parseInt(getComputedStyle(split).getPropertyValue('--left')) || 320;
    const onMove = (ev) => {
      const dx = ev.clientX - startX; let w = start + dx; w = Math.max(200, Math.min(w, 600));
      split.style.setProperty('--left', w + 'px');
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
  });

  // Solicitudes table utilities
  const tableWrap = createEl('div', { className: 'table-wrap' });
  const table = createEl('table', { className: 'table' });
  tableWrap.appendChild(table);
  const tools = createEl('div', { className: 'admin-toolbar' });
  const dlBtn = createEl('button', { className: 'btn', text: 'Descargar CSV' });
  tools.appendChild(dlBtn);

  async function downloadCsv(url, filename) {
    const token = getToken();
    const res = await fetch(url, { headers: token ? { authorization: `Bearer ${token}` } : {}, credentials: 'include' });
    if (!res.ok) { showModal('No se pudo descargar CSV', { title: 'Error' }); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
  }

  function renderRows(items, type) {
    table.innerHTML = '';
    const thead = createEl('thead');
    const trh = createEl('tr');
    const cols = type === 'course'
      ? ['fecha','nombre','email','empresa','interes','modalidad','mensaje','ip']
      : ['fecha','nombre','email','empresa','categoria','interes','tipo','alcance','ventanas','restricciones','contacto','ip'];
    cols.forEach(h => trh.appendChild(createEl('th', { text: h })));
    thead.appendChild(trh);
    const tbody = createEl('tbody');
    (items || []).forEach(r => {
      const tr = createEl('tr');
      const vals = type === 'course'
        ? [r.createdAt, r.nombre, r.email, r.empresa, r.interes, r.modalidad, r.mensaje, r.ip]
        : [r.createdAt, r.nombre, r.email, r.empresa, r.categoria, r.interes, r.tipo, r.alcance, r.ventanas, r.restricciones, r.contacto, r.ip];
      vals.forEach(v => tr.appendChild(createEl('td', { text: v || '' })));
      tbody.appendChild(tr);
    });
    table.append(thead, tbody);
  }

  async function load(type) {
    const url = type === 'course' ? '/api/forms/course' : '/api/forms/mission';
    const data = await getJSON(url, []);
    renderRows(data, type);
    dlBtn.onclick = () => downloadCsv(`${type === 'course' ? '/api/forms/course.csv' : '/api/forms/mission.csv'}`, `${type}_inquiries.csv`);
  }

  function setTab(btn) {
    [tabDash, tabSolic, tabMods, tabUsers].forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  // Dashboard tab
  async function showDashboard() {
    setTab(tabDash);
    leftPane.innerHTML = '';
    rightPane.innerHTML = '';
    const stats = await getJSON('/api/admin/stats', { coursesCount: 0, missionsCount: 0, usersCount: 0 });
    const grid = createEl('div', { className: 'stat-grid' });
    const cards = [
      { label: 'Form. Cursos', value: stats.coursesCount },
      { label: 'Form. Misiones', value: stats.missionsCount },
      { label: 'Usuarios', value: stats.usersCount },
    ];
    cards.forEach(s => {
      const el = createEl('div', { className: 'stat' });
      el.append(createEl('div', { className: 'label', text: s.label }), createEl('div', { className: 'value', text: String(s.value) }));
      grid.appendChild(el);
    });
    rightPane.appendChild(grid);
  }

  // Solicitudes tab
  async function showSolicitudes() {
    setTab(tabSolic);
    leftPane.innerHTML = '';
    rightPane.innerHTML = '';
    leftPane.append(createEl('h3', { text: 'Solicitudes' }), createEl('p', { className: 'muted', text: 'Filtra y descarga CSV.' }));
    const kindRow = createEl('div', { className: 'admin-toolbar' });
    const btnC = createEl('button', { className: 'btn', text: 'Cursos' });
    const btnM = createEl('button', { className: 'btn', text: 'Misiones' });
    kindRow.append(btnC, btnM);
    leftPane.append(kindRow, tools);
    rightPane.append(tableWrap);
    let current = 'course';
    btnC.classList.add('active');
    await load(current);
    btnC.addEventListener('click', async () => { current = 'course'; btnC.classList.add('active'); btnM.classList.remove('active'); await load('course'); });
    btnM.addEventListener('click', async () => { current = 'mission'; btnM.classList.add('active'); btnC.classList.remove('active'); await load('mission'); });
  }

  // Modules tab
  async function showModules() {
    setTab(tabMods);
    leftPane.innerHTML = '';
    rightPane.innerHTML = '';
    leftPane.append(createEl('h3', { text: 'Modulos' }), createEl('p', { className: 'muted', text: 'Sube videos o define URL.' }));
    const form = createEl('form', { className: 'cr-form' });
    const r1 = createEl('div', { className: 'form-row' }); r1.append(createEl('label', { text: 'Titulo' })); const iTitle = createEl('input', { attrs: { type: 'text', required: '' } }); r1.appendChild(iTitle);
    const r2 = createEl('div', { className: 'form-row' }); r2.append(createEl('label', { text: 'Descripcion' })); const iDesc = createEl('input', { attrs: { type: 'text' } }); r2.appendChild(iDesc);
    const r3 = createEl('div', { className: 'form-row' }); r3.append(createEl('label', { text: 'Orden' })); const iOrder = createEl('input', { attrs: { type: 'number', value: '0' } }); r3.appendChild(iOrder);
    const r4 = createEl('div', { className: 'form-row' }); r4.append(createEl('label', { text: 'Video (archivo)' })); const iFile = createEl('input', { attrs: { type: 'file', accept: 'video/*' } }); r4.appendChild(iFile);
    const r5 = createEl('div', { className: 'form-row' }); r5.append(createEl('label', { text: 'o URL de video' })); const iUrl = createEl('input', { attrs: { type: 'url', placeholder: 'https://...' } }); r5.appendChild(iUrl);
    const actions = createEl('div', { className: 'form-actions' }); const save = createEl('button', { className: 'btn btn-primary', text: 'Agregar' }); actions.appendChild(save);
    form.append(r1,r2,r3,r4,r5,actions);
    leftPane.appendChild(form);
    const modWrap = createEl('div', { className: 'table-wrap' }); const modTable = createEl('table', { className: 'table' }); modWrap.appendChild(modTable);
    rightPane.appendChild(modWrap);

    async function listModules() {
      const items = await getJSON('/api/admin/courses/modules', []);
      modTable.innerHTML = '';
      const thead = createEl('thead'); const trh = createEl('tr'); ['orden','titulo','video','acciones'].forEach(h=> trh.appendChild(createEl('th',{text:h}))); thead.appendChild(trh);
      const tbody = createEl('tbody');
      (items||[]).forEach(m => {
        const tr = createEl('tr');
        tr.append(createEl('td',{ text: String(m.order||0) }), createEl('td',{ text: m.title||'' }), createEl('td',{ children: [ createEl('a',{ text: 'ver', attrs: { href: m.videoUrl||'#', target: '_blank', rel: 'noopener noreferrer' } }) ] }));
        const tdAct = createEl('td');
        const del = createEl('button', { className: 'btn', text: 'Eliminar' });
        del.addEventListener('click', async () => {
          if (!confirm('Eliminar modulo?')) return;
          const token = getToken();
          await fetch(`/api/admin/courses/modules/${encodeURIComponent(m.id)}`, { method: 'DELETE', headers: token ? { authorization: `Bearer ${token}` } : {} });
          await listModules();
        });
        tdAct.appendChild(del);
        tr.appendChild(tdAct);
        tbody.appendChild(tr);
      });
      modTable.append(thead, tbody);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault(); save.disabled = true;
      try {
        let videoUrl = iUrl.value.trim();
        if (!videoUrl && iFile.files && iFile.files[0]) {
          const fd = new FormData(); fd.append('file', iFile.files[0]);
          const token = getToken();
          const up = await fetch('/api/admin/upload/video', { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: fd });
          if (!up.ok) throw new Error('No se pudo subir');
          const uj = await up.json(); videoUrl = uj.url;
        }
        const token = getToken();
        const headers = { 'content-type': 'application/json' };
        if (token) headers['authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/admin/courses/modules', { method: 'POST', headers, body: JSON.stringify({ title: iTitle.value, description: iDesc.value, order: iOrder.value, videoUrl }) });
        if (!res.ok) throw new Error('No se pudo crear');
        iTitle.value=''; iDesc.value=''; iOrder.value='0'; iFile.value=''; iUrl.value='';
        await listModules();
      } catch (err) { showModal(err.message||'Error', { title: 'Error' }); }
      finally { save.disabled = false; }
    });

    await listModules();
  }

  // Users tab
  async function showUsers() {
    setTab(tabUsers);
    leftPane.innerHTML = '';
    rightPane.innerHTML = '';
    leftPane.append(createEl('h3', { text: 'Usuarios' }), createEl('p', { className: 'muted', text: 'Gestiona roles y estado.' }));
    const uWrap = createEl('div', { className: 'table-wrap' }); const uTable = createEl('table', { className: 'table users-table' }); uWrap.appendChild(uTable);
    rightPane.appendChild(uWrap);
    const users = await getJSON('/api/admin/users', []);
    const thead = createEl('thead'); const trh = createEl('tr'); ['usuario','roles','activo','creado'].forEach(h => trh.appendChild(createEl('th',{text:h}))); thead.appendChild(trh);
    const tbody = createEl('tbody');
    (users||[]).forEach(u => {
      const tr = createEl('tr');
      tr.appendChild(createEl('td', { text: u.username }));
      const tdRole = createEl('td');
      const roleKeys = ['genin','shinobi','gato'];
      const roleLabels = { genin: 'genin', shinobi: 'shinobi', gato: 'sensei' };
      const current = Array.isArray(u.roles) ? new Set(u.roles) : new Set();
      roleKeys.forEach(rk => {
        const label = document.createElement('label');
        label.style.marginRight = '8px';
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = current.has(rk);
        cb.addEventListener('change', async () => {
          try {
            const roles = roleKeys.filter(k => (k===rk ? cb.checked : current.has(k)));
            const token = getToken(); const headers = { 'content-type': 'application/json' }; if (token) headers['authorization'] = `Bearer ${token}`;
            const res = await fetch(`/api/admin/users/${u._id}/roles`, { method: 'PUT', headers, body: JSON.stringify({ roles }) });
            if (res.ok) { const j = await res.json(); current.clear(); (j.roles||[]).forEach(x=>current.add(x)); }
          } catch {}
        });
        label.append(cb, document.createTextNode(' '+roleLabels[rk]));
        tdRole.appendChild(label);
      });
      tr.appendChild(tdRole);
      const tdAct = createEl('td'); const btnT = createEl('button', { className: 'btn', text: u.active ? 'Desactivar' : 'Activar' });
      btnT.addEventListener('click', async () => { const token = getToken(); const r = await fetch(`/api/admin/users/${u._id}/toggle-active`, { method: 'PUT', headers: token ? { authorization: `Bearer ${token}` } : {} }); const j = await r.json(); btnT.textContent = (j.active ? 'Desactivar' : 'Activar'); });
      tdAct.appendChild(btnT); tr.appendChild(tdAct);
      tr.appendChild(createEl('td', { text: (u.createdAt || '').split('T')[0] }));
      tbody.appendChild(tr);
    });
    uTable.append(thead, tbody);
  }

  // initial
  await showDashboard();
  tabDash.addEventListener('click', showDashboard);
  tabSolic.addEventListener('click', showSolicitudes);
  tabMods.addEventListener('click', showModules);
  tabUsers.addEventListener('click', showUsers);

  wrap.appendChild(c);
  return wrap;
}

