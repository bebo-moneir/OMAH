# نشر المشروع على Cloudflare — Deploying to Cloudflare

## أول مرة بس (One-time setup)

```bash
npm install
npx wrangler login
```

هيفتح المتصفح، سجّل دخول بحساب Cloudflare بتاعك.
(This opens your browser — log in with your Cloudflare account.)

بعد أول build (اعمل `npm run build` مرة واحدة الأول عشان يتولد `.output/server/wrangler.json`)، ظبط الـ 3 secrets:

```bash
npm run build
npm run secrets:setup
```

هيسألك تلصق قيمة كل واحد من دول (من ملف `.env` بتاعك، ما عدا الأخير من Lovable Cloud → Backend → API Keys):

1. `SUPABASE_URL` → من `.env`
2. `SUPABASE_PUBLISHABLE_KEY` → من `.env`
3. `SUPABASE_SERVICE_ROLE_KEY` → **مش موجود في `.env`**، جيبه من Lovable → إعدادات المشروع → Backend/Cloud → Supabase → API Keys

## كل مرة بعد كده (Every time you want to redeploy)

```bash
npm run deploy
```

الأمر ده بيعمل build وبعدين deploy على Cloudflare Workers في خطوة واحدة، وبيستخدم دايمًا الـ config الصح تلقائي (مفيش مشكلة "Could not detect a directory" تاني).

## ملاحظة

قاعدة البيانات لسه شغالة على Lovable Cloud (الرابط في `.env` بينتهي بـ `.lovable.cloud`). الفرونت إند بس اللي هيبقى مستقل تمامًا على Cloudflare من غير أي علامة لوفابل.
