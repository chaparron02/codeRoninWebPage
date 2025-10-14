codeRonin - Frontend + Backend

Base del sitio con frontend estatico (SPA sin framework) y backend Express con endpoints JSON y MongoDB (sin fallback).

Estructura
- frontend/public: HTML + CSS + JS (SPA sin build)
  - assets/css: estilos
  - assets/images, assets/material: imagenes y videos
- backend: servidor Express + endpoints `/api`
- material: carpeta para PDFs u otros archivos servidos desde `/material`

Requisitos
- Node.js 18+
- MongoDB local o URI (requerido)

Instalacion
1) Instala dependencias
   npm install

2) Configura variables (opcional)
   Copia `.env.example` a `.env` y ajusta `PORT`, `MONGODB_URI`, `MONGODB_DB`.

3) Ejecuta el backend (sirve tambien el frontend)
   npm run dev
   Backend + Frontend: http://localhost:8085

Opcional: servidor de frontend en desarrollo (provisional desactivado por defecto)
- Ejecuta: npm run serve:dev --workspace frontend  (o node frontend/server.js)
- Proxy `/api` hacia el backend usando la misma origin (CSP friendly). Cambia el destino con `BACKEND_URL`.
  Ejemplo: BACKEND_URL=http://localhost:8085 node frontend/server.js

API disponible
- GET /api/health
- GET /api/courses.json
- GET /api/services.json
- GET /api/projects.json
- GET /api/achievements.json
- GET /api/pdfs.json  (lista PDFs en carpeta `material`)

Notas
- La carpeta `material` se crea si no existe y se sirve en `/material`.
- Se eliminaron carpetas legacy para dejar solo `frontend/` y `backend/` listas para GitHub.

Proximos pasos sugeridos
- Reemplazar SPA sin build por Vite/webpack si se desea pipeline de build.
- Anadir modelos reales y CRUD sobre MongoDB para contenido dinamico.
- Despliegue en un servicio gestionado (MongoDB Atlas + Render/Vercel/Fly/Heroku).
