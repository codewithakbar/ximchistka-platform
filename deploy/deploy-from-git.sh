#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/ximchistka-platform}"
BRANCH="${DEPLOY_BRANCH:-cursor/crm-demo-expiry-banner}"

cd "$APP_DIR"

echo "==> Git pull ($BRANCH)"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

set -a
source "$APP_DIR/.env"
set +a

export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"
export MERCHANT_BASE_PATH=/platform
export ENFORCE_PRODUCTION_API_URL=1

echo "==> Dependencies"
npm ci --include=dev 2>/dev/null || npm install --include=dev

echo "==> Database schema"
npm run db:generate
cd packages/database && npx prisma db push && cd "$APP_DIR"

echo "==> Build"
npm run build -w @ximchistka/shared
npm run build -w @ximchistka/api
npm run build -w @ximchistka/crm
npm run build -w @ximchistka/merchant
npm run build -w @ximchistka/client-web

echo "==> Restart PM2"
pm2 restart cleanway-api cleanway-crm cleanway-merchant cleanway-client --update-env
pm2 save

echo "==> Deploy tugadi"
pm2 status
