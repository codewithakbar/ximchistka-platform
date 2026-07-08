'use client';

import { FormEvent, useEffect, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { DiscountFields } from './discount-fields';

export type ServiceItem = {
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

export function EditServiceDialog({
  open,
  service,
  onClose,
  onSaved,
}: {
  open: boolean;
  service: ServiceItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('dona');
  const [basePrice, setBasePrice] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [discountValidUntil, setDiscountValidUntil] = useState('');

  useEffect(() => {
    if (open && service) {
      setName(service.name);
      setDescription(service.description ?? '');
      setUnit(service.unit);
      setBasePrice(String(service.basePrice));
      setIsActive(service.isActive);
      const hasDiscount = Boolean(service.discountType && service.discountValue);
      setDiscountEnabled(hasDiscount);
      setDiscountType(
        service.discountType === 'fixed' ? 'fixed' : 'percent',
      );
      setDiscountValue(hasDiscount ? String(service.discountValue) : '');
      setDiscountValidUntil(
        service.discountValidUntil
          ? service.discountValidUntil.slice(0, 10)
          : '',
      );
    }
  }, [open, service]);

  if (!open || !service) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!service) return;
    const serviceId = service.id;
    const price = Number(basePrice);
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Narx noto\'g\'ri');
      return;
    }
    setLoading(true);
    try {
      await api(`/services/${serviceId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          unit: unit.trim() || 'dona',
          basePrice: price,
          isActive,
          discountType: discountEnabled ? discountType : null,
          discountValue: discountEnabled ? Number(discountValue) : null,
          discountValidUntil: discountEnabled && discountValidUntil
            ? new Date(discountValidUntil).toISOString()
            : null,
        }),
      });
      toast.success(t('dialog.service.toastSaved'));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  async function onDelete() {
    if (!service) return;
    setDeleting(true);
    try {
      await api(`/services/${service.id}`, { method: 'DELETE' });
      toast.success(t('services.toastServiceDeleted'));
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-xl border border-border shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">{t('dialog.service.editTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <Label>{t('dialog.service.name')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label>{t('common.description')}</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>O&apos;lchov</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
            <div>
              <Label>Asosiy narx</Label>
              <Input
                type="number"
                min={0}
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                required
              />
            </div>
          </div>
          <DiscountFields
            enabled={discountEnabled}
            onEnabledChange={setDiscountEnabled}
            discountType={discountType}
            onDiscountTypeChange={setDiscountType}
            discountValue={discountValue}
            onDiscountValueChange={setDiscountValue}
            discountValidUntil={discountValidUntil}
            onDiscountValidUntilChange={setDiscountValidUntil}
            previewBasePrice={Number(basePrice) || undefined}
          />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="accent-primary h-4 w-4"
            />
            Faol xizmat (buyurtmada ko&apos;rinadi)
          </label>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
              disabled={loading || deleting}
            >
              <Trash2 className="h-4 w-4" />
              {t('common.delete')}
            </Button>
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancelShort')}
            </Button>
            <Button type="submit" loading={loading} disabled={deleting}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>

    <ConfirmDialog
      open={confirmDelete}
      title={t('services.deleteServiceTitle')}
      description={t('services.deleteServiceConfirm', { name: service.name })}
      variant="destructive"
      confirmLabel={t('common.delete')}
      loading={deleting}
      onConfirm={onDelete}
      onCancel={() => setConfirmDelete(false)}
    />
    </>
  );
}
