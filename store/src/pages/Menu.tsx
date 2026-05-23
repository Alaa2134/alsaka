import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Plus, Minus, ShoppingCart, X, Send, Phone, Sparkles } from "lucide-react";

// Mobile-first menu page for restaurants. The customer scans the table
// QR, lands here, browses by section, taps to add to cart, then sends
// the order. The order POSTs to the configured API base (same surface
// the storefront uses) with table_id and order_type="dine_in".

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
}

interface MenuFeed {
  store: {
    slug: string;
    name: string;
    tagline: string | null;
    logo_url: string | null;
    currency_symbol: string;
    whatsapp_phone: string | null;
    hero_image_url: string | null;
    accent_color: string;
    welcome_message: string;
    show_prices: boolean;
    show_descriptions: boolean;
  };
  sections: Array<{ name: string; items: MenuItem[] }>;
}

const API_BASE = import.meta.env.VITE_API_BASE || "";

function money(n: number, symbol: string) {
  return `${Number(n || 0).toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
}

function fetchFeed(slug: string): Promise<MenuFeed | null> {
  // Three lookup paths so the same SPA works inline (Electron preview),
  // statically (after `qrmenu:feed` is exported), or against a hosted API.
  if ((globalThis as any).__MENU_FEED__) return Promise.resolve((globalThis as any).__MENU_FEED__);
  if (API_BASE) {
    return fetch(`${API_BASE}/menu/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return fetch(`/data/menu-${slug}.json`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
}

export function MenuPage() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const tableId = params.get("table");

  const [feed, setFeed] = useState<MenuFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, { item: MenuItem; qty: number }>>({});
  const [showCart, setShowCart] = useState(false);
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetchFeed(slug).then((f) => {
      setFeed(f);
      if (f?.store.accent_color) {
        document.documentElement.style.setProperty("--primary", f.store.accent_color);
      }
      if (f?.store.name) document.title = `قائمة الطعام · ${f.store.name}`;
    }).finally(() => setLoading(false));
  }, [slug]);

  const add = (item: MenuItem) => setCart((c) => ({
    ...c,
    [item.id]: { item, qty: (c[item.id]?.qty || 0) + 1 },
  }));
  const sub = (item: MenuItem) => setCart((c) => {
    const cur = c[item.id]?.qty || 0;
    if (cur <= 1) {
      const { [item.id]: _, ...rest } = c;
      return rest;
    }
    return { ...c, [item.id]: { item, qty: cur - 1 } };
  });

  const total = useMemo(
    () => Object.values(cart).reduce((s, x) => s + x.item.price * x.qty, 0),
    [cart],
  );
  const count = useMemo(() => Object.values(cart).reduce((s, x) => s + x.qty, 0), [cart]);

  const placeOrder = async () => {
    if (!feed || count === 0) return;
    if (!customer.name.trim() || !customer.phone.trim()) {
      alert("ادخل اسمك ورقم تليفونك");
      return;
    }
    setBusy(true);
    try {
      const items = Object.values(cart).map((c) => ({
        product_id: c.item.id,
        quantity: c.qty,
      }));
      const payload = {
        slug: feed.store.slug,
        customer: { name: customer.name.trim(), phone: customer.phone.trim() },
        items,
        notes: tableId ? `طلب من طاولة ${tableId}` : "Takeaway",
        table_id: tableId,
      };
      if (API_BASE) {
        const r = await fetch(`${API_BASE}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await r.json();
        if (data.ok && data.order_number) setPlaced(String(data.order_number));
      } else {
        // Demo / offline mode
        setPlaced(String(Math.floor(1000 + Math.random() * 8999)));
      }
      setCart({});
      setShowCart(false);
    } catch (err) {
      alert("تعذر إرسال الطلب — تواصل مع الكاشير");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">جاري التحميل...</div>;
  }
  if (!feed) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">المينيو غير متاح حاليًا.</div>;
  }
  if (placed) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center" style={{ background: `hsl(${feed.store.accent_color} / 0.06)` }}>
        <div className="max-w-md">
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-3xl font-bold mb-2">تم استلام طلبك</h1>
          <p className="text-muted-foreground mb-4">رقم الطلب: <span className="font-bold">#{placed}</span></p>
          <p className="text-muted-foreground">
            {tableId ? `هيتم تجهيز طلبك وإرساله للطاولة ${tableId}.` : "هتستلم تنبيه عند الانتهاء."}
          </p>
          <button onClick={() => setPlaced(null)} className="mt-6 btn-primary">طلب جديد</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 bg-background">
      {/* Hero */}
      <header
        className="relative text-primary-foreground p-6 pb-12"
        style={{
          backgroundImage: feed.store.hero_image_url
            ? `linear-gradient(135deg, hsl(${feed.store.accent_color} / 0.85), hsl(${feed.store.accent_color} / 0.6)), url(${feed.store.hero_image_url})`
            : `linear-gradient(135deg, hsl(${feed.store.accent_color}), hsl(${feed.store.accent_color}))`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-2xl mx-auto text-center">
          {feed.store.logo_url ? (
            <img src={feed.store.logo_url} alt={feed.store.name} className="h-16 w-16 rounded-full mx-auto mb-3 object-cover bg-white p-1" />
          ) : null}
          <h1 className="text-3xl font-bold">{feed.store.name}</h1>
          {tableId && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-sm">
              <Sparkles className="h-3 w-3" /> طاولة {tableId}
            </div>
          )}
          {feed.store.welcome_message && (
            <p className="text-sm mt-3 opacity-90">{feed.store.welcome_message}</p>
          )}
        </div>
      </header>

      {/* Sections */}
      <main className="max-w-2xl mx-auto px-4 -mt-6 space-y-6">
        {feed.sections.map((sec) => (
          <section key={sec.name} className="bg-card rounded-2xl shadow-card overflow-hidden">
            <h2 className="font-bold text-lg p-4 border-b border-border" style={{ color: `hsl(${feed.store.accent_color})` }}>
              {sec.name}
            </h2>
            <div className="divide-y divide-border">
              {sec.items.map((item) => {
                const qty = cart[item.id]?.qty || 0;
                return (
                  <div key={item.id} className="p-4 flex gap-3 items-center">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name} className="h-20 w-20 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold">{item.name}</div>
                      {feed.store.show_descriptions && item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
                      )}
                      {feed.store.show_prices && (
                        <div className="mt-1 font-bold tabular-nums" style={{ color: `hsl(${feed.store.accent_color})` }}>
                          {money(item.price, feed.store.currency_symbol)}
                        </div>
                      )}
                    </div>
                    {item.available ? (
                      qty === 0 ? (
                        <button
                          onClick={() => add(item)}
                          className="h-10 px-4 rounded-full text-white font-semibold text-sm shadow-soft"
                          style={{ background: `hsl(${feed.store.accent_color})` }}
                        >
                          أضف
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          <button onClick={() => sub(item)} className="h-9 w-9 rounded-full bg-muted">
                            <Minus className="h-4 w-4 mx-auto" />
                          </button>
                          <span className="w-6 text-center font-bold tabular-nums">{qty}</span>
                          <button onClick={() => add(item)} className="h-9 w-9 rounded-full text-white" style={{ background: `hsl(${feed.store.accent_color})` }}>
                            <Plus className="h-4 w-4 mx-auto" />
                          </button>
                        </div>
                      )
                    ) : (
                      <span className="text-xs text-destructive">غير متاح</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {feed.sections.length === 0 && (
          <p className="text-center text-muted-foreground py-12">المينيو فاضي حاليًا.</p>
        )}
      </main>

      {/* Floating cart bar */}
      {count > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-4 inset-x-4 max-w-2xl mx-auto h-14 rounded-full text-white font-bold shadow-card flex items-center justify-between px-6"
          style={{ background: `hsl(${feed.store.accent_color})` }}
        >
          <span className="inline-flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {count} صنف
          </span>
          <span className="tabular-nums">{money(total, feed.store.currency_symbol)}</span>
        </button>
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowCart(false)}>
          <div
            className="absolute bottom-0 inset-x-0 bg-card rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">طلبك ({count})</h3>
              <button onClick={() => setShowCart(false)} className="p-2 rounded-full hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 mb-3">
              {Object.values(cart).map(({ item, qty }) => (
                <div key={item.id} className="flex items-center gap-2 bg-muted/40 rounded-lg p-2">
                  <div className="flex-1 min-w-0 text-sm">{item.name}</div>
                  <button onClick={() => sub(item)} className="h-7 w-7 rounded bg-card"><Minus className="h-3 w-3 mx-auto" /></button>
                  <span className="w-6 text-center text-sm tabular-nums">{qty}</span>
                  <button onClick={() => add(item)} className="h-7 w-7 rounded bg-card"><Plus className="h-3 w-3 mx-auto" /></button>
                  <span className="w-16 text-left text-sm font-bold tabular-nums">{money(item.price * qty, feed.store.currency_symbol)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <input
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                placeholder="اسمك"
                className="input-field"
              />
              <input
                dir="ltr"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                placeholder="رقم تليفونك"
                className="input-field"
                inputMode="tel"
              />
            </div>

            <div className="border-t border-border mt-3 pt-3 flex items-center justify-between mb-3">
              <span>الإجمالي</span>
              <span className="text-xl font-bold tabular-nums">{money(total, feed.store.currency_symbol)}</span>
            </div>

            <button
              onClick={placeOrder}
              disabled={busy}
              className="w-full h-12 rounded-full text-white font-bold disabled:opacity-50"
              style={{ background: `hsl(${feed.store.accent_color})` }}
            >
              {busy ? "جاري الإرسال..." : tableId ? `إرسال الطلب للطاولة ${tableId}` : "إرسال الطلب"}
            </button>

            {feed.store.whatsapp_phone && (
              <a
                href={`https://wa.me/${feed.store.whatsapp_phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 w-full h-11 rounded-full border border-border flex items-center justify-center gap-2 text-sm"
              >
                <Phone className="h-4 w-4 text-[#25d366]" /> تواصل عبر واتساب
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
