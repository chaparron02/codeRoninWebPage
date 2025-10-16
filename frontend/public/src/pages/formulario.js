import { $, createEl, showModal, navigate, updateAuthNav, getJSON, setToken } from '../lib/core.js'
import { Hero, Card, Courses, Services, Projects, PDFs, AchievementsSection, EmbedInstagram, EmbedTikTok } from '../lib/components.js'

export async function FormPage() {
  const main = createEl('main');
  const sec = createEl('section', { className: 'section page' });
  const c = createEl('div', { className: 'container' });
  c.appendChild(createEl('h2', { className: 'section-title', text: 'Solicitud de información' }));
  c.appendChild(createEl('p', { text: 'Déjanos tus datos y el interés del curso/capacitación. Te contactaremos para coordinar la mejor opción.' }));
  const qs = new URLSearchParams(location.search || '');
  const interes = qs.get('interes') || '';
  const categoria = qs.get('categoria') || '';
  const modalidad = qs.get('modalidad') || '';
  const form = createEl('form', { className: 'cr-form', attrs: { method: 'post', action: '/form/submit' } });
  const row = (label, el) => { const r = createEl('div', { className: 'form-row' }); r.appendChild(createEl('label', { text: label })); r.appendChild(el); return r; };
  const iNombre = createEl('input', { attrs: { type: 'text', name: 'nombre', required: 'true', placeholder: 'Nombre completo' } });
  const iEmail = createEl('input', { attrs: { type: 'email', name: 'email', required: 'true', placeholder: 'correo@empresa.com' } });
  const iEmpresa = createEl('input', { attrs: { type: 'text', name: 'empresa', placeholder: 'Empresa/Organización' } });
  // InterAs como lista desplegable (cursos presenciales)
  const presCursos = [
    'Introduccion y Metodología',
    'Pentesting Web',
    'Pentesting Infraestructura',
    'Cybersecurity Fundamentals',
    'Redes y Segmentacion',
    'Amenazas y Riesgo',
    'Taller OSINT',
    'DFIR 101',
    'DevSecOps Essentials',
    'Concientizacion',
    'Phishing simulado',
    'Reporting y metricas'
  ];
  const presCursosFixed = [
    'Introducción y Metodología',
    'Pentesting Web',
    'Pentesting Infraestructura',
    'Cybersecurity Fundamentals',
    'Redes y Segmentación',
    'Amenazas y Riesgo',
    'Taller OSINT',
    'DFIR 101',
    'DevSecOps Essentials',
    'Concientización',
    'Phishing simulado',
    'Reportes y métricas'
  ];
  const iInteres = createEl('select', { attrs: { name: 'interes', required: 'true' } });
  presCursosFixed.forEach(n => {
    const opt = createEl('option', { text: n, attrs: { value: n } });
    iInteres.appendChild(opt);
  });
  if (interes && presCursosFixed.includes(interes)) iInteres.value = interes;

  // Modalidad fija (no editable)
  const iModalidad = createEl('input', { attrs: { type: 'text', name: 'modalidad', value: modalidad || 'presencial', readOnly: 'true' } });
  const iMsg = createEl('textarea', { attrs: { name: 'mensaje', rows: '4', placeholder: 'Cuéntanos objetivos y disponibilidad' } });
  const iSubmit = createEl('button', { className: 'btn btn-primary', text: 'Enviar solicitud', attrs: { type: 'submit' } });
  form.append(
    row('Nombre', iNombre),
    row('Email', iEmail),
    row('Empresa', iEmpresa),
    row('Interes', iInteres),
    row('Modalidad', iModalidad),
  row('Mensaje', iMsg),
  createEl('div', { className: 'cta', children: [ iSubmit ] })
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());
      const res = await fetch('/api/forms/course', { method: 'POST', headers: { 'content-type': 'application/json', 'accept': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { let msg = 'No se pudo iniciar sesion'; try { const ct = (res.headers.get('content-type') || '').toLowerCase(); const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text()); msg = err?.error || err?.message || msg; } catch {} throw new Error(msg); }
      showModal('Tu solicitud fue enviada correctamente. Pronto nos comunicaremos contigo.', { title: 'Solicitud enviada', onClose: () => { try { form.reset(); } catch {} } });
    } catch (err) {
      showModal('Hubo un error al enviar la solicitud. Intenta de nuevo.', { title: 'Error' });
    }
  });
  c.appendChild(form);
  sec.appendChild(c);
  main.appendChild(sec);
  return main;
}

