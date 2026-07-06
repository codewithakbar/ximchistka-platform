'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRealtimeOrders } from '@/hooks/use-realtime-orders';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import {
  TrendingUp,
  ClipboardList,
  CheckCircle2,
  Loader,
  Wallet,
  ArrowUpRight,
  Truck,
  Sparkles,
} from 'lucide-react';
import { getUser } from '@/lib/api';
import { canCreateOrders, StaffRole } from '@/lib/roles';
import { useI18n, useOrderStatusLabel } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, formatPrice } from '@/lib/api';
import { formatRelative } from '@/lib/utils';
import { OrderStatus } from '@ximchistka/shared';

type Dashboard = {
  todayOrders: number;
  readyOrders: number;
  inProcessing: number;
  revenueToday: number;
};

type RecentOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  branch: { name: string };
  customer: { user: { fullName: string } };
};

type DailyReport = {
  byDay: { date: string; count: number; revenue: number }[];
};

const stats = [
  {
    key: 'todayOrders' as const,
    labelKey: 'dash.todayOrders',
    icon: ClipboardList,
    color: 'text-blue-600 bg-blue-500/10',
    format: (v: number) => v.toString(),
  },
  {
    key: 'inProcessing' as const,
    labelKey: 'dash.inProcessing',
    icon: Loader,
    color: 'text-amber-600 bg-amber-500/10',
    format: (v: number) => v.toString(),
  },
  {
    key: 'readyOrders' as const,
    labelKey: 'dash.ready',
    icon: CheckCircle2,
    color: 'text-emerald-600 bg-emerald-500/10',
    format: (v: number) => v.toString(),
  },
  {
    key: 'revenueToday' as const,
    labelKey: 'dash.todayRevenue',
    icon: Wallet,
    color: 'text-violet-600 bg-violet-500/10',
    format: (v: number) => formatPrice(v),
  },
];

type Profile = {
  fullName: string;
  role: string;
  branches: { name: string }[];
};

type CourierTask = {
  id: string;
  order: { orderNumber: string; customer: { user: { fullName: string } } };
};

