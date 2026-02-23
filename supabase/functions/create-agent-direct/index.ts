import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS")
        return new Response(null, { headers: corsHeaders });

    const json = (body: object, status = 200) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // ── 1. Verify caller is authenticated ───────────────────────────────────
        const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
        if (!token) return json({ error: "Unauthorized: missing token" }, 401);

        const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token);
        if (authError || !caller) return json({ error: "Unauthorized: invalid token" }, 401);

        // ── 2. Role check: accept admin OR super_admin ───────────────────────────
        const { data: callerRoles } = await adminClient
            .from("user_roles")
            .select("role")
            .eq("user_id", caller.id);

        const roles = (callerRoles ?? []).map((r: any) => r.role as string);
        const isAdmin = roles.includes("admin") || roles.includes("super_admin");

        if (!isAdmin) return json({ error: "Unauthorized: admin role required" }, 401);

        // ── 3. Parse body ────────────────────────────────────────────────────────
        const {
            full_name,
            business_name,
            email,
            phone,
            temp_password,
            commission_rate = 0,
            commission_type = "percentage",
        } = await req.json();

        if (!full_name || !business_name || !email || !phone || !temp_password) {
            return json({ error: "full_name, business_name, email, phone, and temp_password are required" }, 400);
        }

        // ── 4. Create auth user ──────────────────────────────────────────────────
        const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
            email,
            password: temp_password,
            email_confirm: true,
            user_metadata: { full_name, phone },
        });
        if (createErr) return json({ error: "Failed to create user: " + createErr.message }, 400);
        const agentUserId = newUser.user.id;

        // ── 5. Ensure profile row exists ─────────────────────────────────────────
        const { error: profileErr } = await adminClient.from("profiles").upsert({
            id: agentUserId,
            full_name,
            phone,
        });
        if (profileErr) console.warn("Profile upsert warning:", profileErr.message);

        // ── 6. Generate agent code and create agent record ───────────────────────
        const agentCode = "AGT-" + Date.now().toString(36).toUpperCase().slice(-6);

        const { error: agentErr } = await adminClient.from("agents").insert({
            user_id: agentUserId,
            business_name,
            contact_person: full_name,
            email,
            phone,
            agent_code: agentCode,
            commission_rate: Number(commission_rate),
            commission_type,
            status: "active",
        });
        if (agentErr) return json({ error: "Failed to create agent record: " + agentErr.message }, 400);

        // ── 7. Assign agent role ─────────────────────────────────────────────────
        const { error: roleErr } = await adminClient.from("user_roles").insert({
            user_id: agentUserId,
            role: "agent",
        });
        if (roleErr && !roleErr.message.includes("duplicate"))
            return json({ error: "Failed to assign role: " + roleErr.message }, 400);

        return json({ success: true, agent_code: agentCode, user_id: agentUserId });

    } catch (e: any) {
        console.error("create-agent-direct error:", e.message);
        return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
    }
});
