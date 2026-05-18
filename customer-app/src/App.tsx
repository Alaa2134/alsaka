import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import {
  Home as HomeIcon,
  ShoppingBag,
  ScanLine,
  Award,
  Settings as SettingsIcon,
  Sparkles,
  Store,
  Plus,
  Minus,
  Trash2,
} from "lucide-react";
import { api, getBase, setBase, getStore, setStore, getPhone, setPhone, getToken, setToken, clearSession, type StoreFeed } from "./lib/api";

function money(n: number) {
  return Number(n || 0).toLocaleString("en-EG", { minimumFractionDigits: 2 });
}

function TabBar() {
  const loc = useLocation();
  const tabs = [
    { to: "/", label: "الرئيسية", icon: HomeIcon },
    { to: "/shop", label: "تسوق", icon: ShoppingBag },
    { to: "/pay", label: "ادفع", icon: ScanLine },
    { to: "/loyalty", label: "نقاطي", icon: Award },
    { to: "/settings", label: "الإعدادات", icon: SettingsIcon },
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 z-50">
      <div className="flex justify-around py-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((t) => {
          const I = t.icon;
          const on = loc.pathname === t.to;
          return (
            <Link key={t.to} to={t.to} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[11px] ${on ? "text-violet-400" : "text-slate-400"}`}>
              <I className="h-5 w-5" />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Home() {
  const phone = getPhone();
  return (
    <div className="p-5 space-y-4">
      <div className="rounded-2xl p-5 bg-gradient-to-br from-violet-500 to-fuchsia-600">
        <div className="text-white/90 text-sm">أهلًا بك في</div>
        <div className="text-3xl font-bold text-white">Horus</div>
        <div className="text-white/80 text-sm mt-2">منصة ولاء + توصيل + دفع QR لمتاجرك المفضلة</div>
      </div>
      {!phone ? (
        <Link to="/settings" className="block rounded-xl bg-amber-500/20 border border-amber-500/40 p-3 text-amber-200 text-sm">
          سجّل دخول برقم جوّالك لاستعراض النقاط والطلبات.
        </Link>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/shop" className="rounded-2xl bg-slate-800 p-4 hover:bg-slate-700">
          <Store className="h-6 w-6 text-violet-400 mb-2" />
          <div className="font-semibold">المتجر</div>
          <div className="text-xs text-slate-400">اطلب توصيل</div>
        </Link>
        <Link to="/pay" className="rounded-2xl bg-slate-800 p-4 hover:bg-slate-700">
          <ScanLine className="h-6 w-6 text-violet-400 mb-2" />
          <div className="font-semibold">دفع QR</div>
          <div className="text-xs text-slate-400">في الكاشير</div>
        </Link>
        <Link to="/loyalty" className="rounded-2xl bg-slate-800 p-4 hover:bg-slate-700">
          <Award className="h-6 w-6 text-violet-400 mb-2" />
          <div className="font-semibold">نقاطي</div>
          <div className="text-xs text-slate-400">جمّع واصرف</div>
        </Link>
        <Link to="/orders" className="rounded-2xl bg-slate-800 p-4 hover:bg-slate-700">
          <Sparkles className="h-6 w-6 text-violet-400 mb-2" />
          <div className="font-semibold">طلباتي</div>
          <div className="text-xs text-slate-400">تتبع الحالة</div>
        </Link>
      </div>
    </div>
  );
}

function Shop() {
  const slug = getStore();
  const [feed, setFeed] = useState<StoreFeed | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!slug) { setErr("اختَر المتجر من شاشة الإعدادات أولًا."); return; }
    api.storeFeed(slug).then(setFeed).catch((e) => setErr(String(e.message || e)));
  }, [slug]);

  const total = feed?.products.reduce((s, p) => s + (cart[p.id] || 0) * p.price, 0) || 0;

  const order = async () => {
    if (!feed) return;
    const phone = getPhone();
    if (!phone) { toast.error("سجّل دخول برقم جوّالك أولًا"); return; }
    const items = Object.entries(cart).filter(([, q]) => q > 0).map(([id, q]) => ({ product_id: id, quantity: q }));
    if (items.length === 0) return;
    setBusy(true);
    try {
      const r = await api.placeOrder({ slug, client_name: phone, client_phone: phone, items });
      toast.success(`تم إرسال الطلب #${r.order_number}`);
      setCart({});
      navigate("/orders");
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  if (err) return <div className="p-6 text-rose-300">{err}</div>;
  if (!feed) return <div className="p-6 text-slate-400">جاري التحميل...</div>;

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-2xl font-bold">{feed.name}</h2>
      <div className="space-y-2">
        {feed.products.map((p) => (
          <div key={p.id} className="rounded-xl bg-slate-800 p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-violet-400 tabular-nums">{money(p.price)}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCart((c) => ({ ...c, [p.id]: Math.max(0, (c[p.id] || 0) - 1) }))} className="h-8 w-8 rounded bg-slate-700"><Minus className="h-3 w-3 m-auto" /></button>
              <span className="w-6 text-center tabular-nums">{cart[p.id] || 0}</span>
              <button onClick={() => setCart((c) => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }))} className="h-8 w-8 rounded bg-violet-600"><Plus className="h-3 w-3 m-auto" /></button>
            </div>
          </div>
        ))}
      </div>
      {total > 0 && (
        <div className="fixed bottom-20 inset-x-4 z-40 rounded-2xl bg-violet-600 p-4 shadow-2xl flex justify-between items-center">
          <div>
            <div className="text-xs text-white/80">الإجمالي</div>
            <div className="text-2xl font-bold tabular-nums">{money(total)}</div>
          </div>
          <button onClick={order} disabled={busy} className="h-11 px-6 rounded-xl bg-white text-violet-700 font-semibold disabled:opacity-50">اطلب</button>
        </div>
      )}
    </div>
  );
}

