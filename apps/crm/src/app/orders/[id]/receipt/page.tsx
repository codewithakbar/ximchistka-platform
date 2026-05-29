'use client';

import { Suspense, use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { OrderReceipt, type ReceiptOrder } from '@/components/orders/order-receipt';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api, getUser } from '@/lib/api';

type OrderDetail = ReceiptOrder & { id: string };

export default function OrderReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ReceiptPageFallback params={params} />}>
      <OrderReceiptContent params={params} />
    </Suspense>
  );
}

function ReceiptPageFallback({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="min-h-screen bg-secondary">
      <div className="no-print px-4 py-3 border-b border-border bg-card">
        <Link href={`/orders/${id}`} className="text-sm text-muted-foreground">
          Yuklanmoqda...
        </Link>
      </div>
      <div className="py-6 px-4 flex justify-center">
        <Skeleton className="h-[480px] w-[80mm]" />
      </div>
    </div>
  );
}

function OrderReceiptContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const autoPrint = searchParams.get('print') === '1';
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const orgName = getUser<{ organizationName?: string }>()?.organizationName;

  const load = useCallback(async () => {
    setOrder(null);
    try {
      const data = await api<OrderDetail>(`/orders/${id}`);
      setOrder(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Chekni yuklab bo\'lmadi');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!order || !autoPrint) return;
    const t = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(t);
  }, [order, autoPrint]);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-secondary">
      <div className="no-print sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
        <Link
          href={`/orders/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Buyurtmaga qaytish
        </Link>
        <Button onClick={handlePrint} disabled={!order}>
          <Printer className="h-4 w-4" />
          Chop etish
        </Button>
      </div>

      <div className="py-6 px-4 flex justify-center">
        {!order ? (
          <Skeleton className="h-[480px] w-[80mm]" />
        ) : (
          <div className="receipt-print-area shadow-lg rounded-sm overflow-hidden">
            <OrderReceipt order={order} organizationName={orgName} />
          </div>
        )}
      </div>
    </div>
  );
}
