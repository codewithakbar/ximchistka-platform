'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  Bell,
  CreditCard,
  Globe,
  ClipboardList,
  ShieldCheck,
  Clock,
  Phone,
  MapPin,
  Menu,
  X,
  Gift,
  Zap,
  Settings,
  Rocket,
  CheckCircle2,
  TrendingUp,
  Wallet,
  MessageSquare,
} from 'lucide-react';

const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL ?? 'http://localhost:3000';
const SIGNUP_URL = `${CRM_URL}/signup`;
const LOGIN_URL = `${CRM_URL}/login`;

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
};

/* ---------- Animated counter ---------- */
function CountUp({ end, suffix = '', duration = 1.6 }: { end: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(end * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, end, duration]);

  return (
    <span ref={ref}>
      {value}
      {suffix}
    </span>
  );
}

/* ---------- Data ---------- */
const advantages = [
  {
    icon: ClipboardList,
    title: "Buyurtmalar nazorati",
    desc: "Qabuldan topshirishgacha har bir bosqich real vaqtda kuzatiladi. Hech bir buyurtma yo'qolmaydi.",
    accent: 'from-indigo-500/20 to-indigo-500/0 text-indigo-300',
  },
  {
    icon: Users,
    title: 'Mijozlar bazasi',
    desc: "Har bir mijozning tarixi, buyurtmalari va aloqa ma'lumotlari — bitta joyda, qidiruv bilan.",
    accent: 'from-violet-500/20 to-violet-500/0 text-violet-300',
  },
  {
    icon: Building2,
    title: "Ko'p filial boshqaruvi",
    desc: "Cheksiz filiallar oching. Har biriga alohida narxlar, xodimlar va hisobotlar.",
    accent: 'from-fuchsia-500/20 to-fuchsia-500/0 text-fuchsia-300',
  },
  {
    icon: BarChart3,
    title: 'Moliyaviy hisobotlar',
    desc: "Kunlik kassa, daromad dinamikasi va xizmatlar kesimida tahlil — bir qarashda.",
    accent: 'from-sky-500/20 to-sky-500/0 text-sky-300',
  },
  {
    icon: Globe,
    title: 'Onlayn mijoz portali',
    desc: "Mijozlaringiz o'zlari onlayn buyurtma beradi va holatini kuzatadi — sizga qo'ng'iroq kamayadi.",
    accent: 'from-cyan-500/20 to-cyan-500/0 text-cyan-300',
  },
  {
    icon: Bell,
    title: 'SMS xabarnomalar',
    desc: "Buyurtma tayyor bo'lganda mijozga avtomatik SMS ketadi. Qo'lda yozish shart emas.",
    accent: 'from-amber-500/20 to-amber-500/0 text-amber-300',
  },
  {
    icon: CreditCard,
    title: "Click va Payme to'lovlar",
    desc: "Onlayn to'lovlarni qabul qiling — naqd pulga bog'lanib qolmaysiz.",
    accent: 'from-emerald-500/20 to-emerald-500/0 text-emerald-300',
  },
  {
    icon: ShieldCheck,
    title: 'Xodimlar rollari',
    desc: "Operator, menejer, administrator — har kimga o'z huquqlari. Ma'lumotlaringiz xavfsiz.",
    accent: 'from-rose-500/20 to-rose-500/0 text-rose-300',
  },
];

const steps = [
  {
    icon: Rocket,
    step: '01',
    title: "Ro'yxatdan o'ting",
    desc: "1 daqiqada hisob yarating. Karta yoki to'lov talab qilinmaydi — faqat telefon raqam.",
  },
  {
    icon: Settings,
    step: '02',
    title: 'Platformani sozlang',
    desc: "Filial, xizmatlar va narxlaringizni kiriting. Tayyor xizmatlar katalogi bilan boshlaysiz.",
  },
  {
    icon: Zap,
    step: '03',
    title: 'Ishlashni boshlang',
    desc: "Birinchi kundanoq buyurtmalarni qabul qiling. Barcha imkoniyatlar 14 kun bepul.",
  },
];

