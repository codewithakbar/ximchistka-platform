'use client';

import { FormEvent, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { api } from '@/lib/api';

type CreateResult = {
  organization: { id: string; name: string; slug: string; demoEndsAt: string | null };
  admin: { phone: string; fullName: string; password: string };
  crmUrl: string;
};

export function CreateOrganizationDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [branchName, setBranchName] = useState('Asosiy filial');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [demoDays, setDemoDays] = useState('14');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api<CreateResult>('/platform/organizations', {
        method: 'POST',
        body: JSON.stringify({
          name,
          slug: slug || undefined,
          contactPhone: contactPhone || undefined,
          branchName,
          branchAddress,
          branchPhone,
          adminFullName,
          adminPhone,
          adminPassword,
          demoDays: parseInt(demoDays, 10) || 14,
        }),
      });
      toast.success(`"${res.organization.name}" yaratildi (${demoDays} kun demo)`);
      toast.message('CRM kirish', {
        description: `${res.admin.phone} / ${res.admin.password}`,
        duration: 10000,
      });
      onCreated();
      onClose();
      setName('');
      setSlug('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-xl border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-card">
          <h2 className="text-lg font-semibold">Yangi firma</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Avtomatik <strong>{demoDays} kunlik demo</strong> rejim beriladi.
          </p>
          <div>
            <Label>Firma nomi</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Clean Pro Ximchistka" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Slug (ixtiyoriy)</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="clean-pro" />
            </div>
            <div>
              <Label>Demo kunlar</Label>
              <Input type="number" min={1} max={90} value={demoDays} onChange={(e) => setDemoDays(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Filial nomi</Label>
            <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} required />
          </div>
          <div>
            <Label>Filial manzili</Label>
            <Input value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} required />
          </div>
          <div>
            <Label>Filial telefoni</Label>
            <PhoneInput value={branchPhone} onChange={setBranchPhone} required placeholder="+998..." />
          </div>
          <hr className="border-border" />
          <div>
            <Label>Admin ismi</Label>
            <Input value={adminFullName} onChange={(e) => setAdminFullName(e.target.value)} required />
          </div>
          <div>
            <Label>Admin telefoni (CRM login)</Label>
            <PhoneInput value={adminPhone} onChange={setAdminPhone} required />
          </div>
          <div>
            <Label>Admin paroli</Label>
            <Input value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required minLength={6} />
          </div>
          <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700" loading={loading}>
            <Plus className="h-4 w-4" />
            Firma yaratish
          </Button>
        </form>
      </div>
    </div>
  );
}
