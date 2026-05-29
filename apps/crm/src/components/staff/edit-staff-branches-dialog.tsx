'use client';

import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/input';
import { api } from '@/lib/api';
import { ROLE_LABELS, StaffRole } from '@/lib/roles';

type Branch = { id: string; name: string };

export type StaffForBranches = {
  id: string;
  fullName: string;
  role: string;
  userBranches: { branch: { id: string; name: string } }[];
};

export function EditStaffBranchesDialog({
  open,
  staff,
  onClose,
  onSaved,
}: {
  open: boolean;
  staff: StaffForBranches | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      api<Branch[]>('/branches').then(setBranches);
      if (staff) {
        setBranchIds(staff.userBranches.map((ub) => ub.branch.id));
      }
    }
  }, [open, staff]);

  if (!open || !staff) return null;

  const isSuperAdmin = staff.role === 'super_admin';

  function toggleBranch(id: string) {
    setBranchIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!staff) return;
    const staffId = staff.id;
    if (branchIds.length === 0) {
      toast.error('Kamida bitta filial tanlang');
      return;
    }
    setLoading(true);
    try {
      await api(`/users/staff/${staffId}/branches`, {
        method: 'PATCH',
        body: JSON.stringify({ branchIds }),
      });
      toast.success('Filiallar yangilandi');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-xl border border-border shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold">Filiallarni tahrirlash</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{staff.fullName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-secondary flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isSuperAdmin ? (
          <div className="p-6 text-sm text-muted-foreground">
            Super admin barcha filiallarga kiradi — filial biriktirish shart emas.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="p-6 space-y-4">
            <div>
              <Label className="mb-1 block">
                Rol: {ROLE_LABELS[staff.role as StaffRole] ?? staff.role}
              </Label>
              <p className="text-xs text-muted-foreground mb-3">
                Xodim faqat tanlangan filiallarga kirishi va ishlay oladi
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
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
                Saqlash
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
