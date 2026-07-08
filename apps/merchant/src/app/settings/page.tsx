'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { User, Lock, Shield, Save, Mail, Phone } from 'lucide-react';
import { MerchantShell } from '@/components/layout/shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, clearAuth, updateStoredUser } from '@/lib/api';

type Profile = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  role: string;
  createdAt: string;
};

export default function MerchantSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    api<Profile>('/settings/profile')
      .then((p) => {
        setProfile(p);
        setFullName(p.fullName ?? '');
        setEmail(p.email ?? '');
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Profilni yuklab bo‘lmadi');
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error('Ism majburiy');
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await api<Profile>('/settings/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim() || undefined,
        }),
      });
      setProfile(updated);
      updateStoredUser({ fullName: updated.fullName, email: updated.email });
      toast.success('Profil saqlandi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Yangi parol kamida 6 ta belgidan iborat bo‘lishi kerak');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Yangi parol tasdiqlash bilan mos kelmadi');
      return;
    }
    setSavingPassword(true);
    try {
      await api('/settings/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast.success('Parol yangilandi. Qayta kiring.');
      clearAuth();
      router.push('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <MerchantShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Sozlamalar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Profil maʼlumotlari va parolni yangilang
        </p>
      </div>

      {loading || !profile ? (
        <div className="space-y-4 max-w-xl">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : (
        <div className="space-y-6 max-w-xl">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4 text-violet-600" />
                    Profil
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Shaxsiy maʼlumotlaringizni yangilang
                  </CardDescription>
                </div>
                <Badge variant="secondary">Platform admin</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="space-y-4">
                <div>
                  <Label>Toʻliq ism</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                    />
                  </div>
                </div>
                <div>
                  <Label>Telefon</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-10" value={profile.phone} disabled />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Telefon raqamni oʻzgartirib boʻlmaydi
                  </p>
                </div>
                <Button type="submit" loading={savingProfile}>
                  <Save className="h-4 w-4" />
                  Saqlash
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-violet-600" />
                Parolni oʻzgartirish
              </CardTitle>
              <CardDescription>
                Parol yangilangandan keyin qayta login qilishingiz kerak boʻladi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={savePassword} className="space-y-4">
                <div>
                  <Label>Joriy parol</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>
                <div>
                  <Label>Yangi parol</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={6}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Kamida 6 ta belgi</p>
                </div>
                <div>
                  <Label>Yangi parolni tasdiqlang</Label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-10"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength={6}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>
                <Button type="submit" variant="outline" loading={savingPassword}>
                  <Lock className="h-4 w-4" />
                  Parolni yangilash
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </MerchantShell>
  );
}
