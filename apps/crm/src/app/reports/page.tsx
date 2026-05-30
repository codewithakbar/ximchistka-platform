'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Download, TrendingUp, ClipboardList, Wallet, Building2, BarChart3, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api, formatPrice } from '@/lib/api';
import { useRealtimeOrders } from '@/hooks/use-realtime-orders';

type BranchStat = {
  branchId: string;
  branchName: string;
  orderCount: number;
  revenue: number;
  avgOrder: number;
  orderSharePercent: number;
  revenueSharePercent: number;
};

type Report = {
  totalOrders: number;
  totalRevenue: number;
  cancelledOrders: number;
  avgOrderAmount: number;
  branchCount: number;
  byDay: { date: string; count: number; revenue: number }[];
  byBranch: BranchStat[];
};

type Branch = { id: string; name: string };

export default function ReportsPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const emptyReport: Report = {
    totalOrders: 0,
    totalRevenue: 0,
    cancelledOrders: 0,
    avgOrderAmount: 0,
    branchCount: 0,
    byDay: [],
    byBranch: [],
  };

  const load = useCallback(async () => {
    setReport(null);
    try {
      const q = new URLSearchParams({ from, to });
      if (branchId) q.set('branchId', branchId);
      const data = await api<Report>(`/reports/daily?${q}`);
      setReport(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Hisobotni yuklab bo\'lmadi');
      setReport(emptyReport);
    }
  }, [from, to, branchId]);

  useEffect(() => {
    api<Branch[]>('/branches').then(setBranches).catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { connected } = useRealtimeOrders(load, true);

  async function exportCsv() {
    const q = new URLSearchParams({ from, to });
    if (branchId) q.set('branchId', branchId);
    const res = await api<{ csv: string }>(`/reports/export?${q}`);
    const blob = new Blob([res.csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ximchistka-${from}-${to}.csv`;
    a.click();
  }

  const chartBranches = report?.byBranch.filter((b) => b.orderCount > 0) ?? [];

  return (
    <AppShell title="Hisobotlar">
      <div className="flex items-center justify-end mb-3">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
            connected
              ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30'
              : 'bg-muted text-muted-foreground border-border'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`}
          />
          {connected ? 'Jonli yangilanish' : 'Ulanmoqda...'}
        </span>
      </div>
      <Card className="mb-4">
        <CardContent className="pt-6 flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1 min-w-0">
            <Label>Boshlanish sanasi</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex-1 min-w-0">
            <Label>Tugash sanasi</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex-1 min-w-0">
            <Label>Filial</Label>
            <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">Barcha filiallar (umumiy)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button onClick={load} className="flex-1 md:flex-none">Yangilash</Button>
            <Button variant="outline" onClick={exportCsv} className="flex-1 md:flex-none">
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        {branchId ? 'Tanlangan filial' : 'Umumiy ko\'rsatkichlar (barcha filiallar)'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <SummaryCard
          icon={ClipboardList}
          label="Jami buyurtmalar"
          value={report ? String(report.totalOrders) : undefined}
          color="bg-blue-500/10 text-blue-600"
        />
        <SummaryCard
          icon={Wallet}
          label="Jami tushum"
          value={report ? formatPrice(report.totalRevenue) : undefined}
          color="bg-violet-500/10 text-violet-600"
        />
        <SummaryCard
          icon={TrendingUp}
          label="O'rtacha buyurtma"
          value={
            report
              ? report.totalOrders
                ? formatPrice(report.avgOrderAmount)
                : '—'
              : undefined
          }
          color="bg-emerald-500/10 text-emerald-600"
        />
        <SummaryCard
          icon={Building2}
          label="Filiallar"
          value={report ? String(report.branchCount) : undefined}
          color="bg-amber-500/10 text-amber-600"
        />
        <SummaryCard
          icon={XCircle}
          label="Bekor qilingan"
          value={report ? String(report.cancelledOrders) : undefined}
          color="bg-rose-500/10 text-rose-600"
        />
      </div>

      {!branchId && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Filiallar bo&apos;yicha
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Yaratilgan va tanlangan davrda yakunlangan buyurtmalar (tushum va ulush)
            </p>
          </CardHeader>
          <CardContent>
            {report === null ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : report.byBranch.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Filial topilmadi</p>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-left font-medium px-6 py-3">Filial</th>
                      <th className="text-right font-medium px-6 py-3">Buyurtmalar</th>
                      <th className="text-right font-medium px-6 py-3">Ulush</th>
                      <th className="text-right font-medium px-6 py-3">Tushum</th>
                      <th className="text-right font-medium px-6 py-3">Ulush</th>
                      <th className="text-right font-medium px-6 py-3">O&apos;rtacha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byBranch.map((b) => (
                      <tr
                        key={b.branchId}
                        className="border-b border-border last:border-0 hover:bg-secondary/50"
                      >
                        <td className="px-6 py-3 font-medium">
                          <Link
                            href={`/branches/${b.branchId}`}
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {b.branchName}
                          </Link>
                        </td>
                        <td className="px-6 py-3 text-right">{b.orderCount}</td>
                        <td className="px-6 py-3 text-right text-muted-foreground">
                          {b.orderSharePercent}%
                        </td>
                        <td className="px-6 py-3 text-right font-semibold">{formatPrice(b.revenue)}</td>
                        <td className="px-6 py-3 text-right text-muted-foreground">
                          {b.revenueSharePercent}%
                        </td>
                        <td className="px-6 py-3 text-right text-muted-foreground">
                          {b.orderCount ? formatPrice(b.avgOrder) : '—'}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-primary/5 font-semibold">
                      <td className="px-6 py-3">JAMI</td>
                      <td className="px-6 py-3 text-right">{report.totalOrders}</td>
                      <td className="px-6 py-3 text-right">100%</td>
                      <td className="px-6 py-3 text-right">{formatPrice(report.totalRevenue)}</td>
                      <td className="px-6 py-3 text-right">100%</td>
                      <td className="px-6 py-3 text-right">
                        {report.totalOrders ? formatPrice(report.avgOrderAmount) : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!branchId && chartBranches.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filiallar taqqoslash</CardTitle>
            <p className="text-sm text-muted-foreground">Tushum bo&apos;yicha</p>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartBranches} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="branchName" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => formatPrice(value)}
                    contentStyle={{ border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Tushum" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="orderCount" name="Buyurtmalar" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tushum dinamikasi</CardTitle>
          <p className="text-sm text-muted-foreground">
            {branchId ? 'Tanlangan filial bo\'yicha kunlik' : 'Barcha filiallar bo\'yicha kunlik umumiy'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {report ? (
              report.byDay.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.byDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === 'revenue' ? formatPrice(value) : value
                      }
                      contentStyle={{ border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      name="Tushum"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="Buyurtmalar"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-16">
                  Tanlangan davrda ma&apos;lumot yo&apos;q
                </p>
              )
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof ClipboardList;
  label: string;
  value?: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-2">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
        {value !== undefined ? (
          <div className="text-2xl font-bold">{value}</div>
        ) : (
          <Skeleton className="h-9 w-28" />
        )}
      </CardContent>
    </Card>
  );
}
