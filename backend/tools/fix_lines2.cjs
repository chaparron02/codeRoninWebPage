const fs=require('fs');
const path='frontend/public/src/app.js';
let data=fs.readFileSync(path,'utf8');
let lines=data.split(/\r?\n/);
function set1based(lineNo, text){ const idx=lineNo-1; if(idx>=0 && idx<lines.length){ lines[idx]=text; } }
set1based(215, "  const btnArm = createEl('button', { className: 'btn', text: 'Armeria' });");
set1based(227, "    const map = { misiones: btnMis, dojo: btnDojo, armeria: btnArm };");
set1based(253, "      armeria: {");
set1based(254, "        title: 'Armeria',");
set1based(255, "        body: [");
set1based(256, "          'Tu kit esencial del ronin digital: guias, checklists y plantillas listas para aplicar.',");
set1based(257, "          'Estandariza procesos, acelera entregables y evita reinventar la rueda en cada mision.'");
set1based(258, "        ],");
set1based(259, "        link: '/armeria',");
set1based(260, "        img: '/assets/material/armeria.webp'");
fs.writeFileSync(path, lines.join('\n'),'utf8');
console.log('fixed 1-based');
