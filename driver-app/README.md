# Horus Driver App

Mobile-first PWA for delivery drivers. Features:

- Phone-OTP login bound to an `employees` row in the merchant's tenant
- Live delivery queue from `/v1/deliveries?mine=1`
- Status flow: queued → picked → in_transit → delivered
- Photo proof of delivery (camera capture, uploaded to Google Drive via
  the desktop's `gdrive.cjs` integration)
- End-of-shift cash reconciliation
- Click-to-call customer

## Develop

```bash
npm install
npm run dev    # http://localhost:5181
```

The desktop app exposes the matching REST endpoints under `/v1/driver/*`
and `/v1/deliveries`. Wire them in `desktop/electron/api-server.cjs` if
not already done.
