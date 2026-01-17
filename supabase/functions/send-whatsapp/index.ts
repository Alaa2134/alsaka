import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppMessage {
  to: string;
  message: string;
  tenantId?: string;
  templateName?: string;
  templateParams?: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, tenantId, templateName, templateParams }: WhatsAppMessage = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let accessToken: string | null = null;
    let phoneNumberId: string | null = null;

    // Try to get per-tenant credentials first
    if (tenantId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: settings } = await supabase
        .from("whatsapp_settings")
        .select("whatsapp_access_token_encrypted, whatsapp_phone_id")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (settings?.whatsapp_access_token_encrypted && settings?.whatsapp_phone_id) {
        // Decrypt the access token using database function
        const { data: decrypted } = await supabase.rpc("decrypt_company_data", {
          encrypted_text: settings.whatsapp_access_token_encrypted,
          tenant_uuid: tenantId,
        });
        
        if (decrypted) {
          accessToken = decrypted;
          phoneNumberId = settings.whatsapp_phone_id;
          console.log("Using per-tenant WhatsApp credentials for tenant:", tenantId);
        }
      }
    }

    // Fallback to global credentials if per-tenant not available
    if (!accessToken || !phoneNumberId) {
      accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || null;
      phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || null;
      
      if (accessToken && phoneNumberId) {
        console.log("Using global WhatsApp credentials");
      }
    }

    if (!accessToken || !phoneNumberId) {
      console.error("No WhatsApp configuration available");
      return new Response(
        JSON.stringify({ 
          error: "WhatsApp not configured", 
          message: "يرجى إعداد بيانات WhatsApp Business API في إعدادات الواتساب" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean phone number - remove any non-digit characters
    const cleanPhone = to.replace(/\D/g, "");
    
    // Add country code if not present (assuming Egypt +20)
    const formattedPhone = cleanPhone.startsWith("20") 
      ? cleanPhone 
      : cleanPhone.startsWith("0") 
        ? "20" + cleanPhone.slice(1) 
        : "20" + cleanPhone;

    let requestBody: any;

    if (templateName) {
      // Use template message
      requestBody = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
          name: templateName,
          language: { code: "ar" },
          components: templateParams ? [{
            type: "body",
            parameters: templateParams.map(param => ({ type: "text", text: param }))
          }] : undefined
        }
      };
    } else {
      // Use text message
      requestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: {
          preview_url: true,
          body: message
        }
      };
    }

    console.log("Sending WhatsApp message to:", formattedPhone);

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      console.error("WhatsApp API error:", responseData);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send WhatsApp message", 
          details: responseData,
          message: responseData.error?.message || "فشل إرسال الرسالة"
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("WhatsApp message sent successfully:", responseData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: responseData.messages?.[0]?.id,
        to: formattedPhone
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
