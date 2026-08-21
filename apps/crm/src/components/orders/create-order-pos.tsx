'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  UserCheck,
  UserPlus,
  Pencil,
  Phone,
  Ticket,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { PhoneInput, appendPhoneDigit, backspacePhone, normalizePhone } from '@/components/ui/phone-input';
import { VirtualNumpad } from '@/components/ui/virtual-numpad';
import { CartItemColorPicker } from '@/components/orders/cart-item-color-picker';
import {
  PaymentPartsEditor,
  type PaymentPartInput,
} from '@/components/orders/order-payment-panel';
import { PriceOverrideDialog } from '@/components/orders/price-override-dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatPrice } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

type Branch = { id: string; name: string };

type PriceRule = {
  serviceId: string;
  price: number;
  listPrice?: number;
  effectivePrice?: number;
  itemType: string;
  isCustom?: boolean;
  service: {
    id: string;
    name: string;
    unit: string;
    isCustom?: boolean;
    categoryId: string;
    categoryName: string;
  };
};

type CustomerLookup = {
  found: boolean;
  phone: string;
  fullName?: string;
  defaultAddress?: string | null;
  addresses?: { id: string; label: string; address: string; isDefault: boolean }[];
};

type LookupState = 'idle' | 'loading' | 'found' | 'not_found';

