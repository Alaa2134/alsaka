# SystemAlaa Storefront

Public, customer-facing e-commerce SPA. Each tenant (shop owner) gets a
`/<slug>` route. The renderer reads its tenant data from one of three
sources at runtime:

1. **Static JSON** — `/public/data/<slug>.json`, exported by the desktop
   app's "Store Management → تصدير" button. Drop the file into the
   storefront's `public/data/` directory and deploy.
2. **REST API** — set `VITE_API_BASE=https://your-backend` at build time
   to fetch `GET /store/<slug>` from a server that proxies the desktop's
   data. Order placement POSTs to `${VITE_API_BASE}/orders`.
3. **Embedded** — when previewing inside Electron, the host injects the
   feed as `window.__STORE_FEED__`.

## Local development

```bash
cd store
npm install
npm run dev
# open http://localhost:5174/demo
```

The bundled `demo.json` lets you exercise the full UX (catalog, search,
cart, checkout flow, confirmation screen, order tracking) without any
backend.

## Build & deploy

```bash
npm run build
# upload the resulting dist/ to Vercel, Netlify, Cloudflare Pages,
# or any static host. SPA fallback to /index.html required.
```

## Theming

The brand colour for each tenant comes from
`store_settings.primary_color` (HSL, e.g. `221 83% 53%`). The
storefront writes that value into `--primary` on `<html>` at runtime so
*every* Tailwind utility that uses the primary token re-skins
automatically — no rebuild required.

## Integration surface

### Order placement
`POST ${VITE_API_BASE}/orders` with:
```json
{
  "slug": "demo",
  "customer": { "name": "...", "phone": "201XXXXXXXXX", "email": "..." },
  "address": { "governorate": "...", "city": "...", "area": "...", "street": "...", "building": "...", "notes": "..." },
  "carrierId": "shp-1",
  "gatewayId": "gw-1",
  "couponCode": "WELCOME10",
  "items": [{ "product_id": "demo-1", "quantity": 2 }],
  "notes": ""
}
```
Returns `{ ok: true, order_number, redirect_url? }`. If `redirect_url`
is present, the SPA navigates the browser to it (used for hosted payment
checkouts like Paymob/Stripe). Otherwise it lands on the confirmation
screen.

### Coupon validation
`GET ${VITE_API_BASE}/store/<slug>/coupons/<code>?subtotal=N`
returns `{ ok, discount?, free_shipping?, error? }`.

### Order tracking
`GET ${VITE_API_BASE}/store/<slug>/track?order=N&phone=...`
returns `{ order_number, status, history: [{status, note, changed_at}] }`.

The desktop app implements all three over IPC (`window.electronAPI.store.*`)
— hooking them up to your cloud backend is a small Express/Cloudflare
Worker wrapper around the same SQLite (or a sync table in Supabase).

## What's wired in already

- Hero with brand colour + logo + tagline
- Featured + fresh product grids on the home page
- Full product catalog with search, category filter, sort
- Product detail with image gallery and stock-aware quantity selector
- Persistent cart in localStorage with quantity controls
- Multi-step checkout (customer · address · shipping · payment · coupon)
- Floating WhatsApp FAB for direct customer support
- Order tracking page
- Confirmation page with order number
- Mobile-responsive header with slide-in nav and search
- Footer with policies, social links, working hours
- Demo dataset so the entire flow works offline
