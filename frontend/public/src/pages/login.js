import { apiFetch, createEl, showModal, navigate, getJSON, setToken } from '../lib/core.js'

export async function LoginPage() {
  const main = createEl('main', { className: 'login-page' })
  main.appendChild(buildHero())

  const shell = createEl('section', { className: 'pane login-pane' })
  const layout = createEl('div', { className: 'login-layout' })
  const formPanel = buildFormPanel()
  const metaPanel = buildMetaPanel()
  layout.append(formPanel.card, metaPanel)
  shell.appendChild(layout)
  main.appendChild(shell)

  handleLoginFlow(formPanel)
  return main
}

function buildHero() {
  const hero = createEl('section', { className: 'pane login-hero' })
  hero.appendChild(createEl('p', { className: 'hero-tag', text: 'canal seguro // codeRonin access' }))
  hero.appendChild(createEl('h1', { text: 'Operaciones privadas en un solo acceso.' }))
  hero.appendChild(createEl('p', { className: 'muted', text: 'Clientes, instructores y equipo interno usan este portal para iniciar misiones, revisar reportes y coordinar entrenamientos.' }))

  const stats = [
    { label: 'clientes', value: '80+' },
    { label: 'ventanas activas', value: '12' },
    { label: 'sesiones auditadas', value: '100%' },
  ]
  const grid = createEl('div', { className: 'login-stat-grid' })
  stats.forEach(stat => {
    const card = createEl('div', { className: 'login-stat' })
    card.appendChild(createEl('span', { className: 'login-stat-value', text: stat.value }))
    card.appendChild(createEl('span', { className: 'login-stat-label', text: stat.label }))
    grid.appendChild(card)
  })
  hero.appendChild(grid)
  hero.appendChild(createEl('p', { className: 'muted tiny', text: 'Necesitas cuenta? Usa el formulario interno o escribe a coderonin404@gmail.com.' }))
  return hero
}

function buildFormPanel() {
  const card = createEl('article', { className: 'login-panel' })
  card.appendChild(createEl('h2', { text: 'Entrar al panel' }))
  card.appendChild(createEl('p', { className: 'muted', text: 'Ingresa tu usuario o correo autorizado. Verifica que estas en un dispositivo confiable.' }))

  const form = createEl('form', { className: 'login-form', attrs: { autocomplete: 'on' } })
  const inputUser = createEl('input', { attrs: { type: 'text', name: 'username', placeholder: 'Usuario o correo', required: '', autocomplete: 'username' } })
  const inputPass = createEl('input', { attrs: { type: 'password', name: 'password', placeholder: 'Contrasena', required: '', autocomplete: 'current-password' } })
  form.append(buildRow('Usuario / correo', inputUser), buildRow('Contrasena', inputPass))

  const submit = createEl('button', { className: 'btn hero-primary', text: 'Entrar', attrs: { type: 'submit' } })
  const recoveryBtn = createEl('button', { className: 'btn btn-ghost btn-sm', text: 'Solicitar desbloqueo', attrs: { type: 'button' } })
  const actions = createEl('div', { className: 'login-actions' })
  actions.append(submit, recoveryBtn)
  form.appendChild(actions)

  card.appendChild(form)
  card.appendChild(createEl('p', { className: 'muted tiny', text: 'Soporte inmediato: coderonin404@gmail.com' }))
  return { card, form, inputUser, inputPass, submit, recoveryBtn }
}

function buildMetaPanel() {
  const card = createEl('article', { className: 'login-meta telemetry-card' })
  card.appendChild(createEl('h3', { text: 'Telemetria del dojo' }))
  const messages = generateTelemetryMessages()
  const list = createEl('div', { className: 'telemetry-feed' })
  messages.forEach(msg => {
    const row = createEl('p')
    row.dataset.message = msg
    row.textContent = ''
    list.appendChild(row)
  })
  card.appendChild(list)
  card.appendChild(createEl('p', { className: 'muted tiny', text: 'Canal cifrado activo. Continua con tu sesion de forma segura.' }))
  requestAnimationFrame(() => animateTelemetry(list))
  return card
}

