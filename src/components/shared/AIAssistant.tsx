import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Loader2, Package, Users, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: string;
  success?: boolean;
}

export const AIAssistant = () => {
  const { tenant, user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "مرحباً! أنا مساعدك الذكي. يمكنني:\n• إضافة منتجات وعملاء\n• تحديث البيانات الموجودة\n• البحث والاستفسار\n\nجرب: \"أضف منتج لابتوب بسعر 5000\"",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Don't show if not logged in
  if (!user) return null;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      console.log('Sending to AI:', { prompt: currentInput, tenantId: tenant?.id });
      
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: {
          prompt: currentInput,
          tenantId: tenant?.id || null,
          userId: user?.id || null,
        },
      });

      console.log('AI Response:', data, error);

      if (error) {
        throw error;
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data?.message || "تم تنفيذ الطلب",
        action: data?.action,
        success: data?.success,
      };

      setMessages((prev) => [...prev, aiResponse]);

      // Refresh data if something was added or updated
      if ((data?.action === "add_product" || data?.action === "update_product") && data?.success) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast.success(data.action === "add_product" ? "تم إضافة المنتج" : "تم تحديث المنتج", {
          description: data.insertedData?.name || data.updatedData?.name,
        });
      } else if ((data?.action === "add_client" || data?.action === "update_client") && data?.success) {
        queryClient.invalidateQueries({ queryKey: ["clients"] });
        toast.success(data.action === "add_client" ? "تم إضافة العميل" : "تم تحديث العميل", {
          description: data.insertedData?.name || data.updatedData?.name,
        });
      } else if (data?.action === "error") {
        toast.error(data.message);
      }
    } catch (error: any) {
      console.error("AI Assistant error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `حدث خطأ: ${error?.message || "حاول مرة أخرى"}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast.error("خطأ في الاتصال بالمساعد الذكي");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getActionIcon = (action?: string, success?: boolean) => {
    if (!success) return null;
    switch (action) {
      case "add_product":
      case "update_product":
        return <Package className="w-4 h-4 text-green-500" />;
      case "add_client":
      case "update_client":
        return <Users className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full gradient-primary shadow-glow flex items-center justify-center hover:scale-110 transition-transform print:hidden"
        aria-label="المساعد الذكي"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-primary-foreground" />
        ) : (
          <Bot className="w-6 h-6 text-primary-foreground" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-card rounded-2xl shadow-2xl border border-border animate-scale-in overflow-hidden print:hidden">
          {/* Header */}
          <div className="gradient-primary p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-background/20 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-primary-foreground">المساعد الذكي</h3>
              <p className="text-xs text-primary-foreground/70">
                {tenant?.name || "جاهز للمساعدة"}
              </p>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="h-80 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-muted text-foreground rounded-tl-none"
                    }`}
                  >
                    {msg.action && msg.success !== undefined && (
                      <div className="flex items-center gap-2 mb-2 text-sm">
                        {getActionIcon(msg.action, msg.success)}
                        <span className={msg.success ? "text-green-600" : "text-red-500"}>
                          {msg.success ? "تم بنجاح" : "فشل"}
                        </span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-end">
                  <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">جاري المعالجة...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اكتب طلبك هنا..."
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <button 
                className="text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80"
                onClick={() => setInput("أضف منتج جديد اسمه ")}
              >
                + منتج
              </button>
              <button 
                className="text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80"
                onClick={() => setInput("أضف عميل جديد اسمه ")}
              >
                + عميل
              </button>
              <button 
                className="text-xs bg-muted px-2 py-1 rounded hover:bg-muted/80"
                onClick={() => setInput("اعرض المنتجات")}
              >
                🔍 بحث
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
