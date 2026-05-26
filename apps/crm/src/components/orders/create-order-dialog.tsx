'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { api, formatPrice } from '@/lib/api';

type Branch = { id: string; name: string };
type PriceRule = {
  serviceId: string;
  price: number;
  itemType: string;
  service: { id: string; name: string; unit: string };
};

export function CreateOrderDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [prices, setPrices] = useState<PriceRule[]>([]);
  const [loading, setLoading] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [branchId, setBranchId] = useState('');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery' | 'in_store'>('pickup');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open) return;
    api<Branch[]>('/branches').then((all) => {
      setBranches(all);
      if (all.length === 1) setBranchId(all[0].id);
      else setBranchId('');
    });
    setCustomerName('');
    setCustomerPhone('');
    setAddress('');
    setNotes('');
    setQuantities({});
    setDeliveryType('pickup');
  }, [open]);

  useEffect(() => {
    if (branchId) {
      api<PriceRule[]>(`/services/prices/${branchId}`).then(setPrices);
    } else {
      setPrices([]);
    }
  }, [branchId]);

  const total = useMemo(
    () =>
      prices.reduce((sum, p) => {
        const q = quantities[p.serviceId] ?? 0;
        return sum + p.price * q;
      }, 0),
    [prices, quantities],
  );

  const itemCount = Object.values(quantities).reduce((s, q) => s + q, 0);

  function setQty(serviceId: string, delta: number) {
    setQuantities((prev) => {
      const next = Math.max(0, (prev[serviceId] ?? 0) + delta);
      if (next === 0) {
        const { [serviceId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [serviceId]: next };
    });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!itemCount) {
      toast.error('Kamida bitta xizmat tanlang');
      return;
    }
    setLoading(true);
    try {
      const items = Object.entries(quantities)
        .filter(([, q]) => q > 0)
        .map(([serviceId, quantity]) => ({ serviceId, quantity }));

      const order = await api<{ orderNumber: string }>('/orders/staff', {
        method: 'POST',
        body: JSON.stringify({
          branchId,
          customerName,
          customerPhone,
          items,
          deliveryType,
          address: deliveryType === 'in_store' ? undefined : address,
          notes: notes || undefined,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
      toast.success(`Buyurtma yaratildi: ${order.orderNumber}`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-card rounded-xl border border-border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-semibold">Yangi buyurtma</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Mijoz ismi</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                placeholder="Sardor Karimov"
              />
            </div>
            <div>
              <Label>Mijoz telefoni</Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
                placeholder="+998901234567"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Filial</Label>
              <Select value={branchId} onChange={(e) => setBranchId(e.target.value)} required>
                <option value="">Tanlang</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Yetkazish turi</Label>
              <Select
                value={deliveryType}
                onChange={(e) => setDeliveryType(e.target.value as typeof deliveryType)}
              >
                <option value="pickup">Olib ketish</option>
                <option value="delivery">Yetkazib berish</option>
                <option value="in_store">Do&apos;konda topshirish</option>
              </Select>
            </div>
          </div>

          {deliveryType !== 'in_store' && (
            <div>
              <Label>Manzil</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ko'cha, uy, kvartira"
              />
            </div>
          )}

          {branchId && (
            <div>
              <Label>Xizmatlar</Label>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
                {prices.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">Xizmatlar yuklanmoqda...</p>
                ) : (
                  prices.map((p) => {
                    const q = quantities[p.serviceId] ?? 0;
                    return (
                      <div
                        key={p.serviceId}
                        className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-secondary/50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{p.service.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatPrice(p.price)} / {p.service.unit}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setQty(p.serviceId, -1)}
                            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-6 text-center font-semibold">{q}</span>
                          <button
                            type="button"
                            onClick={() => setQty(p.serviceId, 1)}
                            className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div>
            <Label>Eslatma (ixtiyoriy)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-muted-foreground">Jami ({itemCount} ta)</span>
            <span className="text-xl font-bold text-primary">{formatPrice(total)}</span>
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Bekor
            </Button>
            <Button type="submit" className="flex-1" loading={loading} disabled={!branchId || !itemCount}>
              Buyurtma yaratish
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
