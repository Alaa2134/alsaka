import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessCode, adminAccessCode } = await req.json();

    if (!accessCode) {
      return new Response(
        JSON.stringify({ error: "Access code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // If admin is creating user, verify admin permissions
    if (adminAccessCode) {
      const { data: adminVerify, error: adminVerifyError } = await supabaseAdmin
        .rpc('verify_user_login', { p_access_code: String(adminAccessCode).trim() });

      const adminUserId = adminVerify?.[0]?.user_id as string | undefined;

      if (adminVerifyError || !adminUserId) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: adminUser } = await supabaseAdmin
        .from("app_users")
        .select("id, role, is_active")
        .eq("id", adminUserId)
        .maybeSingle();

      if (!adminUser || !adminUser.is_active || !["admin", "company_admin", "system_manager"].includes(adminUser.role)) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Find the app_user by access code (secure verification)
    const normalizedCode = String(accessCode).trim();
    // Create email-safe version by removing spaces and special characters
    const emailSafeCode = normalizedCode.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const { data: verify, error: verifyError } = await supabaseAdmin
      .rpc('verify_user_login', { p_access_code: normalizedCode });

    const userId = verify?.[0]?.user_id as string | undefined;

    if (verifyError || !userId) {
      return new Response(
        JSON.stringify({ error: "User not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: appUser, error: findError } = await supabaseAdmin
      .from("app_users")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (findError || !appUser) {
      return new Response(
        JSON.stringify({ error: "User not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If user already has auth_id, ensure the auth account is synced (legacy password/email mismatches)
    const email = `${emailSafeCode}@app.internal`;

    if (appUser.auth_id) {
      const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(appUser.auth_id, {
        email,
        password: normalizedCode,
        email_confirm: true,
      });

      if (updateAuthError) {
        console.error("Auth update error:", updateAuthError);
        return new Response(
          JSON.stringify({ error: "Failed to update auth user", details: updateAuthError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Auth user synced",
          authId: appUser.auth_id 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: normalizedCode,
      email_confirm: true,
      user_metadata: {
        app_user_id: appUser.id,
        name: appUser.name,
        role: appUser.role
      }
    });

    if (authError) {
      console.error("Auth creation error:", authError);
      return new Response(
        JSON.stringify({ error: "Failed to create auth user", details: authError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Link auth user to app_user
    const { error: updateError } = await supabaseAdmin
      .from("app_users")
      .update({ auth_id: authData.user.id })
      .eq("id", appUser.id);

    if (updateError) {
      console.error("Link error:", updateError);
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to link auth user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Created auth user for ${appUser.name} (${accessCode})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        authId: authData.user.id,
        message: "Auth user created and linked" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
