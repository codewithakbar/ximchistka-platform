'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

const COLOR_PRESET_KEYS = [
  'orders.pos.colorBlack',
  'orders.pos.colorWhite',
  'orders.pos.colorGray',
  'orders.pos.colorBlue',
  'orders.pos.colorRed',
  'orders.pos.colorGreen',
  'orders.pos.colorYellow',
  'orders.pos.colorBrown',
  'orders.pos.colorBeige',
] as const;

type CartItemColorPickerProps = {
  value: string;
  otherOpen: boolean;
  onChange: (color: string) => void;
  onOtherOpenChange: (open: boolean) => void;
};

export function CartItemColorPicker({
  value,
  otherOpen,
  onChange,
  onOtherOpenChange,
}: CartItemColorPickerProps) {
  const { t } = useI18n();
  const presets = COLOR_PRESET_KEYS.map((key) => ({ key, label: t(key) }));
  const presetLabels = new Set(presets.map((p) => p.label));
  const isOtherActive = otherOpen || (value.length > 0 && !presetLabels.has(value));

  return (
    <div className="space-y-1.5 pt-1 border-t border-border/60">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        {t('orders.pos.color')}
      </div>
      <div className="flex flex-wrap gap-1">
        {presets.map((preset) => {
          const selected = !isOtherActive && value === preset.label;
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => {
                if (selected) {
                  onChange('');
                  onOtherOpenChange(false);
                } else {
                  onChange(preset.label);
                  onOtherOpenChange(false);
                }
              }}
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors touch-manipulation',
                selected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border hover:bg-secondary',
              )}
            >
              {preset.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            onOtherOpenChange(true);
            if (presetLabels.has(value)) onChange('');
          }}
          className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors touch-manipulation',
            isOtherActive
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card border-border hover:bg-secondary',
          )}
        >
          {t('orders.pos.colorOther')}
        </button>
      </div>
      {isOtherActive && (
        <Input
          value={presetLabels.has(value) ? '' : value}
          onChange={(e) => onChange(e.target.value.slice(0, 40))}
          placeholder={t('orders.pos.colorOtherPlaceholder')}
          className="h-8 text-xs"
        />
      )}
    </div>
  );
}
