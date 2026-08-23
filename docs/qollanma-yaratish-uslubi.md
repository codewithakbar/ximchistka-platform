# Loyihaga foydalanuvchi qo'llanmasi yaratish uslubi

Bu — CleanWay uchun qo'llanma yaratishda ishlatilgan usulning umumlashtirilgan
shakli. Har qanday loyihaga qo'llash uchun yozilgan: CRM, do'kon, logistika,
ichki asbob — farqi yo'q.

Claude bilan ishlaganda shu faylni ko'rsating yoki mazmunini prompt sifatida
bering.

---

## Asosiy tamoyil

> **Qo'llanmaning qiymati oddiy yo'lda emas, tuzoqlarda.**

Foydalanuvchi "tugmani bosing, saqlang" ni o'zi topadi. U topa olmaydigan narsa —
tizim jimgina kutilmagan ish qiladigan joylar. Aynan o'sha joylar odamni
"tizim buzilgan" deb o'ylashga majbur qiladi yoki pulini yo'qotishga olib keladi.

Shuning uchun qo'llanma **ilovani ishlatib emas, kodni o'qib** yoziladi.
Ilovani ishlatib yozilgan qo'llanma — skrinshotlar to'plami. Kodni o'qib
yozilgani — haqiqiy bilim.

Amaliy misol: CleanWay'da "xizmat narxini o'zgartirdim, kassada eski narx
chiqyapti" degan holat bor. Buni ilovani ishlatib topib bo'lmaydi — faqat
kodda `basePrice` o'zgarishi mavjud `PriceRule` larni yangilamasligini ko'rib
bilinadi. Bu bitta jumla butun bir bo'limdan foydaliroq.

---

## Bosqichlar

### 0-bosqich. Auditoriya va formatni aniqlang — taxmin qilmang

Ikkita savol butunlay boshqa hujjatga olib keladi:

**Kim uchun?**
- Yangi **dasturchi** — arxitektura, ishga tushirish, kod qayerda
- Biznes **foydalanuvchi** — kundalik amallar, texnik til yo'q
- **Sotuv** — nima qila olishini ko'rsatish

