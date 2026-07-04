'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getToken } from '@/lib/api';
import {
  Sparkles,
  ArrowRight,
  Shirt,
  Wind,
  Zap,
  Truck,
  Search,
  Smartphone,
  CreditCard,
  Bell,
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  CheckCircle2,
  Clock,
  ShieldCheck,
  MapPin,
  Phone,
  Menu,
  X,
  ClipboardList,
  PackageCheck,
} from 'lucide-react';

const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL ?? 'http://localhost:3000';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5 },
};

const services = [
  {
    icon: Shirt,
    name: "Ko'ylak tozalash",
    price: "25 000 so'm",
    discount: '10% chegirma',
    desc: "Professional kimyoviy tozalash va dazmollash",
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Wind,
    name: 'Palto tozalash',
    price: "80 000 so'm",
    discount: null,
    desc: "Qishki kiyimlar uchun chuqur tozalash",
    color: 'bg-violet-50 text-violet-600',
  },
  {
    icon: Zap,
    name: 'Press (dazmol)',
    price: "15 000 so'm",
    discount: null,
    desc: "Tez va sifatli dazmollash xizmati",
    color: 'bg-amber-50 text-amber-600',
  },
];

const steps = [
  {
    icon: ClipboardList,
    title: 'Buyurtma bering',
    desc: "Telefondan 1 daqiqada buyurtma yarating — xizmat va filialni tanlang",
  },
  {
    icon: Truck,
    title: 'Kuryer olib ketadi',
    desc: "Kuryer belgilangan vaqtda manzilingizdan kiyimlarni olib ketadi",
  },
  {
    icon: Sparkles,
    title: 'Professional tozalash',
    desc: "Zamonaviy uskunalarda kimyoviy tozalash va dazmollash",
  },
  {
    icon: PackageCheck,
    title: 'Yetkazib beramiz',
    desc: "Tayyor kiyimlar uyingizgacha yetkazib beriladi — SMS orqali xabar olasiz",
  },
];

const clientFeatures = [
  { icon: Smartphone, title: 'PWA ilova', desc: "O'rnatmasdan telefonda ilovadek ishlaydi" },
  { icon: Search, title: 'Onlayn kuzatuv', desc: 'Buyurtma raqami bilan holatini real vaqtda kuzating' },
  { icon: CreditCard, title: 'Click va Payme', desc: "Onlayn yoki naqd — o'zingizga qulay to'lov" },
  { icon: Bell, title: 'SMS xabarnoma', desc: 'Har bir bosqichda avtomatik SMS xabar' },
];

const bizFeatures = [
  { icon: LayoutDashboard, title: 'CRM dashboard', desc: "Buyurtmalar, mijozlar va daromad — bitta panelda" },
  { icon: Building2, title: 'Ko\u2018p filial', desc: "Cheksiz filiallar, har biriga alohida narxlar" },
  { icon: Users, title: 'Xodimlar boshqaruvi', desc: "Operator, kuryer, menejer — rollar bilan" },
  { icon: BarChart3, title: 'Hisobotlar', desc: "Kunlik va moliyaviy hisobotlar, eksport" },
];

