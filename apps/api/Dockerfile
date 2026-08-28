# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl && \
    npm install -g @nestjs/cli@11 && \
    corepack enable && corepack prepare pnpm@11.5.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpm.json ./
COPY apps/api/package.json ./apps/api/
COPY libs/database/package.json ./libs/database/
COPY apps/api/ ./apps/api/
COPY libs/database/ ./libs/database/

# Todo en una sola capa para que los symlinks de pnpm sean válidos
RUN pnpm install --frozen-lockfile && \
    pnpm --filter @findash/database db:generate && \
    cd /app/apps/api && nest build


# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache openssl

# Copiar node_modules completo (incluye prisma CLI + cliente generado con el schema)
COPY --from=builder /app/node_modules ./node_modules

# Compiled API
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Schema + migrations para prisma migrate deploy al arrancar
COPY --from=builder /app/libs/database/prisma ./libs/database/prisma

# libs/database es referenciado por el symlink de pnpm en node_modules
COPY --from=builder /app/libs/database ./libs/database

COPY apps/api/entrypoint.sh ./apps/api/entrypoint.sh
RUN chmod +x ./apps/api/entrypoint.sh

WORKDIR /app/apps/api
EXPOSE 3000
ENTRYPOINT ["/app/apps/api/entrypoint.sh"]
