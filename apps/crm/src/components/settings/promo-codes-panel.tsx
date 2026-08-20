'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Ticket, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Label, Select } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Empty } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatPrice } from '@/lib/api';
import { useFormatDate, useI18n } from '@/lib/i18n';

type PromoCode = {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  validUntil: string | null;
  isActive: boolean;
  editable: boolean;
};

export function PromoCodesPanel({ canManage }: { canManage: boolean }) {
  const { t } = useI18n();
  const formatDate = useFormatDate();

  const [codes, setCodes] = useState<PromoCode[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('10');
  const [maxUses, setMaxUses] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<PromoCode | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setCodes(await api<PromoCode[]>('/promo-codes'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
      setCodes([]);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setCode('');
    setDiscountType('percent');
    setDiscountValue('10');
    setMaxUses('');
    setValidUntil('');
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/promo-codes', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim(),
          discountType,
          discountValue: Number(discountValue),
          maxUses: maxUses ? Number(maxUses) : undefined,
          validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
        }),
      });
      toast.success(t('promo.toastCreated'));
      resetForm();
      setFormOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(promo: PromoCode) {
    try {
      await api(`/promo-codes/${promo.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !promo.isActive }),
      });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/promo-codes/${deleting.id}`, { method: 'DELETE' });
      toast.success(t('promo.toastDeleted'));
      setDeleting(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setDeleteBusy(false);
    }
  }

  function discountLabel(p: PromoCode) {
    return p.discountType === 'percent'
      ? `-${p.discountValue}%`
      : `-${formatPrice(p.discountValue)}`;
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>{t('promo.panelTitle')}</CardTitle>
          <CardDescription>{t('promo.panelDesc')}</CardDescription>
        </div>
        {canManage && !formOpen && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            {t('common.add')}
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {formOpen && (
          <form
            onSubmit={onCreate}
            className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2"
          >
            <div className="sm:col-span-2">
              <Label htmlFor="promo-code">{t('promo.title')}</Label>
              <Input
                id="promo-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="WELCOME10"
                required
                maxLength={32}
              />
            </div>
            <div>
              <Label htmlFor="promo-type">{t('promo.discountType')}</Label>
              <Select
                id="promo-type"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
              >
                <option value="percent">{t('promo.percent')}</option>
                <option value="fixed">{t('promo.fixed')}</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="promo-value">{t('promo.discountValue')}</Label>
              <Input
                id="promo-value"
                type="number"
                min={1}
                max={discountType === 'percent' ? 100 : undefined}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="promo-max">{t('promo.maxUses')}</Label>
              <Input
                id="promo-max"
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder={t('promo.unlimited')}
              />
            </div>
            <div>
              <Label htmlFor="promo-until">{t('promo.validUntil')}</Label>
              <Input
                id="promo-until"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" loading={saving}>
                {t('common.save')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                }}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        )}

        {codes === null ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : codes.length === 0 ? (
          <Empty icon={Ticket} title={t('promo.emptyTitle')} description={t('promo.emptyDesc')} />
        ) : (
          <ul className="space-y-2">
            {codes.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{p.code}</span>
                    <Badge variant={p.isActive ? 'success' : 'secondary'}>
                      {p.isActive ? t('promo.active') : t('promo.inactive')}
                    </Badge>
                    {!p.editable && <Badge variant="info">{t('promo.platform')}</Badge>}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {discountLabel(p)} ·{' '}
                    {t('promo.used', {
                      used: p.usedCount,
                      max: p.maxUses ?? t('promo.unlimited'),
                    })}
                    {p.validUntil && <> · {formatDate(p.validUntil)}</>}
                  </div>
                </div>

                {canManage && p.editable && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleActive(p)}>
                      {p.isActive ? t('promo.deactivate') : t('promo.activate')}
                    </Button>
                    {p.usedCount === 0 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title={t('common.delete')}
                        onClick={() => setDeleting(p)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <ConfirmDialog
        open={deleting !== null}
        variant="destructive"
        title={t('promo.deleteTitle')}
        description={deleting ? t('promo.deleteBody', { code: deleting.code }) : null}
        confirmLabel={t('common.delete')}
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </Card>
  );
}
