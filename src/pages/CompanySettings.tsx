import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import { 
  Store, 
  Calculator, 
  Package, 
  CreditCard, 
  Banknote, 
  Phone as PhoneIcon, 
  Truck,
  ExternalLink,
  Eye,
  Save,
  Building2,
  Globe,
  Percent,
  Sparkles,
  Gauge,
  Layers,
  Zap,
  Volume2,
  VolumeX
} from "lucide-react";
import { LogoUploader } from "@/components/shared/LogoUploader";

interface CompanySettingsData {
  id: string;
  tenant_id: string;
  subdomain: string | null;
  custom_domain: string | null;
  store_enabled: boolean;
  accounting_enabled: boolean;
  inventory_enabled: boolean;
  payment_cod_enabled: boolean;
  payment_stripe_enabled: boolean;
  payment_bank_enabled: boolean;
  payment_vodafone_enabled: boolean;
  vodafone_number: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  tax_percentage: number;
  currency: string;
  // 3D Settings
  enable_3d_effects: boolean;
  animation_speed: string;
  enable_particles: boolean;
  enable_glassmorphism: boolean;
  depth_intensity: number;
  // Sound Settings
  sound_alerts_enabled: boolean;
  // Subscription
  subscription_type: string;
  subscription_expires_at: string | null;
  store_access_blocked: boolean;
}

