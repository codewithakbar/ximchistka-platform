'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Lock, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { api, saveAuth, getUser } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Card, CardContent } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api<{
        accessToken: string;
        refreshToken: string;
        user: { role: string; fullName?: string };
      }>('/auth/staff/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
      });
      if (data.user.role !== 'platform_admin') {
        toast.error('Faqat platforma adminlari kirishi mumkin');
        return;
      }
      saveAuth(data);
      toast.success(`Xush kelibsiz, ${data.user.fullName ?? 'Admin'}!`);
      router.push('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (getUser<{ role?: string }>()?.role === 'platform_admin') {
      router.replace('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Card className="w-full max-w-md border-slate-700 bg-slate-900/80 text-white shadow-2xl">
        <CardContent className="pt-8 pb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-violet-600 flex items-center justify-center">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Merchant Panel</h1>
              <p className="text-sm text-slate-400">Barcha firmalar boshqaruvi</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" autoComplete="off">
            <div>
              <Label className="text-slate-300">Telefon</Label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  className="pl-10 bg-slate-800 border-slate-600 text-white"
                  required
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Parol</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-600 text-white"
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
            <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700" loading={loading}>
              Kirish
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
