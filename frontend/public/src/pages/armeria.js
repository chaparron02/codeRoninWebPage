import { $, createEl, showModal, navigate, updateAuthNav, getJSON, setToken } from '../lib/core.js'
import { Hero, Card, Courses, Services, Projects, PDFs, AchievementsSection, EmbedInstagram, EmbedTikTok } from '../lib/components.js'

export async function ResourcesPage() {
  const main = createEl('main');
  const sec = createEl('section', { className: 'section page' });
  const c = createEl('div', { className: 'container' });
  c.append(
    createEl('h2', { className: 'section-title', text: 'Armería' }),
    createEl('p', { text: 'Instructivos, PDFs, checklists y material propio de codeRonin: tu kit esencial para planear, ejecutar y documentar.' })
  );
  // Store grid: promos + PDFs (sin embeds), solo nombre + precio; luego agregamos links
  const store = await getJSON('/api/store.json', { promos: [], pdfs: [] });
  // Promos
  if (store.promos && store.promos.length) {
    const s = createEl('section', { className: 'section' });
    const cc = createEl('div', { className: 'container' });
    cc.appendChild(createEl('h3', { text: 'Promociones' }));
    const grid = createEl('div', { className: 'card-grid' });
    store.promos.forEach(p => {
      const price = createEl('span', { className: 'badge price', text: `$${p.price}` });
      const cta = p.link ? createEl('a', { className: 'btn btn-sm btn-primary', text: 'Comprar', attrs: { href: p.link, target: '_blank', rel: 'noopener noreferrer' } }) : null;
      const card = Card({ title: p.name, desc: p.desc || '', image: p.image, cta });
      const row = createEl('div', { className: 'badge-row' }); row.appendChild(price); card.appendChild(row);
      grid.appendChild(card);
    });
    cc.appendChild(grid); s.appendChild(cc); c.appendChild(s);
  }
  // PDFs
  if (store.pdfs && store.pdfs.length) {
    const s = createEl('section', { className: 'section' });
    const cc = createEl('div', { className: 'container' });
    cc.appendChild(createEl('h3', { text: 'PDFs' }));
    const grid = createEl('div', { className: 'card-grid' });
    store.pdfs.forEach(p => {
      const price = createEl('span', { className: 'badge price', text: `$${p.price}` });
      const cta = p.link ? createEl('a', { className: 'btn btn-sm btn-primary', text: 'Comprar', attrs: { href: p.link, target: '_blank', rel: 'noopener noreferrer' } }) : null;
      const card = Card({ title: p.name, desc: p.desc || '', image: p.image, cta });
      const row = createEl('div', { className: 'badge-row' }); row.appendChild(price); card.appendChild(row);
      grid.appendChild(card);
    });
    cc.appendChild(grid); s.appendChild(cc); c.appendChild(s);
  }
  sec.appendChild(c);
  main.appendChild(sec);
  return main;
}

