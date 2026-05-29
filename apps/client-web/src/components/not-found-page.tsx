'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, Shirt, Sparkles, Wind } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-16">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.3]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--color-primary) 14%, transparent) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="not-found-float absolute left-[10%] top-[20%] text-primary/25">
          <Shirt className="h-14 w-14 -rotate-12" strokeWidth={1.25} />
        </div>
        <div className="not-found-float-delayed absolute right-[12%] top-[24%] text-primary/20">
          <Wind className="h-12 w-12 rotate-12" strokeWidth={1.25} />
        </div>
        <div className="not-found-bubble absolute left-[20%] bottom-[26%] h-4 w-4 rounded-full bg-primary/30" />
        <div className="not-found-bubble absolute right-[22%] bottom-[24%] h-5 w-5 rounded-full bg-primary/20 [animation-delay:1s]" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center text-center">
        <div className="relative mb-6">
          <div className="relative rounded-3xl border border-border bg-card p-5 shadow-lg">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-primary/25 bg-primary-50">
              <div className="not-found-spin-slow relative h-16 w-16 rounded-full border-2 border-dashed border-primary/40">
                <div className="absolute inset-1.5 flex items-center justify-center rounded-full bg-white">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <span
          className="bg-gradient-to-br from-primary to-teal-600 bg-clip-text text-8xl font-black leading-none text-transparent"
          aria-hidden
        >
          404
        </span>
        <span className="sr-only">404</span>

        <h1 className="mt-2 text-xl font-bold sm:text-2xl">Sahifa topilmadi</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Bu havola eskirgan yoki noto&apos;g&apos;ri bo&apos;lishi mumkin. Bosh sahifadan buyurtma
          berishni davom ettiring.
        </p>

        <div className="mt-7 flex w-full max-w-xs flex-col gap-2 sm:flex-row sm:max-w-none sm:justify-center">
          <Link href="/" className="w-full sm:w-auto">
            <Button className="w-full" size="lg">
              <Home className="h-4 w-4" />
              Bosh sahifa
            </Button>
          </Link>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Orqaga
          </Button>
        </div>
      </main>
    </div>
  );
}
