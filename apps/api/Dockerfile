FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache openssl && \
    npm install -g @nestjs/cli@11 && \
    corepack enable && corepack prepare pnpm@11.5.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml pnpm.json ./
COPY apps/api/package.json ./apps/api/
COPY libs/database/package.json ./libs/database/
COPY apps/api/ ./apps/api/
COPY libs/database/ ./libs/database/

RUN pnpm install --frozen-lockfile && \
    pnpm --filter @findash/database db:generate && \
    cd /app/apps/api && nest build && \
    chmod +x /app/apps/api/entrypoint.sh

ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 3000
ENTRYPOINT ["/app/apps/api/entrypoint.sh"]
