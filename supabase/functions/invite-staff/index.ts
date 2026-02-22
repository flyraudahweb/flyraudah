import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    const respond = (body: object, status = 200) =>
        new Response(JSON.stringify(body), {
            status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !serviceKey) {
            return respond({ error: "Missing server env vars" }, 500);
        }

        const adminClient = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // Auth check
        const authHeader = req.headers.get("Authorization") ?? "";
        if (!authHeader.startsWith("Bearer ")) {
            return respond({ error: "Missing Bearer token" }, 401);
        }
        const token = authHeader.replace("Bearer ", "");

        const { data: userData, error: authError } = await adminClient.auth.getUser(token);
        if (authError || !userData?.user) {
            return respond({ error: "Unauthorized" }, 401);
        }
        const callerId = userData.user.id;

        // Check caller role — get their role row
        const { data: roleRow, error: roleCheckErr } = await adminClient
            .from("user_roles")
            .select("role")
            .eq("user_id", callerId)
            .maybeSingle();

        if (roleCheckErr) return respond({ error: "Role check failed: " + roleCheckErr.message }, 500);
        if (!roleRow || !(["admin", "super_admin"].includes(roleRow.role as string))) {
            return respond({ error: "Forbidden: only admins can invite staff" }, 403);
        }

        // Parse body
        let body: { email?: string; full_name?: string; role?: string; permissions?: string[] };
        try { body = await req.json(); } catch (_) { return respond({ error: "Invalid JSON body" }, 400); }
        const { email, full_name, role, permissions } = body;

        if (!email || !role) return respond({ error: "email and role are required" }, 400);
        if (!["admin", "staff"].includes(role)) return respond({ error: "Invalid role" }, 400);
        if (role === "admin" && roleRow.role !== "super_admin") {
            return respond({ error: "Only super admins can create admins" }, 403);
        }

        // Invite via Supabase Auth admin API
        const siteUrl = Deno.env.get("SITE_URL") ?? "https://flyraudah.netlify.app";
        const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
            data: { full_name: full_name ?? "" },
            redirectTo: `${siteUrl}/login`,
        });
        if (inviteError) return respond({ error: inviteError.message }, 400);

        const newUserId = inviteData.user.id;

        // Assign role: delete existing row then insert fresh.
        // NOTE: the unique constraint on user_roles is (user_id, role) — not just user_id alone,
        // so upsert(onConflict: "user_id") would fail. Delete + insert is the safe approach.
        await adminClient.from("user_roles").delete().eq("user_id", newUserId);
        const { error: roleInsertErr } = await adminClient
            .from("user_roles")
            .insert({ user_id: newUserId, role });
        if (roleInsertErr) return respond({ error: "Role assign failed: " + roleInsertErr.message }, 500);

        // Insert permissions if staff
        if (role === "staff" && Array.isArray(permissions) && permissions.length > 0) {
            await adminClient.from("staff_permissions").delete().eq("user_id", newUserId);
            const { error: permErr } = await adminClient.from("staff_permissions").insert(
                permissions.map((p: string) => ({ user_id: newUserId, permission: p, granted_by: callerId }))
            );
            if (permErr) return respond({ error: "Permission assign failed: " + permErr.message }, 500);
        }

        return respond({ success: true, user_id: newUserId, message: `Invitation sent to ${email}` });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[invite-staff] unhandled:", msg);
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
