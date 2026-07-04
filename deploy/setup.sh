#!/usr/bin/env bash
set -euo pipefail

DOMAIN="cleanway.4mi.uz"
API_DOMAIN="api.cleanway.4mi.uz"
CRM_DOMAIN="crm.cleanway.4mi.uz"
ADMIN_DOMAIN="admin.cleanway.4mi.uz"
APP_DIR="/home/ubuntu/ximchistka-platform"
REPO="https://github.com/codewithakbar/ximchistka-platform.git"

echo "==> Swap (build uchun)"
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo "==> PostgreSQL"
DB_PASS=$(openssl rand -hex 16)
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='ximchistka'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER ximchistka WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='ximchistka'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ximchistka OWNER ximchistka;"
sudo -u postgres psql -c "ALTER USER ximchistka WITH PASSWORD '${DB_PASS}';"

echo "==> Clone repository"
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR" && git pull --ff-only
else
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH=$(openssl rand -hex 32)

echo "==> Production .env"
cat > "$APP_DIR/.env" <<EOF
DATABASE_URL="postgresql://ximchistka:${DB_PASS}@localhost:5432/ximchistka?schema=public"
JWT_SECRET="${JWT_SECRET}"
JWT_REFRESH_SECRET="${JWT_REFRESH}"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
SMS_PROVIDER="mock"
API_PORT=3001
CORS_ORIGINS="https://${DOMAIN},https://${CRM_DOMAIN},https://${ADMIN_DOMAIN}"
NEXT_PUBLIC_CLIENT_WEB_URL="https://${DOMAIN}"
CRM_URL="https://${CRM_DOMAIN}"
NEXT_PUBLIC_API_URL="https://${API_DOMAIN}/api/v1"
NEXT_PUBLIC_WS_URL="https://${API_DOMAIN}"
NEXT_PUBLIC_CRM_URL="https://${CRM_DOMAIN}"
NEXT_PUBLIC_ORG_SLUG="ximchistka-demo"
CLICK_MERCHANT_ID=""
CLICK_SERVICE_ID=""
CLICK_SECRET_KEY=""
PAYME_MERCHANT_ID=""
PAYME_SECRET_KEY=""
NODE_ENV=production
EOF

echo "==> npm install"
cd "$APP_DIR"
export NODE_OPTIONS="--max-old-space-size=1536"
npm ci 2>/dev/null || npm install

echo "==> Build shared package"
npm run build -w @ximchistka/shared

echo "==> Database schema + seed"
npm run db:push
npm run db:seed

echo "==> Build all apps"
set -a && source "$APP_DIR/.env" && set +a
npm run build

echo "==> PM2"
pm2 delete all 2>/dev/null || true
pm2 start "$APP_DIR/deploy/ecosystem.config.cjs"
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | bash || true

echo "==> Nginx"
sudo cp "$APP_DIR/deploy/nginx-cleanway.conf" /etc/nginx/sites-available/cleanway
sudo ln -sf /etc/nginx/sites-available/cleanway /etc/nginx/sites-enabled/cleanway
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

echo "==> Firewall"
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "==> SSL (certbot)"
if sudo certbot --nginx \
  -d "$DOMAIN" -d "$API_DOMAIN" -d "$CRM_DOMAIN" -d "$ADMIN_DOMAIN" \
  --non-interactive --agree-tos --register-unsafely-without-email --redirect; then
  echo "SSL installed successfully"
else
  echo "WARN: SSL failed — DNS A yozuvlari 3.239.69.205 ga yo'naltirilganligini tekshiring"
fi

echo ""
echo "============================================"
echo "  CleanWay deploy tugadi!"
echo "  Mijoz:    https://${DOMAIN}"
echo "  CRM:      https://${CRM_DOMAIN}"
echo "  Admin:    https://${ADMIN_DOMAIN}"
echo "  API:      https://${API_DOMAIN}/api/v1"
echo "============================================"
pm2 status
