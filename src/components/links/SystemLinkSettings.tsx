import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Settings, 
  Building2, 
  Link2, 
  Check, 
  X,
  Package,
  ShoppingCart,
  FileText,
  CreditCard,
  Tag,
  Save,
  Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TenantLinkSettings {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  links_enabled: boolean;
  allowed_link_types: string[];
  max_links_per_month: number;
  link_default_expiry_days: number;
  current_link_count: number;
}

const linkTypes = [
  { id: 'product', label: 'روابط المنتجات', icon: Package },
  { id: 'cart', label: 'روابط السلة', icon: ShoppingCart },
  { id: 'invoice', label: 'روابط الفواتير', icon: FileText },
  { id: 'payment', label: 'روابط الدفع', icon: CreditCard },
  { id: 'offer', label: 'روابط العروض', icon: Tag },
];

export const SystemLinkSettings = () => {
  const [tenants, setTenants] = useState<TenantLinkSettings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setIsLoading(true);
    try {
      // Fetch tenants with their settings
      const { data: tenantsData } = await supabase
        .from('tenants')
        .select('id, name, slug')
        .eq('is_active', true);

      if (!tenantsData) return;

      // Fetch company settings for each tenant
      const { data: settingsData } = await supabase
        .from('company_settings')
        .select('*');

      // Fetch link counts
      const { data: linksData } = await supabase
        .from('store_links')
        .select('tenant_id');

      const linkCounts = new Map<string, number>();
      linksData?.forEach(link => {
        const count = linkCounts.get(link.tenant_id) || 0;
        linkCounts.set(link.tenant_id, count + 1);
      });

      const combined: TenantLinkSettings[] = tenantsData.map(tenant => {
        const settings = settingsData?.find(s => s.tenant_id === tenant.id);
        return {
          id: settings?.id || '',
          tenant_id: tenant.id,
          tenant_name: tenant.name,
          tenant_slug: tenant.slug,
          links_enabled: settings?.links_enabled ?? true,
          allowed_link_types: settings?.allowed_link_types || ['product', 'cart', 'invoice', 'payment', 'offer'],
          max_links_per_month: settings?.max_links_per_month || 100,
          link_default_expiry_days: settings?.link_default_expiry_days || 30,
          current_link_count: linkCounts.get(tenant.id) || 0,
        };
      });

      setTenants(combined);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTenantSettings = async (tenantId: string, updates: Partial<TenantLinkSettings>) => {
    setSavingId(tenantId);
    try {
      const { error } = await supabase
        .from('company_settings')
        .update({
          links_enabled: updates.links_enabled,
          allowed_link_types: updates.allowed_link_types,
          max_links_per_month: updates.max_links_per_month,
          link_default_expiry_days: updates.link_default_expiry_days,
        })
        .eq('tenant_id', tenantId);

      if (error) throw error;

      setTenants(prev => prev.map(t => 
        t.tenant_id === tenantId ? { ...t, ...updates } : t
      ));

      toast({
        title: "تم الحفظ",
        description: "تم تحديث إعدادات الروابط بنجاح",
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل في حفظ الإعدادات",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const toggleLinkType = (tenantId: string, linkType: string) => {
    const tenant = tenants.find(t => t.tenant_id === tenantId);
    if (!tenant) return;

    const newTypes = tenant.allowed_link_types.includes(linkType)
      ? tenant.allowed_link_types.filter(t => t !== linkType)
      : [...tenant.allowed_link_types, linkType];

    updateTenantSettings(tenantId, { allowed_link_types: newTypes });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">إعدادات روابط الشركات</h2>
          <p className="text-sm text-muted-foreground">
            تحكم في صلاحيات وحدود الروابط لكل شركة
          </p>
        </div>
      </div>

      {/* Tenants List */}
      <div className="space-y-4">
        {tenants.map((tenant, index) => (
          <motion.div
            key={tenant.tenant_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={!tenant.links_enabled ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{tenant.tenant_name}</CardTitle>
                      <p className="text-sm text-muted-foreground font-mono">
                        {tenant.tenant_slug}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={tenant.links_enabled ? "default" : "secondary"}>
                      {tenant.current_link_count} / {tenant.max_links_per_month} رابط
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`enabled-${tenant.tenant_id}`} className="text-sm">
                        تفعيل الروابط
                      </Label>
                      <Switch
                        id={`enabled-${tenant.tenant_id}`}
                        checked={tenant.links_enabled}
                        onCheckedChange={(checked) => 
                          updateTenantSettings(tenant.tenant_id, { links_enabled: checked })
                        }
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Allowed Link Types */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">أنواع الروابط المسموحة</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {linkTypes.map((type) => {
                        const Icon = type.icon;
                        const isAllowed = tenant.allowed_link_types.includes(type.id);
                        return (
                          <div
                            key={type.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                              isAllowed 
                                ? 'bg-primary/10 border-primary/30' 
                                : 'bg-muted/30 border-transparent'
                            }`}
                            onClick={() => toggleLinkType(tenant.tenant_id, type.id)}
                          >
                            <Checkbox 
                              checked={isAllowed}
                              onCheckedChange={() => toggleLinkType(tenant.tenant_id, type.id)}
                            />
                            <Icon className="h-4 w-4" />
                            <span className="text-sm">{type.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Limits */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm">الحد الأقصى للروابط شهرياً</Label>
                      <Input
                        type="number"
                        value={tenant.max_links_per_month}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 100;
                          setTenants(prev => prev.map(t => 
                            t.tenant_id === tenant.tenant_id 
                              ? { ...t, max_links_per_month: value } 
                              : t
                          ));
                        }}
                        onBlur={() => updateTenantSettings(tenant.tenant_id, { 
                          max_links_per_month: tenant.max_links_per_month 
                        })}
                        min={1}
                        max={10000}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">مدة انتهاء الرابط الافتراضية (أيام)</Label>
                      <Input
                        type="number"
                        value={tenant.link_default_expiry_days}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 30;
                          setTenants(prev => prev.map(t => 
                            t.tenant_id === tenant.tenant_id 
                              ? { ...t, link_default_expiry_days: value } 
                              : t
                          ));
                        }}
                        onBlur={() => updateTenantSettings(tenant.tenant_id, { 
                          link_default_expiry_days: tenant.link_default_expiry_days 
                        })}
                        min={1}
                        max={365}
                      />
                    </div>
                  </div>
                </div>

                {savingId === tenant.tenant_id && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    جاري الحفظ...
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
