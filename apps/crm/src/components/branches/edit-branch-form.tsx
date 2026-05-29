'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { api } from '@/lib/api';

export type BranchFormData = {
  id: string;
  name: string;
  address: string;
  phone: string;
  openTime: string;
  closeTime: string;
  isActive: boolean;
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
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(branch.name);
  const [address, setAddress] = useState(branch.address);
  const [phone, setPhone] = useState(branch.phone);
  const [openTime, setOpenTime] = useState(branch.openTime);
  const [closeTime, setCloseTime] = useState(branch.closeTime);
  const [isActive, setIsActive] = useState(branch.isActive);

  useEffect(() => {
    setName(branch.name);
    setAddress(branch.address);
    setPhone(branch.phone);
    setOpenTime(branch.openTime);
    setCloseTime(branch.closeTime);
    setIsActive(branch.isActive);
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
          ...(canManage ? { isActive } : {}),
        }),
      });
      toast.success('Filial saqlandi');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
      <div>
        <Label>Filial nomi</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label>Manzil</Label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} required />
      </div>
      <div>
        <Label>Telefon</Label>
        <PhoneInput value={phone} onChange={setPhone} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Ochilish vaqti</Label>
          <Input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} required />
        </div>
        <div>
          <Label>Yopilish vaqti</Label>
          <Input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} required />
        </div>
      </div>
      {canManage && (
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="accent-primary h-4 w-4"
          />
          Filial faol (mijozlar ko&apos;radi va buyurtma beradi)
        </label>
      )}
      <Button type="submit" loading={loading}>
        <Save className="h-4 w-4" />
        Saqlash
      </Button>
    </form>
  );
}
