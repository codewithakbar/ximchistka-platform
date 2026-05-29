'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  UserCog,
  Plus,
  Phone,
  Building2,
  Pencil,
  Camera,
  LayoutGrid,
  List,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty } from '@/components/ui/empty';
import { AddStaffDialog } from '@/components/staff/add-staff-dialog';
import { StaffAvatar } from '@/components/staff/staff-avatar';
import {
  EditStaffBranchesDialog,
  type StaffForBranches,
} from '@/components/staff/edit-staff-branches-dialog';
import { api, getUser } from '@/lib/api';
import { fileToAvatarDataUrl } from '@/lib/image';
import { useCanAddStaff } from '@/hooks/use-client-auth';
import { ROLE_LABELS, StaffRole } from '@/lib/roles';
import { cn } from '@/lib/utils';

type Staff = StaffForBranches & {
  phone: string;
  email?: string | null;
  avatarUrl?: string | null;
};

type ViewMode = 'grid' | 'list';

const roleVariants: Record<string, 'default' | 'success' | 'warning' | 'info' | 'destructive'> = {
  super_admin: 'destructive',
  branch_manager: 'info',
  operator: 'default',
  courier: 'warning',
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffForBranches | null>(null);
  const [orgId, setOrgId] = useState('');
  const [view, setView] = useState<ViewMode>('grid');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingStaffId = useRef<string | null>(null);

  const load = useCallback(() => {
    api<Staff[]>('/users/staff').then(setStaff).catch(() => setStaff([]));
  }, []);

  useEffect(() => {
    load();
    api<{ organizationId?: string; organization?: { id: string } }>('/settings/profile')
      .then((p) => setOrgId(p.organizationId ?? p.organization?.id ?? ''))
      .catch(() => {
        const u = getUser<{ organizationId?: string }>();
        if (u?.organizationId) setOrgId(u.organizationId);
      });
    const saved = typeof window !== 'undefined' ? localStorage.getItem('staff-view') : null;
    if (saved === 'grid' || saved === 'list') setView(saved);
  }, [load]);

  const canAdd = useCanAddStaff();

  function changeView(next: ViewMode) {
    setView(next);
    localStorage.setItem('staff-view', next);
  }

  function triggerAvatarUpload(id: string) {
    pendingStaffId.current = id;
    fileInputRef.current?.click();
  }

  async function onAvatarSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    const id = pendingStaffId.current;
    pendingStaffId.current = null;
    if (!file || !id) return;
    setUploadingId(id);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      await api(`/users/staff/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ avatarUrl: dataUrl }),
      });
      setStaff((prev) => prev?.map((s) => (s.id === id ? { ...s, avatarUrl: dataUrl } : s)) ?? null);
      toast.success('Surat yangilandi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Suratni yuklab bo\'lmadi');
    } finally {
      setUploadingId(null);
    }
  }

  const addButton = canAdd && (
    <Button onClick={() => setDialogOpen(true)}>
      <Plus className="h-4 w-4" />
      Xodim qo&apos;shish
    </Button>
  );

  return (
    <AppShell title="Xodimlar">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <p className="text-sm text-muted-foreground">
          Yangi xodim qo&apos;shing — u telefon va parol bilan shaxsiy dashboardiga kiradi
        </p>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-card">
            <button
              type="button"
              onClick={() => changeView('grid')}
              className={cn(
                'h-8 w-8 rounded-md flex items-center justify-center transition-colors',
                view === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary',
              )}
              title="Karta ko'rinishi"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => changeView('list')}
              className={cn(
                'h-8 w-8 rounded-md flex items-center justify-center transition-colors',
                view === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary',
              )}
              title="Ro'yxat ko'rinishi"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          {addButton}
        </div>
      </div>

      {staff === null ? (
        view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        )
      ) : staff.length === 0 ? (
        <Empty
          icon={UserCog}
          title="Xodimlar yo'q"
          description="Birinchi xodimni qo'shing va unga login ma'lumotlarini bering"
          action={addButton || undefined}
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((s) => (
            <StaffCard
              key={s.id}
              staff={s}
              canManage={canAdd}
              uploading={uploadingId === s.id}
              onEditBranches={() => setEditStaff(s)}
              onChangeAvatar={() => triggerAvatarUpload(s.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {staff.map((s, i) => (
              <div
                key={s.id}
                className={`flex items-center justify-between gap-3 p-4 ${i !== staff.length - 1 ? 'border-b border-border' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <AvatarButton
                    staff={s}
                    canManage={canAdd}
                    uploading={uploadingId === s.id}
                    size="md"
                    onChangeAvatar={() => triggerAvatarUpload(s.id)}
                  />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.fullName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {s.phone}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {s.userBranches.length > 0 ? (
                    <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground max-w-[200px] truncate">
                      <Building2 className="h-3 w-3 shrink-0" />
                      {s.userBranches.map((b) => b.branch.name).join(', ')}
                    </span>
                  ) : (
                    s.role !== 'super_admin' && (
                      <span className="text-xs text-amber-600">Filial biriktirilmagan</span>
                    )
                  )}
                  <Badge variant={roleVariants[s.role] ?? 'default'}>
                    {ROLE_LABELS[s.role as StaffRole] ?? s.role}
                  </Badge>
                  {canAdd && s.role !== 'super_admin' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditStaff(s)}
                      title="Filiallarni tahrirlash"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Filiallar</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onAvatarSelected}
      />

      {orgId && (
        <AddStaffDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onCreated={load}
          organizationId={orgId}
        />
      )}

      <EditStaffBranchesDialog
        open={!!editStaff}
        staff={editStaff}
        onClose={() => setEditStaff(null)}
        onSaved={load}
      />
    </AppShell>
  );
}

