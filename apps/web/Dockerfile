# ── Stage 1: Build Angular ────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.5.0 --activate

# Copy all workspace manifests (pnpm needs them for workspace resolution)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY libs/database/package.json ./libs/database/

# Install only web dependencies
RUN pnpm install --frozen-lockfile --filter @findash/web...

# Copy Angular source
COPY apps/web/ ./apps/web/

# Build for production (uses environment.prod.ts via angular.json fileReplacements)
RUN pnpm --filter @findash/web build


# ── Stage 2: Serve with nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine
COPY --from=builder /app/apps/web/dist/web/browser /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
