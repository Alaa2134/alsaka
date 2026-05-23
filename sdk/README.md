# @horus/sdk

Official TypeScript SDK for the Horus System REST API.

Works in Node 18+, the browser, and React Native. Zero runtime
dependencies — uses the global `fetch`.

## Install

```bash
npm install @horus/sdk
```

## Usage

```ts
import { HorusClient } from "@horus/sdk";

const horus = new HorusClient({
  baseUrl: "http://192.168.1.10:6420",
  apiKey: "hk_live_...",
});

const products = await horus.products.list();
const stats = await horus.dashboard();
const order = await horus.store.placeOrder({
  slug: "my-store",
  client_name: "Ahmed",
  client_phone: "01000000000",
  items: [{ product_id: "abc", quantity: 2 }],
});
```

## OpenAPI

The full machine-readable spec lives at [`openapi.yaml`](./openapi.yaml).
Render with any Swagger UI:

```bash
npx @redocly/cli preview-docs openapi.yaml
```

## API endpoints

Authenticated (Bearer):
- `products.list()`
- `clients.list()`
- `invoices.list() / .create({ invoice, items })`
- `dashboard()`
- `analytics.sales(days) / .topProducts() / .arAging()`

Public:
- `health()`
- `store.feed(slug)`
- `store.placeOrder(payload)`

## License

MIT
