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
  Plus,
  X,
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
import { useI18n, useRoleLabel } from '@/lib/i18n';
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
  orderNumberPrefix?: string;
  orderNumberNext?: number;
  orderNumberPreview?: string;
  orderItemColors?: string[];
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

const tabs = [
  { id: 'appearance', labelKey: 'settings.appearance', icon: Palette },
  { id: 'profile', labelKey: 'settings.profile', icon: User },
  { id: 'password', labelKey: 'settings.password.title', icon: Lock },
  { id: 'organization', labelKey: 'settings.organization', icon: Building2 },
  { id: 'notifications', labelKey: 'settings.notifications', icon: Bell },
  { id: 'system', labelKey: 'settings.system', icon: Server },
] as const;

type TabId = (typeof tabs)[number]['id'];

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const roleLabel = useRoleLabel();
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [orderPrefix, setOrderPrefix] = useState('XC');
  const [orderNext, setOrderNext] = useState('1');
  const [orderItemColors, setOrderItemColors] = useState<string[]>([]);
  const [newItemColor, setNewItemColor] = useState('');
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
      toast.success(avatarUrl ? t('settings.toast.photoUpdated') : t('settings.toast.photoRemoved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
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
      toast.error(err instanceof Error ? err.message : t('settings.toast.photoUploadError'));
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
            setOrderPrefix(o.orderNumberPrefix ?? 'XC');
            setOrderNext(String(o.orderNumberNext ?? 1));
            setOrderItemColors(o.orderItemColors ?? []);
          } catch {
            setOrg(p.organization as Organization);
            setOrgName(p.organization.name);
            setOrgSlug(p.organization.slug);
          }
        }
      })
      .catch(() => toast.error(t('settings.toast.loadError')))
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
      toast.success(t('settings.toast.profileSaved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('signup.passwordMismatch'));
      return;
    }
    setPasswordSaving(true);
    try {
      await api('/settings/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast.success(t('settings.toast.passwordUpdated'));
      clearAuth();
      router.push('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    } finally {
      setPasswordSaving(false);
    }
  }

  async function saveOrganization(e: FormEvent) {
    e.preventDefault();
    if (!isSuperAdmin) return;
    const nextNum = Number.parseInt(orderNext, 10);
    if (!Number.isFinite(nextNum) || nextNum < 1) {
      toast.error(t('settings.org.orderNextInvalid'));
      return;
    }
    try {
      const updated = await api<Organization>('/settings/organization', {
        method: 'PATCH',
        body: JSON.stringify({
          name: orgName,
          slug: orgSlug,
          orderNumberPrefix: orderPrefix,
          orderNumberNext: nextNum,
          orderItemColors,
        }),
      });
      setOrg(updated);
      setOrderPrefix(updated.orderNumberPrefix ?? orderPrefix);
      setOrderNext(String(updated.orderNumberNext ?? nextNum));
      setOrderItemColors(updated.orderItemColors ?? orderItemColors);
      toast.success(t('settings.toast.orgSaved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xatolik');
    }
  }

  const orderPreview = (() => {
    const cleaned = orderPrefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'XC';
    const n = Number.parseInt(orderNext, 10);
    const seq = Number.isFinite(n) && n > 0 ? n : 1;
    const pad = Math.max(4, String(seq).length);
    return `${cleaned}-${String(seq).padStart(pad, '0')}`;
  })();

  function addItemColor() {
    const label = newItemColor.trim().slice(0, 40);
    if (!label) return;
    if (orderItemColors.some((c) => c.toLowerCase() === label.toLowerCase())) {
      toast.error(t('settings.org.itemColorDuplicate'));
      return;
    }
    if (orderItemColors.length >= 30) {
      toast.error(t('settings.org.itemColorLimit'));
      return;
    }
    setOrderItemColors((prev) => [...prev, label]);
    setNewItemColor('');
  }

  function removeItemColor(index: number) {
    setOrderItemColors((prev) => prev.filter((_, i) => i !== index));
  }

  function saveNotifications() {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notif));
    toast.success(t('settings.toast.notificationsSaved'));
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
                        <div className="text-xs text-muted-foreground mt-0.5">{t('settings.languageOptions')}</div>
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
                      <CardTitle>{t('settings.profile.personalTitle')}</CardTitle>
                      <CardDescription>{t('settings.profile.personalDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 mb-6">
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          className="group relative"
                          title={t('staff.changePhoto')}
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
                            {t('settings.profile.photoHint')}
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
                              {t('settings.profile.uploadPhoto')}
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
                                {t('settings.profile.removePhoto')}
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
                          <Label>{t('settings.profile.fullName')}</Label>
                          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                        </div>
                        <div>
                          <Label>{t('common.email')}</Label>
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
                          <Label>{t('common.phone')}</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-10 bg-muted" value={profile.phone} disabled />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{t('settings.profile.phoneHint')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="info">{roleLabel(profile.role)}</Badge>
                          {profile.branches.map((b) => (
                            <Badge key={b.id} variant="secondary">{b.name}</Badge>
                          ))}
                        </div>
                        <Button type="submit">
                          <Save className="h-4 w-4" />
                          {t('common.save')}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              )}

              {tab === 'password' && (
                <Card className="animate-fade-in">
                    <CardHeader>
                      <CardTitle>{t('settings.password.title')}</CardTitle>
                      <CardDescription>{t('settings.password.desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={savePassword} className="space-y-4 max-w-md">
                        <div>
                          <Label>{t('settings.password.current')}</Label>
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
                          <Label>{t('settings.password.new')}</Label>
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
                          <p className="text-xs text-muted-foreground mt-1">{t('settings.password.minHint')}</p>
                        </div>
                        <div>
                          <Label>{t('settings.password.confirm')}</Label>
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
                        <Button type="submit" variant="outline" loading={passwordSaving}>
                          <Lock className="h-4 w-4" />
                          {t('settings.password.submit')}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
              )}

              {tab === 'organization' && profile?.organization && (
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle>{t('settings.org.title')}</CardTitle>
                    <CardDescription>
                      {isSuperAdmin
                        ? t('settings.org.descEdit')
                        : t('settings.org.descView')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {org && (
                      <div className="grid grid-cols-2 gap-4 mb-6 max-w-sm">
                        <div className="rounded-lg bg-secondary p-4">
                          <div className="text-2xl font-bold">{org.branchCount}</div>
                          <div className="text-xs text-muted-foreground">{t('settings.org.branchesStat')}</div>
                        </div>
                        <div className="rounded-lg bg-secondary p-4">
                          <div className="text-2xl font-bold">{org.userCount}</div>
                          <div className="text-xs text-muted-foreground">{t('settings.org.staffStat')}</div>
                        </div>
                      </div>
                    )}
                    <form onSubmit={saveOrganization} className="space-y-4 max-w-md">
                      <div>
                        <Label>{t('settings.org.name')}</Label>
                        <Input
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          disabled={!isSuperAdmin}
                          required
                        />
                      </div>
                      <div>
                        <Label>{t('settings.org.slug')}</Label>
                        <Input
                          value={orgSlug}
                          onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                          disabled={!isSuperAdmin}
                          required
                        />
                      </div>

                      <div className="rounded-lg border border-border p-4 space-y-4 bg-secondary/20">
                        <div>
                          <div className="font-medium text-sm">{t('settings.org.orderNumberTitle')}</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('settings.org.orderNumberDesc')}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>{t('settings.org.orderPrefix')}</Label>
                            <Input
                              value={orderPrefix}
                              onChange={(e) =>
                                setOrderPrefix(
                                  e.target.value.toUpperCase().replace(/[^A-Z0-9]/gi, '').slice(0, 8),
                                )
                              }
                              disabled={!isSuperAdmin}
                              placeholder="XC"
                              maxLength={8}
                              required
                            />
                          </div>
                          <div>
                            <Label>{t('settings.org.orderNext')}</Label>
                            <Input
                              type="number"
                              min={1}
                              max={99999999}
                              value={orderNext}
                              onChange={(e) => setOrderNext(e.target.value)}
                              disabled={!isSuperAdmin}
                              required
                            />
                          </div>
                        </div>
                        <div className="rounded-md bg-card border border-border px-3 py-2">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {t('settings.org.orderPreview')}
                          </div>
                          <div className="text-lg font-bold font-mono tracking-wide mt-0.5">
                            {orderPreview}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-border p-4 space-y-4 bg-secondary/20">
                        <div>
                          <div className="font-medium text-sm">{t('settings.org.itemColorsTitle')}</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('settings.org.itemColorsDesc')}
                          </p>
                        </div>
                        {isSuperAdmin && (
                          <div className="flex gap-2">
                            <Input
                              value={newItemColor}
                              onChange={(e) => setNewItemColor(e.target.value.slice(0, 40))}
                              placeholder={t('settings.org.itemColorPlaceholder')}
                              className="flex-1"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addItemColor();
                                }
                              }}
                            />
                            <Button type="button" variant="secondary" onClick={addItemColor}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {orderItemColors.length === 0 ? (
                          <p className="text-xs text-muted-foreground">{t('settings.org.itemColorsEmpty')}</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {orderItemColors.map((color, index) => (
                              <span
                                key={`${color}-${index}`}
                                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium"
                              >
                                {color}
                                {isSuperAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => removeItemColor(index)}
                                    className="rounded-full p-0.5 hover:bg-secondary text-muted-foreground hover:text-foreground"
                                    aria-label={t('common.delete')}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {isSuperAdmin && (
                        <Button type="submit">
                          <Save className="h-4 w-4" />
                          {t('common.save')}
                        </Button>
                      )}
                    </form>
                  </CardContent>
                </Card>
              )}

              {tab === 'notifications' && (
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle>{t('settings.notifications.title')}</CardTitle>
                    <CardDescription>{t('settings.notifications.desc')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 max-w-lg">
                    {[
                      { key: 'orderStatus' as const, label: t('settings.notifications.orderStatus'), desc: t('settings.notifications.orderStatusDesc') },
                      { key: 'newOrder' as const, label: t('settings.notifications.newOrder'), desc: t('settings.notifications.newOrderDesc') },
                      { key: 'dailyReport' as const, label: t('settings.notifications.dailyReport'), desc: t('settings.notifications.dailyReportDesc') },
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
                      {t('common.save')}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {tab === 'system' && (
                <Card className="animate-fade-in">
                  <CardHeader>
                    <CardTitle>{t('settings.system.title')}</CardTitle>
                    <CardDescription>{t('settings.system.desc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-4 max-w-md">
                      {[
                        { label: t('settings.system.smsProvider'), value: system?.smsProvider ?? '—' },
                        { label: t('settings.system.apiVersion'), value: system?.apiVersion ?? '—' },
                        { label: t('settings.system.environment'), value: system?.environment ?? '—' },
                        { label: t('settings.system.userId'), value: profile?.id ?? '—', mono: true },
                        { label: t('settings.system.apiUrl'), value: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1', mono: true },
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
