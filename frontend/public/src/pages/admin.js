import { $, createEl, showModal, navigate, updateAuthNav, getJSON, setToken, getToken } from '../lib/core.js'
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
  const tabMods = createEl('button', { className: 'btn', text: 'Ofertas' });
  const tabUsers = createEl('button', { className: 'btn', text: 'Usuarios' });
  tabs.append(tabDash, tabSolic, tabMods, tabUsers);
  c.appendChild(tabs);

  const split = createEl('div', { className: 'admin-split' });
  split.style.setProperty('--left', '320px');
  const leftPane = createEl('div', { className: 'admin-pane left' });
  const handle = createEl('div', { className: 'split-handle', attrs: { role: 'separator', 'aria-orientation': 'vertical' } });
  const rightPane = createEl('div', { className: 'admin-pane right' });
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

    let requests = {
      course: await getJSON('/api/forms/course', []),
      mission: await getJSON('/api/forms/mission', [])
    };
    let activeRequest = 'course';

    const formatDate = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
    };

    async function reload(type) {
      if (type === 'course') requests.course = await getJSON('/api/forms/course', []);
      if (type === 'mission') requests.mission = await getJSON('/api/forms/mission', []);
    }

    function render() {
      leftPane.innerHTML = '';
      rightPane.innerHTML = '';

      const heading = createEl('h3', { text: 'Solicitudes' });
      const sub = createEl('p', { className: 'muted', text: 'Revisa, descarga y depura solicitudes registradas.' });
      leftPane.append(heading, sub);

      const pillRow = createEl('div', { className: 'pill-group' });
      const btnCourses = createEl('button', { className: 'pill' + (activeRequest === 'course' ? ' active' : ''), text: 'Cursos' });
      const btnMissions = createEl('button', { className: 'pill' + (activeRequest === 'mission' ? ' active' : ''), text: 'Misiones' });
      btnCourses.addEventListener('click', () => { if (activeRequest !== 'course') { activeRequest = 'course'; render(); } });
      btnMissions.addEventListener('click', () => { if (activeRequest !== 'mission') { activeRequest = 'mission'; render(); } });
      pillRow.append(btnCourses, btnMissions);
      leftPane.appendChild(pillRow);

      const statsPanel = createEl('div', { className: 'panel form-panel' });
      statsPanel.appendChild(createEl('div', { className: 'panel-header', text: 'Resumen' }));
      const stats = [
        { label: 'Cursos', value: requests.course.length },
        { label: 'Misiones', value: requests.mission.length },
        { label: 'Total', value: requests.course.length + requests.mission.length }
      ];
      stats.forEach(({ label, value }) => {
        const row = createEl('div', { className: 'stat-line' });
        row.appendChild(createEl('span', { text: label }));
        row.appendChild(createEl('span', { className: 'stat-value', text: String(value) }));
        statsPanel.appendChild(row);
      });
      leftPane.appendChild(statsPanel);

      const listPanel = createEl('div', { className: 'panel list-panel' });
      const headerRow = createEl('div', { className: 'panel-header-row' });
      const headerTitle = createEl('div', { className: 'panel-header', text: activeRequest === 'course' ? 'Solicitudes de cursos' : 'Solicitudes de misiones' });
      const headerActions = createEl('div', { className: 'panel-actions' });
      const btnDownload = createEl('button', { className: 'btn', text: 'Descargar CSV' });
      btnDownload.addEventListener('click', () => {
        const url = activeRequest === 'course' ? '/api/forms/course.csv' : '/api/forms/mission.csv';
        const name = activeRequest === 'course' ? 'course_inquiries.csv' : 'mission_inquiries.csv';
        downloadCsv(url, name);
      });
      headerActions.appendChild(btnDownload);
      headerRow.append(headerTitle, headerActions);

      const listWrap = createEl('div', { className: 'offers-cards requests-wrap' });
      const current = requests[activeRequest] || [];
      if (!current.length) {
        listWrap.appendChild(createEl('p', { className: 'muted', text: 'Sin solicitudes registradas.' }));
      } else {
        current.forEach((item) => {
          const card = createEl('div', { className: 'offer-card request-card' });
          card.appendChild(createEl('h4', { text: item.nombre || 'Sin nombre' }));

          const details = document.createElement('dl');
          const addRow = (label, value) => {
            const dt = document.createElement('dt'); dt.textContent = label;
            const dd = document.createElement('dd'); dd.textContent = value || '';
            details.append(dt, dd);
          };
          addRow('Correo', item.email);
          addRow('Empresa', item.empresa);
          addRow('Interes', item.interes);
          if (activeRequest === 'course') addRow('Modalidad', item.modalidad);
          if (activeRequest === 'course') addRow('Mensaje', item.mensaje);
          if (activeRequest === 'mission') {
            addRow('Categoria', item.categoria);
            addRow('Tipo', item.tipo);
            addRow('Ventanas', item.ventanas);
            addRow('Restricciones', item.restricciones);
            addRow('Contacto', item.contacto);
          }
          addRow('Registrado', formatDate(item.createdAt));
          card.appendChild(details);

          const actions = createEl('div', { className: 'card-actions' });
          const del = createEl('button', { className: 'btn btn-danger', text: 'Eliminar' });
          del.addEventListener('click', async () => {
            if (!confirm('Eliminar esta solicitud?')) return;
            if (!requireSecret()) return;
            try {
              const endpoint = activeRequest === 'course' ? `/api/forms/course/${item._id}` : `/api/forms/mission/${item._id}`;
              const token = getToken();
              const headers = token ? { authorization: `Bearer ${token}` } : {};
              const res = await fetch(endpoint, { method: 'DELETE', headers, credentials: 'include' });
              if (!res.ok) throw new Error('No se pudo eliminar');
              await reload(activeRequest);
              render();
            } catch (err) {
              showModal(err.message || 'No se pudo eliminar', { title: 'Error' });
            }
          });
          actions.appendChild(del);
          card.appendChild(actions);
          listWrap.appendChild(card);
        });
      }

      listPanel.append(headerRow, listWrap);
      rightPane.appendChild(listPanel);
    }

    render();
  }

  // Ofertas tab renovada (Cursos y Misiones)
  async function showModules() {
    setTab(tabMods);

    let courses = await getJSON('/api/courses.json', []);
    let missions = await getJSON('/api/missions.json', { red: [], blue: [], social: [] });
    let activeTab = 'courses';
    let courseMode = 'virtual';
    let missionCat = 'all';

    function cleanCourse(course) {
      return {
        title: course.title,
        description: course.description || '',
        image: course.image || '',
        modalidad: (course.modalidad || course.modality || 'virtual'),
        price: course.price != null ? String(course.price) : '',
        category: course.category || '',
        link: course.link || '',
        tags: Array.isArray(course.tags) ? course.tags : [],
      };
    }

    async function saveCourses(next) {
      const token = getToken();
      const headers = { 'content-type': 'application/json' };
      if (token) headers['authorization'] = `Bearer ${token}`;
      const payload = next.map(cleanCourse);
      const res = await fetch('/api/courses.json', { method: 'POST', headers, body: JSON.stringify(payload), credentials: 'include' });
      if (!res.ok) throw new Error('No se pudo guardar cursos');
      courses = await getJSON('/api/courses.json', []);
    }

    async function saveMissions(next) {
      const token = getToken();
      const headers = { 'content-type': 'application/json' };
      if (token) headers['authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/missions.json', { method: 'POST', headers, body: JSON.stringify(next), credentials: 'include' });
      if (!res.ok) throw new Error('No se pudieron guardar misiones');
      missions = await getJSON('/api/missions.json', { red: [], blue: [], social: [] });
    }

    function renderTabs() {
      leftPane.innerHTML = '';
      const heading = createEl('h3', { text: 'Ofertas' });
      const sub = createEl('p', { className: 'muted', text: 'Administra cursos y misiones guardados en la base de datos.' });
      const tabRow = createEl('div', { className: 'pill-group' });
      const btnCourses = createEl('button', { className: 'pill' + (activeTab === 'courses' ? ' active' : ''), text: 'Cursos' });
      const btnMissions = createEl('button', { className: 'pill' + (activeTab === 'missions' ? ' active' : ''), text: 'Misiones' });
      btnCourses.addEventListener('click', () => { if (activeTab !== 'courses') { activeTab = 'courses'; courseMode = 'virtual'; renderCourses(); } });
      btnMissions.addEventListener('click', () => { if (activeTab !== 'missions') { activeTab = 'missions'; missionCat = 'red'; renderMissions(); } });
      tabRow.append(btnCourses, btnMissions);
      leftPane.append(heading, sub, tabRow);
    }

    function renderCourses() {
      activeTab = 'courses';
      renderTabs();
      rightPane.innerHTML = '';

      const modeRow = createEl('div', { className: 'pill-group tight' });
      const btnVirtual = createEl('button', { className: 'pill' + (courseMode === 'virtual' ? ' active' : ''), text: 'Virtual' });
      const btnPresencial = createEl('button', { className: 'pill' + (courseMode === 'presencial' ? ' active' : ''), text: 'Presencial' });
      btnVirtual.addEventListener('click', () => { courseMode = 'virtual'; renderCourses(); });
      btnPresencial.addEventListener('click', () => { courseMode = 'presencial'; renderCourses(); });
      leftPane.appendChild(modeRow);
      modeRow.append(btnVirtual, btnPresencial);

      const formPanel = createEl('div', { className: 'panel form-panel' });
      const form = createEl('form', { className: 'offers-form' });
      const titleInput = createEl('input', { attrs: { type: 'text', placeholder: 'Titulo', required: '' } });
      const infoInput = createEl('textarea', { attrs: { placeholder: 'Descripcion breve', rows: '3' } });
      const imageInput = createEl('input', { attrs: { type: 'file', accept: 'image/*' } });
      const priceInput = createEl('input', { attrs: { type: 'text', placeholder: 'Precio (solo virtual)' } });
      const categoryInput = createEl('input', { attrs: { type: 'text', placeholder: 'Categoria (solo presencial)' } });
      const submit = createEl('button', { className: 'btn btn-primary', text: 'Agregar curso' });
      const hint = createEl('span', { className: 'muted small', text: 'Sincroniza con /api/courses.json' });

      const titleGroup = createEl('div', { className: 'form-stack' });
      titleGroup.append(createEl('label', { className: 'form-label', text: 'Titulo' }), titleInput);
      const infoGroup = createEl('div', { className: 'form-stack' });
      infoGroup.append(createEl('label', { className: 'form-label', text: 'Info' }), infoInput);
      const imageGroup = createEl('div', { className: 'form-stack' });
      imageGroup.append(createEl('label', { className: 'form-label', text: 'Subir imagen' }), imageInput);
      const priceGroup = createEl('div', { className: 'form-stack' });
      priceGroup.append(createEl('label', { className: 'form-label', text: 'Precio (virtual)' }), priceInput);
      const categoryGroup = createEl('div', { className: 'form-stack' });
      categoryGroup.append(createEl('label', { className: 'form-label', text: 'Categoria (presencial)' }), categoryInput);

      form.append(titleGroup, infoGroup, imageGroup, priceGroup, categoryGroup, submit, hint);

      function toggleExtras() {
        priceGroup.style.display = courseMode === 'virtual' ? '' : 'none';
        categoryGroup.style.display = courseMode === 'presencial' ? '' : 'none';
      }
      toggleExtras();

      formPanel.appendChild(form);
      leftPane.appendChild(formPanel);

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submit.disabled = true;
        try {
          let imageUrl = '';
          if (imageInput.files && imageInput.files[0]) {
            const fd = new FormData(); fd.append('file', imageInput.files[0]);
            const token = getToken();
            const up = await fetch('/api/admin/upload/image', { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: fd });
            if (!up.ok) throw new Error('No se pudo subir la imagen');
            const uploaded = await up.json();
            imageUrl = uploaded.url || '';
          }
          const next = [...courses, {
            title: titleInput.value,
            description: infoInput.value,
            image: imageUrl,
            modalidad: courseMode,
            price: courseMode === 'virtual' ? priceInput.value : '',
            category: courseMode === 'presencial' ? categoryInput.value : '',
          }];
          await saveCourses(next);
          titleInput.value = '';
          infoInput.value = '';
          imageInput.value = '';
          priceInput.value = '';
          categoryInput.value = '';
          renderCourses();
        } catch (err) {
          showModal(err.message || 'No se pudo crear el curso', { title: 'Error' });
        } finally {
          submit.disabled = false;
        }
      });

      const listPanel = createEl('div', { className: 'panel list-panel' });
      const heading = createEl('div', { className: 'panel-header', text: courseMode === 'virtual' ? 'Cursos virtuales' : 'Cursos presenciales' });
      const listWrap = createEl('div', { className: 'offers-cards' });
      const filtered = courses
        .map((item, idx) => ({ item, idx }))
        .filter(x => (x.item.modalidad || x.item.modality || 'virtual') === courseMode);
      if (!filtered.length) {
        listWrap.appendChild(createEl('p', { className: 'muted', text: 'Sin registros en esta modalidad.' }));
      } else {
        filtered.forEach(({ item, idx }) => {
          const card = createEl('div', { className: 'offer-card' });
          card.appendChild(createEl('h4', { text: item.title || 'Curso' }));
          card.appendChild(createEl('p', { className: 'muted', text: item.description || '' }));
          if (courseMode === 'virtual' && item.price) {
            card.appendChild(createEl('span', { className: 'price-chip', text: `$${item.price}` }));
          }
          if (courseMode === 'presencial' && item.category) {
            card.appendChild(createEl('span', { className: 'badge', text: item.category }));
          }
          const actions = createEl('div', { className: 'card-actions' });
          const del = createEl('button', { className: 'btn btn-danger', text: 'Eliminar' });
          del.addEventListener('click', async () => {
            if (!confirm('Eliminar este curso?')) return;
            if (!requireSecret()) return;
            try {
              const next = courses.filter((_, i) => i !== idx);
              await saveCourses(next);
              renderCourses();
            } catch (err) {
              showModal(err.message || 'No se pudo eliminar', { title: 'Error' });
            }
          });
          actions.appendChild(del);
          card.appendChild(actions);
          listWrap.appendChild(card);
        });
      }
      listPanel.append(heading, listWrap);
      rightPane.appendChild(listPanel);
    }

    function renderMissions() {
      activeTab = 'missions';
      renderTabs();
      rightPane.innerHTML = '';

      const catRow = createEl('div', { className: 'pill-group tight' });
      const cats = [
        { key: 'all', label: 'Todas' },
        { key: 'red', label: 'Red Team' },
        { key: 'blue', label: 'Blue Team' },
        { key: 'social', label: 'Ing. Social' }
      ];
      cats.forEach(({ key, label }) => {
        const btn = createEl('button', { className: 'pill' + (missionCat === key ? ' active' : ''), text: label });
        btn.addEventListener('click', () => { missionCat = key; renderMissions(); });
        catRow.appendChild(btn);
      });
      leftPane.appendChild(catRow);

      const formPanel = createEl('div', { className: 'panel form-panel' });
      const form = createEl('form', { className: 'offers-form' });
      const titleInput = createEl('input', { attrs: { type: 'text', placeholder: 'Titulo', required: '' } });
      const infoInput = createEl('textarea', { attrs: { placeholder: 'Descripcion', rows: '3' } });
      const imageInput = createEl('input', { attrs: { type: 'file', accept: 'image/*' } });
      const categorySelect = createEl('select');
      [['red','Red Team'], ['blue','Blue Team'], ['social','Ing. Social']].forEach(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        categorySelect.appendChild(option);
      });
      categorySelect.value = missionCat === 'all' ? 'red' : missionCat;
      const submit = createEl('button', { className: 'btn btn-primary', text: 'Agregar mision' });
      const hint = createEl('span', { className: 'muted small', text: 'Sincroniza con /api/missions.json' });

      const titleGroup = createEl('div', { className: 'form-stack' });
      titleGroup.append(createEl('label', { className: 'form-label', text: 'Titulo' }), titleInput);
      const infoGroup = createEl('div', { className: 'form-stack' });
      infoGroup.append(createEl('label', { className: 'form-label', text: 'Info' }), infoInput);
      const imageGroup = createEl('div', { className: 'form-stack' });
      imageGroup.append(createEl('label', { className: 'form-label', text: 'Subir imagen' }), imageInput);
      const categoryGroup = createEl('div', { className: 'form-stack' });
      categoryGroup.append(createEl('label', { className: 'form-label', text: 'Categoria' }), categorySelect);

      form.append(titleGroup, infoGroup, imageGroup, categoryGroup, submit, hint);
      formPanel.appendChild(form);
      leftPane.appendChild(formPanel);

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submit.disabled = true;
        try {
          let imageUrl = '';
          if (imageInput.files && imageInput.files[0]) {
            const fd = new FormData(); fd.append('file', imageInput.files[0]);
            const token = getToken();
            const up = await fetch('/api/admin/upload/image', { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: fd });
            if (!up.ok) throw new Error('No se pudo subir la imagen');
            const uploaded = await up.json();
            imageUrl = uploaded.url || '';
          }
          const payload = {
            red: Array.isArray(missions.red) ? [...missions.red] : [],
            blue: Array.isArray(missions.blue) ? [...missions.blue] : [],
            social: Array.isArray(missions.social) ? [...missions.social] : [],
          };
          const target = categorySelect.value || 'red';
          payload[target].push({ title: titleInput.value, desc: infoInput.value, image: imageUrl, tags: [] });
          await saveMissions(payload);
          titleInput.value = '';
          infoInput.value = '';
          imageInput.value = '';
          categorySelect.value = missionCat === 'all' ? 'red' : missionCat;
          renderMissions();
        } catch (err) {
          showModal(err.message || 'No se pudo crear la mision', { title: 'Error' });
        } finally {
          submit.disabled = false;
        }
      });

      function buildMissionCard(item, catKey, idx) {
        const card = createEl('div', { className: 'offer-card' });
        card.appendChild(createEl('h4', { text: item.title || 'Mision' }));
        card.appendChild(createEl('p', { className: 'muted', text: item.desc || '' }));
        const actions = createEl('div', { className: 'card-actions' });
        const del = createEl('button', { className: 'btn btn-danger', text: 'Eliminar' });
        del.addEventListener('click', async () => {
          if (!confirm('Eliminar esta mision?')) return;
          if (!requireSecret()) return;
          try {
            const payload = {
              red: Array.isArray(missions.red) ? [...missions.red] : [],
              blue: Array.isArray(missions.blue) ? [...missions.blue] : [],
              social: Array.isArray(missions.social) ? [...missions.social] : [],
            };
            payload[catKey] = payload[catKey].filter((_, i) => i !== idx);
            await saveMissions(payload);
            renderMissions();
          } catch (err) {
            showModal(err.message || 'No se pudo eliminar', { title: 'Error' });
          }
        });
        actions.appendChild(del);
        card.appendChild(actions);
        return card;
      }

      const listPanel = createEl('div', { className: 'panel list-panel' });
      const heading = createEl('div', { className: 'panel-header', text: missionCat === 'all' ? 'Todas las misiones' : (missionCat === 'red' ? 'Red Team / Seguridad ofensiva' : missionCat === 'blue' ? 'Blue Team / Seguridad defensiva' : 'Ingenieria social') });
      const listWrap = createEl('div', { className: missionCat === 'all' ? 'mission-groups' : 'offers-cards' });

      if (missionCat === 'all') {
        const groups = [
          { key: 'red', label: 'Red Team / Seguridad ofensiva' },
          { key: 'blue', label: 'Blue Team / Seguridad defensiva' },
          { key: 'social', label: 'Ingenieria social' },
        ];
        groups.forEach(({ key, label }) => {
          const block = createEl('div', { className: 'offer-group' });
          block.appendChild(createEl('h4', { className: 'section-subtitle', text: label }));
          const grid = createEl('div', { className: 'offers-cards' });
          const arr = Array.isArray(missions[key]) ? missions[key] : [];
          if (!arr.length) {
            grid.appendChild(createEl('p', { className: 'muted', text: 'Sin misiones en esta categoria.' }));
          } else {
            arr.forEach((item, idx) => grid.appendChild(buildMissionCard(item, key, idx)));
          }
          block.appendChild(grid);
          listWrap.appendChild(block);
        });
      } else {
        const current = Array.isArray(missions[missionCat]) ? missions[missionCat] : [];
        if (!current.length) {
          listWrap.appendChild(createEl('p', { className: 'muted', text: 'Sin misiones en esta categoria.' }));
        } else {
          current.forEach((item, idx) => listWrap.appendChild(buildMissionCard(item, missionCat, idx)));
        }
      }

      listPanel.append(heading, listWrap);
      rightPane.appendChild(listPanel);
    }

    renderCourses();
  }

  // Users tab
  async function showUsers() {
    setTab(tabUsers);
    leftPane.innerHTML = '';
    rightPane.innerHTML = '';
    leftPane.append(createEl('h3', { text: 'Usuarios' }), createEl('p', { className: 'muted', text: 'Gestiona roles y estado.' }));
    const uWrap = createEl('div', { className: 'table-wrap' });
    const uTable = createEl('table', { className: 'table users-table' });
    uWrap.appendChild(uTable);
    rightPane.appendChild(uWrap);

    const users = await getJSON('/api/admin/users', []);
    const thead = createEl('thead');
    const trh = createEl('tr');
    ['usuario','roles','activo','creado'].forEach(h => trh.appendChild(createEl('th',{text:h})));
    thead.appendChild(trh);
    const tbody = createEl('tbody');

    const roleKeys = ['genin','shinobi','sensei','gato'];
    const roleLabels = { genin: 'genin', shinobi: 'shinobi', sensei: 'sensei', gato: 'shogun' };

    (users||[]).forEach(u => {
      const tr = createEl('tr');
      tr.appendChild(createEl('td', { text: u.username }));

      const tdRole = createEl('td');
      const currentRoles = Array.isArray(u.roles) ? new Set(u.roles) : new Set();
      roleKeys.forEach(rk => {
        const label = document.createElement('label');
        label.style.marginRight = '10px';
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = currentRoles.has(rk); cb.setAttribute('data-role', rk);
        label.append(cb, document.createTextNode(' '+roleLabels[rk]));
        tdRole.appendChild(label);
      });
      tr.appendChild(tdRole);

      const tdAct = createEl('td');
      const btnToggle = createEl('button', { className: 'btn', text: u.active ? 'Desactivar' : 'Activar' });
      const btnSave = createEl('button', { className: 'btn btn-primary', text: 'Guardar' });
      btnSave.style.marginLeft = '8px';

      btnSave.addEventListener('click', async () => {
        try {
          const roleChecks = Array.from(tdRole.querySelectorAll('input[type="checkbox"][data-role]'));
          const roles = roleChecks.filter(x => x.checked).map(x => x.getAttribute('data-role'));
          const token = getToken();
          const headers = { 'content-type': 'application/json' };
          if (token) headers['authorization'] = `Bearer ${token}`;
          const res = await fetch(`/api/admin/users/${u._id}/roles`, { method: 'PUT', headers, body: JSON.stringify({ roles }) });
          if (res.ok) {
            const j = await res.json();
            showModal('Roles actualizados', { title: 'Listo' });
            (j.roles||[]).forEach(() => {});
          } else {
            showModal('No se pudieron actualizar roles', { title: 'Error' });
          }
        } catch (err) {
          showModal(err?.message || 'No se pudieron actualizar roles', { title: 'Error' });
        }
      });

      btnToggle.addEventListener('click', async () => {
        try {
          const token = getToken();
          const res = await fetch(`/api/admin/users/${u._id}/toggle-active`, { method: 'PUT', headers: token ? { authorization: `Bearer ${token}` } : {} });
          const j = await res.json();
          btnToggle.textContent = j.active ? 'Desactivar' : 'Activar';
        } catch {}
      });

      tdAct.append(btnToggle, btnSave);
      tr.appendChild(tdAct);
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

