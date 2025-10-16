import { $, createEl, showModal, navigate, updateAuthNav, getJSON, setToken } from '../lib/core.js'
import { Hero, Card, Courses, Services, Projects, PDFs, AchievementsSection, EmbedInstagram, EmbedTikTok } from '../lib/components.js'

export async function AboutPage() {
  const sec = createEl('section', { className: 'section page', attrs: { id: 'nosotros' } });
  const c = createEl('div', { className: 'container' });
  c.appendChild(createEl('h2', { className: 'section-title', text: 'Nosotros' }));

  // Filosofía
  c.appendChild(createEl('h3', { text: 'Filosofía' }));
  c.appendChild(createEl('p', { text: 'En codeRonin formamos "ninjas digitales": disciplina, curiosidad y práctica. Operamos con ética y consentimiento en laboratorios controlados, para que pensar como atacante te ayude a diseñar mejores defensas.' }));

  // Motivación
  c.appendChild(createEl('h3', { text: 'Motivación' }));
  const ulMot = createEl('ul', { className: 'list' });
  [
    'Cerrar la brecha entre teoría y práctica con labs reproducibles.',
    'Elevar la cultura de seguridad con contenidos breves y accionables.',
    'Acelerar la madurez: hardening, detección, respuesta y reporte ejecutivo.'
  ].forEach(t => ulMot.appendChild(createEl('li', { text: t })));
  c.appendChild(ulMot);

  // Conferencias y actividades
  c.appendChild(createEl('h3', { text: 'Conferencias y actividades' }));
  const ulAct = createEl('ul', { className: 'list' });
  [
    'Charlas (BSides/FLISoL): Evil Twin corporativo, DFIR exprés, Ingeniería social asistida por IA.',
    'Comunidad y contenidos: Reels/Shorts diarios, microtutoriales de Wi-Fi, phishing, logs, OSINT.',
    'Material descargable: guías, playbooks, checklists y plantillas de reporte.'
  ].forEach(t => ulAct.appendChild(createEl('li', { text: t })));
  c.appendChild(ulAct);
  const media = createEl('div', { className: 'media-grid' });
  media.appendChild(createEl('video', { attrs: { src: '/assets/material/armeriagif.mp4', autoplay: '', muted: '', loop: '', playsinline: '' } }));
  c.appendChild(media);

  // Proyectos
  c.appendChild(createEl('h3', { text: 'Proyectos' }));
  const ulProj = createEl('ul', { className: 'list' });
  [
    'Evil Twin en entorno controlado con matriz de mitigación.',
    'Análisis de logs con foco en sesiones fuera de horario y artefactos remotos.',
    'Metodología de artefactos para herramientas de control remoto (qué, dónde y por qué).'
  ].forEach(t => ulProj.appendChild(createEl('li', { text: t })));
  c.appendChild(ulProj);
  // Logros/cartas desde achievements.json
  c.appendChild(await AchievementsSection());
  // CodeRonin AI (Próximamente)
  const soon = Card({ title: 'CodeRonin AI (Próximamente)', desc: 'MVP de concientización e ingeniería social ética con IA: vishing/smishing simulados, métricas y consentimiento/auditoría. Comercialización prevista en la siguiente fase.' });
  const rowSoon = createEl('div', { className: 'badge-row' }); rowSoon.appendChild(createEl('span', { className: 'badge soon', text: 'En desarrollo' })); soon.appendChild(rowSoon);
  const gridSoon = createEl('div', { className: 'card-grid' }); gridSoon.appendChild(soon); c.appendChild(gridSoon);

  // Activos diferenciales
  c.appendChild(createEl('h3', { text: 'Activos diferenciales' }));
  const ulFounder = createEl('ul', { className: 'list' });
  [
    'CEH Master y experiencia aplicada en red team/DFIR orientada a formación.',
    'Performance y magia escénica para elevar la efectividad de charlas.',
    'Analítica y datos para instrumentar métricas y aprendizaje.',
    'Narrativa "ninja digital" para impulsar la cultura de seguridad.'
  ].forEach(t => ulFounder.appendChild(createEl('li', { text: t })));
  c.appendChild(ulFounder);

  // Contacto
  c.appendChild(createEl('h3', { text: 'Contacto' }));
  const socials = createEl('div', { className: 'social-row' });
  [
    { label: 'Email', href: 'mailto:coderonin404@gmail.com' },
    { label: 'WhatsApp', href: 'https://wa.me/573054402340' },
    { label: 'Instagram', href: 'https://www.instagram.com/code_ronin?igsh=aTRrcWtmdzQxZnI0' },
    { label: 'TikTok', href: 'https://www.tiktok.com/@code.ronin?_t=ZS-90Rb6qcPCVt&_r=1' }
  ].forEach(s => socials.appendChild(createEl('a', { text: s.label, attrs: { href: s.href, target: '_blank', rel: 'noopener noreferrer' } })));
  c.appendChild(socials);

  sec.appendChild(c);
  return sec;
}

