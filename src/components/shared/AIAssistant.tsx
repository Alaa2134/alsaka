import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Loader2, Package, Users, MessageSquare } from "lucide-react";
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
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "مرحباً! أنا مساعدك الذكي. يمكنني مساعدتك في:\n• إضافة منتجات جديدة\n• إضافة عملاء جدد\n• البحث عن بيانات\n\nجرب: \"أضف منتج قميص بسعر 150\"",
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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: {
          prompt: input.trim(),
          tenantId: tenant?.id,
        },
      });

      if (error) {
        throw error;
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message || "تم تنفيذ الطلب",
        action: data.action,
        success: data.success,
      };

      setMessages((prev) => [...prev, aiResponse]);

      // Refresh data if something was added
      if (data.action === "add_product" && data.success) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
        toast.success("تم إضافة المنتج بنجاح", {
          description: data.insertedData?.name,
        });
      } else if (data.action === "add_client" && data.success) {
        queryClient.invalidateQueries({ queryKey: ["clients"] });
        toast.success("تم إضافة العميل بنجاح", {
          description: data.insertedData?.name,
        });
      } else if (data.action === "error") {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("AI Assistant error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "حدث خطأ في الاتصال. حاول مرة أخرى.",
      };
      setMessages((prev) => [...prev, errorMessage]);
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

  const getActionIcon = (action?: string) => {
    switch (action) {
      case "add_product":
        return <Package className="w-4 h-4 text-success" />;
      case "add_client":
        return <Users className="w-4 h-4 text-success" />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full gradient-primary shadow-glow flex items-center justify-center hover:scale-110 transition-transform"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-primary-foreground" />
        ) : (
          <Bot className="w-6 h-6 text-primary-foreground" />
        )}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 left-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-card rounded-2xl shadow-2xl border border-border animate-scale-in overflow-hidden">
          {/* Header */}
          <div className="gradient-primary p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-background/20 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-primary-foreground">المساعد الذكي</h3>
              <p className="text-xs text-primary-foreground/70">جاهز للمساعدة</p>
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
                    {msg.action && msg.success && (
                      <div className="flex items-center gap-2 mb-2 text-sm opacity-80">
                        {getActionIcon(msg.action)}
                        <span>تم التنفيذ</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-end">
                  <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
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
            <p className="text-xs text-muted-foreground mt-2 text-center">
              مثال: "أضف عميل محمد رقم 055" أو "أضف منتج لابتوب بسعر 3000"
            </p>
          </div>
        </div>
      )}
    </>
  );
};
