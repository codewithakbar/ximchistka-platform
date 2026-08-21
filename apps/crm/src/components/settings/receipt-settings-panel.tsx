'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Printer, Save } from 'lucide-react';
import {
  DEFAULT_RECEIPT_SETTINGS,
  normalizeReceiptSettings,
  type ReceiptFontScale,
  type ReceiptPaperWidth,
  type ReceiptSettings,
} from '@ximchistka/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderReceipt, type ReceiptOrder } from '@/components/orders/order-receipt';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

/** Jonli ko'rinish uchun namunaviy buyurtma */
const SAMPLE_ORDER: ReceiptOrder = {
  orderNumber: 'CH-0042',
  status: 'submitted',
  totalAmount: 112500,
  discountAmount: 12500,
  promoCode: 'WELCOME10',
  notes: "Yoqasiga alohida e'tibor bering",
  createdAt: new Date().toISOString(),
  estimatedReady: new Date(Date.now() + 48 * 3600000).toISOString(),
  branch: {
    name: 'Chilonzor filiali',
    address: 'Toshkent, Chilonzor 5-kvartal',
    phone: '+998712000000',
  },
  customer: { user: { fullName: 'Sardor Karimov', phone: '+998901234567' } },
  items: [
    { quantity: 2, unitPrice: 25000, service: { name: "Ko'ylak", unit: 'dona' }, color: 'Oq' },
    { quantity: 1, unitPrice: 75000, service: { name: 'Kostyum', unit: 'dona' } },
  ],
  pickupDelivery: { type: 'pickup', address: null },
  payments: [{ provider: 'cash', status: 'paid', amount: 50000 }],
};

export function ReceiptSettingsPanel({
  organizationName,
  canManage,
}: {
  organizationName?: string;
  canManage: boolean;
}) {
  const { t } = useI18n();
  const [settings, setSettings] = useState<ReceiptSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ receiptSettings?: unknown }>('/settings/organization')
      .then((org) => setSettings(normalizeReceiptSettings(org.receiptSettings)))
      .catch(() => setSettings(DEFAULT_RECEIPT_SETTINGS));
  }, []);

  function patch(next: Partial<ReceiptSettings>) {
    setSettings((prev) => (prev ? { ...prev, ...next } : prev));
  }

  async function onSave() {
    if (!settings) return;
    setSaving(true);
    try {
      await api('/settings/organization', {
        method: 'PATCH',
        body: JSON.stringify({ receiptSettings: settings }),
      });
      toast.success(t('receiptSettings.toastSaved'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-4 w-4 text-muted-foreground" />
          {t('receiptSettings.title')}
        </CardTitle>
        <CardDescription>{t('receiptSettings.desc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {!settings ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Sozlamalar */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="rs-paper">{t('receiptSettings.paperWidth')}</Label>
                  <Select
                    id="rs-paper"
                    value={String(settings.paperWidth)}
                    onChange={(e) =>
                      patch({ paperWidth: Number(e.target.value) as ReceiptPaperWidth })
                    }
                    disabled={!canManage}
                  >
                    <option value="80">{t('receiptSettings.paper80')}</option>
                    <option value="58">{t('receiptSettings.paper58')}</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rs-font">{t('receiptSettings.fontScale')}</Label>
                  <Select
                    id="rs-font"
                    value={settings.fontScale}
                    onChange={(e) =>
                      patch({ fontScale: e.target.value as ReceiptFontScale })
                    }
                    disabled={!canManage}
                  >
                    <option value="compact">{t('receiptSettings.fontCompact')}</option>
                    <option value="normal">{t('receiptSettings.fontNormal')}</option>
                    <option value="large">{t('receiptSettings.fontLarge')}</option>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="rs-header">{t('receiptSettings.headerText')}</Label>
                <Input
                  id="rs-header"
                  value={settings.headerText}
                  onChange={(e) => patch({ headerText: e.target.value })}
                  placeholder={t('receiptSettings.headerPlaceholder')}
                  maxLength={200}
                  disabled={!canManage}
                />
              </div>

              <div>
                <Label htmlFor="rs-footer">{t('receiptSettings.footerText')}</Label>
                <Textarea
                  id="rs-footer"
                  value={settings.footerText}
                  onChange={(e) => patch({ footerText: e.target.value })}
                  placeholder={t('receiptSettings.footerPlaceholder')}
                  rows={3}
                  maxLength={300}
                  className="resize-none"
                  disabled={!canManage}
                />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showQr}
                  onChange={(e) => patch({ showQr: e.target.checked })}
                  className="accent-primary h-4 w-4"
                  disabled={!canManage}
                />
                {t('receiptSettings.showQr')}
              </label>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showNotes}
                  onChange={(e) => patch({ showNotes: e.target.checked })}
                  className="accent-primary h-4 w-4"
                  disabled={!canManage}
                />
                {t('receiptSettings.showNotes')}
              </label>

              {canManage && (
                <Button onClick={onSave} loading={saving}>
                  <Save className="h-4 w-4" />
                  {t('common.save')}
                </Button>
              )}
            </div>

            {/* Jonli ko'rinish */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                {t('receiptSettings.preview')}
              </p>
              <div className="flex justify-center rounded-xl border border-border bg-secondary/40 p-4 overflow-x-auto">
                <div className="shadow-md rounded-sm overflow-hidden shrink-0">
                  <OrderReceipt
                    order={SAMPLE_ORDER}
                    organizationName={organizationName}
                    settings={settings}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
