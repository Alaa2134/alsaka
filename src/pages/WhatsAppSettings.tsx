import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MessageCircle, 
  Settings, 
  History, 
  Bell,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw
} from "lucide-react";
import { WhatsAppQRRegistration } from "@/components/whatsapp/WhatsAppQRRegistration";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";

interface NotificationLog {
  id: string;
  client_phone: string;
  notification_type: string;
  message_content: string;
  sent_at: string;
  status: string;
}

const WhatsAppSettings = () => {
  const { tenant } = useAuth();
  
  // Fetch notification logs
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["whatsapp_logs", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      
      const { data, error } = await supabase
        .from("whatsapp_notifications_log")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("sent_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as NotificationLog[];
    },
    enabled: !!tenant?.id,
  });
  
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      order_tracking: "رابط تتبع",
      invoice: "فاتورة",
      order_status: "تحديث طلب",
    };
    return labels[type] || type;
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-100 text-green-700">تم الإرسال</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-700">فشل</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-700">قيد الانتظار</Badge>;
    }
  };

  return (
    <MainLayout>
      <Helmet>
        <title>إعدادات الواتساب | نظام الفواتير</title>
        <meta name="description" content="إعدادات تكامل الواتساب للإشعارات التلقائية" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MessageCircle className="h-8 w-8 text-green-500" />
              إعدادات الواتساب
            </h1>
            <p className="text-muted-foreground mt-1">
              إدارة تكامل الواتساب والإشعارات التلقائية للعملاء
            </p>
          </div>
        </div>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              الإعدادات
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              سجل الإرسال
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="settings" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* WhatsApp Registration */}
              <WhatsAppQRRegistration />
              
              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    إحصائيات الإشعارات
                  </CardTitle>
                  <CardDescription>
                    ملخص الإشعارات المرسلة خلال الـ 30 يوم الماضية
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p className="text-2xl font-bold text-green-600">
                        {logs?.filter(l => l.status === "sent").length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">تم الإرسال</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                      <p className="text-2xl font-bold text-yellow-600">
                        {logs?.filter(l => l.status === "pending").length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">قيد الانتظار</p>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <XCircle className="h-8 w-8 mx-auto mb-2 text-red-600" />
                      <p className="text-2xl font-bold text-red-600">
                        {logs?.filter(l => l.status === "failed").length || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">فشل</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>روابط التتبع</span>
                      <span className="font-medium">
                        {logs?.filter(l => l.notification_type === "order_tracking").length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>الفواتير</span>
                      <span className="font-medium">
                        {logs?.filter(l => l.notification_type === "invoice").length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>تحديثات الطلبات</span>
                      <span className="font-medium">
                        {logs?.filter(l => l.notification_type === "order_status").length || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  سجل الإشعارات المرسلة
                </CardTitle>
                <CardDescription>
                  آخر 50 إشعار تم إرساله عبر الواتساب
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : logs && logs.length > 0 ? (
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <Send className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{log.client_phone}</p>
                              <Badge variant="outline">{getTypeLabel(log.notification_type)}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {log.message_content.substring(0, 50)}...
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          {getStatusBadge(log.status)}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(log.sent_at).toLocaleString("ar-EG")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>لا توجد إشعارات مرسلة بعد</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default WhatsAppSettings;