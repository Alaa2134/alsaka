import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SecurityEmailRequest {
  event_type: string;
  severity: string;
  tenant_id: string;
  details: Record<string, unknown>;
  ip_address?: string;
  country?: string;
  city?: string;
}

const getEventLabel = (eventType: string): string => {
  const labels: Record<string, string> = {
    LOGIN_SUCCESS: "تسجيل دخول ناجح",
    FAILED_LOGIN: "محاولة دخول فاشلة",
    FAILED_LOGIN_UNKNOWN_USER: "محاولة دخول بكود غير معروف",
    ACCOUNT_LOCKED: "تم قفل الحساب",
    LOGOUT: "تسجيل خروج",
    SESSION_EXPIRED: "انتهاء الجلسة",
    PASSWORD_CHANGE: "تغيير كلمة المرور",
    TWO_FACTOR_ENABLED: "تفعيل المصادقة الثنائية",
    TWO_FACTOR_DISABLED: "إلغاء المصادقة الثنائية",
    DEVICE_UNLOCKED: "فك قفل الجهاز",
    PERMISSION_DENIED: "رفض صلاحية",
    SUSPICIOUS_ACTIVITY: "نشاط مشبوه",
  };
  return labels[eventType] || eventType;
};

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case "critical": return "#dc2626";
    case "warning": return "#f59e0b";
    default: return "#3b82f6";
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendKey);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { event_type, severity, tenant_id, details, ip_address, country, city }: SecurityEmailRequest = await req.json();

    console.log("Processing security email notification:", { event_type, severity, tenant_id });

    // Only send emails for critical and warning events
    if (severity !== "critical" && severity !== "warning") {
      return new Response(
        JSON.stringify({ message: "Email not sent - severity not high enough" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get email notification settings for this tenant
    const { data: emailSettings, error: settingsError } = await supabase
      .from("email_notification_settings")
      .select("*")
      .eq("tenant_id", tenant_id);

    if (settingsError || !emailSettings || emailSettings.length === 0) {
      console.log("No email settings found for tenant:", tenant_id);
      return new Response(
        JSON.stringify({ message: "No email settings configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tenant name
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", tenant_id)
      .single();

    const tenantName = tenant?.name || "النظام";
    const eventLabel = getEventLabel(event_type);
    const severityColor = getSeverityColor(severity);

    // Send email to all configured recipients
    for (const setting of emailSettings) {
      // Check if this type of notification is enabled
      if (
        (event_type === "ACCOUNT_LOCKED" && !setting.notify_on_account_lock) ||
        (event_type.includes("FAILED") && !setting.notify_on_failed_logins) ||
        (severity === "critical" && !setting.notify_on_critical_events)
      ) {
        continue;
      }

      const locationInfo = country || city ? `${city || ""} ${country || ""}`.trim() : "غير معروف";

      const html = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: ${severityColor}; color: white; padding: 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { padding: 24px; }
            .alert-box { background: ${severityColor}15; border-right: 4px solid ${severityColor}; padding: 16px; margin-bottom: 20px; border-radius: 4px; }
            .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
            .info-label { color: #666; }
            .info-value { font-weight: bold; color: #333; }
            .footer { background: #f9f9f9; padding: 16px; text-align: center; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 تنبيه أمني - ${tenantName}</h1>
            </div>
            <div class="content">
              <div class="alert-box">
                <strong style="font-size: 18px;">${eventLabel}</strong>
                <p style="margin: 8px 0 0; color: #666;">مستوى الخطورة: ${severity === "critical" ? "حرج ⚠️" : "تحذير ⚡"}</p>
              </div>
              
              <div class="info-row">
                <span class="info-label">التاريخ والوقت:</span>
                <span class="info-value">${new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}</span>
              </div>
              
              ${ip_address ? `
              <div class="info-row">
                <span class="info-label">عنوان IP:</span>
                <span class="info-value" dir="ltr">${ip_address}</span>
              </div>
              ` : ""}
              
              <div class="info-row">
                <span class="info-label">الموقع:</span>
                <span class="info-value">${locationInfo}</span>
              </div>

              ${Object.keys(details).length > 0 ? `
              <div style="margin-top: 20px;">
                <strong>تفاصيل إضافية:</strong>
                <pre style="background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; direction: ltr; text-align: left;">${JSON.stringify(details, null, 2)}</pre>
              </div>
              ` : ""}
              
              <div style="margin-top: 24px; padding: 16px; background: #fff3cd; border-radius: 8px;">
                <strong>⚠️ إجراء مطلوب:</strong>
                <p style="margin: 8px 0 0;">إذا لم تتعرف على هذا النشاط، يرجى مراجعة سجل الأحداث الأمنية فوراً.</p>
              </div>
            </div>
            <div class="footer">
              <p>هذا البريد تلقائي من نظام الأمان - لا ترد عليه</p>
              <p>${tenantName} © ${new Date().getFullYear()}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        await resend.emails.send({
          from: "Security Alert <onboarding@resend.dev>",
          to: [setting.email_address],
          subject: `🔒 تنبيه أمني: ${eventLabel} - ${tenantName}`,
          html,
        });
        console.log("Email sent to:", setting.email_address);
      } catch (emailError) {
        console.error("Failed to send email to:", setting.email_address, emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in security-email-notifications:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
