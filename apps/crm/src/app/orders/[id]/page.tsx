'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Building2,
  Phone,
  MapPin,
  Package,
  Calendar,
  CheckCircle2,
  Printer,
} from 'lucide-react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatPrice, getUser } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { OrderReceipt } from '@/components/orders/order-receipt';
import {
  ORDER_STATUS_LABELS,
  OrderStatus,
  VALID_STATUS_TRANSITIONS,
} from '@ximchistka/shared';

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
  customer: {
    user: { fullName: string; phone: string };
    addresses: { address: string; isDefault: boolean }[];
  };
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    service: { name: string; unit?: string };
  }[];
  pickupDelivery: { type: string; address: string | null; scheduledAt: string | null } | null;
  statusHistory: { status: OrderStatus; createdAt: string; user?: { fullName: string } | null }[];
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);

  async function load() {
    const data = await api<OrderDetail>(`/orders/${params.id}`);
    setOrder(data);
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function advance(next: OrderStatus) {
    try {
      await api(`/orders/${params.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      toast.success(`Yangilandi: ${ORDER_STATUS_LABELS[next]}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    }
  }

  const allowedNext = order ? VALID_STATUS_TRANSITIONS[order.status] : [];
  const orgName = getUser<{ organizationName?: string }>()?.organizationName;

  function printReceipt() {
    window.open(`/orders/${params.id}/receipt?print=1`, '_blank');
  }

  return (
    <AppShell title={order ? order.orderNumber : 'Buyurtma'}>
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="h-4 w-4" />
        Orqaga
      </Button>

      {!order ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{order.orderNumber}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Yaratilgan: {formatDate(order.createdAt, true)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={order.status} label={ORDER_STATUS_LABELS[order.status]} />
                    <Button size="sm" variant="outline" onClick={printReceipt}>
                      <Printer className="h-4 w-4" />
                      Chek chop etish
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Filial</div>
                    <div className="font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {order.branch.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Tayyor bo&apos;ladi</div>
                    <div className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {order.estimatedReady ? formatDate(order.estimatedReady, true) : '—'}
                    </div>
                  </div>
                </div>

                <h4 className="text-sm font-semibold mb-3">Buyurtma tarkibi</h4>
                <div className="space-y-2 mb-4">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">{item.service.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.quantity} × {formatPrice(item.unitPrice)}
                          </div>
                        </div>
                      </div>
                      <div className="font-semibold">{formatPrice(item.quantity * item.unitPrice)}</div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 flex justify-between items-center">
                  <span className="font-semibold">Jami</span>
                  <span className="text-xl font-bold text-primary">{formatPrice(order.totalAmount)}</span>
                </div>

                {order.notes && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                    <strong>Eslatma:</strong> {order.notes}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status tarixi</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="relative border-l border-border ml-2 space-y-4">
                  {order.statusHistory.map((h, i) => (
                    <li key={i} className="ml-6">
                      <div className="absolute -left-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </div>
                      <div className="font-medium text-sm">{ORDER_STATUS_LABELS[h.status]}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(h.createdAt, true)}
                        {h.user?.fullName && <> · {h.user.fullName}</>}
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {allowedNext.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Statusni yangilash</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {allowedNext.map((s) => (
                    <Button
                      key={s}
                      variant={s === 'cancelled' ? 'destructive' : 'primary'}
                      className="w-full"
                      onClick={() => advance(s)}
                    >
                      {ORDER_STATUS_LABELS[s]}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Mijoz</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  {order.customer.user.fullName}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {order.customer.user.phone}
                </div>
                {order.pickupDelivery?.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    {order.pickupDelivery.address}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Chek</CardTitle>
                <Button size="sm" variant="outline" onClick={printReceipt}>
                  <Printer className="h-4 w-4" />
                  Chop etish
                </Button>
              </CardHeader>
              <CardContent className="flex justify-center p-4 bg-secondary/50">
                <div className="receipt-print-area rounded-sm border border-border shadow-sm overflow-hidden">
                  <OrderReceipt
                    order={{
                      orderNumber: order.orderNumber,
                      status: order.status,
                      totalAmount: order.totalAmount,
                      discountAmount: order.discountAmount ?? 0,
                      notes: order.notes,
                      createdAt: order.createdAt,
                      estimatedReady: order.estimatedReady,
                      branch: order.branch,
                      customer: order.customer,
                      items: order.items,
                      pickupDelivery: order.pickupDelivery,
                    }}
                    organizationName={orgName}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}
