'use client';

import { QRCodeSVG } from 'qrcode.react';
import { ORDER_STATUS_LABELS, OrderStatus } from '@ximchistka/shared';
import { formatPrice } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { getOrderTrackUrl } from '@/lib/receipt';

export type ReceiptOrder = {
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  discountAmount: number;
  notes: string | null;
  createdAt: string;
  estimatedReady: string | null;
  branch: { name: string; address: string; phone: string };
  customer: { user: { fullName: string; phone: string } };
  items: { quantity: number; unitPrice: number; service: { name: string; unit?: string } }[];
  pickupDelivery?: { type: string; address: string | null } | null;
};

export function OrderReceipt({
  order,
  organizationName,
}: {
  order: ReceiptOrder;
  organizationName?: string;
}) {
  const trackUrl = getOrderTrackUrl(order.orderNumber);
  const deliveryLabel =
    order.pickupDelivery?.type === 'pickup'
      ? 'Olib ketish'
      : order.pickupDelivery?.type === 'delivery'
        ? 'Yetkazib berish'
        : 'Filialda';

  return (
    <article className="receipt-root mx-auto bg-white text-black font-mono text-[11px] leading-snug w-[80mm] max-w-full px-3 py-4">
      <header className="text-center border-b border-dashed border-black pb-2 mb-2">
        <div className="text-sm font-bold uppercase tracking-wide">
          {organizationName ?? 'CleanWay'}
        </div>
        <div className="font-semibold mt-1">{order.branch.name}</div>
        <div className="text-[10px] mt-0.5">{order.branch.address}</div>
        {order.branch.phone && (
          <div className="text-[10px]">Tel: {order.branch.phone}</div>
        )}
      </header>

      <section className="text-center border-b border-dashed border-black pb-2 mb-2">
        <div className="text-[10px] uppercase tracking-widest">Buyurtma cheki</div>
        <div className="text-lg font-bold mt-1">{order.orderNumber}</div>
        <div className="text-[10px] mt-1">{formatDate(order.createdAt, true)}</div>
        <div className="text-[10px] mt-0.5">
          Holat: {ORDER_STATUS_LABELS[order.status]}
        </div>
      </section>

      <section className="border-b border-dashed border-black pb-2 mb-2">
        <Row label="Mijoz" value={order.customer.user.fullName} />
        <Row label="Telefon" value={order.customer.user.phone} />
        <Row label="Xizmat" value={deliveryLabel} />
        {order.pickupDelivery?.address && (
          <Row label="Manzil" value={order.pickupDelivery.address} />
        )}
        {order.estimatedReady && (
          <Row label="Tayyor" value={formatDate(order.estimatedReady, true)} />
        )}
      </section>

      <section className="border-b border-dashed border-black pb-2 mb-2">
        <div className="flex justify-between font-bold mb-1 text-[10px]">
          <span>Xizmat</span>
          <span>Summa</span>
        </div>
        {order.items.map((item, i) => (
          <div key={i} className="mb-1.5">
            <div className="flex justify-between gap-2">
              <span className="flex-1 break-words">{item.service.name}</span>
              <span className="shrink-0 font-semibold">
                {formatPrice(item.quantity * item.unitPrice)}
              </span>
            </div>
            <div className="text-[10px] text-gray-600">
              {item.quantity} × {formatPrice(item.unitPrice)}
              {item.service.unit ? ` (${item.service.unit})` : ''}
            </div>
          </div>
        ))}
      </section>

      <section className="border-b border-dashed border-black pb-2 mb-3">
        {order.discountAmount > 0 && (
          <div className="flex justify-between text-[10px] mb-0.5">
            <span>Chegirma</span>
            <span>-{formatPrice(order.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold">
          <span>JAMI</span>
          <span>{formatPrice(order.totalAmount)}</span>
        </div>
      </section>

      {order.notes && (
        <section className="border-b border-dashed border-black pb-2 mb-3 text-[10px]">
          <span className="font-bold">Eslatma: </span>
          {order.notes}
        </section>
      )}

      <section className="flex flex-col items-center text-center">
        <QRCodeSVG value={trackUrl} size={120} level="M" includeMargin />
        <p className="text-[9px] mt-2 max-w-[70mm]">
          Buyurtma holatini kuzatish uchun QR kodni skanerlang
        </p>
        <p className="text-[8px] mt-1 break-all text-gray-600 max-w-full">{trackUrl}</p>
      </section>

      <footer className="text-center mt-4 pt-2 border-t border-dashed border-black text-[10px]">
        <p className="font-semibold">Xaridingiz uchun rahmat!</p>
        <p className="mt-1 text-gray-600">Saqlang — chek bo&apos;yicha buyurtma beriladi</p>
      </footer>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1 mb-0.5">
      <span className="shrink-0 text-gray-600">{label}:</span>
      <span className="flex-1 break-words">{value}</span>
    </div>
  );
}
