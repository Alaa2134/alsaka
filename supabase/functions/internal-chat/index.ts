import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, recipientPhone, recipientName, tenantId, messageType = "text" } = await req.json();

    if (!message || !tenantId) {
      return new Response(
        JSON.stringify({ error: "Message and tenant ID are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Save user message to database
    const { error: userMsgError } = await supabase
      .from("internal_messages")
      .insert({
        tenant_id: tenantId,
        sender_type: "user",
        recipient_phone: recipientPhone,
        recipient_name: recipientName,
        message_content: message,
        message_type: messageType,
      });

    if (userMsgError) {
      console.error("Error saving user message:", userMsgError);
    }

    // Get AI response using Lovable AI
    let aiResponse = "";
    
    if (LOVABLE_API_KEY) {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `أنت مساعد ذكي لنظام فوترة ومتجر إلكتروني. ساعد المستخدمين في:
                - الرد على استفسارات العملاء
                - صياغة رسائل للفواتير والطلبات
                - الإجابة على الأسئلة المتعلقة بالمنتجات والخدمات
                - تقديم ردود مهذبة واحترافية بالعربية
                
                اجعل ردودك قصيرة ومفيدة وودودة. استخدم الإيموجي بشكل معتدل.`
              },
              { role: "user", content: message }
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          aiResponse = data.choices?.[0]?.message?.content || "عذراً، لم أتمكن من معالجة طلبك.";
        } else if (response.status === 429) {
          aiResponse = "⏳ تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً.";
        } else if (response.status === 402) {
          aiResponse = "💳 يرجى إضافة رصيد للاستمرار في استخدام المساعد الذكي.";
        } else {
          aiResponse = "حدث خطأ في الاتصال بالمساعد الذكي.";
        }
      } catch (aiError) {
        console.error("AI error:", aiError);
        aiResponse = "عذراً، حدث خطأ في المساعد الذكي. يرجى المحاولة لاحقاً.";
      }
    } else {
      // Fallback responses without AI
      aiResponse = generateSmartResponse(message, recipientName || "العميل");
    }

    // Save AI response to database
    const { data: botMessage, error: botMsgError } = await supabase
      .from("internal_messages")
      .insert({
        tenant_id: tenantId,
        sender_type: "bot",
        recipient_phone: recipientPhone,
        recipient_name: recipientName,
        message_content: aiResponse,
        message_type: "ai_response",
      })
      .select()
      .single();

    if (botMsgError) {
      console.error("Error saving bot message:", botMsgError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        aiResponse,
        messageId: botMessage?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in internal chat:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Smart fallback responses based on message content
function generateSmartResponse(message: string, customerName: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes("فاتورة") || lowerMessage.includes("invoice")) {
    return `📄 مرحباً ${customerName}!\n\nتم استلام طلبك بخصوص الفاتورة. سيتم مراجعتها وإرسال التفاصيل قريباً.\n\nشكراً لتواصلك معنا! 💙`;
  }
  
  if (lowerMessage.includes("طلب") || lowerMessage.includes("order")) {
    return `📦 مرحباً ${customerName}!\n\nنشكرك على تواصلك. طلبك قيد المراجعة وسنوافيك بالتفاصيل.\n\nهل تحتاج مساعدة إضافية؟ 🤝`;
  }
  
  if (lowerMessage.includes("سعر") || lowerMessage.includes("تكلفة") || lowerMessage.includes("price")) {
    return `💰 مرحباً ${customerName}!\n\nشكراً لاستفسارك عن الأسعار. سيتم إرسال عرض السعر خلال وقت قصير.\n\nنحن سعداء بخدمتك! ✨`;
  }
  
  if (lowerMessage.includes("شكر") || lowerMessage.includes("thanks")) {
    return `🙏 العفو ${customerName}!\n\nسعداء بخدمتك دائماً. لا تتردد في التواصل معنا في أي وقت!\n\n💙 فريق المتجر`;
  }
  
  // Default response
  return `👋 مرحباً ${customerName}!\n\nتم استلام رسالتك وسنرد عليك في أقرب وقت.\n\nشكراً لتواصلك معنا! 💙`;
}
