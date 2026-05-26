'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserCog, Plus, Phone, Building2 } from 'lucide-react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty } from '@/components/ui/empty';
import { AddStaffDialog } from '@/components/staff/add-staff-dialog';
import { api, getUser } from '@/lib/api';
import { useCanAddStaff } from '@/hooks/use-client-auth';
import { ROLE_LABELS, StaffRole } from '@/lib/roles';

type Staff = {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  userBranches: { branch: { name: string } }[];
};

const roleVariants: Record<string, 'default' | 'success' | 'warning' | 'info' | 'destructive'> = {
  super_admin: 'destructive',
  branch_manager: 'info',
  operator: 'default',
  courier: 'warning',
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orgId, setOrgId] = useState('');

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
  }, [load]);

  const canAdd = useCanAddStaff();

  return (
    <AppShell title="Xodimlar">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          Yangi xodim qo&apos;shing — u telefon va parol bilan shaxsiy dashboardiga kiradi
        </p>
        {canAdd && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Xodim qo&apos;shish
          </Button>
        )}
      </div>

      {staff === null ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <Empty
          icon={UserCog}
          title="Xodimlar yo'q"
          description="Birinchi xodimni qo'shing va unga login ma'lumotlarini bering"
          action={
            canAdd ? (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Xodim qo&apos;shish
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            {staff.map((s, i) => (
              <div
                key={s.id}
                className={`flex items-center justify-between p-4 ${i !== staff.length - 1 ? 'border-b border-border' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                    {s.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium">{s.fullName}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {s.phone}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {s.userBranches.length > 0 && (
                    <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {s.userBranches.map((b) => b.branch.name).join(', ')}
                    </span>
                  )}
                  <Badge variant={roleVariants[s.role] ?? 'default'}>
                    {ROLE_LABELS[s.role as StaffRole] ?? s.role}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {orgId && (
        <AddStaffDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onCreated={load}
          organizationId={orgId}
        />
      )}
    </AppShell>
  );
}
