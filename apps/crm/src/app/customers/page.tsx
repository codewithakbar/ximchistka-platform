'use client';

import { useEffect, useState } from 'react';
import { Search, Users, Phone, ClipboardList } from 'lucide-react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty } from '@/components/ui/empty';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

type Customer = {
  id: string;
  user: { fullName: string; phone: string };
  orders: { orderNumber: string; status: string }[];
  addresses: { address: string; isDefault: boolean }[];
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [q, setQ] = useState('');

  async function load(query = '') {
    setCustomers(null);
    const data = await api<Customer[]>(`/customers${query ? `?q=${encodeURIComponent(query)}` : ''}`);
    setCustomers(data);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell title="Mijozlar">
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Mijoz ismi yoki telefon raqami..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load(q)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {customers === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : customers.length === 0 ? (
        <Empty icon={Users} title="Mijozlar topilmadi" description="Qidiruvni o'zgartiring" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
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
                    {c.orders.length} ta buyurtma
                  </div>
                  {c.orders.length > 0 && (
                    <Badge variant="info">{c.orders[0].orderNumber}</Badge>
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
