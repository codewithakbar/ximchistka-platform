'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Rocket,
  Sparkles,
  UserCog,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

const DISMISS_KEY = 'crm-setup-checklist-dismissed';

type StepId = 'branch' | 'catalog' | 'staff' | 'order';

type Step = {
  id: StepId;
  icon: LucideIcon;
  href: string;
  title: string;
  desc: string;
};

type Progress = Record<StepId, boolean>;

/**
 * Yangi firma uchun qadamli sozlash ro'yxati. Faqat super admin ko'radi va
 * faqat hali tugallanmagan qadamlar bo'lsa chiqadi. Har bir qadam haqiqiy
 * ma'lumot bo'yicha tekshiriladi — belgilab qo'yish shart emas.
 */
export function SetupChecklist() {
  const { t, locale } = useI18n();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [dismissed, setDismissed] = useState(true); // localStorage o'qilgunicha ko'rsatmaymiz

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  const load = useCallback(async () => {
    // Har bir tekshiruv mustaqil — biri qulasa qolganlari baribir ishlaydi
    const [branches, categories, staff, orders] = await Promise.all([
      api<{ id: string }[]>('/branches').catch(() => []),
      api<{ services?: unknown[] }[]>('/services/manage/categories').catch(() => []),
      api<{ id: string; role: string }[]>('/users/staff').catch(() => []),
      api<{ data: unknown[] }>('/orders?limit=1').catch(() => ({ data: [] })),
    ]);

    setProgress({
      branch: branches.length > 0,
      // Kategoriya yetarli emas — ichida xizmat bo'lishi kerak, aks holda
      // kassada bosadigan tugma bo'lmaydi
      catalog: categories.some((c) => (c.services?.length ?? 0) > 0),
      // Egadan boshqa xodim qo'shilganmi
      staff: staff.filter((s) => s.role !== 'super_admin').length > 0,
      order: orders.data.length > 0,
    });
  }, []);

  useEffect(() => {
    if (!dismissed) load();
  }, [dismissed, load]);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* localStorage yopiq bo'lsa ham yashiramiz */
    }
    setDismissed(true);
  }

  if (dismissed) return null;

  if (!progress) {
    return (
      <Card className="mb-6">
        <CardContent className="space-y-3 p-5">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  const steps: Step[] = STEPS[locale];
  const done = steps.filter((s) => progress[s.id]).length;

  // Hammasi bajarilgan — ro'yxat endi keraksiz
  if (done === steps.length) return null;

  return (
    <Card className="mb-6 border-primary/25 bg-gradient-to-br from-primary/[0.07] to-transparent">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold leading-tight">{COPY[locale].title}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{COPY[locale].sub}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label={t('common.close')}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(done / steps.length) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-semibold text-muted-foreground">
            {done}/{steps.length}
          </span>
        </div>

        <ul className="mt-4 space-y-1.5">
          {steps.map((step) => {
            const isDone = progress[step.id];
            const Icon = step.icon;
            return (
              <li key={step.id}>
                <Link
                  href={step.href}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                    isDone
                      ? 'border-transparent bg-emerald-500/5'
                      : 'border-border hover:border-primary/40 hover:bg-secondary/50'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isDone ? 'bg-emerald-500/15 text-emerald-600' : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium leading-tight ${
                        isDone ? 'text-muted-foreground line-through' : ''
                      }`}
                    >
                      {step.title}
                    </p>
                    {!isDone && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{step.desc}</p>
                    )}
                  </div>
                  {!isDone && (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <Link
          href="/help"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {COPY[locale].helpLink}
        </Link>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Matnlar                                                             */
/* ------------------------------------------------------------------ */

const COPY = {
  uz: {
    title: 'Tizimni ishga tayyorlash',
    sub: "Kassani ochishdan oldin shu qadamlarni bajaring — 10 daqiqa oladi.",
    helpLink: "To'liq yo'riqnomani ochish",
  },
  ru: {
    title: 'Подготовка системы к работе',
    sub: 'Выполните эти шаги перед открытием кассы — займёт 10 минут.',
    helpLink: 'Открыть полное руководство',
  },
} as const;

const STEPS: Record<'uz' | 'ru', Step[]> = {
  uz: [
    {
      id: 'branch',
      icon: Building2,
      href: '/branches',
      title: 'Filial qo‘shing',
      desc: "Manzil, telefon va ish vaqtini kiriting",
    },
    {
      id: 'catalog',
      icon: Sparkles,
      href: '/services',
      title: 'Xizmatlar katalogini to‘ldiring',
      desc: "Kategoriya va xizmat qo'shmasangiz kassada tugma bo'lmaydi",
    },
    {
      id: 'staff',
      icon: UserCog,
      href: '/staff',
      title: 'Xodim qo‘shing',
      desc: "Operator yoki kuryer qo'shing va filialga biriktiring",
    },
    {
      id: 'order',
      icon: ClipboardList,
      href: '/orders/new',
      title: 'Birinchi buyurtmani oching',
      desc: 'Sinov buyurtmasi bilan hamma narsa ishlashini tekshiring',
    },
  ],
  ru: [
    {
      id: 'branch',
      icon: Building2,
      href: '/branches',
      title: 'Добавьте филиал',
      desc: 'Укажите адрес, телефон и часы работы',
    },
    {
      id: 'catalog',
      icon: Sparkles,
      href: '/services',
      title: 'Заполните каталог услуг',
      desc: 'Без категорий и услуг на кассе не будет кнопок',
    },
    {
      id: 'staff',
      icon: UserCog,
      href: '/staff',
      title: 'Добавьте сотрудника',
      desc: 'Добавьте оператора или курьера и привяжите к филиалу',
    },
    {
      id: 'order',
      icon: ClipboardList,
      href: '/orders/new',
      title: 'Создайте первый заказ',
      desc: 'Проверьте работу системы на пробном заказе',
    },
  ],
};
