'use client';

import { FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Phone, ArrowLeft, Shield, User } from 'lucide-react';
import { toast } from 'sonner';
import { api, saveAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegister = searchParams.get('mode') === 'register';

  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [devCode, setDevCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function requestOtp(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api<{ devCode?: string }>('/auth/otp/request', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      if (res.devCode) {
        setDevCode(res.devCode);
        setCode(res.devCode);
      }
      setStep('otp');
      toast.success('Kod yuborildi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api<{ accessToken: string; refreshToken: string; user: unknown }>(
        '/auth/otp/verify',
        {
          method: 'POST',
          body: JSON.stringify({
            phone,
            code,
            ...(fullName.trim() ? { fullName: fullName.trim() } : {}),
          }),
        },
      );
      saveAuth(data);
      toast.success('Xush kelibsiz!');
      router.push('/home');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kod xato');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="relative bg-gradient-to-br from-primary to-teal-600 text-white pt-12 pb-16 px-6 overflow-hidden">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

        <div className="relative max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mark.png" alt="CleanWay" className="h-9 w-9 rounded-2xl shadow-sm" />
            <span className="font-semibold">CleanWay</span>
          </div>

          <h1 className="text-3xl font-bold leading-tight mb-2">
            {isRegister ? (
              <>
                Ro&apos;yxatdan o&apos;ting,
                <br />
                <span className="text-teal-100">buyurtma bering</span>
              </>
            ) : (
              <>
                Sof kiyim,
                <br />
                <span className="text-teal-100">oson buyurtma</span>
              </>
            )}
          </h1>
          <p className="text-teal-100">
            {isRegister ? 'Ism va telefon raqamingiz bilan tez ro\'yxatdan o\'ting' : 'Telefon raqamingiz bilan tezda kiring'}
          </p>
        </div>
      </div>

      <div className="flex-1 -mt-8 px-6">
        <div className="max-w-md mx-auto bg-card rounded-3xl shadow-xl border border-border p-6 animate-slide-up">
          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.form
                key="phone"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={requestOtp}
                autoComplete="off"
              >
                {isRegister && (
                  <>
                    <Label>Ismingiz</Label>
                    <div className="relative mb-4">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        className="pl-12"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ism familiya"
                        required
                      />
                    </div>
                  </>
                )}
                <Label>Telefon raqami</Label>
                <div className="relative mb-4">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <PhoneInput
                    className="pl-12"
                    value={phone}
                    onChange={setPhone}
                    placeholder="+998 90 123 45 67"
                  />
                </div>
                <Button type="submit" loading={loading} size="lg" className="w-full">
                  {isRegister ? 'Ro\'yxatdan o\'tish' : 'Kod olish'}
                  {!loading && <ArrowRight className="h-5 w-5" />}
                </Button>

                <p className="text-sm text-center text-muted-foreground mt-4">
                  {isRegister ? (
                    <>
                      Akkauntingiz bormi?{' '}
                      <Link href="/login" className="text-primary font-medium">
                        Kirish
                      </Link>
                    </>
                  ) : (
                    <>
                      Yangi mijozmisiz?{' '}
                      <Link href="/login?mode=register" className="text-primary font-medium">
                        Ro&apos;yxatdan o&apos;tish
                      </Link>
                    </>
                  )}
                </p>

                <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
                  <Shield className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>Ma&apos;lumotlaringiz xavfsiz saqlanadi va uchinchi shaxslarga berilmaydi</span>
                </div>
              </motion.form>
            ) : (
              <motion.form
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={verifyOtp}
                autoComplete="off"
              >
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="flex items-center gap-1 text-sm text-muted-foreground mb-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Orqaga
                </button>

                <Label>SMS kod</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  {phone} raqamiga yuborilgan 6 xonali kodni kiriting
                </p>
                <Input
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                />

                {devCode && (
                  <div className="mt-3 rounded-xl bg-secondary p-3 text-xs">
                    <span className="text-muted-foreground">Dev kod: </span>
                    <span className="font-mono font-semibold">{devCode}</span>
                  </div>
                )}

                <Button type="submit" loading={loading} size="lg" className="w-full mt-4">
                  Tasdiqlash
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
