'use client';

import { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './button';
import { useI18n } from '@/lib/i18n';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'primary' | 'destructive';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useI18n();
  const resolvedConfirmLabel = confirmLabel ?? t('common.confirm');
  const resolvedCancelLabel = cancelLabel ?? t('common.cancel');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={loading ? undefined : onCancel} />
      <div className="relative w-full max-w-sm bg-card rounded-xl border border-border shadow-xl p-6">
        <div className="flex items-start gap-3">
          <div
            className={
              variant === 'destructive'
                ? 'h-10 w-10 shrink-0 rounded-full bg-destructive/10 text-destructive flex items-center justify-center'
                : 'h-10 w-10 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center'
            }
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && (
              <div className="mt-1 text-sm text-muted-foreground">{description}</div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
            {resolvedCancelLabel}
          </Button>
          <Button type="button" variant={variant} onClick={onConfirm} loading={loading}>
            {resolvedConfirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
