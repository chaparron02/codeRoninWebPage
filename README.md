codeRonin - Frontend + Backend
================================

SPA estatica (HTML/CSS/JS puro) servida por un backend Express con Sequelize. Por defecto usa SQLite; si defines `DATABASE_URL` puedes apuntar a MySQL/PostgreSQL.

Estructura
----------
- `frontend/public`: sitio (SPA sin build).
  - `assets/css`, `assets/images`, `assets/material`: estilos y medios del front.
- `backend`: API Express + auth + base de datos (Sequelize).
- `material/`: se crea en runtime para uploads/adjuntos protegidos (no se versiona).

Requisitos
----------
- Node.js 18+
- SQLite incluido; para MySQL/PostgreSQL exporta `DATABASE_URL`.

Instalacion
-----------
1) Instala dependencias
```
npm install
```

2) Variables de entorno (opcional)
Copia `.env.example` a `.env` y ajusta:
- `PORT` (default 3000)
- `DATABASE_URL` (por defecto usa SQLite local `backend/data/coderonin.db`)

3) Ejecuta backend (sirve el frontend)
```
npm start
```
API y SPA en `http://localhost:3000`.

Frontend dev server opcional
----------------------------
```
BACKEND_URL=http://localhost:3000 node frontend/server.js
```
- Proxy `/api` al backend respetando CSP.
- Cambia `PORT` para el server estatico si lo necesitas.

Build estatico (cpanel u otro host de archivos)
-----------------------------------------------
```
npm run build
```
Resultado en `dist/` listo para subir al hosting; define `window.__CR_API_BASE__` o `<meta name="cr-api-base">` apuntando al backend.

Deploy en Render (backend)
--------------------------
- Start command: `npm start`
- Env:
  - `PORT`: Render lo define automaticamente.
  - `DATABASE_URL`: obligatorio. Usa el URL de Postgres de Render. El backend activa SSL automaticamente (`require: true, rejectUnauthorized: false`).
  - `JWT_SECRET`: secreto propio.
  - No hay fallback a SQLite en Render (el disco es efimero).
- Node version 18+.
Nota: si subes el front a Render tambi��n, apunta `CR_API_BASE` a la URL del servicio backend para evitar problemas de CSP.

Configurar base de API en produccion
------------------------------------
El frontend resuelve el backend en este orden:
1. `window.__CR_API_BASE__` (inyectalo antes de `main.js`).
2. `<meta name="cr-api-base" content="https://tu-backend">`.
3. Default: misma origin (`/api`).
Para media/adjuntos puedes definir `window.__CR_MEDIA_BASE__` o `<meta name="cr-media-base" ...>`.

API principal
-------------
- `GET /api/health`
- `GET /api/courses.json`
- `GET /api/services.json`
- `GET /api/projects.json`
- `GET /api/achievements.json`
- `GET /api/pdfs.json`
- Auth, admin, instructor, reports bajo `/api/*` (ver codigo).

Notas
-----
- La carpeta `material/` no se commitea; Express la crea al vuelo para uploads.
- CSP estricta: evita inline scripts. Usa meta o variables globales para configurar backend.
- El frontend usa `apiFetch` con bearer token almacenado en `localStorage` (`cr_token`).

Proximos pasos sugeridos
-----------------------
- Agregar tests E2E ligeros para flujos clave (login, formularios, admin CRUD).
- Automatizar seeds reales en SQLite/MySQL/PostgreSQL para demos.
- Deploy en Render/Fly/Heroku apuntando `DATABASE_URL` al motor SQL de tu hosting.
