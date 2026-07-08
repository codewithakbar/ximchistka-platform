#!/usr/bin/env bash
set -euo pipefail
cd ~/ximchistka-platform
set -a && source .env && set +a
npm run build -w @ximchistka/api
psql "$DATABASE_URL" -f scripts/clear-service-catalog.sql
echo "Categories:" $(psql "$DATABASE_URL" -t -c 'SELECT count(*) FROM "ServiceCategory";')
echo "Services:" $(psql "$DATABASE_URL" -t -c 'SELECT count(*) FROM "Service";')
pm2 restart cleanway-api --update-env
