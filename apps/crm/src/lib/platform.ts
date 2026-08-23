/**
 * Merchant (platforma) paneli manzili.
 *
 * Platforma admin CRM da ishlamaydi — uning tashkiloti yo'q va CRM ning
 * hamma sahifasi tashkilotga bog'langan. Shuning uchun uni shu panelga
 * yo'naltiramiz. Tekshiruv faqat CRM tomonida: API bir xil login
 * endpointidan merchant panelga ham xizmat qiladi, shuning uchun u yerda
 * platforma adminni rad etib bo'lmaydi.
 */
export const PLATFORM_URL = (
  process.env.NEXT_PUBLIC_MERCHANT_URL ?? 'https://cleanway.4mi.uz/platform'
).replace(/\/$/, '');

/** Panelning boshlang'ich sahifasi */
export const PLATFORM_DASHBOARD_URL = `${PLATFORM_URL}/dashboard`;
