# ── Stage 1: Build Angular ────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g @angular/cli@22 && \
    corepack enable && corepack prepare pnpm@11.5.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpm.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY libs/database/package.json ./libs/database/
COPY apps/web/ ./apps/web/

# shamefully-hoist pone todos los paquetes en /app/node_modules (sin symlinks de virtual store)
# para que Angular CLI pueda resolver @angular/build con resolución estándar de Node.js
RUN echo "shamefully-hoist=true" > .npmrc && \
    pnpm install --frozen-lockfile && \
    cd /app/apps/web && ng build


# ── Stage 2: Serve with nginx ─────────────────────────────────────────────────
FROM nginx:1.27-alpine
COPY --from=builder /app/apps/web/dist/web/browser /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
