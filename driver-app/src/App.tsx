import { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import {
  Truck,
  CheckCircle2,
  Camera,
  Phone,
  MapPin,
  Banknote,
  LogOut,
  Settings as SettingsIcon,
} from "lucide-react";
import { api, getBase, setBase, getToken, setToken, getMe, setMe, type Delivery } from "./lib/api";

function money(n: number) {
  return Number(n || 0).toLocaleString("en-EG", { minimumFractionDigits: 2 });
}

function TabBar() {
  const loc = useLocation();
  const tabs = [
    { to: "/", label: "طلبات", icon: Truck },
    { to: "/shift", label: "الوردية", icon: Banknote },
    { to: "/settings", label: "الإعدادات", icon: SettingsIcon },
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 z-50">
      <div className="flex justify-around py-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((t) => {
          const I = t.icon;
          const on = loc.pathname === t.to;
          return (
            <Link key={t.to} to={t.to} className={`flex flex-col items-center gap-0.5 px-4 py-1.5 text-[11px] ${on ? "text-cyan-400" : "text-slate-400"}`}>
              <I className="h-5 w-5" />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Login() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const submit = async () => {
    try {
      const r = await api.login(phone, code);
      setToken(r.token);
      setMe(r.me);
      navigate("/");
    } catch (err) { toast.error(String((err as Error).message || err)); }
  };
  return (
    <div className="p-6 space-y-5 max-w-sm mx-auto">
      <div className="text-center mt-12">
        <Truck className="h-14 w-14 mx-auto text-cyan-400" />
        <h1 className="text-2xl font-bold mt-3">سائق Horus</h1>
        <p className="text-slate-400 text-sm">سجّل دخولك بالرقم المسجّل عند المتجر</p>
      </div>
      <input dir="ltr" placeholder="رقم الجوّال" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full h-12 rounded-xl bg-slate-800 border border-slate-700 px-3 font-mono" />
      <input dir="ltr" placeholder="الكود" value={code} onChange={(e) => setCode(e.target.value)} className="w-full h-12 rounded-xl bg-slate-800 border border-slate-700 px-3 font-mono text-center text-lg tracking-widest" />
      <button onClick={submit} className="w-full h-12 rounded-xl bg-cyan-600 font-semibold">دخول</button>
    </div>
  );
}

function StatusBadge({ s }: { s: Delivery["status"] }) {
  const map: Record<string, string> = {
    queued: "bg-slate-700 text-slate-300",
    picked: "bg-amber-500/20 text-amber-300",
    in_transit: "bg-blue-500/20 text-blue-300",
    delivered: "bg-emerald-500/20 text-emerald-300",
    failed: "bg-rose-500/20 text-rose-300",
  };
  const labels: Record<string, string> = {
    queued: "قيد الانتظار",
    picked: "تم الاستلام",
    in_transit: "في الطريق",
    delivered: "تم التسليم",
    failed: "فشل",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full ${map[s] || ""}`}>{labels[s] || s}</span>;
}

function Queue() {
  const [list, setList] = useState<Delivery[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const refresh = () => api.myQueue().then((r) => setList(r.data || [])).catch((e) => toast.error(String(e.message || e)));

  useEffect(() => { refresh(); const t = setInterval(refresh, 20_000); return () => clearInterval(t); }, []);

  const advance = async (d: Delivery) => {
    const next = d.status === "queued" ? "picked" : d.status === "picked" ? "in_transit" : d.status === "in_transit" ? "delivered" : null;
    if (!next) return;
    setBusy(true);
    try {
      if (d.status === "queued") await api.accept(d.id);
      await api.setStatus(d.id, next);
      toast.success("تم التحديث");
      refresh();
    } catch (err) { toast.error(String((err as Error).message || err)); }
    finally { setBusy(false); }
  };

  const startProof = (id: string) => {
    setActiveId(id);
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !activeId) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await api.proofUpload(activeId, reader.result as string);
        toast.success("تم رفع إثبات التسليم");
      } catch (err) { toast.error(String((err as Error).message || err)); }
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  return (
    <div className="p-4 space-y-3">
      <h2 className="text-2xl font-bold">طلباتي</h2>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />
      {list.length === 0 ? <p className="text-slate-400 mt-6">لا توجد طلبات حاليًا.</p> : list.map((d) => (
        <div key={d.id} className="rounded-2xl bg-slate-800 p-4 space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold">#{d.order_number || d.id.slice(0, 6)} — {d.customer_name}</div>
              <a href={`tel:${d.customer_phone}`} className="text-xs text-cyan-300 flex items-center gap-1 mt-1">
                <Phone className="h-3 w-3" /> <span dir="ltr">{d.customer_phone}</span>
              </a>
            </div>
            <StatusBadge s={d.status} />
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-300">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{d.address}</span>
          </div>
          <div className="flex justify-between items-center pt-1">
            <span className="font-bold tabular-nums text-cyan-300">{money(d.total)}</span>
            <div className="flex gap-2">
              {d.status === "in_transit" && (
                <button onClick={() => startProof(d.id)} className="h-9 px-3 rounded-lg bg-slate-700 text-sm flex items-center gap-1">
                  <Camera className="h-3.5 w-3.5" /> إثبات
                </button>
              )}
              {d.status !== "delivered" && d.status !== "failed" && (
                <button onClick={() => advance(d)} disabled={busy} className="h-9 px-4 rounded-lg bg-cyan-600 text-sm font-semibold disabled:opacity-50 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {d.status === "queued" ? "اقبل" : d.status === "picked" ? "بدأت" : "تم التسليم"}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Shift() {
  const [cash, setCash] = useState("");
  const me = getMe();
  const end = async () => {
    try {
      await api.endShift(Number(cash) || 0);
      toast.success("تم تسليم الوردية");
      setCash("");
    } catch (err) { toast.error(String((err as Error).message || err)); }
  };
  return (
    <div className="p-5 space-y-4">
      <h2 className="text-2xl font-bold">الوردية</h2>
      {me && <p className="text-slate-400">السائق: <span className="font-semibold">{me.name}</span></p>}
      <div className="rounded-2xl bg-slate-800 p-4 space-y-3">
        <h3 className="font-semibold">تسليم الكاش</h3>
        <input dir="ltr" placeholder="0.00" value={cash} onChange={(e) => setCash(e.target.value)} type="number" inputMode="decimal" className="w-full h-14 rounded-lg bg-slate-900 border border-slate-700 px-3 text-2xl tabular-nums text-center" />
        <button onClick={end} className="w-full h-12 rounded-xl bg-emerald-600 font-semibold">إنهاء الوردية وتسليم الكاش</button>
      </div>
    </div>
  );
}

function Settings() {
  const [base, setLocalBase] = useState(getBase());
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem("horus.driver.token");
    localStorage.removeItem("horus.driver.me");
    navigate("/login");
  };
  return (
    <div className="p-5 space-y-4">
      <h2 className="text-2xl font-bold">الإعدادات</h2>
      <div className="rounded-2xl bg-slate-800 p-4 space-y-3">
        <label className="text-sm">رابط الخادم</label>
        <input dir="ltr" value={base} onChange={(e) => setLocalBase(e.target.value)} className="w-full h-11 rounded-lg bg-slate-900 border border-slate-700 px-3 font-mono text-sm" />
        <button onClick={() => { setBase(base); toast.success("تم الحفظ"); }} className="w-full h-11 rounded-lg bg-cyan-600 font-semibold">حفظ</button>
      </div>
      <button onClick={logout} className="w-full h-11 rounded-xl bg-rose-600 font-semibold flex items-center justify-center gap-2">
        <LogOut className="h-4 w-4" /> تسجيل خروج
      </button>
    </div>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  return getToken() ? <>{children}</> : <Login />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-center" theme="dark" dir="rtl" />
      <main className="pb-24">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Gate><Queue /></Gate>} />
          <Route path="/shift" element={<Gate><Shift /></Gate>} />
          <Route path="/settings" element={<Gate><Settings /></Gate>} />
        </Routes>
      </main>
      {getToken() && <TabBar />}
    </BrowserRouter>
  );
}
