# FinDash - Billetera Digital

Monorepo con **NestJS** (API) + **Angular** (Web) + **PostgreSQL**, gestionado con **NX** y **pnpm**.

---

## Requisitos

- Node.js >= 18
- pnpm >= 8
- Docker

---

## Instalación

```bash
pnpm install
```

---

## Variables de entorno

Copia los archivos de ejemplo y ajusta los valores:

```bash
cp .env.example .env
cp apps/api/.env-template apps/api/.env
```

| Archivo | Propósito |
|---|---|
| `apps/api/.env` | Variables del API (puerto, JWT, DB) |
| `libs/database/.env` | `DATABASE_URL` para migraciones de Prisma |

---

## Base de datos

```bash
pnpm db:up            # Levanta PostgreSQL en Docker (puerto 5433)
pnpm db:migrate       # Crea y aplica migraciones
pnpm db:generate      # Genera el cliente Prisma
pnpm db:down          # Para el contenedor
pnpm db:logs          # Logs en tiempo real
```

---

## API

```bash
pnpm api:dev          # Modo desarrollo con hot reload
pnpm api:build        # Compila para producción
pnpm api:start        # Corre el build de producción
pnpm api:test         # Tests unitarios
pnpm api:test:cov     # Tests con cobertura
```

Swagger disponible en: `http://localhost:3000/docs`

---

## Estructura

```
apps/
  api/          # NestJS — REST API
  web/          # Angular — Frontend
libs/
  database/     # Prisma schema, cliente y migraciones
  shared/       # DTOs e interfaces compartidas
```

> Ver `docs/development-guide.md` para el registro de decisiones y comandos usados durante la construcción.
