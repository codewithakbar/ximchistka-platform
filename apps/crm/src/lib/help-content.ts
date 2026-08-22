import type { StaffRole } from './roles';

/**
 * "Yordam" bo'limi matni. Landing page kabi uz/ru obyektlari sifatida
 * saqlanadi — bu yerdagi matnlar uzun, shuning uchun i18n.tsx dagi tekis
 * kalit-qiymat lug'atiga emas, alohida faylga yoziladi.
 *
 * Har bir bo'lim `roles` bilan cheklanadi — foydalanuvchi faqat o'z ishiga
 * tegishli bo'limlarni ko'radi.
 */

export type HelpBlock =
  | { kind: 'p'; text: string }
  | { kind: 'steps'; items: string[] }
  | { kind: 'tip'; text: string }
  | { kind: 'warn'; text: string }
  | { kind: 'table'; head: [string, string]; rows: [string, string][] };

export type HelpSectionId =
  | 'intro'
  | 'setup'
  | 'pos'
  | 'flow'
  | 'payments'
  | 'mistakes'
  | 'catalog'
  | 'expenses'
  | 'reports'
  | 'staff'
  | 'courier'
  | 'telegram'
  | 'demo'
  | 'faq';

export type HelpSection = {
  id: HelpSectionId;
  title: string;
  summary: string;
  roles: StaffRole[];
  blocks: HelpBlock[];
};

export type HelpContent = {
  pageTitle: string;
  pageLead: string;
  searchPlaceholder: string;
  noResults: string;
  forRole: string;
  sections: HelpSection[];
};

const ALL: StaffRole[] = ['super_admin', 'branch_manager', 'operator', 'courier'];
const DESK: StaffRole[] = ['super_admin', 'branch_manager', 'operator'];
const MANAGERS: StaffRole[] = ['super_admin', 'branch_manager'];
const OWNER: StaffRole[] = ['super_admin'];

/* ------------------------------------------------------------------ */
/* O'ZBEKCHA                                                           */
/* ------------------------------------------------------------------ */

