import { useEffect, useState, useCallback } from "react";
import { Outlet, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/store/StoreHeader";
import { CartProvider, useCart } from "@/contexts/CartContext";
import { NotificationsContainer } from "@/components/store/3d/Notification3D";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";

interface TenantData {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  is_active: boolean;
}

interface CompanySettings {
  store_enabled: boolean;
  store_access_blocked: boolean;
  subscription_type: string;
  subscription_expires_at: string | null;
  tax_percentage: number;
  currency: string;
  payment_cod_enabled: boolean;
  payment_stripe_enabled: boolean;
  payment_bank_enabled: boolean;
  payment_vodafone_enabled: boolean;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  vodafone_number: string | null;
  // 3D Settings
  enable_3d_effects: boolean;
  animation_speed: string;
  enable_particles: boolean;
  enable_glassmorphism: boolean;
  depth_intensity: number;
}

export interface StoreContextData {
  tenant: TenantData;
  settings: CompanySettings;
}

interface Notification {
  id: string;
  type: "order_new" | "order_confirmed" | "payment_success" | "payment_failed" | "shipping" | "info";
  title: string;
  message: string;
}

const StoreLayoutInner = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { setTenantId } = useCart();

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    const fetchTenantData = async () => {
      if (!tenantSlug) {
        setError("لم يتم تحديد المتجر");
        setIsLoading(false);
        return;
      }

      try {
        // Fetch tenant
        const { data: tenantData, error: tenantError } = await supabase
          .from("tenants")
          .select("*")
          .eq("slug", tenantSlug)
          .eq("is_active", true)
          .single();

        if (tenantError || !tenantData) {
          setError("المتجر غير موجود أو غير متاح");
          setIsLoading(false);
          return;
        }

        setTenant(tenantData);
        setTenantId(tenantData.id);

        // Fetch company settings
        const { data: settingsData, error: settingsError } = await supabase
          .from("company_settings")
          .select("*")
          .eq("tenant_id", tenantData.id)
          .single();

        if (settingsError) {
          console.error("Settings error:", settingsError);
        }

        if (settingsData && !settingsData.store_enabled) {
          setError("المتجر غير مفعل حالياً");
          setIsLoading(false);
          return;
        }

        // Check if store access is blocked (subscription required)
        if (settingsData?.store_access_blocked) {
          setError("هذا المتجر يتطلب اشتراك Pro - تواصل مع صاحب المتجر للتفعيل");
          setIsLoading(false);
          return;
        }

        // Check if subscription expired for Pro stores
        if (settingsData?.subscription_type === 'pro' && settingsData?.subscription_expires_at) {
          const expiresAt = new Date(settingsData.subscription_expires_at);
          if (expiresAt < new Date()) {
            setError("انتهى اشتراك Pro لهذا المتجر - تواصل مع صاحب المتجر للتجديد");
            setIsLoading(false);
            return;
          }
        }

        setSettings(settingsData || {
          store_enabled: true,
          store_access_blocked: false,
          subscription_type: 'free',
          subscription_expires_at: null,
          tax_percentage: 0,
          currency: "EGP",
          payment_cod_enabled: true,
          payment_stripe_enabled: false,
          payment_bank_enabled: false,
          payment_vodafone_enabled: false,
          bank_name: null,
          bank_account_name: null,
          bank_account_number: null,
          vodafone_number: null,
          enable_3d_effects: true,
          animation_speed: "normal",
          enable_particles: true,
          enable_glassmorphism: true,
          depth_intensity: 15,
        });
      } catch (err) {
        console.error("Error fetching store data:", err);
        setError("حدث خطأ في تحميل بيانات المتجر");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenantData();
  }, [tenantSlug, setTenantId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-12 w-12 text-primary" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground"
        >
          جاري تحميل المتجر...
        </motion.p>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring" }}
        >
          <h1 className="text-2xl font-bold text-destructive">{error || "المتجر غير متاح"}</h1>
        </motion.div>
        <p className="text-muted-foreground">يرجى التحقق من الرابط والمحاولة مرة أخرى</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{tenant.name} | متجر إلكتروني</title>
        <meta name="description" content={`تسوق من ${tenant.name} - أفضل المنتجات بأفضل الأسعار`} />
      </Helmet>
      
      <div className="min-h-screen bg-background flex flex-col" dir="rtl">
        <StoreHeader
          storeName={tenant.name}
          logoUrl={tenant.logo_url}
          primaryColor={tenant.primary_color}
          tenantSlug={tenant.slug}
        />
        
        <main className="flex-1">
          <Outlet context={{ tenant, settings } as StoreContextData} />
        </main>

        {/* Footer */}
        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-muted/50 border-t py-8 mt-auto"
        >
          <div className="container mx-auto px-4 text-center">
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} {tenant.name}. جميع الحقوق محفوظة
            </p>
          </div>
        </motion.footer>

        {/* Notifications */}
        <NotificationsContainer
          notifications={notifications}
          onClose={removeNotification}
        />
      </div>
    </>
  );
};

export const StoreLayout = () => {
  return (
    <CartProvider>
      <StoreLayoutInner />
    </CartProvider>
  );
};
