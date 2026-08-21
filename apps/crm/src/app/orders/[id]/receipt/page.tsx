'use client';

import { Suspense, use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { toast } from 'sonner';
import {
  DEFAULT_RECEIPT_SETTINGS,
  normalizeReceiptSettings,
  type ReceiptSettings,
} from '@ximchistka/shared';
import { OrderReceipt, type ReceiptOrder } from '@/components/orders/order-receipt';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

type OrderDetail = ReceiptOrder & { id: string };

type ReceiptProfile = {
  organization?: { name?: string; receiptSettings?: unknown } | null;
};

/** Termoprinter qog'oz eni bo'yicha print o'lchamlari (globals.css ni bekor qiladi) */
function printCss(settings: ReceiptSettings) {
  const paper = settings.paperWidth;
  const printable = paper === 58 ? 54 : 76;
  return `@media print {
  @page { size: ${paper}mm auto; margin: 2mm; }
  html, body { width: ${paper}mm !important; }
  .receipt-root { width: ${printable}mm !important; max-width: ${printable}mm !important; }
}`;
}

export default function OrderReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ReceiptPageFallback params={params} />}>
      <OrderReceiptContent params={params} />
    </Suspense>
  );
}

function ReceiptPageFallback({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useI18n();
  const { id } = use(params);
  return (
    <div className="min-h-screen bg-secondary">
      <div className="no-print px-4 py-3 border-b border-border bg-card">
        <Link href={`/orders/${id}`} className="text-sm text-muted-foreground">
          {t('common.loading')}
        </Link>
      </div>
      <div className="py-6 px-4 flex justify-center">
        <Skeleton className="h-[480px] w-[80mm]" />
      </div>
    </div>
  );
}

function OrderReceiptContent({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useI18n();
  const { id } = use(params);
  const searchParams = useSearchParams();
  const autoPrint = searchParams.get('print') === '1';
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [orgName, setOrgName] = useState<string | undefined>(undefined);
  const [settings, setSettings] = useState<ReceiptSettings>(DEFAULT_RECEIPT_SETTINGS);
  const [settingsReady, setSettingsReady] = useState(false);

  const load = useCallback(async () => {
    setOrder(null);
    try {
      const data = await api<OrderDetail>(`/orders/${id}`);
      setOrder(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    }
  }, [id, t]);

  useEffect(() => {
    load();
    api<ReceiptProfile>('/settings/profile')
      .then((p) => {
        setOrgName(p.organization?.name);
        setSettings(normalizeReceiptSettings(p.organization?.receiptSettings));
      })
      .catch(() => {
        /* standart sozlamalar bilan davom etamiz */
      })
      .finally(() => setSettingsReady(true));
  }, [load]);

  useEffect(() => {
    // Sozlamalar kelmasidan chop etilsa, qog'oz eni noto'g'ri ketishi mumkin
    if (!order || !autoPrint || !settingsReady) return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [order, autoPrint, settingsReady]);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-secondary">
      <style dangerouslySetInnerHTML={{ __html: printCss(settings) }} />
      <div className="no-print sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
        <Link
          href={`/orders/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('orderDetail.backToOrder')}
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {settings.paperWidth} mm
          </span>
          <Button onClick={handlePrint} disabled={!order}>
            <Printer className="h-4 w-4" />
            {t('orderDetail.print')}
          </Button>
        </div>
      </div>

      <div className="py-6 px-4 flex justify-center">
        {!order ? (
          <Skeleton className="h-[480px] w-[80mm]" />
        ) : (
          <div className="receipt-print-area shadow-lg rounded-sm overflow-hidden">
            <OrderReceipt order={order} organizationName={orgName} settings={settings} />
          </div>
        )}
      </div>
    </div>
  );
}
