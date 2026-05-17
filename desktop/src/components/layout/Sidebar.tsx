import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Package,
  Users,
  ShoppingBag,
  Warehouse,
  Layers,
  Settings,
  ShieldCheck,
  Bell,
  Database,
  LineChart,
  MessageSquare,
  Calculator,
  LogOut,
  Sun,
  Moon,
  RotateCcw,
  BookOpen,
  Receipt,
  Banknote,
  Building2,
  KeyRound,
  Send,
  ListChecks,
  Cloud,
  Clock,
  Pause,
  Award,
  Gift,
  Boxes,
  Coins,
  Landmark,
  Building,
  Repeat,
  Webhook,
  Key,
  Utensils,
  Sparkles,
  Server,
  Palette,
  Printer,
  Tag,
  ArrowRightLeft,
  ClipboardList,
  FileSignature,
  ArrowDownToLine,
  Calendar,
  ChefHat,
  Plug,
  Globe,
  Store,
  Upload,
  QrCode,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { atLeast, ROLE_LABEL } from "@/lib/rbac";
import { useTheme } from "@/contexts/ThemeContext";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  minRole: Role;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    title: "العام",
    items: [
      { to: "/", label: "لوحة التحكم", icon: <LayoutDashboard className="h-4 w-4" />, minRole: "cashier" },
    ],
  },
  {
    title: "المبيعات",
    items: [
      { to: "/invoice", label: "فاتورة جديدة", icon: <FileText className="h-4 w-4" />, minRole: "cashier" },
      { to: "/invoices", label: "الفواتير", icon: <ListChecks className="h-4 w-4" />, minRole: "cashier" },
      { to: "/quotations", label: "عروض الأسعار", icon: <FileText className="h-4 w-4" />, minRole: "manager" },
      { to: "/invoice-designer", label: "مصمم الفاتورة", icon: <Settings className="h-4 w-4" />, minRole: "manager" },
      { to: "/returns", label: "المرتجعات", icon: <RotateCcw className="h-4 w-4" />, minRole: "cashier" },
      { to: "/held-invoices", label: "الفواتير المعلقة", icon: <Pause className="h-4 w-4" />, minRole: "cashier" },
      { to: "/shifts", label: "ورديات الكاشير (X/Z)", icon: <Clock className="h-4 w-4" />, minRole: "cashier" },
      { to: "/clients", label: "العملاء", icon: <Users className="h-4 w-4" />, minRole: "manager" },
      { to: "/loyalty", label: "نقاط العملاء", icon: <Award className="h-4 w-4" />, minRole: "manager" },
      { to: "/gift-cards", label: "بطاقات الهدايا", icon: <Gift className="h-4 w-4" />, minRole: "manager" },
      { to: "/bundles", label: "العروض المجمعة", icon: <Boxes className="h-4 w-4" />, minRole: "manager" },
      { to: "/restaurant-tables", label: "طاولات المطعم", icon: <Utensils className="h-4 w-4" />, minRole: "manager" },
      { to: "/kitchen-display", label: "شاشة المطبخ (KDS)", icon: <ChefHat className="h-4 w-4" />, minRole: "cashier" },
      { to: "/qr-menu", label: "مينيو QR للطاولات", icon: <QrCode className="h-4 w-4" />, minRole: "manager" },
      { to: "/reservations", label: "الحجوزات", icon: <Calendar className="h-4 w-4" />, minRole: "cashier" },
    ],
  },
  {
    title: "المشتريات والمخزون",
    items: [
      { to: "/purchase-invoices", label: "فواتير المشتريات", icon: <FileText className="h-4 w-4" />, minRole: "manager" },
      { to: "/suppliers", label: "الموردون", icon: <Building2 className="h-4 w-4" />, minRole: "manager" },
      { to: "/purchase-orders", label: "أوامر الشراء (PO)", icon: <FileSignature className="h-4 w-4" />, minRole: "manager" },
      { to: "/products", label: "المنتجات", icon: <Package className="h-4 w-4" />, minRole: "manager" },
      { to: "/product-variants", label: "متغيرات المنتج", icon: <Tag className="h-4 w-4" />, minRole: "manager" },
      { to: "/stock-transfers", label: "تحويلات المخزون", icon: <ArrowRightLeft className="h-4 w-4" />, minRole: "manager" },
      { to: "/stock-counts", label: "الجرد", icon: <ClipboardList className="h-4 w-4" />, minRole: "manager" },
      { to: "/categories", label: "التصنيفات", icon: <Layers className="h-4 w-4" />, minRole: "manager" },
      { to: "/warehouses", label: "المخازن", icon: <Warehouse className="h-4 w-4" />, minRole: "manager" },
    ],
  },
  {
    title: "المالية والخزينة",
    items: [
      { to: "/receipt-vouchers", label: "إيصالات القبض", icon: <Receipt className="h-4 w-4" />, minRole: "cashier" },
      { to: "/payment-vouchers", label: "إيصالات الصرف", icon: <Banknote className="h-4 w-4" />, minRole: "manager" },
    ],
  },
  {
    title: "المحاسبة",
    items: [
      { to: "/chart-of-accounts", label: "دليل الحسابات", icon: <BookOpen className="h-4 w-4" />, minRole: "manager" },
      { to: "/journals", label: "القيود اليومية", icon: <FileText className="h-4 w-4" />, minRole: "manager" },
      { to: "/accounting", label: "التقارير المحاسبية", icon: <Calculator className="h-4 w-4" />, minRole: "manager" },
      { to: "/reports", label: "التقارير التشغيلية", icon: <LineChart className="h-4 w-4" />, minRole: "manager" },
      { to: "/currencies", label: "العملات", icon: <Coins className="h-4 w-4" />, minRole: "admin" },
      { to: "/bank-accounts", label: "الحسابات البنكية", icon: <Landmark className="h-4 w-4" />, minRole: "admin" },
      { to: "/bank-transactions", label: "الحركات البنكية", icon: <ArrowDownToLine className="h-4 w-4" />, minRole: "admin" },
      { to: "/fixed-assets", label: "الأصول الثابتة", icon: <Building className="h-4 w-4" />, minRole: "admin" },
      { to: "/cost-centers", label: "مراكز التكلفة", icon: <Layers className="h-4 w-4" />, minRole: "admin" },
      { to: "/employees", label: "الموظفون والمرتبات", icon: <Users className="h-4 w-4" />, minRole: "admin" },
      { to: "/recurring-invoices", label: "الفواتير المتكررة", icon: <Repeat className="h-4 w-4" />, minRole: "manager" },
    ],
  },
  {
    title: "المتجر الإلكتروني",
    items: [
      { to: "/store-management", label: "إدارة المتجر", icon: <ShoppingBag className="h-4 w-4" />, minRole: "manager" },
      { to: "/store-theme-builder", label: "مصمم واجهة المتجر", icon: <Palette className="h-4 w-4" />, minRole: "manager" },
      { to: "/store-orders", label: "طلبات المتجر", icon: <ListChecks className="h-4 w-4" />, minRole: "manager" },
      { to: "/coupons", label: "كوبونات الخصم", icon: <KeyRound className="h-4 w-4" />, minRole: "manager" },
      { to: "/shipping-carriers", label: "شركات الشحن", icon: <Banknote className="h-4 w-4" />, minRole: "admin" },
      { to: "/payment-gateways", label: "وسائل الدفع", icon: <Banknote className="h-4 w-4" />, minRole: "admin" },
    ],
  },
  {
    title: "التواصل",
    items: [
      { to: "/whatsapp-settings", label: "واتساب", icon: <Send className="h-4 w-4" />, minRole: "admin" },
      { to: "/internal-chat", label: "المحادثات", icon: <MessageSquare className="h-4 w-4" />, minRole: "manager" },
      { to: "/ai-assistant", label: "المساعد الذكي", icon: <Sparkles className="h-4 w-4" />, minRole: "manager" },
      { to: "/ai-insights", label: "رؤى ذكية (Forecast)", icon: <Sparkles className="h-4 w-4" />, minRole: "manager" },
      { to: "/visual-catalog", label: "كتالوج بالصور (AI)", icon: <Sparkles className="h-4 w-4" />, minRole: "manager" },
    ],
  },
  {
    title: "النظام",
    items: [
      { to: "/users", label: "المستخدمون", icon: <Users className="h-4 w-4" />, minRole: "admin" },
      { to: "/branches", label: "الفروع", icon: <Store className="h-4 w-4" />, minRole: "admin" },
      { to: "/industry-templates", label: "قوالب الأنشطة", icon: <Sparkles className="h-4 w-4" />, minRole: "admin" },
      { to: "/marketplace", label: "Marketplace", icon: <Globe className="h-4 w-4" />, minRole: "admin" },
      { to: "/plugins", label: "Plugins", icon: <Plug className="h-4 w-4" />, minRole: "admin" },
      { to: "/connections", label: "ربط الحسابات (GitHub/Vercel/...)", icon: <Globe className="h-4 w-4" />, minRole: "admin" },
      { to: "/bulk-import", label: "استيراد جماعي (CSV)", icon: <Upload className="h-4 w-4" />, minRole: "admin" },
      { to: "/tenants", label: "الشركات", icon: <Database className="h-4 w-4" />, minRole: "system_manager" },
      { to: "/webhooks", label: "Webhooks", icon: <Webhook className="h-4 w-4" />, minRole: "admin" },
      { to: "/api-keys", label: "مفاتيح API", icon: <Key className="h-4 w-4" />, minRole: "admin" },
      { to: "/api-server", label: "REST API Server", icon: <Server className="h-4 w-4" />, minRole: "admin" },
      { to: "/thermal-printer", label: "الطابعة الحرارية", icon: <Printer className="h-4 w-4" />, minRole: "admin" },
      { to: "/audit-logs", label: "سجل الأحداث (HMAC)", icon: <ShieldCheck className="h-4 w-4" />, minRole: "admin" },
      { to: "/security-events", label: "أحداث الأمان", icon: <ShieldCheck className="h-4 w-4" />, minRole: "admin" },
      { to: "/gdrive-backup", label: "نسخ Google Drive", icon: <Cloud className="h-4 w-4" />, minRole: "admin" },
      { to: "/activation", label: "الترخيص والتفعيل", icon: <KeyRound className="h-4 w-4" />, minRole: "admin" },
      { to: "/notifications", label: "الإشعارات", icon: <Bell className="h-4 w-4" />, minRole: "cashier" },
      { to: "/company-settings", label: "إعدادات الشركة", icon: <Settings className="h-4 w-4" />, minRole: "admin" },
      { to: "/account-settings", label: "حسابي", icon: <Settings className="h-4 w-4" />, minRole: "cashier" },
    ],
  },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const role = user?.role;

  const visibleSections = SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((n) => atLeast(role, n.minRole)),
  })).filter((s) => s.items.length > 0);

  return (
    <aside className="no-print w-64 shrink-0 h-full border-l border-border bg-card flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-md gradient-primary flex items-center justify-center text-primary-foreground font-bold text-base">
            𓁹
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold leading-tight">Horus</div>
            <div className="text-xs text-muted-foreground truncate">
              {user?.name || user?.email}
            </div>
          </div>
        </div>
        {role && (
          <div className="mt-3 text-xs text-muted-foreground">{ROLE_LABEL[role]}</div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {visibleSections.map((section) => (
          <div key={section.title}>
            <div className="px-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "text-foreground hover:bg-secondary",
                    )
                  }
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border flex items-center justify-between gap-2">
        <button
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary"
          onClick={toggle}
          title={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="text-xs">{theme === "dark" ? "فاتح" : "داكن"}</span>
        </button>
        <button
          className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
          onClick={() => {
            logout();
            navigate("/login");
          }}
          title="تسجيل خروج"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
