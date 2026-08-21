'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Undo2, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Label, Select } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatPrice } from '@/lib/api';
import { useDemoExpired } from '@/components/layout/demo-expired-lock';
import { useHasRole } from '@/hooks/use-client-auth';
import { useFormatDate, useI18n } from '@/lib/i18n';

export const PAYMENT_PROVIDERS = ['cash', 'click', 'transfer', 'payme', 'uzum'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export type PaymentPartInput = { provider: PaymentProvider; amount: string };

type PaymentRow = {
  id: string;
  provider: PaymentProvider;
  status: 'pending' | 'paid' | 'failed' | 'refunded';
  amount: number;
  createdAt: string;
};

export type PaymentSummary = {
  orderId: string;
  totalAmount: number;
  paidAmount: number;
  outstanding: number;
  fullyPaid: boolean;
  payments: PaymentRow[];
};

const statusVariant = {
  paid: 'success',
  pending: 'warning',
  failed: 'destructive',
  refunded: 'secondary',
} as const;

/** Aralash to'lov qismlari editori — POS va buyurtma sahifasida ishlatiladi */
export function PaymentPartsEditor({
  parts,
  onChange,
  outstanding,
}: {
  parts: PaymentPartInput[];
  onChange: (parts: PaymentPartInput[]) => void;
  outstanding?: number;
}) {
  const { t } = useI18n();

  const partsTotal = parts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  function setPart(index: number, patch: Partial<PaymentPartInput>) {
    onChange(parts.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function addPart() {
    if (parts.length >= 5) return;
    // Yangi qism qoldiqni to'ldirishga taklif qilinadi
    const remaining =
      outstanding !== undefined ? Math.max(0, outstanding - partsTotal) : 0;
    const used = new Set(parts.map((p) => p.provider));
    const nextProvider =
      PAYMENT_PROVIDERS.find((p) => !used.has(p)) ?? PAYMENT_PROVIDERS[0];
    onChange([
      ...parts,
      { provider: nextProvider, amount: remaining > 0 ? String(remaining) : '' },
    ]);
  }

  function removePart(index: number) {
    onChange(parts.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      {parts.map((part, i) => (
        <div key={i} className="flex items-center gap-2">
          <Select
            value={part.provider}
            onChange={(e) => setPart(i, { provider: e.target.value as PaymentProvider })}
            className="h-9 w-32 shrink-0"
          >
            {PAYMENT_PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {t(`payments.provider.${p}`)}
              </option>
            ))}
          </Select>
          <Input
            type="number"
            min={1}
            step={1}
            value={part.amount}
            onChange={(e) => setPart(i, { amount: e.target.value })}
            placeholder={t('payments.amount')}
            className="h-9 flex-1 min-w-0"
          />
          {parts.length > 1 && (
            <button
              type="button"
              onClick={() => removePart(i)}
              className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-destructive"
              aria-label={t('common.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}

      <div className="flex items-center justify-between gap-2">
        {parts.length < 5 ? (
          <button
            type="button"
            onClick={addPart}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('payments.addPart')}
          </button>
        ) : (
          <span />
        )}
        {parts.length > 1 && (
          <span className="text-xs text-muted-foreground">
            {t('payments.partsTotal')}: <b>{formatPrice(partsTotal)}</b>
          </span>
        )}
      </div>
    </div>
  );
}

export function OrderPaymentPanel({
  orderId,
  cancelled = false,
  reloadSignal = 0,
  onChange,
}: {
  orderId: string;
  cancelled?: boolean;
  /** Tashqi hodisadan keyin (masalan topshirish) qayta yuklash uchun */
  reloadSignal?: number;
  onChange?: (summary: PaymentSummary) => void;
}) {
  const { t } = useI18n();
  const formatDate = useFormatDate();
  const demoExpired = useDemoExpired();
  const canRefund = useHasRole('super_admin', 'branch_manager');

  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [parts, setParts] = useState<PaymentPartInput[]>([]);
  const [saving, setSaving] = useState(false);
  const [refunding, setRefunding] = useState<PaymentRow | null>(null);
  const [refundBusy, setRefundBusy] = useState(false);

  const apply = useCallback(
    (next: PaymentSummary) => {
      setSummary(next);
      onChange?.(next);
    },
    [onChange],
  );

  const load = useCallback(async () => {
    try {
      apply(await api<PaymentSummary>(`/payments/orders/${orderId}`));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    }
  }, [orderId, apply, t]);

  useEffect(() => {
    load();
    // reloadSignal o'zgarganda ham qayta yuklaymiz
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, reloadSignal]);

  function openForm() {
    if (!summary) return;
    setParts([{ provider: 'cash', amount: String(summary.outstanding) }]);
    setFormOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!summary) return;

    const cleaned = parts
      .map((p) => ({ provider: p.provider, amount: Math.floor(Number(p.amount)) }))
      .filter((p) => Number.isFinite(p.amount) && p.amount > 0);
    if (!cleaned.length) {
      toast.error(t('payments.invalidAmount'));
      return;
    }
    const total = cleaned.reduce((sum, p) => sum + p.amount, 0);
    if (total > summary.outstanding) {
      toast.error(t('payments.maxHint', { amount: formatPrice(summary.outstanding) }));
      return;
    }

    setSaving(true);
    try {
      const res = await api<{ summary: PaymentSummary }>(
        `/payments/orders/${orderId}/record`,
        { method: 'POST', body: JSON.stringify({ parts: cleaned }) },
      );
      apply(res.summary);
      setFormOpen(false);
      toast.success(t('payments.toastRecorded', { amount: formatPrice(total) }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmRefund() {
    if (!refunding) return;
    setRefundBusy(true);
    try {
      apply(await api<PaymentSummary>(`/payments/${refunding.id}/refund`, { method: 'POST' }));
      toast.success(t('payments.toastRefunded'));
      setRefunding(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setRefundBusy(false);
    }
  }

  const canRecord =
    !demoExpired && !cancelled && !!summary && summary.outstanding > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          {t('payments.title')}
        </CardTitle>
        {summary?.fullyPaid && <Badge variant="success">{t('payments.fullyPaid')}</Badge>}
      </CardHeader>

      <CardContent className="space-y-4">
        {!summary ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : (
          <>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('payments.total')}</dt>
                <dd className="font-medium">{formatPrice(summary.totalAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('payments.paid')}</dt>
                <dd className="font-medium text-emerald-600">
                  {formatPrice(summary.paidAmount)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5">
                <dt className="font-semibold">{t('payments.outstanding')}</dt>
                <dd
                  className={
                    summary.outstanding > 0
                      ? 'font-bold text-amber-600'
                      : 'font-bold text-emerald-600'
                  }
                >
                  {formatPrice(summary.outstanding)}
                </dd>
              </div>
            </dl>

            {summary.payments.length > 0 && (
              <ul className="space-y-1.5 border-t border-border pt-3">
                {summary.payments.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatPrice(p.amount)}</span>
                        <Badge variant={statusVariant[p.status]} className="px-1.5 py-0 text-[10px]">
                          {t(`payments.status.${p.status}`)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t(`payments.provider.${p.provider}`)} · {formatDate(p.createdAt, true)}
                      </div>
                    </div>
                    {canRefund && p.status === 'paid' && !demoExpired && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title={t('payments.refund')}
                        onClick={() => setRefunding(p)}
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {formOpen ? (
              <form onSubmit={onSubmit} className="space-y-3 border-t border-border pt-3">
                <Label>{t('payments.method')}</Label>
                <PaymentPartsEditor
                  parts={parts}
                  onChange={setParts}
                  outstanding={summary.outstanding}
                />
                <p className="text-xs text-muted-foreground">
                  {t('payments.maxHint', { amount: formatPrice(summary.outstanding) })}
                </p>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1" loading={saving}>
                    {t('payments.record')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setFormOpen(false)}
                    disabled={saving}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              </form>
            ) : (
              canRecord && (
                <Button className="w-full" onClick={openForm}>
                  <Wallet className="h-4 w-4" />
                  {t('payments.record')}
                </Button>
              )
            )}

            {cancelled && summary.outstanding > 0 && (
              <p className="text-xs text-muted-foreground">{t('payments.cancelledHint')}</p>
            )}
          </>
        )}
      </CardContent>

      <ConfirmDialog
        open={refunding !== null}
        variant="destructive"
        title={t('payments.refundConfirmTitle')}
        description={
          refunding ? t('payments.refundConfirmBody', { amount: formatPrice(refunding.amount) }) : null
        }
        confirmLabel={t('payments.refund')}
        loading={refundBusy}
        onConfirm={confirmRefund}
        onCancel={() => setRefunding(null)}
      />
    </Card>
  );
}
