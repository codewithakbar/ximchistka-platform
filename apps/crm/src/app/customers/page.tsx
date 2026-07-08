'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Users, Phone, ClipboardList, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty } from '@/components/ui/empty';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

type Customer = {
  id: string;
  user: { fullName: string; phone: string };
  orders: { orderNumber: string; status: string }[];
  addresses: { address: string; isDefault: boolean }[];
};

export default function CustomersPage() {
  const { t } = useI18n();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [q, setQ] = useState('');

  const load = useCallback(async (query = '') => {
    setCustomers(null);
    try {
      const data = await api<Customer[]>(
        `/customers${query ? `?q=${encodeURIComponent(query)}` : ''}`,
      );
      setCustomers(data);
    } catch {
      setCustomers([]);
      toast.error(t('customers.toastLoadError'));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell title={t('customers.title')}>
      <Card className="mb-4">
        <CardContent className="pt-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('customers.searchPlaceholder')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load(q)}
              className="pl-10"
            />
          </div>
          <Button variant="secondary" onClick={() => load(q)}>
            {t('common.search')}
          </Button>
        </CardContent>
      </Card>

      {customers === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <Empty icon={Users} title={t('customers.emptyTitle')} description={t('customers.emptyDescription')} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => (
            <Link key={c.id} href={`/customers/${c.id}`}>
              <Card className="hover:shadow-md transition-shadow h-full group">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                      {c.user.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.user.fullName}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {c.user.phone}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ClipboardList className="h-3 w-3" />
                      {t('customers.orderCount', { count: c.orders.length })}
                    </div>
                    {c.orders.length > 0 && (
                      <Badge variant="info">{c.orders[0].orderNumber}</Badge>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-1 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    {t('customers.viewProfile')}
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
