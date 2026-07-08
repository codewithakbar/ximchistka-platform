'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ChevronRight,
  Clock,
  Package,
  User,
  Building2,
  Phone,
  MapPin,
  Truck,
  X,
} from 'lucide-react';
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, OrderStatus } from '@ximchistka/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatPrice } from '@/lib/api';
import { formatDate, formatRelative } from '@/lib/utils';
import { cn } from '@/lib/utils';

type OrderSummary = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  branch: { id: string; name: string };
  customer: { fullName: string; phone: string };
  lastStatusAt: string;
};

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  discountAmount: number;
  notes: string | null;
  createdAt: string;
  estimatedReady: string | null;
  branch: { name: string; address: string; phone: string };
  customer: { fullName: string; phone: string; email: string | null };
  items: {
    id: string;
    serviceName: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    itemType: string;
  }[];
  pickupDelivery: {
    type: string;
    address: string | null;
    scheduledAt: string | null;
    completedAt: string | null;
    courier: { fullName: string; phone: string } | null;
  } | null;
  statusHistory: {
    id: string;
    status: OrderStatus;
    note: string | null;
    createdAt: string;
    changedBy: { fullName: string; role: string } | null;
  }[];
};

const PROCESS_ORDER: OrderStatus[] = [
  'submitted',
  'received_at_branch',
  'in_processing',
  'ready',
  'out_for_delivery',
  'completed',
  'cancelled',
];

const DELIVERY_LABELS: Record<string, string> = {
  pickup: 'Olib ketish',
  delivery: 'Yetkazish',
  in_store: "Do'konda",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Bosh admin',
  branch_manager: 'Menejer',
  operator: 'Operator',
  courier: 'Kuryer',
  customer: 'Mijoz',
};

