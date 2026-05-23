# SystemAlaa Customer Display

Second-screen customer-facing display. Connect a second monitor to the
cashier PC (or a cheap mini-PC at the counter) and open this Vite app
fullscreen on it.

## Run

```bash
cd customer-display
npm install
npm run dev
# open http://localhost:5175 — drag to second monitor, F11 for fullscreen
```

## Build & deploy

```bash
npm run build
# dist/ can be served by any static host or opened directly via
# file:// from the same cashier machine.
```

## How it talks to the cashier app

It polls the local SystemAlaa REST server (default
`http://127.0.0.1:27817`) for the current open invoice every 1.5
seconds. When there's no active invoice, it shows a rotating
promotional screen.

Configure the endpoint and API key by setting globals before the
script tag in `index.html`:

```html
<script>
  window.API_BASE = "http://192.168.1.50:27817";  // remote cashier
  window.API_KEY  = "sa_xxxxxxxxxxxxxxxxx";        // from "مفاتيح API"
</script>
```