**Qanday shaklda?** (bir nechtasi bo'lishi mumkin)
- Ilova ichida yordam bo'limi
- Ulashiladigan sahifa (link bilan yuboriladi)
- `docs/` markdown
- Birinchi kirishda interaktiv checklist

Bu savolni **so'rang**, o'zingiz hal qilmang. Javob butun ishning hajmini va
tilini belgilaydi.

### 1-bosqich. Kodni tizimli xaritalash

Loyihani o'lchamlar bo'yicha bo'lib, **parallel** o'rganing. CleanWay'da 9 ta
yo'nalish ishlatilgan:

| Yo'nalish | Nima izlanadi |
|---|---|
| Auth va rollar | Rol → nimaga ruxsat matritsasi |
| Ma'lumot modeli | Asosiy obyektlar va ular orasidagi bog'lanish |
| Har bir ilova | Sahifalar, ularda nima qilish mumkin |
| Asosiy oqim | Holatlar mashinasi: qaysi holat jonli, qaysi biri eskirgan |
| Pul oqimi | Narx → to'lov → qaytarish → hisobot zanjiri |
| Bildirishnomalar | Qachon SMS/xabar ketadi |
| Sozlash/ishga tushirish | Noldan ishga tushirish ketma-ketligi |
| Integratsiyalar | Bot, to'lov, SMS |
| Umumiy paketlar | Nima ulashilgan va nega |

Har bir yo'nalishdan **tuzilgan javob** talab qiling: maqsad, muhim fayllar,
imkoniyatlar, **va alohida — `gotchas` (tuzoqlar)**. Oxirgisi eng qimmatlisi.

### 2-bosqich. Qarshi-tekshiruv — bu bosqichni tashlab ketmang

Xarita tayyor bo'lgach, **alohida** tekshiruvchiga bering. Uning vazifasi
rozi bo'lish emas, **xato topish**:

- Kodda bor, lekin xaritada yo'q imkoniyatlar
- Xaritada aytilgan, lekin kodda boshqacha ishlaydigan narsalar
- Toza mashinada ishlamaydigan o'rnatish qadamlari
- Haqiqiy ruxsat tekshiruvlariga mos kelmaydigan rol da'volari

CleanWay'da tekshiruvchi 9 ta xato va 15 ta kamchilik topdi. Ulardan biri
juda muhim edi: xarita "buyurtmani yopishning yagona yo'li — Topshirish
tugmasi" degan edi, aslida uchta boshqa yo'l ham bor edi. Agar qo'llanmaga
o'sha noto'g'ri jumla kirsa, u odamlarni chalg'itardi.

**Qoida:** tekshiruvchi tasdiqlamagan da'voni qo'llanmaga yozmang.

### 3-bosqich. Tuzoqlarni ajratib oling

Bu — qo'llanmaning skeleti. Quyidagi taksonomiya bo'yicha izlang.

### 4-bosqich. Yozing va yetkazing

### 5-bosqich. Tekshiring

---

## Tuzoq taksonomiyasi

Har qanday loyihada shu beshta turni izlang. Deyarli har doim topiladi.

### 1. "Buzilganga o'xshaydi, aslida to'g'ri"

Foydalanuvchi bo'sh ekran ko'radi va qo'llab-quvvatlashga qo'ng'iroq qiladi.

- Bo'sh katalog → bo'sh kassa ekrani
- Filialga biriktirilmagan xodim → bo'sh ro'yxat
- Filtr standart holatda natijani yashiradi

**Izlash usuli:** seed/boshlang'ich ma'lumotni ko'ring — yangi hisob nimani
ko'radi? Ko'rinishni cheklaydigan har bir `where` shartini toping.

### 2. "Xavfsizga o'xshaydi, aslida buzadi"

Eng qimmat turi. Bir-biriga o'xshash tugmalar, butunlay boshqa oqibat.

- Qaytarish / bekor qilish / o'chirish — uchtasi uch xil ish qiladi
- "Faolsiz qilish" va "o'chirish" farqi
- Qayta tiklab bo'lmaydigan amallar

**Izlash usuli:** `delete`, `remove`, `cancel`, `refund` qidiring. Har biri
uchun: ma'lumot yo'qoladimi? Hisobotga qanday ta'sir qiladi? Qaytarib
bo'ladimi?

### 3. Yangilanmaydigan asimmetriya

Bir joyda o'zgartirasiz, boshqa joyda eski qiymat qoladi.

- Asosiy narx o'zgaradi, mavjud filial narxlari qolib ketadi
- Yangi obyekt yaratilganda nusxalar avtomatik yaratiladi, keyin sinxron emas

**Izlash usuli:** `createMany`, `copy`, snapshot yozuvlarini qidiring. Har
biri uchun: manba o'zgarsa, nusxa yangilanadimi? Odatda **yo'q**.

### 4. Chalkashtiriladigan ikki raqam

Ikkita ko'rsatkich yaqin turadi, lekin boshqa savolga javob beradi.

- Tushum (yozilgan) va Kassa (olingan)
- Buyurtma soni va topshirilgan buyurtma soni

**Izlash usuli:** hisobot kodini o'qing. Bir xil narsaga o'xshab, boshqa
manbadan hisoblanadigan maydonlarni toping.

### 5. Boshi berk yo'l

Tizim tugma ko'rsatadi, lekin bosilganda ishlamaydi.

CleanWay'da: bot admin uchun "Kirish kodi" tugmasini ko'rsatardi va kod
yaratardi, lekin tasdiqlash uni har doim rad etardi.

**Izlash usuli:** tugma/menyu yasovchi kodni va o'sha amalni bajaruvchi
kodni **yonma-yon** solishtiring. Ko'rsatish sharti bajarish shartiga mos
kelmasa — bu tuzoq.

> Bu turdagi topilma ko'pincha **mahsulot xatosi** bo'lib chiqadi.
> Uni qo'llanmaga yozib qo'yish emas, tuzatish kerak. Topsangiz — ayting.

---

## Uchta yetkazish yuzasi

### 1. Ilova ichida yordam bo'limi

**Qachon:** doimiy foydalanuvchilar, kundalik ish.

Tamoyillar:
- **Rolga moslashsin.** Foydalanuvchi o'zi qila olmaydigan amal haqida
  o'qimasin — bu chalkashtiradi.
- Matnni kod ichiga sochmang. Alohida faylda tuzilgan ma'lumot sifatida
  saqlang (`p`, `steps`, `tip`, `warn`, `table` kabi bloklar).
- Qidiruv qo'ying — odam qaytib kelib aniq savolga javob izlaydi.
- Ko'p tilli loyihada uzun matnni tekis kalit-qiymat lug'atiga tiqmang;
  alohida kontent fayli toza bo'ladi.

### 2. Ulashiladigan sahifa

**Qachon:** yangi xodimga link yuborish, chop etish, ilovaga kirmasdan o'qish.

Tamoyillar:
- Mustaqil bo'lsin — ilova konteksti kerak bo'lmasin
- Telefonda o'qiladigan bo'lsin (ko'pchilik shunday ochadi)
- Chop etish uslubi bo'lsin — egalar devorga osadi
- Bo'limlar ro'yxati yopishib tursin

### 3. Birinchi kirishda checklist

**Qachon:** yangi hisob bo'sh holatdan boshlanadi.

**Eng muhim qoida:**

> Checklist **haqiqiy ma'lumotni o'qisin**, foydalanuvchi belgilaydigan
> katakcha bo'lmasin.

Katakchali checklist yolg'on gapiradi: odam belgilaydi-yu, aslida qilmaydi.
Ma'lumotdan hisoblangani esa har doim rost. Va hammasi bajarilgach —
**o'zi yo'qolsin**.

CleanWay'da: filial bormi, katalogda xizmat bormi (kategoriya yetarli emas —
ichida xizmat bo'lishi kerak), egadan boshqa xodim bormi, birinchi buyurtma
bormi.

---

## Sifat mezoni

Qo'llanma tayyor deb hisoblanadi, agar:

- [ ] Har bir da'vo kodda tekshirilgan (tekshiruvchi tasdiqlagan)
- [ ] Beshta tuzoq turining har biri ko'rib chiqilgan
- [ ] Har bir rol o'ziga tegishli bo'limni ko'radi, ortiqchasini emas
- [ ] "Buzilganga o'xshaydi" holatlari savol-javobda bor
- [ ] Buzadigan amallar ogohlantirish bilan ajratilgan
- [ ] Matn ishlab chiquvchi tilida emas, foydalanuvchi tilida
- [ ] Kod o'zgarishlari typecheck va testdan o'tgan
- [ ] Sahifalar haqiqatan ochilishi tekshirilgan

---

## Anti-patternlar

**Ilovani ishlatib yozish.** Tuzoqlarning hech biri topilmaydi.

**Har bir tugmani tavsiflash.** "Saqlash tugmasi ma'lumotni saqlaydi" — bu
joyni to'ldiradi, bilim bermaydi. Vazifalar bo'yicha yozing, elementlar
bo'yicha emas.

**Barcha rollarga bir xil matn.** Kuryerga hisobot bo'limi haqida o'qitish —
uni chalkashtirish.

**Bo'lmagan narsani va'da qilish.** Agar imkoniyat hali qurilmagan bo'lsa —
yo yozmang, yo "tez orada" deb belgilang. Yolg'on va'da ishonchni yo'qotadi.

**Tekshiruvsiz nashr qilish.** Xarita ishonchli tuyuladi — lekin unda xato
bo'ladi. Qarshi-tekshiruv arzon, noto'g'ri qo'llanma qimmat.

---

## Tayyor promptlar

### Xaritalash uchun (har bir yo'nalishga alohida)

```
<YO'NALISH> ni <LOYIHA YO'LI> da to'liq o'rgan.

Quyidagilarni aniqla:
- Bu qism nima uchun kerak (oddiy tilda)
- Muhim fayllar va nega muhim
- Foydalanuvchi qila oladigan aniq amallar, qadam-baqadam
- Har bir amal qaysi rol uchun ochiq
- gotchas: yangi odamni chalkashtiradigan yoki xato qilishga olib
  keladigan noaniq narsalar

Haqiqiy fayllarni o'qi. Taxmin qilma. Maxfiy qiymatlarni chiqarma —
faqat o'zgaruvchi nomini yoz.
```

### Qarshi-tekshiruv uchun

```
Mana <LOYIHA> ning xaritasi: <XARITA>

Vazifang — rozi bo'lish emas, XATO topish. Haqiqiy kodni o'qib tekshir:
- kodda bor, xaritada yo'q imkoniyatlar
- toza mashinada ishlamaydigan o'rnatish qadamlari
- haqiqiy ruxsat tekshiruvlariga mos kelmaydigan rol da'volari
- oqim tavsifi haqiqiy holat o'tishlariga mos kelmasligi
- yangi odam birinchi soatda duch keladigan, qamrab olinmagan narsalar

Har bir topilma uchun to'g'ri faktni ayt.
```

### Tuzoq ovi uchun

```
<LOYIHA> da quyidagi besh turdagi tuzoqlarni izla:

1. Buzilganga o'xshaydi, aslida to'g'ri (bo'sh ekranlar, ko'rinish cheklovlari)
2. Xavfsizga o'xshaydi, aslida buzadi (o'chirish/bekor/qaytarish farqi)
3. Yangilanmaydigan asimmetriya (manba o'zgaradi, nusxa qolib ketadi)
4. Chalkashtiriladigan ikki raqam (hisobotdagi yaqin ko'rsatkichlar)
5. Boshi berk yo'l (tugma bor, amal ishlamaydi)

Har biri uchun: fayl, qator, nima bo'ladi, foydalanuvchi nima deb o'ylaydi.
```

---

## Qisqacha ketma-ketlik

```
Auditoriya va formatni so'ra
        ↓
Kodni parallel xaritala (yo'nalishlar bo'yicha, gotchas talab qil)
        ↓
Qarshi-tekshiruv — tasdiqlanmagan da'voni tashla
        ↓
Tuzoqlarni beshta tur bo'yicha ajrat
        ↓
Yuzalarni qur (ilova ichi / ulashiladigan / checklist)
        ↓
Typecheck, test, sahifalar ochilishini tekshir
        ↓
Topilgan mahsulot xatolarini alohida ayt
```

Oxirgi qadam muhim: bu jarayon deyarli har doim **haqiqiy xatolarni** ochadi.
Ularni qo'llanmada tushuntirib qo'yish emas, tuzatish kerak.
