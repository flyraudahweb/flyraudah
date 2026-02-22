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
            full_name,
            business_name,
            email,
            phone,
            temp_password,
            commission_rate = 0,
        } = await req.json();

        if (!full_name || !business_name || !email || !phone || !temp_password) {
            throw new Error("full_name, business_name, email, phone, and temp_password are required");
        }

        // 1. Create auth user
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
            email,
            password: temp_password,
            email_confirm: true,
            user_metadata: { full_name, phone },
        });
        if (createErr) throw new Error("Failed to create user: " + createErr.message);
        const agentUserId = newUser.user.id;

        // 2. Ensure profile row exists
        const { error: profileErr } = await supabase.from("profiles").upsert({
            id: agentUserId,
            full_name,
            phone,
        });
        if (profileErr) console.warn("Profile upsert warning:", profileErr.message);

        // 3. Generate agent code and create agent record
        const agentCode = "AGT-" + Date.now().toString(36).toUpperCase().slice(-6);

        const { error: agentErr } = await supabase.from("agents").insert({
            user_id: agentUserId,
            business_name,
            contact_person: full_name,
            email,
            phone,
            agent_code: agentCode,
            commission_rate: Number(commission_rate),
            status: "active",
        });
        if (agentErr) throw new Error("Failed to create agent record: " + agentErr.message);

        // 4. Assign agent role
        const { error: roleErr } = await supabase.from("user_roles").insert({
            user_id: agentUserId,
            role: "agent",
        });
        if (roleErr && !roleErr.message.includes("duplicate"))
            throw new Error("Failed to assign role: " + roleErr.message);

        return new Response(
            JSON.stringify({ success: true, agent_code: agentCode, user_id: agentUserId }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (e) {
        console.error("create-agent-direct error:", e);
        return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
