# escalia-docs

Servidor multi-tenant de documentos. Subís PDF/HTML/imágenes, asignás un alias
(slug) y se sirven por web bajo `<tenant>-docs.escalia.tech/<slug>`.

## Estructura

```
escalia-docs/
├── backend/    API NestJS + Drizzle (libsql). Resuelve tenant por Host, sirve docs.
└── frontend/   Admin SPA (Vite + React + TS) para gestionar tenants y documentos.
```

## Acceso

- **Super-admin** (global): credenciales en env, JWT. Gestiona todos los tenants y docs.
- **Reader** (por tenant): una contraseña compartida por tenant desbloquea sus docs privados.
- **Anónimo**: solo docs marcados públicos.

## Dev

```bash
# backend
cd backend && npm install && npm run db:generate && npm run seed && npm run start:dev

# frontend (otra terminal)
cd frontend && npm install && npm run dev
```

Backend en `:3010`, admin SPA en `:5173`. Configurá `.env` en cada carpeta a partir de `.env.example`.

## Dominios

`<tenant>-docs.escalia.tech` (1 nivel). Cubierto por wildcard `*.escalia.tech`
(DNS + Universal SSL). Tenant nuevo = solo alta en la tabla `tenants`, sin tocar DNS.
