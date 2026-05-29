'use client';

import { Input, Label, Select } from '@/components/ui/input';
import { applyServiceDiscount } from '@ximchistka/shared';
import { formatPrice } from '@/lib/api';

type DiscountFieldsProps = {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  discountType: 'percent' | 'fixed';
  onDiscountTypeChange: (v: 'percent' | 'fixed') => void;
  discountValue: string;
  onDiscountValueChange: (v: string) => void;
  discountValidUntil: string;
  onDiscountValidUntilChange: (v: string) => void;
  previewBasePrice?: number;
};

export function DiscountFields({
  enabled,
  onEnabledChange,
  discountType,
  onDiscountTypeChange,
  discountValue,
  onDiscountValueChange,
  discountValidUntil,
  onDiscountValidUntilChange,
  previewBasePrice,
}: DiscountFieldsProps) {
  const preview =
    enabled && previewBasePrice != null && discountValue
      ? applyServiceDiscount(previewBasePrice, {
          discountType,
          discountValue: Number(discountValue) || 0,
          discountValidUntil: discountValidUntil || null,
        })
      : null;

  return (
    <div className="rounded-lg border border-border p-4 space-y-3 bg-secondary/30">
      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="accent-primary h-4 w-4"
        />
        Chegirma qo&apos;shish
      </label>

      {enabled && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Turi</Label>
              <Select
                value={discountType}
                onChange={(e) => onDiscountTypeChange(e.target.value as 'percent' | 'fixed')}
              >
                <option value="percent">Foiz (%)</option>
                <option value="fixed">Qat&apos;iy summa</option>
              </Select>
            </div>
            <div>
              <Label>Qiymat</Label>
              <Input
                type="number"
                min={1}
                max={discountType === 'percent' ? 100 : undefined}
                value={discountValue}
                onChange={(e) => onDiscountValueChange(e.target.value)}
                placeholder={discountType === 'percent' ? '10' : '5000'}
                required={enabled}
              />
            </div>
          </div>
          <div>
            <Label>Tugash sanasi (ixtiyoriy)</Label>
            <Input
              type="date"
              value={discountValidUntil}
              onChange={(e) => onDiscountValidUntilChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Bo&apos;sh qoldirsangiz chegirma cheksiz amal qiladi
            </p>
          </div>
          {preview != null && previewBasePrice != null && (
            <p className="text-sm text-primary font-medium">
              Chegirmadan keyin: {formatPrice(preview)}{' '}
              <span className="text-muted-foreground font-normal line-through">
                {formatPrice(previewBasePrice)}
              </span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
