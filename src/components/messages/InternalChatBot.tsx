import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Bot, 
  Send, 
  User, 
  RefreshCw,
  MessageCircle,
  Phone,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Message {
  id: string;
  sender_type: "user" | "bot" | "customer";
  message_content: string;
  message_type: string;
  recipient_phone?: string;
  recipient_name?: string;
  created_at: string;
}

interface InternalChatBotProps {
  recipientPhone?: string;
  recipientName?: string;
}

export const InternalChatBot = ({ recipientPhone, recipientName }: InternalChatBotProps) => {
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [phone, setPhone] = useState(recipientPhone || "");
  const [name, setName] = useState(recipientName || "");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Fetch messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ["internal_messages", tenant?.id, phone],
    queryFn: async () => {
      if (!tenant?.id) return [];
      
      let query = supabase
        .from("internal_messages")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: true })
        .limit(50);
      
      if (phone) {
        query = query.eq("recipient_phone", phone);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!tenant?.id,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      setIsTyping(true);
      
      const { data, error } = await supabase.functions.invoke("internal-chat", {
        body: {
          message,
          recipientPhone: phone,
          recipientName: name,
          tenantId: tenant?.id,
          messageType: "text",
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setIsTyping(false);
      queryClient.invalidateQueries({ queryKey: ["internal_messages"] });
      
      if (data.aiResponse) {
        toast.success("تم الرد بنجاح! 🤖");
      }
    },
    onError: (error) => {
      setIsTyping(false);
      console.error("Error sending message:", error);
      toast.error("حدث خطأ في إرسال الرسالة");
    },
  });

  // Handle send
  const handleSend = () => {
    if (!input.trim()) return;
    
    sendMessage.mutate(input);
    setInput("");
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Realtime subscription
  useEffect(() => {
    if (!tenant?.id) return;

    const channel = supabase
      .channel("internal_messages_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "internal_messages",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["internal_messages"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, queryClient]);

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          بوت المحادثة الذكي
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            AI مدعوم
          </Badge>
        </CardTitle>
        <CardDescription>
          تحدث مع البوت الذكي لإنشاء رسائل احترافية للعملاء
        </CardDescription>
        
        {/* Recipient Info */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="رقم الهاتف"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              className="h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="اسم العميل"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-3 pt-0">
        {/* Messages Area */}
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages && messages.length > 0 ? (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_type === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      msg.sender_type === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {msg.sender_type === "bot" ? (
                        <Bot className="h-3 w-3" />
                      ) : (
                        <User className="h-3 w-3" />
                      )}
                      <span className="text-xs opacity-70">
                        {msg.sender_type === "bot" ? "البوت" : "أنت"}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{msg.message_content}</p>
                    <p className="text-[10px] opacity-50 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString("ar-EG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">ابدأ المحادثة مع البوت الذكي</p>
                <p className="text-xs mt-1">اكتب رسالتك وسيساعدك في صياغة ردود احترافية</p>
              </div>
            )}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Bot className="h-3 w-3" />
                    <span className="text-xs">البوت يكتب...</span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce delay-100" />
                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="flex gap-2 mt-3 pt-3 border-t">
          <Input
            placeholder="اكتب رسالتك هنا... (مثال: اكتب رسالة ترحيب للعميل)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sendMessage.isPending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sendMessage.isPending}
            size="icon"
          >
            {sendMessage.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInput("اكتب رسالة ترحيب للعميل")}
            className="text-xs"
          >
            رسالة ترحيب
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInput("اكتب رسالة شكر بعد الشراء")}
            className="text-xs"
          >
            شكر بعد الشراء
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInput("اكتب رسالة تأكيد للطلب رقم 123")}
            className="text-xs"
          >
            تأكيد طلب
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInput("اكتب رسالة بأن الطلب تم شحنه")}
            className="text-xs"
          >
            تم الشحن
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
