'use client';

import { FormEvent, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

export function AddBranchDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [openTime, setOpenTime] = useState('09:00');
  const [closeTime, setCloseTime] = useState('20:00');

  if (!open) return null;

  function reset() {
    setName('');
    setAddress('');
    setPhone('');
    setOpenTime('09:00');
    setCloseTime('20:00');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/branches', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim(),
          openTime,
          closeTime,
        }),
      });
      toast.success(t('dialog.branch.toastCreated'));
      reset();
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-xl border border-border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">{t('dialog.branch.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <Label>{t('dialog.branch.name')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Chilonzor filiali"
            />
          </div>
          <div>
            <Label>{t('common.address')}</Label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              placeholder="Toshkent, Chilonzor..."
            />
          </div>
          <div>
            <Label>{t('common.phone')}</Label>
            <PhoneInput
              value={phone}
              onChange={setPhone}
              required
              placeholder="+998901234567"
            />
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
          <p className="text-xs text-muted-foreground">
            {t('dialog.branch.hint')}
          </p>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              {t('common.cancelShort')}
            </Button>
            <Button type="submit" className="flex-1" loading={loading}>
              {t('common.add')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
