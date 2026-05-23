import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Customer-facing display. Designed for a secondary monitor that faces
// the customer at checkout. Reads from a configurable API endpoint
// (defaults to the local SystemAlaa REST server on 127.0.0.1:27817).
//
// Polls the latest open invoice for THIS cashier (`?cashier=<id>`)
// every 1.5s and shows:
//   - current line items as they're being added
//   - running totals
//   - rotating promotional banners between transactions

interface Item {
  product_name: string;
  quantity: number;
  price: number;
  total: number;
}

interface InvoiceState {
  items: Item[];
  subtotal: number;
  discount: number;
  total: number;
}

const API_BASE = (window as any).API_BASE || "http://127.0.0.1:27817";
const API_KEY = (window as any).API_KEY || "";
const PROMOTIONS = [
  { title: "خصومات نهاية الموسم", body: "احصل على خصم 30% على المنتجات المختارة" },
  { title: "اشترك في برنامج النقاط", body: "اكسب نقاط مع كل عملية شراء، استبدلها بأي وقت" },
  { title: "توصيل مجاني", body: "للطلبات فوق 500 ج.م داخل المدينة" },
];

function money(n: number) {
  return Number(n).toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function App() {
  const [state, setState] = useState<InvoiceState | null>(null);
  const [promo, setPromo] = useState(0);

  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch(`${API_BASE}/v1/invoices?status=open`, {
          headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {},
        });
        if (!r.ok) return;
        const json = await r.json();
        const latest = (json.data || [])[0];
        if (latest && latest.items) {
          setState({
            items: latest.items,
            subtotal: latest.total || 0,
            discount: latest.discount || 0,
            total: latest.total - (latest.discount || 0),
          });
        }
      } catch { /* offline — keep showing last state or promos */ }
    };
    poll();
    const t = setInterval(poll, 1500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setPromo((p) => (p + 1) % PROMOTIONS.length), 6000);
    return () => clearInterval(t);
  }, []);

  // If no active invoice, show a rotating promo screen.
  if (!state || state.items.length === 0) {
    return (
      <div className="h-full grid place-items-center bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 p-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={promo}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl"
          >
            <h1 className="text-7xl font-bold mb-6 drop-shadow-lg">{PROMOTIONS[promo].title}</h1>
            <p className="text-3xl opacity-90">{PROMOTIONS[promo].body}</p>
            <div className="mt-12 text-xl opacity-70">مرحبًا بك — السعادة بخدمتك</div>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <header className="bg-gradient-to-r from-blue-600 to-purple-700 p-6 text-center">
        <h1 className="text-4xl font-bold">عملية الشراء</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="space-y-3">
          <AnimatePresence>
            {state.items.map((it, i) => (
              <motion.div
                key={`${it.product_name}-${i}`}
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold">
                    {it.quantity}
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{it.product_name}</div>
                    <div className="text-slate-400 tabular-nums">سعر القطعة: {money(it.price)} ج.م</div>
                  </div>
                </div>
                <div className="text-3xl font-bold tabular-nums">{money(it.total)}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </main>

      <footer className="bg-slate-800 p-8 border-t border-slate-700">
        <div className="grid grid-cols-3 gap-6 mb-4">
          <Tile label="الإجمالي" value={money(state.subtotal)} />
          <Tile label="الخصم" value={money(state.discount)} color="text-amber-400" />
          <Tile label="المبلغ المستحق" value={money(state.total)} color="text-green-400" big />
        </div>
        <p className="text-center text-slate-400 text-lg mt-4">شكرًا لتسوقك معنا 💚</p>
      </footer>
    </div>
  );
}

function Tile({ label, value, color, big }: { label: string; value: string; color?: string; big?: boolean }) {
  return (
    <div className="text-center">
      <div className="text-slate-400 text-xl">{label}</div>
      <div className={`${big ? "text-6xl" : "text-4xl"} font-bold tabular-nums ${color || "text-white"}`}>
        {value}
      </div>
    </div>
  );
}
