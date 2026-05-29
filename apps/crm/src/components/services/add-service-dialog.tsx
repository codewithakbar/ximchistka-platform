'use client';

import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { api } from '@/lib/api';
import { DiscountFields } from './discount-fields';

type CategoryOption = { id: string; name: string };

export function AddServiceDialog({
  open,
  onClose,
  onCreated,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  categories: CategoryOption[];
}) {
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('dona');
  const [basePrice, setBasePrice] = useState('');
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [discountValidUntil, setDiscountValidUntil] = useState('');

  useEffect(() => {
    if (open && categories.length > 0) {
      setCategoryId(categories[0].id);
      setName('');
      setDescription('');
      setUnit('dona');
      setBasePrice('');
      setDiscountEnabled(false);
      setDiscountType('percent');
      setDiscountValue('');
      setDiscountValidUntil('');
    }
  }, [open, categories]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const price = Number(basePrice);
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Narx noto\'g\'ri');
      return;
    }
    setLoading(true);
    try {
      await api('/services', {
        method: 'POST',
        body: JSON.stringify({
          categoryId,
          name: name.trim(),
          description: description.trim() || undefined,
          unit: unit.trim() || 'dona',
          basePrice: price,
          discountType: discountEnabled ? discountType : undefined,
          discountValue: discountEnabled ? Number(discountValue) : undefined,
          discountValidUntil:
            discountEnabled && discountValidUntil
              ? new Date(discountValidUntil).toISOString()
              : undefined,
        }),
      });
      toast.success('Xizmat qo\'shildi');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-xl border border-border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Yangi xizmat</h2>
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
            <Label>Kategoriya</Label>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Xizmat nomi</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ko'ylak" />
          </div>
          <div>
            <Label>Tavsif (ixtiyoriy)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Oddiy press yoki kimyo"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>O&apos;lchov</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="dona" />
            </div>
            <div>
              <Label>Asosiy narx (so&apos;m)</Label>
              <Input
                type="number"
                min={0}
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                required
                placeholder="25000"
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
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Bekor
            </Button>
            <Button type="submit" className="flex-1" loading={loading} disabled={categories.length === 0}>
              Qo&apos;shish
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
