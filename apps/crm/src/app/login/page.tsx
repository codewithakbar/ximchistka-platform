'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Phone, Lock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { api, saveAuth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('+998901111111');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; role: string; fullName?: string; phone?: string; organizationId?: string; branchIds?: string[] };
      }>('/auth/staff/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      });
      saveAuth(data);
      try {
        const profile = await api<{
          fullName: string;
          role: string;
          organizationId?: string;
          organization?: { name: string };
        }>(
          '/settings/profile',
          { headers: { Authorization: `Bearer ${data.accessToken}` } },
        );
        saveAuth({
          ...data,
          user: {
            ...data.user,
            fullName: profile.fullName,
            role: profile.role,
            organizationId: profile.organizationId,
            organizationName: profile.organization?.name,
          },
        });
      } catch {
        /* profile optional on login */
      }
      toast.success(`Xush kelibsiz${data.user.fullName ? `, ${data.user.fullName}` : ''}!`);
      router.push('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary to-blue-700 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-semibold text-lg">Ximchistka CRM</span>
          </div>
        </div>
        <div className="relative">
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            Ximchistka biznesingizni
            <br />
            <span className="text-blue-200">aqlli boshqaring</span>
          </h2>
          <p className="text-blue-100 text-lg max-w-md">
            Filiallar, buyurtmalar, mijozlar va xodimlar — barchasi bitta zamonaviy panelda.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-4 max-w-md">
          {[
            { v: '24/7', l: 'Buyurtma qabul' },
            { v: '∞', l: 'Filiallar' },
            { v: '5 daq', l: "O'rnatish" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl bg-white/10 backdrop-blur p-4 border border-white/10">
              <div className="text-2xl font-bold">{s.v}</div>
              <div className="text-xs text-blue-100 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-semibold text-lg">Ximchistka CRM</span>
          </div>

          <h1 className="text-2xl font-bold mb-2">Tizimga kirish</h1>
          <p className="text-muted-foreground mb-8">
            Akkauntingiz orqali boshqaruv panelga kiring
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label>Telefon raqami</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                />
              </div>
            </div>
            <div>
              <Label>Parol</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" loading={loading} size="lg" className="w-full">
              Kirish
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <div className="mt-8 rounded-lg border border-dashed border-border bg-secondary/50 p-4">
            <div className="text-xs font-medium text-muted-foreground mb-2">Demo akkaunt</div>
            <div className="text-sm font-mono">+998 90 111 11 11 / admin123</div>
          </div>
        </div>
      </div>
    </div>
  );
}
