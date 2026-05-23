import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { Toaster, toast } from "sonner";
import {
  Home as HomeIcon,
  Package,
  Receipt,
  Users,
  Settings,
  Plus,
  Minus,
  Trash2,
  Save,
  WifiOff,
  Search,
} from "lucide-react";
import { api, getBase, setBase, getKey, setKey } from "./lib/api";

function money(n: number) {
  return Number(n || 0).toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Layout({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const tabs = [
    { to: "/", label: "الرئيسية", icon: HomeIcon },
    { to: "/sell", label: "بيع", icon: Receipt },
    { to: "/products", label: "منتجات", icon: Package },
    { to: "/clients", label: "عملاء", icon: Users },
    { to: "/settings", label: "إعدادات", icon: Settings },
  ];
  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex justify-around py-2 z-50">
        {tabs.map((t) => {
          const Active = t.icon;
          const on = loc.pathname === t.to;
          return (
            <Link key={t.to} to={t.to} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs ${on ? "text-blue-600" : "text-slate-500"}`}>
              <Active className="h-5 w-5" />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function Home() {
  const [stats, setStats] = useState<any>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    api.dashboard().then(setStats).catch(() => setErr(true));
  }, []);
  if (err) return <ErrorPanel />;
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-2xl font-bold">لوحة التحكم</h1>
      {!stats ? <p className="text-slate-500">جاري التحميل...</p> : (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "مبيعات اليوم", v: money(stats.salesToday) },
            { label: "مبيعات الشهر", v: money(stats.salesMonth) },
            { label: "الفواتير", v: stats.invoicesCount },
            { label: "المنتجات", v: stats.productsCount },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-xl shadow p-4">
              <div className="text-xs text-slate-500">{k.label}</div>
              <div className="text-2xl font-bold tabular-nums mt-1">{k.v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Sell() {
  const [products, setProducts] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Array<{ p: any; qty: number }>>([]);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.products().then((r) => setProducts(r.data || [])).catch(() => undefined);
  }, []);

  const filtered = q.trim()
    ? products.filter((p) =>
        p.name?.toLowerCase().includes(q.toLowerCase()) ||
        (p.barcode || "").includes(q),
      ).slice(0, 30)
    : products.slice(0, 30);

  const subtotal = rows.reduce((s, r) => s + r.p.price * r.qty, 0);

  const add = (p: any) => {
    setRows((prev) => {
      const ex = prev.find((r) => r.p.id === p.id);
      if (ex) return prev.map((r) => r === ex ? { ...r, qty: r.qty + 1 } : r);
      return [...prev, { p, qty: 1 }];
    });
  };

  const save = async () => {
    if (rows.length === 0) return;
    setBusy(true);
    try {
      await api.createInvoice({
        invoice: { type: "sales", paid: subtotal, status: "open" },
        items: rows.map((r) => ({
          product_id: r.p.id,
          product_name: r.p.name,
          quantity: r.qty,
          price: r.p.price,
          total: r.qty * r.p.price,
        })),
      });
      toast.success("تم حفظ الفاتورة");
      setRows([]);
      navigate("/");
    } catch (err) {
      toast.error(String((err as Error).message || err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-2xl font-bold">فاتورة جديدة</h1>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث أو امسح..."
          className="w-full h-11 rounded-lg border border-slate-200 bg-white pr-10 px-3 text-sm"
        />
      </div>

      <div className="bg-white rounded-xl shadow divide-y divide-slate-100">
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => add(p)}
            className="w-full text-right p-3 hover:bg-slate-50 flex justify-between items-center"
          >
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-slate-500 tabular-nums">{p.barcode || "—"}</div>
            </div>
            <div className="font-bold tabular-nums">{money(p.price)}</div>
          </button>
        ))}
      </div>

      {rows.length > 0 && (
        <div className="bg-white rounded-xl shadow p-3 space-y-2">
          <h3 className="font-semibold">السلة ({rows.length})</h3>
          {rows.map((r) => (
            <div key={r.p.id} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-sm">{r.p.name}</div>
                <div className="text-xs text-slate-500">{money(r.p.price)} × {r.qty}</div>
              </div>
              <button onClick={() => setRows((prev) => prev.map((x) => x === r ? { ...x, qty: Math.max(0, x.qty - 1) } : x))} className="h-7 w-7 rounded bg-slate-100"><Minus className="h-3 w-3 m-auto" /></button>
              <span className="w-6 text-center text-sm tabular-nums">{r.qty}</span>
              <button onClick={() => setRows((prev) => prev.map((x) => x === r ? { ...x, qty: x.qty + 1 } : x))} className="h-7 w-7 rounded bg-slate-100"><Plus className="h-3 w-3 m-auto" /></button>
              <span className="w-16 text-left text-sm tabular-nums font-semibold">{money(r.qty * r.p.price)}</span>
              <button onClick={() => setRows((prev) => prev.filter((x) => x !== r))} className="text-red-500 p-1"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <div className="border-t border-slate-100 pt-2 flex justify-between items-center">
            <span className="text-slate-500 text-sm">الإجمالي</span>
            <span className="text-xl font-bold tabular-nums">{money(subtotal)}</span>
          </div>
          <button onClick={save} disabled={busy} className="w-full h-12 rounded-lg bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
            <Save className="h-4 w-4" /> حفظ الفاتورة
          </button>
        </div>
      )}
    </div>
  );
}

function Products() {
  const [list, setList] = useState<any[]>([]);
  const [err, setErr] = useState(false);
  useEffect(() => {
    api.products().then((r) => setList(r.data || [])).catch(() => setErr(true));
  }, []);
  if (err) return <ErrorPanel />;
  return (
    <div className="p-4 space-y-2">
      <h1 className="text-2xl font-bold mb-3">المنتجات</h1>
      <div className="bg-white rounded-xl shadow divide-y divide-slate-100">
        {list.map((p) => (
          <div key={p.id} className="p-3 flex justify-between">
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-slate-500 tabular-nums">المتاح: {p.stock}</div>
            </div>
            <div className="text-left">
              <div className="font-bold tabular-nums">{money(p.price)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Clients() {
  const [list, setList] = useState<any[]>([]);
  const [err, setErr] = useState(false);
  useEffect(() => {
    api.clients().then((r) => setList(r.data || [])).catch(() => setErr(true));
  }, []);
  if (err) return <ErrorPanel />;
  return (
    <div className="p-4 space-y-2">
      <h1 className="text-2xl font-bold mb-3">العملاء</h1>
      <div className="bg-white rounded-xl shadow divide-y divide-slate-100">
        {list.map((c) => (
          <div key={c.id} className="p-3">
            <div className="font-medium">{c.name}</div>
            <div className="text-xs text-slate-500 tabular-nums" dir="ltr">{c.phone || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPage() {
  const [base, setLocalBase] = useState(getBase());
  const [key, setLocalKey] = useState(getKey());

  const save = () => {
    setBase(base);
    setKey(key);
    toast.success("تم الحفظ");
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">الإعدادات</h1>
      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div>
          <label className="text-sm font-medium">رابط السيرفر</label>
          <input
            dir="ltr"
            value={base}
            onChange={(e) => setLocalBase(e.target.value)}
            className="w-full h-11 rounded-lg border border-slate-200 px-3 mt-1.5 font-mono text-sm"
            placeholder="http://192.168.1.10:27817"
          />
        </div>
        <div>
          <label className="text-sm font-medium">مفتاح API</label>
          <input
            dir="ltr"
            value={key}
            onChange={(e) => setLocalKey(e.target.value)}
            className="w-full h-11 rounded-lg border border-slate-200 px-3 mt-1.5 font-mono text-sm"
            placeholder="sa_xxxxxxxxxxxxxxxx"
          />
        </div>
        <button onClick={save} className="w-full h-11 rounded-lg bg-blue-600 text-white font-semibold">
          حفظ
        </button>
      </div>
      <p className="text-xs text-slate-500 text-center">
        المفتاح والـ URL يُحفظوا محليًا على الجهاز ده فقط.
      </p>
    </div>
  );
}

function ErrorPanel() {
  return (
    <div className="p-6 text-center mt-12">
      <WifiOff className="h-12 w-12 text-slate-400 mx-auto mb-3" />
      <h2 className="font-bold mb-1">تعذر الاتصال بالسيرفر</h2>
      <p className="text-sm text-slate-500">تأكد من تشغيل REST API في تطبيق الكاشير، وأن الـ URL والـ API Key صحيحين.</p>
      <Link to="/settings" className="inline-block mt-4 text-blue-600 underline">فتح الإعدادات</Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-center" dir="rtl" />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/products" element={<Products />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
