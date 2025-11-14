codeRonin - Frontend + API
================================

SPA estática (HTML/JS/CSS puro) servida por un backend Express. El backend ahora usa **Sequelize** con **SQLite** por defecto (puedes conectar MySQL/PostgreSQL definiendo `DATABASE_URL`). No hay dependencias de MongoDB.

Estructura
----------

- `frontend/public`: código del sitio (SPA sin build)
  - `assets/css`, `assets/images`, `assets/material` para estilos y medios.
- `backend`: API Express + autenticación + conexión SQL (Sequelize).
- `material/`: archivos privados (reportes, adjuntos) servidos con restricciones de rol.
- `frontend/server.js`: servidor dev opcional con proxy `/api`.

Requisitos
----------

- Node.js 18+
- SQLite (incluido). Para MySQL/PostgreSQL exporta `DATABASE_URL`.

Instalación / uso
-----------------

1. Instala dependencias:
   ```bash
   npm install
   ```

2. Variables de entorno: copia `.env.example` → `.env`. Campos relevantes:
   - `PORT`: puerto del backend (por defecto `3000`).
   - `DATABASE_URL`: cadena Sequelize (ej. `mysql://user:pass@host/db`). Sin definir se usa `backend/data/coderonin.db` (SQLite).

3. Ejecuta backend + frontend estático:
   ```bash
   npm start
   ```
   Servirá todo en `http://localhost:3000`.

Servidor frontend opcional (solo desarrollo)
--------------------------------------------

Sirve `frontend/public` con live reload y proxy `/api`:

```bash
node frontend/server.js
# o npm run serve:dev si lo agregas a scripts
```

Variables útiles:
- `PORT`: puerto del servidor estático (default `5173`).
- `BACKEND_URL`: URL del backend para el proxy. Ejemplo:
  ```bash
  BACKEND_URL=http://localhost:3000 node frontend/server.js
  ```

API básica
----------

- `GET /api/health`
- `GET /api/courses.json`
- `GET /api/services.json`
- `GET /api/projects.json`
- `GET /api/achievements.json`
- `GET /api/pdfs.json`
- `/api/auth/*`, `/api/user/*`, `/api/admin/*`, `/api/instructor/*`, `/api/reports/*` para el panel (ver código).

Notas
-----

- `material/` se crea automáticamente. Archivos sensibles (videos, pergaminos, misiones) se sirven con protección de roles (`gato`/`sensei`).
- Sequelize usa migración automática (`sync()`). Si quieres migraciones formales, añade `sequelize-cli` o `drizzle-kit` según tu preferencia.
- Todos los formularios/admin ahora consumen ID estilo SQL (`id` UUID). El frontend fue actualizado para usar esos IDs.

Próximos pasos sugeridos
------------------------

- Agregar migraciones seeds custom para ambientes productivos.
- Sustituir la SPA sin build por Vite/React si necesitas bundling.
- Desplegar en un servicio gestionado (Railway/Fly/Render) apuntando `DATABASE_URL` al motor SQL de tu hosting.
