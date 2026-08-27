# Development Guide — Cómo se construyó este proyecto

Registro paso a paso de las decisiones y comandos usados para construir el monorepo desde cero.

---

## 1. Crear el workspace NX

Desde la raíz del proyecto (`findash/`):

```bash
npx create-nx-workspace@latest . --preset=apps --nxCloud=skip --packageManager=pnpm
```

> Cuando pregunte `Create workspace in the current directory?`, responder **Yes**.

---

## 2. Agregar plugins de NestJS y Angular

```bash
pnpm exec nx add @nx/nest
```

```bash
NX_IGNORE_UNSUPPORTED_TS_SETUP=true pnpm exec nx add @nx/angular
```

> La variable de entorno es necesaria porque Angular no soporta TypeScript project references (limitación conocida de NX 23).

---

## 3. Base de datos con Docker

El proyecto usa Docker para correr PostgreSQL en el puerto `5433` para no chocar con instancias locales en `5432`.

El contenedor se define en `docker-compose.yml` y se gestiona con:

```bash
pnpm db:up      # Levanta el contenedor
pnpm db:down    # Para el contenedor
pnpm db:logs    # Sigue los logs en tiempo real
```

---

## 4. Librería de base de datos con Prisma v5

El schema y las migraciones viven en `libs/database/` para que puedan ser reutilizados por cualquier app del monorepo. Esta decisión permite que cada servicio futuro consuma el mismo cliente de Prisma sin duplicar el schema.

```bash
pnpm exec nx g @nx/js:lib --name=database --directory=libs/database --no-interactive
pnpm add prisma@^5 @prisma/client@^5 --filter @findash/database
pnpm add prisma@^5 --save-dev -w
pnpm --filter @findash/database exec prisma init --datasource-provider postgresql
```

Comandos de Prisma disponibles desde la raíz:

```bash
pnpm db:migrate       # Crea y aplica una nueva migración
pnpm db:generate      # Genera el cliente TypeScript a partir del schema
pnpm db:migrate:prod  # Aplica migraciones en producción (sin prompt)
```

> Los modelos se definen en `libs/database/prisma/schema.prisma`.

---

## 5. Backend (NestJS) desde plantilla

El API se creó a partir de una plantilla propia usando `degit`, que copia los archivos sin el historial de git:

```bash
npx degit Sogrub/nestjs-template apps/api
pnpm install --filter @findash/api
```

Ajustes realizados sobre la plantilla:
- Renombrado el paquete a `@findash/api`
- Eliminado el constraint de `engines` (incompatible con Node 24)
- Agregado `@findash/database` como dependencia workspace
- Renombrado `MicroServiceException` → `AppException`
- Agregado manejo de errores de Prisma en `ExceptionsFilter`
- Creado `PrismaModule` en `src/common/database/`
