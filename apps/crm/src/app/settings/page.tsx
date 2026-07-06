'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  User,
  Building2,
  Bell,
  Server,
  Save,
  Lock,
  Mail,
  Phone,
  Shield,
  Camera,
  Trash2,
  Palette,
} from 'lucide-react';
import { AppShell } from '@/components/layout/shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StaffAvatar } from '@/components/staff/staff-avatar';
import { ThemeToggle, LanguageToggle } from '@/components/layout/prefs-controls';
import { api, clearAuth, updateStoredUser } from '@/lib/api';
import { fileToAvatarDataUrl } from '@/lib/image';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';

type Profile = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  role: string;
  avatarUrl?: string | null;
  organization: { id: string; name: string; slug: string } | null;
  branches: { id: string; name: string }[];
  createdAt: string;
};

type Organization = {
  id: string;
  name: string;
  slug: string;
  branchCount: number;
  userCount: number;
};

type SystemInfo = {
  smsProvider: string;
  apiVersion: string;
  environment: string;
};

const NOTIF_KEY = 'ximchistka-crm-notifications';

type NotifPrefs = {
  orderStatus: boolean;
  newOrder: boolean;
  dailyReport: boolean;
};

const defaultNotif: NotifPrefs = {
  orderStatus: true,
  newOrder: true,
  dailyReport: false,
};

const roleLabels: Record<string, string> = {
  super_admin: 'Super admin',
  branch_manager: 'Filial menejeri',
  operator: 'Operator',
  courier: 'Kuryer',
};

const tabs = [
  { id: 'appearance', labelKey: 'settings.appearance', icon: Palette },
  { id: 'profile', labelKey: 'settings.profile', icon: User },
  { id: 'organization', labelKey: 'settings.organization', icon: Building2 },
  { id: 'notifications', labelKey: 'settings.notifications', icon: Bell },
  { id: 'system', labelKey: 'settings.system', icon: Server },
] as const;

