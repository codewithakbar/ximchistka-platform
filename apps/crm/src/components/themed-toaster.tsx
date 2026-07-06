'use client';

import { Toaster } from 'sonner';
import { useTheme } from '@/lib/theme';

export function ThemedToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      position="top-right"
      theme={theme}
      toastOptions={{ className: 'border border-border' }}
    />
  );
}