const stats = [
  { value: '24 soat', label: 'ichida tayyor' },
  { value: '2+', label: 'filial Toshkentda' },
  { value: '14 kun', label: 'bepul demo biznes uchun' },
  { value: '24/7', label: 'onlayn buyurtma' },
];

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(Boolean(getToken()));
  }, []);

  const nav = [
    { href: '#xizmatlar', label: 'Xizmatlar' },
    { href: '#qanday', label: 'Qanday ishlaydi' },
    { href: '#biznes', label: 'Biznes uchun' },
    { href: '#aloqa', label: 'Aloqa' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg">CleanWay</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {n.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href={loggedIn ? '/home' : '/login'}
              className="text-sm font-semibold text-foreground hover:text-primary transition-colors px-3 py-2"
            >
              {loggedIn ? 'Kabinet' : 'Kirish'}
            </Link>
            <Link
              href="/order/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-white text-sm font-semibold px-4 py-2.5 hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
            >
              Buyurtma berish
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <button
            className="md:hidden h-10 w-10 flex items-center justify-center rounded-xl hover:bg-secondary"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menyu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-border bg-white px-5 py-4 space-y-1">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setMenuOpen(false)}
                className="block py-2.5 text-sm font-medium text-muted-foreground"
              >
                {n.label}
              </a>
            ))}
            <div className="pt-3 flex gap-3">
              <Link
                href={loggedIn ? '/home' : '/login'}
                className="flex-1 text-center rounded-xl border-2 border-primary text-primary text-sm font-semibold py-2.5"
              >
                {loggedIn ? 'Kabinet' : 'Kirish'}
              </Link>
              <Link href="/order/new" className="flex-1 text-center rounded-xl bg-primary text-white text-sm font-semibold py-2.5">
                Buyurtma
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-teal-600 to-teal-700 text-white">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
          aria-hidden
        />

        <div className="relative max-w-6xl mx-auto px-5 pt-16 pb-20 lg:pt-24 lg:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-4 py-1.5 text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                Onlayn kimyo tozalash platformasi
              </div>

              <h1 className="text-4xl lg:text-6xl font-black leading-[1.1] mb-5">
                Sof kiyim —
                <br />
                <span className="text-teal-200">oson buyurtma</span>
              </h1>

              <p className="text-lg text-teal-50/90 max-w-md mb-8">
                Telefondan buyurtma bering, kuryer olib ketadi, 24 soat ichida toza kiyimingizni yetkazib beramiz.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/order/new"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-primary font-bold px-7 py-4 shadow-xl shadow-black/10 hover:bg-teal-50 active:scale-[0.98] transition-all"
                >
                  Buyurtma berish
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/track"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-white/40 text-white font-semibold px-7 py-4 hover:bg-white/10 active:scale-[0.98] transition-all"
                >
                  <Search className="h-5 w-5" />
                  Buyurtmani kuzatish
                </Link>
              </div>
            </motion.div>

            {/* Hero card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="hidden lg:block"
            >
              <div className="relative mx-auto max-w-sm">
                <div className="absolute inset-0 translate-x-4 translate-y-4 rounded-3xl bg-white/10" aria-hidden />
                <div className="relative rounded-3xl bg-white text-foreground p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                        001
                      </div>
                      <div>
                        <div className="font-bold text-sm">XC-10001</div>
                        <div className="text-xs text-muted-foreground">Chilonzor filiali</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                      Jarayonda
                    </span>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: 'Qabul qilindi', done: true },
                      { label: 'Filialga yetkazildi', done: true },
                      { label: 'Tozalanmoqda', done: true, active: true },
                      { label: 'Yetkazib berish', done: false },
                    ].map((s) => (
                      <div key={s.label} className="flex items-center gap-3">
                        <div
                          className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                            s.done ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'
                          }`}
                        >
                          {s.done ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-3.5 w-3.5" />}
                        </div>
                        <span className={`text-sm ${s.active ? 'font-bold' : s.done ? 'font-medium' : 'text-muted-foreground'}`}>
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Jami</span>
                    <span className="font-bold">105 000 so&apos;m</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 px-5 py-4">
                <div className="text-2xl font-black">{s.value}</div>
                <div className="text-sm text-teal-100 mt-0.5">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Services */}
      <section id="xizmatlar" className="max-w-6xl mx-auto px-5 py-20">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Xizmatlar</div>
          <h2 className="text-3xl lg:text-4xl font-black mb-3">Shaffof narxlar</h2>
          <p className="text-muted-foreground">
            Hech qanday yashirin to&apos;lovlar yo&apos;q — narxni buyurtma berishdan oldin ko&apos;rasiz
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {services.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.name}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group rounded-3xl border border-border bg-card p-6 hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-5 ${s.color}`}>
                  <Icon className="h-7 w-7" />
                </div>
                <div className="flex items-center gap-2 mb-1.5">
                  <h3 className="font-bold text-lg">{s.name}</h3>
                  {s.discount && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      {s.discount}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">{s.desc}</p>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">boshlab</div>
                    <div className="text-xl font-black text-primary">{s.price}</div>
                  </div>
                  <Link
                    href="/order/new"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Buyurtma
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.p {...fadeUp} className="text-center text-sm text-muted-foreground mt-8">
          <span className="font-semibold text-foreground">WELCOME10</span> promo-kodi bilan birinchi buyurtmaga 10% chegirma
        </motion.p>
      </section>

      {/* How it works */}
      <section id="qanday" className="bg-muted py-20">
        <div className="max-w-6xl mx-auto px-5">
          <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-sm font-bold text-primary uppercase tracking-wider mb-2">Jarayon</div>
            <h2 className="text-3xl lg:text-4xl font-black mb-3">Qanday ishlaydi?</h2>
            <p className="text-muted-foreground">4 oddiy qadam — kiyimingiz yangidek bo&apos;ladi</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.title}
                  {...fadeUp}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="relative rounded-3xl bg-card border border-border p-6"
                >
                  <div className="absolute -top-3 -right-2 text-6xl font-black text-primary/5 select-none" aria-hidden>
                    {i + 1}
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold mb-1.5">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Client features */}
          <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {clientFeatures.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  {...fadeUp}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="flex items-start gap-3.5"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm mb-0.5">{f.title}</div>
                    <div className="text-sm text-muted-foreground">{f.desc}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* For business */}
      <section id="biznes" className="max-w-6xl mx-auto px-5 py-20">
        <div className="rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden relative">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" aria-hidden />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" aria-hidden />

          <div className="relative grid lg:grid-cols-2 gap-10 p-8 lg:p-14">
            <motion.div {...fadeUp}>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium mb-5">
                <Building2 className="h-4 w-4" />
                Ximchistka egalari uchun
              </div>
              <h2 className="text-3xl lg:text-4xl font-black leading-tight mb-4">
                Biznesingizni CleanWay bilan
                <span className="text-teal-300"> raqamlashtiring</span>
              </h2>
              <p className="text-slate-300 mb-8 max-w-md">
                CRM dashboard, onlayn buyurtmalar, kuryer boshqaruvi va moliyaviy hisobotlar — barchasi tayyor
                platformada. Ro&apos;yxatdan o&apos;ting va bugunoq ishlashni boshlang.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <a
                  href={`${CRM_URL}/signup`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-white font-bold px-7 py-4 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/30"
                >
                  14 kun bepul sinash
                  <ArrowRight className="h-5 w-5" />
                </a>
                <a
                  href={`${CRM_URL}/login`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-white/20 text-white font-semibold px-7 py-4 hover:bg-white/10 active:scale-[0.98] transition-all"
                >
                  CRM ga kirish
                </a>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-400">
                <ShieldCheck className="h-4 w-4 text-teal-300" />
                Karta talab qilinmaydi · 3 ta tayyor xizmat katalogi bilan
              </div>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-4 content-center">
              {bizFeatures.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div
                    key={f.title}
                    {...fadeUp}
                    transition={{ duration: 0.5, delay: i * 0.08 }}
                    className="rounded-2xl bg-white/5 border border-white/10 p-5 hover:bg-white/10 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-xl bg-teal-400/15 text-teal-300 flex items-center justify-center mb-3">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="font-bold text-sm mb-1">{f.title}</div>
                    <div className="text-xs text-slate-400 leading-relaxed">{f.desc}</div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-5 pb-20 text-center">
        <motion.div {...fadeUp}>
          <h2 className="text-3xl lg:text-4xl font-black mb-4">Hoziroq boshlang</h2>
          <p className="text-muted-foreground mb-8">
            Ro&apos;yxatdan o&apos;tish 1 daqiqa — telefon raqam va SMS kod kifoya
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login?mode=register"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary text-white font-bold px-8 py-4 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/25"
            >
              Ro&apos;yxatdan o&apos;tish
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-primary text-primary font-semibold px-8 py-4 hover:bg-primary/5 active:scale-[0.98] transition-all"
            >
              Kirish
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer id="aloqa" className="border-t border-border bg-muted">
        <div className="max-w-6xl mx-auto px-5 py-12">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="font-bold">CleanWay</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ko&apos;p filialli ximchistka platformasi — mijozlar va biznes uchun zamonaviy yechim.
              </p>
            </div>

            <div>
              <div className="font-bold text-sm mb-3">Mijozlar</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/order/new" className="hover:text-primary transition-colors">Buyurtma berish</Link></li>
                <li><Link href="/track" className="hover:text-primary transition-colors">Buyurtmani kuzatish</Link></li>
                <li><Link href="/login" className="hover:text-primary transition-colors">Kirish</Link></li>
                <li><Link href="/login?mode=register" className="hover:text-primary transition-colors">Ro&apos;yxatdan o&apos;tish</Link></li>
              </ul>
            </div>

            <div>
              <div className="font-bold text-sm mb-3">Biznes</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href={`${CRM_URL}/signup`} className="hover:text-primary transition-colors">14 kun bepul demo</a></li>
                <li><a href={`${CRM_URL}/login`} className="hover:text-primary transition-colors">CRM panel</a></li>
              </ul>
            </div>

            <div>
              <div className="font-bold text-sm mb-3">Aloqa</div>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary shrink-0" />
                  +998 90 123 45 67
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  Toshkent, Chilonzor va Yunusobod filiallari
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  Har kuni 9:00 — 21:00
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>© {new Date().getFullYear()} CleanWay. Barcha huquqlar himoyalangan.</span>
            <span>cleanway.4mi.uz</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
