'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, Lock, ArrowRight, Send, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { api, saveAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { useI18n } from '@/lib/i18n';
import { ThemeToggle, LanguageToggle } from '@/components/layout/prefs-controls';

const LANDING_URL = process.env.NEXT_PUBLIC_CLIENT_WEB_URL ?? 'https://cleanway.4mi.uz';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'password' | 'telegram'>('password');
  const [tgCode, setTgCode] = useState('');
  const [tgCodeSent, setTgCodeSent] = useState(false);
  const [tgSending, setTgSending] = useState(false);
  const [botUsername, setBotUsername] = useState<string | null>(null);

  useEffect(() => {
    api<{ configured: boolean; username: string | null }>('/auth/telegram/bot')
      .then((info) => setBotUsername(info.configured ? info.username : null))
      .catch(() => setBotUsername(null));
  }, []);

  type LoginResponse = {
    accessToken: string;
    refreshToken: string;
    user: { id: string; role: string; fullName?: string; phone?: string; organizationId?: string; branchIds?: string[] };
  };

  async function finishLogin(data: LoginResponse) {
    saveAuth(data);
      try {
        const profile = await api<{
          fullName: string;
          role: string;
          organizationId?: string;
          organization?: { name: string };
        }>(
          '/settings/profile',
          { headers: { Authorization: `Bearer ${data.accessToken}` } },
        );
        saveAuth({
          ...data,
          user: {
            ...data.user,
            fullName: profile.fullName,
            role: profile.role,
            organizationId: profile.organizationId,
            organizationName: profile.organization?.name,
          },
        });
      } catch {
        /* profile optional on login */
      }
      toast.success(`${t('login.welcome')}${data.user.fullName ? `, ${data.user.fullName}` : ''}!`);
    router.push('/dashboard');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 12) {
      toast.error(t('orders.create.toastPhoneIncomplete'));
      return;
    }
    setLoading(true);
    try {
      const data = await api<LoginResponse>('/auth/staff/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      });
      await finishLogin(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('login.error'));
    } finally {
      setLoading(false);
    }
  }

  function humanizeError(err: unknown): string {
    const msg = err instanceof Error ? err.message : t('login.error');
    if (msg.includes('Too Many Requests') || msg.includes('ThrottlerException')) {
      return t('login.tg.tooMany');
    }
    return msg;
  }

  async function requestTelegramCode() {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 12) {
      toast.error(t('orders.create.toastPhoneIncomplete'));
      return;
    }
    setTgSending(true);
    try {
      await api('/auth/telegram/request', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      setTgCodeSent(true);
      toast.success(t('login.tg.codeSent'));
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setTgSending(false);
    }
  }

  async function onTelegramSubmit(e: FormEvent) {
    e.preventDefault();
    if (tgCode.trim().length < 4) {
      toast.error(t('login.tg.enterCode'));
      return;
    }
    setLoading(true);
    try {
      const data = await api<LoginResponse>('/auth/telegram/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, code: tgCode.trim() }),
      });
      await finishLogin(data);
    } catch (err) {
      toast.error(humanizeError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary to-blue-700 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative">
          <a href={LANDING_URL} className="inline-flex items-center gap-3 mb-2 hover:opacity-80 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="CleanWay" className="h-10 w-10 rounded-xl shadow-sm" />
            <span className="font-semibold text-lg">CleanWay CRM</span>
          </a>
        </div>
        <div className="relative">
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            {t('login.brandTitle1')}
            <br />
            <span className="text-blue-200">{t('login.brandTitle2')}</span>
          </h2>
          <p className="text-blue-100 text-lg max-w-md">{t('login.brandSub')}</p>
        </div>
        <div className="relative grid grid-cols-3 gap-4 max-w-md">
          {[
            { v: '24/7', l: t('login.stat.orders') },
            { v: '∞', l: t('login.stat.branches') },
            { v: t('login.stat.setupVal'), l: t('login.stat.setup') },
          ].map((s) => (
            <div key={s.l} className="rounded-xl bg-white/10 backdrop-blur p-4 border border-white/10">
              <div className="text-2xl font-bold">{s.v}</div>
              <div className="text-xs text-blue-100 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          <a href={LANDING_URL} className="lg:hidden flex items-center gap-3 mb-8 hover:opacity-80 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="CleanWay" className="h-10 w-10 rounded-xl shadow-sm" />
            <span className="font-semibold text-lg">CleanWay CRM</span>
          </a>

          <h1 className="text-2xl font-bold mb-2">{t('login.title')}</h1>
          <p className="text-muted-foreground mb-8">{t('login.subtitle')}</p>

          {botUsername && (
            <div className="mb-5 flex rounded-lg border border-border p-1 bg-card">
              <button
                type="button"
                onClick={() => setMode('password')}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-semibold transition-colors ${
                  mode === 'password'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Lock className="h-4 w-4" />
                {t('login.tg.modePassword')}
              </button>
              <button
                type="button"
                onClick={() => setMode('telegram')}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-semibold transition-colors ${
                  mode === 'telegram'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Send className="h-4 w-4" />
                Telegram
              </button>
            </div>
          )}

          <form
            onSubmit={mode === 'telegram' ? onTelegramSubmit : onSubmit}
            className="space-y-4"
            autoComplete="off"
            noValidate
          >
            <div>
              <Label>{t('login.phone')}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <PhoneInput
                  className="pl-10"
                  value={phone}
                  onChange={setPhone}
                  placeholder="+998 90 123 45 67"
                />
              </div>
            </div>

            {mode === 'password' ? (
              <div>
                <Label>{t('login.password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between">
                    <Label>{t('login.tg.code')}</Label>
                    <button
                      type="button"
                      onClick={requestTelegramCode}
                      disabled={tgSending}
                      className="text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      {tgSending
                        ? t('login.tg.sending')
                        : tgCodeSent
                          ? t('login.tg.resend')
                          : t('login.tg.sendCode')}
                    </button>
                  </div>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10 tracking-[0.3em] font-semibold"
                      inputMode="numeric"
                      maxLength={6}
                      value={tgCode}
                      onChange={(e) => setTgCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                    />
                  </div>
                  {tgCodeSent && (
                    <p className="mt-1.5 text-xs text-emerald-600">
                      {t('login.tg.codeSent')}
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('login.tg.hint')}{' '}
                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium hover:underline"
                  >
                    @{botUsername}
                  </a>{' '}
                  {t('login.tg.hint2')}
                </p>
              </>
            )}

            <Button
              type="submit"
              loading={loading}
              size="lg"
              className="w-full"
            >
              {t('login.submit')}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-6">
            {t('login.noAccount')}{' '}
            <a href="/signup" className="text-primary font-medium hover:underline">
              {t('login.getDemo')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
