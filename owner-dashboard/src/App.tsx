import { useState } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { LayoutDashboard, FileText, Package, Users, Briefcase, ShoppingBag, LogOut, BarChart3, Bell, Settings as SettingsIcon, Eye, KeyRound } from "lucide-react";
import { api, getBase, getKey, setBase, setKey, isConfigured, logout, money, arDate } from "./lib/api";
import { Dashboard } from "@/pages/Dashboard";
import { InvoicesPage } from "@/pages/Invoices";
import { EmployeesPage } from "@/pages/Employees";
import { ProductsPage } from "@/pages/Products";
import { AnalyticsPage } from "@/pages/Analytics";
import { StoreOrdersPage } from "@/pages/StoreOrders";
import { NotificationsPage } from "@/pages/Notifications";

function LoginPage() {
  const navigate = useNavigate();
  const [base, setLocalBase] = useState(getBase());
  const [key, setLocalKey] = useState(getKey());
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    if (!base.trim() || !key.trim()) {
      toast.error("ادخل رابط السيرفر والمفتاح");
      return;
    }
    setBusy(true);
    setBase(base.trim());
    setKey(key.trim());
    try {
      // Probe with a quick dashboard call to validate
      await api.dashboard();
      toast.success("تم الاتصال بنجاح ✓");
      navigate("/");
    } catch (err) {
      toast.error("تعذر الاتصال: " + String((err as Error).message || err));
      logout();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-primary/10 to-accent/10">
      <div className="bg-white rounded-2xl shadow-card p-6 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="h-14 w-14 mx-auto rounded-xl bg-primary text-white grid place-items-center text-3xl font-bold mb-2">𓁹</div>
          <h1 className="text-2xl font-bold">Horus · لوحة صاحب المكان</h1>
          <p className="text-sm text-slate-500 mt-1">تابع مبيعاتك ومحلك من أي مكان</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">عنوان السيرفر (الكاشير)</label>
            <input
              dir="ltr"
              value={base}
              onChange={(e) => setLocalBase(e.target.value)}
              placeholder="https://your-server.com:27817"
              className="input-field mt-1.5 font-mono"
            />
            <p className="text-xs text-slate-500 mt-1">
              من شاشة "REST API Server" في الكاشير. للوصول من خارج الشبكة المحلية استخدم port forwarding أو ngrok.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5" /> مفتاح API
            </label>
            <input
              dir="ltr"
              type="password"
              value={key}
              onChange={(e) => setLocalKey(e.target.value)}
              placeholder="sa_xxxxxxxxxxxxxxxx"
              className="input-field mt-1.5 font-mono"
            />
            <p className="text-xs text-slate-500 mt-1">من شاشة "مفاتيح API" في الكاشير (صلاحية read كافية).</p>
          </div>
          <button onClick={connect} disabled={busy} className="btn-primary w-full">
            {busy ? "..." : "دخول"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const tabs = [
    { to: "/", label: "نظرة عامة", icon: LayoutDashboard },
    { to: "/invoices", label: "الفواتير", icon: FileText },
    { to: "/store-orders", label: "طلبات المتجر", icon: ShoppingBag },
    { to: "/analytics", label: "تحليلات", icon: BarChart3 },
    { to: "/products", label: "المنتجات", icon: Package },
    { to: "/employees", label: "الموظفون", icon: Briefcase },
    { to: "/notifications", label: "إشعارات", icon: Bell },
  ];

  return (
    <div className="flex h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 bg-white border-l border-slate-200 flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary text-white grid place-items-center text-xl font-bold">𓁹</div>
          <div>
            <div className="font-bold">Horus</div>
            <div className="text-xs text-slate-500">لوحة صاحب المكان</div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {tabs.map((t) => {
            const Active = t.icon;
            const on = loc.pathname === t.to;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${on ? "bg-primary text-white" : "text-slate-700 hover:bg-slate-100"}`}
              >
                <Active className="h-4 w-4" />
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-200">
          <button onClick={() => { logout(); navigate("/login"); }} className="w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" /> خروج
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex justify-around py-1 z-50">
        {tabs.slice(0, 5).map((t) => {
          const Active = t.icon;
          const on = loc.pathname === t.to;
          return (
            <Link key={t.to} to={t.to} className={`flex flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] ${on ? "text-primary" : "text-slate-500"}`}>
              <Active className="h-5 w-5" />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function Guarded({ children }: { children: React.ReactNode }) {
  if (!isConfigured()) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-center" dir="rtl" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Guarded><Dashboard /></Guarded>} />
        <Route path="/invoices" element={<Guarded><InvoicesPage /></Guarded>} />
        <Route path="/store-orders" element={<Guarded><StoreOrdersPage /></Guarded>} />
        <Route path="/analytics" element={<Guarded><AnalyticsPage /></Guarded>} />
        <Route path="/products" element={<Guarded><ProductsPage /></Guarded>} />
        <Route path="/employees" element={<Guarded><EmployeesPage /></Guarded>} />
        <Route path="/notifications" element={<Guarded><NotificationsPage /></Guarded>} />
      </Routes>
    </BrowserRouter>
  );
}
