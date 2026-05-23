# SystemAlaa Mobile (PWA)

كاشير محمول يعمل من أي موبايل أو تابلت. يتصل بـ REST API الموجود في
تطبيق الكاشير الرئيسي ويعمل كنقطة بيع متنقلة (مفيد لمندوبين البيع
الميدانيين أو في المعارض).

## التشغيل

```bash
cd mobile
npm install
npm run dev
# افتح http://<your-ip>:5176 من الموبايل على نفس الشبكة
```

## النشر كـ PWA

```bash
npm run build
# انشر dist/ على أي host (Vercel/Netlify/Cloudflare Pages)
# من الموبايل: Safari → Share → Add to Home Screen
#               Chrome → ⋮ → Install app
```

## الربط بالكاشير

1. شغّل REST API في تطبيق الكاشير من شاشة "REST API Server".
2. خد المفتاح من "مفاتيح API" (scope: read,write).
3. افتح التطبيق على الموبايل → الإعدادات → الصق الـ URL والمفتاح →
   احفظ.

## ما الذي يفعله

- لوحة تحكم سريعة (مبيعات اليوم/الشهر، الفواتير، المنتجات).
- شاشة بيع: بحث منتج، إضافة للسلة، حفظ فاتورة.
- قائمة المنتجات والعملاء.
- يعمل كـ PWA (يثبت كأنه تطبيق native، يفتح بدون شريط المتصفح).

## بناء native تطبيق

لو محتاج تطبيق native فعلي:
- Capacitor: `npx cap init && npx cap add android` يحوّله لـ APK.
- Tauri Mobile: `cargo tauri android init` يحوّله لـ Tauri.
