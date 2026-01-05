import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
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

    console.log("Starting weekly security report generation...");

    // Get all tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("is_active", true);

    if (tenantsError || !tenants) {
      throw new Error("Failed to fetch tenants");
    }

    for (const tenant of tenants) {
      console.log("Processing tenant:", tenant.name);

      // Get email settings for this tenant
      const { data: emailSettings } = await supabase
        .from("email_notification_settings")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("weekly_report_enabled", true);

      if (!emailSettings || emailSettings.length === 0) {
        console.log("No weekly report recipients for tenant:", tenant.id);
        continue;
      }

      // Generate report using database function
      const { data: reportId, error: reportError } = await supabase
        .rpc("generate_weekly_security_report", { _tenant_id: tenant.id });

      if (reportError) {
        console.error("Failed to generate report for tenant:", tenant.id, reportError);
        continue;
      }

      // Get the generated report
      const { data: report } = await supabase
        .from("security_reports")
        .select("*")
        .eq("id", reportId)
        .single();

      if (!report) {
        console.error("Report not found:", reportId);
        continue;
      }

      const reportData = report.report_data as Record<string, unknown>;

      // Generate HTML email
      const html = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white; padding: 32px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .header p { margin: 8px 0 0; opacity: 0.9; }
            .content { padding: 32px; }
            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
            .stat-card { background: #f8fafc; padding: 20px; border-radius: 12px; text-align: center; }
            .stat-number { font-size: 36px; font-weight: bold; color: #1e3a8a; }
            .stat-label { color: #64748b; font-size: 14px; margin-top: 4px; }
            .stat-card.danger .stat-number { color: #dc2626; }
            .stat-card.warning .stat-number { color: #f59e0b; }
            .stat-card.success .stat-number { color: #16a34a; }
            .section { margin-top: 24px; }
            .section-title { font-size: 18px; font-weight: bold; color: #1e3a8a; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
            .event-list { list-style: none; padding: 0; margin: 0; }
            .event-list li { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
            .footer { background: #f9fafb; padding: 24px; text-align: center; color: #64748b; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 التقرير الأمني الأسبوعي</h1>
              <p>${tenant.name}</p>
              <p style="font-size: 12px; margin-top: 12px;">
                من ${new Date(report.period_start).toLocaleDateString("ar-EG")} 
                إلى ${new Date(report.period_end).toLocaleDateString("ar-EG")}
              </p>
            </div>
            
            <div class="content">
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-number">${reportData.total_events || 0}</div>
                  <div class="stat-label">إجمالي الأحداث</div>
                </div>
                <div class="stat-card danger">
                  <div class="stat-number">${reportData.critical_events || 0}</div>
                  <div class="stat-label">أحداث حرجة</div>
                </div>
                <div class="stat-card warning">
                  <div class="stat-number">${reportData.warning_events || 0}</div>
                  <div class="stat-label">تحذيرات</div>
                </div>
              </div>

              <div class="stats-grid">
                <div class="stat-card success">
                  <div class="stat-number">${reportData.successful_logins || 0}</div>
                  <div class="stat-label">تسجيلات دخول ناجحة</div>
                </div>
                <div class="stat-card danger">
                  <div class="stat-number">${reportData.failed_logins || 0}</div>
                  <div class="stat-label">محاولات دخول فاشلة</div>
                </div>
                <div class="stat-card warning">
                  <div class="stat-number">${reportData.account_locks || 0}</div>
                  <div class="stat-label">حسابات مقفلة</div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">📍 الإحصائيات</div>
                <ul class="event-list">
                  <li>
                    <span>عناوين IP فريدة</span>
                    <strong>${reportData.unique_ips || 0}</strong>
                  </li>
                  <li>
                    <span>الدول</span>
                    <strong>${Array.isArray(reportData.unique_countries) ? reportData.unique_countries.filter(Boolean).join(", ") || "غير متوفر" : "غير متوفر"}</strong>
                  </li>
                </ul>
              </div>

              ${Array.isArray(reportData.top_events) && reportData.top_events.length > 0 ? `
              <div class="section">
                <div class="section-title">🔝 أكثر الأحداث تكراراً</div>
                <ul class="event-list">
                  ${(reportData.top_events as Array<{type: string; count: number}>).slice(0, 5).map((e) => `
                    <li>
                      <span>${e.type}</span>
                      <strong>${e.count}</strong>
                    </li>
                  `).join("")}
                </ul>
              </div>
              ` : ""}

              ${(reportData.critical_events as number) > 0 ? `
              <div style="margin-top: 24px; padding: 20px; background: #fef2f2; border-radius: 12px; border-right: 4px solid #dc2626;">
                <strong style="color: #dc2626;">⚠️ تنبيه هام:</strong>
                <p style="margin: 8px 0 0; color: #991b1b;">
                  تم رصد ${reportData.critical_events} حدث حرج خلال هذا الأسبوع. يرجى مراجعة سجل الأحداث الأمنية.
                </p>
              </div>
              ` : `
              <div style="margin-top: 24px; padding: 20px; background: #f0fdf4; border-radius: 12px; border-right: 4px solid #16a34a;">
                <strong style="color: #16a34a;">✅ حالة جيدة:</strong>
                <p style="margin: 8px 0 0; color: #166534;">
                  لم يتم رصد أحداث حرجة خلال هذا الأسبوع.
                </p>
              </div>
              `}
            </div>
            
            <div class="footer">
              <p>تقرير أمني تلقائي - ${tenant.name}</p>
              <p>تم الإنشاء: ${new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Send to all recipients
      for (const setting of emailSettings) {
        try {
          await resend.emails.send({
            from: "Security Reports <onboarding@resend.dev>",
            to: [setting.email_address],
            subject: `📊 التقرير الأمني الأسبوعي - ${tenant.name}`,
            html,
          });
          console.log("Weekly report sent to:", setting.email_address);

          // Mark report as sent
          await supabase
            .from("security_reports")
            .update({ sent_at: new Date().toISOString() })
            .eq("id", reportId);
        } catch (emailError) {
          console.error("Failed to send weekly report to:", setting.email_address, emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Weekly reports processed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in weekly-security-report:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
