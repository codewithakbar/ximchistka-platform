'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus, Minus, Search, UserCheck, UserPlus, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Badge } from '@/components/ui/badge';
import { api, formatPrice } from '@/lib/api';
import { cn } from '@/lib/utils';

type Branch = { id: string; name: string };
type PriceRule = {
  serviceId: string;
  price: number;
  listPrice?: number;
  effectivePrice?: number;
  itemType: string;
  service: { id: string; name: string; unit: string };
};

type CustomerLookup = {
  found: boolean;
  phone: string;
  fullName?: string;
  defaultAddress?: string | null;
  addresses?: { id: string; label: string; address: string; isDefault: boolean }[];
};

type LookupState = 'idle' | 'loading' | 'found' | 'not_found';

export function CreateOrderDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (order?: { id: string; orderNumber: string }) => void;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [prices, setPrices] = useState<PriceRule[]>([]);
  const [loading, setLoading] = useState(false);

  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const lookupBusyRef = useRef(false);
  const [customerReady, setCustomerReady] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [lookupAddresses, setLookupAddresses] = useState<
    CustomerLookup['addresses']
  >([]);

  const [branchId, setBranchId] = useState('');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery' | 'in_store'>('pickup');
  const [notes, setNotes] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  function resetForm() {
    setLookupState('idle');
    setCustomerReady(false);
    setCustomerName('');
    setCustomerPhone('');
    setAddress('');
    setSelectedAddressId('');
    setLookupAddresses([]);
    setNotes('');
    setQuantities({});
    setDeliveryType('pickup');
    setPrices([]);
  }

  useEffect(() => {
    if (!open) return;
    resetForm();
    api<Branch[]>('/branches').then((all) => {
      setBranches(all);
      if (all.length === 1) setBranchId(all[0].id);
      else setBranchId('');
    });
  }, [open]);

  useEffect(() => {
    if (branchId) {
      api<PriceRule[]>(`/services/prices/${branchId}`).then(setPrices);
    } else {
      setPrices([]);
    }
  }, [branchId]);

  const unitPriceFor = (p: PriceRule) => p.effectivePrice ?? p.listPrice ?? p.price;

  const total = useMemo(
    () =>
      prices.reduce((sum, p) => {
        const q = quantities[p.serviceId] ?? 0;
        return sum + unitPriceFor(p) * q;
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

  async function lookupCustomer(phoneArg?: string) {
    if (lookupBusyRef.current) return;
    // Read the live input value too: state can lag behind on autofill/fast clicks
    const phone = (phoneArg ?? phoneInputRef.current?.value ?? customerPhone).trim();
    if (!phone || phone.replace(/\D/g, '').length < 12) {
      toast.error("Telefon raqamini to'liq kiriting");
      return;
    }
    lookupBusyRef.current = true;
    setCustomerPhone(phone);
    setLookupState('loading');
    setCustomerReady(false);
    try {
      const res = await api<CustomerLookup>(
        `/customers/lookup?phone=${encodeURIComponent(phone)}`,
      );
      setCustomerPhone(res.phone);

      if (res.found && res.fullName) {
        setLookupState('found');
        setCustomerName(res.fullName);
        setLookupAddresses(res.addresses ?? []);
        const defaultAddr = res.addresses?.find((a) => a.isDefault) ?? res.addresses?.[0];
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          setAddress(defaultAddr.address);
        } else {
          setSelectedAddressId('');
          setAddress(res.defaultAddress ?? '');
        }
        setCustomerReady(true);
      } else {
        setLookupState('not_found');
        setCustomerName('');
        setLookupAddresses([]);
        setSelectedAddressId('');
        setAddress('');
        setCustomerReady(true);
        toast.message('Yangi mijoz — ma\'lumotlarni to\'ldiring');
      }
    } catch (err) {
      setLookupState('idle');
      toast.error(err instanceof Error ? err.message : 'Qidiruv xatosi');
    } finally {
      lookupBusyRef.current = false;
    }
  }

  function onAddressSelect(id: string) {
    setSelectedAddressId(id);
    const item = lookupAddresses?.find((a) => a.id === id);
    if (item) setAddress(item.address);
  }

  function changePhone() {
    setLookupState('idle');
    setCustomerReady(false);
    setCustomerName('');
    setLookupAddresses([]);
    setSelectedAddressId('');
    setAddress('');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!customerReady) {
      // Phone entered but not looked up yet — run the lookup instead of blocking
      await lookupCustomer();
      return;
    }
    if (!customerName.trim()) {
      toast.error('Mijoz ismini kiriting');
      return;
    }
    if (!itemCount) {
      toast.error('Kamida bitta xizmat tanlang');
      return;
    }
    setLoading(true);
    try {
      const items = Object.entries(quantities)
        .filter(([, q]) => q > 0)
        .map(([serviceId, quantity]) => ({ serviceId, quantity }));

      const order = await api<{ id: string; orderNumber: string }>('/orders/staff', {
        method: 'POST',
        body: JSON.stringify({
          branchId,
          customerName: customerName.trim(),
          customerPhone,
          items,
          deliveryType,
          address: deliveryType === 'in_store' ? undefined : address || undefined,
          notes: notes || undefined,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
      toast.success(`Buyurtma yaratildi: ${order.orderNumber}`);
      onCreated(order);
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
          {/* 1. Telefon qidiruv */}
          <div className="rounded-xl border border-border p-4 space-y-3 bg-secondary/20">
            <Label className="text-base font-medium">Mijoz telefoni</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <PhoneInput
                  ref={phoneInputRef}
                  className="pl-10"
                  value={customerPhone}
                  onChange={(v) => {
                    setCustomerPhone(v);
                    if (customerReady) changePhone();
                    // Full number typed — look it up automatically
                    if (v.replace(/\D/g, '').length >= 12) {
                      lookupCustomer(v);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      lookupCustomer();
                    }
                  }}
                  placeholder="+998901234567"
                  disabled={lookupState === 'loading'}
                  required
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => lookupCustomer()}
                loading={lookupState === 'loading'}
              >
                <Search className="h-4 w-4" />
                Qidirish
              </Button>
            </div>

            {lookupState === 'found' && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700">
                  <UserCheck className="h-4 w-4" />
                  <span className="text-sm font-medium">Mijoz topildi</span>
                  <Badge variant="success">Mavjud</Badge>
                </div>
                <p className="text-sm">
                  <span className="text-muted-foreground">Ism: </span>
                  <span className="font-medium">{customerName}</span>
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">Telefon: </span>
                  {customerPhone}
                </p>
              </div>
            )}

            {lookupState === 'not_found' && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2 text-amber-800 mb-1">
                  <UserPlus className="h-4 w-4" />
                  <span className="text-sm font-medium">Yangi mijoz</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Bu telefon tizimda yo&apos;q. Quyida ism va boshqa ma&apos;lumotlarni kiriting.
                </p>
              </div>
            )}
          </div>

          {customerReady && (
            <>
              {/* Mijoz ma'lumotlari */}
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
                  <Label>Telefon</Label>
                  <Input value={customerPhone} disabled className="bg-muted" />
                </div>
              </div>

              {lookupAddresses && lookupAddresses.length > 0 && deliveryType !== 'in_store' && (
                <div>
                  <Label>Saqlangan manzillar</Label>
                  <Select
                    value={selectedAddressId}
                    onChange={(e) => onAddressSelect(e.target.value)}
                  >
                    <option value="">Boshqa manzil</option>
                    {lookupAddresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}: {a.address}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Filial</Label>
                  <Select value={branchId} onChange={(e) => setBranchId(e.target.value)} required>
                    <option value="">Tanlang</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
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
                  <div
                    className={cn(
                      'mt-2 space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-2',
                    )}
                  >
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
                                {formatPrice(unitPriceFor(p))} / {p.service.unit}
                                {unitPriceFor(p) < (p.listPrice ?? p.price) && (
                                  <span className="line-through ml-1">
                                    {formatPrice(p.listPrice ?? p.price)}
                                  </span>
                                )}
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
            </>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Bekor
            </Button>
            <Button
              type="submit"
              className="flex-1"
              loading={loading || lookupState === 'loading'}
              disabled={customerReady && (!branchId || !itemCount)}
            >
              {customerReady ? 'Buyurtma yaratish' : 'Davom etish'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
