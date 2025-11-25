// Minimal static server for development (no dependencies)
// Security-first defaults: strict headers, no directory listing, path sanitization, API proxy

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = process.env.PORT || 5173;
const LIVE = process.env.LIVERELOAD !== '0';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4'
};

const BLOCKED_EXT = new Set(['.env','.config','.ini','.log','.lock','.pem','.key','.crt','.ps1','.sh']);
const BLOCKED_SEGMENTS = ['/.git', '/package-lock.json', '/package.json', '/server.js'];

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('X-Frame-Options', 'DENY'); // Redundant with CSP frame-ancestors
  // HSTS is effective only over HTTPS; set here for consistency when proxied
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://payhip.com; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; media-src 'self'; frame-src https://www.instagram.com https://www.tiktok.com https://payhip.com; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests");
}

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  res.statusCode = code;
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', 'no-store');
  setSecurityHeaders(res);
  res.end(body);
}

function safeJoin(base, requestedPath) {
  // Prevent path traversal and decode URI safely
  try {
    const decoded = decodeURIComponent(requestedPath);
    const safePath = path.normalize(decoded).replace(/^([/\\])+/, '');
    const full = path.join(base, safePath);
    if (!full.startsWith(base)) return null;
    return full;
  } catch {
    return null;
  }
}

function proxyApi(req, res) {
  try {
    const target = new URL(BACKEND_URL);
    const client = target.protocol === 'https:' ? https : http;
    const options = {
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: target.host },
    };
    const pReq = client.request(options, (pRes) => {
      res.writeHead(pRes.statusCode || 502, pRes.headers);
      pRes.pipe(res);
    });
    pReq.on('error', () => {
      res.statusCode = 502;
      setSecurityHeaders(res);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Bad Gateway');
    });
    if (req.method !== 'HEAD') req.pipe(pReq); else pReq.end();
  } catch (e) {
    res.statusCode = 500;
    setSecurityHeaders(res);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Proxy Error');
  }
}

const server = http.createServer((req, res) => {
  if (LIVE && req.url.startsWith('/__livereload')) {
    // Set headers BEFORE sending any data to avoid ERR_HTTP_HEADERS_SENT
    res.statusCode = 200;
    setSecurityHeaders(res);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') res.flushHeaders();
    else res.write('\n');
    const client = { res };
    clients.add(client);
    req.on('close', () => clients.delete(client));
    return;
  }
  // API proxy to backend to keep same-origin and satisfy CSP
  if (req.url.startsWith('/api')) {
    return proxyApi(req, res);
  }

  // Only GET/HEAD allowed for static assets and pages
  if (!['GET', 'HEAD'].includes(req.method)) {
    return send(res, 405, 'Method Not Allowed');
  }

  const rawUrl = req.url || '/';
  if (/%2e%2e/i.test(rawUrl) || rawUrl.includes('..')) {
    return send(res, 400, 'Bad Request');
  }

  let urlPath = rawUrl.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  const lowered = urlPath.toLowerCase();
  if (BLOCKED_SEGMENTS.some(seg => lowered.includes(seg))) {
    return send(res, 403, 'Forbidden');
  }
  const extGuess = path.extname(urlPath).toLowerCase();
  if (BLOCKED_EXT.has(extGuess)) {
    return send(res, 403, 'Forbidden');
  }

  const filePath = safeJoin(PUBLIC_DIR, urlPath);
  if (!filePath) return send(res, 400, 'Bad Request');

  // If path is a directory, disallow listing
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    return send(res, 403, 'Forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    const ext = path.extname(filePath).toLowerCase();
    if (err) {
      // SPA fallback: only for document requests (no extension) and when client accepts HTML
      const accept = (req.headers['accept'] || '').toLowerCase();
      const isDoc = !ext || ext === '' || ext === '.';
      if (isDoc && accept.includes('text/html')) {
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        fs.readFile(indexPath, (e2, indexHtml) => {
          if (e2) return send(res, 404, 'Not Found');
          send(res, 200, indexHtml, MIME['.html']);
        });
      } else {
        send(res, 404, 'Not Found');
      }
      return;
    }
    const type = MIME[ext] || 'application/octet-stream';
    send(res, 200, data, type);
  });
});

// --- Live reload (SSE) ---
const clients = new Set();
function broadcast(obj) {
  const msg = `event: change\n` + `data: ${JSON.stringify(obj)}\n\n`;
  for (const c of clients) {
    try { c.res.write(msg); } catch {}
  }
}

if (LIVE) {
  // ping to keep connections alive
  setInterval(() => broadcast({ type: 'ping', t: Date.now() }), 30000).unref?.();
  try {
    fs.watch(PUBLIC_DIR, { recursive: true }, (event, filename) => {
      if (!filename) return;
      const ext = path.extname(filename).toLowerCase();
      if (ext === '.css') broadcast({ type: 'css', path: '/' + filename.replace(/\\/g, '/') });
      else broadcast({ type: 'reload', path: '/' + filename.replace(/\\/g, '/') });
    });
  } catch (e) {
    console.warn('Live reload watcher error:', e.message);
  }
}

function start(port) {
  server.listen(port, () => {
    console.log(`codeRonin dev server running at http://localhost:${port}`);
    if (LIVE) console.log('Live reload enabled');
  });
}

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    const p = Number(server.address()?.port || PORT) + 1 || (Number(PORT) + 1);
    console.warn(`Port in use, trying ${p}...`);
    setTimeout(() => start(p), 100);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

start(Number(PORT));
