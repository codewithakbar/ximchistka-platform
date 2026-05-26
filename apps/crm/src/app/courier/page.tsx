'use client';

import { useEffect, useState } from 'react';
import { Truck, MapPin, Phone, Package } from 'lucide-react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty } from '@/components/ui/empty';
import { api } from '@/lib/api';

type Delivery = {
  id: string;
  address: string | null;
  scheduledAt: string | null;
  order: {
    orderNumber: string;
    branch: { name: string };
    customer: { user: { fullName: string; phone: string } };
  };
};

export default function CourierPage() {
  const [tasks, setTasks] = useState<Delivery[] | null>(null);

  useEffect(() => {
    api<Delivery[]>('/courier/unassigned').then(setTasks).catch(() => setTasks([]));
  }, []);

  return (
    <AppShell title="Kuryer vazifalari">
      <p className="text-sm text-muted-foreground mb-4">
        Tayyor, kuryer tayinlanmagan buyurtmalar ro&apos;yxati
      </p>

      {tasks === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : tasks.length === 0 ? (
        <Empty
          icon={Truck}
          title="Vazifalar yo'q"
          description="Hozircha tayinlanmagan yetkazishlar mavjud emas"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((t) => (
            <Card key={t.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{t.order.orderNumber}</div>
                      <div className="text-xs text-muted-foreground">{t.order.branch.name}</div>
                    </div>
                  </div>
                  <Button size="sm">Tayinlash</Button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{t.order.customer.user.fullName} · {t.order.customer.user.phone}</span>
                  </div>
                  {t.address && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{t.address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
