(() => {
  try {
    const es = new EventSource('/__livereload');
    es.addEventListener('change', (ev) => {
      try {
        const msg = JSON.parse(ev.data || '{}');
        if (msg.type === 'css') {
          // Bust cache for all stylesheets
          const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
          links.forEach((l) => {
            const href = new URL(l.href, location.origin);
            href.searchParams.set('v', Date.now());
            l.href = href.pathname + '?' + href.searchParams.toString();
          });
        } else if (msg.type === 'reload') {
          location.reload();
        }
      } catch {}
    });
  } catch {}
})();

