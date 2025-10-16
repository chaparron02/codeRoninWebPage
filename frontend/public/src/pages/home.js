import { $, createEl, showModal, navigate, updateAuthNav, getJSON, setToken } from '../lib/core.js'

export async function HomePage() {
  const main = document.createDocumentFragment();
  const hero = document.createElement('section'); hero.className='hero'; hero.id='inicio';
  const container = document.createElement('div'); container.className='container';
  const h1 = document.createElement('h1');
  h1.append('Aprende hacking y ciberseguridad ');
  const span = document.createElement('span'); span.className='neon-red'; span.textContent='como un ronin'; h1.appendChild(span);
  const p = document.createElement('p'); p.textContent='Laboratorios, proyectos y material practico.';
  const cta = document.createElement('div'); cta.className='cta';
  const a1 = document.createElement('a'); a1.className='btn btn-primary'; a1.textContent='Ir a Misiones'; a1.href='/misiones';
  const a2 = document.createElement('a'); a2.className='btn btn-ghost'; a2.textContent='Ir al Dojo'; a2.href='/dojo';
  const a3 = document.createElement('a'); a3.className='btn btn-ghost'; a3.textContent='Ir a Armeria'; a3.href='/armeria';
  cta.append(a1,a2,a3);
  container.append(h1,p,cta);
  hero.appendChild(container);
  main.appendChild(hero);
  return main;
}