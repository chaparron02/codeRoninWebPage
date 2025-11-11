const footerTemplate = /* html */ `
<footer class="cr-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      <span class="brand-text glitch" data-text="codeRonin">codeRonin</span>
      <p class="footer-note">La invisibilidad no es desaparecer: es no ser detectado.</p>
      <div class="footer-tags">
        <span>Pentesting</span>
        <span>OSINT</span>
        <span>Ingenieria social</span>
      </div>
    </div>
    <div class="footer-column">
      <h4>Paginas</h4>
      <div class="footer-links">
        <a href="/about">Nosotros</a>
        <a href="/misiones">Misiones</a>
        <a href="/dojo">Dojo</a>
        <a href="/armeria">Armeria</a>
        <a href="/politicas" data-id="nav-policy">Politicas</a>
      </div>
    </div>
    <div class="footer-column">
      <h4>Contacto</h4>
      <div class="footer-links">
        <a href="mailto:coderonin404@gmail.com">coderonin404@gmail.com</a>
        <a href="https://wa.me/573054402340" target="_blank" rel="noopener noreferrer">WhatsApp</a>
      </div>
      <div class="footer-social">
        <a href="https://www.instagram.com/code_ronin?igsh=aTRrcWtmdzQxZnI0" target="_blank" rel="noopener noreferrer">Instagram</a>
        <a href="https://www.tiktok.com/@code.ronin?_t=ZS-90Rb6qcPCVt&_r=1" target="_blank" rel="noopener noreferrer">TikTok</a>
      </div>
    </div>
    <div class="footer-column">
      <h4>Newsletter</h4>
      <p class="footer-note">Recibe alertas de labs, misiones y herramientas nuevas.</p>
      <form class="footer-form" onsubmit="return false">
        <input type="email" placeholder="tu@email.com" aria-label="Correo" />
        <button type="button" class="btn btn-primary btn-sm">Suscribirme</button>
      </form>
    </div>
  </div>
  <div class="footer-bottom">
    <span>&copy; <span id="footer-year"></span> codeRonin. Todos los derechos reservados.</span>
    <span class="footer-bottom-links">
      <a href="/politicas">Legales</a>
      <a href="/contact">Contacto</a>
    </span>
  </div>
</footer>
`;

export function mountFooter() {
  const anchor = document.getElementById('footer-root') || document.body;
  if (!anchor) return null;
  anchor.innerHTML = '';
  const tpl = document.createElement('template');
  tpl.innerHTML = footerTemplate.trim();
  const footer = tpl.content.firstElementChild;
  anchor.appendChild(footer);
  const year = footer.querySelector('#footer-year');
  if (year) year.textContent = String(new Date().getFullYear());
  return footer;
}