export default function DashboardPage() {
  const { t } = useI18n();
  const statusLabel = useOrderStatusLabel();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const chartGrid = isDark ? '#1e293b' : '#e5e7eb';
  const chartAxis = isDark ? '#64748b' : '#94a3b8';
  const chartPrimary = isDark ? '#3b82f6' : '#2563eb';
  const tooltipStyle = {
    border: `1px solid ${isDark ? '#24324a' : '#e5e7eb'}`,
    borderRadius: '8px',
    fontSize: '12px',
    backgroundColor: isDark ? '#101724' : '#ffffff',
    color: isDark ? '#e6eaf2' : '#0a0a0a',
  };
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<StaffRole>('operator');
  const [data, setData] = useState<Dashboard | null>(null);
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const [chart, setChart] = useState<DailyReport | null>(null);
  const [courierTasks, setCourierTasks] = useState<CourierTask[]>([]);

  const showCharts = role === 'super_admin';
  const showRevenue = showCharts;

  const refreshMetrics = useCallback(() => {
    api<Dashboard>('/reports/dashboard').then(setData).catch(() => setData(null));
    api<{ data: RecentOrder[] }>('/orders?limit=6').then((r) => setRecent(r.data)).catch(() => setRecent([]));

    if (role === 'super_admin') {
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      api<DailyReport>(`/reports/daily?from=${from}&to=${to}`).then(setChart).catch(console.error);
    }
  }, [role]);

  useRealtimeOrders(refreshMetrics, role === 'super_admin');

  useEffect(() => {
    const u = getUser<{ role?: StaffRole; fullName?: string }>();
    if (u?.role) setRole(u.role);

    api<Profile>('/settings/profile').then((p) => {
      setProfile(p);
      if (p.role) setRole(p.role as StaffRole);
    }).catch(() => {
      if (u?.fullName) setProfile({ fullName: u.fullName, role: u.role ?? 'operator', branches: [] });
    });
  }, []);

  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  useEffect(() => {
    if (role === 'courier') {
      api<CourierTask[]>('/courier/tasks').then(setCourierTasks).catch(() => setCourierTasks([]));
    }
  }, [role]);

  const visibleStats = showRevenue
    ? stats
    : stats.filter((s) => s.key !== 'revenueToday');

  const title = profile ? `${profile.fullName} — ${t('dash.panel')}` : t('dash.title');

  return (
    <AppShell title={title}>
      <Card className="mb-6 bg-gradient-to-r from-primary/10 to-transparent border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('dash.personal')}</p>
              <h2 className="text-2xl font-bold mt-1">
                {t('dash.hello')}, {profile?.fullName?.split(' ')[0] ?? t('dash.employee')}!
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t(`role.${role}`)} · {t(`roleDesc.${role}`)}
              </p>
              {profile?.branches && profile.branches.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t('dash.branches')}: {profile.branches.map((b) => b.name).join(', ')}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {role === 'courier' && (
                <Link href="/courier">
                  <Button>
                    <Truck className="h-4 w-4" />
                    {t('dash.myTasks')} ({courierTasks.length})
                  </Button>
                </Link>
              )}
              {canCreateOrders(role) && (
                <Link href="/orders">
                  <Button>
                    <ClipboardList className="h-4 w-4" />
                    {t('dash.newOrder')}
                  </Button>
                </Link>
              )}
              {canCreateOrders(role) && (
                <Link href="/orders">
                  <Button variant="outline">
                    <ClipboardList className="h-4 w-4" />
                    {t('dash.allOrders')}
                  </Button>
                </Link>
              )}
              {role === 'super_admin' && (
                <Link href="/staff">
                  <Button variant="outline">
                    <Sparkles className="h-4 w-4" />
                    {t('dash.addStaff')}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {role === 'courier' && courierTasks.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('dash.todayDeliveries')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {courierTasks.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                <span className="font-medium text-sm">{t.order.orderNumber}</span>
                <span className="text-sm text-muted-foreground">{t.order.customer.user.fullName}</span>
              </div>
            ))}
            <Link href="/courier">
              <Button variant="outline" size="sm" className="w-full mt-2">
                {t('dash.allTasks')}
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${showRevenue ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4 mb-6`}>
        {visibleStats.map((stat, i) => {
          const Icon = stat.icon;
          const value = data?.[stat.key];
          return (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${stat.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
                      <TrendingUp className="h-3 w-3" />
                      12%
                    </span>
                  </div>
                  {value === undefined ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <div className="text-2xl font-bold">{stat.format(value)}</div>
                  )}
                  <div className="text-sm text-muted-foreground mt-1">{t(stat.labelKey)}</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {showCharts && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{t('dash.ordersDynamics')}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{t('dash.last7days')}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {chart ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart.byDay}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartPrimary} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={chartPrimary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                    <XAxis dataKey="date" stroke={chartAxis} fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke={chartAxis} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={chartPrimary}
                      strokeWidth={2}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="h-full w-full" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dash.dailyOrders')}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t('dash.count')}</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {chart ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart.byDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                    <XAxis dataKey="date" stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke={chartAxis} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill={chartPrimary} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Skeleton className="h-full w-full" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{role === 'courier' ? t('dash.branchOrders') : t('dash.recentOrders')}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t('dash.newest6')}</p>
          </div>
          <Link href="/orders">
            <Button variant="outline" size="sm">
              {t('dash.all')}
              <ArrowUpRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recent.length === 0 ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              recent.map((o) => (
                <Link
                  key={o.id}
                  href={`/orders/${o.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                      {o.orderNumber.slice(-3)}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{o.orderNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {o.customer.user.fullName} · {o.branch.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold">{formatPrice(o.totalAmount)}</span>
                    <StatusBadge status={o.status} label={statusLabel(o.status)} />
                    <span className="hidden md:inline text-xs text-muted-foreground w-24 text-right">
                      {formatRelative(o.createdAt)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
