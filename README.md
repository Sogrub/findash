# FinDash - Billetera Digital

Monorepo con **NestJS** (API) + **Angular** (Web) + **PostgreSQL**, gestionado con **NX**.

---

## Setup del Monorepo

### 1. Crear el workspace NX

Desde la raíz del proyecto (`findash/`):

```bash
npx create-nx-workspace@latest . --preset=apps --nxCloud=skip --packageManager=pnpm
```

> Cuando pregunte `Create workspace in the current directory?`, responder **Yes**.

---

## Base de Datos (PostgreSQL con Docker)

### 2. Levantar la base de datos

El proyecto usa Docker para correr PostgreSQL en el puerto `5433` (para no chocar con instancias locales existentes en `5432`).

```bash
pnpm db:up
```

### Credenciales de conexión

| Campo    | Valor        |
|----------|--------------|
| Host     | `localhost`  |
| Port     | `5433`       |
| Database | `findash`    |
| User     | `findash`    |
| Password | `findash123` |

### Otros comandos de base de datos

```bash
pnpm db:down    # Para el contenedor
pnpm db:logs    # Sigue los logs en tiempo real
```

---

## ORM (Prisma v5)

El schema y las migraciones viven en `libs/database/` para que puedan ser reutilizados por cualquier app del monorepo.

### 3. Instalar Prisma en la librería de base de datos

```bash
pnpm add prisma@^5 @prisma/client@^5 --filter @findash/database
pnpm add prisma@^5 --save-dev -w
```

### Variables de entorno

Crea un `.env` en la raíz del proyecto:

```env
DATABASE_URL="postgresql://findash:findash123@localhost:5433/findash"
```

### Comandos de Prisma

```bash
pnpm db:migrate     # Crea y aplica una nueva migración
pnpm db:generate    # Genera el cliente TypeScript a partir del schema
pnpm db:migrate:prod  # Aplica migraciones en producción (sin prompt)
```

> Los modelos se definen en `libs/database/prisma/schema.prisma`.
