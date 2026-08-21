'use client';

import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PackageCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/input';
import {
  PaymentPartsEditor,
  type PaymentPartInput,
  type PaymentSummary,
} from '@/components/orders/order-payment-panel';
import { api, formatPrice } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

/**
 * Buyurtmani topshirish. Qoldiq bo'lsa avval to'lov qabul qilinadi, so'ng
 * buyurtma yakunlanadi — hammasi bitta "handover" so'rovida.
 */
export function HandoverDialog({
  open,
  orderId,
  outstanding,
  onClose,
  onDone,
}: {
  open: boolean;
  orderId: string;
  outstanding: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [parts, setParts] = useState<PaymentPartInput[]>([]);
  const [saving, setSaving] = useState(false);

  const needsPayment = outstanding > 0;

  useEffect(() => {
    if (!open) return;
    setParts(needsPayment ? [{ provider: 'cash', amount: String(outstanding) }] : []);
  }, [open, outstanding, needsPayment]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    let payload: { parts?: { provider: string; amount: number }[] } = {};
    if (needsPayment) {
      const cleaned = parts
        .map((p) => ({ provider: p.provider, amount: Math.floor(Number(p.amount)) }))
        .filter((p) => Number.isFinite(p.amount) && p.amount > 0);
      if (!cleaned.length) {
        toast.error(t('payments.invalidAmount'));
        return;
      }
      if (cleaned.reduce((s, p) => s + p.amount, 0) > outstanding) {
        toast.error(t('payments.maxHint', { amount: formatPrice(outstanding) }));
        return;
      }
      payload = { parts: cleaned };
    }

    setSaving(true);
    try {
      await api(`/payments/orders/${orderId}/handover`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success(t('handover.toastDone'));
      onDone();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={saving ? undefined : onClose} />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl space-y-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <PackageCheck className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold">{t('handover.title')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {needsPayment ? (
          <>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">
              {t('handover.outstanding')}:{' '}
              <b className="text-amber-700">{formatPrice(outstanding)}</b>
            </div>
            <div>
              <Label>{t('payments.method')}</Label>
              <PaymentPartsEditor parts={parts} onChange={setParts} outstanding={outstanding} />
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t('handover.paidHint')}</p>
        )}

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" loading={saving}>
            <PackageCheck className="h-4 w-4" />
            {needsPayment ? t('handover.payAndHand') : t('handover.confirm')}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </div>
  );
}

export type { PaymentSummary };
