'use client';

import { Layers, Sparkles, Tag } from 'lucide-react';
import {
  applyServiceDiscount,
  discountLabel,
  isServiceDiscountActive,
} from '@ximchistka/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/api';

export type CatalogService = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  basePrice: number;
  discountType: string | null;
  discountValue: number | null;
  discountValidUntil: string | null;
  isActive: boolean;
};

export type CatalogCategory = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  services: CatalogService[];
};

type Props = {
  catalog: {
    categoryCount: number;
    serviceCount: number;
    categories: CatalogCategory[];
  };
};

export function ServiceCatalogPanel({ catalog }: Props) {
  const { categories, categoryCount, serviceCount } = catalog;

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span>Xizmatlar katalogi</span>
          <Badge variant="secondary">{categoryCount} kategoriya</Badge>
          <Badge variant="secondary">{serviceCount} xizmat</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Firma hali kategoriya yoki xizmat qo&apos;shmagan
          </p>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category.id} className="rounded-lg border border-border overflow-hidden">
                <div className="flex items-start justify-between gap-3 px-4 py-3 bg-secondary/40">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Layers className="h-4 w-4 text-violet-600 shrink-0" />
                      <span className="font-medium">{category.name}</span>
                      {!category.isActive && <Badge variant="destructive">Faol emas</Badge>}
                    </div>
                    {category.description && (
                      <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {category.services.length} xizmat
                  </Badge>
                </div>

                {category.services.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">Xizmatlar yo&apos;q</p>
                ) : (
                  <div className="divide-y divide-border">
                    {category.services.map((service) => {
                      const discountActive = isServiceDiscountActive(service);
                      const finalPrice = applyServiceDiscount(service.basePrice, service);
                      const label = discountLabel(service);

                      return (
                        <div
                          key={service.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{service.name}</span>
                              {!service.isActive && (
                                <Badge variant="destructive">Faol emas</Badge>
                              )}
                              {discountActive && label && (
                                <Badge variant="warning" className="gap-1">
                                  <Sparkles className="h-3 w-3" />
                                  {label}
                                </Badge>
                              )}
                            </div>
                            {service.description && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {service.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              {service.unit}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            {discountActive && finalPrice !== service.basePrice ? (
                              <>
                                <div className="text-sm text-muted-foreground line-through">
                                  {formatPrice(service.basePrice)}
                                </div>
                                <div className="font-semibold text-emerald-600">
                                  {formatPrice(finalPrice)}
                                </div>
                              </>
                            ) : (
                              <div className="font-semibold">{formatPrice(service.basePrice)}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
