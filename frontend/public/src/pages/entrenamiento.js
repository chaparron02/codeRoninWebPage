import { createEl, showModal, updateAuthNav, getJSON } from '../lib/core.js'

function info(text) {
  return createEl('p', { className: 'muted small', text });
}

function emptyState(title, message) {
  const box = createEl('div', { className: 'training-empty' });
  box.appendChild(createEl('h3', { text: title }));
  box.appendChild(createEl('p', { className: 'muted', text: message }));
  return box;
}

function allowedRoles(roles) {
  if (!Array.isArray(roles)) return false;
  const list = roles.map(r => String(r || '').toLowerCase());
  return list.some(r => ['gato','sensei','genin'].includes(r));
}
function parseYoutubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.replace('/', '');
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch {}
  return null;
}

function buildMedia(module) {
  const resource = module?.resource || {};
  const type = resource.type || 'link';
  const url = resource.url || '';
  const name = resource.name || module.title || 'Recurso';
  const holder = createEl('div', { className: 'training-media' });
  if (!url) {
    holder.appendChild(info('Este modulo aun no tiene contenido cargado.'));
    return holder;
  }
  if (type === 'video') {
    const yt = parseYoutubeId(url);
    if (yt) {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${yt}`;
      iframe.width = '100%';
      iframe.height = '420';
      iframe.allowFullscreen = true;
      iframe.setAttribute('frameborder', '0');
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
      holder.appendChild(iframe);
    } else {
      const video = document.createElement('video');
      video.controls = true;
      video.src = url;
      video.preload = 'metadata';
      video.className = 'training-video';
      holder.appendChild(video);
    }
  } else if (type === 'pdf') {
    const link = createEl('a', { className: 'btn btn-primary', text: 'Descargar PDF', attrs: { href: url, target: '_blank', rel: 'noopener noreferrer', download: name } });
    holder.appendChild(link);
  } else {
    const link = createEl('a', { className: 'btn btn-ghost', text: 'Abrir recurso', attrs: { href: url, target: '_blank', rel: 'noopener noreferrer' } });
    holder.appendChild(link);
  }
  return holder;
}

function buildFeedbackSection(title, placeholder) {
  const wrap = createEl('div', { className: 'training-feedback' });
  wrap.appendChild(createEl('h4', { text: title }));
  const form = createEl('form', { className: 'feedback-form' });
  const textarea = createEl('textarea', { attrs: { rows: '3', placeholder } });
  const actions = createEl('div', { className: 'form-actions start' });
  const submit = createEl('button', { className: 'btn btn-primary btn-sm', text: 'Enviar' });
  actions.appendChild(submit);
  form.append(textarea, actions, info('Esta funcion guardara tus aportes muy pronto.'));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    showModal('Muy pronto habilitaremos esta funcion.', { title: 'En construccion' });
    textarea.value = '';
  });
  wrap.appendChild(form);
  return wrap;
}

export async function EntrenamientoPage() {
  const wrap = createEl('section', { className: 'section page training-page', attrs: { id: 'entrenamientos' } });
  const container = createEl('div', { className: 'container training-container' });
  container.appendChild(createEl('h2', { className: 'section-title', text: 'Entrenamientos' }));
  container.appendChild(info('Explora los cursos activos y sigue el temario modulo a modulo.'));

  const data = await getJSON('/api/user/courses', { courses: [], roles: [] });
  const roles = Array.isArray(data?.roles) ? data.roles : [];
  if (!allowedRoles(roles)) {
    container.appendChild(emptyState('Acceso restringido', 'Necesitas un rol de admin, sensei o genin para ver los entrenamientos.'));
    wrap.appendChild(container);
    return wrap;
  }

  updateAuthNav();

  const courses = Array.isArray(data?.courses) ? data.courses : [];
  const slot = createEl('div', { className: 'training-slot' });
  container.appendChild(slot);
  wrap.appendChild(container);

  function showCourseList() {
    slot.innerHTML = '';
    if (!courses.length) {
      slot.appendChild(emptyState('Sin cursos asignados', 'Aun no tienes cursos activos. Visita Armeria para adquirir uno o contacta a soporte.'));
      return;
    }
    const grid = createEl('div', { className: 'training-grid' });
    courses.forEach(course => {
      const card = createEl('article', { className: 'training-card' });
      if (course.image) {
        const img = document.createElement('img');
        img.src = course.image;
        img.alt = course.title || 'Curso';
        img.loading = 'lazy';
        card.appendChild(img);
      }
      card.appendChild(createEl('h3', { text: course.title || 'Curso sin titulo' }));
      card.appendChild(createEl('p', { className: 'muted', text: course.description || 'Proximamente proposito y alcance.' }));
      const cta = createEl('button', { className: 'btn btn-primary btn-sm', text: 'Ver temario', attrs: { type: 'button' } });
      cta.addEventListener('click', () => openCourse(course));
      card.appendChild(cta);
      grid.appendChild(card);
    });
    slot.appendChild(grid);
  }

  async function openCourse(course) {
    const courseKey = course.title || course.name || String(course._id || '');
    slot.innerHTML = '';
    const header = createEl('div', { className: 'training-course-head' });
    const back = createEl('button', { className: 'btn btn-ghost btn-sm', text: 'Volver a cursos', attrs: { type: 'button' } });
    back.addEventListener('click', showCourseList);
    header.append(back, createEl('h3', { text: course.title || 'Curso sin titulo' }));
    header.appendChild(info(course.description || 'Sigue el orden sugerido para aprovechar el entrenamiento.'));
    slot.appendChild(header);

    const layout = createEl('div', { className: 'training-layout' });
    const sidebar = createEl('div', { className: 'training-modules' });
    const detail = createEl('div', { className: 'training-detail' });
    detail.appendChild(emptyState('Selecciona un modulo', 'Elige un modulo para abrir el contenido, comentarios y preguntas.'));
    layout.append(sidebar, detail);
    slot.appendChild(layout);

    sidebar.innerHTML = '';
    sidebar.appendChild(info('Cargando temario...'));
    const modules = await getJSON(`/api/user/courses/${encodeURIComponent(courseKey)}/modules`, []);
    sidebar.innerHTML = '';
    const sorted = Array.isArray(modules) ? modules.slice().sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
    if (!sorted.length) {
      sidebar.appendChild(emptyState('Modulo en construccion', 'Pronto se estaran subiendo los modulos de este curso.'));
      return;
    }
    const list = createEl('div', { className: 'training-module-list' });
    let activeBtn = null;
    sorted.forEach((mod, idx) => {
      const btn = createEl('button', { className: 'module-item', text: `${mod.order ?? idx + 1}. ${mod.title || 'Modulo'}`, attrs: { type: 'button' } });
      btn.addEventListener('click', () => {
        if (activeBtn) activeBtn.classList.remove('active');
        activeBtn = btn;
        btn.classList.add('active');
        renderModule(mod, detail);
      });
      if (idx === 0) {
        activeBtn = btn;
        btn.classList.add('active');
        renderModule(mod, detail);
      }
      list.appendChild(btn);
    });
    sidebar.appendChild(list);
  }

  function renderModule(mod, target) {
    target.innerHTML = '';
    target.appendChild(createEl('h3', { className: 'module-title', text: mod.title || 'Modulo' }));
    if (mod.description) target.appendChild(createEl('p', { className: 'muted', text: mod.description }));
    target.appendChild(buildMedia(mod));
    const feedbackWrap = createEl('div', { className: 'training-feedback-grid' });
    feedbackWrap.append(
      buildFeedbackSection('Comentarios', 'Escribe tus notas o retroalimentacion (pronto disponible).'),
      buildFeedbackSection('Preguntas', 'Formula tus dudas para el instructor (pronto disponible).'),
    );
    target.appendChild(feedbackWrap);
  }

  showCourseList();
  return wrap;
}
