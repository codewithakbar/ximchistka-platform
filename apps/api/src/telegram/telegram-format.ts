import { OrderStatus } from '@prisma/client';

/** Telegram HTML parse_mode uchun xavfsiz matn */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const STATUS_EMOJI: Record<OrderStatus, string> = {
  draft: '📝',
  submitted: '🆕',
  received_at_branch: '📥',
  in_processing: '🧼',
  ready: '✅',
  out_for_delivery: '🚚',
  completed: '🏁',
  cancelled: '❌',
};

export const STATUS_LABEL_UZ: Record<OrderStatus, string> = {
  draft: 'Qoralama',
  submitted: 'Qabul qilindi',
  received_at_branch: 'Filialda qabul qilindi',
  in_processing: 'Tozalanmoqda',
  ready: 'Tayyor',
  out_for_delivery: 'Yetkazilmoqda',
  completed: 'Topshirildi',
  cancelled: 'Bekor qilindi',
};

export function statusLine(status: OrderStatus): string {
  return `${STATUS_EMOJI[status] ?? '•'} ${STATUS_LABEL_UZ[status] ?? status}`;
}

export function fmtPrice(amount: number): string {
  return `${new Intl.NumberFormat('uz-UZ').format(amount)} so'm`;
}

export function fmtDate(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(value.getDate())}.${pad(value.getMonth() + 1)}.${value.getFullYear()} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

/** Chek raqamiga o'xshash matnmi? (masalan CH1-0100) */
export function looksLikeOrderNumber(text: string): boolean {
  return /^[A-Za-z0-9]{1,8}-\d{1,8}$/.test(text.trim());
}

export type TgOrderSummary = {
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  paidAmount: number;
  createdAt: Date;
  branchName: string;
};

/** Mijoz ro'yxatidagi bitta buyurtma satri */
export function customerOrderLine(o: TgOrderSummary): string {
  const paid =
    o.status === 'cancelled'
      ? ''
      : o.paidAmount >= o.totalAmount && o.totalAmount > 0
        ? ' · 💰 to\'langan'
        : o.paidAmount > 0
          ? ` · 💰 qisman (${fmtPrice(o.paidAmount)})`
          : ' · 💰 to\'lanmagan';
  return (
    `<b>${escapeHtml(o.orderNumber)}</b> — ${statusLine(o.status)}\n` +
    `${escapeHtml(o.branchName)} · ${fmtPrice(o.totalAmount)}${paid}`
  );
}

export type TgOrderDetail = TgOrderSummary & {
  estimatedReady: Date | null;
  customerName?: string;
  customerPhone?: string;
  items: { name: string; quantity: number; unitPrice: number; notes?: string | null }[];
  history: { status: OrderStatus; createdAt: Date }[];
};

/** Buyurtma tafsiloti (mijoz va xodim uchun umumiy qism) */
export function orderDetailHtml(o: TgOrderDetail, opts: { forStaff: boolean }): string {
  const lines: string[] = [
    `📦 <b>Buyurtma ${escapeHtml(o.orderNumber)}</b>`,
    statusLine(o.status),
    '',
  ];

  if (opts.forStaff && o.customerName) {
    lines.push(`👤 ${escapeHtml(o.customerName)}${o.customerPhone ? ` · ${escapeHtml(o.customerPhone)}` : ''}`);
  }
  lines.push(`🏬 ${escapeHtml(o.branchName)}`);
  lines.push(`🕐 ${fmtDate(o.createdAt)}`);
  if (o.estimatedReady && o.status !== 'completed' && o.status !== 'cancelled') {
    lines.push(`⏳ Tayyor bo'lishi: ${fmtDate(o.estimatedReady)}`);
  }

  if (o.items.length) {
    lines.push('');
    for (const item of o.items) {
      lines.push(
        `• ${escapeHtml(item.name)} — ${item.quantity} × ${fmtPrice(item.unitPrice)}` +
          (item.notes ? `\n  <i>${escapeHtml(item.notes)}</i>` : ''),
      );
    }
  }

  lines.push('');
  lines.push(`💵 <b>Jami: ${fmtPrice(o.totalAmount)}</b>`);
  if (o.status !== 'cancelled' && o.totalAmount > 0) {
    const outstanding = Math.max(0, o.totalAmount - o.paidAmount);
    lines.push(
      outstanding === 0
        ? '✅ To\'langan'
        : `⚠️ To'lanmagan qoldiq: <b>${fmtPrice(outstanding)}</b>`,
    );
  }

  if (o.history.length) {
    lines.push('');
    lines.push('<b>Holatlar tarixi:</b>');
    for (const h of o.history) {
      lines.push(`${STATUS_EMOJI[h.status] ?? '•'} ${STATUS_LABEL_UZ[h.status] ?? h.status} — ${fmtDate(h.createdAt)}`);
    }
  }

  return lines.join('\n');
}

/** Mijozga status o'zgarishi haqidagi xabar */
export function customerStatusNotification(o: {
  orderNumber: string;
  status: OrderStatus;
  branchName: string;
}): string {
  const extra =
    o.status === 'ready'
      ? "\n\nBuyurtmangizni olib ketishingiz mumkin! 🎉"
      : o.status === 'completed'
        ? "\n\nXaridingiz uchun rahmat! 🙏"
        : '';
  return (
    `📦 Buyurtma <b>${escapeHtml(o.orderNumber)}</b>\n` +
    `Yangi holat: <b>${statusLine(o.status)}</b>\n` +
    `🏬 ${escapeHtml(o.branchName)}${extra}`
  );
}
