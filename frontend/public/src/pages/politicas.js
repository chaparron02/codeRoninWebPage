import { createEl } from '../lib/core.js'

function buildSection(title, blocks) {
  const wrapper = createEl('section', { className: 'policy-section' })
  wrapper.appendChild(createEl('h3', { text: title }))
  blocks.forEach(block => {
    if (Array.isArray(block)) {
      const list = createEl('ul', { className: 'policy-list' })
      block.forEach(item => list.appendChild(createEl('li', { text: item })))
      wrapper.appendChild(list)
    } else {
      wrapper.appendChild(createEl('p', { className: 'muted', text: block }))
    }
  })
  return wrapper
}

export async function PoliticasPage() {
  const page = createEl('section', { className: 'section page policy-page', attrs: { id: 'politicas' } })
  const root = createEl('div', { className: 'container policy-shell' })
  root.appendChild(createEl('h2', { className: 'section-title', text: 'Politicas y lineamientos' }))
  root.appendChild(createEl('p', { className: 'muted lead', text: 'Somos un emprendimiento colombiano y estas politicas cubren tratamiento de datos, venta de cursos y prestacion de servicios de seguridad bajo contratos firmados por los fundadores de codeRonin.' }))

  root.appendChild(buildSection('Politica de privacidad', [
    'Recolectamos datos basicos de contacto (nombre, correo, telefono) y metadatos tecnicos durante la ejecucion de cursos o servicios. Aplicamos la Ley 1581 de 2012 y decretos reglamentarios sobre proteccion de datos en Colombia.',
    [
      'Usamos la informacion para gestionar accesos, emitir certificados, enviar recordatorios y coordinar soporte.',
      'Guardamos los registros en proveedores con cifrado en reposo ubicados en la region y auditamos accesos cada trimestre.',
      'Respondemos derechos de consulta, actualizacion y supresion escribiendo a coderonin404@gmail.com en maximo quince dias habiles.',
      'Solo compartimos datos con aliados tecnicos cuando el contrato lo exige. Si hay transferencia internacional incluimos clausulas de proteccion equivalentes.'
    ]
  ]))

  root.appendChild(buildSection('Politicas de cursos virtuales', [
    'Los cursos virtuales ofrecen acceso de por vida mientras el emprendimiento mantenga la plataforma. Ese beneficio puede variar y cualquier cambio queda totalmente bajo nuestro control (actualizaciones, migraciones o retiros de material).',
    [
      'Cada participante recibe credenciales personales. Los recursos descargables son de uso individual; cualquier republicacion requiere autorizacion escrita.',
      'Realizamos mejoras continuas. Los cambios de temario, videos o labs quedan sujetos a nuestro control y se comunican por correo o dentro de la plataforma.',
      'Soporte tecnico y academico se brinda via correo y WhatsApp en horario Colombia UTC-5, lunes a viernes.',
      'El canal de pago puede cambiar (por ejemplo, migrar a Hotmart). Informamos dichos cambios en la pagina del curso.'
    ]
  ]))

  root.appendChild(buildSection('Servicios y misiones', [
    'Prestamos servicios de hardening, pruebas ofensivas, respuesta a incidentes y consultoria legal. Cada proyecto se ejecuta como mision con alcance acordado.',
    [
      'Firmamos propuesta, contrato de servicios y acuerdo de confidencialidad con los fundadores y con el cliente antes de iniciar labores.',
      'Toda actividad ofensiva se realiza sobre activos autorizados y en ventanas aprobadas. Mantenemos registro de evidencias y cadena de custodia.',
      'El progreso de la mision se registra en la plataforma de reportes para que el shinobi del cliente conozca tareas, porcentaje de avance y entregables.',
      'Pagos para servicios o cursos presenciales se pactan despues de la reunion tecnica y quedan establecidos en el contrato correspondiente.'
    ]
  ]))

  root.appendChild(buildSection('Soporte posventa', [
    [
      'Emitimos facturas electronicas colombianas a nombre del emprendimiento o de los fundadores segun el esquema tributario vigente.',
      'Los pagos se realizan por transferencia bancaria, pasarela local o criptomonedas previo acuerdo.',
      'Ofrecemos mantenimiento posventa para los hardenings y consultorias por treinta dias sin costo adicional.',
      'Cualquier inconformidad se escala a soporte@coderonin.co o al canal de WhatsApp corporativo.'
    ]
  ]))

  root.appendChild(buildSection('Contacto legal', [
    'Si requieres copia de contratos, certificaciones o aclarar una clausula, comunicate a legal@coderonin.co (por ahora atendemos via coderonin404@gmail.com). Conservamos la documentacion con firma digital y sellos de tiempo.'
  ]))

  page.appendChild(root)
  return page
}