export function OrderProcessPanel({
  orgId,
  ordersByStatus,
  totalOrders,
}: {
  orgId: string;
  ordersByStatus: Record<string, number>;
  totalOrders: number;
}) {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | null>(null);
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api<{ data: OrderSummary[]; total: number }>(
        `/platform/organizations/${orgId}/orders?${params}`,
      );
      setOrders(res.data);
      setTotal(res.total);
    } catch {
      setOrders([]);
      setTotal(0);
    } finally {
      setLoadingList(false);
    }
  }, [orgId, statusFilter, page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    api<OrderDetail>(`/platform/organizations/${orgId}/orders/${selectedId}`)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoadingDetail(false));
  }, [orgId, selectedId]);

  function selectStatus(st: OrderStatus | null) {
    setStatusFilter(st);
    setPage(1);
    setSelectedId(null);
  }

  const totalPages = Math.max(1, Math.ceil(total / 15));

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Buyurtma jarayonlari</CardTitle>
          <p className="text-sm text-muted-foreground">
            Status bo&apos;yicha filtrlang va buyurtma ichiga kirib to&apos;liq tarixni ko&apos;ring
          </p>
        </CardHeader>
        <CardContent>
          {totalOrders === 0 ? (
            <p className="text-sm text-muted-foreground">Hozircha buyurtmalar yo&apos;q</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => selectStatus(null)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    statusFilter === null
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'border-border hover:bg-secondary',
                  )}
                >
                  Barchasi ({totalOrders})
                </button>
                {PROCESS_ORDER.filter((st) => (ordersByStatus[st] ?? 0) > 0).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => selectStatus(st)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors inline-flex items-center gap-1.5',
                      statusFilter === st
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'border-border hover:bg-secondary',
                    )}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: ORDER_STATUS_COLORS[st] }}
                    />
                    {ORDER_STATUS_LABELS[st]} ({ordersByStatus[st]})
                  </button>
                ))}
              </div>

              {loadingList || orders === null ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : orders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Bu statusda buyurtmalar topilmadi
                </p>
              ) : (
                <div className="space-y-2">
                  {orders.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setSelectedId(o.id)}
                      className={cn(
                        'w-full flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition-colors',
                        selectedId === o.id
                          ? 'border-violet-500 bg-violet-500/5'
                          : 'border-border hover:bg-secondary/60',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{o.orderNumber}</span>
                          <StatusBadge status={o.status} label={ORDER_STATUS_LABELS[o.status]} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {o.customer.fullName}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {o.branch.name}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelative(o.lastStatusAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-medium">{formatPrice(o.totalAmount)}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-3">
                      <span className="text-xs text-muted-foreground">
                        Jami {total} ta · {page}/{totalPages} sahifa
                      </span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => p - 1)}
                        >
                          Oldingi
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => p + 1)}
                        >
                          Keyingi
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedId(null)}
          />
          <div className="relative w-full max-w-lg bg-card border-l border-border shadow-xl overflow-y-auto animate-in slide-in-from-right">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card/95 backdrop-blur px-4 py-3">
              <div className="min-w-0">
                <h2 className="font-semibold truncate">
                  {detail?.orderNumber ?? 'Buyurtma'}
                </h2>
                {detail && (
                  <StatusBadge
                    status={detail.status}
                    label={ORDER_STATUS_LABELS[detail.status]}
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {loadingDetail || !detail ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-48 w-full" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-secondary/40">
                      <div className="text-xs text-muted-foreground mb-1">Summa</div>
                      <div className="font-semibold">{formatPrice(detail.totalAmount)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/40">
                      <div className="text-xs text-muted-foreground mb-1">Yaratilgan</div>
                      <div className="font-medium">{formatDate(detail.createdAt, true)}</div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{detail.customer.fullName}</span>
                      <span className="text-muted-foreground">· {detail.customer.phone}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div>{detail.branch.name}</div>
                        <div className="text-xs text-muted-foreground">{detail.branch.address}</div>
                      </div>
                    </div>
                  </div>

                  {detail.items.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Xizmatlar
                      </h3>
                      <div className="space-y-1.5">
                        {detail.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between text-sm p-2 rounded-lg bg-secondary/30"
                          >
                            <span>
                              {item.serviceName} × {item.quantity}
                            </span>
                            <span className="font-medium">
                              {formatPrice(item.unitPrice * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detail.pickupDelivery && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Yetkazish
                      </h3>
                      <div className="text-sm space-y-1 p-3 rounded-lg border border-border">
                        <Badge variant="info">
                          {DELIVERY_LABELS[detail.pickupDelivery.type] ?? detail.pickupDelivery.type}
                        </Badge>
                        {detail.pickupDelivery.address && (
                          <p className="inline-flex items-start gap-1.5 text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            {detail.pickupDelivery.address}
                          </p>
                        )}
                        {detail.pickupDelivery.courier && (
                          <p className="inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            Kuryer: {detail.pickupDelivery.courier.fullName} (
                            {detail.pickupDelivery.courier.phone})
                          </p>
                        )}
                        {detail.pickupDelivery.completedAt && (
                          <p className="text-xs text-emerald-600">
                            Yetkazildi: {formatDate(detail.pickupDelivery.completedAt, true)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Jarayon tarixi
                    </h3>
                    <div className="space-y-0">
                      {detail.statusHistory.map((h, i) => (
                        <div key={h.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span
                              className="h-3 w-3 rounded-full shrink-0 mt-1"
                              style={{ backgroundColor: ORDER_STATUS_COLORS[h.status] }}
                            />
                            {i < detail.statusHistory.length - 1 && (
                              <div className="w-px flex-1 bg-border min-h-[2rem]" />
                            )}
                          </div>
                          <div className="pb-4 min-w-0 flex-1">
                            <div className="font-medium text-sm">
                              {ORDER_STATUS_LABELS[h.status]}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {formatDate(h.createdAt, true)}
                              {h.changedBy && (
                                <span>
                                  {' '}
                                  · {h.changedBy.fullName} (
                                  {ROLE_LABELS[h.changedBy.role] ?? h.changedBy.role})
                                </span>
                              )}
                            </div>
                            {h.note && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                {h.note}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {detail.notes && (
                    <div className="text-sm p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <span className="font-medium">Izoh: </span>
                      {detail.notes}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
