# CleanWay Platform

CleanWay — ko‘p filialli ximchistka uchun to‘liq platforma: CRM dashboard, mijoz veb/PWA va Expo mobil ilova.

## Tuzilma

| Ilova | Port | Tavsif |
|-------|------|--------|
| `apps/api` | 3001 | NestJS REST API + WebSocket |
| `apps/merchant` | 3003 | Platforma merchant paneli (barcha firmalar) |
| `apps/crm` | 3000 | Firma ichki CRM dashboard |
| `apps/client-web` | 3002 | Mijoz veb + PWA |
| `apps/mobile` | Expo | iOS/Android mobil ilova |

## Talablar

- Node.js 20+
- PostgreSQL 16 (Docker yoki mahalliy)

## O‘rnatish

```bash
# 1. PostgreSQL (Docker)
docker compose up -d

# 2. Muhit o‘zgaruvchilari
cp .env.example .env

# 3. Bog‘liqliklar
npm install

# 4. Ma’lumotlar bazasi
npm run db:generate
npm run db:push
npm run db:seed

# 5. Ishga tushirish
npm run dev
```

## Demo hisoblar

| Rol | URL | Telefon | Parol / OTP |
|-----|-----|---------|-------------|
| Platform admin (merchant) | http://localhost:3003 | +998900000001 | admin123 |
| Super admin (firma CRM) | http://localhost:3000 | +998901111111 | admin123 |
| Operator | http://localhost:3000 | +998902222222 | admin123 |
| Kuryer | http://localhost:3000 | +998903333333 | admin123 |
| Mijoz | http://localhost:3002 | +998904444444 | OTP: 123456 (mock SMS) |

### Yangi firma yaratish (merchant panel)

1. http://localhost:3003 ga platform admin sifatida kiring
2. **Yangi firma** — nom, filial, admin telefon/parol
3. Avtomatik **14 kunlik demo** (o‘zgartirish mumkin)
4. Firma admini http://localhost:3000 CRM ga kiradi

**Platform API:** `GET/POST /api/v1/platform/organizations`, `POST .../extend-demo`, `POST .../activate`

## API

Asosiy prefix: `http://localhost:3001/api/v1`

- `POST /auth/staff/login` — xodimlar kirishi
- `POST /auth/otp/request` — mijoz OTP
- `POST /auth/otp/verify` — OTP tasdiqlash
- `GET /branches` — filiallar
- `GET /orders` — buyurtmalar (auth)
- `POST /orders` — mijoz buyurtmasi
- `GET /orders/track/:orderNumber` — ommaviy kuzatuv
- `GET /reports/dashboard` — CRM statistika
- `POST /payments/orders/:id/initiate` — Click/Payme/naqd

## Integratsiyalar

- **SMS:** `SMS_PROVIDER=mock` (dev) yoki `eskiz`
- **To‘lov:** Click va Payme URL generator (`.env` da merchant ID lar)
- **PWA:** `client-web/public/sw.js` — offline cache

## Mobil ilova

```bash
cd apps/mobile
npm run dev
# EXPO_PUBLIC_API_URL=http://YOUR_IP:3001/api/v1
```

## Production

- API + Postgres: VPS / Railway
- CRM va client-web: Vercel
- JWT va SMS kalitlarini `.env` da saqlang
