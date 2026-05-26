'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Plus, Tag } from 'lucide-react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty } from '@/components/ui/empty';
import { Badge } from '@/components/ui/badge';
import { api, formatPrice } from '@/lib/api';

type Category = {
  id: string;
  name: string;
  description: string | null;
  services: { id: string; name: string; basePrice: number; unit: string; isActive: boolean }[];
};

export default function ServicesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    api<Category[]>('/services/categories').then(setCategories);
  }, []);

  return (
    <AppShell title="Xizmatlar va narxlar">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          Xizmatlar katalogini boshqaring va narxlarni belgilang
        </p>
        <div className="flex gap-2">
          <Button variant="outline">
            <Plus className="h-4 w-4" />
            Kategoriya
          </Button>
          <Button>
            <Plus className="h-4 w-4" />
            Xizmat
          </Button>
        </div>
      </div>

      {categories === null ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <Empty icon={Sparkles} title="Xizmatlar yo'q" description="Birinchi kategoriyani qo'shing" />
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => (
            <div key={cat.id}>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Tag className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold">{cat.name}</h3>
                  {cat.description && (
                    <p className="text-xs text-muted-foreground">{cat.description}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {cat.services.map((s) => (
                  <Card key={s.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 flex justify-between items-center">
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">1 {s.unit}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-primary">{formatPrice(s.basePrice)}</div>
                        {!s.isActive && <Badge variant="secondary" className="mt-1">No&apos;faol</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
