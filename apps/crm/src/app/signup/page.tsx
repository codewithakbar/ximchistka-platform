'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Copy,
  Lock,
  MapPin,
  Sparkles,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { useI18n } from '@/lib/i18n';
import { ThemeToggle, LanguageToggle } from '@/components/layout/prefs-controls';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const LANDING_URL = process.env.NEXT_PUBLIC_CLIENT_WEB_URL ?? 'https://cleanway.4mi.uz';

type SignupResult = {
  organization: { name: string; slug: string; demoEndsAt: string | null; demoDaysLeft?: number };
  admin: { phone: string; fullName: string; password: string };
  crmUrl: string;
};

export default function SignupPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SignupResult | null>(null);

  const [name, setName] = useState('');
  const [branchName, setBranchName] = useState('Asosiy filial');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const [adminFullName, setAdminFullName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const slugPreview = useMemo(() => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);
  }, [name]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (adminPassword !== confirmPassword) {
      toast.error(t('signup.passwordMismatch'));
      return;
    }
    if (adminPassword.length < 6) {
      toast.error('Parol kamida 6 belgidan iborat bo\'lishi kerak');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/public/trial-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          branchName,
          branchAddress,
          branchPhone: branchPhone || adminPhone,
          contactEmail: contactEmail || undefined,
          adminFullName,
          adminPhone,
          adminPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { message?: string }).message ?? 'Ro\'yxatdan o\'tishda xatolik');
      }
      setResult(data as SignupResult);
      setStep(3);
      toast.success(t('signup.successTitle'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('signup.error'));
    } finally {
      setLoading(false);
    }
  }

  function copyCredentials() {
    if (!result) return;
    const text = `CleanWay CRM\nURL: ${result.crmUrl}/login\nTelefon: ${result.admin.phone}\nParol: ${result.admin.password}`;
    navigator.clipboard.writeText(text);
    toast.success(t('signup.copied'));
  }

  if (step === 3 && result) {
    const demoEnd = result.organization.demoEndsAt
      ? new Date(result.organization.demoEndsAt).toLocaleDateString('uz-UZ')
      : null;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-primary/5">
        <div className="w-full max-w-lg bg-card rounded-2xl border shadow-xl p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold mb-2">{t('signup.successTitle')}</h1>
            <p className="text-muted-foreground">{t('signup.successSub')}</p>
            {demoEnd && (
              <p className="text-sm text-muted-foreground mt-1">Demo muddati: {demoEnd} gacha</p>
            )}
          </div>

          <div className="rounded-xl bg-secondary/60 p-4 space-y-3 text-sm mb-6">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">CRM manzil</span>
              <span className="font-medium text-right">{result.crmUrl}/login</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Telefon</span>
              <span className="font-mono font-medium">{result.admin.phone}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Parol</span>
              <span className="font-mono font-medium">{result.admin.password}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Slug</span>
              <span className="font-mono">{result.organization.slug}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={() => router.push('/login')} size="lg" className="w-full">
              {t('signup.goCrm')}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" onClick={copyCredentials} className="w-full">
              <Copy className="h-4 w-4" />
              {t('signup.copy')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary to-blue-700 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative">
          <a href={LANDING_URL} className="inline-flex items-center gap-3 mb-2 hover:opacity-80 transition-opacity">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-semibold text-lg">CleanWay</span>
          </a>
        </div>
        <div className="relative">
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            {t('signup.brandTitle1')}
            <br />
            <span className="text-blue-200">{t('signup.brandTitle2')}</span>
          </h2>
          <p className="text-blue-100 text-lg max-w-md">{t('signup.brandSub')}</p>
        </div>
        <ul className="relative space-y-3 text-sm text-blue-100">
          {['signup.feature1', 'signup.feature2', 'signup.feature3', 'signup.feature4'].map((key) => (
            <li key={key} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-200 shrink-0" />
              {t(key)}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          <Link href="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-6 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            {t('signup.backLogin')}
          </Link>

          <h1 className="text-2xl font-bold mb-2">{t('signup.title')}</h1>
          <p className="text-muted-foreground mb-6">
            {t('signup.stepOf')} {step} / 2 — {step === 1 ? t('signup.step1') : t('signup.step2')}
          </p>

          <div className="flex gap-2 mb-8">
            <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-secondary'}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-secondary'}`} />
          </div>

          <form onSubmit={step === 2 ? onSubmit : (e) => { e.preventDefault(); setStep(2); }}>
            {step === 1 ? (
              <div className="space-y-4">
                <div>
                  <Label>{t('signup.companyName')}</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Clean Pro Ximchistka"
                    />
                  </div>
                  {slugPreview && (
                    <p className="text-xs text-muted-foreground mt-1.5">Slug: {slugPreview}</p>
                  )}
                </div>
                <div>
                  <Label>{t('signup.branchName')}</Label>
                  <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} required />
                </div>
                <div>
                  <Label>{t('signup.branchAddress')}</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      value={branchAddress}
                      onChange={(e) => setBranchAddress(e.target.value)}
                      required
                      placeholder="Toshkent, Chilonzor..."
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('signup.branchPhone')}</Label>
                  <PhoneInput value={branchPhone} onChange={setBranchPhone} placeholder="+998..." />
                </div>
                <div>
                  <Label>{t('signup.contactEmail')}</Label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="info@firma.uz"
                  />
                </div>
                <Button type="submit" size="lg" className="w-full">
                  {t('signup.next')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label>{t('signup.adminName')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      value={adminFullName}
                      onChange={(e) => setAdminFullName(e.target.value)}
                      required
                      placeholder="Ali Valiyev"
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('signup.adminPhone')}</Label>
                  <PhoneInput value={adminPhone} onChange={setAdminPhone} required placeholder="+998..." />
                </div>
                <div>
                  <Label>{t('signup.adminPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('signup.confirmPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" loading={loading} size="lg" className="flex-[2]">
                    {t('signup.submit')}
                  </Button>
                </div>
              </div>
            )}
          </form>

          <p className="text-xs text-muted-foreground text-center mt-8">
            Akkauntingiz bormi?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              {t('login.submit')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
