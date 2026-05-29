'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, MapPin, Phone, Clock, Plus, ArrowRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty } from '@/components/ui/empty';
import { AddBranchDialog } from '@/components/branches/add-branch-dialog';
import { api } from '@/lib/api';
import { useCanManageBranches } from '@/hooks/use-client-auth';

type Branch = {
  id: string;
  name: string;
  address: string;
  phone: string;
  openTime: string;
  closeTime: string;
  isActive: boolean;
};

export default function BranchesPage() {
  const canManage = useCanManageBranches();
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(() => {
    setBranches(null);
    api<Branch[]>('/branches')
      .then(setBranches)
      .catch(() => {
        setBranches([]);
        toast.error('Filiallarni yuklab bo\'lmadi');
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function deleteBranch(b: Branch, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const ok = window.confirm(`"${b.name}" filialini o'chirasizmi?`);
    if (!ok) return;
    try {
      await api(`/branches/${b.id}`, { method: 'DELETE' });
      toast.success('Filial o\'chirildi');
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  }

  const activeCount = branches?.filter((b) => b.isActive).length ?? 0;

  return (
    <AppShell title="Filiallar">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">
          Jami {branches?.length ?? 0} ta filial
          {branches && branches.length !== activeCount && ` · ${activeCount} ta faol`}
        </p>
        {canManage && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Yangi filial
          </Button>
        )}
      </div>

      {branches === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <Empty
          icon={Building2}
          title="Filiallar yo'q"
          description="Birinchi filialingizni qo'shing"
          action={
            canManage ? (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Yangi filial
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className={`hover:shadow-md transition-shadow group ${
                  !b.isActive ? 'opacity-75 border-dashed' : ''
                }`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-1">
                      {b.isActive ? (
                        <Badge variant="success">Faol</Badge>
                      ) : (
                        <Badge variant="secondary">No&apos;faol</Badge>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          onClick={(e) => deleteBranch(b, e)}
                          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Filialni o'chirish"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="font-semibold text-lg mb-3">{b.name}</h3>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{b.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{b.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>
                        {b.openTime} - {b.closeTime}
                      </span>
                    </div>
                  </div>

                  <Link href={`/branches/${b.id}`} className="mt-4 block">
                    <Button
                      variant="outline"
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground"
                    >
                      Filial ichiga kirish
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <AddBranchDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={load}
      />
    </AppShell>
  );
}
