'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Building2,
  Sparkles,
  MapPin,
  Minus,
  Plus,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { BottomNav } from '@/components/bottom-nav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { api, formatPrice, getToken } from '@/lib/api';
import { cn } from '@/lib/utils';

type Branch = { id: string; name: string; address: string };
type PriceRule = {
  serviceId: string;
  price: number;
  listPrice?: number;
  effectivePrice?: number;
  service: { name: string; unit: string; category: { name: string } };
};

function unitPrice(p: PriceRule) {
  return p.effectivePrice ?? p.listPrice ?? p.price;
}

const steps = [
  { id: 1, label: 'Filial' },
  { id: 2, label: 'Xizmatlar' },
  { id: 3, label: 'Manzil' },
];

export default function NewOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [prices, setPrices] = useState<PriceRule[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    api<Branch[]>(`/branches?organizationSlug=${encodeURIComponent(process.env.NEXT_PUBLIC_ORG_SLUG ?? 'ximchistka-demo')}`).then(setBranches);
  }, [router]);

  useEffect(() => {
    if (branchId) api<PriceRule[]>(`/services/prices/${branchId}`).then(setPrices);
  }, [branchId]);

  const total = prices.reduce((sum, p) => sum + unitPrice(p) * (selected[p.serviceId] ?? 0), 0);
  const itemCount = Object.values(selected).reduce((s, q) => s + q, 0);

  function inc(id: string) { setSelected((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 })); }
  function dec(id: string) { setSelected((p) => ({ ...p, [id]: Math.max(0, (p[id] ?? 0) - 1) })); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!itemCount) return;
    setLoading(true);
    try {
      const items = Object.entries(selected)
        .filter(([, q]) => q > 0)
        .map(([serviceId, quantity]) => ({ serviceId, quantity }));
      await api('/orders', {
        method: 'POST',
        body: JSON.stringify({
          branchId,
          items,
          deliveryType: 'pickup',
          address,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
      toast.success('Buyurtma qabul qilindi!');
      router.push('/orders');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }

  const canNext = step === 1 ? !!branchId : step === 2 ? itemCount > 0 : !!address;

  return (
    <div className="min-h-screen safe-bottom">
      <div className="sticky top-0 z-30 bg-card/90 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => (step > 1 ? setStep(step - 1) : router.back())} className="h-9 w-9 rounded-full hover:bg-secondary flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold">Yangi buyurtma</h1>
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div
                  className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                    step >= s.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {step > s.id ? <Check className="h-3.5 w-3.5" /> : s.id}
                </div>
                {i < steps.length - 1 && (
                  <div className={cn('h-1 flex-1 mx-1 rounded-full', step > s.id ? 'bg-primary' : 'bg-secondary')} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            {steps.map((s) => (
              <span key={s.id} className="text-[11px] font-medium text-muted-foreground">
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-3">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
            <div>
              <h2 className="font-semibold text-lg mb-1">Qaysi filial?</h2>
              <p className="text-sm text-muted-foreground mb-3">Eng yaqin filialni tanlang</p>
            </div>
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => setBranchId(b.id)}
                className={cn(
                  'w-full text-left rounded-2xl border-2 p-4 flex items-center gap-3 transition-all',
                  branchId === b.id ? 'border-primary bg-primary/5' : 'border-border bg-card',
                )}
              >
                <div className={cn('h-11 w-11 rounded-2xl flex items-center justify-center', branchId === b.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{b.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{b.address}</div>
                </div>
                {branchId === b.id && (
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </button>
            ))}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
            <div>
              <h2 className="font-semibold text-lg mb-1">Xizmatlarni tanlang</h2>
              <p className="text-sm text-muted-foreground mb-3">Kerakli miqdorni belgilang</p>
            </div>
            {prices.map((p) => {
              const qty = selected[p.serviceId] ?? 0;
              return (
                <Card key={p.serviceId} className="!p-4 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{p.service.name}</div>
                    <div className="text-xs text-muted-foreground">{p.service.category.name}</div>
                    <div className="text-sm font-bold text-primary mt-0.5">
                      {formatPrice(unitPrice(p))}
                      {unitPrice(p) < (p.listPrice ?? p.price) && (
                        <span className="text-xs text-muted-foreground font-normal line-through ml-1">
                          {formatPrice(p.listPrice ?? p.price)}
                        </span>
                      )}
                    </div>
                  </div>
                  {qty > 0 ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => dec(p.serviceId)} className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="font-semibold w-5 text-center">{qty}</span>
                      <button onClick={() => inc(p.serviceId)} className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => inc(p.serviceId)} className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                      Qo&apos;shish
                    </button>
                  )}
                </Card>
              );
            })}
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div>
              <h2 className="font-semibold text-lg mb-1">Yetkazib berish manzili</h2>
              <p className="text-sm text-muted-foreground mb-3">Kiyimni olib ketadigan manzil</p>
            </div>

            <div>
              <Label>Manzil</Label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  className="pl-12"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ko'cha, uy, kvartira"
                />
              </div>
            </div>

            <Card className="!p-4 bg-primary/5 border-primary/20">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Buyurtma xulosasi
              </h3>
              <div className="space-y-2 text-sm">
                {prices
                  .filter((p) => (selected[p.serviceId] ?? 0) > 0)
                  .map((p) => (
                    <div key={p.serviceId} className="flex justify-between">
                      <span className="text-muted-foreground">
                        {p.service.name} × {selected[p.serviceId]}
                      </span>
                      <span className="font-semibold">{formatPrice(p.price * selected[p.serviceId]!)}</span>
                    </div>
                  ))}
                <div className="border-t border-border pt-2 mt-2 flex justify-between">
                  <span className="font-semibold">Jami</span>
                  <span className="font-bold text-primary">{formatPrice(total)}</span>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-lg border-t border-border p-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        <div className="max-w-md mx-auto">
          {step === 2 && itemCount > 0 && (
            <div className="flex items-center justify-between mb-3 text-sm">
              <span className="text-muted-foreground">{itemCount} ta xizmat</span>
              <span className="font-bold text-lg text-primary">{formatPrice(total)}</span>
            </div>
          )}
          {step < 3 ? (
            <Button size="lg" className="w-full" disabled={!canNext} onClick={() => setStep(step + 1)}>
              Davom etish
              <ArrowRight className="h-5 w-5" />
            </Button>
          ) : (
            <Button size="lg" className="w-full" loading={loading} disabled={!canNext} onClick={submit}>
              Buyurtma berish · {formatPrice(total)}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
