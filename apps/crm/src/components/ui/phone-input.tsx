'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

const PREFIX = '+998';
const MAX_DIGITS = 9;

export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  digits = digits.slice(0, MAX_DIGITS);
  return PREFIX + digits;
}

type PhoneInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> & {
  value: string;
  onChange: (value: string) => void;
  /** Katta sensor/POS ekranlar uchun */
  touchSize?: 'default' | 'pos';
};

const touchSizeClasses: Record<NonNullable<PhoneInputProps['touchSize']>, string> = {
  default: '',
  pos: 'h-14 min-h-[56px] text-xl font-semibold tracking-wide touch-manipulation px-4',
};

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value, onChange, onKeyDown, onFocus, touchSize = 'default', className, ...props }, ref) => {
    const display = normalizePhone(value || '');

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        enterKeyHint={touchSize === 'pos' ? 'search' : 'done'}
        value={display}
        className={cn(touchSizeClasses[touchSize], className)}
        onChange={(e) => onChange(normalizePhone(e.target.value))}
        onFocus={(e) => {
          const len = e.currentTarget.value.length;
          if (e.currentTarget.selectionStart !== null && e.currentTarget.selectionStart < PREFIX.length) {
            e.currentTarget.setSelectionRange(len, len);
          }
          onFocus?.(e);
        }}
        onKeyDown={(e) => {
          const el = e.currentTarget;
          const start = el.selectionStart ?? 0;
          const end = el.selectionEnd ?? 0;
          if (
            (e.key === 'Backspace' && start <= PREFIX.length && end <= PREFIX.length) ||
            (e.key === 'Delete' && start < PREFIX.length)
          ) {
            e.preventDefault();
            el.setSelectionRange(PREFIX.length, PREFIX.length);
          }
          onKeyDown?.(e);
        }}
        {...props}
      />
    );
  },
);
PhoneInput.displayName = 'PhoneInput';
