const fs=require('fs');
const path='frontend/public/src/app.js';
let data=fs.readFileSync(path,'utf8');
let lines=data.split(/\r?\n/);
function set(idx, text){ if(idx>=0 && idx<lines.length){ lines[idx]=text; } }
set(214, "  const btnArm = createEl('button', { className: 'btn', text: 'Armeria' });");
set(226, "    const map = { misiones: btnMis, dojo: btnDojo, armeria: btnArm };");
set(253, "      armeria: {");
set(254, "        title: 'Armeria',");
set(255, "        body: [");
set(256, "          'Tu kit esencial del ronin digital: guias, checklists y plantillas listas para aplicar.',");
set(257, "          'Estandariza procesos, acelera entregables y evita reinventar la rueda en cada mision.'");
set(258, "        ],");
set(259, "        link: '/armeria',");
set(260, "        img: '/assets/material/armeria.webp'");
fs.writeFileSync(path, lines.join('\n'),'utf8');
console.log('fixed lines');
