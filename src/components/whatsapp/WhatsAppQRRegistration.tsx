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
  QrCode, 
  Check, 
  Phone,
  Bell,
  FileText,
  Truck,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { useWhatsAppSettings, useSaveWhatsAppSettings } from "@/hooks/useWhatsAppSettings";
import { useAuth } from "@/contexts/AuthContext";

export const WhatsAppQRRegistration = () => {
  const { tenant } = useAuth();
  const { data: settings, isLoading } = useWhatsAppSettings();
  const saveSettings = useSaveWhatsAppSettings();
  
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [autoOrderTracking, setAutoOrderTracking] = useState(true);
  const [autoInvoices, setAutoInvoices] = useState(true);
  const [autoOrderNotifications, setAutoOrderNotifications] = useState(true);
  const [showQR, setShowQR] = useState(false);
  
  useEffect(() => {
    if (settings) {
      setWhatsappNumber(settings.whatsapp_number || "");
      setAutoOrderTracking(settings.auto_send_order_tracking);
      setAutoInvoices(settings.auto_send_invoices);
      setAutoOrderNotifications(settings.auto_send_order_notifications);
    }
  }, [settings]);
  
  const handleSave = async () => {
    if (!whatsappNumber.trim()) {
      toast.error("يرجى إدخال رقم الواتساب");
      return;
    }
    
    await saveSettings.mutateAsync({
      whatsapp_number: whatsappNumber,
      auto_send_order_tracking: autoOrderTracking,
      auto_send_invoices: autoInvoices,
      auto_send_order_notifications: autoOrderNotifications,
    });
  };
  
  const generateQRLink = () => {
    // Generate a registration message for the store
    const message = `🏪 تسجيل متجر جديد

اسم المتجر: ${tenant?.name || "غير محدد"}
رقم الواتساب: ${whatsappNumber}

أرغب في تفعيل إشعارات الواتساب التلقائية:
${autoOrderTracking ? "✅" : "❌"} روابط تتبع الطلبات
${autoInvoices ? "✅" : "❌"} الفواتير
${autoOrderNotifications ? "✅" : "❌"} إشعارات الطلبات`;

    return encodeURIComponent(message);
  };
  
  const openWhatsAppRegistration = () => {
    if (!whatsappNumber.trim()) {
      toast.error("يرجى إدخال رقم الواتساب أولاً");
      return;
    }
    
    const cleanPhone = whatsappNumber.replace(/\D/g, "");
    const message = generateQRLink();
    
    // Open WhatsApp with pre-filled message
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
    setShowQR(true);
  };
  
  // Generate QR code URL using a free QR code API
  const qrCodeUrl = whatsappNumber 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://wa.me/${whatsappNumber.replace(/\D/g, "")}`)}`
    : "";

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-500" />
          تسجيل الواتساب
        </CardTitle>
        <CardDescription>
          سجل رقم الواتساب لإرسال الإشعارات والروابط تلقائياً للعملاء
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${settings?.is_verified ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
              {settings?.is_verified ? <Check className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
            </div>
            <div>
              <p className="font-medium">
                {settings?.is_verified ? "متصل" : "غير متصل"}
              </p>
              <p className="text-sm text-muted-foreground">
                {settings?.whatsapp_number || "لم يتم تسجيل رقم"}
              </p>
            </div>
          </div>
          <Badge variant={settings?.is_verified ? "default" : "secondary"}>
            {settings?.is_verified ? "مفعل" : "في الانتظار"}
          </Badge>
        </div>
        
        {/* Phone Number Input */}
        <div className="space-y-2">
          <Label htmlFor="whatsapp">رقم الواتساب</Label>
          <div className="flex gap-2">
            <Input
              id="whatsapp"
              type="tel"
              placeholder="مثال: 201012345678"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              dir="ltr"
              className="flex-1"
            />
            <Button variant="outline" onClick={openWhatsAppRegistration}>
              <QrCode className="h-4 w-4 ml-2" />
              مسح QR
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            أدخل الرقم بالكامل مع كود الدولة (مثال: 201012345678)
          </p>
        </div>
        
        {/* QR Code Display */}
        {whatsappNumber && (
          <div className="flex flex-col items-center gap-4 p-6 border-2 border-dashed rounded-lg bg-white">
            <img 
              src={qrCodeUrl}
              alt="WhatsApp QR Code"
              className="w-40 h-40 rounded-lg shadow-md"
            />
            <div className="text-center">
              <p className="font-medium">امسح الـ QR Code</p>
              <p className="text-sm text-muted-foreground">
                أو اضغط للفتح في الواتساب
              </p>
            </div>
            <Button variant="outline" onClick={openWhatsAppRegistration} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              فتح في واتساب
            </Button>
          </div>
        )}
        
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
