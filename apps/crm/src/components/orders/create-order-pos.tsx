'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
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
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { PhoneInput, appendPhoneDigit, backspacePhone, normalizePhone } from '@/components/ui/phone-input';
import { VirtualNumpad } from '@/components/ui/virtual-numpad';
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
  service: {
    id: string;
    name: string;
    unit: string;
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
  const [categoryId, setCategoryId] = useState('all');
  const [serviceSearch, setServiceSearch] = useState('');
  const [phonePadOpen, setPhonePadOpen] = useState(true);

  useEffect(() => {
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
          lineTotal: unitPriceFor(p) * quantities[p.serviceId],
        })),
    [prices, quantities],
  );

  const total = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

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

  function clearCart() {
    setQuantities({});
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
      toast.success(t('orders.create.toastCreated', { orderNumber: order.orderNumber }));
      window.open(`/orders/${order.id}/receipt?print=1`, '_blank');
      router.push(`/orders/${order.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
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
                      const price = unitPriceFor(p);
                      return (
                        <button
                          key={p.serviceId}
                          type="button"
                          onClick={() => setQty(p.serviceId, 1)}
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
                            {formatPrice(price)}
                            <span className="text-muted-foreground font-normal"> / {p.service.unit}</span>
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
                  className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{item.service.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatPrice(unitPriceFor(item))} × {item.quantity}
                    </div>
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
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {t('orders.create.totalWithCount', { count: itemCount })}
              </span>
              <span className="text-2xl font-bold text-primary">{formatPrice(total)}</span>
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
  );
}
