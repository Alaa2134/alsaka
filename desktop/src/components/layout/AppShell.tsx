import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TitleBar } from "./TitleBar";
import { useOffline } from "@/contexts/OfflineContext";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";

const TITLES: Record<string, string> = {
  "/": "لوحة التحكم",
  "/invoice": "فاتورة جديدة",
  "/invoices": "الفواتير",
  "/returns": "المرتجعات",
  "/products": "المنتجات",
  "/clients": "العملاء",
  "/categories": "التصنيفات",
  "/warehouses": "المخازن",
  "/reports": "التقارير",
  "/accounting": "المحاسبة",
  "/store-management": "إدارة المتجر",
  "/store-orders": "طلبات المتجر",
  "/internal-chat": "المحادثات الداخلية",
  "/users": "المستخدمون",
  "/tenants": "الشركات",
  "/system": "لوحة النظام",
  "/audit-logs": "سجل الأحداث",
  "/security-events": "أحداث الأمان",
  "/notifications": "الإشعارات",
  "/whatsapp-settings": "إعدادات واتساب",
  "/company-settings": "إعدادات الشركة",
  "/account-settings": "حسابي",
  "/subscription": "الاشتراك",
  "/invoice-designer": "مصمم الفواتير",
  "/invoice-page-settings": "إعدادات صفحة الفاتورة",
  "/links": "إدارة الروابط",
};

export function AppShell() {
  const location = useLocation();
  const { online } = useOffline();
  const title = TITLES[location.pathname] || "SystemAlaa";

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <TitleBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="no-print h-14 border-b border-border px-5 flex items-center justify-between bg-card/60 backdrop-blur">
            <h1 className="text-lg font-semibold">{title}</h1>
            <div className="flex items-center gap-2">
              {online ? (
                <Badge variant="success" className="gap-1">
                  <Wifi className="h-3 w-3" /> متصل
                </Badge>
              ) : (
                <Badge variant="warning" className="gap-1">
                  <WifiOff className="h-3 w-3" /> بدون اتصال
                </Badge>
              )}
            </div>
          </header>
          <div className="flex-1 overflow-auto p-5">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