type TabId = (typeof tabs)[number]['id'];

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { theme } = useTheme();
  const [tab, setTab] = useState<TabId>('appearance');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [notif, setNotif] = useState<NotifPrefs>(defaultNotif);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = profile?.role === 'super_admin';

  async function saveAvatar(avatarUrl: string | null) {
    setAvatarSaving(true);
    try {
      const updated = await api<Profile>('/settings/profile', {
        method: 'PATCH',
        body: JSON.stringify({ avatarUrl }),
      });
      setProfile(updated);
      updateStoredUser({ avatarUrl: updated.avatarUrl ?? null });
      window.dispatchEvent(new Event('profile-updated'));
      toast.success(avatarUrl ? 'Surat yangilandi' : 'Surat olib tashlandi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setAvatarSaving(false);
    }
  }

  async function onAvatarPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      await saveAvatar(dataUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rasmni yuklab bo\'lmadi');
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem(NOTIF_KEY);
    if (stored) {
      try {
        setNotif(JSON.parse(stored) as NotifPrefs);
      } catch {
        setNotif(defaultNotif);
      }
    }

    Promise.all([
      api<Profile>('/settings/profile'),
      api<SystemInfo>('/settings/system').catch(() => null),
    ])
      .then(async ([p, s]) => {
        setProfile(p);
        setFullName(p.fullName);
        setEmail(p.email ?? '');
        setSystem(s);
        updateStoredUser({ role: p.role, fullName: p.fullName });

        if (p.organization && p.role !== 'customer') {
          try {
            const o = await api<Organization>('/settings/organization');
            setOrg(o);
            setOrgName(o.name);
            setOrgSlug(o.slug);
          } catch {
            setOrg(p.organization as Organization);
            setOrgName(p.organization.name);
            setOrgSlug(p.organization.slug);
          }
        }
      })
      .catch(() => toast.error('Sozlamalarni yuklab bo\'lmadi'))
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    try {
      const updated = await api<Profile>('/settings/profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName, email: email || undefined }),
      });
      setProfile(updated);
      updateStoredUser({ fullName: updated.fullName });
      toast.success('Profil saqlandi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
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
    }
  }

  async function saveOrganization(e: FormEvent) {
    e.preventDefault();
    if (!isSuperAdmin) return;
    try {
      const updated = await api<Organization>('/settings/organization', {
        method: 'PATCH',
        body: JSON.stringify({ name: orgName, slug: orgSlug }),
      });
      setOrg(updated);
      toast.success('Tashkilot saqlandi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  }

  function saveNotifications() {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notif));
    toast.success('Bildirishnoma sozlamalari saqlandi');
  }

  const visibleTabs = tabs.filter((t) => {
    if (t.id === 'organization') return profile?.organization;
    return true;
  });

  return (
    <AppShell title={t('settings.title')}>
      <div className="flex flex-col lg:flex-row gap-6">
        <nav className="lg:w-56 shrink-0 flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
          {visibleTabs.map((tabItem) => {
            const Icon = tabItem.icon;
            return (
              <button
                key={tabItem.id}
                onClick={() => setTab(tabItem.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                  tab === tabItem.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary',
                )}
              >
                <Icon className="h-4 w-4" />
                {t(tabItem.labelKey, tabItem.id)}
              </button>
            );
          })}
        </nav>

        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <>
              {tab === 'appearance' && (
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle>{t('settings.appearance')}</CardTitle>
                    <CardDescription>{t('settings.appearanceDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-secondary/30">
                      <div>
                        <div className="font-medium text-sm">{t('settings.theme')}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {t('settings.currentTheme')}: {theme === 'dark' ? t('theme.dark') : t('theme.light')}
                        </div>
                      </div>
                      <ThemeToggle />
                    </div>
                    <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-secondary/30">
                      <div>
                        <div className="font-medium text-sm">{t('settings.language')}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">O‘zbek / Русский</div>
                      </div>
                      <LanguageToggle />
                    </div>
                  </CardContent>
                </Card>
              )}

              {tab === 'profile' && profile && (
                <div className="space-y-4 animate-fade-in">
                  <Card>
                    <CardHeader>
                      <CardTitle>Shaxsiy ma&apos;lumotlar</CardTitle>
                      <CardDescription>Ism va email manzilingizni yangilang</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 mb-6">
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          className="group relative"
                          title="Suratni o'zgartirish"
                        >
                          <StaffAvatar
                            name={profile.fullName}
                            src={profile.avatarUrl}
                            role={profile.role}
                            size="xl"
                          />
                          <span
                            className={cn(
                              'absolute inset-0 rounded-full bg-black/45 flex items-center justify-center text-white transition-opacity',
                              avatarSaving ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                            )}
                          >
                            <Camera className={cn('h-5 w-5', avatarSaving && 'animate-pulse')} />
                          </span>
                        </button>
                        <div>
                          <div className="font-medium">{profile.fullName}</div>
                          <p className="text-xs text-muted-foreground mb-2">
                            JPG yoki PNG — kvadrat surat tavsiya etiladi
                          </p>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => avatarInputRef.current?.click()}
                              loading={avatarSaving}
                            >
                              <Camera className="h-3.5 w-3.5" />
                              Surat yuklash
                            </Button>
                            {profile.avatarUrl && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => saveAvatar(null)}
                                disabled={avatarSaving}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Olib tashlash
                              </Button>
                            )}
                          </div>
                        </div>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={onAvatarPicked}
                        />
                      </div>
                      <form onSubmit={saveProfile} className="space-y-4 max-w-md">
                        <div>
                          <Label>To&apos;liq ism</Label>
                          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
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
                              placeholder="admin@ximchistka.uz"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Telefon</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-10 bg-muted" value={profile.phone} disabled />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Telefon raqamini o&apos;zgartirish uchun admin bilan bog&apos;laning</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="info">{roleLabels[profile.role] ?? profile.role}</Badge>
                          {profile.branches.map((b) => (
                            <Badge key={b.id} variant="secondary">{b.name}</Badge>
                          ))}
                        </div>
                        <Button type="submit">
                          <Save className="h-4 w-4" />
                          Saqlash
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Parolni o&apos;zgartirish</CardTitle>
                      <CardDescription>Xavfsizlik uchun kuchli parol tanlang</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={savePassword} className="space-y-4 max-w-md">
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
                            />
                          </div>
                        </div>
                        <Button type="submit" variant="outline">
                          Parolni yangilash
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}

              {tab === 'organization' && profile?.organization && (
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle>Tashkilot</CardTitle>
                    <CardDescription>
                      {isSuperAdmin
                        ? 'Kompaniya nomi va identifikatorini boshqaring'
                        : 'Tashkilot ma\'lumotlari (faqat ko\'rish)'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {org && (
                      <div className="grid grid-cols-2 gap-4 mb-6 max-w-sm">
                        <div className="rounded-lg bg-secondary p-4">
                          <div className="text-2xl font-bold">{org.branchCount}</div>
                          <div className="text-xs text-muted-foreground">Filiallar</div>
                        </div>
                        <div className="rounded-lg bg-secondary p-4">
                          <div className="text-2xl font-bold">{org.userCount}</div>
                          <div className="text-xs text-muted-foreground">Xodimlar</div>
                        </div>
                      </div>
                    )}
                    <form onSubmit={saveOrganization} className="space-y-4 max-w-md">
                      <div>
                        <Label>Tashkilot nomi</Label>
                        <Input
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          disabled={!isSuperAdmin}
                          required
                        />
                      </div>
                      <div>
                        <Label>Slug (URL identifikator)</Label>
                        <Input
                          value={orgSlug}
                          onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                          disabled={!isSuperAdmin}
                          required
                        />
                      </div>
                      {isSuperAdmin && (
                        <Button type="submit">
                          <Save className="h-4 w-4" />
                          Saqlash
                        </Button>
                      )}
                    </form>
                  </CardContent>
                </Card>
              )}

              {tab === 'notifications' && (
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle>Bildirishnomalar</CardTitle>
                    <CardDescription>CRM ichidagi bildirishnoma afzalliklari</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 max-w-lg">
                    {[
                      { key: 'orderStatus' as const, label: 'Buyurtma statusi o\'zgarganda', desc: 'SMS va panel bildirishnomasi' },
                      { key: 'newOrder' as const, label: 'Yangi buyurtma kelganda', desc: 'Operator va menejerlar uchun' },
                      { key: 'dailyReport' as const, label: 'Kunlik hisobot', desc: 'Har kuni ertalab email' },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border cursor-pointer hover:bg-secondary/50"
                      >
                        <div>
                          <div className="font-medium text-sm">{item.label}</div>
                          <div className="text-xs text-muted-foreground">{item.desc}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notif[item.key]}
                          onChange={(e) => setNotif((p) => ({ ...p, [item.key]: e.target.checked }))}
                          className="h-5 w-5 rounded border-input accent-primary mt-0.5"
                        />
                      </label>
                    ))}
                    <Button onClick={saveNotifications}>
                      <Save className="h-4 w-4" />
                      Saqlash
                    </Button>
                  </CardContent>
                </Card>
              )}

              {tab === 'system' && (
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle>Tizim ma&apos;lumotlari</CardTitle>
                    <CardDescription>Server va integratsiya holati</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-4 max-w-md">
                      {[
                        { label: 'SMS provayder', value: system?.smsProvider ?? '—' },
                        { label: 'API versiya', value: system?.apiVersion ?? '—' },
                        { label: 'Muhit', value: system?.environment ?? '—' },
                        { label: 'Foydalanuvchi ID', value: profile?.id ?? '—', mono: true },
                        { label: 'API URL', value: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1', mono: true },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between gap-4 py-2 border-b border-border last:border-0">
                          <dt className="text-sm text-muted-foreground">{row.label}</dt>
                          <dd className={cn('text-sm font-medium text-right', row.mono && 'font-mono text-xs')}>
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