function handleLoginFlow({ form, inputUser, inputPass, submit, recoveryBtn }) {
  tryAutoRedirect()
  try {
    const last = localStorage.getItem('cr_last_username')
    if (last) inputUser.value = last
  } catch {}

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    submit.disabled = true
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
                body: JSON.stringify({ username: inputUser.value, password: inputPass.value }),
      })
      if (!res.ok) throw new Error('No se pudo iniciar sesion')
      const data = await res.json()
      try { localStorage.setItem('cr_last_username', String(inputUser.value || '')) } catch {}
      setToken(data.token || '')
      routeByRole(data?.user?.roles)
    } catch (err) {
      showModal(err?.message || 'No se pudo iniciar sesion', { title: 'Error' })
    } finally {
      submit.disabled = false
    }
  })

  recoveryBtn.addEventListener('click', async () => {
    const username = inputUser.value.trim()
    const email = window.prompt('Correo asociado (opcional)') || ''
    const details = window.prompt('Describe el problema (opcional)') || ''
    if (!username && !email.trim()) {
      showModal('Ingresa tu usuario o correo antes de solicitar el desbloqueo.', { title: 'Atencion' })
      return
    }
    try {
      const res = await apiFetch('/api/auth/recover', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ username, email: email.trim(), message: details.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudo registrar la solicitud')
      showModal('Solicitud enviada. Nuestro equipo revisara tu cuenta pronto.', { title: 'Listo' })
    } catch (err) {
      showModal(err?.message || 'No se pudo registrar la solicitud', { title: 'Error' })
    }
  })
}

function tryAutoRedirect() {
  getJSON('/api/auth/me', null)
    .then(me => {
      if (!me || !Array.isArray(me.roles)) return
      routeByRole(me.roles)
    })
    .catch(() => {})
}

function routeByRole(rolesInput) {
  if (!Array.isArray(rolesInput)) {
    navigate('/')
    return
  }
  const roles = rolesInput.map(r => String(r || '').toLowerCase())
  if (roles.includes('gato')) {
    navigate('/admin')
  } else if (roles.includes('daimyo')) {
    navigate('/reporte?view=daimyo')
  } else if (roles.includes('shinobi')) {
    navigate('/reporte?view=shinobi')
  } else {
    navigate('/')
  }
}

function buildRow(label, field) {
  const wrapper = createEl('div', { className: 'form-row column' })
  wrapper.append(createEl('label', { text: label }), field)
  return wrapper
}

function generateTelemetryMessages() {
  const templates = [
    'PING {id} :: gracias por elegirnos :: {note}',
    'PULSE {id} :: seguimos documentando :: {note}',
    'TRACE {id} :: mensaje para tu equipo :: {note}',
    'ECHO {id} :: sin tu confianza no existe el dojo :: {note}',
    'BEACON {id} :: cada mision nos acerca al objetivo :: {note}'
  ]
  const notes = [
    'modo daimyo activado',
    'canal limpio y cifrado',
    'lista de tareas actualizada',
    'briefing en curso',
    'seguimos documentando'
  ]
  const messages = []
  while (messages.length < 4) {
    const tmpl = templates[Math.floor(Math.random() * templates.length)]
    const note = notes[Math.floor(Math.random() * notes.length)]
    const id = String(Math.floor(Math.random() * 90 + 10))
    const msg = tmpl.replace('{id}', id).replace('{note}', note)
    if (!messages.includes(msg)) messages.push(msg)
  }
  return messages
}

function animateTelemetry(feed) {
  if (!feed) return
  const rows = Array.from(feed.querySelectorAll('p'))
  if (!rows.length) return
  rows.forEach(row => {
    if (!row.dataset.message) row.dataset.message = row.textContent || ''
    row.textContent = ''
    row.classList.remove('active')
  })
  let index = 0
  const cursor = '|'
  const typeRow = () => {
    const row = rows[index]
    const text = row.dataset.message || ''
    let charIndex = 0
    row.classList.add('active')
    const type = () => {
      row.textContent = text.slice(0, charIndex) + cursor
      charIndex += 1
      if (charIndex <= text.length) {
        setTimeout(type, 45)
      } else {
        row.textContent = text
        setTimeout(() => {
          row.classList.remove('active')
          index = (index + 1) % rows.length
          typeRow()
        }, 1200)
      }
    }
    type()
  }
  typeRow()
}
