import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Unauthorized: admin role required");

    const {
      application_id,
      temp_password,
      commission_rate = 0,
      commission_type = "percentage",
    } = await req.json();

    if (!application_id) throw new Error("application_id required");

    // Get the application
    const { data: app, error: appErr } = await supabase
      .from("agent_applications")
      .select("*")
      .eq("id", application_id)
      .single();
    if (appErr || !app) throw new Error("Application not found");

    // Allow re-processing approved apps without a user_id (account creation retry)
    if (app.status !== "pending" && app.user_id) {
      throw new Error("Agent account already exists for this application");
    }

    let agentUserId = app.user_id;

    if (!agentUserId) {
      // Create auth user — use temp_password if provided, else generate one
      const password = temp_password?.trim() ||
        "Agent" + Math.random().toString(36).slice(2, 10) + "!";

      const { data: newUser, error: createErr } =
        await supabase.auth.admin.createUser({
          email: app.email,
          password,
          email_confirm: true,
          user_metadata: { full_name: app.contact_person },
        });
      if (createErr) throw new Error("Failed to create user: " + createErr.message);
      agentUserId = newUser.user.id;

      // Ensure profile row exists (trigger may not fire when using admin.createUser)
      await supabase.from("profiles").upsert({
        id: agentUserId,
        full_name: app.contact_person,
        phone: app.phone,
      });
    }

    // Generate agent code
    const agentCode = "AGT-" + Date.now().toString(36).toUpperCase().slice(-6);

    // Create agent record (upsert so retry is safe)
    const { error: agentErr } = await supabase.from("agents").upsert({
      user_id: agentUserId,
      business_name: app.business_name,
      contact_person: app.contact_person,
      email: app.email,
      phone: app.phone,
      agent_code: agentCode,
      commission_rate: Number(commission_rate),
      commission_type: commission_type,
      status: "active",
    }, { onConflict: "user_id" });
    if (agentErr) throw new Error("Failed to create agent: " + agentErr.message);

    // Assign agent role (ignore duplicate)
    const { error: roleErr } = await supabase.from("user_roles").insert({
      user_id: agentUserId,
      role: "agent",
    });
    if (roleErr && !roleErr.message.includes("duplicate"))
      throw new Error("Failed to assign role: " + roleErr.message);

    // Update application — link user_id + mark approved
    await supabase
      .from("agent_applications")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        user_id: agentUserId,
      })
      .eq("id", application_id);

    return new Response(
      JSON.stringify({ success: true, agent_code: agentCode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("approve-agent-application error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
