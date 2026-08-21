'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { formatPrice } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

/**
 * Satr narxini kiritish/o'zgartirish oynasi. Ikki holatda ochiladi:
 * konstruktor xizmat (narx majburiy) va kelishilgan narx (ro'yxat narxi
 * ko'rsatiladi, xodim ozgina arzonlashtirishi mumkin).
 */
export function PriceOverrideDialog({
  open,
  serviceName,
  listPrice,
  isCustom = false,
  initialPrice,
  initialNote,
  onClose,
  onSave,
}: {
  open: boolean;
  serviceName: string;
  /** Ro'yxat (filial) narxi — konstruktor xizmatda ko'rsatilmaydi */
  listPrice?: number;
  isCustom?: boolean;
  initialPrice?: number;
  initialNote?: string;
  onClose: () => void;
  onSave: (price: number, note: string) => void;
}) {
  const { t } = useI18n();
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const priceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setPrice(
      initialPrice !== undefined
        ? String(initialPrice)
        : !isCustom && listPrice !== undefined
          ? String(listPrice)
          : '',
    );
    setNote(initialNote ?? '');
    const timer = window.setTimeout(() => {
      priceRef.current?.focus();
      priceRef.current?.select();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [open, initialPrice, initialNote, isCustom, listPrice]);

  if (!open) return null;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Dialog POS formasi ichida turadi — submit tashqi formaga oqib,
    // buyurtma yaratilib ketmasligi kerak
    e.stopPropagation();
    const value = Math.floor(Number(price));
    if (!Number.isFinite(value) || value < 0) {
      toast.error(t('pos.priceInvalid'));
      return;
    }
    onSave(value, note.trim());
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl space-y-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold leading-tight">{serviceName}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isCustom ? t('pos.customServiceHint') : t('pos.priceOverrideHint')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <Label htmlFor="override-price">{t('pos.priceLabel')}</Label>
          <Input
            id="override-price"
            ref={priceRef}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="h-12 text-lg font-semibold"
          />
          {!isCustom && listPrice !== undefined && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t('pos.listPrice')}: {formatPrice(listPrice)}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="override-note">
            {t('common.note')} ({t('common.optional')})
          </Label>
          <Textarea
            id="override-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="resize-none"
            placeholder={t('pos.notePlaceholder')}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            {t('common.save')}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </div>
  );
}
