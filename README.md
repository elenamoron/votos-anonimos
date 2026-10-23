# Urna — votos anónimos

Aplicación web para contabilizar votos anónimos desde cualquier móvil. El admin crea preguntas y opciones; los votantes solo ven lo activo. Un dispositivo puede votar una vez por pregunta. El admin ve totales, nunca quién votó qué.

## Requisitos

- Node.js 20+
- npm

## Arranque local

```bash
cp .env.example .env.local
# Edita ADMIN_PASSWORD y SESSION_SECRET
npm install
npm run dev
```

Abre:

- Votación: [http://localhost:3000](http://localhost:3000)
- Admin: [http://localhost:3000/admin](http://localhost:3000/admin)

La base SQLite se crea en `data/votos.db`.

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `ADMIN_PASSWORD` | Contraseña del panel admin |
| `SESSION_SECRET` | Secreto para firmar la cookie de sesión (≥16 caracteres) |
| `TURSO_DATABASE_URL` | URL de Turso en producción (si no se define, usa `data/votos.db`) |
| `TURSO_AUTH_TOKEN` | Token de Turso |

## Cómo funciona el anonimato

1. Cada navegador recibe una cookie `urna_device` (HttpOnly) con un id opaco.
2. Al votar se guarda solo `{ pregunta, opción }` en `votes` (sin id de dispositivo).
3. En `ballots` se guarda `{ dispositivo, pregunta }` para impedir un segundo voto a esa pregunta.
4. El admin consulta conteos agregados; no hay enlace entre dispositivo y opción elegida.

**Límite:** borrar cookies o usar otro navegador cuenta como otro dispositivo. Aceptable para uso interno de una organización.

## Despliegue gratis

### Opción A — Vercel + Turso

1. Crea una base en [turso.tech](https://turso.tech) (plan free).
2. Obtén `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`.
3. Sube el repo a GitHub y despliega en [vercel.com](https://vercel.com).
4. En Vercel, configura las variables de entorno (`ADMIN_PASSWORD`, `SESSION_SECRET`, `TURSO_*`).
5. Despliega. Comparte la URL con los votantes.

### Opción B — Red local (sin internet público)

En un ordenador de la oficina:

```bash
npm install
npm run build
npm start
```

Los móviles en la misma WiFi entran con `http://IP-DEL-PC:3000`. El admin usa `/admin`.

## Scripts

| Comando | Uso |
|---------|-----|
| `npm run dev` | Desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Servir build |
| `npm run lint` | ESLint |
