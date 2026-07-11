'use client';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

type CartItemColorPickerProps = {
  options: string[];
  value: string;
  onChange: (color: string) => void;
};

export function CartItemColorPicker({ options, value, onChange }: CartItemColorPickerProps) {
  const { t } = useI18n();

  if (options.length === 0) return null;

  return (
    <div className="space-y-1.5 pt-1 border-t border-border/60">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        {t('orders.pos.color')}
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map((label) => {
          const selected = value === label;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onChange(selected ? '' : label)}
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors touch-manipulation',
                selected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border hover:bg-secondary',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
