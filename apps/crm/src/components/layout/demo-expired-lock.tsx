'use client';

import { createContext, useContext } from 'react';
import { Send, LogOut, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { clearAuth, getUser } from '@/lib/api';
import { disconnectSocket } from '@/lib/socket';
import { useI18n } from '@/lib/i18n';

export const DemoExpiredContext = createContext(false);

export function useDemoExpired() {
  const ctx = useContext(DemoExpiredContext);
  if (ctx) return true;
  if (typeof window === 'undefined') return false;
  return getUser<{ demoExpired?: boolean }>()?.demoExpired === true;
}

const SUPPORT_TELEGRAM = 'https://t.me/avilab_uz_support';

export function DemoExpiredLock({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4 text-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label={t('common.close')}
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center text-lg font-bold">
          !
        </div>
        <div>
          <h2 className="text-lg font-semibold">{t('demoExpired.title')}</h2>
          <p className="text-sm text-muted-foreground mt-2">{t('demoExpired.body')}</p>
        </div>
        <a
          href={SUPPORT_TELEGRAM}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2AABEE] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#229ED9] transition-colors"
        >
          <Send className="h-4 w-4" />
          @avilab_uz_support
        </a>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            disconnectSocket();
            clearAuth();
            router.replace('/login');
          }}
        >
          <LogOut className="h-4 w-4" />
          {t('nav.logout')}
        </Button>
      </div>
    </div>
  );
}
