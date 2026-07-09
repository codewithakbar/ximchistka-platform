'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { ruExtra, uzExtra } from './i18n-dict-extra';
import { ruExtra2, uzExtra2 } from './i18n-dict-extra2';

export type Locale = 'uz' | 'ru';

const LOCALE_KEY = 'crm-locale';

/* ------------------------------------------------------------------ */
/* Dictionaries                                                        */
/* ------------------------------------------------------------------ */

const uz: Record<string, string> = {
  // Navigation
  'nav./dashboard': 'Boshqaruv',
  'nav./orders': 'Buyurtmalar',
  'nav./branches': 'Filiallar',
  'nav./services': 'Xizmatlar',
  'nav./customers': 'Mijozlar',
  'nav./courier': 'Kuryer',
  'nav./reports': 'Hisobotlar',
  'nav./staff': 'Xodimlar',
  'nav.settings': 'Sozlamalar',
  'nav.logout': 'Chiqish',

  // Roles
  'role.super_admin': 'Super admin',
  'role.branch_manager': 'Filial menejeri',
  'role.operator': 'Operator',
  'role.courier': 'Kuryer',
  'roleDesc.super_admin': 'Barcha filiallar va tizim sozlamalari',
  'roleDesc.branch_manager': "O'z filialidagi buyurtmalar va boshqaruv",
  'roleDesc.operator': 'Buyurtmalarni qabul qilish va status boshqaruvi',
  'roleDesc.courier': 'Yetkazish vazifalari va buyurtma topshirish',

  // Topbar
  'topbar.search': 'Qidirish...',
  'topbar.demo': 'Demo',
  'topbar.days': 'kun',
  'topbar.demoSupportHint': 'Savollaringiz bo\'lsa — Telegram orqali bog\'laning',

  // Dashboard
  'dash.title': 'Boshqaruv paneli',
  'dash.panel': 'panel',
  'dash.personal': 'Shaxsiy dashboard',
  'dash.hello': 'Salom',
  'dash.employee': 'xodim',
  'dash.branches': 'Filiallar',
  'dash.myTasks': 'Mening vazifalarim',
  'dash.newOrder': 'Yangi buyurtma',
  'dash.allOrders': 'Barcha buyurtmalar',
  'dash.addStaff': "Xodim qo'shish",
  'dash.todayDeliveries': 'Bugungi yetkazishlar',
  'dash.allTasks': 'Barcha vazifalar',
  'dash.todayOrders': 'Bugungi buyurtmalar',
  'dash.inProcessing': 'Ishlanmoqda',
  'dash.ready': 'Tayyor',
  'dash.todayRevenue': 'Bugungi tushum',
  'dash.ordersDynamics': 'Buyurtmalar dinamikasi',
  'dash.last7days': 'Oxirgi 7 kun',
  'dash.dailyOrders': 'Kunlik buyurtmalar',
  'dash.count': 'Soni',
  'dash.branchOrders': 'Filial buyurtmalari',
  'dash.recentOrders': "So'nggi buyurtmalar",
  'dash.newest6': 'Eng yangi 6 ta',
  'dash.all': 'Barchasi',

  // Login
  'login.brandTitle1': 'CleanWay biznesingizni',
  'login.brandTitle2': 'aqlli boshqaring',
  'login.brandSub':
    'Filiallar, buyurtmalar, mijozlar va xodimlar — barchasi bitta zamonaviy panelda.',
  'login.stat.orders': 'Buyurtma qabul',
  'login.stat.branches': 'Filiallar',
  'login.stat.setup': "O'rnatish",
  'login.stat.setupVal': '5 daq',
  'login.title': 'Tizimga kirish',
  'login.subtitle': 'Akkauntingiz orqali boshqaruv panelga kiring',
  'login.phone': 'Telefon raqami',
  'login.password': 'Parol',
  'login.submit': 'Kirish',
  'login.noAccount': "Hali akkauntingiz yo'qmi?",
  'login.getDemo': '14 kunlik demo olish',
  'login.welcome': 'Xush kelibsiz',
  'login.error': 'Xatolik',

  // Theme
  'theme.light': 'Yorug‘',
  'theme.dark': 'Tungi',
  'theme.toggleLight': 'Yorug‘ rejim',
  'theme.toggleDark': 'Tungi rejim',

  // Common
  'common.loading': 'Yuklanmoqda...',
  'common.close': 'Yopish',
  'common.save': 'Saqlash',
  'common.cancel': 'Bekor qilish',

  // Order statuses
  'status.draft': 'Qoralama',
  'status.submitted': 'Yuborilgan',
  'status.received_at_branch': 'Filialda qabul qilindi',
  'status.in_processing': 'Ishlanmoqda',
  'status.ready': 'Tayyor',
  'status.out_for_delivery': 'Yetkazilmoqda',
  'status.completed': 'Yakunlangan',
  'status.cancelled': 'Bekor qilingan',

  // Settings
  'settings.title': 'Sozlamalar',
  'settings.appearance': 'Ko‘rinish',
  'settings.appearanceDesc': 'Tema va til sozlamalari',
  'settings.theme': 'Mavzu',
  'settings.language': 'Til',
  'settings.profile': 'Profil',
  'settings.organization': 'Tashkilot',
  'settings.notifications': 'Bildirishnomalar',
  'settings.system': 'Tizim',
  'settings.currentTheme': 'Joriy mavzu',

  // Signup
  'signup.brandTitle1': '14 kun bepul',
  'signup.brandTitle2': 'demo sinab ko‘ring',
  'signup.brandSub':
    'Ro‘yxatdan o‘ting — CRM, buyurtmalar, mijozlar va hisobotlar darhol ishlaydi. Xizmatlar katalogini o‘zingiz sozlaysiz.',
  'signup.feature1': 'CRM boshqaruv paneli',
  'signup.feature2': 'Buyurtma va filial boshqaruvi',
  'signup.feature3': 'Xizmatlar katalogi va filial narxlari',
  'signup.feature4': 'SMS/OTP integratsiya tayyor',
  'signup.backLogin': 'Kirish sahifasiga',
  'signup.title': 'Demo ro‘yxatdan o‘tish',
  'signup.stepOf': 'Qadam',
  'signup.step1': 'Firma ma\'lumotlari',
  'signup.step2': 'Admin akkaunt',
  'signup.companyName': 'Firma nomi',
  'signup.branchName': 'Filial nomi',
  'signup.branchAddress': 'Filial manzili',
  'signup.branchPhone': 'Filial telefoni',
  'signup.contactEmail': 'Email (ixtiyoriy)',
  'signup.adminName': 'Admin ismi',
  'signup.adminPhone': 'Admin telefoni',
  'signup.adminPassword': 'Parol',
  'signup.confirmPassword': 'Parolni tasdiqlash',
  'signup.next': 'Keyingi qadam',
  'signup.submit': 'Ro‘yxatdan o‘tish',
  'signup.successTitle': 'Demo tayyor!',
  'signup.successSub': 'CRM panelingiz yaratildi. Quyidagi ma\'lumotlar bilan kiring.',
  'signup.copy': 'Ma\'lumotlarni nusxalash',
  'signup.goCrm': 'CRM ga kirish',
  'signup.passwordMismatch': 'Parollar mos kelmadi',
  'signup.error': 'Xatolik',
  'signup.copied': 'Nusxa olindi',
  ...uzExtra,
  ...uzExtra2,
};

