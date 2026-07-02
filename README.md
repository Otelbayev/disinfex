# DisinfeX — dezinfeksiya kompaniyasi sayti

Toshkentdagi dezinfeksiya / dezinseksiya / deratizatsiya kompaniyasi (tarakan, kandala-klop, chumoli, kemiruvchilar...) uchun **bir sahifali** sotuv sayti.

- 🎨 **Light-mode** brand dizayni (brandbook ranglari: `#0d93ec` · `#0c2233` · `#23cfc4`)
- 🖼️ Brand logolar, mark va ikonkalar `disinfex-assets` dan ishlatilgan; hero bg rasm
- 📱 Mobile-first, animatsiyali va zamonaviy
- 🌐 Ikki til: **RU (default)** va **UZ** — bir bosishda almashadi
- ☎️ Barcha formalarda telefon **`+998 (XX) XXX XX XX`** formatida (yozilganda avtomatik maska + regex tekshiruv)
- 🛡️ **1 yil kafolat**
- 📝 3 ta forma (hero, narx hisoblash, usta chaqirish)
- 🤖 Barcha formalar **Telegram bot**ga yuboriladi
- 🔐 Bot token va chat ID `.env` da saqlanadi (brauzerga chiqmaydi)
- ⚡ Zero-dependency — `npm install` shart emas, tez ochiladi

## Folder structure

```
disinfex/
├── server.js              # statik server + Telegram proxy (Node 18+, kutubxonasiz)
├── package.json
├── .env.example           # token/chat_id namunasi
├── brandbook.pdf          # brand qo‘llanma (manba)
├── disinfex-assets/       # original brand fayllar (manba, tegilmaydi)
└── public/                # deploy qilinadigan statik sayt
    ├── index.html
    └── assets/
        ├── css/styles.css
        ├── js/app.js
        └── img/
            ├── hero-bg.svg
            ├── favicon.png · mark-color.png · mark-white.png
            ├── logo/       # logotiplar (color · white · navy · on-blue · stacked)
            └── icons/      # xizmat tile’lari + feature ikonkalari
```

Original `disinfex-assets/` manba sifatida saqlanadi; saytda ishlatiladigan optimallashtirilgan nusxalar `public/assets/img/` ga ko‘chirilgan.

### Telefon formati / maska

Barcha telefon inputlari `data-phone` bilan belgilangan. `app.js` yozilayotganda avtomatik `+998 (XX) XXX XX XX` ko‘rinishiga keltiradi va yuborishdan oldin regex bilan tekshiradi:

```js
/^\+998 \(\d{2}\) \d{3} \d{2} \d{2}$/
```

Server tomonda ham qayta tekshiriladi (`/^998\d{9}$/`).

## SEO

Sayt Toshkentda "дезинфекция / dezinfeksiya" bo‘yicha yuqori o‘rinlar uchun optimallashtirilgan:

- **Meta:** kalit so‘zlarga boy `title` + `description` + `keywords`, `canonical`, `robots`, geo-teglar (Tashkent koordinatalari)
- **Til alternativalari:** `hreflang` ru / uz / x-default (`?lang=uz` ham ishlaydi va sahifa avtomatik shu tilda ochiladi)
- **Ijtimoiy:** Open Graph + Twitter Card + tayyor `og-image.jpg` (1200×630)
- **Structured Data (JSON-LD):** `LocalBusiness`, `WebSite`, `FAQPage` (Google rich-snippet uchun) — reyting, ish vaqti 24/7, xizmatlar, manzil
- **FAQ bo‘limi:** kalit so‘zlarga boy real savol-javoblar (`#faq`)
- **`sitemap.xml`** (`/sitemap.xml`) va **`robots.txt`** (`/robots.txt`)
- **`site.webmanifest`** (PWA signallari)
- **Tezlik = SEO:** kritik rasm/logo `preload`, ekran ostidagi rasmlar `lazy`, statik assetlar uzoq cache

### Deploydan oldin almashtiring
`public/index.html`, `public/sitemap.xml`, `public/robots.txt` da `https://disinfex.uz` real domeningizga; telefon `+998900000000` va Telegram `t.me/disinfex_uz` — real ma’lumotlarga. Keyin **Google Search Console** va **Yandex Webmaster** ga `sitemap.xml` ni yuboring.

## Ishga tushirish

1. **Telegram bot yarating** — [@BotFather](https://t.me/BotFather) → `/newbot` → token oling.
2. **Chat ID** ni aniqlang — botga xabar yozing, keyin [@getidsbot](https://t.me/getidsbot) yoki [@userinfobot](https://t.me/userinfobot) dan ID oling. (Guruhga yuborish uchun botni guruhga qo'shing va guruh ID'sini ishlating.)
3. Sozlamalarni ko'chiring:

   ```bash
   cp .env.example .env
   # .env ichida TELEGRAM_BOT_TOKEN va TELEGRAM_CHAT_ID ni to'ldiring
   ```

4. Serverni ishga tushiring (Node.js 18+ kerak):

   ```bash
   npm start
   # yoki
   node server.js
   ```

5. Brauzerda oching: **http://localhost:3000**

## Nega backend kerak?

Telegram bot tokenini to'g'ridan-to'g'ri HTML/JS ichiga qo'yib bo'lmaydi — u brauzerda hammaga ochiq bo'lib qoladi va tokenni o'g'irlashadi. Shuning uchun kichik `server.js` proxy formalarni qabul qilib, tokenni faqat serverda ishlatib Telegramga yuboradi. Server kutubxonasiz (Node ning ichki `http` + `fetch`), shu bois tez.

## Xavfsizlik / anti-spam

- Har bir IP uchun daqiqasiga 8 ta so'rov limiti
- Telefon raqami server tomonda ham tekshiriladi
- Honeypot maydoni (`website`) botlarni to'sish uchun

## Deploy

Node ishlaydigan har qanday hostingga (VPS, Render, Railway, Fly.io...) qo'yiladi. `.env` o'zgaruvchilarini hosting panelidan bering. Statik `public/` papkani CDN orqasiga ham qo'yish mumkin, lekin `/api/lead` uchun `server.js` ishlab turishi kerak.
