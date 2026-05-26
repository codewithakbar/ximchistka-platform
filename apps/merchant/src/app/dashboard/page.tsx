'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Plus, Clock, CheckCircle2, AlertTriangle, Ban } from 'lucide-react';
import { MerchantShell } from '@/components/layout/shell';
import { CreateOrganizationDialog } from '@/components/organizations/create-organization-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatRelative } from '@/lib/utils';

type Org = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  demoDaysLeft: number;
  demoEndsAt: string | null;
  branchCount: number;
  userCount: number;
  createdAt: string;
};

type Stats = {
  totalOrganizations: number;
  demoActive: number;
  demoExpired: number;
  active: number;
  suspended: number;
  totalBranches: number;
  totalOrders: number;
};

const statusBadge: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' }> = {
  demo_active: { label: 'Demo faol', variant: 'default' },
  demo_expired: { label: 'Demo tugagan', variant: 'warning' },
  active: { label: 'Faol', variant: 'success' },
  suspended: { label: 'To\'xtatilgan', variant: 'destructive' },
};

export default function DashboardPage() {
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function load() {
    setOrgs(null);
    const [list, dash] = await Promise.all([
      api<Org[]>('/platform/organizations'),
      api<Stats>('/platform/dashboard'),
    ]);
    setOrgs(list);
    setStats(dash);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <MerchantShell>
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Firmalar</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Barcha ximchistka tashkilotlari — demo va faol rejimlar
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-violet-600 hover:bg-violet-700">
          <Plus className="h-4 w-4" />
          Yangi firma
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <StatCard icon={Building2} label="Jami" value={stats.totalOrganizations} />
          <StatCard icon={Clock} label="Demo" value={stats.demoActive} />
          <StatCard icon={AlertTriangle} label="Demo tugagan" value={stats.demoExpired} />
          <StatCard icon={CheckCircle2} label="Faol" value={stats.active} />
          <StatCard icon={Ban} label="To'xtatilgan" value={stats.suspended} />
        </div>
      )}

      {orgs === null ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : orgs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Hali firma yo&apos;q. Birinchi firmangizni yarating.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orgs.map((o) => {
            const st = statusBadge[o.status] ?? { label: o.status, variant: 'secondary' as const };
            return (
              <Link key={o.id} href={`/organizations/${o.id}`}>
                <Card className="hover:shadow-md hover:border-violet-300 transition-all">
                  <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{o.name}</h3>
                          <Badge variant={st.variant}>{st.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{o.slug}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {o.branchCount} filial · {o.userCount} xodim · {formatRelative(o.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      {o.status === 'demo_active' && (
                        <p className="font-medium text-amber-600">{o.demoDaysLeft} kun qoldi</p>
                      )}
                      {o.demoEndsAt && (
                        <p className="text-xs text-muted-foreground">
                          Demo: {new Date(o.demoEndsAt).toLocaleDateString('uz-UZ')}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <CreateOrganizationDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={load} />
    </MerchantShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Icon className="h-4 w-4" />
          <span className="text-xs">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
