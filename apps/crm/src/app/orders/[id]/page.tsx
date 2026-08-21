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
  Pencil,
  PackageCheck,
  Trash2,
} from 'lucide-react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatPrice, getUser } from '@/lib/api';
import { useFormatDate, useI18n, useOrderStatusLabel } from '@/lib/i18n';
import { OrderReceipt } from '@/components/orders/order-receipt';
import {
  DEFAULT_RECEIPT_SETTINGS,
  normalizeReceiptSettings,
  type ReceiptSettings,
} from '@ximchistka/shared';
import { OrderPaymentPanel, type PaymentSummary } from '@/components/orders/order-payment-panel';
import { HandoverDialog } from '@/components/orders/handover-dialog';
import { EditOrderDialog } from '@/components/orders/edit-order-dialog';
import { useDemoExpired } from '@/components/layout/demo-expired-lock';
import { useCanCreateOrders, useHasRole } from '@/hooks/use-client-auth';
import {
  OrderStatus,
  VALID_STATUS_TRANSITIONS,
} from '@ximchistka/shared';

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  discountAmount: number;
  promoCode?: string | null;
  notes: string | null;
  createdAt: string;
  estimatedReady: string | null;
  branch: { id: string; name: string; address: string; phone: string };
  customer: {
    user: { fullName: string; phone: string };
    addresses: { address: string; isDefault: boolean }[];
  };
  items: {
    id: string;
    serviceId: string;
    quantity: number;
    unitPrice: number;
    color?: string | null;
    notes?: string | null;
    service: { name: string; unit?: string };
  }[];
  pickupDelivery: { type: string; address: string | null; scheduledAt: string | null } | null;
  statusHistory: { status: OrderStatus; createdAt: string; user?: { fullName: string } | null }[];
  payments?: { provider: string; status: string; amount: number }[];
};