function AvatarButton({
  staff,
  canManage,
  uploading,
  size,
  onChangeAvatar,
}: {
  staff: Staff;
  canManage: boolean;
  uploading: boolean;
  size: 'md' | 'xl';
  onChangeAvatar: () => void;
}) {
  if (!canManage) {
    return <StaffAvatar name={staff.fullName} src={staff.avatarUrl} role={staff.role} size={size} />;
  }
  return (
    <button type="button" onClick={onChangeAvatar} className="group relative" title="Suratni o'zgartirish">
      <StaffAvatar name={staff.fullName} src={staff.avatarUrl} role={staff.role} size={size} />
      <span
        className={cn(
          'absolute inset-0 rounded-full bg-black/45 flex items-center justify-center text-white transition-opacity',
          uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        <Camera className={cn('h-4 w-4', uploading && 'animate-pulse')} />
      </span>
    </button>
  );
}

function StaffCard({
  staff,
  canManage,
  uploading,
  onEditBranches,
  onChangeAvatar,
}: {
  staff: Staff;
  canManage: boolean;
  uploading: boolean;
  onEditBranches: () => void;
  onChangeAvatar: () => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6 flex flex-col items-center text-center">
        <AvatarButton
          staff={staff}
          canManage={canManage}
          uploading={uploading}
          size="xl"
          onChangeAvatar={onChangeAvatar}
        />
        <div className="mt-3 font-semibold leading-tight">{staff.fullName}</div>
        <Badge variant={roleVariants[staff.role] ?? 'default'} className="mt-2">
          {ROLE_LABELS[staff.role as StaffRole] ?? staff.role}
        </Badge>

        <div className="mt-4 w-full space-y-1.5 text-sm text-left">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{staff.phone}</span>
          </div>
          {staff.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{staff.email}</span>
            </div>
          )}
          <div className="flex items-start gap-2 text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            {staff.userBranches.length > 0 ? (
              <span className="line-clamp-2">
                {staff.userBranches.map((b) => b.branch.name).join(', ')}
              </span>
            ) : staff.role === 'super_admin' ? (
              <span>Barcha filiallar</span>
            ) : (
              <span className="text-amber-600">Filial biriktirilmagan</span>
            )}
          </div>
        </div>

        {canManage && staff.role !== 'super_admin' && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-4 w-full"
            onClick={onEditBranches}
          >
            <Pencil className="h-3.5 w-3.5" />
            Filiallarni tahrirlash
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
