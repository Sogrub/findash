# FinDash — Billetera Digital

Monorepo **NestJS + Angular + PostgreSQL** gestionado con **pnpm workspaces**.

---

## Requisitos

| Herramienta | Versión mínima |
|-------------|----------------|
| Node.js     | 18             |
| pnpm        | 8              |
| Docker      | cualquiera     |

---

## Instalación

```bash
pnpm install
```

---

## Variables de entorno

```bash
cp apps/api/.env-template apps/api/.env
```

Edita `apps/api/.env` con tus valores:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `JWT_SECRET` | Secreto para firmar tokens |
| `JWT_EXPIRES_IN` | Duración del token (ej. `7d`) |
| `GOOGLE_CLIENT_ID` | ID de aplicación OAuth de Google |
| `GOOGLE_CLIENT_SECRET` | Secreto OAuth de Google |
| `GOOGLE_CALLBACK_URL` | URL de callback (ej. `http://localhost:3000/api/v1/auth/google/callback`) |
| `FRONTEND_URL` | URL del frontend (ej. `http://localhost:4200`) |

---

## Base de datos

```bash
pnpm db:up            # Levanta PostgreSQL en Docker (puerto 5433)
pnpm db:migrate       # Crea y aplica migraciones Prisma
pnpm db:generate      # Regenera el cliente Prisma
pnpm db:seed          # Carga los datos iniciales (roles + usuarios de prueba)
pnpm db:down          # Para el contenedor
pnpm db:logs          # Logs en tiempo real
```

### Usuarios de prueba (después del seed)

| Rol    | Email                      | Contraseña       | Saldo       |
|--------|----------------------------|------------------|-------------|
| ADMIN  | diegoaburgos1@gmail.com    | Diego123456!     | $50,000.00  |
| CLIENT | valentina.r@example.com    | Cliente123456!   | $2,500.00   |
| CLIENT | carlos.m@example.com       | Cliente123456!   | $15,800.75  |
| CLIENT | sofia.g@example.com        | Cliente123456!   | $450.00     |
| CLIENT | isabella.h@example.com     | Cliente123456!   | $8,200.50   |
| CLIENT | alejandro.v@example.com    | Cliente123456!   | $32,000.00  |
| CLIENT | mariana.l@example.com      | Cliente123456!   | $980.20     |
| CLIENT | jp.silva@example.com       | Cliente123456!   | $0.00       |
| CLIENT | mf.castro@example.com      | Cliente123456!   | $0.00       |
| CLIENT | luis.p@example.com         | Cliente123456!   | $0.00       |
| CLIENT | camila.o@example.com       | Cliente123456!   | $0.00       |

> El seed borra y recrea todos los datos en cada ejecución.

---

## API (NestJS)

```bash
pnpm api:dev          # Modo desarrollo con hot reload
pnpm api:build        # Compila para producción
pnpm api:start        # Corre el build de producción
pnpm api:test         # Tests unitarios
pnpm api:test:cov     # Tests con cobertura
```

Swagger: `http://localhost:3000/docs`

---

## Web (Angular)

```bash
pnpm web:dev          # Servidor de desarrollo (puerto 4200)
pnpm web:build        # Compila para producción
pnpm web:test         # Tests unitarios con Vitest
```

---

## Estructura

```
apps/
  api/              # NestJS — REST API
    src/
      modules/
        auth/       # Autenticación JWT + Google OAuth
        accounts/   # Cuentas bancarias
  web/              # Angular — Frontend
    src/app/
      components/   # Componentes reutilizables (AuthDialog)
      guards/       # authGuard, guestGuard, adminGuard
      interceptors/ # apiResponseInterceptor (desenvuelve { content })
      pages/
        home/           # Landing con login/registro
        dashboard/      # Dashboard del usuario autenticado
        admin/accounts/ # Listado de cuentas (solo ADMIN)
        auth-callback/  # Callback OAuth de Google
      services/     # AuthService, AccountService
      store/        # AuthStore — estado centralizado (RNF-03)
libs/
  database/         # Prisma schema, cliente y migraciones
```

> Ver `docs/development-guide.md` para las decisiones de arquitectura y los endpoints disponibles.