export function CreateOrderPos() {
  const { t } = useI18n();
  const router = useRouter();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [prices, setPrices] = useState<PriceRule[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const lookupBusyRef = useRef(false);
  const [customerReady, setCustomerReady] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [lookupAddresses, setLookupAddresses] = useState<CustomerLookup['addresses']>([]);

  const [branchId, setBranchId] = useState('');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery' | 'in_store'>('pickup');
  const [notes, setNotes] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [itemColors, setItemColors] = useState<Record<string, string>>({});
  const [orgItemColors, setOrgItemColors] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState('all');
  const [serviceSearch, setServiceSearch] = useState('');
  const [phonePadOpen, setPhonePadOpen] = useState(true);
  const [payNow, setPayNow] = useState(false);
  const [payParts, setPayParts] = useState<PaymentPartInput[]>([]);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [priceDialogFor, setPriceDialogFor] = useState<PriceRule | null>(null);
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<{ code: string; discountAmount: number } | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);

  useEffect(() => {
    api<{ organization?: { orderItemColors?: string[] } }>('/settings/profile')
      .then((p) => setOrgItemColors(p.organization?.orderItemColors ?? []))
      .catch(() => setOrgItemColors([]));
    api<Branch[]>('/branches').then((all) => {
      setBranches(all);
      if (all.length === 1) setBranchId(all[0].id);
    });
  }, []);

  useEffect(() => {
    if (!branchId) {
      setPrices([]);
      setPricesLoading(false);
      return;
    }
    setPricesLoading(true);
    setQuantities({});
    setItemColors({});
    setCategoryId('all');
    setServiceSearch('');
    api<PriceRule[]>(`/services/prices/${branchId}`)
      .then(setPrices)
      .catch(() => {
        setPrices([]);
        toast.error(t('orders.create.servicesLoadError'));
      })
      .finally(() => setPricesLoading(false));
  }, [branchId, t]);

  const unitPriceFor = (p: PriceRule) => p.effectivePrice ?? p.listPrice ?? p.price;
  const isCustomService = (p: PriceRule) => p.isCustom ?? p.service.isCustom ?? false;
  const linePriceFor = useCallback(
    (p: PriceRule) => priceOverrides[p.serviceId] ?? unitPriceFor(p),
    [priceOverrides],
  );

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of prices) {
      map.set(p.service.categoryId, p.service.categoryName);
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name, 'uz'),
    );
  }, [prices]);

  const filteredPrices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    return prices.filter((p) => {
      if (categoryId !== 'all' && p.service.categoryId !== categoryId) return false;
      if (!q) return true;
      return (
        p.service.name.toLowerCase().includes(q) ||
        p.service.categoryName.toLowerCase().includes(q)
      );
    });
  }, [prices, categoryId, serviceSearch]);

  const cartItems = useMemo(
    () =>
      prices
        .filter((p) => (quantities[p.serviceId] ?? 0) > 0)
        .map((p) => ({
          ...p,
          quantity: quantities[p.serviceId],
          lineTotal: linePriceFor(p) * quantities[p.serviceId],
        })),
    [prices, quantities, linePriceFor],
  );

  const total = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const promoDiscount = Math.min(promo?.discountAmount ?? 0, total);
  const payableTotal = Math.max(0, total - promoDiscount);

  // Bitta qismli to'lov summasi savatga ergashadi — lekin faqat xodim uni
  // qo'lda o'zgartirmagan bo'lsa (qisman to'lov kiritilgan bo'lishi mumkin)
  const lastAutoAmountRef = useRef<string | null>(null);
  useEffect(() => {
    if (!payNow) return;
    setPayParts((prev) => {
      if (prev.length !== 1) return prev;
      const auto = lastAutoAmountRef.current;
      if (auto !== null && prev[0].amount !== auto) return prev; // qo'lda kiritilgan
      const next = payableTotal > 0 ? String(payableTotal) : '';
      lastAutoAmountRef.current = next;
      return prev[0].amount === next ? prev : [{ ...prev[0], amount: next }];
    });
  }, [payNow, payableTotal]);

  function togglePayNow(next: boolean) {
    setPayNow(next);
    if (next) {
      const amount = payableTotal > 0 ? String(payableTotal) : '';
      lastAutoAmountRef.current = amount;
      setPayParts([{ provider: 'cash', amount }]);
    } else {
      lastAutoAmountRef.current = null;
      setPayParts([]);
    }
  }

  // Savat o'zgarsa chegirma qayta hisoblanadi (foizli kodlar uchun muhim)
  useEffect(() => {
    if (!promo || total <= 0) return;
    let cancelled = false;
    api<{ discountAmount: number }>(
      `/promo-codes/preview?code=${encodeURIComponent(promo.code)}&amount=${total}`,
    )
      .then((res) => {
        if (!cancelled) {
          setPromo((prev) => (prev ? { ...prev, discountAmount: res.discountAmount } : prev));
        }
      })
      .catch(() => {
        if (!cancelled) setPromo(null);
      });
    return () => {
      cancelled = true;
    };
    // promo.code o'zgarganda emas, savat summasi o'zgarganda qayta so'raymiz
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  async function applyPromo() {
    const code = promoInput.trim();
    if (!code) return;
    if (total <= 0) {
      toast.error(t('orders.create.toastServiceRequired'));
      return;
    }
    setPromoChecking(true);
    try {
      const res = await api<{ code: string; discountAmount: number }>(
        `/promo-codes/preview?code=${encodeURIComponent(code)}&amount=${total}`,
      );
      setPromo({ code: res.code, discountAmount: res.discountAmount });
      setPromoInput('');
      toast.success(t('promo.applied', { code: res.code }));
    } catch (err) {
      setPromo(null);
      toast.error(err instanceof Error ? err.message : t('promo.invalid'));
    } finally {
      setPromoChecking(false);
    }
  }

  function setQty(serviceId: string, delta: number) {
    setQuantities((prev) => {
      const next = Math.max(0, (prev[serviceId] ?? 0) + delta);
      if (next === 0) {
        const { [serviceId]: _, ...rest } = prev;
        setItemColors((c) => {
          const { [serviceId]: __, ...cr } = c;
          return cr;
        });
        setPriceOverrides((c) => {
          const { [serviceId]: __, ...cr } = c;
          return cr;
        });
        setItemNotes((c) => {
          const { [serviceId]: __, ...cr } = c;
          return cr;
        });
        return rest;
      }
      return { ...prev, [serviceId]: next };
    });
  }

  /** Katalog kartasi bosilganda: konstruktor xizmatda avval narx so'raladi */
  function onTileTap(p: PriceRule) {
    const inCart = (quantities[p.serviceId] ?? 0) > 0;
    if (isCustomService(p) && !inCart && priceOverrides[p.serviceId] === undefined) {
      setPriceDialogFor(p);
      return;
    }
    setQty(p.serviceId, 1);
  }

  function onPriceSaved(serviceId: string, price: number, note: string) {
    setPriceOverrides((prev) => ({ ...prev, [serviceId]: price }));
    setItemNotes((prev) => {
      if (!note) {
        const { [serviceId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [serviceId]: note };
    });
    setQuantities((prev) =>
      (prev[serviceId] ?? 0) > 0 ? prev : { ...prev, [serviceId]: 1 },
    );
  }

  function clearCart() {
    setQuantities({});
    setItemColors({});
    setPriceOverrides({});
    setItemNotes({});
  }

  async function lookupCustomer(phoneArg?: string) {
    if (lookupBusyRef.current) return;
    const phone = (phoneArg ?? phoneInputRef.current?.value ?? customerPhone).trim();
    if (!phone || phone.replace(/\D/g, '').length < 12) {
      toast.error(t('orders.create.toastPhoneIncomplete'));
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
        setPhonePadOpen(false);
      } else {
        setLookupState('not_found');
        setCustomerName('');
        setLookupAddresses([]);
        setSelectedAddressId('');
        setAddress('');
        setCustomerReady(true);
        setPhonePadOpen(false);
        toast.message(t('orders.create.toastNewCustomer'));
      }
    } catch (err) {
      setLookupState('idle');
      toast.error(err instanceof Error ? err.message : t('orders.create.toastLookupError'));
    } finally {
      lookupBusyRef.current = false;
    }
  }

  function onAddressSelect(id: string) {
    setSelectedAddressId(id);
    const item = lookupAddresses?.find((a) => a.id === id);
    if (item) setAddress(item.address);
  }

  function resetCustomerForPhoneEdit() {
    if (!customerReady) return;
    setLookupState('idle');
    setCustomerReady(false);
    setCustomerName('');
    setLookupAddresses([]);
    setSelectedAddressId('');
    setAddress('');
  }

  function updatePhone(next: string) {
    setCustomerPhone(next);
    resetCustomerForPhoneEdit();
    if (next.replace(/\D/g, '').length >= 12) {
      void lookupCustomer(next);
    }
  }

  function onPhoneDigit(digit: string) {
    updatePhone(appendPhoneDigit(customerPhone, digit));
  }

  function onPhoneBackspace() {
    updatePhone(backspacePhone(customerPhone));
  }

  function onPhoneClear() {
    updatePhone(normalizePhone(''));
  }

  const showPhonePad = phonePadOpen || !customerReady;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!customerReady) {
      await lookupCustomer();
      return;
    }
    if (!customerName.trim()) {
      toast.error(t('orders.create.toastNameRequired'));
      return;
    }
    if (!branchId) {
      toast.error(t('orders.pos.selectBranch'));
      return;
    }
    if (!itemCount) {
      toast.error(t('orders.create.toastServiceRequired'));
      return;
    }
    if (payNow) {
      const partsTotal = payParts.reduce(
        (sum, part) => sum + (Math.floor(Number(part.amount)) || 0),
        0,
      );
      if (partsTotal > payableTotal) {
        // Buyurtma yaratilishidan OLDIN to'xtatamiz — aks holda buyurtma
        // yaratilib, to'lov server tomonidan rad etilardi
        toast.error(t('payments.maxHint', { amount: formatPrice(payableTotal) }));
        return;
      }
    }
    setLoading(true);
    try {
      const items = Object.entries(quantities)
        .filter(([, q]) => q > 0)
        .map(([serviceId, quantity]) => ({
          serviceId,
          quantity,
          color: itemColors[serviceId]?.trim() || undefined,
          unitPrice: priceOverrides[serviceId],
          notes: itemNotes[serviceId]?.trim() || undefined,
        }));

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
          promoCode: promo?.code,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
      toast.success(t('orders.create.toastCreated', { orderNumber: order.orderNumber }));

      // Kassada darhol to'lov olingan bo'lsa — buyurtma bilan birga qayd etamiz.
      // Xatolik bo'lsa buyurtma baribir yaratilgan, shuning uchun ogohlantiramiz.
      const paymentParts = payNow
        ? payParts
            .map((part) => ({
              provider: part.provider,
              amount: Math.floor(Number(part.amount)),
            }))
            .filter((part) => Number.isFinite(part.amount) && part.amount > 0)
        : [];
      if (paymentParts.length > 0) {
        try {
          await api(`/payments/orders/${order.id}/record`, {
            method: 'POST',
            body: JSON.stringify({ parts: paymentParts }),
          });
        } catch {
          toast.warning(t('payments.toastRecordFailed'));
        }
      }

      window.open(`/orders/${order.id}/receipt?print=1`, '_blank');
      router.push(`/orders/${order.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <form onSubmit={onSubmit} className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
        <Link href="/orders">
          <Button type="button" variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            {t('orders.pos.back')}
          </Button>
        </Link>

        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Phone className="h-5 w-5 text-muted-foreground shrink-0 hidden sm:block" />
          <PhoneInput
            ref={phoneInputRef}
            touchSize="pos"
            virtualPad
            onVirtualPadOpen={() => setPhonePadOpen(true)}
            className="flex-1 min-w-0"
            value={customerPhone}
            onChange={(v) => {
              setCustomerPhone(v);
              resetCustomerForPhoneEdit();
              if (v.replace(/\D/g, '').length >= 12) lookupCustomer(v);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                lookupCustomer();
              }
            }}
            placeholder="+998901234567"
            disabled={lookupState === 'loading'}
          />
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="h-14 min-w-[56px] touch-manipulation shrink-0"
            onClick={() => lookupCustomer()}
            loading={lookupState === 'loading'}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="w-40 h-10"
          required
        >
          <option value="">{t('orders.pos.selectBranch')}</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>

        <Select
          value={deliveryType}
          onChange={(e) => setDeliveryType(e.target.value as typeof deliveryType)}
          className="w-44 h-10"
        >
          <option value="pickup">{t('orders.create.deliveryPickup')}</option>
          <option value="delivery">{t('orders.create.deliveryDelivery')}</option>
          <option value="in_store">{t('orders.create.deliveryInStore')}</option>
        </Select>
      </div>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        {/* Catalog — POS grid */}
        <div className="flex flex-col flex-1 min-h-0 min-w-0 border-b lg:border-b-0 lg:border-r border-border">
          {!showPhonePad && !branchId ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground">
              {t('orders.pos.selectBranch')}
            </div>
          ) : showPhonePad ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 gap-6 min-h-0 overflow-y-auto">
              <div className="text-center space-y-3 w-full max-w-lg">
                <Phone className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="font-medium text-lg">{t('orders.pos.enterPhone')}</p>
                <p className="text-3xl sm:text-4xl font-bold tracking-wide tabular-nums">
                  {normalizePhone(customerPhone)}
                </p>
                <p className="text-sm text-muted-foreground">{t('orders.pos.enterPhoneHint')}</p>
              </div>
              <VirtualNumpad
                className="px-2"
                onDigit={onPhoneDigit}
                onBackspace={onPhoneBackspace}
                onClear={onPhoneClear}
                onSubmit={() => lookupCustomer()}
                submitDisabled={lookupState === 'loading'}
                backspaceLabel={t('orders.pos.phonePadBackspace')}
                submitLabel={t('orders.pos.phonePadSearch')}
              />
            </div>
          ) : !branchId ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-muted-foreground">
              {t('orders.pos.selectBranch')}
            </div>
          ) : (
            <>
              <div className="shrink-0 p-3 space-y-2 border-b border-border bg-secondary/20">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    placeholder={t('orders.pos.searchServices')}
                    className="pl-10 h-11"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => setCategoryId('all')}
                    className={cn(
                      'shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                      categoryId === 'all'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border hover:bg-secondary',
                    )}
                  >
                    {t('orders.pos.allCategories')}
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      className={cn(
                        'shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                        categoryId === c.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border hover:bg-secondary',
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
                {pricesLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                  </div>
                ) : filteredPrices.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">
                    {t('orders.create.servicesEmpty')}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
                    {filteredPrices.map((p) => {
                      const q = quantities[p.serviceId] ?? 0;
                      const custom = isCustomService(p);
                      const price = linePriceFor(p);
                      return (
                        <button
                          key={p.serviceId}
                          type="button"
                          onClick={() => onTileTap(p)}
                          className={cn(
                            'relative flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all active:scale-[0.97] min-h-[96px] touch-manipulation',
                            q > 0
                              ? 'border-primary bg-primary/10 shadow-sm'
                              : 'border-border bg-card hover:border-primary/50 hover:bg-secondary/40',
                          )}
                        >
                          {q > 0 && (
                            <span className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow">
                              {q}
                            </span>
                          )}
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground line-clamp-1">
                            {p.service.categoryName}
                          </span>
                          <span className="font-semibold text-sm leading-tight line-clamp-2 mt-0.5 flex-1">
                            {p.service.name}
                          </span>
                          <span className="text-xs font-medium text-primary mt-2">
                            {custom && priceOverrides[p.serviceId] === undefined ? (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <Pencil className="h-3 w-3" />
                                {t('pos.customTile')}
                              </span>
                            ) : (
                              <>
                                {formatPrice(price)}
                                <span className="text-muted-foreground font-normal"> / {p.service.unit}</span>
                              </>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Cart panel */}
        <div className="w-full lg:w-[min(100%,420px)] shrink-0 flex flex-col bg-card max-h-[42vh] lg:max-h-none min-h-[280px]">
          <div className="p-3 border-b border-border space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <ShoppingCart className="h-5 w-5" />
                {t('orders.pos.cart')}
                {itemCount > 0 && (
                  <Badge variant="default">{itemCount}</Badge>
                )}
              </div>
              {itemCount > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={clearCart}>
                  <Trash2 className="h-4 w-4" />
                  {t('orders.pos.clearCart')}
                </Button>
              )}
            </div>

            {customerReady && (
              <div className="rounded-lg border border-border p-2.5 space-y-2 bg-secondary/20">
                <div className="flex items-center gap-2">
                  {lookupState === 'found' ? (
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <UserPlus className="h-4 w-4 text-amber-600" />
                  )}
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={t('orders.create.customerNamePlaceholder')}
                    className="h-9"
                    required
                  />
                </div>
                {deliveryType !== 'in_store' && (
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t('orders.create.addressPlaceholder')}
                    className="h-9"
                  />
                )}
                {lookupAddresses && lookupAddresses.length > 0 && deliveryType !== 'in_store' && (
                  <Select
                    value={selectedAddressId}
                    onChange={(e) => onAddressSelect(e.target.value)}
                    className="h-9"
                  >
                    <option value="">{t('orders.create.otherAddress')}</option>
                    {lookupAddresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}: {a.address}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin min-h-0">
            {cartItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('orders.pos.cartEmpty')}
              </p>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.serviceId}
                  className="p-2 rounded-lg bg-secondary/30 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.service.name}</div>
                      <button
                        type="button"
                        onClick={() => setPriceDialogFor(item)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                        title={t('pos.editPrice')}
                      >
                        <span
                          className={cn(
                            priceOverrides[item.serviceId] !== undefined &&
                              'font-semibold text-primary',
                          )}
                        >
                          {formatPrice(linePriceFor(item))}
                        </span>
                        × {item.quantity}
                        <Pencil className="h-3 w-3" />
                      </button>
                      {itemNotes[item.serviceId] && (
                        <div className="text-[11px] text-muted-foreground truncate">
                          {itemNotes[item.serviceId]}
                        </div>
                      )}
                    </div>
                    <div className="font-semibold text-sm shrink-0">{formatPrice(item.lineTotal)}</div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setQty(item.serviceId, -1)}
                        className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-secondary touch-manipulation"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-6 text-center font-bold">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQty(item.serviceId, 1)}
                        className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center touch-manipulation"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {orgItemColors.length > 0 && (
                    <CartItemColorPicker
                      options={orgItemColors}
                      value={itemColors[item.serviceId] ?? ''}
                      onChange={(color) =>
                        setItemColors((prev) => {
                          if (!color.trim()) {
                            const { [item.serviceId]: _, ...rest } = prev;
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

          <div className="p-3 border-t border-border space-y-3 shrink-0 bg-card">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('orders.create.notes')}
              rows={2}
              className="resize-none"
            />
            {promo ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5">
                <span className="flex min-w-0 items-center gap-1.5 text-sm">
                  <Ticket className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="truncate font-mono font-semibold">{promo.code}</span>
                  <span className="shrink-0 text-emerald-700">
                    -{formatPrice(promoDiscount)}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPromo(null)}
                >
                  {t('promo.remove')}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void applyPromo();
                    }
                  }}
                  placeholder={t('promo.placeholder')}
                  className="h-9 flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-9 shrink-0"
                  loading={promoChecking}
                  disabled={!promoInput.trim()}
                  onClick={() => void applyPromo()}
                >
                  {t('promo.apply')}
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-sm text-muted-foreground">
                  {t('payments.payNow')}
                </span>
                <div className="flex flex-1 rounded-lg border border-border p-0.5 bg-card">
                  <button
                    type="button"
                    onClick={() => togglePayNow(false)}
                    className={cn(
                      'flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors',
                      !payNow
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t('payments.later')}
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePayNow(true)}
                    className={cn(
                      'flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors',
                      payNow
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t('payments.now')}
                  </button>
                </div>
              </div>
              {payNow && (
                <PaymentPartsEditor
                  parts={payParts}
                  onChange={setPayParts}
                  outstanding={payableTotal}
                />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {t('orders.create.totalWithCount', { count: itemCount })}
              </span>
              <span className="flex items-baseline gap-2">
                {promoDiscount > 0 && (
                  <span className="text-sm text-muted-foreground line-through">
                    {formatPrice(total)}
                  </span>
                )}
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(payableTotal)}
                </span>
              </span>
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full h-14 text-base font-semibold"
              loading={loading || lookupState === 'loading'}
              disabled={!customerReady || !branchId || !itemCount}
            >
              {customerReady ? t('orders.create.submit') : t('orders.create.continue')}
            </Button>
          </div>
        </div>
      </div>
    </form>

      <PriceOverrideDialog
        open={priceDialogFor !== null}
        serviceName={priceDialogFor?.service.name ?? ''}
        listPrice={priceDialogFor ? unitPriceFor(priceDialogFor) : undefined}
        isCustom={priceDialogFor ? isCustomService(priceDialogFor) : false}
        initialPrice={
          priceDialogFor ? priceOverrides[priceDialogFor.serviceId] : undefined
        }
        initialNote={priceDialogFor ? itemNotes[priceDialogFor.serviceId] : undefined}
        onClose={() => setPriceDialogFor(null)}
        onSave={(price, note) => {
          if (priceDialogFor) onPriceSaved(priceDialogFor.serviceId, price, note);
        }}
      />
    </>
  );
}
