import { createEl, showModal } from '../lib/core.js'
import { buildPageHero, buildSection } from '../lib/layouts.js'

export async function FormMisionPage() {
  const main = createEl('main')

  const heroMedia = createEl('img', { attrs: { src: '/assets/material/ninja1.webp', alt: 'Misiones', loading: 'lazy' } })

  main.appendChild(buildPageHero({
    kicker: 'misiones',
    title: 'Solicita una mision a la medida',
    description: 'Cuéntanos el escenario que necesitas evaluar para definir alcance, ventanas y entregables.',
    stats: [
      { label: 'Clientes evaluados', value: '80+' },
      { label: 'Sectores', value: '10' },
      { label: 'Reportes multimedia', value: '25+' },
    ],
    actions: [
      { label: 'Ver tipos de mision', href: '/misiones', primary: true },
      { label: 'Contactar al equipo', href: 'mailto:coderonin404@gmail.com' },
    ],
    panelTitle: 'Que debes incluir',
    panelList: [
      'Activos y alcance (dominios, IPs, ubicaciones).',
      'Ventanas de prueba preferidas.',
      'Restricciones y contactos clave.',
    ],
    media: heroMedia,
    variant: 'mission-form',
  }))

  const qs = new URLSearchParams(location.search || '')
  const interes = qs.get('interes') || ''
  const categoria = qs.get('categoria') || ''
  const tipo = qs.get('tipo') || ''

  const catMap = {
    red: ['Red Team', 'Pentesting Web', 'Pentesting Infraestructura', 'Pruebas de sistema operativo', 'Intrusion fisica', 'Pruebas de redes WiFi'],
    blue: ['SOC Readiness y Detecciones', 'Gestion de Vulnerabilidades', 'DFIR y Respuesta a Incidentes', 'Threat Modeling y Arquitectura Segura', 'Hardening y Baselines', 'Seguridad en la Nube'],
    social: ['Campanas de phishing', 'Concientizacion de seguridad', 'Simulaciones y talleres', 'Intrusion fisica (SE)'],
  }
  const opciones = catMap[tipo] || [...new Set([...(catMap.red || []), ...(catMap.blue || []), ...(catMap.social || [])])]

  const form = createEl('form', { className: 'cr-form', attrs: { autocomplete: 'off' } })
  const row = (label, field) => {
    const wrapper = createEl('div', { className: 'form-row' })
    wrapper.append(createEl('label', { text: label }), field)
    return wrapper
  }

  const iNombre = createEl('input', { attrs: { type: 'text', name: 'nombre', required: 'true', placeholder: 'Nombre completo' } })
  const iEmail = createEl('input', { attrs: { type: 'email', name: 'email', required: 'true', placeholder: 'correo@empresa.com' } })
  const iEmpresa = createEl('input', { attrs: { type: 'text', name: 'empresa', placeholder: 'Empresa/Organizacion' } })
  const iCategoria = createEl('input', { attrs: { type: 'text', name: 'categoria', value: categoria || 'Red Team', readOnly: 'true' } })
  const iInteres = createEl('select', { attrs: { name: 'interes', required: 'true' } })
  opciones.forEach(n => iInteres.appendChild(createEl('option', { text: n, attrs: { value: n } })))
  if (interes && opciones.includes(interes)) iInteres.value = interes
  const iTipo = createEl('input', { attrs: { type: 'text', name: 'tipo', value: tipo || '', readOnly: 'true' } })
  const iAlcance = createEl('textarea', { attrs: { name: 'alcance', rows: '3', placeholder: 'Activos/alcance (dominios/IPs/ubicaciones)' } })
  const iVentanas = createEl('textarea', { attrs: { name: 'ventanas', rows: '2', placeholder: 'Ventanas de prueba preferidas (fechas/horarios)' } })
  const iRestricciones = createEl('textarea', { attrs: { name: 'restricciones', rows: '2', placeholder: 'Restricciones/consideraciones (sin DoS, horarios, etc.)' } })
  const iContacto = createEl('input', { attrs: { type: 'text', name: 'contacto', placeholder: 'Contacto tecnico/negocio' } })
  const submit = createEl('button', { className: 'btn btn-primary', text: 'Enviar solicitud de mision', attrs: { type: 'submit' } })
  const ejemplosBtn = createEl('button', { className: 'btn btn-ghost', text: 'Ver ejemplos de reporte', attrs: { type: 'button' } })
  ejemplosBtn.addEventListener('click', () => {
    const ejemplos = [
      '• Red Team retail: 9 hallazgos críticos, video PoV y plan de remediación en 30 días.',
      '• DFIR financiero: línea de tiempo, cadena de custodia y kit de comunicación para dirección.',
      '• Ing. social corporativa: métricas de clic, cápsulas multimedia y plan de refuerzo.'
    ].join('\n')
    showModal(ejemplos, { title: 'Ejemplos de reporte' })
  })

  const actionsRow = createEl('div', { className: 'page-section-actions' })
  actionsRow.append(submit, ejemplosBtn)

  form.append(
    row('Nombre', iNombre),
    row('Email', iEmail),
    row('Empresa', iEmpresa),
    row('Categoria', iCategoria),
    row('Mision', iInteres),
    row('Tipo', iTipo),
    row('Alcance', iAlcance),
    row('Ventanas', iVentanas),
    row('Restricciones', iRestricciones),
    row('Contacto', iContacto),
    actionsRow
  )

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    try {
      const fd = new FormData(form)
      const payload = Object.fromEntries(fd.entries())
      const res = await fetch('/api/forms/mission', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('No se pudo enviar la solicitud de mision')
      showModal('Tu solicitud de mision fue registrada. Nuestro equipo te contactara para coordinar los siguientes pasos.', {
        title: 'Solicitud enviada',
        onClose: () => { try { form.reset() } catch {} },
      })
    } catch (err) {
      showModal('Hubo un error al enviar la solicitud. Intenta de nuevo.', { title: 'Error' })
    }
  })

  main.appendChild(buildSection({
    kicker: 'briefing',
    title: 'Solicitud de mision',
    description: 'Mientras mas contexto tengamos, mejor podremos ajustar alcance y tiempos.',
    content: form,
    actions: [
      { label: 'Revisar politicas', href: '/politicas' }
    ],
  }))

  return main
}
