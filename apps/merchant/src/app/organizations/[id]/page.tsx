'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Ban,
  ExternalLink,
  Users,
  Building2,
  ShoppingBag,
  Wallet,
  Phone,
  Mail,
  MapPin,
  Layers,
  Tag,
} from 'lucide-react';
import { toast } from 'sonner';
import { MerchantShell } from '@/components/layout/shell';
import { OrderProcessPanel } from '@/components/organizations/order-process-panel';
import { ServiceCatalogPanel } from '@/components/organizations/service-catalog-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatPrice } from '@/lib/api';

type StaffMember = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: string | null;
  branches: string[];
};

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
  branches: {
    id: string;
    name: string;
    address: string;
    phone: string;
    isActive: boolean;
    orderCount: number;
    staffCount: number;
  }[];
  staff: StaffMember[];
  catalog: {
    categoryCount: number;
    serviceCount: number;
    categories: {
      id: string;
      name: string;
      description: string | null;
      isActive: boolean;
      sortOrder: number;
      services: {
        id: string;
        name: string;
        description: string | null;
        unit: string;
        basePrice: number;
        discountType: string | null;
        discountValue: number | null;
        discountValidUntil: string | null;
        isActive: boolean;
      }[];
    }[];
  };
  stats: {
    totalOrders: number;
    totalRevenue: number;
    customerCount: number;
    staffCount: number;
    categoryCount: number;
    serviceCount: number;
    ordersByStatus: Record<string, number>;
  };
};

const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL ?? 'http://localhost:3000';

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Platforma admini',
  super_admin: 'Bosh admin',
  branch_manager: 'Filial menejeri',
  operator: 'Operator',
  courier: 'Kuryer',
  customer: 'Mijoz',
};

const ROLE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'info' | 'secondary'> = {
  super_admin: 'default',
  branch_manager: 'info',
  operator: 'warning',
  courier: 'success',
};

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

          {/* Umumiy ko'rsatkichlar */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
            {[
              { icon: Users, label: 'Xodimlar', value: org.stats.staffCount, color: 'text-blue-600 bg-blue-500/10' },
              { icon: Building2, label: 'Filiallar', value: org.branchCount, color: 'text-violet-600 bg-violet-500/10' },
              { icon: Layers, label: 'Kategoriyalar', value: org.stats.categoryCount ?? org.catalog?.categoryCount ?? 0, color: 'text-indigo-600 bg-indigo-500/10' },
              { icon: Tag, label: 'Xizmatlar', value: org.stats.serviceCount ?? org.catalog?.serviceCount ?? 0, color: 'text-sky-600 bg-sky-500/10' },
              { icon: ShoppingBag, label: 'Buyurtmalar', value: org.stats.totalOrders, color: 'text-amber-600 bg-amber-500/10' },
              { icon: Wallet, label: 'Umumiy tushum', value: formatPrice(org.stats.totalRevenue), color: 'text-emerald-600 bg-emerald-500/10', small: true },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label}>
                  <CardContent className="pt-6">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className={`font-bold ${s.small ? 'text-base' : 'text-2xl'}`}>{s.value}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <OrderProcessPanel
            orgId={org.id}
            ordersByStatus={org.stats.ordersByStatus}
            totalOrders={org.stats.totalOrders}
          />

          {org.catalog && <ServiceCatalogPanel catalog={org.catalog} />}

          {/* Xodimlar ro'yxati */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Xodimlar ({org.staff?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {!org.staff || org.staff.length === 0 ? (
                <p className="text-sm text-muted-foreground">Xodimlar topilmadi</p>
              ) : (
                <div className="space-y-2">
                  {org.staff.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-secondary/40"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{s.fullName}</span>
                          <Badge variant={ROLE_VARIANT[s.role] ?? 'secondary'}>
                            {ROLE_LABELS[s.role] ?? s.role}
                          </Badge>
                          {!s.isActive && <Badge variant="destructive">Faol emas</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {s.phone}
                          </span>
                          {s.email && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {s.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground sm:text-right shrink-0">
                        {s.branches.length > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {s.branches.join(', ')}
                          </span>
                        ) : (
                          <span>Barcha filiallar</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                CRM: {CRM_URL}/login — xodim telefon raqami va paroli bilan kiradi
              </p>
            </CardContent>
          </Card>

          {/* Filiallar */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Filiallar ({org.branchCount})</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {org.branches?.map((b) => (
                <div key={b.id} className="p-4 rounded-lg border border-border">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-medium">{b.name}</span>
                    {!b.isActive && <Badge variant="destructive">Faol emas</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground inline-flex items-start gap-1">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    {b.address}
                  </p>
                  <p className="text-sm text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                    <Phone className="h-3.5 w-3.5" />
                    {b.phone}
                  </p>
                  <div className="flex gap-4 mt-3 pt-3 border-t border-border text-sm">
                    <span>
                      <span className="font-semibold">{b.orderCount}</span>{' '}
                      <span className="text-muted-foreground">buyurtma</span>
                    </span>
                    <span>
                      <span className="font-semibold">{b.staffCount}</span>{' '}
                      <span className="text-muted-foreground">xodim</span>
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Aloqa + demo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(org.contactPhone || org.contactEmail) && (
              <Card>
                <CardHeader>
                  <CardTitle>Aloqa</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {org.contactPhone && (
                    <p className="inline-flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {org.contactPhone}
                    </p>
                  )}
                  {org.contactEmail && (
                    <p className="inline-flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {org.contactEmail}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {org.demoEndsAt && (
              <Card>
                <CardHeader>
                  <CardTitle>Demo muddati</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <p>
                    Boshlangan:{' '}
                    {org.demoStartedAt ? new Date(org.demoStartedAt).toLocaleString('uz-UZ') : '—'}
                  </p>
                  <p>Tugaydi: {new Date(org.demoEndsAt).toLocaleString('uz-UZ')}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </MerchantShell>
  );
}
