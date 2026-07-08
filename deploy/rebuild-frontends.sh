#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/ubuntu/ximchistka-platform}"
cd "$APP_DIR"

set -a
source "$APP_DIR/.env"
set +a

export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"
export MERCHANT_BASE_PATH=/platform
export ENFORCE_PRODUCTION_API_URL=1

echo "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"

npm run build -w @ximchistka/shared
npm run build -w @ximchistka/crm
npm run build -w @ximchistka/client-web
npm run build -w @ximchistka/merchant

pm2 restart cleanway-crm cleanway-client cleanway-merchant --update-env
pm2 save

echo "Frontend rebuild tugadi."
