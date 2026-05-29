'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, Shirt, Sparkles, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';

type NotFoundPageProps = {
  homeHref?: string;
  homeLabel?: string;
};

export function NotFoundPage({
  homeHref = '/dashboard',
  homeLabel = 'Bosh sahifaga',
}: NotFoundPageProps) {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-16">
      {/* Background */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--color-primary) 12%, transparent) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* Floating laundry */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="not-found-float absolute left-[8%] top-[18%] text-primary/20">
          <Shirt className="h-16 w-16 rotate-[-12deg]" strokeWidth={1.25} />
        </div>
        <div className="not-found-float-delayed absolute right-[10%] top-[22%] text-primary/15">
          <Wind className="h-14 w-14 rotate-12" strokeWidth={1.25} />
        </div>
        <div className="not-found-bubble absolute left-[18%] bottom-[28%] h-4 w-4 rounded-full bg-primary/25" />
        <div className="not-found-bubble absolute left-[22%] bottom-[22%] h-6 w-6 rounded-full bg-primary/15 [animation-delay:1.2s]" />
        <div className="not-found-bubble absolute right-[20%] bottom-[30%] h-5 w-5 rounded-full bg-primary/20 [animation-delay:0.6s]" />
        <div className="not-found-bubble absolute right-[28%] bottom-[18%] h-3 w-3 rounded-full bg-primary/30 [animation-delay:1.8s]" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center text-center">
        {/* Washing machine visual */}
        <div className="relative mb-8">
          <div className="absolute -inset-4 rounded-[2rem] bg-primary/5 blur-xl" />
          <div className="relative rounded-[2rem] border border-border bg-card/80 p-6 shadow-xl shadow-primary/5 backdrop-blur-sm">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border-4 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/15">
              <div className="not-found-spin-slow relative h-20 w-20 rounded-full border-2 border-dashed border-primary/30">
                <div className="absolute inset-2 flex items-center justify-center rounded-full bg-card shadow-inner">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
              </div>
            </div>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              status: lost_in_laundry
            </p>
          </div>
        </div>

        {/* 404 number */}
        <div className="relative mb-4 select-none">
          <span
            className="bg-gradient-to-br from-primary via-blue-600 to-primary/60 bg-clip-text text-[7rem] font-black leading-none tracking-tighter text-transparent sm:text-[8.5rem]"
            aria-hidden
          >
            404
          </span>
          <span className="sr-only">404</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Sahifa topilmadi
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          Bu manzil yuvishdan keyin ham yo&apos;qolgan ko&apos;rinadi — ehtimol noto&apos;g&apos;ri
          havola yoki o&apos;chirilgan sahifaga kirdingiz.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href={homeHref}>
            <Button size="lg">
              <Home className="h-4 w-4" />
              {homeLabel}
            </Button>
          </Link>
          <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Orqaga
          </Button>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Kod: <span className="font-mono text-foreground/70">ERR_PAGE_NOT_FOUND</span>
        </p>
      </main>
    </div>
  );
}