export default function OrderDetailPage() {
  const { t } = useI18n();
  const formatDate = useFormatDate();
  const statusLabel = useOrderStatusLabel();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [pending, setPending] = useState<OrderStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>(
    DEFAULT_RECEIPT_SETTINGS,
  );
  const [paySummary, setPaySummary] = useState<PaymentSummary | null>(null);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [payReload, setPayReload] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canDeleteRole = useHasRole('super_admin', 'branch_manager');
  const demoExpired = useDemoExpired();
  const canEditOrders = useCanCreateOrders();
  const canDelete = canDeleteRole && !demoExpired;

  async function load() {
    const data = await api<OrderDetail>(`/orders/${params.id}`);
    setOrder(data);
  }

  useEffect(() => {
    load();
    api<{ organization?: { receiptSettings?: unknown } }>('/settings/profile')
      .then((p) =>
        setReceiptSettings(normalizeReceiptSettings(p.organization?.receiptSettings)),
      )
      .catch(() => {
        /* standart sozlamalar bilan davom etamiz */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function confirmAdvance() {
    if (!pending) return;
    setConfirming(true);
    try {
      await api(`/orders/${params.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: pending }),
      });
      toast.success(t('orderDetail.toastUpdated', { status: statusLabel(pending) }));
      setPending(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setConfirming(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api(`/orders/${params.id}`, { method: 'DELETE' });
      toast.success(t('orderDetail.toastDeleted'));
      router.push('/orders');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
      setDeleting(false);
    }
  }

  const allowedNext = order ? VALID_STATUS_TRANSITIONS[order.status] : [];
  const canEdit =
    canEditOrders &&
    !demoExpired &&
    !!order &&
    order.status !== 'completed' &&
    order.status !== 'cancelled';
  const orgName = getUser<{ organizationName?: string }>()?.organizationName;

  function printReceipt() {
    window.open(`/orders/${params.id}/receipt?print=1`, '_blank');
  }

  return (
    <AppShell title={order ? order.orderNumber : t('orderDetail.title')}>
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </Button>
        {canDelete && order && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            {t('orderDetail.deleteOrder')}
          </Button>
        )}
      </div>

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
                      {t('orderDetail.created')}: {formatDate(order.createdAt, true)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={order.status} label={statusLabel(order.status)} />
                    <div className="flex gap-2">
                      {canEdit && (
                        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                          <Pencil className="h-4 w-4" />
                          {t('common.edit')}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={printReceipt}>
                        <Printer className="h-4 w-4" />
                        {t('orderDetail.printReceipt')}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t('common.branch')}</div>
                    <div className="font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {order.branch.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t('orderDetail.readyAt')}</div>
                    <div className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {order.estimatedReady ? formatDate(order.estimatedReady, true) : '—'}
                    </div>
                  </div>
                </div>

                <h4 className="text-sm font-semibold mb-3">{t('orderDetail.items')}</h4>
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
                            {item.color && (
                              <> · {t('orders.pos.color')}: {item.color}</>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="font-semibold">{formatPrice(item.quantity * item.unitPrice)}</div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 flex justify-between items-center">
                  <span className="font-semibold">{t('common.total')}</span>
                  <span className="text-xl font-bold text-primary">{formatPrice(order.totalAmount)}</span>
                </div>

                {order.notes && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                    <strong>{t('common.note')}:</strong> {order.notes}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('orderDetail.statusHistory')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="relative border-l border-border ml-2 space-y-4">
                  {order.statusHistory.map((h, i) => (
                    <li key={i} className="ml-6">
                      <div className="absolute -left-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </div>
                      <div className="font-medium text-sm">{statusLabel(h.status)}</div>
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
                  <CardTitle>{t('orderDetail.updateStatus')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {allowedNext.map((s) =>
                    s === 'completed' ? (
                      <Button
                        key={s}
                        variant="success"
                        className="w-full"
                        onClick={() => setHandoverOpen(true)}
                      >
                        <PackageCheck className="h-4 w-4" />
                        {t('handover.action')}
                      </Button>
                    ) : (
                      <Button
                        key={s}
                        variant={s === 'cancelled' ? 'destructive' : 'primary'}
                        className="w-full"
                        onClick={() => setPending(s)}
                      >
                        {s === 'ready' ? t('orders.actionReady') : statusLabel(s)}
                      </Button>
                    ),
                  )}
                </CardContent>
              </Card>
            )}

            <OrderPaymentPanel
              orderId={params.id}
              cancelled={order.status === 'cancelled'}
              reloadSignal={payReload}
              onChange={setPaySummary}
            />

            <Card>
              <CardHeader>
                <CardTitle>{t('common.customer')}</CardTitle>
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
                <CardTitle>{t('orderDetail.receipt')}</CardTitle>
                <Button size="sm" variant="outline" onClick={printReceipt}>
                  <Printer className="h-4 w-4" />
                  {t('orderDetail.print')}
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
                      promoCode: order.promoCode,
                      notes: order.notes,
                      createdAt: order.createdAt,
                      estimatedReady: order.estimatedReady,
                      branch: order.branch,
                      customer: order.customer,
                      items: order.items,
                      pickupDelivery: order.pickupDelivery,
                      payments: order.payments,
                    }}
                    organizationName={orgName}
                    settings={receiptSettings}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        variant="destructive"
        title={t('orderDetail.deleteTitle')}
        description={
          order ? t('orderDetail.deleteBody', { order: order.orderNumber }) : null
        }
        confirmLabel={t('orderDetail.deleteOrder')}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      {order && (
        <HandoverDialog
          open={handoverOpen}
          orderId={order.id}
          outstanding={paySummary?.outstanding ?? Math.max(0, order.totalAmount)}
          onClose={() => setHandoverOpen(false)}
          onDone={() => {
            load();
            setPayReload((n) => n + 1);
          }}
        />
      )}

      {order && (
        <EditOrderDialog
          open={editing}
          orderId={order.id}
          branchId={order.branch.id}
          items={order.items.map((i) => ({
            serviceId: i.serviceId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            color: i.color,
            notes: i.notes,
          }))}
          notes={order.notes}
          onClose={() => setEditing(false)}
          onSaved={load}
        />
      )}

      <ConfirmDialog
        open={pending !== null}
        title={t('orders.confirmStatusTitle')}
        variant={pending === 'cancelled' ? 'destructive' : 'primary'}
        description={
          pending ? (
            <>
              {t('orders.confirmStatusDescription', { status: statusLabel(pending) })}
            </>
          ) : null
        }
        confirmLabel={t('common.yesChange')}
        loading={confirming}
        onConfirm={confirmAdvance}
        onCancel={() => setPending(null)}
      />
    </AppShell>
  );
}