const marqueeItems = [
  'CRM Dashboard',
  "Ko'p filial",
  'SMS xabarnoma',
  'Onlayn buyurtma',
  'Moliyaviy hisobot',
  'Mijozlar bazasi',
  'Click / Payme',
  'Xodimlar rollari',
];

/* ---------- Page ---------- */
export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const nav = [
    { href: '#afzalliklar', label: 'Afzalliklar' },
    { href: '#qanday', label: 'Qanday boshlash' },
    { href: '#narx', label: 'Narx' },
    { href: '#aloqa', label: 'Aloqa' },
  ];

  return (
    <div className="min-h-screen bg-[#060714] text-slate-100 antialiased overflow-x-clip selection:bg-indigo-500/40">
      {/* ======= Header ======= */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[#060714]/85 backdrop-blur-xl border-b border-white/10' : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/40 group-hover:shadow-indigo-500/60 transition-shadow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">CleanWay</span>
          </a>

          <nav className="hidden md:flex items-center gap-7">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
              >
                {n.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <a href={LOGIN_URL} className="text-sm font-semibold text-slate-300 hover:text-white transition-colors px-3 py-2">
              Kirish
            </a>
            <a
              href={SIGNUP_URL}
              className="relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-bold px-5 py-2.5 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.03] active:scale-[0.98] transition-all"
            >
              <Gift className="h-4 w-4" />
              14 kun bepul
            </a>
          </div>

          <button
            className="md:hidden h-10 w-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menyu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#060714]/95 backdrop-blur-xl px-5 py-4 space-y-1">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setMenuOpen(false)}
                className="block py-2.5 text-sm font-medium text-slate-300"
              >
                {n.label}
              </a>
            ))}
            <div className="pt-3 flex gap-3">
              <a href={LOGIN_URL} className="flex-1 text-center rounded-xl border border-white/20 text-white text-sm font-semibold py-3">
                Kirish
              </a>
              <a
                href={SIGNUP_URL}
                className="flex-1 text-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-bold py-3"
              >
                14 kun bepul
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ======= Hero ======= */}
      <section className="relative pt-32 pb-24 lg:pt-44 lg:pb-32">
        {/* Background effects */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="landing-orb absolute top-[-20%] left-1/2 -translate-x-1/2 h-72 w-72 sm:h-[42rem] sm:w-[42rem] rounded-full bg-indigo-600/25 blur-[70px] sm:blur-[140px] landing-float" />
          <div className="landing-orb absolute top-[30%] left-[-10%] h-56 w-56 sm:h-[28rem] sm:w-[28rem] rounded-full bg-violet-600/20 blur-[60px] sm:blur-[120px] landing-float-delayed" />
          <div className="landing-orb absolute top-[10%] right-[-12%] h-56 w-56 sm:h-[30rem] sm:w-[30rem] rounded-full bg-fuchsia-600/15 blur-[60px] sm:blur-[130px] landing-float" />
          <div
            className="absolute inset-0 opacity-[0.25]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
              maskImage: 'radial-gradient(ellipse 80% 60% at 50% 20%, black 30%, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 20%, black 30%, transparent 75%)',
            }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-5 text-center">
          {/* Trigger badge */}
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55 }}
            className="inline-flex items-center gap-2 sm:gap-2.5 max-w-[92vw] rounded-full border border-indigo-400/30 bg-indigo-500/10 backdrop-blur px-4 sm:px-5 py-2 mb-8 landing-glow-pulse"
          >
            <Gift className="h-4 w-4 text-indigo-300 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-indigo-200">14 kun bepul sinov — karta talab qilinmaydi</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-black leading-[1.06] tracking-tight mb-6"
          >
            Ximchistka biznesingizni
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              raqamli boshqaring
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg lg:text-xl text-slate-400 mb-10"
          >
            CleanWay — kimyoviy tozalash korxonalari uchun tayyor CRM platforma. Buyurtmalar, mijozlar,
            filiallar va moliya — barchasi bitta zamonaviy panelda.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
          >
            <a
              href={SIGNUP_URL}
              className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold text-base sm:text-lg px-7 sm:px-9 py-4 shadow-[0_0_50px_-10px_rgba(99,102,241,0.7)] hover:shadow-[0_0_70px_-8px_rgba(99,102,241,0.9)] hover:scale-[1.04] active:scale-[0.98] transition-all"
            >
              Bepul boshlash
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="#afzalliklar"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 backdrop-blur text-white font-semibold text-base sm:text-lg px-7 sm:px-9 py-4 hover:bg-white/10 hover:border-white/25 active:scale-[0.98] transition-all"
            >
              Imkoniyatlar bilan tanishish
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-slate-500 mb-16 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            Ro&apos;yxatdan o&apos;tish 1 daqiqa · Hech qanday majburiyatsiz
          </motion.p>

          {/* Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="relative max-w-4xl mx-auto"
          >
            <div className="absolute -inset-6 bg-gradient-to-r from-indigo-500/25 via-violet-500/25 to-fuchsia-500/25 blur-3xl rounded-[3rem]" aria-hidden />
            <div className="relative rounded-3xl border border-white/12 bg-[#0b0d1f]/90 backdrop-blur-xl shadow-2xl overflow-hidden">
              {/* window bar */}
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/8">
                <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <div className="ml-4 flex-1 max-w-xs rounded-lg bg-white/5 border border-white/10 px-3 py-1 text-xs text-slate-500 text-left">
                  crm.cleanway.4mi.uz
                </div>
              </div>

              <div className="p-5 sm:p-7 grid sm:grid-cols-3 gap-4 text-left">
                {[
                  { icon: TrendingUp, label: 'Bugungi buyurtmalar', value: '47 ta', delta: '+12%', color: 'text-indigo-300 bg-indigo-500/15' },
                  { icon: Wallet, label: 'Kunlik tushum', value: "4.2 mln so'm", delta: '+8%', color: 'text-violet-300 bg-violet-500/15' },
                  { icon: Users, label: 'Faol mijozlar', value: '1 284', delta: '+31', color: 'text-fuchsia-300 bg-fuchsia-500/15' },
                ].map((c, i) => {
                  const Icon = c.icon;
                  return (
                    <motion.div
                      key={c.label}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + i * 0.12 }}
                      className="rounded-2xl border border-white/8 bg-white/[0.04] p-4"
                    >
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-xs text-slate-500 mb-1">{c.label}</div>
                      <div className="flex items-end justify-between">
                        <span className="text-lg font-bold text-white">{c.value}</span>
                        <span className="text-[11px] font-bold text-emerald-400">{c.delta}</span>
                      </div>
                    </motion.div>
                  );
                })}

                {/* fake chart */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="sm:col-span-3 rounded-2xl border border-white/8 bg-white/[0.04] p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-slate-500">Haftalik dinamika</span>
                    <span className="text-[11px] font-semibold text-indigo-300">Buyurtmalar</span>
                  </div>
                  <div className="flex items-end gap-2 h-20">
                    {[38, 52, 44, 66, 58, 82, 74, 90, 71, 95, 84, 100].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 1.1 + i * 0.05, duration: 0.5, ease: 'easeOut' }}
                        className="flex-1 rounded-t-md bg-gradient-to-t from-indigo-600/60 to-violet-400/80"
                      />
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ======= Marquee ======= */}
      <div className="relative border-y border-white/8 bg-white/[0.02] py-4 overflow-hidden">
        <div className="landing-marquee flex gap-10 whitespace-nowrap w-max">
          {[...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className="flex items-center gap-2.5 text-sm font-semibold text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400/70" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ======= Stats ======= */}
      <section className="max-w-6xl mx-auto px-5 py-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { end: 14, suffix: ' kun', label: 'bepul sinov muddati' },
            { end: 1, suffix: ' daqiqa', label: "ro'yxatdan o'tish vaqti" },
            { end: 8, suffix: '+', label: 'tayyor CRM moduli' },
            { end: 24, suffix: '/7', label: 'onlayn buyurtma qabuli' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              {...fadeUp}
              transition={{ duration: 0.55, delay: i * 0.08 }}
              className="rounded-3xl border border-white/8 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 text-center hover:border-indigo-400/30 transition-colors"
            >
              <div className="text-3xl lg:text-4xl font-black bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent mb-1">
                <CountUp end={s.end} suffix={s.suffix} />
              </div>
              <div className="text-sm text-slate-500">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ======= Advantages ======= */}
      <section id="afzalliklar" className="max-w-6xl mx-auto px-5 py-16 scroll-mt-20">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-300 mb-4">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Afzalliklarimiz
          </div>
          <h2 className="text-3xl lg:text-5xl font-black tracking-tight mb-4">
            Biznesingiz uchun{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
              kuchli qurollar
            </span>
          </h2>
          <p className="text-slate-400">
            Daftardagi hisob-kitob va Excel jadvallarini unuting — hammasi avtomatlashtirilgan
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {advantages.map((a, i) => {
            const Icon = a.icon;
            return (
              <motion.div
                key={a.title}
                {...fadeUp}
                transition={{ duration: 0.55, delay: (i % 4) * 0.08 }}
                className="group relative rounded-3xl border border-white/8 bg-white/[0.03] p-6 overflow-hidden hover:border-white/20 hover:-translate-y-1.5 hover:bg-white/[0.05] transition-all duration-300"
              >
                <div className={`absolute inset-0 bg-gradient-to-b opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${a.accent.split(' ').slice(0, 2).join(' ')}`} aria-hidden />
                <div className="relative">
                  <div className={`h-12 w-12 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${a.accent.split(' ').pop()}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold mb-2">{a.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{a.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ======= How to start ======= */}
      <section id="qanday" className="max-w-6xl mx-auto px-5 py-20 scroll-mt-20">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-violet-300 mb-4">
            <Rocket className="h-3.5 w-3.5" />
            Boshlash oson
          </div>
          <h2 className="text-3xl lg:text-5xl font-black tracking-tight mb-4">
            3 qadamda{' '}
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">ishga tushiring</span>
          </h2>
          <p className="text-slate-400">Texnik bilim talab qilinmaydi — hammasi tayyor</p>
        </motion.div>

        <div className="relative grid lg:grid-cols-3 gap-5">
          <div className="hidden lg:block absolute top-14 left-[18%] right-[18%] h-px bg-gradient-to-r from-indigo-500/0 via-indigo-400/40 to-fuchsia-500/0" aria-hidden />
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.step}
                {...fadeUp}
                transition={{ duration: 0.55, delay: i * 0.12 }}
                className="relative rounded-3xl border border-white/8 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-7 hover:border-violet-400/30 transition-colors"
              >
                <div className="absolute top-5 right-6 text-5xl font-black text-white/[0.06] select-none" aria-hidden>
                  {s.step}
                </div>
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/30">
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ======= Pricing ======= */}
      <section id="narx" className="max-w-5xl mx-auto px-5 py-20 scroll-mt-20">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-fuchsia-300 mb-4">
            <Wallet className="h-3.5 w-3.5" />
            Tariflar
          </div>
          <h2 className="text-3xl lg:text-5xl font-black tracking-tight mb-4">
            Oddiy va{' '}
            <span className="bg-gradient-to-r from-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
              shaffof narxlar
            </span>
          </h2>
          <p className="text-slate-400">
            Yashirin to&apos;lovlar yo&apos;q — barcha imkoniyatlar har ikkala tarifda ham to&apos;liq ochiq
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">
          {/* Monthly */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.55 }}
            className="relative rounded-[2rem] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 flex flex-col hover:border-white/25 transition-colors"
          >
            <div className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">Oylik</div>
            <div className="flex flex-wrap items-end gap-2 mb-1.5">
              <span className="text-4xl lg:text-5xl font-black text-white">450 000</span>
              <span className="text-slate-400 font-semibold mb-1.5">so&apos;m / oy</span>
            </div>
            <p className="text-sm text-slate-500 mb-7">Majburiyatsiz — istalgan vaqtda to&apos;xtatishingiz mumkin</p>

            <ul className="space-y-3 mb-8 flex-1">
              {[
                "Barcha CRM modullari to'liq",
                'Cheksiz filiallar va xodimlar',
                'Onlayn mijoz portali',
                'SMS xabarnomalar',
                'Moliyaviy hisobotlar',
                'Texnik yordam',
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <a
              href={SIGNUP_URL}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 text-white font-bold px-6 py-4 hover:bg-white/10 hover:border-white/35 active:scale-[0.98] transition-all"
            >
              14 kun bepul boshlash
            </a>
          </motion.div>

          {/* Yearly */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="relative mt-4 md:mt-0 rounded-[2rem] p-[1.5px] bg-gradient-to-b from-indigo-400 via-violet-500 to-fuchsia-500 shadow-[0_0_60px_-15px_rgba(139,92,246,0.6)]"
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white text-xs font-black px-4 py-1.5 shadow-lg shadow-fuchsia-500/40 whitespace-nowrap">
                <Gift className="h-3.5 w-3.5" />
                +2 OY SOVG&apos;A
              </span>
            </div>

            <div className="relative h-full rounded-[calc(2rem-1.5px)] bg-[#0b0d1f] p-8 flex flex-col">
              <div className="text-sm font-bold uppercase tracking-widest text-indigo-300 mb-4">Yillik</div>
              <div className="flex flex-wrap items-end gap-2 mb-1.5">
                <span className="text-4xl lg:text-5xl font-black bg-gradient-to-r from-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">
                  5 400 000
                </span>
                <span className="text-slate-400 font-semibold mb-1.5">so&apos;m / yil</span>
              </div>
              <p className="text-sm text-slate-400 mb-7">
                12 oy narxiga <span className="font-bold text-white">14 oy foydalaning</span> — oyiga{' '}
                <span className="font-bold text-emerald-400">~386 000 so&apos;mga</span> tushadi
              </p>

              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Oylik tarifdagi hamma narsa",
                  "2 oy qo'shimcha — mutlaqo bepul",
                  "Yil davomida narx o'zgarmaydi",
                  'Ustuvor texnik yordam',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-fuchsia-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={SIGNUP_URL}
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-fuchsia-600 text-white font-bold px-6 py-4 shadow-lg shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                14 kun bepul boshlash
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </motion.div>
        </div>

        <motion.p {...fadeUp} className="text-center text-sm text-slate-500 mt-8 flex items-center justify-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Avval 14 kun bepul sinab ko&apos;rasiz — tarif faqat sinov tugagach tanlanadi
        </motion.p>
      </section>

      {/* ======= Trial trigger ======= */}
      <section className="max-w-5xl mx-auto px-5 py-8 pb-20 scroll-mt-20">
        <motion.div
          {...fadeUp}
          className="relative rounded-[2.5rem] overflow-hidden border border-indigo-400/25"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-violet-600/20 to-fuchsia-600/25" aria-hidden />
          <div className="landing-orb absolute -top-24 -right-24 h-48 w-48 sm:h-72 sm:w-72 rounded-full bg-indigo-500/30 blur-[60px] sm:blur-[100px] landing-float" aria-hidden />
          <div className="landing-orb absolute -bottom-24 -left-24 h-48 w-48 sm:h-72 sm:w-72 rounded-full bg-fuchsia-500/25 blur-[60px] sm:blur-[100px] landing-float-delayed" aria-hidden />

          <div className="relative p-8 lg:p-14 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/20 px-5 py-2 mb-6">
              <Gift className="h-4 w-4 text-indigo-200" />
              <span className="text-sm font-bold text-white">Maxsus taklif</span>
            </div>

            <h2 className="text-4xl lg:text-6xl font-black tracking-tight mb-4">
              <span className="bg-gradient-to-r from-white via-indigo-100 to-white bg-clip-text text-transparent">
                14 kun mutlaqo bepul
              </span>
            </h2>
            <p className="text-lg text-slate-300 max-w-xl mx-auto mb-9">
              Barcha imkoniyatlar ochiq. Karta ma&apos;lumotlari talab qilinmaydi, hech qanday yashirin
              to&apos;lovlar yo&apos;q. Yoqmasa — shunchaki ishlatmaysiz.
            </p>

            <div className="grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto mb-10 text-left">
              {[
                "To'liq CRM dashboard",
                'Tayyor xizmatlar katalogi',
                'Onlayn mijoz portali',
                'SMS xabarnomalar',
                'Moliyaviy hisobotlar',
                'Texnik yordam',
              ].map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm text-slate-200">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  {f}
                </div>
              ))}
            </div>

            <a
              href={SIGNUP_URL}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 rounded-2xl bg-white text-[#1a1b3a] font-black text-base sm:text-lg px-8 sm:px-10 py-5 shadow-[0_0_60px_-10px_rgba(255,255,255,0.5)] hover:shadow-[0_0_80px_-8px_rgba(255,255,255,0.7)] hover:scale-[1.04] active:scale-[0.98] transition-all"
            >
              Hoziroq bepul boshlash
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1.5 transition-transform" />
            </a>

            <p className="mt-5 text-sm text-slate-400 flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" />
              Ro&apos;yxatdan o&apos;tish atigi 1 daqiqa vaqt oladi
            </p>
          </div>
        </motion.div>
      </section>

      {/* ======= Contact / Footer ======= */}
      <footer id="aloqa" className="border-t border-white/8 bg-white/[0.02] scroll-mt-20">
        <div className="max-w-6xl mx-auto px-5 py-14">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-lg">CleanWay</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                Kimyoviy tozalash korxonalari uchun zamonaviy CRM platforma. Biznesingizni raqamlashtiring
                va daromadingizni oshiring.
              </p>
            </div>

            <div>
              <div className="font-bold text-sm mb-4 text-slate-200">Platforma</div>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li>
                  <a href={SIGNUP_URL} className="hover:text-indigo-300 transition-colors inline-flex items-center gap-1.5">
                    <Gift className="h-3.5 w-3.5" />
                    14 kun bepul sinov
                  </a>
                </li>
                <li><a href={LOGIN_URL} className="hover:text-indigo-300 transition-colors">CRM panelga kirish</a></li>
                <li><a href="#afzalliklar" className="hover:text-indigo-300 transition-colors">Afzalliklar</a></li>
                <li><a href="#narx" className="hover:text-indigo-300 transition-colors">Narx</a></li>
              </ul>
            </div>

            <div>
              <div className="font-bold text-sm mb-4 text-slate-200">Aloqa</div>
              <ul className="space-y-3 text-sm text-slate-400">
                <li>
                  <a href="tel:+998958500880" className="flex items-center gap-2.5 hover:text-indigo-300 transition-colors">
                    <span className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                      <Phone className="h-4 w-4 text-indigo-300" />
                    </span>
                    +998 95 850 08 80
                  </a>
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-indigo-300" />
                  </span>
                  Xorazm viloyati, Urganch shahri
                </li>
                <li className="flex items-center gap-2.5">
                  <span className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-4 w-4 text-indigo-300" />
                  </span>
                  Savollaringiz bo&apos;lsa qo&apos;ng&apos;iroq qiling
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
            <span>© {new Date().getFullYear()} CleanWay. Barcha huquqlar himoyalangan.</span>
            <span>cleanway.4mi.uz</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