function Pay() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const scan = async () => {
    setBusy(true);
    try {
      const data = JSON.parse(text);
      await api.scanPay(data);
      toast.success("تم الدفع — شكرًا لك");
      setText("");
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally { setBusy(false); }
  };
  return (
    <div className="p-5 space-y-4">
      <h2 className="text-2xl font-bold">دفع QR</h2>
      <div className="rounded-2xl bg-slate-800 p-4">
        <p className="text-sm text-slate-400 mb-3">امسح كود QR من شاشة الكاشير، أو الصق محتواه يدويًا:</p>
        <textarea
          rows={5}
          dir="ltr"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='{"tenantId":"…","amount":120,"ref":"…"}'
          className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs font-mono"
        />
        <button onClick={scan} disabled={busy || !text} className="mt-3 w-full h-11 rounded-lg bg-violet-600 font-semibold disabled:opacity-50">
          إتمام الدفع
        </button>
      </div>
    </div>
  );
}

function Loyalty() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!getToken()) { setErr("سجّل دخول أولًا"); return; }
    api.myLoyalty().then(setData).catch((e) => setErr(String(e.message || e)));
  }, []);
  if (err) return <div className="p-6 text-amber-300">{err}</div>;
  if (!data) return <div className="p-6 text-slate-400">جاري التحميل...</div>;
  return (
    <div className="p-5 space-y-4">
      <div className="rounded-2xl p-6 bg-gradient-to-br from-amber-400 to-rose-500">
        <div className="text-white/90">نقاطك</div>
        <div className="text-5xl font-bold text-white tabular-nums">{data.points || 0}</div>
        <div className="text-white/80 mt-1">المستوى: {data.tier || "—"}</div>
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold">آخر العمليات</h3>
        {(data.history || []).map((h: any, i: number) => (
          <div key={i} className="rounded-xl bg-slate-800 p-3 flex justify-between text-sm">
            <span>{h.note || h.action}</span>
            <span className="tabular-nums text-violet-300">{h.delta > 0 ? "+" : ""}{h.delta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Orders() {
  const [list, setList] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!getToken()) { setErr("سجّل دخول أولًا"); return; }
    api.myOrders().then((r) => setList(r.data || [])).catch((e) => setErr(String(e.message || e)));
  }, []);
  if (err) return <div className="p-6 text-amber-300">{err}</div>;
  return (
    <div className="p-5 space-y-2">
      <h2 className="text-2xl font-bold mb-3">طلباتي</h2>
      {list.length === 0 ? <p className="text-slate-400">لا توجد طلبات بعد.</p> : list.map((o) => (
        <div key={o.id} className="rounded-xl bg-slate-800 p-3 flex justify-between">
          <div>
            <div className="font-medium">#{o.order_number || o.id.slice(0, 6)}</div>
            <div className="text-xs text-slate-400">{o.created_at}</div>
          </div>
          <div className="text-left">
            <div className="font-bold tabular-nums">{money(o.total)}</div>
            <div className="text-xs text-violet-400">{o.status}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Settings() {
  const [base, setLocalBase] = useState(getBase());
  const [slug, setLocalSlug] = useState(getStore());
  const [phone, setLocalPhone] = useState(getPhone());
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"idle" | "sent">("idle");

  const requestOtp = async () => {
    try {
      await api.requestOtp(phone);
      setStage("sent");
      toast.success("تم إرسال الكود");
    } catch (err) { toast.error(String((err as Error).message || err)); }
  };
  const verify = async () => {
    try {
      const r = await api.verifyOtp(phone, otp);
      setToken(r.token);
      setPhone(phone);
      toast.success("تم تسجيل الدخول");
    } catch (err) { toast.error(String((err as Error).message || err)); }
  };
  const logout = () => { clearSession(); setLocalPhone(""); setStage("idle"); toast.success("تم الخروج"); };

  return (
    <div className="p-5 space-y-4">
      <h2 className="text-2xl font-bold">الإعدادات</h2>
      <div className="rounded-2xl bg-slate-800 p-4 space-y-3">
        <div>
          <label className="text-sm">رابط الخادم</label>
          <input dir="ltr" value={base} onChange={(e) => setLocalBase(e.target.value)} className="mt-1 w-full h-11 rounded-lg bg-slate-900 border border-slate-700 px-3 font-mono text-sm" />
        </div>
        <div>
          <label className="text-sm">معرّف المتجر (slug)</label>
          <input dir="ltr" value={slug} onChange={(e) => setLocalSlug(e.target.value)} className="mt-1 w-full h-11 rounded-lg bg-slate-900 border border-slate-700 px-3 font-mono text-sm" />
        </div>
        <button onClick={() => { setBase(base); setStore(slug); toast.success("تم الحفظ"); }} className="w-full h-11 rounded-lg bg-violet-600 font-semibold">حفظ</button>
      </div>

      <div className="rounded-2xl bg-slate-800 p-4 space-y-3">
        <h3 className="font-semibold">تسجيل دخول</h3>
        {getToken() ? (
          <div>
            <p className="text-sm text-slate-400">مسجّل برقم: <span dir="ltr" className="font-mono">{phone}</span></p>
            <button onClick={logout} className="mt-2 h-10 px-4 rounded-lg bg-rose-600 text-white text-sm">خروج</button>
          </div>
        ) : (
          <>
            <input dir="ltr" placeholder="رقم الجوّال" value={phone} onChange={(e) => setLocalPhone(e.target.value)} className="w-full h-11 rounded-lg bg-slate-900 border border-slate-700 px-3 font-mono" />
            {stage === "idle" ? (
              <button onClick={requestOtp} className="w-full h-11 rounded-lg bg-violet-600 font-semibold">أرسل OTP</button>
            ) : (
              <>
                <input dir="ltr" placeholder="الكود" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full h-11 rounded-lg bg-slate-900 border border-slate-700 px-3 font-mono text-center text-lg tracking-widest" />
                <button onClick={verify} className="w-full h-11 rounded-lg bg-emerald-600 font-semibold">تحقّق</button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-center" theme="dark" dir="rtl" />
      <main className="pb-24">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/pay" element={<Pay />} />
          <Route path="/loyalty" element={<Loyalty />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <TabBar />
    </BrowserRouter>
  );
}
