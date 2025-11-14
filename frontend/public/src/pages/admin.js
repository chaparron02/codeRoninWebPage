import { createEl, showModal, navigate, updateAuthNav, getJSON, setToken, getToken } from '../lib/core.js';

const DELETE_SECRET = 'gatito';
const ROLE_ORDER = ['genin','daimyo','shinobi','sensei','gato'];
const ROLE_LABELS = {
  gato: 'Shogun',
  sensei: 'Sensei',
  shinobi: 'Shinobi',
  genin: 'Genin',
  daimyo: 'Daimyo',
};

function roleLabel(role) {
  return ROLE_LABELS[role] || role;
}

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
  const roleList = Array.isArray(me?.roles) ? me.roles.map(r => String(r || '').toLowerCase()) : [];
  if (!me || !roleList.includes('gato')) {
    const card = createEl('div', { className: 'card admin-error' });
    card.appendChild(createEl('h3', { text: 'Sesion requerida' }));
    card.appendChild(createEl('p', { text: 'No pudimos validar tus permisos. Vuelve a iniciar sesion o escribe a coderonin404@gmail.com.' }));
    if (!token) {
      const back = createEl('button', { className: 'btn btn-primary', text: 'Ir al login' });
      back.addEventListener('click', () => navigate('/login', { replace: true }));
      card.appendChild(back);
    }
    root.appendChild(card);
    wrap.appendChild(root);
    return wrap;
  }
  updateAuthNav();

  const badgeRow = createEl('div', { className: 'badge-row' });
  badgeRow.appendChild(createEl('span', { className: 'badge admin-user', text: `Admin · ${me.username}` }));
  if (me.email) badgeRow.appendChild(createEl('span', { className: 'badge muted', text: me.email }));
  const logout = createEl('button', { className: 'btn btn-ghost', text: 'Salir' });
  logout.addEventListener('click', async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
    setToken('');
    navigate('/admin');
  });
  badgeRow.appendChild(logout);
  root.appendChild(badgeRow);

  const shell = createEl('div', { className: 'admin-shell' });
  const sidebar = createEl('aside', { className: 'admin-sidebar' });
  const navList = createEl('div', { className: 'admin-nav' });
  sidebar.appendChild(navList);
  const content = createEl('div', { className: 'admin-content-area' });
  shell.append(sidebar, content);
  root.appendChild(shell);

  function mountSplitView() {
    content.innerHTML = '';
    const wrap = createEl('div', { className: 'admin-split modern' });
    const left = createEl('div', { className: 'admin-pane left modern' });
    const right = createEl('div', { className: 'admin-pane right modern' });
    wrap.append(left, right);
    content.appendChild(wrap);
    return { left, right };
  }

  function mountPanel() {
    content.innerHTML = '';
    const panel = createEl('div', { className: 'admin-panel solo' });
    content.appendChild(panel);
    return panel;
  }

  const navConfig = [
    { id: 'dashboard', label: 'Dashboard', desc: 'Resumen general', handler: showDashboard },
    { id: 'requests', label: 'Solicitudes', desc: 'Formularios y desbloqueos', handler: showRequests },
    { id: 'missions', label: 'Misiones', desc: 'Asignacion y progreso', handler: showMissions },
    { id: 'briefings', label: 'Briefings', desc: 'Shinobi ↔ Daimyo', handler: showBriefings },
    { id: 'courses', label: 'Cursos', desc: 'Catalogo y pergaminos', handler: showCourses },
    { id: 'pdfs', label: 'PDFs', desc: 'Material descargable', handler: showPdfs },
    { id: 'tools', label: 'Herramientas', desc: 'Directorio de recursos', handler: showTools },
    { id: 'users', label: 'Usuarios', desc: 'Roles y accesos', handler: showUsers },
  ];

  const navHandlers = new Map();
  const navButtons = new Map();
  const openSection = async (id) => {
    const handler = navHandlers.get(id);
    if (typeof handler === 'function') {
      await handler();
    }
  };

  navConfig.forEach(({ id, label, desc, handler }, index) => {
    navHandlers.set(id, handler);
    const btn = createEl('button', {
      className: `admin-nav-btn${index === 0 ? ' active' : ''}`,
      attrs: { type: 'button', 'data-id': id },
    });
    btn.append(
      createEl('span', { className: 'nav-title', text: label }),
      createEl('span', { className: 'nav-desc', text: desc })
    );
    btn.addEventListener('click', () => openSection(id));
    navList.appendChild(btn);
    navButtons.set(id, btn);
  });

  function setNav(id) {
    navButtons.forEach((btn, key) => btn.classList.toggle('active', key === id));
  }

  const hero = createEl('div', { className: 'admin-hero' });
  const heroCopy = createEl('div', { className: 'admin-hero-copy' });
  heroCopy.appendChild(createEl('h3', { text: 'Orquesta misiones, cursos y accesos desde un solo tablero.' }));
  heroCopy.appendChild(createEl('p', { className: 'muted', text: 'Configura el catalogo, asigna shinobi, publica herramientas y revisa solicitudes en segundos.' }));
  const heroActions = createEl('div', { className: 'admin-quick-actions' });
  [
    { id: 'courses', label: 'Gestor de cursos' },
    { id: 'missions', label: 'Control de misiones' },
    { id: 'tools', label: 'Subir herramientas' },
  ].forEach(({ id, label }) => {
    const btn = createEl('button', { className: 'quick-btn', text: label });
    btn.addEventListener('click', () => openSection(id));
    heroActions.appendChild(btn);
  });
  const createUserLink = createEl('a', { className: 'quick-btn link', text: 'Crear usuario', attrs: { href: '/crear-usuario' } });
  heroActions.appendChild(createUserLink);
  hero.append(heroCopy, heroActions);
  root.insertBefore(hero, shell);

  async function showDashboard() {
    setNav('dashboard');
    const { left, right } = mountSplitView();
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
    setNav('requests');
    const { left, right } = mountSplitView();
    left.append(createEl('h3', { text: 'Solicitudes' }), info('Visualiza formularios y desbloqueos desde un panel unico.'));

    const state = {
      active: 'course',
      data: {
        course: await getJSON('/api/forms/course', []),
        mission: await getJSON('/api/forms/mission', []),
      },
    };

    const metricsCard = createEl('div', { className: 'card admin-metric-card' });
    const metricGrid = createEl('div', { className: 'metric-grid tight' });
    const items = [
      { label: 'Form. Cursos', value: state.data.course.length },
      { label: 'Form. Misiones', value: state.data.mission.length },
    ];
    items.forEach(({ label, value }) => {
      const metric = createEl('div', { className: 'metric-pill' });
      metric.append(createEl('span', { className: 'muted tiny', text: label }), createEl('strong', { text: String(value).padStart(2, '0') }));
      metricGrid.appendChild(metric);
    });
    metricsCard.append(metricGrid, info('Exporta cada listado o elimina peticiones con tu clave de seguridad.'));
    left.appendChild(metricsCard);

    const listCard = createEl('div', { className: 'card request-shell' });
    const tabBar = createEl('div', { className: 'admin-subtabs' });
    const tabCourse = createEl('button', { className: 'subtab active', text: 'Cursos' });
    const tabMission = createEl('button', { className: 'subtab', text: 'Misiones' });
    tabCourse.addEventListener('click', () => switchTab('course'));
    tabMission.addEventListener('click', () => switchTab('mission'));
    tabBar.append(tabCourse, tabMission);

    const headerRow = createEl('div', { className: 'request-header' });
    const headerTitle = createEl('h3', { text: 'Solicitudes de cursos' });
    const headerMeta = createEl('div', { className: 'request-meta' });
    const headerCount = createEl('span', { className: 'muted tiny' });
    const exportSlot = createEl('div', { className: 'request-export' });
    headerMeta.append(headerCount, exportSlot);
    headerRow.append(headerTitle, headerMeta);

    const listWrap = createEl('div', { className: 'request-list-grid' });
    listCard.append(tabBar, headerRow, listWrap);
    right.appendChild(listCard);

    function switchTab(tab) {
      if (state.active === tab) return;
      state.active = tab;
      tabCourse.classList.toggle('active', tab === 'course');
      tabMission.classList.toggle('active', tab === 'mission');
      render();
    }

    const render = () => {
      const current = state.data[state.active] || [];
      const title = state.active === 'course' ? 'Solicitudes de cursos' : 'Solicitudes de misiones';
      headerTitle.textContent = title;
      headerCount.textContent = `${current.length} registros`;
      exportSlot.innerHTML = '';
      const url = state.active === 'course' ? '/api/forms/course.csv' : '/api/forms/mission.csv';
      const filename = state.active === 'course' ? 'course_inquiries.csv' : 'mission_inquiries.csv';
      exportSlot.appendChild(csvButton('Exportar CSV', url, filename));

      listWrap.innerHTML = '';
      if (!current.length) {
        listWrap.appendChild(info('No hay solicitudes en esta categoria.'));
        return;
      }

      current.forEach(item => {
        const card = createEl('article', { className: 'request-card pro' });
        const head = createEl('div', { className: 'request-card-head' });
        head.appendChild(createEl('h4', { text: item.nombre || item.email || 'Solicitud' }));
        head.appendChild(createEl('span', { className: 'badge muted', text: formatDate(item.createdAt || item.fecha || '') }));
        card.appendChild(head);
        const metaList = createEl('dl');
        const rows = [
          { label: 'correo', value: item.email || '---' },
          { label: 'telefono', value: item.phone || item.celular || '---' },
          { label: 'mensaje', value: item.mensaje || item.message || item.servicio || '' },
        ];
        rows.forEach(({ label, value }) => {
          if (!value) return;
          metaList.append(createEl('dt', { text: label.toUpperCase() }), createEl('dd', { text: value }));
        });
        card.appendChild(metaList);
        const actions = createEl('div', { className: 'request-actions' });
        const remove = createEl('button', { className: 'btn btn-danger btn-sm', text: 'Eliminar' });
        remove.addEventListener('click', async () => {
          if (!requireSecret()) return;
          try {
            const itemId = item.id || item._id;
            const endpoint = state.active === 'course'
              ? `/api/forms/course/${encodeURIComponent(itemId)}`
              : `/api/forms/mission/${encodeURIComponent(itemId)}`;
            const res = await fetch(endpoint, { method: 'DELETE', headers: token ? { authorization: `Bearer ${token}` } : {}, credentials: 'include' });
            if (!res.ok) throw new Error();
            state.data[state.active] = current.filter(entry => (entry.id || entry._id) !== itemId);
            render();
          } catch {
            showModal('No se pudo eliminar la solicitud', { title: 'Error' });
          }
        });
        actions.appendChild(remove);
        card.appendChild(actions);
        listWrap.appendChild(card);
      });
    };

    render();
  }

  async function showMissions() {
    setNav('missions');
    const { left, right } = mountSplitView();
    left.append(createEl('h3', { text: 'Misiones' }), info('Crea misiones y asigna shinobi.'));

    const [missions, users] = await Promise.all([
      getJSON('/api/admin/missions', []),
      getJSON('/api/admin/users', []),
    ]);

    const shinobiOptions = users.filter(u => Array.isArray(u.roles) && u.roles.includes('shinobi'));
    const shogunOptions = users.filter(u => Array.isArray(u.roles) && u.roles.includes('gato'));
    const daimyoOptions = users.filter(u => Array.isArray(u.roles) && u.roles.includes('daimyo'));

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
    shinobiOptions.forEach(u => {
      const value = u.id || u._id;
      shinobiSelect.appendChild(new Option(u.username || value, value));
    });
    const shogunSelect = document.createElement('select');
    shogunSelect.className = 'access-select';
    shogunSelect.appendChild(new Option('Asignar shogun (opcional)', '', true, true));
    shogunOptions.forEach(u => {
      const value = u.id || u._id;
      shogunSelect.appendChild(new Option(u.username || value, value));
    });

    const sponsorSelect = document.createElement('select');
    sponsorSelect.className = 'access-select';
    sponsorSelect.appendChild(new Option('Asignar daimyo (opcional)', '', true, true));
    daimyoOptions.forEach(u => {
      const value = u.id || u._id;
      sponsorSelect.appendChild(new Option(u.username || value, value));
    });

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
    addRow('Daimyo', sponsorSelect);
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
          sponsorId: sponsorSelect.value || '',
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
        sponsorSelect.value = '';
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
        if (item.sponsor) card.appendChild(info(`Daimyo: ${item.sponsor.username || item.sponsor.id}`));
        card.appendChild(info(`Estado: ${item.status || 'iniciando'} | Progreso: ${item.progress || 0}%`));
        card.appendChild(info(`Actualizado: ${formatDate(item.updatedAt || item.createdAt)}`));

        const actions = createEl('div', { className: 'mission-actions' });
        const shinobiSel = document.createElement('select');
        shinobiSel.className = 'access-select';
        shinobiSel.appendChild(new Option('Asignar shinobi', '', true, true));
      shinobiOptions.forEach(u => {
        const value = u.id || u._id;
        shinobiSel.appendChild(new Option(u.username || value, value));
      });
        shinobiSel.value = item.client ? item.client.id : '';

        const shogunSel = document.createElement('select');
        shogunSel.className = 'access-select';
        shogunSel.appendChild(new Option('Asignar shogun', '', true, true));
      shogunOptions.forEach(u => {
        const value = u.id || u._id;
        shogunSel.appendChild(new Option(u.username || value, value));
      });
        shogunSel.value = item.shogun ? item.shogun.id : '';

        const sponsorSel = document.createElement('select');
        sponsorSel.className = 'access-select';
        sponsorSel.appendChild(new Option('Asignar daimyo', '', true, true));
      daimyoOptions.forEach(u => {
        const value = u.id || u._id;
        sponsorSel.appendChild(new Option(u.username || value, value));
      });
        sponsorSel.value = item.sponsor ? item.sponsor.id : '';

        const save = createEl('button', { className: 'btn btn-primary btn-sm', text: 'Actualizar' });
        save.addEventListener('click', async () => {
          try {
            const payload = {
              shinobiId: shinobiSel.value || '',
              shogunId: shogunSel.value || '',
              sponsorId: sponsorSel.value || '',
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
        actions.append(shinobiSel, shogunSel, sponsorSel, save, remove, view);
        card.appendChild(actions);
        listCard.appendChild(card);
      });
    }

    renderList();
  }

  async function showBriefings() {
    setNav('briefings');
    const { left, right } = mountSplitView();
    left.append(createEl('h3', { text: 'Briefings' }), info('Asigna el shinobi operativo y el daimyo que recibira los avances.'));

    const [missions, users] = await Promise.all([
      getJSON('/api/admin/missions', []),
      getJSON('/api/admin/users', []),
    ]);
    const shinobiOptions = users.filter(u => Array.isArray(u.roles) && u.roles.includes('shinobi'));
    const daimyoOptions = users.filter(u => Array.isArray(u.roles) && u.roles.includes('daimyo'));

    if (!missions.length) {
      right.appendChild(info('Aun no hay misiones activas.'));
      return;
    }

    const tableWrap = createEl('div', { className: 'table-wrap' });
    const table = createEl('table', { className: 'table users-table' });
    const thead = createEl('thead');
    const head = createEl('tr');
    ['Mision','Shinobi','Daimyo','Estado','Acciones'].forEach(label => head.appendChild(createEl('th', { text: label })));
    thead.appendChild(head);
    table.appendChild(thead);
    const tbody = createEl('tbody');

    missions.forEach((mission) => {
      const tr = createEl('tr');
      tr.appendChild(createEl('td', { text: mission.title || 'Mision' }));

      const shinobiCell = createEl('td');
      const shinobiSel = document.createElement('select');
      shinobiSel.className = 'access-select';
      shinobiSel.appendChild(new Option('Asignar shinobi', '', true, true));
      shinobiOptions.forEach((opt) => {
        const value = opt.id || opt._id;
        shinobiSel.appendChild(new Option(opt.username || value, value));
      });
      shinobiSel.value = mission.client ? mission.client.id : '';
      shinobiCell.appendChild(shinobiSel);
      tr.appendChild(shinobiCell);

      const daimyoCell = createEl('td');
      const daimyoSel = document.createElement('select');
      daimyoSel.className = 'access-select';
      daimyoSel.appendChild(new Option('Asignar daimyo', '', true, true));
      daimyoOptions.forEach((opt) => {
        const value = opt.id || opt._id;
        daimyoSel.appendChild(new Option(opt.username || value, value));
      });
      daimyoSel.value = mission.sponsor ? mission.sponsor.id : '';
      daimyoCell.appendChild(daimyoSel);
      tr.appendChild(daimyoCell);

      tr.appendChild(createEl('td', { text: `${mission.status || 'Sin estado'} (${mission.progress ?? 0}%)` }));

      const actionCell = createEl('td');
      const saveBtn = createEl('button', { className: 'btn btn-primary btn-sm', text: 'Actualizar' });
      const viewBtn = createEl('a', { className: 'btn btn-ghost btn-sm', text: 'Ver tablero', attrs: { href: `/reporte?id=${encodeURIComponent(mission.id)}` } });
      saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        try {
          const payload = {
            shinobiId: shinobiSel.value || '',
            sponsorId: daimyoSel.value || '',
          };
          const res = await fetch(`/api/admin/missions/${encodeURIComponent(mission.id)}`, {
            method: 'PUT',
            headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error();
          showModal('Asignacion actualizada', { title: 'Listo' });
        } catch {
          showModal('No se pudo actualizar la asignacion', { title: 'Error' });
        } finally {
          saveBtn.disabled = false;
        }
      });
      actionCell.append(saveBtn, viewBtn);
      tr.appendChild(actionCell);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrap.appendChild(table);
    right.appendChild(tableWrap);
  }

  async function showCourses() {
    setNav('courses');
    const { left, right } = mountSplitView();
    left.append(
      createEl('h3', { text: 'Cursos' }),
      info('Registra nuevos cursos, archiva ediciones antiguas y enlaza rapidamente a Pergaminos para subir modulos.')
    );

    const formCard = createEl('div', { className: 'card course-form-card' });
    formCard.appendChild(createEl('h3', { text: 'Nuevo curso' }));
    const form = createEl('form', { className: 'cr-form course-form', attrs: { autocomplete: 'off' } });
    const inputTitle = createEl('input', { attrs: { type: 'text', required: '', placeholder: 'Nombre del curso' } });
    const inputDesc = createEl('textarea', { attrs: { rows: '3', placeholder: 'Descripcion breve' } });
    const inputCategory = createEl('input', { attrs: { type: 'text', placeholder: 'Categoria' } });
    const selectModality = document.createElement('select');
    ['virtual','presencial','hibrido'].forEach((opt) => {
      const option = new Option(opt.charAt(0).toUpperCase() + opt.slice(1), opt);
      selectModality.appendChild(option);
    });
    const inputImage = createEl('input', { attrs: { type: 'url', placeholder: 'URL de imagen (opcional)' } });
    const inputLink = createEl('input', { attrs: { type: 'url', placeholder: 'Landing o ficha del curso' } });
    const inputPrice = createEl('input', { attrs: { type: 'text', placeholder: 'Precio (opcional)' } });
    const inputTags = createEl('input', { attrs: { type: 'text', placeholder: 'Tags separados por coma' } });

    const buildRow = (label, field) => {
      const row = createEl('div', { className: 'form-row' });
      row.append(createEl('label', { text: label }), field);
      return row;
    };
    form.append(
      buildRow('Titulo', inputTitle),
      buildRow('Descripcion', inputDesc),
      buildRow('Categoria', inputCategory),
      buildRow('Modalidad', selectModality),
      buildRow('Imagen', inputImage),
      buildRow('Enlace', inputLink),
      buildRow('Precio', inputPrice),
      buildRow('Tags', inputTags),
    );

    const formActions = createEl('div', { className: 'form-actions course-actions' });
    const submitBtn = createEl('button', { className: 'btn btn-primary', text: 'Guardar curso' });
    const cancelEditBtn = createEl('button', { className: 'btn btn-ghost', text: 'Cancelar', attrs: { type: 'button' } });
    cancelEditBtn.style.display = 'none';
    formActions.append(submitBtn, cancelEditBtn);
    form.appendChild(formActions);
    formCard.appendChild(form);
    left.appendChild(formCard);

    const listCard = createEl('div', { className: 'card course-list-card' });
    const listHeader = createEl('div', { className: 'panel-header' });
    listHeader.appendChild(createEl('h3', { text: 'Catalogo' }));
    const filterBar = createEl('div', { className: 'pill-group' });
    const btnActive = createEl('button', { className: 'pill active', text: 'Activos' });
    const btnArchived = createEl('button', { className: 'pill', text: 'Archivados' });
    filterBar.append(btnActive, btnArchived);
    listHeader.appendChild(filterBar);
    listCard.appendChild(listHeader);
    const listWrap = createEl('div', { className: 'course-list' });
    listCard.appendChild(listWrap);
    right.appendChild(listCard);

    const state = {
      list: await getJSON('/api/admin/courses', []),
      filter: 'active',
    };
    let editingId = null;

    function resetForm() {
      editingId = null;
      formCard.querySelector('h3').textContent = 'Nuevo curso';
      submitBtn.textContent = 'Guardar curso';
      cancelEditBtn.style.display = 'none';
      inputTitle.value = '';
      inputDesc.value = '';
      inputCategory.value = '';
      selectModality.value = 'virtual';
      inputImage.value = '';
      inputLink.value = '';
      inputPrice.value = '';
      inputTags.value = '';
    }

    function populateForm(course) {
      editingId = course.id;
      formCard.querySelector('h3').textContent = 'Editar curso';
      submitBtn.textContent = 'Actualizar curso';
      cancelEditBtn.style.display = '';
      inputTitle.value = course.title || '';
      inputDesc.value = course.description || '';
      inputCategory.value = course.category || '';
      selectModality.value = (course.modalidad || 'virtual');
      inputImage.value = course.image || '';
      inputLink.value = course.link || '';
      inputPrice.value = course.price || '';
      inputTags.value = (Array.isArray(course.tags) ? course.tags : []).join(', ');
      inputTitle.focus();
    }

    async function refreshCourses() {
      state.list = await getJSON('/api/admin/courses', []);
      renderList();
    }

    function tagsFromInput() {
      return inputTags.value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        title: inputTitle.value.trim(),
        description: inputDesc.value.trim(),
        category: inputCategory.value.trim(),
        modalidad: selectModality.value,
        image: inputImage.value.trim(),
        link: inputLink.value.trim(),
        price: inputPrice.value.trim() || null,
        tags: tagsFromInput(),
      };
      if (!payload.title) {
        showModal('El titulo es obligatorio', { title: 'Atencion' });
        return;
      }
      submitBtn.disabled = true;
      try {
        const headers = { 'content-type': 'application/json' };
        if (token) headers.authorization = `Bearer ${token}`;
        if (editingId) {
        const res = await fetch(`/api/admin/courses/${encodeURIComponent(editingId)}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
          credentials: 'include',
        });
          if (!res.ok) throw new Error('No se pudo actualizar el curso');
          showModal('Curso actualizado', { title: 'Listo' });
        } else {
        const res = await fetch('/api/admin/courses', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          credentials: 'include',
        });
          if (!res.ok) throw new Error('No se pudo crear el curso');
          showModal('Curso registrado', { title: 'Listo' });
        }
        resetForm();
        await refreshCourses();
      } catch (err) {
        showModal(err.message || 'No se pudo guardar el curso', { title: 'Error' });
      } finally {
        submitBtn.disabled = false;
      }
    });

    cancelEditBtn.addEventListener('click', resetForm);

    btnActive.addEventListener('click', () => {
      state.filter = 'active';
      btnActive.classList.add('active');
      btnArchived.classList.remove('active');
      renderList();
    });
    btnArchived.addEventListener('click', () => {
      state.filter = 'archived';
      btnArchived.classList.add('active');
      btnActive.classList.remove('active');
      renderList();
    });

    async function toggleArchive(course) {
      try {
        const headers = { 'content-type': 'application/json' };
        if (token) headers.authorization = `Bearer ${token}`;
        const res = await fetch(`/api/admin/courses/${encodeURIComponent(course.id)}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ isArchived: !course.isArchived }),
          credentials: 'include',
        });
        if (!res.ok) throw new Error();
        await refreshCourses();
      } catch {
        showModal('No se pudo cambiar el estado del curso', { title: 'Error' });
      }
    }

    async function removeCourse(course) {
      if (!requireSecret()) return;
      if (!window.confirm(`Eliminar el curso ${course.title}? Esta accion es irreversible.`)) return;
      try {
        const headers = token ? { authorization: `Bearer ${token}` } : {};
        const res = await fetch(`/api/admin/courses/${encodeURIComponent(course.id)}`, {
          method: 'DELETE',
          headers,
          credentials: 'include',
        });
        if (!res.ok && res.status !== 204) throw new Error();
        await refreshCourses();
      } catch {
        showModal('No se pudo eliminar el curso', { title: 'Error' });
      }
    }

    function renderList() {
      listWrap.innerHTML = '';
      const filtered = state.list.filter(course => (state.filter === 'archived' ? course.isArchived : !course.isArchived));
      if (!filtered.length) {
        listWrap.appendChild(info(state.filter === 'archived' ? 'No hay cursos archivados.' : 'Aun no hay cursos activos.'));
        return;
      }
      filtered.forEach(course => {
        const item = createEl('article', { className: 'course-item' });
        const header = createEl('div', { className: 'course-item-head' });
        header.appendChild(createEl('h4', { text: course.title || 'Curso' }));
        const status = createEl('span', { className: course.isArchived ? 'badge muted' : 'badge role-shogun', text: course.isArchived ? 'Archivado' : 'Activo' });
        header.appendChild(status);
        item.appendChild(header);
        if (course.description) {
          item.appendChild(createEl('p', { className: 'muted', text: course.description }));
        }
        const meta = createEl('div', { className: 'course-meta' });
        meta.appendChild(createEl('span', { className: 'muted tiny', text: `Modalidad: ${course.modalidad || 'virtual'}` }));
        meta.appendChild(createEl('span', { className: 'muted tiny', text: `Modulos: ${course.moduleCount ?? 0}` }));
        if (course.category) meta.appendChild(createEl('span', { className: 'muted tiny', text: course.category }));
        item.appendChild(meta);
        if (Array.isArray(course.tags) && course.tags.length) {
          const tagsRow = createEl('div', { className: 'course-tags' });
          course.tags.forEach(tag => tagsRow.appendChild(createEl('span', { className: 'scrolls-pill', text: tag })));
          item.appendChild(tagsRow);
        }
        const actions = createEl('div', { className: 'course-actions' });
        const editBtn = createEl('button', { className: 'btn btn-sm', text: 'Editar' });
        editBtn.addEventListener('click', () => populateForm(course));
        const archiveBtn = createEl('button', { className: 'btn btn-ghost btn-sm', text: course.isArchived ? 'Restaurar' : 'Archivar' });
        archiveBtn.addEventListener('click', () => toggleArchive(course));
        const deleteBtn = createEl('button', { className: 'btn btn-danger btn-sm', text: 'Eliminar' });
        deleteBtn.addEventListener('click', () => removeCourse(course));
        const scrollBtn = createEl('a', { className: 'btn btn-ghost btn-sm', text: 'Pergaminos', attrs: { href: '/pergaminos' } });
        actions.append(editBtn, archiveBtn, deleteBtn, scrollBtn);
        item.appendChild(actions);
        listWrap.appendChild(item);
      });
    }

    renderList();
  }

  async function showPdfs() {
    setNav('pdfs');
    const { left, right } = mountSplitView();
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
    setNav('tools');
    const { left, right } = mountSplitView();
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
    setNav('users');
    const { left, right } = mountSplitView();
    left.append(createEl('h3', { text: 'Usuarios' }), info('Actualiza roles y accesos manuales.'));

    const tableWrap = createEl('div', { className: 'table-wrap' });
    const table = createEl('table', { className: 'table users-table' });
    tableWrap.appendChild(table);
    right.appendChild(tableWrap);

    const [users, courses, recoveries] = await Promise.all([
      getJSON('/api/admin/users', []),
      getJSON('/api/courses.json', []),
      getJSON('/api/admin/recovery-requests', []),
    ]);

    const pendingRecoveries = Array.isArray(recoveries) ? recoveries.filter(r => r.status === 'pending') : [];
    const alertsCard = createEl('div', { className: 'card recovery-card' });
    alertsCard.appendChild(createEl('h3', { text: 'Solicitudes de desbloqueo' }));
    const alertsBody = createEl('div', { className: 'recovery-list' });
    const renderRecoveries = () => {
      alertsBody.innerHTML = '';
      if (!pendingRecoveries.length) {
        alertsBody.appendChild(info('No hay solicitudes pendientes.'));
        return;
      }
      pendingRecoveries.forEach((req) => {
        const block = createEl('div', { className: 'recovery-item' });
        block.appendChild(createEl('strong', { text: req.username || 'Usuario sin especificar' }));
        const metaParts = [];
        if (req.email) metaParts.push(req.email);
        if (req.createdAt) metaParts.push(new Date(req.createdAt).toLocaleString());
        if (metaParts.length) block.appendChild(createEl('p', { className: 'muted tiny', text: metaParts.join(' • ') }));
        if (req.message) block.appendChild(createEl('p', { className: 'muted', text: req.message }));
        const actions = createEl('div', { className: 'recovery-actions' });
        ['resolved', 'rejected'].forEach((state) => {
          const btn = createEl('button', { className: state === 'resolved' ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm', text: state === 'resolved' ? 'Marcar resuelto' : 'Rechazar' });
          btn.addEventListener('click', async () => {
            btn.disabled = true;
            try {
              const headers = { 'content-type': 'application/json' };
              if (token) headers.authorization = `Bearer ${token}`;
              const res = await fetch(`/api/admin/recovery-requests/${encodeURIComponent(req.id)}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status: state }),
              });
              if (!res.ok) throw new Error();
              const idx = pendingRecoveries.findIndex((r) => r.id === req.id);
              if (idx >= 0) pendingRecoveries.splice(idx, 1);
              renderRecoveries();
            } catch {
              showModal('No se pudo actualizar la solicitud', { title: 'Error' });
            } finally {
              btn.disabled = false;
            }
          });
          actions.appendChild(btn);
        });
        block.appendChild(actions);
        alertsBody.appendChild(block);
      });
    };
    renderRecoveries();
    alertsCard.appendChild(alertsBody);
    right.prepend(alertsCard);

    const courseOptions = courses
      .filter(c => (c.modalidad || 'virtual') === 'virtual')
      .map(c => {
        const id = c && (c.id || c._id || c.title || c.name);
        if (!id) return null;
        return { id: String(id), label: c.title || c.name || String(id) };
      })
      .filter(Boolean);

    const thead = createEl('thead');
    const head = createEl('tr');
    ['usuario','nombre','correo','roles','accesos','estado','acciones','creado'].forEach(label => head.appendChild(createEl('th', { text: label })));
    thead.appendChild(head);
    const tbody = createEl('tbody');
    const buildHeaders = () => {
      const headers = { 'content-type': 'application/json' };
      if (token) headers.authorization = `Bearer ${token}`;
      return headers;
    };

    users.forEach((user) => {
      const tr = createEl('tr');
      const usernameInput = createEl('input', { className: 'table-input', attrs: { type: 'text', value: user.username || '', maxlength: '32', placeholder: 'usuario' } });
      const usernameCell = createEl('td');
      usernameCell.appendChild(usernameInput);
      tr.appendChild(usernameCell);

      const nameInput = createEl('input', { className: 'table-input', attrs: { type: 'text', value: user.displayName || user.name || '', placeholder: 'Nombre' } });
      const nameCell = createEl('td');
      nameCell.appendChild(nameInput);
      tr.appendChild(nameCell);

      const emailInput = createEl('input', { className: 'table-input', attrs: { type: 'email', value: user.email || '', placeholder: 'correo@dominio' } });
      const emailCell = createEl('td');
      emailCell.appendChild(emailInput);
      tr.appendChild(emailCell);

      const roleCell = createEl('td');
      const rolesSet = new Set(Array.isArray(user.roles) ? user.roles : []);
      ROLE_ORDER.forEach(role => {
        const label = document.createElement('label');
        label.style.marginRight = '8px';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = rolesSet.has(role);
        cb.setAttribute('data-role', role);
        label.append(cb, document.createTextNode(` ${roleLabel(role).toLowerCase()}`));
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

      const stateCell = createEl('td');
      const stateBadge = createEl('span', { className: user.active ? 'badge role-shogun' : 'badge muted', text: user.active ? 'Activo' : 'Inactivo' });
      stateBadge.style.marginRight = '8px';
      const toggleBtn = createEl('button', { className: 'btn btn-ghost btn-sm', text: user.active ? 'Desactivar' : 'Activar' });
      stateCell.append(stateBadge, toggleBtn);
      tr.appendChild(stateCell);

      const actionsCell = createEl('td');
      const saveBtn = createEl('button', { className: 'btn btn-primary btn-sm', text: 'Guardar' });
      const resetBtn = createEl('button', { className: 'btn btn-ghost btn-sm', text: 'Reset clave' });
      const deleteBtn = createEl('button', { className: 'btn btn-danger btn-sm', text: 'Eliminar' });
      actionsCell.append(saveBtn, resetBtn, deleteBtn);
      tr.appendChild(actionsCell);

      const createdCell = createEl('td', { text: (user.createdAt || '').split('T')[0] });
      tr.appendChild(createdCell);
      tbody.appendChild(tr);

      toggleBtn.addEventListener('click', async () => {
        try {
          const res = await fetch(`/api/admin/users/${user.id}/toggle-active`, {
            method: 'PUT',
            headers: token ? { authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) throw new Error();
          const result = await res.json();
          user.active = result.active;
          stateBadge.textContent = result.active ? 'Activo' : 'Inactivo';
          stateBadge.className = result.active ? 'badge role-shogun' : 'badge muted';
          toggleBtn.textContent = result.active ? 'Desactivar' : 'Activar';
        } catch {
          showModal('No se pudo cambiar el estado del usuario', { title: 'Error' });
        }
      });

      saveBtn.addEventListener('click', async () => {
        try {
          saveBtn.disabled = true;
          const headers = buildHeaders();
          const username = usernameInput.value.trim();
          const displayName = nameInput.value.trim();
          const emailValue = emailInput.value.trim();
          const roleChecks = Array.from(roleCell.querySelectorAll('input[type="checkbox"][data-role]'));
          const roles = roleChecks.filter(x => x.checked).map(x => x.getAttribute('data-role'));
          const coursesPayload = Array.from(assignedCourses);
          const servicesPayload = serviceArea.value.split(/\r?\n|,/).map(s => s.trim()).filter(Boolean);

          const [resUser, resRoles, resAccess] = await Promise.all([
            fetch(`/api/admin/users/${user.id}`, {
              method: 'PUT',
              headers,
              body: JSON.stringify({ username, name: displayName, email: emailValue }),
            }),
            fetch(`/api/admin/users/${user.id}/roles`, {
              method: 'PUT',
              headers,
              body: JSON.stringify({ roles }),
            }),
            fetch(`/api/admin/access-map/${user.id}`, {
              method: 'PUT',
              headers,
              body: JSON.stringify({ courses: coursesPayload, services: servicesPayload }),
            }),
          ]);

          if (!resUser.ok || !resRoles.ok || !resAccess.ok) throw new Error();
          const updated = await resUser.json();
          if (updated?.user) {
            user.username = updated.user.username || user.username;
            user.displayName = updated.user.displayName || displayName;
            user.name = updated.user.name || displayName;
            user.email = updated.user.email || emailValue;
          } else {
            user.username = username;
            user.displayName = displayName;
            user.email = emailValue;
          }
          user.roles = roles;
          showModal('Usuario actualizado', { title: 'Listo' });
        } catch {
          showModal('No se pudieron actualizar los datos', { title: 'Error' });
        } finally {
          saveBtn.disabled = false;
        }
      });

      resetBtn.addEventListener('click', async () => {
        const password = window.prompt('Nueva clave (min 8 caracteres, una mayuscula y un simbolo)');
        if (!password) return;
        try {
          resetBtn.disabled = true;
          const res = await fetch(`/api/admin/users/${user.id}/password`, {
            method: 'PUT',
            headers: buildHeaders(),
            body: JSON.stringify({ password }),
          });
          if (!res.ok) throw new Error();
          showModal('Contrasena restablecida', { title: 'Listo' });
        } catch {
          showModal('No se pudo actualizar la contrasena', { title: 'Error' });
        } finally {
          resetBtn.disabled = false;
        }
      });

      deleteBtn.addEventListener('click', async () => {
        if (!requireSecret()) return;
        if (!window.confirm(`Eliminar al usuario ${user.username}? Esta accion es permanente.`)) return;
        try {
          deleteBtn.disabled = true;
          const res = await fetch(`/api/admin/users/${user.id}`, {
            method: 'DELETE',
            headers: token ? { authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok && res.status !== 204) throw new Error();
          const idx = users.findIndex(u => u.id === user.id);
          if (idx >= 0) users.splice(idx, 1);
          tr.remove();
        } catch {
          showModal('No se pudo eliminar el usuario', { title: 'Error' });
        } finally {
          deleteBtn.disabled = false;
        }
      });
    });

    table.append(thead, tbody);
  }

  await openSection('dashboard');

  wrap.appendChild(root);
  return wrap;
}
