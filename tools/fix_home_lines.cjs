// Fix Home/Hero corrupted texts by line number (1-based)
const fs = require('fs');
const p = 'frontend/public/src/app.js';
let lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
function set1(n, text){ const i=n-1; if(i>=0 && i<lines.length) lines[i]=text; }

// Hero buttons and map
set1(215, "  const btnArm = createEl('button', { className: 'btn', text: 'Armeria' });");
set1(227, "    const map = { misiones: btnMis, dojo: btnDojo, armeria: btnArm };");
// Hero copy
set1(247, "          'Forja habilidades con rutas practicas en pentesting, redes y forense, pensadas para el dia a dia.',");
set1(277, "    left.appendChild(createEl('div', { className: 'cta', children: [ createEl('a', { className: 'btn btn-primary', text: 'Saber mas', attrs: { href: data.link } }) ] }));");
set1(286, "  btnArm.addEventListener('click', () => showHeroInfo('armeria'));");

// Home CTA to Armeria
set1(439, "      createEl('a', { className: 'btn btn-ghost', text: 'Ir a Armeria', attrs: { href: '/armeria' } })");

// Quienes somos block
set1(447, "  c1.appendChild(createEl('h2', { className: 'section-title', text: 'Quienes somos' }));");
set1(448, "  c1.appendChild(createEl('p', { text: 'codeRonin es un dojo de ciberseguridad con espiritu ronin: construimos, probamos y aprendemos con etica y metodo. Unimos mentalidad ofensiva y defensiva para pensar como atacante y disenar mejores defensas.' }));");
set1(449, "  c1.appendChild(createEl('p', { text: 'Entrena en el Dojo (virtual/presencial), pon a prueba tus defensas con Misiones y equipa tu dia a dia en la Armeria con guias y checklists.' }));");
set1(451, "  promo.appendChild(createEl('div', { text: 'Espacio para banners y promociones (proximamente).' }));");

// Dojo panels
set1(589, "      wrap.appendChild(createEl('div', { className: 'cta-banner', children: [ createEl('div', { text: 'Presenciales: inmersion guiada para acelerar habilidades, alinear practicas y resolver dudas en vivo.' }) ] }));");
set1(591, "        { t: 'Hacking Etico', image: '/assets/material/ninja1.webp', items: [ 'Introduccion y Metodologia', 'Pentesting Web', 'Pentesting Infraestructura' ] },");
set1(603, "          grid.appendChild(Card({ title: name, desc: 'Sesion presencial con enfoque practico y objetivos claros para tu equipo.', tags: ['presencial'], image: cat.image, cta: ctaBtn }));");

// Achievements text
set1(385, "    { name: 'Conferencia: Seguridad Ofensiva 101', description: 'Charla sobre fundamentos de pentesting y etica.' },");

// Form texts
set1(628, "  c.appendChild(createEl('h2', { className: 'section-title', text: 'Solicitud de informacion' }));");
set1(629, "  c.appendChild(createEl('p', { text: 'Dejanos tus datos y el interes del curso/capacitacion. Te contactaremos para coordinar la mejor opcion.' }));");
set1(638, "  const iEmpresa = createEl('input', { attrs: { type: 'text', name: 'empresa', placeholder: 'Empresa/Organizacion' } });");
set1(655, "    'Introduccion y Metodologia',");

fs.writeFileSync(p, lines.join('\n'), 'utf8');
console.log('home texts fixed');

