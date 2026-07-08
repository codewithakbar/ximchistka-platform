'use client';

import { useCallback, useEffect, useState } from 'react';
import { Truck, MapPin, Phone, Package, CheckCircle2, Clock, User } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty } from '@/components/ui/empty';
import { StaffAvatar } from '@/components/staff/staff-avatar';
import { api } from '@/lib/api';
import { useI18n, useFormatRelative } from '@/lib/i18n';
import { useClientRole } from '@/hooks/use-client-auth';
import { useRealtimeOrders } from '@/hooks/use-realtime-orders';

type Delivery = {
  id: string;
  type: string;
  address: string | null;
  scheduledAt: string | null;
  completedAt?: string | null;
  courier?: { id: string; fullName: string; phone: string; avatarUrl: string | null } | null;
  order: {
    orderNumber: string;
    branch: { name: string };
    customer: { user: { fullName: string; phone: string } };
  };
};

type Courier = {
  id: string;
  fullName: string;
  phone: string;
  avatarUrl: string | null;
};

export default function CourierPage() {
  const { t } = useI18n();
  const role = useClientRole();
  const isCourier = role === 'courier';

  if (role === null) {
    return (
      <AppShell title={t('courier.title')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </AppShell>
    );
  }

  return isCourier ? <CourierView /> : <DispatcherView />;
}

function DeliveryTypeBadge({ type }: { type: string }) {
  const { t } = useI18n();
  return (
    <Badge variant={type === 'pickup' ? 'warning' : 'info'}>
      {t(`courier.type.${type}`, type)}
    </Badge>
  );
}

/** Kuryer ko'rinishi — o'ziga tayinlangan vazifalar va yakunlash. */
function CourierView() {
  const { t } = useI18n();
  const formatRelative = useFormatRelative();
  const [tasks, setTasks] = useState<Delivery[] | null>(null);
  const [completed, setCompleted] = useState<Delivery[] | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Delivery[]>('/courier/tasks')
      .then(setTasks)
      .catch(() => setTasks([]));
    api<Delivery[]>('/courier/completed')
      .then(setCompleted)
      .catch(() => setCompleted([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeOrders(load);

  const complete = async (id: string) => {
    setCompleting(id);
    try {
      await api(`/courier/deliveries/${id}/complete`, { method: 'PATCH' });
      toast.success(t('courier.toastCompleted'));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setCompleting(null);
    }
  };

  return (
    <AppShell title={t('courier.myTasksTitle')}>
      <p className="text-sm text-muted-foreground mb-6">{t('courier.myTasksSubtitle')}</p>

      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Truck className="h-4 w-4 text-amber-600" />
          {t('courier.activeHeading')}
          {tasks && tasks.length > 0 && <Badge variant="warning">{tasks.length}</Badge>}
        </h2>

        {tasks === null ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : tasks.length === 0 ? (
          <Empty
            icon={Truck}
            title={t('courier.myEmptyTitle')}
            description={t('courier.myEmptyDescription')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold">{task.order.orderNumber}</div>
                        <div className="text-xs text-muted-foreground">{task.order.branch.name}</div>
                      </div>
                    </div>
                    <DeliveryTypeBadge type={task.type} />
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <a href={`tel:${task.order.customer.user.phone}`} className="hover:underline">
                        {task.order.customer.user.fullName} · {task.order.customer.user.phone}
                      </a>
                    </div>
                    {task.address && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{task.address}</span>
                      </div>
                    )}
                    {task.scheduledAt && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>{formatRelative(task.scheduledAt)}</span>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="success"
                    className="w-full"
                    loading={completing === task.id}
                    onClick={() => complete(task.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {t('courier.markDelivered')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {t('courier.completedHeading')}
          {completed && completed.length > 0 && (
            <Badge variant="success">{completed.length}</Badge>
          )}
        </h2>

        {completed === null ? (
          <Skeleton className="h-24" />
        ) : completed.length === 0 ? (
          <Empty
            icon={CheckCircle2}
            title={t('courier.completedEmptyTitle')}
            description={t('courier.completedEmptyDescription')}
          />
        ) : (
          <div className="space-y-2">
            {completed.map((task) => (
              <Card key={task.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {task.order.orderNumber}
                          <span className="text-muted-foreground font-normal">
                            {' '}· {task.order.customer.user.fullName}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {task.order.branch.name}
                          {task.address ? ` · ${task.address}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <DeliveryTypeBadge type={task.type} />
                      {task.completedAt && (
                        <span className="hidden sm:inline text-xs text-muted-foreground">
                          {formatRelative(task.completedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

/** Operator/menejer ko'rinishi — tayinlash va yo'ldagilarni kuzatish. */
function DispatcherView() {
  const { t } = useI18n();
  const formatRelative = useFormatRelative();
  const [unassigned, setUnassigned] = useState<Delivery[] | null>(null);
  const [active, setActive] = useState<Delivery[] | null>(null);
  const [history, setHistory] = useState<Delivery[] | null>(null);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [assignFor, setAssignFor] = useState<Delivery | null>(null);

  const load = useCallback(() => {
    api<Delivery[]>('/courier/unassigned')
      .then(setUnassigned)
      .catch(() => setUnassigned([]));
    api<Delivery[]>('/courier/active')
      .then(setActive)
      .catch(() => setActive([]));
    api<Delivery[]>('/courier/history')
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);

  useEffect(() => {
    load();
    api<Courier[]>('/courier/couriers')
      .then(setCouriers)
      .catch(() => setCouriers([]));
  }, [load]);

  useRealtimeOrders(load);

  return (
    <AppShell title={t('courier.title')}>
      <p className="text-sm text-muted-foreground mb-6">{t('courier.subtitle')}</p>

      <section className="mb-8">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Package className="h-4 w-4 text-amber-600" />
          {t('courier.unassignedHeading')}
          {unassigned && unassigned.length > 0 && (
            <Badge variant="warning">{unassigned.length}</Badge>
          )}
        </h2>

        {unassigned === null ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : unassigned.length === 0 ? (
          <Empty
            icon={Truck}
            title={t('courier.emptyTitle')}
            description={t('courier.emptyDescription')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unassigned.map((task) => (
              <Card key={task.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold">{task.order.orderNumber}</div>
                        <div className="text-xs text-muted-foreground">{task.order.branch.name}</div>
                      </div>
                    </div>
                    <DeliveryTypeBadge type={task.type} />
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>
                        {task.order.customer.user.fullName} · {task.order.customer.user.phone}
                      </span>
                    </div>
                    {task.address && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{task.address}</span>
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => setAssignFor(task)}
                    disabled={couriers.length === 0}
                  >
                    <User className="h-4 w-4" />
                    {t('courier.assign')}
                  </Button>
                  {couriers.length === 0 && (
                    <p className="mt-2 text-xs text-muted-foreground text-center">
                      {t('courier.noCouriers')}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Truck className="h-4 w-4 text-blue-600" />
          {t('courier.activeHeading')}
          {active && active.length > 0 && <Badge variant="info">{active.length}</Badge>}
        </h2>

        {active === null ? (
          <Skeleton className="h-24" />
        ) : active.length === 0 ? (
          <Empty
            icon={Truck}
            title={t('courier.activeEmptyTitle')}
            description={t('courier.activeEmptyDescription')}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {active.map((task) => (
              <Card key={task.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold">{task.order.orderNumber}</div>
                        <div className="text-xs text-muted-foreground">{task.order.branch.name}</div>
                      </div>
                    </div>
                    <DeliveryTypeBadge type={task.type} />
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>
                        {task.order.customer.user.fullName} · {task.order.customer.user.phone}
                      </span>
                    </div>
                    {task.address && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{task.address}</span>
                      </div>
                    )}
                    {task.courier && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border mt-2">
                        <StaffAvatar
                          name={task.courier.fullName}
                          src={task.courier.avatarUrl}
                          role="courier"
                          size="sm"
                        />
                        <div className="text-xs">
                          <div className="font-medium text-foreground">
                            {task.courier.fullName}
                          </div>
                          <div className="text-muted-foreground">{task.courier.phone}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {t('courier.completedHeading')}
          {history && history.length > 0 && (
            <Badge variant="success">{history.length}</Badge>
          )}
        </h2>

        {history === null ? (
          <Skeleton className="h-24" />
        ) : history.length === 0 ? (
          <Empty
            icon={CheckCircle2}
            title={t('courier.historyEmptyTitle')}
            description={t('courier.historyEmptyDescription')}
          />
        ) : (
          <div className="space-y-2">
            {history.map((task) => (
              <Card key={task.id}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {task.order.orderNumber}
                          <span className="text-muted-foreground font-normal">
                            {' '}· {task.order.customer.user.fullName}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {task.order.branch.name}
                          {task.courier ? ` · ${task.courier.fullName}` : ''}
                          {task.completedAt ? ` · ${formatRelative(task.completedAt)}` : ''}
                        </div>
                      </div>
                    </div>
                    <DeliveryTypeBadge type={task.type} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {assignFor && (
        <AssignDialog
          delivery={assignFor}
          couriers={couriers}
          onClose={() => setAssignFor(null)}
          onAssigned={() => {
            setAssignFor(null);
            load();
          }}
        />
      )}
    </AppShell>
  );
}

function AssignDialog({
  delivery,
  couriers,
  onClose,
  onAssigned,
}: {
  delivery: Delivery;
  couriers: Courier[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!selected) {
      toast.error(t('courier.selectCourier'));
      return;
    }
    setLoading(true);
    try {
      await api(`/courier/deliveries/${delivery.id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ courierId: selected }),
      });
      toast.success(t('courier.toastAssigned'));
      onAssigned();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={loading ? undefined : onClose} />
      <div className="relative w-full max-w-sm bg-card rounded-xl border border-border shadow-xl p-6">
        <h2 className="text-lg font-semibold">{t('courier.assignTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('courier.assignDescription', { orderNumber: delivery.order.orderNumber })}
        </p>

        <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
          {couriers.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelected(c.id)}
              className={`w-full flex items-center gap-3 rounded-lg border p-2.5 text-left transition-colors ${
                selected === c.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-secondary'
              }`}
            >
              <StaffAvatar name={c.fullName} src={c.avatarUrl} role="courier" size="sm" />
              <div className="min-w-0">
                <div className="font-medium truncate">{c.fullName}</div>
                <div className="text-xs text-muted-foreground truncate">{c.phone}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={submit} loading={loading} disabled={!selected}>
            {t('courier.assign')}
          </Button>
        </div>
      </div>
    </div>
  );
}
