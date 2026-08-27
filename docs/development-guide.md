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
pnpm db:seed          # Carga datos iniciales (borra todo y recrea)
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

---

## 6. Módulo de autenticación

### JWT con revocación por versión

El JWT incluye el campo `jv` (jwtVersion). Al validar el token, `JwtStrategy` consulta la BD y compara `jv` con `user.jwtVersion`. Si no coinciden, el token fue revocado (por ejemplo, al cambiar la contraseña o hacer logout).

```
JWT payload: { sub, email, role, fullName, avatarUrl, jv }
```

Para revocar todos los tokens de un usuario basta con hacer `jwtVersion + 1` en la BD. El endpoint de logout usa esto de forma **best-effort**: lee el token con `jwtService.decode()` (sin verificar firma) para obtener el `sub` sin fallar si el token ya expiró.

### Google OAuth

El flujo es: `GET /auth/google` → Google → `GET /auth/google/callback` → redirect al frontend con `?token=<jwt>` → `AuthCallbackComponent` extrae el token y lo guarda en la cookie.

### Endpoints de auth

| Método | Ruta | Guard | Descripción |
|--------|------|-------|-------------|
| POST | `/auth/register` | — | Crea usuario + cuenta, retorna JWT |
| POST | `/auth/login` | — | Valida credenciales, retorna JWT |
| POST | `/auth/logout` | — | Revoca JWT (best-effort, sin guard) |
| POST | `/auth/forgot-password` | — | Genera código de 6 dígitos (TTL 15 min) |
| POST | `/auth/reset-password` | — | Valida código y actualiza contraseña |
| GET  | `/auth/google` | — | Inicia OAuth con Google |
| GET  | `/auth/google/callback` | — | Callback de Google, redirige al frontend |

### Creación automática de cuenta

Al registrar un usuario (tanto por email como por Google OAuth), el `AuthService` crea automáticamente una `Account` con `balance: 0` dentro de la misma transacción de Prisma.

---

## 7. Módulo de cuentas

### `GET /accounts/me`

Requiere JWT válido. Retorna la cuenta del usuario autenticado: `accountNumber`, `balance`, `type`, `status`.

### `GET /accounts` (solo ADMIN)

Requiere JWT + rol ADMIN. Retorna listado paginado con soporte para ordenar por `fullName`, `balance`, `status` o `createdAt`. Los números de cuenta se enmascaran (los primeros 2 caracteres son visibles, el resto son `*`).

Query params: `page`, `limit`, `sortBy`, `sortOrder`.

---

## 8. Frontend (Angular)

### Arquitectura general

- **Componentes standalone** con `imports: [...]` explícitos (sin módulos NgModule).
- **Signals** (`signal()`, `computed()`) en lugar de `BehaviorSubject` para estado reactivo.
- **Lazy loading** en todas las rutas de páginas.
- **JWT en cookie** (`fd_token`), no en `localStorage`, para sobrevivir recargas.

### AuthStore (RNF-03 — estado centralizado)

`apps/web/src/app/store/auth.store.ts` es el único punto de acceso al estado de autenticación. Los componentes inyectan `AuthStore`, nunca `AuthService` directamente.

El store expone:
- `currentUser: WritableSignal<UserInfo | null>` — se inicializa en el constructor leyendo y decodificando la cookie (para sobrevivir recargas de página).
- `isLoading: Signal<boolean>`, `error: Signal<string | null>`
- `login()`, `register()`, `logout()`, `handleOAuthToken()`

### Decodificación del JWT (UTF-8)

`atob()` interpreta los bytes como Latin-1. Para nombres con acentos (`Sofía`, `González`) hay que usar `TextDecoder`:

```typescript
const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
const payload = JSON.parse(new TextDecoder().decode(bytes));
```

### Interceptor `apiResponseInterceptor`

El backend envuelve todas las respuestas en `{ content: T, ... }`. El interceptor desenvuelve automáticamente el `content` para que los servicios reciban `T` directamente.

```
apps/web/src/app/interceptors/api-response.interceptor.ts
```

Sin este interceptor, `res.accessToken` sería `undefined` porque el token real está en `res.content.accessToken`.

### Guards

| Guard | Archivo | Comportamiento |
|-------|---------|---------------|
| `authGuard` | `guards/auth.guard.ts` | Redirige a `/` si no hay cookie |
| `guestGuard` | `guards/guest.guard.ts` | Redirige a `/dashboard` si ya está autenticado |
| `adminGuard` | `guards/admin.guard.ts` | Redirige a `/dashboard` si el rol no es ADMIN |

### Rutas

```
/                   → HomeComponent (guestGuard)
/dashboard          → DashboardComponent (authGuard)
/admin/accounts     → AdminAccountsComponent (authGuard + adminGuard)
/auth/callback      → AuthCallbackComponent
```

### Página de cuentas (admin)

`apps/web/src/app/pages/admin/accounts/`

- Muestra tarjetas (no tabla) con avatar de iniciales, nombre, número de cuenta enmascarado, saldo y estado (chip de color).
- Skeleton loader: muestra `limit` tarjetas animadas mientras carga.
- Paginador por defecto: 5 items, opciones 5/10/25.
- Ordenamiento: por nombre, saldo, estado o fecha de creación.
- Color del avatar: hash determinístico del nombre sobre 8 colores fijos.

---

## 9. Tests

El frontend usa **Vitest** con `@angular/build:unit-test`.

```bash
pnpm web:test
```

Convenciones:
- Tests en archivos `*.spec.ts` junto al archivo que prueban.
- Guards se prueban con `TestBed.runInInjectionContext()`.
- `AuthStore` se prueba mockeando el router: `vi.spyOn(router, 'navigate').mockResolvedValue(true)` (necesario porque los métodos del store navegan a `/dashboard`).
- El helper `makeToken(payload)` en los tests usa `TextEncoder` → `btoa` para generar JWTs correctamente codificados en UTF-8.

---

## 10. Seed de datos

`libs/database/prisma/seed.ts`

El seed hace un reset completo antes de crear datos:
1. Borra transacciones → userLogins → cuentas → usuarios (en orden para respetar FK).
2. Crea 1 administrador y 10 clientes (6 con saldo, 4 con $0).

Ver credenciales en el README.
