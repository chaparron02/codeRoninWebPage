import { createEl, showModal, navigate, getJSON, setToken } from '../lib/core.js'
import { buildPageHero, buildSection, createGlowCard } from '../lib/layouts.js'

export async function LoginPage() {
  const main = createEl('main')

  main.appendChild(buildPageHero({ variant: 'login', media: createEl('img', { attrs: { src: '/assets/material/ninja4.webp', alt: 'Login', loading: 'lazy' } }),
    kicker: 'usuarios',
    title: 'Acceso codeRonin',
    description: 'Ingresa para administrar pergaminos, entrenamientos y misiones.',
    stats: [
      { label: 'Sensei activos', value: '08' },
      { label: 'Pergaminos', value: '120+' },
      { label: 'Entrenamientos', value: '15' },
    ],
    panelTitle: '¿No tienes cuenta?',
    panelList: [
      'Solicita acceso escribiendo a coderonin404@gmail.com.',
      'Las cuentas se asignan manualmente a instructores y clientes.',
      'Usamos autenticacion por token con sesiones seguras.',
    ],
  }))

  const grid = createEl('div', { className: 'auth-grid' })
  const card = createEl('div', { className: 'card login-card' })
  const title = createEl('h2', { className: 'section-title', text: 'Iniciar sesion' })
  card.appendChild(title)

  const form = createEl('form', { className: 'login-form', attrs: { autocomplete: 'on' } })
  const inputUser = createEl('input', { attrs: { type: 'text', name: 'username', placeholder: 'Usuario', required: '', autocomplete: 'username' } })
  const inputPass = createEl('input', { attrs: { type: 'password', name: 'password', placeholder: 'Clave', required: '', autocomplete: 'current-password' } })
  form.append(
    createEl('div', { className: 'form-row', children: [createEl('label', { text: 'Usuario' }), inputUser] }),
    createEl('div', { className: 'form-row', children: [createEl('label', { text: 'Clave' }), inputPass] }),
  )
  const submit = createEl('button', { className: 'btn btn-primary', text: 'Entrar', attrs: { type: 'submit' } })
  form.appendChild(createEl('div', { className: 'page-section-actions', children: [submit] }))
  card.appendChild(form)

  grid.appendChild(card)

  main.appendChild(buildSection({
    kicker: 'acceso',
    title: 'Panel privado',
    description: 'Solo instructores y clientes con credenciales pueden entrar. Las sesiones expiran automaticamente.',
    content: grid,
  }))

  try {
    const me = await getJSON('/api/auth/me', null)
    if (me && Array.isArray(me.roles) && me.roles.includes('gato')) {
      navigate('/admin')
    }
  } catch {}

  try {
    const last = localStorage.getItem('cr_last_username')
    if (last) inputUser.value = last
  } catch {}

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    submit.disabled = true
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: inputUser.value, password: inputPass.value }),
      })
      if (!res.ok) throw new Error('No se pudo iniciar sesion')
      const data = await res.json()
      try { localStorage.setItem('cr_last_username', String(inputUser.value || '')) } catch {}
      setToken(data.token || '')
      if (data?.user?.roles && Array.isArray(data.user.roles) && data.user.roles.includes('gato')) {
        navigate('/admin')
      } else {
        navigate('/')
      }
    } catch (err) {
      showModal(err?.message || 'No se pudo iniciar sesion', { title: 'Error' })
    } finally {
      submit.disabled = false
    }
  })

  return main
}