const ru: Record<string, string> = {
  // Navigation
  'nav./dashboard': 'Панель',
  'nav./orders': 'Заказы',
  'nav./branches': 'Филиалы',
  'nav./services': 'Услуги',
  'nav./customers': 'Клиенты',
  'nav./courier': 'Курьер',
  'nav./reports': 'Отчёты',
  'nav./staff': 'Сотрудники',
  'nav.settings': 'Настройки',
  'nav.logout': 'Выход',

  // Roles
  'role.super_admin': 'Супер администратор',
  'role.branch_manager': 'Менеджер филиала',
  'role.operator': 'Оператор',
  'role.courier': 'Курьер',
  'roleDesc.super_admin': 'Все филиалы и системные настройки',
  'roleDesc.branch_manager': 'Заказы и управление своим филиалом',
  'roleDesc.operator': 'Приём заказов и управление статусами',
  'roleDesc.courier': 'Задачи доставки и выдача заказов',

  // Topbar
  'topbar.search': 'Поиск...',
  'topbar.demo': 'Демо',
  'topbar.days': 'дн.',
  'topbar.demoSupportHint': 'Если есть вопросы — напишите в Telegram',

  // Dashboard
  'dash.title': 'Панель управления',
  'dash.panel': 'панель',
  'dash.personal': 'Личный дашборд',
  'dash.hello': 'Здравствуйте',
  'dash.employee': 'сотрудник',
  'dash.branches': 'Филиалы',
  'dash.myTasks': 'Мои задачи',
  'dash.newOrder': 'Новый заказ',
  'dash.allOrders': 'Все заказы',
  'dash.addStaff': 'Добавить сотрудника',
  'dash.todayDeliveries': 'Доставки на сегодня',
  'dash.allTasks': 'Все задачи',
  'dash.todayOrders': 'Заказы сегодня',
  'dash.inProcessing': 'В обработке',
  'dash.ready': 'Готово',
  'dash.todayRevenue': 'Выручка сегодня',
  'dash.ordersDynamics': 'Динамика заказов',
  'dash.last7days': 'Последние 7 дней',
  'dash.dailyOrders': 'Заказы по дням',
  'dash.count': 'Количество',
  'dash.branchOrders': 'Заказы филиала',
  'dash.recentOrders': 'Последние заказы',
  'dash.newest6': 'Последние 6',
  'dash.all': 'Все',

  // Login
  'login.brandTitle1': 'Управляйте бизнесом',
  'login.brandTitle2': 'разумно с CleanWay',
  'login.brandSub':
    'Филиалы, заказы, клиенты и сотрудники — всё в одной современной панели.',
  'login.stat.orders': 'Приём заказов',
  'login.stat.branches': 'Филиалы',
  'login.stat.setup': 'Настройка',
  'login.stat.setupVal': '5 мин',
  'login.title': 'Вход в систему',
  'login.subtitle': 'Войдите в панель управления через свой аккаунт',
  'login.phone': 'Номер телефона',
  'login.password': 'Пароль',
  'login.submit': 'Войти',
  'login.noAccount': 'Ещё нет аккаунта?',
  'login.getDemo': 'Получить демо на 14 дней',
  'login.welcome': 'Добро пожаловать',
  'login.error': 'Ошибка',

  // Theme
  'theme.light': 'Светлая',
  'theme.dark': 'Тёмная',
  'theme.toggleLight': 'Светлая тема',
  'theme.toggleDark': 'Тёмная тема',

  // Common
  'common.loading': 'Загрузка...',
  'common.close': 'Закрыть',
  'common.save': 'Сохранить',
  'common.cancel': 'Отмена',

  // Order statuses
  'status.draft': 'Черновик',
  'status.submitted': 'Отправлен',
  'status.received_at_branch': 'Принят в филиале',
  'status.in_processing': 'В обработке',
  'status.ready': 'Готов',
  'status.out_for_delivery': 'Доставляется',
  'status.completed': 'Завершён',
  'status.cancelled': 'Отменён',

  // Settings
  'settings.title': 'Настройки',
  'settings.appearance': 'Внешний вид',
  'settings.appearanceDesc': 'Тема и язык интерфейса',
  'settings.theme': 'Тема',
  'settings.language': 'Язык',
  'settings.profile': 'Профиль',
  'settings.organization': 'Организация',
  'settings.notifications': 'Уведомления',
  'settings.system': 'Система',
  'settings.currentTheme': 'Текущая тема',

  // Signup
  'signup.brandTitle1': '14 дней бесплатно',
  'signup.brandTitle2': 'попробуйте демо',
  'signup.brandSub':
    'Зарегистрируйтесь — CRM, заказы, клиенты и отчёты заработают сразу. Каталог услуг настраиваете сами.',
  'signup.feature1': 'CRM панель управления',
  'signup.feature2': 'Управление заказами и филиалами',
  'signup.feature3': 'Каталог услуг и цены по филиалам',
  'signup.feature4': 'SMS/OTP интеграция готова',
  'signup.backLogin': 'На страницу входа',
  'signup.title': 'Демо-регистрация',
  'signup.stepOf': 'Шаг',
  'signup.step1': 'Данные компании',
  'signup.step2': 'Аккаунт администратора',
  'signup.companyName': 'Название компании',
  'signup.branchName': 'Название филиала',
  'signup.branchAddress': 'Адрес филиала',
  'signup.branchPhone': 'Телефон филиала',
  'signup.contactEmail': 'Email (необязательно)',
  'signup.adminName': 'Имя администратора',
  'signup.adminPhone': 'Телефон администратора',
  'signup.adminPassword': 'Пароль',
  'signup.confirmPassword': 'Подтвердите пароль',
  'signup.next': 'Следующий шаг',
  'signup.submit': 'Зарегистрироваться',
  'signup.successTitle': 'Демо готово!',
  'signup.successSub': 'Ваша CRM-панель создана. Войдите с данными ниже.',
  'signup.copy': 'Скопировать данные',
  'signup.goCrm': 'Войти в CRM',
  'signup.passwordMismatch': 'Пароли не совпадают',
  'signup.error': 'Ошибка',
  'signup.copied': 'Скопировано',
  ...ruExtra,
  ...ruExtra2,
};