const CompanySettings = () => {
  const { user, tenant, refreshCompanySettings, hasPermission } = useAuth();
  const [settings, setSettings] = useState<CompanySettingsData | null>(null);
  const [tenantData, setTenantData] = useState<{ name: string; logo_url: string | null; slug: string } | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (tenant?.id) {
      fetchSettings();
      fetchTenantData();
    }
  }, [tenant?.id]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("tenant_id", tenant!.id)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("فشل في تحميل الإعدادات");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenantData = async () => {
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("name, logo_url, slug")
        .eq("id", tenant!.id)
        .single();

      if (error) throw error;
      setTenantData(data);
    } catch (error) {
      console.error("Error fetching tenant:", error);
    }
  };

  const validateSlug = (slug: string): boolean => {
    // Only allow lowercase letters, numbers, and hyphens
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slug || slug.length < 3) {
      setSlugError("الـ slug يجب أن يكون 3 أحرف على الأقل");
      return false;
    }
    if (slug.length > 50) {
      setSlugError("الـ slug يجب أن يكون أقل من 50 حرف");
      return false;
    }
    if (!slugRegex.test(slug)) {
      setSlugError("الـ slug يجب أن يحتوي فقط على حروف إنجليزية صغيرة وأرقام وشرطات");
      return false;
    }
    if (slug.startsWith('-') || slug.endsWith('-')) {
      setSlugError("الـ slug لا يمكن أن يبدأ أو ينتهي بشرطة");
      return false;
    }
    setSlugError(null);
    return true;
  };

  const checkSlugAvailability = async (slug: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .neq("id", tenant!.id)
      .maybeSingle();
    
    if (error) {
      console.error("Error checking slug:", error);
      return false;
    }
    
    if (data) {
      setSlugError("هذا الـ slug مستخدم بالفعل");
      return false;
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!settings || !tenantData) return;
    
    // Validate slug before saving
    if (!validateSlug(tenantData.slug)) {
      toast.error(slugError || "الـ slug غير صالح");
      return;
    }
    
    setIsSaving(true);

    try {
      // Check slug availability
      const isSlugAvailable = await checkSlugAvailability(tenantData.slug);
      if (!isSlugAvailable) {
        toast.error(slugError || "الـ slug مستخدم بالفعل");
        setIsSaving(false);
        return;
      }

      // Update company settings
      const { error: settingsError } = await supabase
        .from("company_settings")
        .update({
          subdomain: settings.subdomain,
          custom_domain: settings.custom_domain,
          store_enabled: settings.store_enabled,
          accounting_enabled: settings.accounting_enabled,
          inventory_enabled: settings.inventory_enabled,
          payment_cod_enabled: settings.payment_cod_enabled,
          payment_stripe_enabled: settings.payment_stripe_enabled,
          payment_bank_enabled: settings.payment_bank_enabled,
          payment_vodafone_enabled: settings.payment_vodafone_enabled,
          vodafone_number: settings.vodafone_number,
          bank_name: settings.bank_name,
          bank_account_name: settings.bank_account_name,
          bank_account_number: settings.bank_account_number,
          tax_percentage: settings.tax_percentage,
          currency: settings.currency,
          // 3D Settings
          enable_3d_effects: settings.enable_3d_effects,
          animation_speed: settings.animation_speed,
          enable_particles: settings.enable_particles,
          enable_glassmorphism: settings.enable_glassmorphism,
          depth_intensity: settings.depth_intensity,
          // Sound Settings
          sound_alerts_enabled: settings.sound_alerts_enabled,
        })
        .eq("id", settings.id);

      if (settingsError) throw settingsError;

      // Update tenant data including slug
      const { error: tenantError } = await supabase
        .from("tenants")
        .update({ 
          name: tenantData.name, 
          logo_url: tenantData.logo_url,
          slug: tenantData.slug 
        })
        .eq("id", tenant!.id);

      if (tenantError) throw tenantError;

      await refreshCompanySettings();
      toast.success("تم حفظ الإعدادات بنجاح");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("فشل في حفظ الإعدادات");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof CompanySettingsData>(key: K, value: CompanySettingsData[K]) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  if (!hasPermission(["system_manager", "company_admin", "admin"])) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <p className="text-lg text-muted-foreground">ليس لديك صلاحية الوصول لهذه الصفحة</p>
        </div>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>إعدادات الشركة | نظام الفواتير</title>
        <meta name="description" content="إعدادات وتكوين الشركة" />
      </Helmet>
      <MainLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">إعدادات الشركة</h1>
              <p className="text-muted-foreground mt-1">تكوين بيانات وميزات الشركة</p>
            </div>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              <Save size={18} />
              {isSaving ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  بيانات الشركة
                </CardTitle>
                <CardDescription>المعلومات الأساسية للشركة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>اسم الشركة</Label>
                  <Input
                    value={tenantData?.name || ""}
                    onChange={(e) => setTenantData(prev => prev ? { ...prev, name: e.target.value } : null)}
                    placeholder="اسم الشركة"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    رابط المتجر (Slug)
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground whitespace-nowrap text-sm">/store/</span>
                    <Input
                      value={tenantData?.slug || ""}
                      onChange={(e) => {
                        const newSlug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                        setTenantData(prev => prev ? { ...prev, slug: newSlug } : null);
                        validateSlug(newSlug);
                      }}
                      placeholder="my-store"
                      dir="ltr"
                      className={slugError ? "border-destructive" : ""}
                    />
                  </div>
                  {slugError && (
                    <p className="text-sm text-destructive">{slugError}</p>
                  )}
                  {tenantData?.slug && !slugError && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-muted-foreground">
                        رابط المتجر: {window.location.origin}/store/{tenantData.slug}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/store/${tenantData.slug}`, '_blank')}
                          className="gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          معاينة
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/store/${tenantData.slug}`);
                            toast.success("تم نسخ الرابط");
                          }}
                          className="gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          نسخ
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>شعار الشركة</Label>
                  <LogoUploader
                    currentLogo={tenantData?.logo_url || ""}
                    onLogoChange={(url) => setTenantData(prev => prev ? { ...prev, logo_url: url } : null)}
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    النطاق الفرعي
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={settings?.subdomain || ""}
                      onChange={(e) => updateSetting("subdomain", e.target.value)}
                      placeholder="my-company"
                      dir="ltr"
                    />
                    <span className="text-muted-foreground whitespace-nowrap">.lovable.app</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>النطاق المخصص (اختياري)</Label>
                  <Input
                    value={settings?.custom_domain || ""}
                    onChange={(e) => updateSetting("custom_domain", e.target.value)}
                    placeholder="store.example.com"
                    dir="ltr"
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>العملة</Label>
                    <Input
                      value={settings?.currency || "EGP"}
                      onChange={(e) => updateSetting("currency", e.target.value)}
                      placeholder="EGP"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      نسبة الضريبة %
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={settings?.tax_percentage || 0}
                      onChange={(e) => updateSetting("tax_percentage", Number(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features Toggle */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  الميزات
                </CardTitle>
                <CardDescription>تفعيل وإيقاف الميزات المتاحة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Store className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">المتجر الإلكتروني</p>
                      <p className="text-sm text-muted-foreground">تفعيل واجهة المتجر للعملاء</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings?.store_enabled || false}
                    onCheckedChange={(checked) => updateSetting("store_enabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calculator className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">نظام المحاسبة</p>
                      <p className="text-sm text-muted-foreground">إدارة الحسابات والقيود</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings?.accounting_enabled || false}
                    onCheckedChange={(checked) => updateSetting("accounting_enabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="font-medium">إدارة المخزون</p>
                      <p className="text-sm text-muted-foreground">تتبع الكميات والمخازن</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings?.inventory_enabled || false}
                    onCheckedChange={(checked) => updateSetting("inventory_enabled", checked)}
                  />
                </div>

                {/* Sound Alerts */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    {settings?.sound_alerts_enabled ? (
                      <Volume2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <VolumeX className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">صوت التنبيهات</p>
                      <p className="text-sm text-muted-foreground">تنبيه صوتي عند البيع بأقل من الحد الأدنى</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings?.sound_alerts_enabled ?? true}
                    onCheckedChange={(checked) => updateSetting("sound_alerts_enabled", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 3D Effects Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  تأثيرات 3D
                </CardTitle>
                <CardDescription>تحكم في التأثيرات البصرية للمتجر</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Layers className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="font-medium">تفعيل تأثيرات 3D</p>
                      <p className="text-sm text-muted-foreground">تجربة بصرية ثلاثية الأبعاد</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings?.enable_3d_effects || false}
                    onCheckedChange={(checked) => updateSetting("enable_3d_effects", checked)}
                  />
                </div>

                {settings?.enable_3d_effects && (
                  <>
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        <div>
                          <p className="font-medium">الجزيئات المتحركة</p>
                          <p className="text-sm text-muted-foreground">تأثيرات خلفية متحركة</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings?.enable_particles || false}
                        onCheckedChange={(checked) => updateSetting("enable_particles", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <Layers className="h-5 w-5 text-cyan-500" />
                        <div>
                          <p className="font-medium">تأثير الزجاج</p>
                          <p className="text-sm text-muted-foreground">Glassmorphism للبطاقات</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings?.enable_glassmorphism || false}
                        onCheckedChange={(checked) => updateSetting("enable_glassmorphism", checked)}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Gauge className="h-4 w-4" />
                        سرعة الأنيميشن
                      </Label>
                      <div className="flex gap-2">
                        {["slow", "normal", "fast"].map((speed) => (
                          <Button
                            key={speed}
                            type="button"
                            variant={settings?.animation_speed === speed ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateSetting("animation_speed", speed)}
                            className="flex-1"
                          >
                            {speed === "slow" ? "بطيء" : speed === "normal" ? "عادي" : "سريع"}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        قوة العمق: {settings?.depth_intensity || 15}
                      </Label>
                      <input
                        type="range"
                        min="5"
                        max="30"
                        value={settings?.depth_intensity || 15}
                        onChange={(e) => updateSetting("depth_intensity", Number(e.target.value))}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>خفيف</span>
                        <span>قوي</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payment Gateways */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  بوابات الدفع
                </CardTitle>
                <CardDescription>إعداد طرق الدفع المتاحة للعملاء</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Cash on Delivery */}
                  <div className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Truck className="h-5 w-5 text-amber-500" />
                        <div>
                          <p className="font-medium">الدفع عند الاستلام</p>
                          <p className="text-sm text-muted-foreground">COD</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings?.payment_cod_enabled || false}
                        onCheckedChange={(checked) => updateSetting("payment_cod_enabled", checked)}
                      />
                    </div>
                  </div>

                  {/* Stripe */}
                  <div className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-purple-500" />
                        <div>
                          <p className="font-medium">Stripe</p>
                          <p className="text-sm text-muted-foreground">بطاقات ائتمان</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings?.payment_stripe_enabled || false}
                        onCheckedChange={(checked) => updateSetting("payment_stripe_enabled", checked)}
                      />
                    </div>
                  </div>

                  {/* Bank Transfer */}
                  <div className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Banknote className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium">تحويل بنكي</p>
                          <p className="text-sm text-muted-foreground">يتطلب تأكيد المدير</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings?.payment_bank_enabled || false}
                        onCheckedChange={(checked) => updateSetting("payment_bank_enabled", checked)}
                      />
                    </div>
                    {settings?.payment_bank_enabled && (
                      <div className="space-y-3 pt-2 border-t">
                        <div className="space-y-1">
                          <Label className="text-sm">اسم البنك</Label>
                          <Input
                            value={settings?.bank_name || ""}
                            onChange={(e) => updateSetting("bank_name", e.target.value)}
                            placeholder="البنك الأهلي المصري"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm">اسم صاحب الحساب</Label>
                          <Input
                            value={settings?.bank_account_name || ""}
                            onChange={(e) => updateSetting("bank_account_name", e.target.value)}
                            placeholder="محمد أحمد"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm">رقم الحساب / IBAN</Label>
                          <Input
                            value={settings?.bank_account_number || ""}
                            onChange={(e) => updateSetting("bank_account_number", e.target.value)}
                            placeholder="EG1234567890123456789"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Vodafone Cash */}
                  <div className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <PhoneIcon className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="font-medium">فودافون كاش</p>
                          <p className="text-sm text-muted-foreground">يتطلب تأكيد المدير</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings?.payment_vodafone_enabled || false}
                        onCheckedChange={(checked) => updateSetting("payment_vodafone_enabled", checked)}
                      />
                    </div>
                    {settings?.payment_vodafone_enabled && (
                      <div className="space-y-1 pt-2 border-t">
                        <Label className="text-sm">رقم فودافون كاش</Label>
                        <Input
                          value={settings?.vodafone_number || ""}
                          onChange={(e) => updateSetting("vodafone_number", e.target.value)}
                          placeholder="01xxxxxxxxx"
                          dir="ltr"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MainLayout>
    </>
  );
};

export default CompanySettings;
