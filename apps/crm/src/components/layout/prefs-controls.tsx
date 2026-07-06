'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { useI18n, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t('theme.toggleLight') : t('theme.toggleDark')}
      title={isDark ? t('theme.toggleLight') : t('theme.toggleDark')}
      className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();
  const options: Locale[] = ['uz', 'ru'];
  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5">
      {options.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={cn(
            'h-8 px-2.5 rounded-md text-xs font-semibold uppercase transition-colors',
            locale === l
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