const dictionaries: Record<Locale, Record<string, string>> = { uz, ru };

type TranslateParams = Record<string, string | number>;

function interpolate(text: string, params?: TranslateParams) {
  if (!params) return text;
  return Object.entries(params).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    text,
  );
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, fallbackOrParams?: string | TranslateParams) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === 'undefined') return 'uz';
    const stored = localStorage.getItem(LOCALE_KEY) as Locale | null;
    return stored === 'ru' || stored === 'uz' ? stored : 'uz';
  });

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(LOCALE_KEY, l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: string, fallbackOrParams?: string | TranslateParams) => {
      const fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : undefined;
      const params = typeof fallbackOrParams === 'object' ? fallbackOrParams : undefined;
      const text = dictionaries[locale][key] ?? fallback ?? key;
      return interpolate(text, params);
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function useOrderStatusLabel() {
  const { t } = useI18n();
  return (status: string) => t(`status.${status}`, status);
}

export function useRoleLabel() {
  const { t } = useI18n();
  return (role: string) => t(`role.${role}`, role);
}

export function useFormatRelative() {
  const { t, locale } = useI18n();
  return (date: string | Date) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t('time.justNow');
    if (minutes < 60) return t('time.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('time.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 7) return t('time.daysAgo', { count: days });
    return new Date(date).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  };
}

export function useFormatDate() {
  const { locale } = useI18n();
  const loc = locale === 'ru' ? 'ru-RU' : 'uz-UZ';
  return (date: string | Date, withTime = false) => {
    const d = new Date(date);
    const dateStr = d.toLocaleDateString(loc, { year: 'numeric', month: 'short', day: '2-digit' });
    if (!withTime) return dateStr;
    return `${dateStr}, ${d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' })}`;
  };
}

export const localeInitScript = `(function(){try{var l=localStorage.getItem('${LOCALE_KEY}');if(l==='ru'||l==='uz'){document.documentElement.lang=l;}}catch(e){}})();`;
