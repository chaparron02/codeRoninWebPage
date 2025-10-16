import { $, createEl, showModal, navigate, updateAuthNav, getJSON, setToken } from '../lib/core.js'
import { Hero, Card, Courses, Services, Projects, PDFs, AchievementsSection, EmbedInstagram, EmbedTikTok } from '../lib/components.js'

export async function FormMisionPage() {
  const main = createEl('main');
  const sec = createEl('section', { className: 'section page' });
  const c = createEl('div', { className: 'container' });
  c.appendChild(createEl('h2', { className: 'section-title', text: 'Solicitud de MisiA3n' }));
  c.appendChild(createEl('p', { text: 'CuAntanos sobre el escenario que necesitas evaluar. Usamos esta informaciA3n para definir alcance y tiempos de forma segura.' }));

  const qs = new URLSearchParams(location.search || '');
  const interes = qs.get('interes') || '';
  const categoria = qs.get('categoria') || '';
  const tipo = qs.get('tipo') || '';

  const form = createEl('form', { className: 'cr-form', attrs: { method: 'post', action: '/mission/submit' } });
  const row = (label, el) => { const r = createEl('div', { className: 'form-row' }); r.appendChild(createEl('label', { text: label })); r.appendChild(el); return r; };
  const iNombre = createEl('input', { attrs: { type: 'text', name: 'nombre', required: 'true', placeholder: 'Nombre completo' } });
  const iEmail = createEl('input', { attrs: { type: 'email', name: 'email', required: 'true', placeholder: 'correo@empresa.com' } });
  const iEmpresa = createEl('input', { attrs: { type: 'text', name: 'empresa', placeholder: 'Empresa/Organizacion' } });
  const iCategoria = createEl('input', { attrs: { type: 'text', name: 'categoria', value: categoria || 'Red Team', readOnly: 'true' } });
  // InterAs como select segAon tipo de misiA3n
  const catMap = {
    red: [ 'Red Team', 'Pentesting Web', 'Pentesting Infraestructura', 'Pruebas de sistema operativo', 'Intrusion fisica', 'Pruebas de redes WiaFi' ],
    blue: [ 'SOC Readiness y Detecciones', 'Gestion de Vulnerabilidades', 'DFIR y Respuesta a Incidentes', 'Threat Modeling y Arquitectura Segura', 'Hardening y Baselines', 'Seguridad en la Nube' ],
    social: [ 'Campanas de phishing', 'Concientizacion de seguridad', 'Simulaciones y talleres', 'Intrusion fisica (SE)' ]
  };
  const opciones = catMap[tipo] || [...new Set([...(catMap.red||[]), ...(catMap.blue||[]), ...(catMap.social||[])])];
  const iInteres = createEl('select', { attrs: { name: 'interes', required: 'true' } });
  opciones.forEach(n => iInteres.appendChild(createEl('option', { text: n, attrs: { value: n } })));
  if (interes && opciones.includes(interes)) iInteres.value = interes;
  const iTipo = createEl('input', { attrs: { type: 'text', name: 'tipo', value: tipo || '', readOnly: 'true' } });
  const iAlcance = createEl('textarea', { attrs: { name: 'alcance', rows: '3', placeholder: 'Activos/alcance (dominios/IPs/ubicaciones)' } });
  const iVentanas = createEl('textarea', { attrs: { name: 'ventanas', rows: '2', placeholder: 'Ventanas de prueba preferidas (fechas/horarios)' } });
  const iRestricciones = createEl('textarea', { attrs: { name: 'restricciones', rows: '2', placeholder: 'Restricciones/consideraciones (sin DoS, horarios, etc.)' } });
  const iContacto = createEl('input', { attrs: { type: 'text', name: 'contacto', placeholder: 'Contacto tAcnico/negocio' } });
  const iSubmit = createEl('button', { className: 'btn btn-primary', text: 'Enviar solicitud de misiA3n', attrs: { type: 'submit' } });
  form.append(
    row('Nombre', iNombre),
    row('Email', iEmail),
    row('Empresa', iEmpresa),
    row('Categoria', iCategoria),
    row('MisiA3n', iInteres),
    row('Tipo', iTipo),
    row('Alcance', iAlcance),
    row('Ventanas', iVentanas),
    row('Restricciones', iRestricciones),
    row('Contacto', iContacto),
    createEl('div', { className: 'cta', children: [ iSubmit ] })
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());
      const res = await fetch('/api/forms/mission', { method: 'POST', headers: { 'content-type': 'application/json', 'accept': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { let msg = 'No se pudo iniciar sesion'; try { const ct = (res.headers.get('content-type') || '').toLowerCase(); const err = ct.includes('application/json') ? await res.json() : JSON.parse(await res.text()); msg = err?.error || err?.message || msg; } catch {} throw new Error(msg); }
      showModal('Tu solicitud de misión fue registrada. Nuestro equipo te contactara para coordinar los siguientes pasos.', { title: 'Solicitud enviada', onClose: () => { try { form.reset(); } catch {} } });
      return;
    } catch (err) {
      showModal('Hubo un error al enviar la solicitud. Intenta de nuevo.', { title: 'Error' });
      return;
    }
    showModal('Tu solicitud de misiA3n fue registrada. Nuestro equipo te contactarA! para coordinar los siguientes pasos.', { title: 'Solicitud enviada', onClose: () => { try { form.reset(); } catch {} } });
    const ok = createEl('div', { className: 'cta-banner', children: [ createEl('div', { text: 'Solicitud registrada. Nuestro equipo te contactarA! para coordinar la misiA3n.' }) ] });
    form.replaceWith(ok);
  });
  c.appendChild(form);
  sec.appendChild(c);
  main.appendChild(sec);
  return main;
}

