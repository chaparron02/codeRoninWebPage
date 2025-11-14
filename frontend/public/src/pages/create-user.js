import { createEl, showModal, navigate } from '../lib/core.js'
import { buildPageHero, buildSection } from '../lib/layouts.js'

export async function CreateUserPage() {
  const main = createEl('main')

  main.appendChild(buildPageHero({
    variant: 'login',
    media: createEl('img', { attrs: { src: '/assets/material/ninja3.webp', alt: 'Crear usuario', loading: 'lazy' } }),
    kicker: 'admin',
    title: 'Crear usuario',
    description: 'Solo administradores pueden generar nuevas cuentas. Usa este formulario cuando habilites el acceso a un cliente o instructor.',
    panelTitle: 'Flujo',
    panelList: [
      'Captura los datos básicos.',
      'Valida internamente y envia confirmación.',
      'El usuario recibirá instrucciones para iniciar sesión.'
    ],
    actions: [{ label: 'Volver al panel', href: '/admin' }],
  }))

  const form = createEl('form', { className: 'cr-form signup-form', attrs: { autocomplete: 'off' } })
  const iNombre = createEl('input', { attrs: { type: 'text', name: 'name', placeholder: 'Nombre completo', required: '' } })
  const iApodo = createEl('input', { attrs: { type: 'text', name: 'nickname', placeholder: 'Apodo / alias', required: '' } })
  const iCorreo = createEl('input', { attrs: { type: 'email', name: 'email', placeholder: 'correo@empresa.com', required: '' } })
  const iCelular = createEl('input', { attrs: { type: 'tel', name: 'phone', placeholder: '+57 300 000 0000', required: '' } })
  const iClave = createEl('input', { attrs: { type: 'password', name: 'password', placeholder: 'Contrasena temporal', required: '', minlength: '8' } })
  const iAdminCode = createEl('input', { attrs: { type: 'password', name: 'adminCode', placeholder: 'Clave administrativa', required: '' } })

  form.append(
    buildRow('Nombre', iNombre),
    buildRow('Apodo', iApodo),
    buildRow('Correo', iCorreo),
    buildRow('Celular', iCelular),
    buildRow('Contrasena', iClave),
    buildRow('Clave administrativa', iAdminCode),
  )

  const submit = createEl('button', { className: 'btn hero-primary', text: 'Crear usuario', attrs: { type: 'submit' } })
  form.appendChild(createEl('div', { className: 'page-section-actions', children: [submit, createEl('a', { className: 'btn btn-ghost', text: 'Volver', attrs: { href: '/admin' } })] }))
  form.appendChild(createEl('p', { className: 'muted tiny', text: 'Solo personal autorizado. Registra cuentas reales y comunica al cliente el acceso.' }))

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    submit.disabled = true
    try {
      const payload = {
        name: iNombre.value.trim(),
        nickname: iApodo.value.trim(),
        email: iCorreo.value.trim(),
        phone: iCelular.value.trim(),
        password: iClave.value,
        adminCode: iAdminCode.value
      }
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.message || 'No se pudo crear el usuario')
      }
      showModal('Usuario creado. Comparte las credenciales y solicita cambio de clave al primer ingreso.', {
        title: 'Listo',
        onClose: () => navigate('/admin')
      })
    } catch (err) {
      showModal(err?.message || 'No se pudo registrar el usuario', { title: 'Error' })
    } finally {
      submit.disabled = false
    }
  })

  main.appendChild(buildSection({
    kicker: 'alta interna',
    title: 'Formulario de creación',
    description: 'Verifica los datos antes de enviar. La contraseña puede ser temporal y deberá cambiarse después del primer inicio.',
    content: form
  }))

  return main
}

function buildRow(label, field) {
  const wrapper = createEl('div', { className: 'form-row' })
  wrapper.append(createEl('label', { text: label }), field)
  return wrapper
}
