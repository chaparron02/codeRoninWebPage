const fs = require('fs');
const p = 'frontend/public/src/app.js';
let s = fs.readFileSync(p,'utf8');

function repl(re, text){ s = s.replace(re, text); }

repl(/const\s+ofensiva\s*=\s*\[[\s\S]*?\];/,
`const ofensiva = [
  { title: 'Red Team', desc: 'Campanas adversariales que emulan amenazas reales para medir deteccion y respuesta.', tags: ['red'], image: '/assets/material/ninja1.webp' },
  { title: 'Pentesting Web', desc: 'Pruebas OWASP con explotacion controlada y plan de remediacion priorizado por riesgo.', tags: ['owasp'], image: '/assets/material/ninja3.webp' },
  { title: 'Pentesting Infraestructura', desc: 'Evaluacion interna/externa, Active Directory y rutas de ataque realistas.', tags: ['red','ad'], image: '/assets/material/ninja2.webp' },
  { title: 'Pruebas de sistema operativo', desc: 'Evaluacion de configuracion, servicios y privilegios en Windows/Linux.', tags: ['os','hardening'], image: '/assets/material/dojo1.webp' },
  { title: 'Intrusion fisica', desc: 'Pruebas controladas de acceso fisico, tailgating y exposicion de activos.', tags: ['fisico'], image: '/assets/material/ninja4.webp' },
  { title: 'Pruebas de redes WiFi', desc: 'Auditoria de WLAN, cifrados, segregacion y ataques comunes (capturas/evil twin).', tags: ['wifi','802.11'], image: '/assets/material/armeria.webp' },
];`);

repl(/c\.appendChild\(missionSection\([\s\S]*?'red'\s*\)\);/,
`c.appendChild(missionSection(
  'Red Team / Seguridad ofensiva',
  'Descubre como un atacante real veria tu organizacion. Estas misiones validan controles y tiempos de deteccion.',
  ofensiva,
  'red'
));`);

repl(/const\s+blue\s*=\s*\[[\s\S]*?\];/,
`const blue = [
  { title: 'SOC Readiness y Detecciones', desc: 'Mapeo ATT&CK, casos de uso SIEM, telemetria y pruebas de deteccion', tags: ['soc','detecciones'], image: '/assets/material/dojo1.webp' },
  { title: 'Gestion de Vulnerabilidades', desc: 'Ciclo continuo: descubrimiento, priorizacion (CVSS/EPSS), parchado y verificacion.', tags: ['vulns','riesgo'], image: '/assets/material/ninja2.webp' },
  { title: 'DFIR y Respuesta a Incidentes', desc: 'Forense, contencion, erradicacion y mejora continua con lecciones aprendidas.', tags: ['dfir','ir'], image: '/assets/material/ninja4.webp' },
  { title: 'Threat Modeling y Arquitectura Segura', desc: 'STRIDE/ATT&CK, patrones seguros y controles por diseno.', tags: ['arquitectura'], image: '/assets/material/ninja3.webp' },
  { title: 'Hardening y Baselines', desc: 'Benchmarks CIS y politicas de configuracion para reducir superficie de ataque.', tags: ['cis','baseline'], image: '/assets/material/armeria.webp' },
  { title: 'Seguridad en la Nube', desc: 'Revision IAM, redes y datos en AWS/Azure/GCP con hardening y monitoreo.', tags: ['cloud','iam'], image: '/assets/material/ninja1.webp' },
];`);

repl(/const\s+social\s*=\s*\[[\s\S]*?\];/,
`const social = [
  { title: 'Campanas de phishing', desc: 'Simulaciones con metricas (clic, reporte) y retroalimentacion para el equipo.', tags: ['phishing'], image: '/assets/material/ninja2.webp' },
  { title: 'Concientizacion de seguridad', desc: 'Sesiones breves y directas para reducir riesgo humano con ejemplos reales.', tags: ['awareness'], image: '/assets/material/dojo1.webp' },
  { title: 'Simulaciones y talleres', desc: 'Entrenamiento practico para lideres y equipos tecnicos/no tecnicos.', tags: ['taller'], image: '/assets/material/ninja3.webp' },
  { title: 'Intrusion fisica (SE)', desc: 'Pruebas fisicas con enfoque en ingenieria social y procesos de acceso.', tags: ['fisico','SE'], image: '/assets/material/ninja4.webp' },
];`);

fs.writeFileSync(p, s, 'ascii');
console.log('dojo arrays patched');
