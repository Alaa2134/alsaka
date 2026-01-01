import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Store, Link2, BarChart3, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface SubscriptionPricing {
  monthly: number;
  yearly: number;
  currency: string;
}

export default function Subscription() {
  const { user } = useAuth();
  const [pricing, setPricing] = useState<SubscriptionPricing>({ monthly: 99, yearly: 999, currency: "EGP" });
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPricingAndSubscription();
  }, [user?.tenant_id]);

  const fetchPricingAndSubscription = async () => {
    try {
      // Fetch system pricing
      const { data: settingsData } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "subscription_pricing")
        .single();

      if (settingsData?.value && typeof settingsData.value === 'object') {
        const value = settingsData.value as Record<string, unknown>;
        setPricing({
          monthly: Number(value.monthly) || 99,
          yearly: Number(value.yearly) || 999,
          currency: String(value.currency) || "EGP"
        });
      }

      // Fetch current subscription
      if (user?.tenant_id) {
        const { data: companyData } = await supabase
          .from("company_settings")
          .select("subscription_type, subscription_expires_at")
          .eq("tenant_id", user.tenant_id)
          .single();

        if (companyData) {
          setCurrentPlan(companyData.subscription_type || "free");
          setExpiresAt(companyData.subscription_expires_at);
        }
      }
    } catch (error) {
      console.error("Error fetching subscription data:", error);
    }
  };

  const handleSubscribe = async (plan: "monthly" | "yearly") => {
    if (!user?.tenant_id) {
      toast.error("يجب تسجيل الدخول أولاً");
      return;
    }

    setLoading(true);
    try {
      const expirationDate = new Date();
      if (plan === "monthly") {
        expirationDate.setMonth(expirationDate.getMonth() + 1);
      } else {
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      }

      const { error } = await supabase
        .from("company_settings")
        .update({
          subscription_type: "pro",
          subscription_expires_at: expirationDate.toISOString(),
          store_access_blocked: false
        })
        .eq("tenant_id", user.tenant_id);

      if (error) throw error;

      toast.success("تم الاشتراك بنجاح! 🎉");
      setCurrentPlan("pro");
      setExpiresAt(expirationDate.toISOString());
    } catch (error) {
      console.error("Error subscribing:", error);
      toast.error("حدث خطأ أثناء الاشتراك");
    } finally {
      setLoading(false);
    }
  };

  const freeFeatures = [
    "إنشاء الفواتير الأساسية",
    "إدارة المنتجات (حتى 100 منتج)",
    "إدارة العملاء",
    "التقارير الأساسية"
  ];

  const proFeatures = [
    "كل مميزات الخطة المجانية",
    "المتجر الإلكتروني الكامل",
    "روابط المنتجات والعروض",
    "إدارة طلبات المتجر",
    "منتجات غير محدودة",
    "تقارير متقدمة وتحليلات",
    "دعم فني أولوية",
    "تخصيص العلامة التجارية"
  ];

  const isExpired = expiresAt && new Date(expiresAt) < new Date();
  const isPro = currentPlan === "pro" && !isExpired;

  return (
    <MainLayout>
      <div className="p-6 max-w-5xl mx-auto" dir="rtl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">اختر خطتك المناسبة</span>
          </div>
          <h1 className="text-4xl font-bold mb-3">خطط الاشتراك</h1>
          <p className="text-muted-foreground text-lg">
            اختر الخطة المناسبة لنمو أعمالك
          </p>
        </div>

        {/* Current Plan Status */}
        {currentPlan === "pro" && (
          <Card className="mb-8 border-primary bg-primary/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-semibold">أنت مشترك في خطة Pro</p>
                  {expiresAt && (
                    <p className="text-sm text-muted-foreground">
                      {isExpired ? (
                        <span className="text-destructive">انتهى الاشتراك في {format(new Date(expiresAt), "d MMMM yyyy", { locale: ar })}</span>
                      ) : (
                        <span>ينتهي في {format(new Date(expiresAt), "d MMMM yyyy", { locale: ar })}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              {isExpired && (
                <Badge variant="destructive">منتهي</Badge>
              )}
            </CardContent>
          </Card>
        )}

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-muted p-1 rounded-lg inline-flex">
            <Button
              variant={billingCycle === "monthly" ? "default" : "ghost"}
              size="sm"
              onClick={() => setBillingCycle("monthly")}
            >
              شهري
            </Button>
            <Button
              variant={billingCycle === "yearly" ? "default" : "ghost"}
              size="sm"
              onClick={() => setBillingCycle("yearly")}
              className="relative"
            >
              سنوي
              <Badge className="absolute -top-2 -left-2 text-xs" variant="secondary">
                وفر 20%
              </Badge>
            </Button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <Card className={`relative ${currentPlan === "free" && !isExpired ? "border-primary" : ""}`}>
            {currentPlan === "free" && !isExpired && (
              <Badge className="absolute -top-3 right-4">خطتك الحالية</Badge>
            )}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-6 w-6" />
                الخطة المجانية
              </CardTitle>
              <CardDescription>للبدء واستكشاف النظام</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">0</span>
                <span className="text-muted-foreground mr-1">{pricing.currency}/شهر</span>
              </div>
              <ul className="space-y-3">
                {freeFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>
                {currentPlan === "free" ? "خطتك الحالية" : "خطة مجانية"}
              </Button>
            </CardFooter>
          </Card>

          {/* Pro Plan */}
          <Card className={`relative border-2 ${isPro ? "border-primary bg-primary/5" : "border-primary"}`}>
            <Badge className="absolute -top-3 right-4 bg-gradient-to-r from-primary to-purple-600">
              {isPro ? "خطتك الحالية" : "الأكثر شعبية"}
            </Badge>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-primary" />
                خطة Pro
              </CardTitle>
              <CardDescription>للشركات الجادة في النمو</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">
                  {billingCycle === "monthly" ? pricing.monthly : pricing.yearly}
                </span>
                <span className="text-muted-foreground mr-1">
                  {pricing.currency}/{billingCycle === "monthly" ? "شهر" : "سنة"}
                </span>
                {billingCycle === "yearly" && (
                  <p className="text-sm text-muted-foreground mt-1">
                    ({Math.round(pricing.yearly / 12)} {pricing.currency}/شهر)
                  </p>
                )}
              </div>
              <ul className="space-y-3">
                {proFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-primary shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                onClick={() => handleSubscribe(billingCycle)}
                disabled={loading || isPro}
              >
                {loading ? "جاري المعالجة..." : isPro ? "مشترك بالفعل" : `اشترك الآن - ${billingCycle === "monthly" ? pricing.monthly : pricing.yearly} ${pricing.currency}`}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Pro Features Showcase */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">مميزات خطة Pro</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Store className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">متجر إلكتروني كامل</h3>
                <p className="text-sm text-muted-foreground">
                  متجر احترافي لعرض منتجاتك واستقبال الطلبات
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <Link2 className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">روابط ذكية</h3>
                <p className="text-sm text-muted-foreground">
                  روابط للمنتجات والعروض والفواتير
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">تحليلات متقدمة</h3>
                <p className="text-sm text-muted-foreground">
                  تقارير تفصيلية لمتابعة أداء عملك
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
