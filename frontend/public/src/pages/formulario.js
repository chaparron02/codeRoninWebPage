import { createEl, showModal } from '../lib/core.js'
import { buildPageHero, buildSection } from '../lib/layouts.js'

export async function FormPage() {
  const main = createEl('main')

  const heroMedia = createEl('img', { attrs: { src: '/assets/material/dojo1.webp', alt: 'Cursos presenciales', loading: 'lazy' } })

  main.appendChild(buildPageHero({
    kicker: 'capacitaciones',
    title: 'Solicita informacion de cursos presenciales',
    description: 'Cuéntanos el interes de tu equipo y coordinamos la mejor modalidad.',
    stats: [
      { label: 'Equipos entrenados', value: '60+' },
      { label: 'Ciudades', value: '8' },
      { label: 'Horas en sitio', value: '400+' },
    ],
    actions: [
      { label: 'Ver agenda', href: '/dojo' },
      { label: 'Contactar por WhatsApp', href: 'https://wa.me/573054402340', external: true },
    ],
    panelTitle: 'Que necesitamos',
    panelList: [
      'Objetivo del equipo y expectativa.',
      'Cantidad de participantes y fechas tentativas.',
      'Stack tecnologico o foco de la industria.',
    ],
    media: heroMedia,
    variant: 'forms',
  }))

  const qs = new URLSearchParams(location.search || '')
  const interes = qs.get('interes') || ''
  const modalidad = qs.get('modalidad') || 'presencial'

  const form = createEl('form', { className: 'cr-form', attrs: { autocomplete: 'off' } })
  const row = (label, field) => {
    const wrapper = createEl('div', { className: 'form-row' })
    wrapper.append(createEl('label', { text: label }), field)
    return wrapper
  }

  const iNombre = createEl('input', { attrs: { type: 'text', name: 'nombre', required: 'true', placeholder: 'Nombre completo' } })
  const iEmail = createEl('input', { attrs: { type: 'email', name: 'email', required: 'true', placeholder: 'correo@empresa.com' } })
  const iEmpresa = createEl('input', { attrs: { type: 'text', name: 'empresa', placeholder: 'Empresa/Organizacion' } })
  const iInteres = createEl('input', { attrs: { type: 'text', name: 'interes', value: interes || '', placeholder: 'Curso o tema de interes' } })
  const iModalidad = createEl('input', { attrs: { type: 'text', name: 'modalidad', value: modalidad, readOnly: 'true' } })
  const iMsg = createEl('textarea', { attrs: { name: 'mensaje', rows: '4', placeholder: 'Cuéntanos objetivos y disponibilidad' } })
  const submit = createEl('button', { className: 'btn btn-primary', text: 'Enviar solicitud', attrs: { type: 'submit' } })

  form.append(
    row('Nombre', iNombre),
    row('Email', iEmail),
    row('Empresa', iEmpresa),
    row('Interes', iInteres),
    row('Modalidad', iModalidad),
    row('Mensaje', iMsg),
    createEl('div', { className: 'page-section-actions', children: [submit] })
  )

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    try {
      const fd = new FormData(form)
      const payload = Object.fromEntries(fd.entries())
      const res = await fetch('/api/forms/course', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('No se pudo enviar la solicitud')
      showModal('Tu solicitud fue enviada correctamente. Pronto nos comunicaremos contigo.', {
        title: 'Solicitud enviada',
        onClose: () => { try { form.reset() } catch {} },
      })
    } catch (err) {
      showModal('Hubo un error al enviar la solicitud. Intenta de nuevo.', { title: 'Error' })
    }
  })

  main.appendChild(buildSection({
    kicker: 'contacto',
    title: 'Solicitud de informacion',
    description: 'Llena el formulario y coordinamos agenda y presupuesto en menos de 24 horas.',
    content: form,
    actions: [
      { label: 'Ver Dojo', href: '/dojo' },
      { label: 'Ir a Misiones', href: '/misiones' },
    ],
  }))

  return main
}