# Horus Customer App

PWA-installable customer-facing app for Horus System. Features:

- Phone-OTP login (tied to a customer record in the merchant's tenant)
- Per-merchant catalog browse + order placement (`/v1/store/:slug`)
- QR-pay flow (`/v1/customer/scan-pay` — cashier-generated QR triggers
  a customer-side payment confirmation)
- Loyalty points balance + history (`/v1/customer/loyalty`)
- Order history (`/v1/customer/orders`)

## Develop

```bash
npm install
npm run dev    # http://localhost:5180
```

## Capacitor (Android / iOS)

```bash
npm install -D @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init horus-customer com.horus.customer --web-dir=dist
npm run build
npx cap add android && npx cap add ios
npx cap sync
```

Output: `android/app/build/outputs/apk/release/*.apk`
