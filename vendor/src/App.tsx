import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { LayoutDashboard, KeyRound, Send, Upload, FileClock, LogOut } from "lucide-react";
import { isAuthed, clearSession, getUser } from "@/lib/api";
import { LoginPage } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { CustomersPage } from "@/pages/Customers";
import { IssuePage } from "@/pages/Issue";
import { ReleasesPage } from "@/pages/Releases";
import { AuditPage } from "@/pages/Audit";

function Shell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const navigate = useNavigate();
  const user = getUser();
  const tabs = [
    { to: "/", label: "نظرة عامة", icon: LayoutDashboard },
    { to: "/customers", label: "العملاء والتراخيص", icon: KeyRound },
    { to: "/issue", label: "إصدار تراخيص", icon: Send },
    { to: "/releases", label: "الإصدارات (.exe)", icon: Upload },
    { to: "/audit", label: "سجل الإدارة", icon: FileClock },
  ];
  return (
    <div className="flex h-screen">
      <aside className="w-60 bg-white border-l border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary text-white grid place-items-center text-xl font-bold">𓁹</div>
            <div>
              <div className="font-bold">Horus Vendor</div>
              <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            </div>
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
          <button
            onClick={() => { clearSession(); navigate("/login"); }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" /> خروج
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

function Guarded({ children }: { children: React.ReactNode }) {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster richColors position="top-center" dir="rtl" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Guarded><Dashboard /></Guarded>} />
        <Route path="/customers" element={<Guarded><CustomersPage /></Guarded>} />
        <Route path="/issue" element={<Guarded><IssuePage /></Guarded>} />
        <Route path="/releases" element={<Guarded><ReleasesPage /></Guarded>} />
        <Route path="/audit" element={<Guarded><AuditPage /></Guarded>} />
      </Routes>
    </BrowserRouter>
  );
}
