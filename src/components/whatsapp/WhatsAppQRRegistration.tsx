import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  MessageCircle, 
  Check, 
  Phone,
  Bell,
  FileText,
  Truck,
  RefreshCw,
  Key,
  Shield,
  ExternalLink,
  HelpCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { useWhatsAppSettings, useSaveWhatsAppSettings } from "@/hooks/useWhatsAppSettings";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const WhatsAppQRRegistration = () => {
  const { tenant } = useAuth();
  const { data: settings, isLoading } = useWhatsAppSettings();
  const saveSettings = useSaveWhatsAppSettings();
  
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [autoOrderTracking, setAutoOrderTracking] = useState(true);
  const [autoInvoices, setAutoInvoices] = useState(true);
  const [autoOrderNotifications, setAutoOrderNotifications] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  
  useEffect(() => {
    if (settings) {
      setWhatsappNumber(settings.whatsapp_number || "");
      setPhoneNumberId(settings.whatsapp_phone_id || "");
      setAutoOrderTracking(settings.auto_send_order_tracking);
      setAutoInvoices(settings.auto_send_invoices);
      setAutoOrderNotifications(settings.auto_send_order_notifications);
      // Don't show decrypted token for security
      if (settings.whatsapp_access_token_encrypted) {
        setAccessToken("••••••••••••••••"); // Masked
      }
    }
  }, [settings]);
  
  const handleSave = async () => {
    if (!whatsappNumber.trim()) {
      toast.error("يرجى إدخال رقم الواتساب");
      return;
    }
    
    // Prepare update data
    const updateData: any = {
      whatsapp_number: whatsappNumber,
      whatsapp_phone_id: phoneNumberId,
      auto_send_order_tracking: autoOrderTracking,
      auto_send_invoices: autoInvoices,
      auto_send_order_notifications: autoOrderNotifications,
    };
    
    // Only update token if it's changed (not masked)
    if (accessToken && !accessToken.includes("•")) {
      // Encrypt the token before saving
      if (tenant?.id) {
        const { data: encrypted } = await supabase.rpc("encrypt_company_data", {
          plain_text: accessToken,
          tenant_uuid: tenant.id,
        });
        
        if (encrypted) {
          updateData.whatsapp_access_token_encrypted = encrypted;
        }
      }
    }
    
    await saveSettings.mutateAsync(updateData);
  };
  
  const testConnection = async () => {
    if (!phoneNumberId || (!accessToken || accessToken.includes("•"))) {
      toast.error("يرجى إدخال بيانات WhatsApp API كاملة");
      return;
    }
    
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { 
          to: whatsappNumber, 
          message: `✅ اختبار اتصال WhatsApp API ناجح!\n\n🏪 ${tenant?.name || "متجرك"}\n📅 ${new Date().toLocaleString("ar-EG")}`,
          tenantId: tenant?.id
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success("✅ تم إرسال رسالة الاختبار بنجاح!");
        
        // Mark as verified
        await saveSettings.mutateAsync({
          is_verified: true,
          connection_status: 'connected',
          last_connected_at: new Date().toISOString(),
        });
      } else {
        throw new Error(data?.message || "فشل الاختبار");
      }
    } catch (err: any) {
      console.error("Test failed:", err);
      toast.error(`فشل الاختبار: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isConfigured = settings?.whatsapp_access_token_encrypted && settings?.whatsapp_phone_id;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-500" />
          إعداد WhatsApp Business API
        </CardTitle>
        <CardDescription>
          سجل بيانات WhatsApp Business API الخاصة بشركتك للإرسال التلقائي
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isConfigured ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
              {isConfigured ? <Check className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
            </div>
            <div>
              <p className="font-medium">
                {isConfigured ? "تم الإعداد" : "غير مكتمل"}
              </p>
              <p className="text-sm text-muted-foreground">
                {settings?.whatsapp_number || "لم يتم تسجيل رقم"}
              </p>
            </div>
          </div>
          <Badge variant={isConfigured ? "default" : "secondary"} className={isConfigured ? "bg-green-500" : ""}>
            {isConfigured ? "جاهز للإرسال" : "يحتاج إعداد"}
          </Badge>
        </div>
        
        {/* Help Link */}
        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-blue-700 dark:text-blue-400">كيفية الحصول على بيانات WhatsApp API (مجاناً)</p>
              <ol className="mt-2 text-sm text-blue-600 dark:text-blue-300 space-y-1 list-decimal list-inside">
                <li>اذهب إلى <a href="https://developers.facebook.com" target="_blank" rel="noopener" className="underline">developers.facebook.com</a></li>
                <li>أنشئ تطبيق جديد واختر "Business"</li>
                <li>أضف منتج "WhatsApp" للتطبيق</li>
                <li>انسخ Access Token و Phone Number ID</li>
              </ol>
              <Button variant="link" className="p-0 h-auto mt-2 text-blue-700" onClick={() => window.open("https://developers.facebook.com/docs/whatsapp/cloud-api/get-started", "_blank")}>
                <ExternalLink className="h-4 w-4 ml-1" />
                دليل التفعيل الكامل
              </Button>
            </div>
          </div>
        </div>
        
        {/* API Credentials */}
        <div className="space-y-4 p-4 border rounded-lg bg-card">
          <h4 className="font-medium flex items-center gap-2">
            <Key className="h-4 w-4" />
            بيانات WhatsApp Business API
          </h4>
          
          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="whatsapp">رقم الواتساب</Label>
            <Input
              id="whatsapp"
              type="tel"
              placeholder="مثال: 201012345678"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              dir="ltr"
            />
          </div>
          
          {/* Phone Number ID */}
          <div className="space-y-2">
            <Label htmlFor="phoneId">Phone Number ID</Label>
            <Input
              id="phoneId"
              type="text"
              placeholder="مثال: 123456789012345"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              dir="ltr"
            />
          </div>
          
          {/* Access Token */}
          <div className="space-y-2">
            <Label htmlFor="token">Access Token</Label>
            <div className="relative">
              <Input
                id="token"
                type={showToken ? "text" : "password"}
                placeholder="الصق Access Token هنا"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                dir="ltr"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" />
              يتم تشفير Token وحفظه بشكل آمن
            </p>
          </div>
          
          {/* Test Button */}
          <Button 
            variant="outline" 
            onClick={testConnection}
            disabled={isTesting || !phoneNumberId || !accessToken || accessToken.includes("•")}
            className="w-full"
          >
            {isTesting ? (
              <RefreshCw className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <MessageCircle className="h-4 w-4 ml-2" />
            )}
            اختبار الاتصال (إرسال رسالة تجريبية)
          </Button>
        </div>
        
        <Separator />
        
        {/* Auto-send Settings */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            الإرسال التلقائي للعملاء
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium text-sm">روابط تتبع الطلبات</p>
                  <p className="text-xs text-muted-foreground">
                    إرسال رابط التتبع عند إنشاء طلب جديد
                  </p>
                </div>
              </div>
              <Switch
                checked={autoOrderTracking}
                onCheckedChange={setAutoOrderTracking}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-sm">الفواتير</p>
                  <p className="text-xs text-muted-foreground">
                    إرسال تفاصيل الفاتورة عند الحفظ
                  </p>
                </div>
              </div>
              <Switch
                checked={autoInvoices}
                onCheckedChange={setAutoInvoices}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium text-sm">إشعارات الطلبات</p>
                  <p className="text-xs text-muted-foreground">
                    إرسال تحديث عند تغيير حالة الطلب
                  </p>
                </div>
              </div>
              <Switch
                checked={autoOrderNotifications}
                onCheckedChange={setAutoOrderNotifications}
              />
            </div>
          </div>
        </div>
        
        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          className="w-full"
          disabled={saveSettings.isPending}
        >
          {saveSettings.isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin ml-2" />
          ) : (
            <Check className="h-4 w-4 ml-2" />
          )}
          حفظ الإعدادات
        </Button>
      </CardContent>
    </Card>
  );
};
