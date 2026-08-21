'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus, Sparkles, Tag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty } from '@/components/ui/empty';
import { Badge } from '@/components/ui/badge';
import { AddCategoryDialog } from '@/components/services/add-category-dialog';
import { AddServiceDialog } from '@/components/services/add-service-dialog';
import {
  EditServiceDialog,
  type ServiceItem,
} from '@/components/services/edit-service-dialog';
import { BranchPricesPanel } from '@/components/services/branch-prices-panel';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { api, formatPrice } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  applyServiceDiscount,
  discountLabel,
  isServiceDiscountActive,
} from '@ximchistka/shared';
import {
  useCanEditBranchPrices,
  useCanManageServicesCatalog,
} from '@/hooks/use-client-auth';
import { useI18n } from '@/lib/i18n';

type Category = {
  id: string;
  name: string;
  description: string | null;
  services: ServiceItem[];
};

/** Massivda elementni ko'chirish (yangi nusxa qaytaradi) */
function moveInArray<T>(arr: T[], index: number, dir: -1 | 1): T[] | null {
  const target = index + dir;
  if (target < 0 || target >= arr.length) return null;
  const next = arr.slice();
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

type Tab = 'catalog' | 'prices';

export default function ServicesPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('catalog');
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [serviceDialog, setServiceDialog] = useState(false);
  const [editService, setEditService] = useState<ServiceItem | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState(false);

  const canManageCatalog = useCanManageServicesCatalog();

  // Kategoriyani yuqo/quyi ko'chirish (optimistik, xatoda qaytariladi)
  async function moveCategory(index: number, dir: -1 | 1) {
    if (!categories) return;
    const next = moveInArray(categories, index, dir);
    if (!next) return;
    const prev = categories;
    setCategories(next);
    try {
      await api('/services/categories/reorder', {
        method: 'POST',
        body: JSON.stringify({ categoryIds: next.map((c) => c.id) }),
      });
    } catch (e) {
      setCategories(prev);
      toast.error(e instanceof Error ? e.message : t('common.error'));
    }
  }

  // Xizmatni kategoriya ichida ko'chirish
  async function moveService(catIndex: number, svcIndex: number, dir: -1 | 1) {
    if (!categories) return;
    const cat = categories[catIndex];
    const nextServices = moveInArray(cat.services, svcIndex, dir);
    if (!nextServices) return;
    const prev = categories;
    const next = categories.slice();
    next[catIndex] = { ...cat, services: nextServices };
    setCategories(next);
    try {
      await api('/services/reorder', {
        method: 'POST',
        body: JSON.stringify({
          categoryId: cat.id,
          serviceIds: nextServices.map((svc) => svc.id),
        }),
      });
    } catch (e) {
      setCategories(prev);
      toast.error(e instanceof Error ? e.message : t('common.error'));
    }
  }

  const canEditPrices = useCanEditBranchPrices();

  const load = useCallback(() => {
    setCategories(null);
    const path = canManageCatalog ? '/services/manage/categories' : '/services/categories';
    api<Category[]>(path)
      .then(setCategories)
      .catch(() => {
        setCategories([]);
        toast.error(t('services.toastLoadError'));
      });
  }, [canManageCatalog, t]);

  useEffect(() => {
    load();
  }, [load]);

  const categoryOptions = (categories ?? []).map((c) => ({ id: c.id, name: c.name }));

  async function confirmDeleteCategory() {
    if (!deleteCategory) return;
    setDeletingCategory(true);
    try {
      await api(`/services/categories/${deleteCategory.id}`, { method: 'DELETE' });
      toast.success(t('services.toastCategoryDeleted'));
      setDeleteCategory(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setDeletingCategory(false);
    }
  }

  return (
    <AppShell title={t('services.title')}>
      <div className="flex flex-col gap-4 mb-6">
        <p className="text-sm text-muted-foreground">
          {t('services.subtitle')}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setTab('catalog')}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                tab === 'catalog'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t('services.tabCatalog')}
            </button>
            <button
              type="button"
              onClick={() => setTab('prices')}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                tab === 'prices'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t('services.tabBranchPrices')}
            </button>
          </div>

          {tab === 'catalog' && canManageCatalog && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCategoryDialog(true)}>
                <Plus className="h-4 w-4" />
                {t('services.addCategory')}
              </Button>
              <Button onClick={() => setServiceDialog(true)} disabled={categoryOptions.length === 0}>
                <Plus className="h-4 w-4" />
                {t('services.addService')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {tab === 'prices' ? (
        <BranchPricesPanel canEdit={canEditPrices} />
      ) : categories === null ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <Empty
          icon={Sparkles}
          title={t('services.emptyTitle')}
          description={t('services.emptyDescription')}
          action={
            canManageCatalog ? (
              <Button onClick={() => setCategoryDialog(true)}>
                <Plus className="h-4 w-4" />
                {t('services.addCategoryAction')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {categories.map((cat, catIndex) => {
            const visible = canManageCatalog
              ? cat.services
              : cat.services.filter((s) => s.isActive);

            if (visible.length === 0) return null;

            return (
              <div key={cat.id}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Tag className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold">{cat.name}</h3>
                      {cat.description && (
                        <p className="text-xs text-muted-foreground">{cat.description}</p>
                      )}
                    </div>
                  </div>
                  {canManageCatalog && (
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={() => moveCategory(catIndex, -1)}
                          disabled={catIndex === 0}
                          title={t('services.moveUp')}
                          className="h-5 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveCategory(catIndex, 1)}
                          disabled={catIndex === categories.length - 1}
                          title={t('services.moveDown')}
                          className="h-5 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteCategory(cat)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {visible.map((s, svcIndex) => (
                    <Card
                      key={s.id}
                      className={cn(
                        'relative transition-shadow',
                        canManageCatalog && 'hover:shadow-md',
                        !s.isActive && 'opacity-70',
                      )}
                    >
                      <CardContent
                        className={cn('pt-4', canManageCatalog && 'cursor-pointer')}
                        onClick={() => canManageCatalog && setEditService(s)}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{s.name}</div>
                            {s.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {s.description}
                              </p>
                            )}
                            <div className="text-xs text-muted-foreground mt-1">
                              {t('services.unitPrefix', { unit: s.unit })}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {s.isCustom ? (
                              <Badge variant="info">{t('services.customBadge')}</Badge>
                            ) : isServiceDiscountActive(s) ? (
                              <>
                                <div className="font-bold text-primary">
                                  {formatPrice(applyServiceDiscount(s.basePrice, s))}
                                </div>
                                <div className="text-xs text-muted-foreground line-through">
                                  {formatPrice(s.basePrice)}
                                </div>
                                <Badge variant="warning" className="mt-1">
                                  {discountLabel(s)}
                                </Badge>
                              </>
                            ) : (
                              <div className="font-bold text-primary">
                                {formatPrice(s.basePrice)}
                              </div>
                            )}
                            {!s.isActive && (
                              <Badge variant="secondary" className="mt-1">
                                {t('common.inactive')}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {canManageCatalog && (
                          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Pencil className="h-3 w-3" />
                              {t('common.edit')}
                            </span>
                            <span className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveService(catIndex, svcIndex, -1);
                                }}
                                disabled={svcIndex === 0}
                                title={t('services.moveUp')}
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveService(catIndex, svcIndex, 1);
                                }}
                                disabled={svcIndex === visible.length - 1}
                                title={t('services.moveDown')}
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddCategoryDialog
        open={categoryDialog}
        onClose={() => setCategoryDialog(false)}
        onCreated={load}
      />
      <AddServiceDialog
        open={serviceDialog}
        onClose={() => setServiceDialog(false)}
        onCreated={load}
        categories={categoryOptions}
      />
      <EditServiceDialog
        open={!!editService}
        service={editService}
        onClose={() => setEditService(null)}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!deleteCategory}
        title={t('services.deleteCategoryTitle')}
        description={
          deleteCategory
            ? t('services.deleteCategoryConfirm', { name: deleteCategory.name })
            : undefined
        }
        variant="destructive"
        confirmLabel={t('common.delete')}
        loading={deletingCategory}
        onConfirm={confirmDeleteCategory}
        onCancel={() => setDeleteCategory(null)}
      />
    </AppShell>
  );
}
