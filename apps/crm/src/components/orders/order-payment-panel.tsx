'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Undo2, Wallet } from 'lucide-react';
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

export const PAYMENT_PROVIDERS = ['cash', 'click', 'payme', 'uzum'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

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

export function OrderPaymentPanel({
  orderId,
  cancelled = false,
  onChange,
}: {
  orderId: string;
  cancelled?: boolean;
  onChange?: (summary: PaymentSummary) => void;
}) {
  const { t } = useI18n();
  const formatDate = useFormatDate();
  const demoExpired = useDemoExpired();
  const canRefund = useHasRole('super_admin', 'branch_manager');

  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [provider, setProvider] = useState<PaymentProvider>('cash');
  const [amount, setAmount] = useState('');
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
  }, [load]);

  function openForm() {
    if (!summary) return;
    setAmount(String(summary.outstanding));
    setProvider('cash');
    setFormOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(t('payments.invalidAmount'));
      return;
    }
    setSaving(true);
    try {
      const res = await api<{ summary: PaymentSummary }>(
        `/payments/orders/${orderId}/record`,
        {
          method: 'POST',
          body: JSON.stringify({ provider, amount: Math.floor(value) }),
        },
      );
      apply(res.summary);
      setFormOpen(false);
      toast.success(t('payments.toastRecorded', { amount: formatPrice(Math.floor(value)) }));
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
                <div>
                  <Label htmlFor="payment-provider">{t('payments.method')}</Label>
                  <Select
                    id="payment-provider"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as PaymentProvider)}
                  >
                    {PAYMENT_PROVIDERS.map((p) => (
                      <option key={p} value={p}>
                        {t(`payments.provider.${p}`)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="payment-amount">{t('payments.amount')}</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    min={1}
                    max={summary.outstanding}
                    step={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('payments.maxHint', { amount: formatPrice(summary.outstanding) })}
                  </p>
                </div>
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
