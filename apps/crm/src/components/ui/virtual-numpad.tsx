'use client';

import { Delete, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

type VirtualNumpadProps = {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear?: () => void;
  onSubmit?: () => void;
  submitDisabled?: boolean;
  backspaceLabel?: string;
  submitLabel?: string;
  className?: string;
};

const keyClass =
  'flex items-center justify-center rounded-xl border border-border bg-card text-2xl font-semibold touch-manipulation select-none active:bg-secondary active:scale-[0.98] transition-transform h-16 sm:h-[72px]';

export function VirtualNumpad({
  onDigit,
  onBackspace,
  onClear,
  onSubmit,
  submitDisabled,
  backspaceLabel = 'Backspace',
  submitLabel = 'Search',
  className,
}: VirtualNumpadProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-lg mx-auto', className)}>
      {DIGITS.map((digit) => (
        <button
          key={digit}
          type="button"
          className={keyClass}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => onDigit(digit)}
        >
          {digit}
        </button>
      ))}
      <button
        type="button"
        className={keyClass}
        aria-label={backspaceLabel}
        onPointerDown={(e) => e.preventDefault()}
        onClick={onBackspace}
        onContextMenu={(e) => {
          e.preventDefault();
          onClear?.();
        }}
      >
        <Delete className="h-7 w-7" />
      </button>
      <button
        type="button"
        className={keyClass}
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => onDigit('0')}
      >
        0
      </button>
      <button
        type="button"
        className={cn(
          keyClass,
          'bg-primary text-primary-foreground border-primary disabled:opacity-50',
        )}
        aria-label={submitLabel}
        disabled={submitDisabled}
        onPointerDown={(e) => e.preventDefault()}
        onClick={onSubmit}
      >
        <Search className="h-7 w-7" />
      </button>
    </div>
  );
}
