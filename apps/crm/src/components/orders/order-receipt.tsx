'use client';

import { QRCodeSVG } from 'qrcode.react';
import {
  DEFAULT_RECEIPT_SETTINGS,
  OrderStatus,
  RECEIPT_FONT_BASE_PX,
  type ReceiptSettings,
} from '@ximchistka/shared';
import { formatPrice } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useI18n, useOrderStatusLabel } from '@/lib/i18n';
import { getOrderTrackUrl } from '@/lib/receipt';

export type ReceiptPayment = {
  provider: string;
  status: string;
  amount: number;
};

export type ReceiptOrder = {
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  discountAmount: number;
  promoCode?: string | null;
  notes: string | null;
  createdAt: string;
  estimatedReady: string | null;
  branch: { name: string; address: string; phone: string };
  customer: { user: { fullName: string; phone: string } };
  items: {
    quantity: number;
    unitPrice: number;
    color?: string | null;
    notes?: string | null;
    service: { name: string; unit?: string };
  }[];
  pickupDelivery?: { type: string; address: string | null } | null;
  payments?: ReceiptPayment[];
};

/** Chek uchun aniq raqamli sana: 21.08.2026 15:11 (lokal "M08" muammosisiz) */
function receiptDate(value: string) {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Ekran ko'rinishi uchun qog'oz eni (print o'lchami globals.css + sahifadagi style'da) */
const SCREEN_WIDTH_CLASS: Record<number, string> = {
  58: 'w-[58mm]',
  80: 'w-[80mm]',
};

export function OrderReceipt({
  order,
  organizationName,
  settings,
}: {
  order: ReceiptOrder;
  organizationName?: string;
  settings?: ReceiptSettings;
}) {
  const { t } = useI18n();
  const statusLabel = useOrderStatusLabel();
  const cfg = settings ?? DEFAULT_RECEIPT_SETTINGS;
  const basePx = RECEIPT_FONT_BASE_PX[cfg.fontScale] ?? RECEIPT_FONT_BASE_PX.normal;

  const trackUrl = getOrderTrackUrl(order.orderNumber);
  const deliveryLabel =
    order.pickupDelivery?.type === 'pickup'
      ? t('receipt.pickup', 'Olib ketish')
      : order.pickupDelivery?.type === 'delivery'
        ? t('receipt.delivery', 'Yetkazib berish')
        : t('receipt.inStore', 'Filialda');

  const paidPayments = (order.payments ?? []).filter((p) => p.status === 'paid');
  const paidAmount = paidPayments.reduce((sum, p) => sum + p.amount, 0);
  const outstanding = Math.max(0, order.totalAmount - paidAmount);
  const cancelled = order.status === 'cancelled';
  const fullyPaid = order.totalAmount > 0 && outstanding === 0;
  const subtotal = order.totalAmount + order.discountAmount;

  const narrow = cfg.paperWidth === 58;

  return (
    <article
      className={cn(
        'receipt-root mx-auto bg-white text-black font-mono leading-snug max-w-full',
        SCREEN_WIDTH_CLASS[cfg.paperWidth] ?? 'w-[80mm]',
        narrow ? 'px-2 py-3' : 'px-3 py-4',
      )}
      style={{ fontSize: `${basePx}px` }}
      data-paper={cfg.paperWidth}
    >
      {/* Sarlavha */}
      <header className="text-center border-b border-dashed border-black pb-2 mb-2">
        <div className="text-[1.35em] font-bold uppercase tracking-wide leading-tight">
          {organizationName ?? 'CleanWay'}
        </div>
        {cfg.headerText && (
          <div className="text-[0.9em] mt-1 whitespace-pre-line">{cfg.headerText}</div>
        )}
        <div className="font-semibold mt-1 text-[1em]">{order.branch.name}</div>
        <div className="text-[0.85em] mt-0.5">{order.branch.address}</div>
        {order.branch.phone && (
          <div className="text-[0.85em]">
            {t('receipt.tel', 'Tel')}: {order.branch.phone}
          </div>
        )}
      </header>

      {/* Chek raqami */}
      <section className="text-center border-b border-dashed border-black pb-2 mb-2">
        <div className="text-[0.8em] uppercase tracking-widest">
          {t('receipt.orderReceipt', 'Buyurtma cheki')}
        </div>
        <div className="text-[1.7em] font-bold mt-0.5 leading-tight">
          {order.orderNumber}
        </div>
        <div className="text-[0.85em] mt-1">{receiptDate(order.createdAt)}</div>
        <div className="text-[0.85em] mt-0.5">
          {t('receipt.status', 'Holat')}: {statusLabel(order.status)}
        </div>
      </section>

      {/* Mijoz */}
      <section className="border-b border-dashed border-black pb-2 mb-2">
        <Row label={t('receipt.customer', 'Mijoz')} value={order.customer.user.fullName} />
        <Row label={t('receipt.phone', 'Telefon')} value={order.customer.user.phone} />
        <Row label={t('receipt.service', 'Xizmat')} value={deliveryLabel} />
        {order.pickupDelivery?.address && (
          <Row label={t('receipt.address', 'Manzil')} value={order.pickupDelivery.address} />
        )}
        {order.estimatedReady && (
          <Row
            label={t('receipt.ready', 'Tayyor')}
            value={receiptDate(order.estimatedReady)}
          />
        )}
      </section>

      {/* Xizmatlar */}
      <section className="border-b border-dashed border-black pb-2 mb-2">
        <div className="flex justify-between font-bold mb-1 text-[0.85em] uppercase">
          <span>{t('receipt.item', 'Xizmat')}</span>
          <span>{t('receipt.amount', 'Summa')}</span>
        </div>
        {order.items.map((item, i) => (
          <div key={i} className="mb-1.5">
            <div className="flex justify-between gap-2">
              <span className="flex-1 break-words">{item.service.name}</span>
              <span className="shrink-0 font-semibold">
                {formatPrice(item.quantity * item.unitPrice)}
              </span>
            </div>
            <div className="text-[0.85em] text-gray-700">
              {item.quantity} × {formatPrice(item.unitPrice)}
              {item.service.unit ? ` (${item.service.unit})` : ''}
            </div>
            {item.color && (
              <div className="text-[0.85em] text-gray-700">
                {t('orders.pos.color', 'Rang')}: {item.color}
              </div>
            )}
            {item.notes && (
              <div className="text-[0.85em] text-gray-700 break-words">
                {t('common.note', 'Eslatma')}: {item.notes}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Jami */}
      <section className="border-b border-dashed border-black pb-2 mb-2">
        {order.discountAmount > 0 && (
          <>
            <div className="flex justify-between text-[0.9em] mb-0.5">
              <span>{t('receipt.subtotal', 'Oraliq jami')}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[0.9em] mb-0.5">
              <span>
                {t('receipt.discount', 'Chegirma')}
                {order.promoCode ? ` (${order.promoCode})` : ''}
              </span>
              <span>-{formatPrice(order.discountAmount)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between items-baseline font-bold">
          <span className="text-[1.1em]">{t('receipt.total', 'JAMI')}</span>
          <span className="text-[1.3em]">{formatPrice(order.totalAmount)}</span>
        </div>
      </section>

      {/* To'lov holati */}
      {!cancelled && order.totalAmount > 0 && (
        <section className="border-b border-dashed border-black pb-2 mb-2">
          {paidPayments.length > 0 && (
            <>
              <div className="font-bold text-[0.85em] uppercase mb-0.5">
                {t('receipt.payments', "To'lovlar")}
              </div>
              {paidPayments.map((p, i) => (
                <div key={i} className="flex justify-between text-[0.9em]">
                  <span>{t(`payments.provider.${p.provider}`, p.provider)}</span>
                  <span>{formatPrice(p.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between text-[0.9em] font-semibold mt-0.5">
                <span>{t('receipt.paid', "To'langan")}</span>
                <span>{formatPrice(paidAmount)}</span>
              </div>
            </>
          )}

          {fullyPaid ? (
            <div className="mt-1 text-center font-bold text-[1em] border border-black py-1">
              ✓ {t('receipt.fullyPaid', "TO'LANGAN")}
            </div>
          ) : (
            <div className="mt-1 border-2 border-black py-1.5 px-1 text-center">
              <div className="font-bold text-[1.15em] uppercase tracking-wider">
                {t('receipt.unpaid', "TO'LANMAGAN")}
              </div>
              <div className="text-[0.95em] font-semibold mt-0.5">
                {t('receipt.outstanding', 'Qoldiq')}: {formatPrice(outstanding)}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Eslatma */}
      {cfg.showNotes && order.notes && (
        <section className="border-b border-dashed border-black pb-2 mb-2 text-[0.9em]">
          <span className="font-bold">{t('common.note', 'Eslatma')}: </span>
          {order.notes}
        </section>
      )}

      {/* QR */}
      {cfg.showQr && (
        <section className="flex flex-col items-center text-center mt-2">
          <QRCodeSVG value={trackUrl} size={narrow ? 88 : 116} level="M" includeMargin />
          <p className="text-[0.8em] mt-1 max-w-full">
            {t('receipt.qrHint', 'Buyurtma holatini kuzatish uchun QR kodni skanerlang')}
          </p>
        </section>
      )}

      {/* Yakun */}
      <footer className="text-center mt-3 pt-2 border-t border-dashed border-black">
        {cfg.footerText && (
          <p className="text-[0.9em] whitespace-pre-line mb-1">{cfg.footerText}</p>
        )}
        <p className="font-semibold text-[0.95em]">
          {t('receipt.thanks', 'Xaridingiz uchun rahmat!')}
        </p>
        <p className="mt-0.5 text-[0.8em] text-gray-700">
          {t('receipt.keepHint', "Saqlang — chek bo'yicha buyurtma beriladi")}
        </p>
      </footer>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1 mb-0.5 text-[0.95em]">
      <span className="shrink-0 text-gray-700">{label}:</span>
      <span className="flex-1 break-words">{value}</span>
    </div>
  );
}
