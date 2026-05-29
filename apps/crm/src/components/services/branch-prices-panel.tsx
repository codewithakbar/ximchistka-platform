'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label, Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatPrice } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  applyServiceDiscount,
  discountLabel,
  isServiceDiscountActive,
} from '@ximchistka/shared';

type Branch = { id: string; name: string };

type Category = {
  id: string;
  name: string;
  services: {
    id: string;
    name: string;
    unit: string;
    basePrice: number;
    discountType: string | null;
    discountValue: number | null;
    discountValidUntil: string | null;
    isActive: boolean;
  }[];
};

type PriceRule = {
  serviceId: string;
  price: number;
  listPrice?: number;
  effectivePrice?: number;
  itemType: string;
  service: {
    id: string;
    name: string;
    unit: string;
    basePrice: number;
    discountType: string | null;
    discountValue: number | null;
    discountValidUntil: string | null;
  };
};

export function BranchPricesPanel({ canEdit }: { canEdit: boolean }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branchId, setBranchId] = useState('');
  const [prices, setPrices] = useState<PriceRule[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadCatalog = useCallback(() => {
    return api<Category[]>('/services/manage/categories').catch(() =>
      api<Category[]>('/services/categories'),
    );
  }, []);

  useEffect(() => {
    Promise.all([api<Branch[]>('/branches'), loadCatalog()])
      .then(([b, cats]) => {
        setBranches(b);
        setCategories(cats);
        if (b.length === 1) setBranchId(b[0].id);
      })
      .catch(() => {
        setBranches([]);
        setCategories([]);
      })
      .finally(() => setLoading(false));
  }, [loadCatalog]);

  useEffect(() => {
    if (!branchId) {
      setPrices([]);
      setDraft({});
      return;
    }
    api<PriceRule[]>(`/services/prices/${branchId}`)
      .then((rules) => {
        setPrices(rules);
        const next: Record<string, string> = {};
        for (const r of rules) {
          next[r.serviceId] = String(r.price);
        }
        setDraft(next);
      })
      .catch(() => {
        setPrices([]);
        setDraft({});
      });
  }, [branchId]);

  const priceByService = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of prices) map.set(p.serviceId, p.price);
    return map;
  }, [prices]);

  const activeServices = useMemo(
    () =>
      categories.flatMap((c) =>
        c.services
          .filter((s) => s.isActive)
          .map((s) => ({ ...s, categoryName: c.name })),
      ),
    [categories],
  );

  async function savePrice(serviceId: string, basePrice: number) {
    if (!branchId || !canEdit) return;
    const raw = draft[serviceId] ?? String(priceByService.get(serviceId) ?? basePrice);
    const price = Number(raw);
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Narx noto\'g\'ri');
      return;
    }
    setSavingId(serviceId);
    try {
      await api('/services/prices', {
        method: 'POST',
        body: JSON.stringify({ branchId, serviceId, price, itemType: 'standart' }),
      });
      toast.success('Narx saqlandi');
      const rules = await api<PriceRule[]>(`/services/prices/${branchId}`);
      setPrices(rules);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="w-full sm:max-w-xs">
          <Label>Filial</Label>
          <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">Filialni tanlang</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
        {branchId && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 pb-0.5">
            <Building2 className="h-4 w-4" />
            Buyurtmalarda shu filial narxi ishlatiladi
          </p>
        )}
      </div>

      {!branchId ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Narxlarni ko&apos;rish va tahrirlash uchun filial tanlang
          </CardContent>
        </Card>
      ) : activeServices.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Faol xizmatlar yo&apos;q
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_100px_120px_140px_100px] gap-3 px-4 py-3 bg-secondary/60 text-xs font-medium text-muted-foreground">
            <span>Xizmat</span>
            <span>Asosiy</span>
            <span>Filial narxi</span>
            <span>Chegirmadan keyin</span>
            <span />
          </div>
          <div className="divide-y divide-border">
            {activeServices.map((s) => {
              const rule = prices.find((p) => p.serviceId === s.id);
              const current = priceByService.get(s.id);
              const listPrice = rule?.listPrice ?? rule?.price ?? current ?? s.basePrice;
              const value = draft[s.id] ?? String(listPrice);
              const hasDiscount = isServiceDiscountActive(s);
              const draftList = Number(value) || listPrice;
              const effective =
                rule?.effectivePrice ??
                (hasDiscount ? applyServiceDiscount(draftList, s) : undefined);
              const changed = current !== undefined && Number(value) !== current;
              const isDefault = current === undefined;

              return (
                <div
                  key={s.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_100px_120px_140px_100px] gap-3 px-4 py-3 items-center"
                >
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                      {s.name}
                      {hasDiscount && (
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-500/10 px-1.5 py-0.5 rounded">
                          {discountLabel(s)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.categoryName} · 1 {s.unit}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground md:text-right">
                    {formatPrice(s.basePrice)}
                  </div>
                  <div>
                    <input
                      type="number"
                      min={0}
                      disabled={!canEdit}
                      value={value}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, [s.id]: e.target.value }))
                      }
                      className={cn(
                        'h-9 w-full rounded-lg border border-input bg-card px-3 text-sm',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        !canEdit && 'opacity-60 cursor-not-allowed',
                      )}
                    />
                    {isDefault && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">Asosiy narx (saqlanmagan)</p>
                    )}
                  </div>
                  <div className="text-sm font-medium text-primary md:text-right">
                    {effective != null && hasDiscount ? (
                      <>
                        {formatPrice(effective)}
                        <span className="block text-xs text-muted-foreground font-normal line-through">
                          {formatPrice(Number(value) || listPrice)}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="md:text-right">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant={changed || isDefault ? 'primary' : 'outline'}
                        loading={savingId === s.id}
                        onClick={() => savePrice(s.id, s.basePrice)}
                      >
                        <Save className="h-3.5 w-3.5" />
                        Saqlash
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
