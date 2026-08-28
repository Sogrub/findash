# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@11.5.0 --activate

# Copy workspace manifests first (Docker layer cache: re-install only when these change)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY libs/database/package.json ./libs/database/

RUN pnpm install --frozen-lockfile

# Copy source
COPY apps/api/ ./apps/api/
COPY libs/database/ ./libs/database/

# Compile TypeScript → dist/
RUN pnpm --filter @findash/api build

# Create standalone production deployment (resolves workspace deps, prod-only)
RUN pnpm --filter @findash/api --prod deploy --legacy /prod


# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

# OpenSSL is required by the Prisma query engine on Alpine
RUN apk add --no-cache openssl

# Production node_modules from pnpm deploy
COPY --from=builder /prod/node_modules ./node_modules

# Compiled API output
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Prisma schema + migrations
COPY --from=builder /app/libs/database/prisma ./libs/database/prisma

# Generate Prisma client inside the runner so the binary matches this image
RUN ./node_modules/.bin/prisma generate --schema=./libs/database/prisma/schema.prisma

# Startup script
COPY apps/api/entrypoint.sh ./apps/api/entrypoint.sh
RUN chmod +x ./apps/api/entrypoint.sh

WORKDIR /app/apps/api
EXPOSE 3000
ENTRYPOINT ["/app/apps/api/entrypoint.sh"]
