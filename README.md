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

| Rol    | Tipo cuenta | Email                       | Contraseña      | Saldo       |
|--------|-------------|-----------------------------|-----------------|-------------|
| ADMIN  | CORPORATE   | diegoaburgos1@gmail.com     | Diego123456!    | $50,000.00  |
| CLIENT | BASIC       | carlos.m@example.com        | Cliente123456!  | $12,800.00  |
| CLIENT | BASIC       | sofia.g@example.com         | Cliente123456!  | $680.00     |
| CLIENT | BASIC       | mariana.l@example.com       | Cliente123456!  | $1,150.00   |
| CLIENT | BASIC       | jp.silva@example.com        | Cliente123456!  | $250.00     |
| CLIENT | BASIC       | luis.p@example.com          | Cliente123456!  | $0.00       |
| CLIENT | PREMIUM     | valentina.r@example.com     | Cliente123456!  | $3,500.00   |
| CLIENT | PREMIUM     | isabella.h@example.com      | Cliente123456!  | $9,800.00   |
| CLIENT | PREMIUM     | mf.castro@example.com       | Cliente123456!  | $0.00       |
| CLIENT | CORPORATE   | alejandro.v@example.com     | Cliente123456!  | $33,200.00  |
| CLIENT | CORPORATE   | camila.o@example.com        | Cliente123456!  | $0.00       |

Comisiones por tipo de cuenta: BASIC → 2% del monto | PREMIUM → $0 | CORPORATE → $5 fijo.

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

---

## Despliegue en producción

**URL activa:** http://136.115.30.249/

### CI/CD automático

Cada push a `main` dispara el pipeline en GitHub Actions (`.github/workflows/deploy.yml`) que:

1. Construye las imágenes Docker de API y Web
2. Las publica en GitHub Container Registry (`ghcr.io/sogrub/findash`)
3. Se conecta al servidor GCP vía SSH y reinicia los contenedores

Los secrets necesarios en el repositorio (`Settings → Secrets`):

| Secret | Descripción |
|--------|-------------|
| `VM_HOST` | IP del servidor |
| `VM_USER` | Usuario SSH |
| `VM_SSH_KEY` | Clave privada SSH |
| `GHCR_TOKEN` | Token para autenticarse en GHCR |

### Despliegue manual en el servidor

```bash
# 1. Crear el archivo de variables de producción
cp .env.prod.example .env.prod
# Editar .env.prod con los valores reales

# 2. Levantar los servicios (Postgres + API + nginx/Web)
API_IMAGE=ghcr.io/sogrub/findash/api:latest \
WEB_IMAGE=ghcr.io/sogrub/findash/web:latest \
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 3. Aplicar migraciones en producción
pnpm db:migrate:prod
```

Las variables requeridas en `.env.prod` están documentadas en `.env.prod.example`.
