'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

export type BranchFormData = {
  id: string;
  name: string;
  address: string;
  phone: string;
  openTime: string;
  closeTime: string;
  isActive: boolean;
  orderNumberPrefix?: string | null;
  orderNumberNext?: number;
};

export function EditBranchForm({
  branch,
  canManage,
  onSaved,
}: {
  branch: BranchFormData;
  canManage: boolean;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(branch.name);
  const [address, setAddress] = useState(branch.address);
  const [phone, setPhone] = useState(branch.phone);
  const [openTime, setOpenTime] = useState(branch.openTime);
  const [closeTime, setCloseTime] = useState(branch.closeTime);
  const [isActive, setIsActive] = useState(branch.isActive);
  const [orderPrefix, setOrderPrefix] = useState(branch.orderNumberPrefix ?? '');
  const [orderNext, setOrderNext] = useState(String(branch.orderNumberNext ?? 1));

  useEffect(() => {
    setName(branch.name);
    setAddress(branch.address);
    setPhone(branch.phone);
    setOpenTime(branch.openTime);
    setCloseTime(branch.closeTime);
    setIsActive(branch.isActive);
    setOrderPrefix(branch.orderNumberPrefix ?? '');
    setOrderNext(String(branch.orderNumberNext ?? 1));
  }, [branch]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api(`/branches/${branch.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim(),
          openTime,
          closeTime,
          ...(canManage
            ? {
                isActive,
                orderNumberPrefix: orderPrefix.trim(),
                orderNumberNext: Math.max(1, Math.floor(Number(orderNext)) || 1),
              }
            : {}),
        }),
      });
      toast.success(t('dialog.branch.toastSaved'));
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
      <div>
        <Label>{t('dialog.branch.name')}</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label>{t('common.address')}</Label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} required />
      </div>
      <div>
        <Label>{t('common.phone')}</Label>
        <PhoneInput value={phone} onChange={setPhone} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{t('common.openTime')}</Label>
          <Input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} required />
        </div>
        <div>
          <Label>{t('common.closeTime')}</Label>
          <Input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} required />
        </div>
      </div>
      {canManage && (
        <div className="rounded-lg border border-border p-3 space-y-3">
          <div>
            <div className="text-sm font-semibold">{t('branchNumbering.title')}</div>
            <p className="text-xs text-muted-foreground">{t('branchNumbering.desc')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('branchNumbering.prefix')}</Label>
              <Input
                value={orderPrefix}
                onChange={(e) =>
                  setOrderPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))
                }
                placeholder="CH"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t('branchNumbering.prefixHint')}
              </p>
            </div>
            <div>
              <Label>{t('branchNumbering.next')}</Label>
              <Input
                type="number"
                min={1}
                value={orderNext}
                onChange={(e) => setOrderNext(e.target.value)}
              />
              {orderPrefix && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('branchNumbering.preview')}:{' '}
                  <b>
                    {orderPrefix}-{String(Math.max(1, Number(orderNext) || 1)).padStart(4, '0')}
                  </b>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {canManage && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="accent-primary h-4 w-4"
          />
          {t('dialog.branch.activeHint')}
        </label>
      )}
      <Button type="submit" loading={loading}>
        <Save className="h-4 w-4" />
        {t('common.save')}
      </Button>
    </form>
  );
}
