'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, CheckCircle2, Ban, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { MerchantShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';

type OrgDetail = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  demoDaysLeft: number;
  demoEndsAt: string | null;
  demoStartedAt: string | null;
  isActive: boolean;
  contactPhone: string | null;
  contactEmail: string | null;
  branchCount: number;
  userCount: number;
  branches: { id: string; name: string; address: string; phone: string }[];
  admins: { id: string; fullName: string; phone: string; role: string }[];
};

const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL ?? 'http://localhost:3000';

export default function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setOrg(null);
    const data = await api<OrgDetail>(`/platform/organizations/${id}`);
    setOrg(data);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function extendDemo() {
    setLoading(true);
    try {
      await api(`/platform/organizations/${id}/extend-demo`, {
        method: 'POST',
        body: JSON.stringify({ days: 14 }),
      });
      toast.success('Demo 14 kunga uzaytirildi');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }

  async function activate() {
    setLoading(true);
    try {
      await api(`/platform/organizations/${id}/activate`, { method: 'POST' });
      toast.success('Faol rejimga o\'tkazildi');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }

  async function suspend() {
    setLoading(true);
    try {
      await api(`/platform/organizations/${id}/suspend`, { method: 'POST' });
      toast.success('Firma to\'xtatildi');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }

  return (
    <MerchantShell>
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" />
        Orqaga
      </Link>

      {org === null ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">{org.name}</h1>
              <p className="text-muted-foreground">{org.slug}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Badge>{org.plan}</Badge>
                <Badge variant={org.status === 'active' ? 'success' : org.status === 'demo_active' ? 'warning' : 'destructive'}>
                  {org.status}
                </Badge>
                {org.status === 'demo_active' && (
                  <span className="text-sm text-amber-600 font-medium">{org.demoDaysLeft} kun qoldi</span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={extendDemo} disabled={loading}>
                <Clock className="h-4 w-4" />
                Demo +14 kun
              </Button>
              <Button variant="outline" onClick={activate} disabled={loading}>
                <CheckCircle2 className="h-4 w-4" />
                Faollashtirish
              </Button>
              <Button variant="outline" onClick={suspend} disabled={loading}>
                <Ban className="h-4 w-4" />
                To&apos;xtatish
              </Button>
              <a href={CRM_URL} target="_blank" rel="noreferrer">
                <Button className="bg-violet-600 hover:bg-violet-700">
                  <ExternalLink className="h-4 w-4" />
                  CRM
                </Button>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Filiallar ({org.branchCount})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {org.branches?.map((b) => (
                  <div key={b.id} className="p-3 rounded-lg bg-secondary/50 text-sm">
                    <p className="font-medium">{b.name}</p>
                    <p className="text-muted-foreground">{b.address}</p>
                    <p className="text-muted-foreground">{b.phone}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CRM adminlar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {org.admins?.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg bg-secondary/50 text-sm flex justify-between">
                    <div>
                      <p className="font-medium">{a.fullName}</p>
                      <p className="text-muted-foreground">{a.phone}</p>
                    </div>
                    <Badge variant="secondary">{a.role.replace(/_/g, ' ')}</Badge>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  CRM: {CRM_URL}/login — yuqoridagi telefon va parol bilan
                </p>
              </CardContent>
            </Card>
          </div>

          {org.demoEndsAt && (
            <Card className="mt-4">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                Demo boshlangan: {org.demoStartedAt ? new Date(org.demoStartedAt).toLocaleString('uz-UZ') : '—'}
                <br />
                Demo tugaydi: {new Date(org.demoEndsAt).toLocaleString('uz-UZ')}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </MerchantShell>
  );
}
