import { useEffect, useState } from "react";
import { Outlet, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StoreHeader } from "@/components/store/StoreHeader";
import { CartProvider, useCart } from "@/contexts/CartContext";
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
}

export interface StoreContextData {
  tenant: TenantData;
  settings: CompanySettings;
}

const StoreLayoutInner = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setTenantId } = useCart();

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

        setSettings(settingsData || {
          store_enabled: true,
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <h1 className="text-2xl font-bold text-destructive">{error || "المتجر غير متاح"}</h1>
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
        <footer className="bg-muted/50 border-t py-8 mt-auto">
          <div className="container mx-auto px-4 text-center">
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} {tenant.name}. جميع الحقوق محفوظة
            </p>
          </div>
        </footer>
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
