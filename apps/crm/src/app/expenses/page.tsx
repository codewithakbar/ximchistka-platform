'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Receipt, Trash2, TrendingDown } from 'lucide-react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty } from '@/components/ui/empty';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { api, formatPrice } from '@/lib/api';
import { useClientRole } from '@/hooks/use-client-auth';
import { useFormatDate, useI18n } from '@/lib/i18n';

const CATEGORIES = ['rent', 'salary', 'supplies', 'utilities', 'transport', 'other'] as const;
type Category = (typeof CATEGORIES)[number];

type Branch = { id: string; name: string };

type ExpenseItem = {
  id: string;
  category: string;
  amount: number;
  note: string | null;
  spentAt: string;
  branch: { id: string; name: string } | null;
  createdBy: string | null;
};

type ExpensesResponse = {
  total: number;
  count: number;
  byCategory: { category: string; amount: number }[];
  items: ExpenseItem[];
};

const pad = (n: number) => String(n).padStart(2, '0');
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const monthStartStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
};

export default function ExpensesPage() {
  const { t } = useI18n();
  const formatDate = useFormatDate();
  const role = useClientRole();
  const isSuperAdmin = role === 'super_admin';

  const [data, setData] = useState<ExpensesResponse | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [from, setFrom] = useState(monthStartStr());
  const [to, setTo] = useState(todayStr());
  const [branchId, setBranchId] = useState('');

  // Yangi xarajat formasi
  const [formOpen, setFormOpen] = useState(false);
  const [fCategory, setFCategory] = useState<Category>('supplies');
  const [fAmount, setFAmount] = useState('');
  const [fNote, setFNote] = useState('');
  const [fBranch, setFBranch] = useState('');
  const [fDate, setFDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<ExpenseItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const catLabel = (c: string) => t(`expenses.cat.${c}`, c);

  const loadSeq = useRef(0);
  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    setData(null);
    try {
      const q = new URLSearchParams({ from, to });
      if (branchId) q.set('branchId', branchId);
      const res = await api<ExpensesResponse>(`/expenses?${q}`);
      if (seq === loadSeq.current) setData(res);
    } catch (e) {
      if (seq !== loadSeq.current) return;
      toast.error(e instanceof Error ? e.message : t('common.error'));
      setData({ total: 0, count: 0, byCategory: [], items: [] });
    }
  }, [from, to, branchId, t]);

  useEffect(() => {
    api<Branch[]>('/branches').then(setBranches).catch(() => setBranches([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openForm() {
    setFCategory('supplies');
    setFAmount('');
    setFNote('');
    setFBranch(branchId || (branches.length === 1 ? branches[0].id : ''));
    setFDate(todayStr());
    setFormOpen(true);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const amount = Number(fAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t('expenses.invalidAmount'));
      return;
    }
    if (!isSuperAdmin && !fBranch) {
      toast.error(t('expenses.selectBranch'));
      return;
    }
    setSaving(true);
    try {
      await api('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category: fCategory,
          amount: Math.floor(amount),
          note: fNote.trim() || undefined,
          branchId: fBranch || undefined,
          spentAt: fDate ? new Date(fDate).toISOString() : undefined,
        }),
      });
      toast.success(t('expenses.toastAdded'));
      setFormOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api(`/expenses/${deleting.id}`, { method: 'DELETE' });
      toast.success(t('expenses.toastDeleted'));
      setDeleting(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <AppShell title={t('expenses.title')}>
      {/* Filtrlar */}
      <Card className="mb-4">
        <CardContent className="pt-6 flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1 min-w-0">
            <Label>{t('reports.dateFrom')}</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex-1 min-w-0">
            <Label>{t('reports.dateTo')}</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex-1 min-w-0">
            <Label>{t('common.branch')}</Label>
            <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">{t('reports.allBranches')}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </div>
          <Button onClick={openForm} className="w-full md:w-auto">
            <Plus className="h-4 w-4" />
            {t('expenses.add')}
          </Button>
        </CardContent>
      </Card>

      {/* Jami + kategoriyalar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingDown className="h-4 w-4 text-rose-500" />
              {t('expenses.totalLabel')}
            </div>
            <div className="mt-1 text-2xl font-bold text-rose-600">
              {data ? formatPrice(data.total) : <Skeleton className="h-8 w-32" />}
            </div>
            {data && (
              <div className="text-xs text-muted-foreground mt-1">
                {t('expenses.countLabel', { count: data.count })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('expenses.byCategory')}</CardTitle>
          </CardHeader>
          <CardContent>
            {!data ? (
              <Skeleton className="h-16 w-full" />
            ) : data.byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('expenses.emptyPeriod')}</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {data.byCategory.map((c) => (
                  <div key={c.category} className="rounded-lg border border-border px-3 py-2 min-w-[120px]">
                    <div className="text-xs text-muted-foreground">{catLabel(c.category)}</div>
                    <div className="font-semibold">{formatPrice(c.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ro'yxat */}
      <Card>
        <CardContent className="pt-6">
          {!data ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <Empty
              icon={Receipt}
              title={t('expenses.emptyTitle')}
              description={t('expenses.emptyDesc')}
              action={
                <Button onClick={openForm}>
                  <Plus className="h-4 w-4" />
                  {t('expenses.add')}
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left font-medium px-6 py-3">{t('expenses.colCategory')}</th>
                    <th className="text-left font-medium px-6 py-3">{t('common.branch')}</th>
                    <th className="text-left font-medium px-6 py-3">{t('common.note')}</th>
                    <th className="text-right font-medium px-6 py-3">{t('expenses.colAmount')}</th>
                    <th className="text-left font-medium px-6 py-3">{t('expenses.colDate')}</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-0 hover:bg-secondary/50">
                      <td className="px-6 py-3 font-medium">{catLabel(e.category)}</td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {e.branch?.name ?? t('expenses.general')}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground max-w-[220px] truncate">
                        {e.note ?? '—'}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-rose-600">
                        {formatPrice(e.amount)}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground text-xs">
                        {formatDate(e.spentAt)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleting(e)}
                          title={t('common.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yangi xarajat oynasi */}
      {formOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={saving ? undefined : () => setFormOpen(false)} />
          <form
            onSubmit={onCreate}
            className="relative w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl space-y-4"
          >
            <h2 className="text-lg font-semibold">{t('expenses.add')}</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('expenses.colCategory')}</Label>
                <Select value={fCategory} onChange={(e) => setFCategory(e.target.value as Category)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{catLabel(c)}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>{t('expenses.colAmount')}</Label>
                <Input
                  type="number"
                  min={1}
                  value={fAmount}
                  onChange={(e) => setFAmount(e.target.value)}
                  placeholder="500000"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>
                  {t('common.branch')}
                  {isSuperAdmin && (
                    <span className="text-muted-foreground font-normal"> ({t('common.optional')})</span>
                  )}
                </Label>
                <Select value={fBranch} onChange={(e) => setFBranch(e.target.value)}>
                  {isSuperAdmin && <option value="">{t('expenses.general')}</option>}
                  {!isSuperAdmin && <option value="">{t('orders.pos.selectBranch')}</option>}
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>{t('expenses.date')}</Label>
                <Input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>{t('common.note')} ({t('common.optional')})</Label>
              <Textarea
                value={fNote}
                onChange={(e) => setFNote(e.target.value)}
                rows={2}
                className="resize-none"
                placeholder={t('expenses.notePlaceholder')}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" loading={saving}>
                {t('common.save')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        variant="destructive"
        title={t('expenses.deleteTitle')}
        description={
          deleting
            ? t('expenses.deleteBody', {
                category: catLabel(deleting.category),
                amount: formatPrice(deleting.amount),
              })
            : null
        }
        confirmLabel={t('common.delete')}
        loading={deleteBusy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </AppShell>
  );
}
