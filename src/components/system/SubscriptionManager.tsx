import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Crown, 
  Building2, 
  Ban, 
  CheckCircle, 
  DollarSign,
} from "lucide-react";

interface SubscriptionPricing {
  pro_price: number;
  currency: string;
  billing_period: string;
}

interface TenantWithSettings {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  company_settings: {
    subscription_type: string;
    subscription_expires_at: string | null;
    store_access_blocked: boolean;
    store_enabled: boolean;
  }[] | null;
}

export const SubscriptionManager = () => {
  const queryClient = useQueryClient();

  // Fetch subscription pricing
  const { data: pricing, refetch: refetchPricing } = useQuery({
    queryKey: ["subscription-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "subscription_pricing")
        .single();
      
      if (error) return { pro_price: 100, currency: "EGP", billing_period: "monthly" };
      const val = data?.value as Record<string, unknown>;
      return {
        pro_price: Number(val?.pro_price) || 100,
        currency: String(val?.currency) || "EGP",
        billing_period: String(val?.billing_period) || "monthly",
      } as SubscriptionPricing;
    },
  });

  const [pricingForm, setPricingForm] = useState<SubscriptionPricing>({
    pro_price: 100,
    currency: "EGP",
    billing_period: "monthly",
  });

  useEffect(() => {
    if (pricing) {
      setPricingForm(pricing);
    }
  }, [pricing]);

  // Fetch all tenants with their settings
  const { data: tenants, isLoading } = useQuery({
    queryKey: ["tenants-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select(`
          id, name, slug, is_active,
          company_settings (
            subscription_type,
            subscription_expires_at,
            store_access_blocked,
            store_enabled
          )
        `)
        .order("name");
      
      if (error) throw error;
      return (data || []) as unknown as TenantWithSettings[];
    },
  });

  // Update pricing
  const updatePricing = useMutation({
    mutationFn: async (newPricing: SubscriptionPricing) => {
      const { error } = await supabase
        .from("system_settings")
        .update({ value: JSON.parse(JSON.stringify(newPricing)) })
        .eq("key", "subscription_pricing");
      
      if (error) throw error;
    },
    onSuccess: () => {
      refetchPricing();
      toast.success("تم تحديث أسعار الاشتراكات");
    },
    onError: () => {
      toast.error("فشل في تحديث الأسعار");
    },
  });

  // Update tenant subscription
  const updateSubscription = useMutation({
    mutationFn: async ({ 
      tenantId, 
      subscriptionType, 
      expiresAt, 
      storeBlocked 
    }: { 
      tenantId: string; 
      subscriptionType: string; 
      expiresAt: string | null;
      storeBlocked: boolean;
    }) => {
      const { error } = await supabase
        .from("company_settings")
        .update({ 
          subscription_type: subscriptionType,
          subscription_expires_at: expiresAt,
          store_access_blocked: storeBlocked,
        })
        .eq("tenant_id", tenantId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants-subscriptions"] });
      toast.success("تم تحديث اشتراك الشركة");
    },
    onError: () => {
      toast.error("فشل في تحديث الاشتراك");
    },
  });

  const handleUpdateSubscription = (tenantId: string, type: "free" | "pro", blocked: boolean) => {
    const expiresAt = type === "pro" 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() 
      : null;
    
    updateSubscription.mutate({
      tenantId,
      subscriptionType: type,
      expiresAt,
      storeBlocked: blocked,
    });
  };

  const getSettings = (tenant: TenantWithSettings) => {
    const settings = tenant.company_settings?.[0];
    return settings || {
      subscription_type: "free",
      subscription_expires_at: null,
      store_access_blocked: false,
      store_enabled: true,
    };
  };

  return (
    <div className="space-y-6">
      {/* Pricing Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            أسعار الاشتراكات
          </CardTitle>
          <CardDescription>تحديد أسعار اشتراكات Pro للشركات</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>سعر اشتراك Pro</Label>
              <Input
                type="number"
                value={pricingForm.pro_price}
                onChange={(e) => setPricingForm({ ...pricingForm, pro_price: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>العملة</Label>
              <Input
                value={pricingForm.currency}
                onChange={(e) => setPricingForm({ ...pricingForm, currency: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>فترة الفوترة</Label>
              <select
                value={pricingForm.billing_period}
                onChange={(e) => setPricingForm({ ...pricingForm, billing_period: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3"
              >
                <option value="monthly">شهري</option>
                <option value="yearly">سنوي</option>
              </select>
            </div>
          </div>
          <Button 
            onClick={() => updatePricing.mutate(pricingForm)} 
            className="mt-4"
            disabled={updatePricing.isPending}
          >
            حفظ الأسعار
          </Button>
        </CardContent>
      </Card>

      {/* Tenants List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            إدارة اشتراكات الشركات
          </CardTitle>
          <CardDescription>التحكم في اشتراكات والوصول للمتجر لكل شركة</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : (
            <div className="space-y-3">
              {tenants?.map((tenant) => {
                const settings = getSettings(tenant);
                const isPro = settings.subscription_type === "pro";
                const isBlocked = settings.store_access_blocked;
                const expiresAt = settings.subscription_expires_at 
                  ? new Date(settings.subscription_expires_at) 
                  : null;
                const isExpired = expiresAt && expiresAt < new Date();

                return (
                  <div 
                    key={tenant.id} 
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{tenant.name}</h3>
                          {isPro && !isExpired ? (
                            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                              <Crown className="h-3 w-3 mr-1" />
                              Pro
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Free</Badge>
                          )}
                          {isBlocked && (
                            <Badge variant="destructive">
                              <Ban className="h-3 w-3 mr-1" />
                              المتجر محظور
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {tenant.slug}
                          {expiresAt && (
                            <span className={`mr-2 ${isExpired ? "text-destructive" : ""}`}>
                              • ينتهي: {expiresAt.toLocaleDateString("ar-EG")}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Quick Actions */}
                      <Button
                        variant={isPro ? "outline" : "default"}
                        size="sm"
                        onClick={() => handleUpdateSubscription(tenant.id, isPro ? "free" : "pro", isBlocked)}
                        className={isPro ? "" : "bg-gradient-to-r from-yellow-500 to-orange-500"}
                      >
                        {isPro ? "إلغاء Pro" : "ترقية لـ Pro"}
                      </Button>
                      
                      <Button
                        variant={isBlocked ? "default" : "destructive"}
                        size="sm"
                        onClick={() => handleUpdateSubscription(
                          tenant.id, 
                          isPro ? "pro" : "free", 
                          !isBlocked
                        )}
                      >
                        {isBlocked ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            فتح المتجر
                          </>
                        ) : (
                          <>
                            <Ban className="h-4 w-4 mr-1" />
                            حظر المتجر
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
