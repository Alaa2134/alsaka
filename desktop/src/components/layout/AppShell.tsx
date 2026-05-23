import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sidebar } from "./Sidebar";
import { TitleBar } from "./TitleBar";
import { useOffline } from "@/contexts/OfflineContext";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Languages } from "lucide-react";
import { VoiceCommands } from "@/components/shared/VoiceCommands";

const TITLES: Record<string, string> = {
  "/": "لوحة التحكم",
  "/invoice": "فاتورة جديدة",
  "/invoices": "الفواتير",
  "/returns": "المرتجعات",
  "/products": "المنتجات",
  "/clients": "العملاء",
  "/suppliers": "الموردون",
  "/purchase-invoices": "فواتير المشتريات",
  "/categories": "التصنيفات",
  "/warehouses": "المخازن",
  "/reports": "التقارير التشغيلية",
  "/accounting": "التقارير المحاسبية",
  "/chart-of-accounts": "دليل الحسابات",
  "/journals": "القيود اليومية",
  "/receipt-vouchers": "إيصالات القبض",
  "/payment-vouchers": "إيصالات الصرف",
  "/store-management": "إدارة المتجر",
  "/store-orders": "طلبات المتجر",
  "/internal-chat": "المحادثات الداخلية",
  "/users": "المستخدمون",
  "/tenants": "الشركات",
  "/system": "لوحة النظام",
  "/audit-logs": "سجل الأحداث (HMAC)",
  "/security-events": "أحداث الأمان",
  "/notifications": "الإشعارات",
  "/whatsapp-settings": "إعدادات واتساب",
  "/company-settings": "إعدادات الشركة",
  "/account-settings": "حسابي",
  "/subscription": "الاشتراك",
  "/invoice-designer": "مصمم الفواتير",
  "/invoice-page-settings": "إعدادات صفحة الفاتورة",
  "/links": "إدارة الروابط",
  "/activation": "الترخيص والتفعيل",
  "/coupons": "كوبونات الخصم",
  "/shipping-carriers": "شركات الشحن",
  "/payment-gateways": "وسائل الدفع",
  "/gdrive-backup": "نسخ احتياطي - Google Drive",
  "/shifts": "ورديات الكاشير",
  "/held-invoices": "الفواتير المعلقة",
  "/loyalty": "نقاط العملاء",
  "/gift-cards": "بطاقات الهدايا",
  "/bundles": "العروض المجمعة",
  "/currencies": "العملات",
  "/bank-accounts": "الحسابات البنكية",
  "/employees": "الموظفون والمرتبات",
  "/cost-centers": "مراكز التكلفة",
  "/fixed-assets": "الأصول الثابتة",
  "/recurring-invoices": "الفواتير المتكررة",
  "/webhooks": "Webhooks",
  "/api-keys": "مفاتيح API",
  "/restaurant-tables": "طاولات المطعم",
  "/ai-assistant": "المساعد الذكي",
  "/api-server": "REST API Server",
  "/store-theme-builder": "مصمم واجهة المتجر",
  "/thermal-printer": "الطابعة الحرارية",
  "/product-variants": "متغيرات المنتج",
  "/stock-transfers": "تحويلات المخزون",
  "/stock-counts": "الجرد",
  "/purchase-orders": "أوامر الشراء",
  "/bank-transactions": "الحركات البنكية",
  "/industry-templates": "قوالب الأنشطة",
  "/branches": "الفروع",
  "/reservations": "الحجوزات",
  "/kitchen-display": "شاشة المطبخ",
  "/marketplace": "Marketplace Integrations",
  "/plugins": "Plugins",
  "/quotations": "عروض الأسعار",
  "/bulk-import": "استيراد جماعي",
  "/ai-insights": "رؤى الذكاء الاصطناعي",
  "/visual-catalog": "كتالوج بالصور (AI Vision)",
  "/qr-menu": "مينيو QR للطاولات",
  "/connections": "ربط الحسابات والخدمات",
  "/hardware": "الأجهزة",
  "/zatca-phase2": "ZATCA المرحلة 2",
  "/eta-egypt": "ETA Egypt",
  "/drug-interactions": "تعارضات الأدوية",
  "/prescriptions": "الروشتات الطبية",
  "/controlled-substances": "سجل المواد المخدرة",
  "/recipes": "وصفات الأطباق",
  "/waste-log": "سجل الهالك",
  "/service-packages": "باقات الخدمات",
  "/staff-schedules": "مواعيد الموظفين",
  "/vehicles": "سيارات العملاء",
  "/job-cards": "أوامر الشغل",
  "/parts-catalog": "مرجع قطع الغيار",
  "/smart-import": "استيراد ذكي للمنتجات (AI)",
  "/whatsapp-bulk": "إرسال واتساب جماعي",
  "/whatsapp-cloud": "WhatsApp Cloud API",
  "/branch-sync": "مزامنة الفروع",
};

export function AppShell() {
  const location = useLocation();
  const { online } = useOffline();
  const { i18n } = useTranslation();
  const title = TITLES[location.pathname] || "Horus";
  const toggleLang = () => i18n.changeLanguage(i18n.language === "ar" ? "en" : "ar");

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <TitleBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="no-print h-14 border-b border-border px-5 flex items-center justify-between bg-card/60 backdrop-blur">
            <h1 className="text-lg font-semibold">{title}</h1>
            <div className="flex items-center gap-2">
              <VoiceCommands />
              <button
                onClick={toggleLang}
                className="inline-flex items-center gap-1.5 rounded-md bg-secondary hover:bg-secondary/80 px-2.5 py-1.5 text-xs font-medium no-print"
                title="تبديل اللغة"
              >
                <Languages className="h-3.5 w-3.5" />
                {i18n.language === "ar" ? "EN" : "ع"}
              </button>
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
