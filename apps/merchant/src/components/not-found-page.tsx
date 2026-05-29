'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Home, Sparkles, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-16">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--color-primary) 12%, transparent) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="not-found-float absolute left-[8%] top-[18%] text-violet-500/20">
          <Building2 className="h-16 w-16 -rotate-6" strokeWidth={1.25} />
        </div>
        <div className="not-found-float-delayed absolute right-[10%] top-[22%] text-primary/15">
          <Wind className="h-14 w-14 rotate-12" strokeWidth={1.25} />
        </div>
        <div className="not-found-bubble absolute left-[18%] bottom-[28%] h-4 w-4 rounded-full bg-violet-500/25" />
        <div className="not-found-bubble absolute right-[20%] bottom-[26%] h-5 w-5 rounded-full bg-primary/20 [animation-delay:0.8s]" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center text-center">
        <div className="relative mb-8">
          <div className="relative rounded-[2rem] border border-border bg-card/90 p-6 shadow-xl backdrop-blur-sm">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-primary/10">
              <div className="not-found-spin-slow relative h-20 w-20 rounded-full border-2 border-dashed border-violet-500/30">
                <div className="absolute inset-2 flex items-center justify-center rounded-full bg-card shadow-inner">
                  <Sparkles className="h-8 w-8 text-violet-600" />
                </div>
              </div>
            </div>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              platform_route_missing
            </p>
          </div>
        </div>

        <span
          className="bg-gradient-to-br from-violet-600 via-primary to-violet-500 bg-clip-text text-[7rem] font-black leading-none text-transparent sm:text-[8rem]"
          aria-hidden
        >
          404
        </span>
        <span className="sr-only">404</span>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Sahifa topilmadi</h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          Platforma panelida bunday yo&apos;l mavjud emas. Menyu orqali kerakli bo&apos;limga
          qayting.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard">
            <Button size="lg">
              <Home className="h-4 w-4" />
              Panelga qaytish
            </Button>
          </Link>
          <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Orqaga
          </Button>
        </div>
      </main>
    </div>
  );
}
