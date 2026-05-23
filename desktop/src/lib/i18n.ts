import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Arabic is the source of truth — English keys mirror it for international
// deployments. The renderer can switch languages at runtime via the user
// preferences screen; the document `dir` attribute auto-flips between
// rtl/ltr.
const AR = {
  common: {
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    edit: "تعديل",
    new: "جديد",
    search: "بحث",
    print: "طباعة",
    export: "تصدير",
    import: "استيراد",
    yes: "نعم",
    no: "لا",
    loading: "جاري التحميل...",
    saved: "تم الحفظ",
    deleted: "تم الحذف",
    confirm_delete: "تأكيد الحذف؟",
    total: "الإجمالي",
    subtotal: "إجمالي فرعي",
    discount: "خصم",
    paid: "مدفوع",
    remaining: "المتبقي",
  },
  nav: {
    dashboard: "لوحة التحكم",
    invoice: "فاتورة جديدة",
    invoices: "الفواتير",
    products: "المنتجات",
    clients: "العملاء",
    suppliers: "الموردون",
    reports: "التقارير",
    accounting: "المحاسبة",
    settings: "الإعدادات",
  },
  invoice: {
    barcode: "باركود",
    product: "المنتج",
    quantity: "الكمية",
    price: "السعر",
    add: "إضافة",
    hold: "تعليق",
    new_row: "صف جديد",
    send_whatsapp: "إرسال على واتساب",
  },
};

const EN = {
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    new: "New",
    search: "Search",
    print: "Print",
    export: "Export",
    import: "Import",
    yes: "Yes",
    no: "No",
    loading: "Loading...",
    saved: "Saved",
    deleted: "Deleted",
    confirm_delete: "Confirm delete?",
    total: "Total",
    subtotal: "Subtotal",
    discount: "Discount",
    paid: "Paid",
    remaining: "Remaining",
  },
  nav: {
    dashboard: "Dashboard",
    invoice: "New Invoice",
    invoices: "Invoices",
    products: "Products",
    clients: "Customers",
    suppliers: "Suppliers",
    reports: "Reports",
    accounting: "Accounting",
    settings: "Settings",
  },
  invoice: {
    barcode: "Barcode",
    product: "Product",
    quantity: "Qty",
    price: "Price",
    add: "Add",
    hold: "Hold",
    new_row: "New row",
    send_whatsapp: "Send via WhatsApp",
  },
};

const STORAGE_KEY = "systemalaa.language";

const initialLang = (() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "ar" || stored === "en") return stored;
  } catch {
    /* ignore */
  }
  return "ar";
})();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: AR,
      en: EN,
    },
    lng: initialLang,
    fallbackLng: "ar",
    defaultNS: "common",
    interpolation: { escapeValue: false },
  });

// Sync document direction with the active language.
const applyDir = (lang: string) => {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
};
applyDir(initialLang);
i18n.on("languageChanged", (lng) => {
  applyDir(lng);
  try { localStorage.setItem(STORAGE_KEY, lng); } catch { /* ignore */ }
});

export default i18n;