const uz: HelpContent = {
  pageTitle: 'Yordam',
  pageLead:
    "Tizimni birinchi marta ochdingizmi? Quyidagi bo'limlar kundalik ishingizni qadam-baqadam tushuntiradi. Faqat sizning rolingizga tegishli bo'limlar ko'rsatilgan.",
  searchPlaceholder: 'Yordamdan qidirish...',
  noResults: 'Hech narsa topilmadi',
  forRole: 'Sizning rolingiz',
  sections: [
    {
      id: 'intro',
      title: 'CleanWay nima va u qanday ishlaydi',
      summary: "Tizimning umumiy mantiqi va rollar o'rtasidagi farq",
      roles: ALL,
      blocks: [
        {
          kind: 'p',
          text: "CleanWay — ximchistka biznesi uchun boshqaruv tizimi. Mijoz kiyim topshiradi, siz uni tizimga kiritasiz, tayyor bo'lganda mijozga xabar boradi, mijoz kelib pulini to'laydi va kiyimini oladi. Tizim shu yo'lning har bir qadamini yozib boradi — kim qabul qildi, qancha pul olindi, qaysi filialda.",
        },
        {
          kind: 'p',
          text: "Tizim uch qavatdan iborat: firma (sizning korxonangiz) → filiallar (do'konlaringiz) → buyurtmalar. Har bir buyurtma aniq bir filialga tegishli, shuning uchun hisobotlarni filial bo'yicha ajratib ko'rish mumkin.",
        },
        {
          kind: 'table',
          head: ['Rol', 'Nima qila oladi'],
          rows: [
            ['Super admin', "Hamma narsa — barcha filiallar, xizmatlar, narxlar, xodimlar va hisobotlar. Odatda bu firma egasi."],
            ['Filial menejeri', "O'ziga biriktirilgan filial: buyurtmalar, to'lovlar, xarajatlar, filial narxlari."],
            ['Operator', "Kassada ishlaydi: buyurtma qabul qiladi, holatini o'zgartiradi, pul oladi. Hisobotlarni va xarajatlarni ko'rmaydi."],
            ['Kuryer', "Faqat o'ziga berilgan yetkazish vazifalarini ko'radi va topshirilganini belgilaydi."],
          ],
        },
        {
          kind: 'tip',
          text: "Yon menyuda faqat sizning rolingizga ruxsat berilgan bo'limlar chiqadi. Agar hamkasbingizda bor bo'lim sizda ko'rinmasa — bu xato emas, rol farqi.",
        },
      ],
    },

    {
      id: 'setup',
      title: 'Birinchi sozlash — nimadan boshlash kerak',
      summary: "Yangi firma uchun to'g'ri tartib: xizmatlar → narxlar → xodimlar",
      roles: OWNER,
      blocks: [
        {
          kind: 'p',
          text: "Tizim bo'sh holda keladi — xizmatlar ro'yxati oldindan to'ldirilmagan. Shuning uchun kassani ochishdan oldin katalogni yaratish shart, aks holda kassada bosadigan tugma bo'lmaydi.",
        },
        {
          kind: 'steps',
          items: [
            "Xizmatlar bo'limiga kiring va kategoriya yarating (masalan: «Ustki kiyim», «Ko'ylak», «Gilam»).",
            "Har bir kategoriyaga xizmatlarni qo'shing va asosiy narxini kiriting.",
            "Narxi oldindan noma'lum xizmatlar uchun «konstruktor» belgisini qo'ying — bunday xizmat kassada har safar narx so'raydi (masalan gilam, kvadrat metriga qarab).",
            "Filiallar bo'limida filial narxlarini tekshiring — kerak bo'lsa har bir filial uchun alohida narx qo'ying.",
            "Xodimlar bo'limida operator va kuryerlarni qo'shing, har birini o'z filialiga biriktiring.",
            "Sozlamalarda chek raqami prefiksini va chek matnini moslang.",
            "Kassaga kirib sinov buyurtmasi oching — hammasi joyida ekanini tekshiring.",
          ],
        },
        {
          kind: 'warn',
          text: "Muhim: xizmatning asosiy narxini keyinroq o'zgartirsangiz, filiallardagi mavjud narxlar avtomatik yangilanmaydi. Narxni hamma joyda o'zgartirish uchun har bir filial narxini alohida tahrirlang.",
        },
        {
          kind: 'tip',
          text: "Yangi filial ochsangiz, o'sha paytdagi barcha faol xizmatlar uchun narxlar avtomatik yaratiladi — qaytadan kiritish shart emas.",
        },
      ],
    },

    {
      id: 'pos',
      title: 'Buyurtma qabul qilish (Kassa)',
      summary: 'Mijoz kelganda qiladigan ishingiz — qadam-baqadam',
      roles: DESK,
      blocks: [
        {
          kind: 'p',
          text: "Buyurtmalar → Yangi buyurtma tugmasi kassani ochadi. Kassa telefondan boshlanadi: mijoz raqamini kiritasiz va tizim uni tanib oladi.",
        },
        {
          kind: 'steps',
          items: [
            "Mijoz telefon raqamini terib kiriting. 12 ta raqam to'lganda (998 va 9 raqam) tizim mijozni avtomatik qidiradi.",
            "Agar mijoz avval kelgan bo'lsa — ismi va manzillari o'zi to'ladi. Yangi mijoz bo'lsa ismini kiriting.",
            "Filialni va topshirish turini tanlang: do'konda, olib ketish yoki yetkazib berish.",
            "Xizmat tugmalarini bosib savatga qo'shing. Konstruktor xizmat bosilganda narx oynasi ochiladi — narxni kiriting.",
            "Kerak bo'lsa har bir qatorning narxini o'zgartiring (kelishilgan narx uchun) va izoh qoldiring.",
            "Promo-kod bo'lsa kiriting — chegirma darhol hisoblanadi.",
            "To'lovni tanlang: «Keyin» (mijoz olib ketganda to'laydi) yoki «Hozir».",
            "Saqlang — chek avtomatik yangi oynada ochiladi va chop etishga tayyor bo'ladi.",
          ],
        },
        {
          kind: 'warn',
          text: "Brauzeringiz qalqib chiquvchi oynalarni bloklab qo'ysa, chek oynasi ochilmaydi. Bunday holda buyurtma sahifasidagi «Chek» tugmasidan qayta oching va brauzerda bu sayt uchun oynalarga ruxsat bering.",
        },
        {
          kind: 'tip',
          text: "Narxi har safar boshqacha bo'ladigan xizmatlarni (gilam, pardalar, teri kiyim) konstruktor qilib belgilang — shunda kassada narx so'raydi va xato narx qo'yilmaydi.",
        },
      ],
    },

    {
      id: 'flow',
      title: "Buyurtma yo'li: Ishlanmoqda → Tayyor → Topshirish",
      summary: 'Uch bosqich va ularning har biri nima qiladi',
      roles: DESK,
      blocks: [
        {
          kind: 'p',
          text: "Buyurtma qabul qilinishi bilan «Ishlanmoqda» holatiga tushadi — alohida tugma bosish shart emas. Keyingi ikki qadamni siz bosasiz.",
        },
        {
          kind: 'table',
          head: ['Holat', 'Ma\'nosi va nima sodir bo\'ladi'],
          rows: [
            ['Ishlanmoqda', "Kiyim qabul qilindi, tozalanmoqda. Buyurtma yaratilganda avtomatik qo'yiladi."],
            ['Tayyor', "«Tayyor» tugmasini bosganingizda mijozga SMS va Telegram xabari ketadi — «buyurtmangiz tayyor»."],
            ['Yakunlangan', "«Topshirish» tugmasi orqali: qolgan pul olinadi va buyurtma yopiladi — bitta harakatda."],
            ['Bekor qilingan', "Buyurtma amalga oshmadi. Tushum hisobotlaridan chiqib ketadi."],
          ],
        },
        {
          kind: 'warn',
          text: "«Topshirish» tugmasidan foydalaning — u pulni olib, buyurtmani bir vaqtda yopadi. Buyurtmani boshqa yo'l bilan «Yakunlangan» qilsangiz, pul olinmay qolishi va kassa hisobi noto'g'ri chiqishi mumkin.",
        },
        {
          kind: 'tip',
          text: "Topshirish oynasida qolgan summa avtomatik to'ldirilgan bo'ladi. Mijoz to'liq to'lasa — shunchaki tasdiqlang.",
        },
      ],
    },

    {
      id: 'payments',
      title: "To'lovlarni qabul qilish",
      summary: "Qisman to'lov, aralash to'lov va to'lov usullari",
      roles: DESK,
      blocks: [
        {
          kind: 'p',
          text: "To'lovni buyurtma qabul qilinayotganda ham, keyinroq buyurtma sahifasidan ham olish mumkin. Tizim har doim uchta raqamni ko'rsatadi: jami summa, to'langan va qoldiq.",
        },
        {
          kind: 'steps',
          items: [
            "Buyurtma sahifasida «To'lov qabul qilish» tugmasini bosing.",
            "To'lov usulini tanlang: naqd, Click, Payme, Uzum yoki o'tkazma.",
            "Mijoz bir necha usulda to'lasa «Qism qo'shish» bilan yana qator qo'shing — 5 tagacha usul mumkin.",
            "Summani kiriting. Qoldiqdan ko'p summa kiritib bo'lmaydi.",
            "Tasdiqlang — to'lov darhol kassa hisobotiga tushadi.",
          ],
        },
        {
          kind: 'tip',
          text: "Qisman to'lov mumkin: mijoz avans qoldirsa o'shani kiriting, qolgani topshirish paytida olinadi.",
        },
        {
          kind: 'warn',
          text: "Bekor qilingan buyurtmaga to'lov qabul qilinmaydi.",
        },
      ],
    },

    {
      id: 'mistakes',
      title: 'Xatoni qanday tuzatish kerak',
      summary: "Qaytarish, bekor qilish va o'chirish — qaysi biri qachon",
      roles: MANAGERS,
      blocks: [
        {
          kind: 'p',
          text: "Uchta turli tugma bor va ular butunlay boshqa narsa qiladi. Noto'g'risini bosish hisobotni buzadi, shuning uchun farqni bilib oling.",
        },
        {
          kind: 'table',
          head: ['Tugma', 'Qachon ishlatiladi'],
          rows: [
            ["To'lovni qaytarish", "Pul noto'g'ri kiritilgan yoki mijozga qaytarilgan. To'lov «qaytarilgan» deb belgilanadi, qarz qayta ochiladi, kassa hisobidan chiqadi — lekin tarixda ko'rinib turadi. Buyurtmaning o'zi qoladi."],
            ['Buyurtmani bekor qilish', "Mijoz voz kechdi yoki buyurtma amalga oshmadi. Buyurtma ro'yxatda qoladi, lekin tushum hisobotidan chiqadi."],
            ["Buyurtmani o'chirish", "Butunlay xato kiritilgan buyurtma (masalan ikki marta kiritilgan). Buyurtma va uning to'lovlari butunlay yo'q bo'ladi — qaytarib bo'lmaydi."],
          ],
        },
        {
          kind: 'warn',
          text: "Noto'g'ri to'lovni tuzatish uchun buyurtmani o'chirmang — «To'lovni qaytarish» dan foydalaning. O'chirish tarixni ham yo'q qiladi va keyin nima bo'lganini tekshirib bo'lmaydi.",
        },
        {
          kind: 'tip',
          text: "Qaytarilgan to'lov hisobotlarga tasir qilmaydi — pul kassadan chiqadi, lekin yozuv audit uchun saqlanadi.",
        },
      ],
    },

    {
      id: 'catalog',
      title: 'Xizmatlar va narxlar',
      summary: 'Katalogni tuzish, chegirma va filial narxlari',
      roles: MANAGERS,
      blocks: [
        {
          kind: 'p',
          text: "Katalog ikki qavatli: kategoriyalar va ular ichidagi xizmatlar. Kassadagi tugmalar tartibi shu yerdagi tartibga qarab chiqadi — eng ko'p ishlatiladiganini yuqoriga qo'ying.",
        },
        {
          kind: 'steps',
          items: [
            "Xizmatlar bo'limida kategoriya qo'shing va nomini kiriting.",
            "Kategoriya ichiga xizmat qo'shing, asosiy narxni belgilang.",
            "Narxi o'zgaruvchan bo'lsa «konstruktor» qilib belgilang.",
            "Kerak bo'lsa muddatli chegirma qo'ying — belgilangan sanalarda narx avtomatik tushadi.",
            "Filiallar bo'limida o'sha filial uchun boshqacha narx kerak bo'lsa alohida kiriting.",
          ],
        },
        {
          kind: 'warn',
          text: "Asosiy narxni o'zgartirish filiallardagi mavjud narxlarni yangilamaydi. Yangi narx faqat keyin ochilgan filiallarga tushadi — eskilarini qo'lda tahrirlash kerak.",
        },
        {
          kind: 'tip',
          text: "Kassadagi tugmalarga rang berish mumkin — sozlamalarda rang to'plamini tanlang, keyin kassada qatorlarni rang bilan belgilaysiz.",
        },
      ],
    },

    {
      id: 'expenses',
      title: 'Xarajatlar',
      summary: 'Chiqimlarni yozib borish va sof foydani ko\'rish',
      roles: MANAGERS,
      blocks: [
        {
          kind: 'p',
          text: "Xarajatlar bo'limi biznesning chiqimlarini yozib boradi — ijara, oylik, materiallar, kommunal, transport va boshqa. Bu raqamlar hisobotdagi sof foydani hisoblashda ishlatiladi.",
        },
        {
          kind: 'steps',
          items: [
            "Xarajatlar bo'limiga kiring va «Qo'shish» tugmasini bosing.",
            "Kategoriyani tanlang, summani kiriting.",
            "Sanani belgilang — o'tgan kunlarni ham kiritish mumkin (masalan oy oxirida kelgan hisob).",
            "Filialni tanlang yoki umumiy (butun firma bo'yicha) qoldiring.",
            "Izoh qoldiring — keyin nima uchun sarflanganini eslab qolasiz.",
          ],
        },
        {
          kind: 'tip',
          text: "Filial menejeri faqat o'z filiali uchun xarajat kiritadi. Butun firma bo'yicha umumiy xarajatni faqat super admin kiritadi.",
        },
      ],
    },

    {
      id: 'reports',
      title: "Hisobotlarni to'g'ri o'qish",
      summary: "Tushum, kassa va sof foyda o'rtasidagi farq",
      roles: OWNER,
      blocks: [
        {
          kind: 'p',
          text: "Hisobotdagi eng muhim narsa — «Tushum» va «Kassa» bir xil raqam emas. Ular ikki xil savolga javob beradi va ularni chalkashtirmaslik kerak.",
        },
        {
          kind: 'table',
          head: ['Ko\'rsatkich', 'Nimani bildiradi'],
          rows: [
            ['Tushum', "Mijozlarga yozilgan jami summa — ya'ni ular qancha to'lashi kerak. Pul hali kelmagan bo'lishi mumkin."],
            ['Kassa', "Haqiqatan qo'lga kirgan pul — to'lov usullari bo'yicha ajratilgan. Qarzdorlik bu yerga kirmaydi."],
            ['Xarajat', 'Xarajatlar bo\'limida kiritgan chiqimlaringiz.'],
            ['Sof foyda', 'Tushum minus xarajat.'],
          ],
        },
        {
          kind: 'tip',
          text: "Agar «Tushum» katta-yu «Kassa» kichik bo'lsa — demak ko'p buyurtma to'lanmagan. Buyurtmalar ro'yxatidan qoldiqli buyurtmalarni topib mijozlarga eslatma qiling.",
        },
        {
          kind: 'p',
          text: "Hisobotni kun, filial va to'lov usuli bo'yicha ajratib ko'rish mumkin, shuningdek Excel (CSV) ga yuklab olish mumkin.",
        },
      ],
    },

    {
      id: 'staff',
      title: 'Xodimlarni boshqarish',
      summary: "Xodim qo'shish va ularga filial biriktirish",
      roles: MANAGERS,
      blocks: [
        {
          kind: 'steps',
          items: [
            "Xodimlar bo'limida «Qo'shish» tugmasini bosing.",
            "Ism, telefon raqam va parol kiriting — xodim shu raqam bilan kiradi.",
            "Rolni tanlang: filial menejeri, operator yoki kuryer.",
            "Filialni biriktiring — xodim faqat o'sha filial buyurtmalarini ko'radi.",
          ],
        },
        {
          kind: 'warn',
          text: "Xodimga filial biriktirishni unutmang. Filialsiz operator kassada buyurtmalarni ko'rmaydi va «tizim ishlamayapti» deb o'ylaydi.",
        },
        {
          kind: 'tip',
          text: "Xodim ishdan bo'shasa uni o'chirmang — faolsiz qilib qo'ying. Shunda uning qabul qilgan buyurtmalari tarixda saqlanib qoladi.",
        },
      ],
    },

    {
      id: 'courier',
      title: 'Kuryer va yetkazib berish',
      summary: 'Yetkazishni tayinlash va topshirilganini belgilash',
      roles: ALL,
      blocks: [
        {
          kind: 'p',
          text: "Yetkazib berish tanlangan buyurtmalar Kuryer bo'limida ko'rinadi. Operator yoki menejer kuryerni tayinlaydi, kuryer esa faqat o'ziga berilgan vazifalarni ko'radi.",
        },
        {
          kind: 'steps',
          items: [
            "Kuryer bo'limida tayinlanmagan buyurtmalar ro'yxatini oching.",
            "Buyurtmani tanlab kuryerni belgilang — buyurtma «Yetkazilmoqda» holatiga o'tadi.",
            "Kuryer yetkazgach o'z ro'yxatidan «Topshirildi» deb belgilaydi.",
          ],
        },
        {
          kind: 'tip',
          text: "Kuryer telefonidan ham kiradi — yon menyuda unga faqat Boshqaruv va Kuryer bo'limlari ko'rinadi.",
        },
      ],
    },

    {
      id: 'telegram',
      title: 'Telegram bot',
      summary: 'Parolsiz kirish, mijoz xabarlari va egaga hisobot',
      roles: ALL,
      blocks: [
        {
          kind: 'p',
          text: "Telegram bot tizimning ikkinchi eshigi — kompyutersiz ishlash uchun. Botni ochib o'z telefon raqamingizni ulashsangiz, hisobingiz bog'lanadi.",
        },
        {
          kind: 'table',
          head: ['Kim', 'Botda nima qila oladi'],
          rows: [
            ['Xodim', "Parolsiz kirish kodi olish, chek raqami bo'yicha buyurtmani topish va holatini o'zgartirish."],
            ['Mijoz', "O'z buyurtmalarini ko'rish va holat o'zgarganda avtomatik xabar olish."],
            ['Firma egasi', "Bugungi tushum hisoboti va yangi buyurtma / to'lov haqida jonli bildirishnomalar."],
          ],
        },
        {
          kind: 'steps',
          items: [
            "Botni oching va «Telefonni ulashish» tugmasini bosing.",
            "CRM ga kirish uchun botdagi «Kirish kodi» tugmasini bosing.",
            "Kelgan 6 xonali kodni CRM kirish sahifasidagi Telegram bo'limiga kiriting.",
          ],
        },
        {
          kind: 'warn',
          text: "Kirish kodi 5 daqiqa amal qiladi va faqat bir marta ishlaydi. Kodni hech kimga bermang — u sizning hisobingizga to'liq kirish beradi.",
        },
      ],
    },

    {
      id: 'demo',
      title: 'Sinov muddati va tarif',
      summary: 'Demo tugaganda nima bo\'ladi',
      roles: OWNER,
      blocks: [
        {
          kind: 'p',
          text: "Yangi firma sinov muddati bilan boshlanadi. Qolgan kunlar yuqori panelda ko'rinib turadi.",
        },
        {
          kind: 'p',
          text: "Muddat tugagach tizim yopilmaydi — hamma narsani ko'rish va hisobotlarni o'qish mumkin bo'lib qoladi, lekin yangi buyurtma kiritish, to'lov qabul qilish va tahrirlash to'xtaydi. Ma'lumotlaringiz joyida turadi.",
        },
        {
          kind: 'tip',
          text: "Davom ettirish uchun platforma administratori bilan Telegram orqali bog'laning — muddat uzaytirilgach hammasi darhol ishlay boshlaydi.",
        },
      ],
    },

    {
      id: 'faq',
      title: 'Tez-tez beriladigan savollar',
      summary: 'Birinchi kunlarda eng ko\'p so\'raladigan narsalar',
      roles: ALL,
      blocks: [
        {
          kind: 'table',
          head: ['Savol', 'Javob'],
          rows: [
            ['Kassada birorta xizmat tugmasi yo\'q', "Katalog hali to'ldirilmagan. Super admin Xizmatlar bo'limida kategoriya va xizmat qo'shishi kerak."],
            ['Buyurtmalar ro\'yxati bo\'sh', "Sizga biriktirilgan filialda hali buyurtma yo'q. Boshqa filialdagi buyurtmalar sizga ko'rinmaydi."],
            ['Chek oynasi ochilmadi', "Brauzer qalqib chiquvchi oynani bloklagan. Buyurtma sahifasidagi «Chek» tugmasidan qayta oching."],
            ['Mijozga xabar bormadi', "SMS «Tayyor» bosilganda yuboriladi. Mijoz raqami to'g'ri kiritilganini tekshiring."],
            ['Narxni o\'zgartirdim, kassada eski narx', "Xizmatning asosiy narxi emas, filial narxini o'zgartirish kerak — Filiallar bo'limidan."],
            ['Parolimni unutdim', "Telegram bot orqali kirish kodini oling yoki super admindan parolni yangilashni so'rang."],
            ['Xodim tizimga kira olmayapti', "Xodim faolligini va telefon raqami to'g'riligini tekshiring. Filial biriktirilganiga ham ishonch hosil qiling."],
          ],
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/* РУССКИЙ                                                             */
/* ------------------------------------------------------------------ */

const ru: HelpContent = {
  pageTitle: 'Помощь',
  pageLead:
    'Открыли систему впервые? Разделы ниже пошагово объясняют вашу ежедневную работу. Показаны только разделы, относящиеся к вашей роли.',
  searchPlaceholder: 'Поиск по справке...',
  noResults: 'Ничего не найдено',
  forRole: 'Ваша роль',
  sections: [
    {
      id: 'intro',
      title: 'Что такое CleanWay и как он работает',
      summary: 'Общая логика системы и разница между ролями',
      roles: ALL,
      blocks: [
        {
          kind: 'p',
          text: 'CleanWay — система управления для химчистки. Клиент сдаёт вещи, вы заводите заказ в систему, при готовности клиенту уходит уведомление, клиент приходит, платит и забирает вещи. Система фиксирует каждый шаг — кто принял, сколько денег получено, в каком филиале.',
        },
        {
          kind: 'p',
          text: 'Система состоит из трёх уровней: фирма (ваше предприятие) → филиалы (ваши точки) → заказы. Каждый заказ принадлежит конкретному филиалу, поэтому отчёты можно смотреть в разрезе филиалов.',
        },
        {
          kind: 'table',
          head: ['Роль', 'Что может делать'],
          rows: [
            ['Супер админ', 'Всё — все филиалы, услуги, цены, сотрудники и отчёты. Обычно это владелец фирмы.'],
            ['Менеджер филиала', 'Свой филиал: заказы, платежи, расходы, цены филиала.'],
            ['Оператор', 'Работает на кассе: принимает заказы, меняет статус, принимает оплату. Не видит отчёты и расходы.'],
            ['Курьер', 'Видит только назначенные ему доставки и отмечает их выполненными.'],
          ],
        },
        {
          kind: 'tip',
          text: 'В боковом меню отображаются только разделы, разрешённые вашей роли. Если у коллеги есть раздел, которого нет у вас — это не ошибка, а разница ролей.',
        },
      ],
    },

    {
      id: 'setup',
      title: 'Первая настройка — с чего начать',
      summary: 'Правильный порядок для новой фирмы: услуги → цены → сотрудники',
      roles: OWNER,
      blocks: [
        {
          kind: 'p',
          text: 'Система приходит пустой — список услуг не заполнен заранее. Поэтому перед открытием кассы каталог нужно создать, иначе на кассе не будет кнопок.',
        },
        {
          kind: 'steps',
          items: [
            'Зайдите в раздел Услуги и создайте категорию (например: «Верхняя одежда», «Рубашки», «Ковры»).',
            'Добавьте в каждую категорию услуги и укажите базовую цену.',
            'Для услуг с заранее неизвестной ценой поставьте отметку «конструктор» — такая услуга каждый раз спросит цену на кассе (например ковёр, по квадратуре).',
            'В разделе Филиалы проверьте цены филиала — при необходимости задайте отдельную цену для каждого филиала.',
            'В разделе Сотрудники добавьте операторов и курьеров, привязав каждого к своему филиалу.',
            'В настройках задайте префикс номера чека и текст чека.',
            'Зайдите на кассу и создайте пробный заказ — убедитесь, что всё работает.',
          ],
        },
        {
          kind: 'warn',
          text: 'Важно: если позже изменить базовую цену услуги, существующие цены в филиалах не обновятся автоматически. Чтобы изменить цену везде, отредактируйте цену каждого филиала отдельно.',
        },
        {
          kind: 'tip',
          text: 'При открытии нового филиала цены для всех активных услуг создаются автоматически — вводить заново не нужно.',
        },
      ],
    },

    {
      id: 'pos',
      title: 'Приём заказа (Касса)',
      summary: 'Что вы делаете, когда пришёл клиент — пошагово',
      roles: DESK,
      blocks: [
        {
          kind: 'p',
          text: 'Заказы → кнопка Новый заказ открывает кассу. Касса начинается с телефона: вы вводите номер клиента и система его узнаёт.',
        },
        {
          kind: 'steps',
          items: [
            'Наберите номер телефона клиента. Когда наберётся 12 цифр (998 и 9 цифр), система автоматически найдёт клиента.',
            'Если клиент уже обращался — имя и адреса подставятся сами. Для нового клиента введите имя.',
            'Выберите филиал и тип выдачи: в салоне, самовывоз или доставка.',
            'Нажимайте на плитки услуг, чтобы добавить их в корзину. При нажатии на услугу-конструктор откроется окно цены — введите цену.',
            'При необходимости измените цену строки (для договорной цены) и оставьте примечание.',
            'Если есть промокод — введите его, скидка посчитается сразу.',
            'Выберите оплату: «Потом» (клиент платит при получении) или «Сейчас».',
            'Сохраните — чек автоматически откроется в новой вкладке и будет готов к печати.',
          ],
        },
        {
          kind: 'warn',
          text: 'Если браузер блокирует всплывающие окна, окно чека не откроется. В этом случае откройте его повторно кнопкой «Чек» на странице заказа и разрешите всплывающие окна для этого сайта.',
        },
        {
          kind: 'tip',
          text: 'Услуги с каждый раз разной ценой (ковры, шторы, кожа) отмечайте как конструктор — тогда касса спросит цену и неправильная цена не проставится.',
        },
      ],
    },

    {
      id: 'flow',
      title: 'Путь заказа: В работе → Готов → Выдача',
      summary: 'Три этапа и что делает каждый из них',
      roles: DESK,
      blocks: [
        {
          kind: 'p',
          text: 'Заказ сразу после приёма попадает в статус «В работе» — отдельную кнопку нажимать не нужно. Следующие два шага нажимаете вы.',
        },
        {
          kind: 'table',
          head: ['Статус', 'Значение и что происходит'],
          rows: [
            ['В работе', 'Вещи приняты, идёт чистка. Ставится автоматически при создании заказа.'],
            ['Готов', 'При нажатии «Готов» клиенту уходит SMS и сообщение в Telegram — «ваш заказ готов».'],
            ['Завершён', 'Через кнопку «Выдача»: принимается остаток оплаты и заказ закрывается — одним действием.'],
            ['Отменён', 'Заказ не состоялся. Выпадает из отчётов по выручке.'],
          ],
        },
        {
          kind: 'warn',
          text: 'Пользуйтесь кнопкой «Выдача» — она одновременно принимает деньги и закрывает заказ. Если завершить заказ другим путём, деньги могут остаться неполученными и касса сойдётся неверно.',
        },
        {
          kind: 'tip',
          text: 'В окне выдачи остаток суммы подставляется автоматически. Если клиент платит полностью — просто подтвердите.',
        },
      ],
    },

    {
      id: 'payments',
      title: 'Приём оплаты',
      summary: 'Частичная оплата, смешанная оплата и способы оплаты',
      roles: DESK,
      blocks: [
        {
          kind: 'p',
          text: 'Оплату можно принять и при создании заказа, и позже со страницы заказа. Система всегда показывает три числа: общая сумма, оплачено и остаток.',
        },
        {
          kind: 'steps',
          items: [
            'На странице заказа нажмите «Принять оплату».',
            'Выберите способ: наличные, Click, Payme, Uzum или перевод.',
            'Если клиент платит несколькими способами, добавьте строку кнопкой «Добавить часть» — до 5 способов.',
            'Введите сумму. Больше остатка ввести нельзя.',
            'Подтвердите — оплата сразу попадёт в отчёт по кассе.',
          ],
        },
        {
          kind: 'tip',
          text: 'Частичная оплата возможна: если клиент оставил аванс, введите его, остаток примете при выдаче.',
        },
        {
          kind: 'warn',
          text: 'На отменённый заказ оплата не принимается.',
        },
      ],
    },

    {
      id: 'mistakes',
      title: 'Как исправить ошибку',
      summary: 'Возврат, отмена и удаление — что и когда',
      roles: MANAGERS,
      blocks: [
        {
          kind: 'p',
          text: 'Есть три разные кнопки, и они делают совершенно разные вещи. Нажать не ту — испортить отчёт, поэтому разберитесь в разнице.',
        },
        {
          kind: 'table',
          head: ['Кнопка', 'Когда применяется'],
          rows: [
            ['Возврат оплаты', 'Деньги введены неверно или возвращены клиенту. Платёж помечается «возвращён», долг открывается заново, сумма уходит из кассы — но остаётся видна в истории. Сам заказ сохраняется.'],
            ['Отмена заказа', 'Клиент отказался или заказ не состоялся. Заказ остаётся в списке, но выпадает из отчёта по выручке.'],
            ['Удаление заказа', 'Полностью ошибочный заказ (например заведён дважды). Заказ и его платежи исчезают безвозвратно.'],
          ],
        },
        {
          kind: 'warn',
          text: 'Чтобы исправить неверную оплату, не удаляйте заказ — используйте «Возврат оплаты». Удаление стирает и историю, после него нельзя разобраться, что произошло.',
        },
        {
          kind: 'tip',
          text: 'Возвращённая оплата не искажает отчёты — деньги уходят из кассы, но запись сохраняется для аудита.',
        },
      ],
    },

    {
      id: 'catalog',
      title: 'Услуги и цены',
      summary: 'Построение каталога, скидки и цены филиалов',
      roles: MANAGERS,
      blocks: [
        {
          kind: 'p',
          text: 'Каталог двухуровневый: категории и услуги внутри них. Порядок кнопок на кассе повторяет порядок здесь — самое частое ставьте выше.',
        },
        {
          kind: 'steps',
          items: [
            'В разделе Услуги добавьте категорию и укажите название.',
            'Внутри категории добавьте услугу и задайте базовую цену.',
            'Если цена переменная — отметьте её как «конструктор».',
            'При необходимости задайте срочную скидку — в указанные даты цена снизится автоматически.',
            'Если для филиала нужна другая цена, задайте её отдельно в разделе Филиалы.',
          ],
        },
        {
          kind: 'warn',
          text: 'Изменение базовой цены не обновляет существующие цены филиалов. Новая цена попадёт только в филиалы, открытые позже — старые нужно править вручную.',
        },
        {
          kind: 'tip',
          text: 'Кнопкам на кассе можно задать цвет — выберите цветовой набор в настройках, затем помечайте строки цветом на кассе.',
        },
      ],
    },

    {
      id: 'expenses',
      title: 'Расходы',
      summary: 'Учёт затрат и просмотр чистой прибыли',
      roles: MANAGERS,
      blocks: [
        {
          kind: 'p',
          text: 'Раздел Расходы фиксирует затраты бизнеса — аренда, зарплата, материалы, коммунальные, транспорт и прочее. Эти цифры используются для расчёта чистой прибыли в отчёте.',
        },
        {
          kind: 'steps',
          items: ['Зайдите в раздел Расходы и нажмите «Добавить».', 'Выберите категорию, введите сумму.', 'Укажите дату — можно вносить и прошедшие дни (например счёт, пришедший в конце месяца).', 'Выберите филиал или оставьте общим (по всей фирме).', 'Оставьте примечание — потом вспомните, на что потрачено.'],
        },
        {
          kind: 'tip',
          text: 'Менеджер филиала вносит расходы только по своему филиалу. Общий расход по всей фирме вносит только супер админ.',
        },
      ],
    },

    {
      id: 'reports',
      title: 'Как правильно читать отчёты',
      summary: 'Разница между выручкой, кассой и чистой прибылью',
      roles: OWNER,
      blocks: [
        {
          kind: 'p',
          text: 'Самое важное в отчёте — «Выручка» и «Касса» это не одно и то же. Они отвечают на разные вопросы, и путать их нельзя.',
        },
        {
          kind: 'table',
          head: ['Показатель', 'Что означает'],
          rows: [
            ['Выручка', 'Общая сумма, выставленная клиентам — то есть сколько они должны заплатить. Деньги могли ещё не поступить.'],
            ['Касса', 'Реально полученные деньги — с разбивкой по способам оплаты. Задолженность сюда не входит.'],
            ['Расходы', 'Затраты, внесённые вами в разделе Расходы.'],
            ['Чистая прибыль', 'Выручка минус расходы.'],
          ],
        },
        {
          kind: 'tip',
          text: 'Если «Выручка» большая, а «Касса» маленькая — значит много неоплаченных заказов. Найдите заказы с остатком в списке и напомните клиентам.',
        },
        {
          kind: 'p',
          text: 'Отчёт можно разбить по дням, филиалам и способам оплаты, а также выгрузить в Excel (CSV).',
        },
      ],
    },

    {
      id: 'staff',
      title: 'Управление сотрудниками',
      summary: 'Добавление сотрудника и привязка к филиалу',
      roles: MANAGERS,
      blocks: [
        {
          kind: 'steps',
          items: [
            'В разделе Сотрудники нажмите «Добавить».',
            'Введите имя, номер телефона и пароль — сотрудник входит по этому номеру.',
            'Выберите роль: менеджер филиала, оператор или курьер.',
            'Привяжите филиал — сотрудник будет видеть заказы только этого филиала.',
          ],
        },
        {
          kind: 'warn',
          text: 'Не забудьте привязать сотрудника к филиалу. Оператор без филиала не увидит заказов на кассе и решит, что «система не работает».',
        },
        {
          kind: 'tip',
          text: 'Если сотрудник уволился, не удаляйте его — сделайте неактивным. Тогда принятые им заказы сохранятся в истории.',
        },
      ],
    },

    {
      id: 'courier',
      title: 'Курьер и доставка',
      summary: 'Назначение доставки и отметка о вручении',
      roles: ALL,
      blocks: [
        {
          kind: 'p',
          text: 'Заказы с доставкой отображаются в разделе Курьер. Оператор или менеджер назначает курьера, а курьер видит только назначенные ему задачи.',
        },
        {
          kind: 'steps',
          items: [
            'В разделе Курьер откройте список неназначенных заказов.',
            'Выберите заказ и назначьте курьера — заказ перейдёт в статус «Доставляется».',
            'После доставки курьер отмечает «Вручено» в своём списке.',
          ],
        },
        {
          kind: 'tip',
          text: 'Курьер заходит и с телефона — в боковом меню ему видны только разделы Панель и Курьер.',
        },
      ],
    },

    {
      id: 'telegram',
      title: 'Telegram-бот',
      summary: 'Вход без пароля, уведомления клиенту и отчёт владельцу',
      roles: ALL,
      blocks: [
        {
          kind: 'p',
          text: 'Telegram-бот — вторая дверь в систему, для работы без компьютера. Откройте бота и поделитесь своим номером телефона, чтобы привязать аккаунт.',
        },
        {
          kind: 'table',
          head: ['Кто', 'Что может в боте'],
          rows: [
            ['Сотрудник', 'Получить код входа без пароля, найти заказ по номеру чека и изменить его статус.'],
            ['Клиент', 'Смотреть свои заказы и получать автоуведомления при смене статуса.'],
            ['Владелец фирмы', 'Отчёт по сегодняшней выручке и живые уведомления о новых заказах и платежах.'],
          ],
        },
        {
          kind: 'steps',
          items: [
            'Откройте бота и нажмите кнопку «Поделиться телефоном».',
            'Для входа в CRM нажмите в боте кнопку «Код входа».',
            'Введите пришедший 6-значный код во вкладку Telegram на странице входа в CRM.',
          ],
        },
        {
          kind: 'warn',
          text: 'Код входа действует 5 минут и срабатывает один раз. Никому не передавайте код — он даёт полный доступ к вашему аккаунту.',
        },
      ],
    },

    {
      id: 'demo',
      title: 'Пробный период и тариф',
      summary: 'Что происходит по окончании демо',
      roles: OWNER,
      blocks: [
        {
          kind: 'p',
          text: 'Новая фирма начинается с пробного периода. Оставшиеся дни видны на верхней панели.',
        },
        {
          kind: 'p',
          text: 'По окончании срока система не закрывается — просмотр всех данных и чтение отчётов остаются доступны, но создание заказов, приём оплаты и редактирование останавливаются. Ваши данные сохраняются.',
        },
        {
          kind: 'tip',
          text: 'Для продолжения свяжитесь с администратором платформы через Telegram — после продления всё заработает сразу.',
        },
      ],
    },

    {
      id: 'faq',
      title: 'Частые вопросы',
      summary: 'О чём чаще всего спрашивают в первые дни',
      roles: ALL,
      blocks: [
        {
          kind: 'table',
          head: ['Вопрос', 'Ответ'],
          rows: [
            ['На кассе нет ни одной кнопки услуги', 'Каталог ещё не заполнен. Супер админ должен добавить категорию и услуги в разделе Услуги.'],
            ['Список заказов пуст', 'В привязанном к вам филиале пока нет заказов. Заказы других филиалов вам не видны.'],
            ['Окно чека не открылось', 'Браузер заблокировал всплывающее окно. Откройте повторно кнопкой «Чек» на странице заказа.'],
            ['Клиенту не пришло уведомление', 'SMS отправляется при нажатии «Готов». Проверьте правильность номера клиента.'],
            ['Изменил цену, а на кассе старая', 'Менять нужно не базовую цену услуги, а цену филиала — в разделе Филиалы.'],
            ['Забыл пароль', 'Получите код входа через Telegram-бота или попросите супер админа сбросить пароль.'],
            ['Сотрудник не может войти', 'Проверьте, активен ли сотрудник и верен ли номер телефона. Убедитесь также, что филиал привязан.'],
          ],
        },
      ],
    },
  ],
};

export const HELP_CONTENT: Record<'uz' | 'ru', HelpContent> = { uz, ru };
