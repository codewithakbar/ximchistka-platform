'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Minus, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CartItemColorPicker } from '@/components/orders/cart-item-color-picker';
import { api, formatPrice } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

type PriceRule = {
  serviceId: string;
  price: number;
  listPrice?: number;
  effectivePrice?: number;
  service: { id: string; name: string; unit: string; categoryName: string };
};

export type EditableOrderItem = {
  serviceId: string;
  quantity: number;
  color?: string | null;
};

export function EditOrderDialog({
  orderId,
  branchId,
  items,
  notes,
  open,
  onClose,
  onSaved,
}: {
  orderId: string;
  branchId: string;
  items: EditableOrderItem[];
  notes: string | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();

  const [prices, setPrices] = useState<PriceRule[] | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [colors, setColors] = useState<Record<string, string>>({});
  const [orgColors, setOrgColors] = useState<string[]>([]);
  const [note, setNote] = useState(notes ?? '');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setQuantities(
      Object.fromEntries(items.map((i) => [i.serviceId, i.quantity])),
    );
    setColors(
      Object.fromEntries(
        items.filter((i) => i.color).map((i) => [i.serviceId, i.color as string]),
      ),
    );
    setNote(notes ?? '');
    setSearch('');

    api<PriceRule[]>(`/services/prices/${branchId}`)
      .then(setPrices)
      .catch(() => {
        setPrices([]);
        toast.error(t('orders.create.servicesLoadError'));
      });

    api<{ organization?: { orderItemColors?: string[] } }>('/settings/profile')
      .then((p) => setOrgColors(p.organization?.orderItemColors ?? []))
      .catch(() => setOrgColors([]));
    // items/notes faqat oyna ochilganda o'qiladi — tahrir paytida qayta yuklanmaydi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, branchId, orderId]);

  const unitPriceFor = (p: PriceRule) => p.effectivePrice ?? p.listPrice ?? p.price;

  const cart = useMemo(
    () =>
      (prices ?? [])
        .filter((p) => (quantities[p.serviceId] ?? 0) > 0)
        .map((p) => ({
          ...p,
          quantity: quantities[p.serviceId],
          lineTotal: unitPriceFor(p) * quantities[p.serviceId],
        })),
    [prices, quantities],
  );

  const total = cart.reduce((sum, i) => sum + i.lineTotal, 0);
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !prices) return [];
    return prices
      .filter(
        (p) =>
          p.service.name.toLowerCase().includes(q) ||
          p.service.categoryName.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [prices, search]);

  function setQty(serviceId: string, delta: number) {
    setQuantities((prev) => {
      const next = Math.max(0, (prev[serviceId] ?? 0) + delta);
      if (next === 0) {
        const { [serviceId]: _removed, ...rest } = prev;
        setColors((c) => {
          const { [serviceId]: _dropped, ...cr } = c;
          return cr;
        });
        return rest;
      }
      return { ...prev, [serviceId]: next };
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!itemCount) {
      toast.error(t('orders.create.toastServiceRequired'));
      return;
    }
    setSaving(true);
    try {
      await api(`/orders/${orderId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          items: cart.map((i) => ({
            serviceId: i.serviceId,
            quantity: i.quantity,
            color: colors[i.serviceId]?.trim() || undefined,
          })),
          notes: note.trim() || null,
        }),
      });
      toast.success(t('orderDetail.toastEdited'));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={saving ? undefined : onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-border bg-card shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">{t('orderDetail.editTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 scrollbar-thin">
            {prices === null ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="edit-order-search">{t('orderDetail.addService')}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="edit-order-search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t('orders.pos.searchServices')}
                      className="pl-10"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <ul className="mt-2 space-y-1 rounded-lg border border-border p-1">
                      {searchResults.map((p) => (
                        <li key={p.serviceId}>
                          <button
                            type="button"
                            onClick={() => {
                              setQty(p.serviceId, 1);
                              setSearch('');
                            }}
                            className={cn(
                              'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm',
                              'hover:bg-secondary',
                            )}
                          >
                            <span className="min-w-0 flex-1 truncate">{p.service.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatPrice(unitPriceFor(p))}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="space-y-2">
                  {cart.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      {t('orders.pos.cartEmpty')}
                    </p>
                  ) : (
                    cart.map((item) => (
                      <div key={item.serviceId} className="space-y-2 rounded-lg bg-secondary/30 p-2">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{item.service.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatPrice(unitPriceFor(item))} × {item.quantity}
                            </div>
                          </div>
                          <div className="shrink-0 text-sm font-semibold">
                            {formatPrice(item.lineTotal)}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setQty(item.serviceId, -1)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-secondary"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-6 text-center font-bold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => setQty(item.serviceId, 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {orgColors.length > 0 && (
                          <CartItemColorPicker
                            options={orgColors}
                            value={colors[item.serviceId] ?? ''}
                            onChange={(color) =>
                              setColors((prev) => {
                                if (!color.trim()) {
                                  const { [item.serviceId]: _removed, ...rest } = prev;
                                  return rest;
                                }
                                return { ...prev, [item.serviceId]: color };
                              })
                            }
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <Label htmlFor="edit-order-notes">{t('common.note')}</Label>
                  <Textarea
                    id="edit-order-notes"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </>
            )}
          </div>

          <div className="shrink-0 space-y-3 border-t border-border px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t('orders.create.totalWithCount', { count: itemCount })}
              </span>
              <span className="text-xl font-bold text-primary">{formatPrice(total)}</span>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" loading={saving} disabled={!itemCount}>
                {t('common.save')}
              </Button>
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
