# Horus System — Windows Setup

طرق التثبيت على ويندوز 10/11.

---

## الطريقة 1 (الأسرع): سطر واحد في PowerShell

افتح **PowerShell كـ Administrator** (يمين كليك على Start → "PowerShell (Administrator)" أو "Terminal (Administrator)") والصق:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; iex (irm https://raw.githubusercontent.com/Alaa2134/alsaka/claude/systemalaa-desktop-app-YK5q1/scripts/setup-windows.ps1)
```

هيعمل كل حاجة لوحده — يثبّت Git + Node + Visual Studio Build Tools، يحمّل المشروع، يثبّت التبعيات، ويفتح التطبيق.

أول مرة بتاخد ~20 دقيقة (بسبب VS Build Tools حجمها ~5GB).

---

## الطريقة 2: ملف batch بضغطة مرتين

نزّل [`install.bat`](https://raw.githubusercontent.com/Alaa2134/alsaka/claude/systemalaa-desktop-app-YK5q1/scripts/install.bat) واضغط عليه مرتين. هيطلب صلاحيات Admin ثم يشغّل نفس السكريبت.

---

## بعد التثبيت

- اختصار **Horus System** هيتعمل على سطح المكتب — دبل كليك لفتح التطبيق.
- تسجيل الدخول الأول:
  - **Email:** `admin@systemalaa.app`
  - **Password:** `admin` (هيطلب منك تغييرها)

---

## استكشاف الأخطاء

| المشكلة | الحل |
|---|---|
| `winget` not recognized | حدّث ويندوز، أو نزّل [App Installer](https://apps.microsoft.com/detail/9NBLGGH4NNS1) |
| `tsc not recognized` | معناها `npm install` فشل — شغّل السكريبت تاني، أو يدويًا: `cd C:\horus\desktop ; npm install` |
| `Could not find Visual Studio` | Build Tools فشل تثبيته — جرّب يدويًا من https://visualstudio.microsoft.com/visual-cpp-build-tools/ واختر "Desktop development with C++" |
| `npm install` يفشل في `better-sqlite3` | المسار فيه عربي — السكريبت بيحطه في `C:\horus` لتجنب دي |
| التطبيق ما اشتغلش بعد التثبيت | `cd C:\horus\desktop ; npm run dev:electron` |

---

## بناء installer `.exe` للتوزيع

بعد ما تشتغل التطبيق محليًا، تقدر تبني installer قابل للتوزيع:

```powershell
cd C:\horus\desktop
npm run dist:win
```

النتيجة في `C:\horus\desktop\release\Horus Setup *.exe`.
