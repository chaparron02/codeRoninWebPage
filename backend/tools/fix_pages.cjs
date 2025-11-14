// Targeted fixes for corrupted Spanish texts in SPA (ASCII only)
const fs = require('fs');
const path = 'frontend/public/src/app.js';
let s = fs.readFileSync(path, 'utf8');

// Remove BOM if any
if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);

// General replacements (ASCII safe)
const rep = [
  [/armer[\u0080-\uFFFF]+a/gi, 'armeria'],
  [/Armer[\u0080-\uFFFF]+a/g, 'Armeria'],
  [/Filosof[\u0080-\uFFFF]+a/g, 'Filosofia'],
  [/Qu[ií][\u0080-\uFFFF]+nes somos/g, 'Quienes somos'],
  [/pr[\u0080-\uFFFF]+cticas/g, 'practicas'],
  [/Saber m[\u0080-\uFFFF]+s/g, 'Saber mas'],
  [/Hacking\s[\u0080-\uFFFF]+tico/g, 'Hacking Etico'],
  [/Misiones de hacking\s[\u0080-\uFFFF]+tico/g, 'Misiones de hacking Etico'],
  [/Metodolog[A-Za-z][\u0080-\uFFFF]+/g, 'Metodologia'],
  [/preparaci[\u0080-\uFFFF]+n/g, 'preparacion'],
  [/ex[\u0080-\uFFFF]+menes/g, 'examenes'],
  [/misi[\u0080-\uFFFF]+n/g, 'mision'],
  [/informaci[\u0080-\uFFFF]+n/g, 'informacion'],
  [/inter[\u0080-\uFFFF]+s/g, 'interes'],
  [/capacitaci[\u0080-\uFFFF]+n/g, 'capacitacion'],
  [/opci[\u0080-\uFFFF]+n/g, 'opcion'],
  [/Organizaci[\u0080-\uFFFF]+n/g, 'Organizacion'],
  [/et[\u0080-\uFFFF]+ca/g, 'etica'],
  [/m[\u0080-\uFFFF]+ximo/g, 'maximo'],
];
for (const [re, to] of rep) s = s.replace(re, to);

// Fix specific Home hero map (ensure keys/titles are ASCII)
s = s.replace(/btnArm\.addEventListener\([^\)]*\'armer[^']*\'\)/, "btnArm.addEventListener('click', () => showHeroInfo('armeria'))");
s = s.replace(/'Forja habilidades con rutas [^']*',/g, "'Forja habilidades con rutas practicas en pentesting, redes y forense, pensadas para el dia a dia.',");
s = s.replace(/'Tu kit esencial del ronin digital:[^']*',/g, "'Tu kit esencial del ronin digital: guias, checklists y plantillas listas para aplicar.',");

// Fix Home CTA to Armeria
s = s.replace(/'Ir a Armer[^']*',\s*attrs:\s*\{\s*href:\s*'\/armer[^']*'\s*\}/, "'Ir a Armeria', attrs: { href: '/armeria' }");

// Fix About/Nosotros block headings and sentences (ASCII)
s = s.replace(/section-title', text: 'Qui[^']*somos'/, "section-title', text: 'Quienes somos'");
s = s.replace(/'codeRonin es un dojo[^']*'/, "'codeRonin es un dojo de ciberseguridad con espiritu ronin: construimos, probamos y aprendemos con etica y metodo. Unimos mentalidad ofensiva y defensiva para pensar como atacante y disenar mejores defensas.'");
s = s.replace(/'Entrena en el Dojo[^']*'/, "'Entrena en el Dojo (virtual/presencial), pon a prueba tus defensas con Misiones y equipa tu dia a dia en la Armeria con guias y checklists.'");
s = s.replace(/'Espacio para banners[^']*'/, "'Espacio para banners y promociones (proximamente).'");

// Dojo virtuales list: replace sentence with ASCII
s = s.replace(/'Todos los cursos son 100% reales[^']*'/, "'Todos los cursos son 100% reales, basados en escenarios y buenas practicas.'");
s = s.replace(/'Metodolog[^']*Security\+'/, "'Metodologia de preparacion para examenes como CEH, eJPT, OSCP (fundamentals) y Security+'");

// Fix Missions form labels/messages (ASCII)
s = s.replace(/'Tu solicitud de misi[^']*'/g, "'Tu solicitud de mision fue registrada. Nuestro equipo te contactara para coordinar los siguientes pasos.'");
s = s.replace(/'Contacto t[^']*negocio'/, "'Contacto tecnico/negocio'");

// Remove stray Profile nav edits causing ReferenceError
s = s.replace(/\n\s*if \(!classesLink[\s\S]*?\}\s*\n\s*\}/, '\n');

fs.writeFileSync(path, s, 'utf8');
console.log('pages fixed');

