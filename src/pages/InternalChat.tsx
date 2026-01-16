import { Helmet } from "react-helmet-async";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  MessageSquare, 
  History,
  Sparkles,
  TrendingUp,
  Users
} from "lucide-react";
import { InternalChatBot } from "@/components/messages/InternalChatBot";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const InternalChat = () => {
  const { tenant } = useAuth();

  // Stats query
  const { data: stats } = useQuery({
    queryKey: ["internal_messages_stats", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;
      
      const { data, error } = await supabase
        .from("internal_messages")
        .select("sender_type, message_type")
        .eq("tenant_id", tenant.id);
      
      if (error) throw error;
      
      const total = data?.length || 0;
      const userMessages = data?.filter(m => m.sender_type === "user").length || 0;
      const botResponses = data?.filter(m => m.sender_type === "bot").length || 0;
      const aiResponses = data?.filter(m => m.message_type === "ai_response").length || 0;
      
      return { total, userMessages, botResponses, aiResponses };
    },
    enabled: !!tenant?.id,
  });

  // Recent conversations
  const { data: recentMessages } = useQuery({
    queryKey: ["recent_internal_messages", tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];
      
      const { data, error } = await supabase
        .from("internal_messages")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id,
  });

  return (
    <MainLayout>
      <Helmet>
        <title>بوت المحادثة الذكي | نظام الفواتير</title>
        <meta name="description" content="بوت ذكاء اصطناعي داخلي للمحادثات وإنشاء الرسائل" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bot className="h-8 w-8 text-primary" />
              بوت المحادثة الذكي
              <Badge className="gap-1 bg-gradient-to-r from-purple-500 to-pink-500">
                <Sparkles className="h-3 w-3" />
                AI مدمج
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1">
              استخدم الذكاء الاصطناعي لإنشاء رسائل احترافية للعملاء - بدون API خارجي
            </p>
          </div>
        </div>

        <Tabs defaultValue="chat" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              المحادثة
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              السجل
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Chat Bot */}
              <div className="lg:col-span-2">
                <InternalChatBot />
              </div>

              {/* Stats Sidebar */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      الإحصائيات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-3 bg-primary/10 rounded-lg">
                        <p className="text-2xl font-bold text-primary">
                          {stats?.total || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">إجمالي الرسائل</p>
                      </div>
                      <div className="text-center p-3 bg-green-500/10 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          {stats?.aiResponses || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">ردود AI</p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">رسائلك</span>
                        <span className="font-medium">{stats?.userMessages || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">ردود البوت</span>
                        <span className="font-medium">{stats?.botResponses || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      كيف تستخدم البوت؟
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>💬 اكتب طلبك بالعربية بشكل طبيعي</p>
                    <p>🎯 حدد اسم العميل ورقمه للتخصيص</p>
                    <p>✨ سيقوم البوت بإنشاء رسالة احترافية</p>
                    <p>📋 انسخ الرد وأرسله عبر أي تطبيق</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      أمثلة للطلبات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    <div className="p-2 bg-muted rounded-lg">
                      "اكتب رسالة ترحيب للعميل أحمد"
                    </div>
                    <div className="p-2 bg-muted rounded-lg">
                      "رد على استفسار عن سعر المنتج"
                    </div>
                    <div className="p-2 bg-muted rounded-lg">
                      "اكتب رسالة بأن الطلب جاهز للشحن"
                    </div>
                    <div className="p-2 bg-muted rounded-lg">
                      "صياغة رسالة شكر بعد الشراء"
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  سجل المحادثات الأخيرة
                </CardTitle>
                <CardDescription>
                  آخر 10 رسائل في النظام
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentMessages && recentMessages.length > 0 ? (
                  <div className="space-y-3">
                    {recentMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          msg.sender_type === "bot" 
                            ? "bg-primary/20 text-primary" 
                            : "bg-green-100 text-green-600"
                        }`}>
                          {msg.sender_type === "bot" ? (
                            <Bot className="h-4 w-4" />
                          ) : (
                            <Users className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {msg.sender_type === "bot" ? "بوت AI" : "أنت"}
                            </Badge>
                            {msg.recipient_name && (
                              <span className="text-xs text-muted-foreground">
                                إلى: {msg.recipient_name}
                              </span>
                            )}
                          </div>
                          <p className="text-sm line-clamp-2">{msg.message_content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(msg.created_at).toLocaleString("ar-EG")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>لا توجد محادثات سابقة</p>
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

export default InternalChat;
