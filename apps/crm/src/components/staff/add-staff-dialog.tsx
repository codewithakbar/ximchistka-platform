'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { X, Copy, Check, Camera, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { StaffAvatar } from '@/components/staff/staff-avatar';
import { api } from '@/lib/api';
import { fileToAvatarDataUrl } from '@/lib/image';
import { CREATABLE_ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, StaffRole } from '@/lib/roles';

type Branch = { id: string; name: string };

type CreatedStaff = {
  fullName: string;
  phone: string;
  role: string;
  password: string;
};

export function AddStaffDialog({
  open,
  onClose,
  onCreated,
  organizationId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  organizationId: string;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<CreatedStaff | null>(null);
  const [copied, setCopied] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('operator');
  const [password, setPassword] = useState('');
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      api<Branch[]>('/branches').then(setBranches);
      setCreated(null);
      setFullName('');
      setPhone('');
      setEmail('');
      setRole('operator');
      setPassword('');
      setBranchIds([]);
      setAvatarUrl(null);
    }
  }, [open]);

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      setAvatarUrl(dataUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rasmni yuklab bo\'lmadi');
    }
  }

  function toggleBranch(id: string) {
    setBranchIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (branchIds.length === 0 && role !== 'super_admin') {
      toast.error('Kamida bitta filial tanlang');
      return;
    }
    setLoading(true);
    try {
      await api('/users/staff', {
        method: 'POST',
        body: JSON.stringify({
          organizationId,
          fullName,
          phone,
          email: email || undefined,
          role,
          password,
          branchIds,
          avatarUrl: avatarUrl || undefined,
        }),
      });
      setCreated({ fullName, phone, role, password });
      toast.success('Xodim qo\'shildi');
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }

  function copyCredentials() {
    if (!created) return;
    const text = `Ximchistka CRM\nURL: http://localhost:3000/login\nTelefon: ${created.phone}\nParol: ${created.password}\nRol: ${ROLE_LABELS[created.role as StaffRole] ?? created.role}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Nusxa olindi');
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-xl border border-border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">
            {created ? 'Xodim yaratildi' : 'Yangi xodim'}
          </h2>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>

        {created ? (
          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong>{created.fullName}</strong> endi shaxsiy dashboardiga kirishi mumkin.
            </p>
            <div className="rounded-lg bg-secondary p-4 space-y-2 text-sm font-mono">
              <div><span className="text-muted-foreground">Telefon:</span> {created.phone}</div>
              <div><span className="text-muted-foreground">Parol:</span> {created.password}</div>
              <div><span className="text-muted-foreground">Rol:</span> {ROLE_LABELS[created.role as StaffRole]}</div>
              <div><span className="text-muted-foreground">Kirish:</span> http://localhost:3000/login</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={copyCredentials}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Nusxa olindi' : 'Kirish ma\'lumotlari'}
              </Button>
              <Button className="flex-1" onClick={onClose}>Yopish</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="p-6 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative"
                title="Surat yuklash"
              >
                <StaffAvatar name={fullName || '?'} src={avatarUrl} role={role} size="xl" />
                <span className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md ring-2 ring-card">
                  <Camera className="h-3.5 w-3.5" />
                </span>
              </button>
              {avatarUrl ? (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(null)}
                  className="text-xs text-destructive inline-flex items-center gap-1 hover:underline"
                >
                  <Trash2 className="h-3 w-3" />
                  Suratni olib tashlash
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">Surat (ixtiyoriy)</span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickAvatar}
              />
            </div>
            <div>
              <Label>To&apos;liq ism</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Ali Valiyev" />
            </div>
            <div>
              <Label>Telefon (login)</Label>
              <PhoneInput value={phone} onChange={setPhone} required placeholder="+998901234567" />
            </div>
            <div>
              <Label>Email (ixtiyoriy)</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ali@ximchistka.uz" />
            </div>
            <div>
              <Label>Rol</Label>
              <Select value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
                {CREATABLE_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{ROLE_DESCRIPTIONS[role]}</p>
            </div>
            <div>
              <Label>Vaqtinchalik parol</Label>
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="kamida 6 belgi"
              />
              <p className="text-xs text-muted-foreground mt-1">Xodimga bu parolni bering — birinchi kirishda ishlatadi</p>
            </div>
            <div>
              <Label>Filiallar</Label>
              <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                {branches.map((b) => (
                  <label
                    key={b.id}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border cursor-pointer hover:bg-secondary"
                  >
                    <input
                      type="checkbox"
                      checked={branchIds.includes(b.id)}
                      onChange={() => toggleBranch(b.id)}
                      className="accent-primary"
                    />
                    <span className="text-sm">{b.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                Bekor
              </Button>
              <Button type="submit" className="flex-1" loading={loading}>
                Qo&apos;shish
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
