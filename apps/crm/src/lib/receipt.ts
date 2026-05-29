/** Mijozlar buyurtmani shu URL orqali QR kod bilan kuzatadi */
export function getOrderTrackUrl(orderNumber: string) {
  const base =
    process.env.NEXT_PUBLIC_CLIENT_WEB_URL?.replace(/\/$/, '') ??
    'http://localhost:3002';
  return `${base}/track?n=${encodeURIComponent(orderNumber)}`;
}
