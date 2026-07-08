'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { Input } from './input';
import { cn } from '@/lib/utils';

const PREFIX = '+998';
const MAX_DIGITS = 9;

function localDigits(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('998')) digits = digits.slice(3);
  return digits.slice(0, MAX_DIGITS);
}

export function normalizePhone(input: string): string {
  return PREFIX + localDigits(input);
}

export function appendPhoneDigit(current: string, digit: string): string {
  const digits = localDigits(current);
  if (digits.length >= MAX_DIGITS) return normalizePhone(current);
  return normalizePhone(digits + digit.replace(/\D/g, '').slice(-1));
}

export function backspacePhone(current: string): string {
  return normalizePhone(localDigits(current).slice(0, -1));
}

type PhoneInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type'
> & {
  value: string;
  onChange: (value: string) => void;
  /** Katta sensor/POS ekranlar uchun */
  touchSize?: 'default' | 'pos';
  /** Fokusda ekran raqamli klaviaturani ham ochish (fizik klaviatura ham ishlaydi) */
  virtualPad?: boolean;
  onVirtualPadOpen?: () => void;
};

const touchSizeClasses: Record<NonNullable<PhoneInputProps['touchSize']>, string> = {
  default: '',
  pos: 'h-14 min-h-[56px] text-xl font-semibold tracking-wide touch-manipulation px-4',
};

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  (
    {
      value,
      onChange,
      onKeyDown,
      onFocus,
      onPointerDown,
      touchSize = 'default',
      virtualPad = false,
      onVirtualPadOpen,
      className,
      readOnly: readOnlyProp,
      inputMode: inputModeProp,
      ...props
    },
    ref,
  ) => {
    const display = normalizePhone(value || '');

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode={inputModeProp ?? 'numeric'}
        autoComplete="tel"
        readOnly={readOnlyProp}
        enterKeyHint={touchSize === 'pos' ? 'search' : 'done'}
        value={display}
        className={cn(touchSizeClasses[touchSize], className)}
        onChange={(e) => onChange(normalizePhone(e.target.value))}
        onPointerDown={(e) => {
          if (virtualPad) {
            onVirtualPadOpen?.();
          }
          onPointerDown?.(e);
        }}
        onFocus={(e) => {
          if (virtualPad) {
            onVirtualPadOpen?.();
          }
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
