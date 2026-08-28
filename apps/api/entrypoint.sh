#!/bin/sh
set -e

echo "Running database migrations..."
/app/node_modules/.bin/prisma migrate deploy --schema=/app/libs/database/prisma/schema.prisma

echo "Starting API server..."
exec node dist/main
