import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        const adminClient = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        const authHeader = req.headers.get("Authorization") ?? "";
        const token = authHeader.replace("Bearer ", "");

        // 1. Verify caller
        const { data: userData, error: authError } = await adminClient.auth.getUser(token);
        if (authError || !userData?.user) {
            return new Response(JSON.stringify({ error: authError?.message || "Unauthorized" }), {
                status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }
        const callerId = userData.user.id;

        // 2. Check caller roles (plural)
        const { data: userRoles, error: roleCheckErr } = await adminClient
            .from("user_roles")
            .select("role")
            .eq("user_id", callerId);

        if (roleCheckErr) throw new Error("Role check failed: " + roleCheckErr.message);

        const roles = userRoles?.map(r => r.role as string) || [];
        const isSuperAdmin = roles.includes("super_admin");
        const isAdmin = roles.includes("admin") || isSuperAdmin;

        if (!isAdmin) {
            return new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
                status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // 3. Parse input
        const { email, full_name, role, permissions } = await req.json();
        if (!email || !role) throw new Error("Email and role are required");

        if (role === "admin" && !isSuperAdmin) {
            return new Response(JSON.stringify({ error: "Only super admins can create admins" }), {
                status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // 4. Invite user
        const siteUrl = Deno.env.get("SITE_URL") ?? "https://flyraudah.netlify.app";
        const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
            data: { full_name: full_name ?? "" },
            redirectTo: `${siteUrl}/login`,
        });

        if (inviteError) {
            return new Response(JSON.stringify({ error: inviteError.message }), {
                status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const newUserId = inviteData.user.id;

        // 5. Update roles and permissions
        // First, clear existing roles for this user (if any)
        await adminClient.from("user_roles").delete().eq("user_id", newUserId);

        // Assign new role
        const { error: roleInsertErr } = await adminClient.from("user_roles").insert({ user_id: newUserId, role });
        if (roleInsertErr) throw new Error("Role assignment failed: " + roleInsertErr.message);

        if (role === "staff" && Array.isArray(permissions) && permissions.length > 0) {
            await adminClient.from("staff_permissions").delete().eq("user_id", newUserId);
            const { error: permErr } = await adminClient.from("staff_permissions").insert(
                permissions.map((p: string) => ({ user_id: newUserId, permission: p, granted_by: callerId }))
            );
            if (permErr) throw new Error("Permission assignment failed: " + permErr.message);
        }

        return new Response(JSON.stringify({ success: true, message: `Invite sent to ${email}` }), {
            status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (err: any) {
        console.error("Function error:", err.message);
        return new Response(JSON.stringify({ error: err.message || "Internal Server Error" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
