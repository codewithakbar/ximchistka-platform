'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/shell';
import { useDemoExpired } from '@/components/layout/demo-expired-lock';
import { CreateOrderPos } from '@/components/orders/create-order-pos';
import { useClientRole } from '@/hooks/use-client-auth';
import { canCreateOrders } from '@/lib/roles';
import { useI18n } from '@/lib/i18n';
import { Skeleton } from '@/components/ui/skeleton';

export default function NewOrderPage() {
  const { t } = useI18n();
  const router = useRouter();
  const role = useClientRole();
  const demoExpired = useDemoExpired();

  useEffect(() => {
    if (demoExpired || (role !== null && !canCreateOrders(role))) {
      router.replace('/orders');
    }
  }, [role, router, demoExpired]);

  if (role === null) {
    return (
      <AppShell title={t('orders.pos.title')} flush>
        <div className="p-6 space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }

  if (!canCreateOrders(role)) return null;

  return (
    <AppShell title={t('orders.pos.title')} flush>
      <CreateOrderPos />
    </AppShell>
  );
}
