# 𓁹 Horus System

منصة تجارة ومحاسبة ونقاط بيع عربية متكاملة — تخدم كل أنواع المحلات
والمطاعم والشركات. **monorepo فيه خمس تطبيقات** مترابطة من خلال REST
API واحد.

| المجلد | الوصف | Port للتطوير |
|---|---|---|
| **`desktop/`** | تطبيق الكاشير الرئيسي (Electron + SQLite). 60+ شاشة: فواتير، محاسبة كاملة، مخزون، موظفون، تقارير، مينيو QR، AI | `dev:electron` |
| **`store/`** | المتجر الإلكتروني العام (Vite SPA) — موقع لكل عميل + صفحة مينيو QR | `5174` |
| **`mobile/`** | كاشير محمول كـ PWA — يعمل من أي موبايل ويستخدم REST API | `5176` |
| **`customer-display/`** | شاشة العميل (شاشة ثانية تواجه الزبون عند الكاشير) | `5175` |
| **`owner-dashboard/`** | لوحة متابعة لصاحب المكان — مبيعات + فواتير + مرتبات من أي مكان | `5177` |

## بنية النظام

```
┌────────────────────────────┐
│   desktop/  (Electron)     │
│   • SQLite (مشفّر AES-256) │
│   • whatsapp-web.js        │
│   • Google Drive backup    │
│   • Anthropic AI           │
│   • REST API :27817        │ ◄────┐
└──────────┬─────────────────┘      │
           │                        │ HTTP + Bearer key
           ▼                        │
       SQLite                       │
                              ┌─────┴────┬──────────────┬───────────────┐
                              ▼          ▼              ▼               ▼
                          store/    mobile/    owner-dashboard/   customer-display/
                        (المتجر)   (كاشير      (المالك من           (شاشة العميل
                                    محمول)      أي مكان)             الجانبية)
```

## التشغيل السريع — كل التطبيقات

```bash
# 1) الكاشير الرئيسي
cd desktop && npm install && npm run dev:electron

# 2) المتجر الإلكتروني (terminal جديد)
cd store && npm install && npm run dev          # http://localhost:5174/demo

# 3) موبايل الكاشير
cd mobile && npm install && npm run dev          # http://<your-ip>:5176

# 4) شاشة العميل (شاشة ثانية)
cd customer-display && npm install && npm run dev   # http://localhost:5175

# 5) موقع متابعة صاحب المكان
cd owner-dashboard && npm install && npm run dev    # http://localhost:5177
```

**تسجيل الدخول الأول للكاشير:** `admin@systemalaa.app` / `admin`
(باسورد مؤقت — يطلب منك تختار باسورد جديد عند أول دخول، والحساب يربط
بجهازك تلقائيًا).

## الميزات الكاملة

راجع **`desktop/README.md`** لقائمة كاملة بكل ميزة:
- 5 قوالب POS (Classic / Touch Grid / Restaurant / Quick Service / Dual)
- محاسبة بالقيد المزدوج (شجرة حسابات عربية، ميزان مراجعة، قائمة دخل،
  ميزانية عمومية، أعمار الديون)
- مخزون متعدد المخازن + متغيرات منتج + جرد + PO/GRN
- متجر إلكتروني لكل عميل + مينيو QR للطاولات + KDS
- AI: مساعد ذكي + تحليل صور للمنتجات + توقع الطلب + كشف الشذوذ
- WhatsApp: تسجيل بـ QR + إرسال الفواتير تلقائيًا + offline queue
- نسخ احتياطي يومي على Google Drive (ملف واحد يتحدّث في مكانه)
- ترخيص جهاز واحد لكل كود + تشفير AES-256-GCM + scrypt + audit chain
- 8 قوالب صناعية جاهزة (تجزئة، سوبرماركت، مطعم، صيدلية، صالون، ...)
- REST API + Webhooks + Marketplace integrations (12 موفر)
- Voice POS (أوامر صوتية عربية) + i18n عربي/إنجليزي

## البناء للإنتاج

```bash
# Windows installer للكاشير
cd desktop && npm run dist:win
# → release/Horus System Setup x.y.z.exe

# Vercel/Netlify deploys للمواقع
cd store && npm run build && vercel
cd mobile && npm run build && vercel
cd owner-dashboard && npm run build && vercel
cd customer-display && npm run build
# انسخ dist/ على شاشة العميل (file:// أو static host)
```

## الفرع النشط

```bash
git checkout claude/systemalaa-desktop-app-YK5q1
```

## PR

https://github.com/Alaa2134/alsaka/pull/1
