import { Outlet, useParams } from "react-router-dom";
import { Toaster } from "sonner";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { StoreProvider, useStore } from "@/lib/store-context";
import { MessageCircle } from "lucide-react";

function WhatsAppFab() {
  const { feed } = useStore();
  if (!feed?.settings.whatsapp_phone) return null;
  const phone = feed.settings.whatsapp_phone.replace(/[^\d]/g, "");
  return (
    <a
      href={`https://wa.me/${phone}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-30 h-14 w-14 rounded-full bg-[#25d366] text-white flex items-center justify-center shadow-card hover:scale-105 transition-transform"
      aria-label="تواصل عبر واتساب"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}

function Inner() {
  const { feed, loading, error } = useStore();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }
  if (error || !feed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">المتجر غير متاح</h1>
          <p className="text-muted-foreground">{error || "تعذر تحميل المتجر"}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFab />
    </div>
  );
}

export function StoreLayout() {
  const { slug } = useParams<{ slug: string }>();
  return (
    <StoreProvider slug={slug || ""}>
      <Toaster richColors position="top-center" dir="rtl" />
      <Inner />
    </StoreProvider>
  );
}
