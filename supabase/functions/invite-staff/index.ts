import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Admin client with service role — can invite users
        const adminClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // Verify the caller is authenticated (we do this ourselves since verify_jwt=false)
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Use the service role client to validate the user token
        const { data: { user }, error: authError } = await adminClient.auth.getUser(
            authHeader.replace("Bearer ", "")
        );
        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Check caller is admin or super_admin
        const { data: callerRole } = await adminClient
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .in("role", ["admin", "super_admin"])
            .maybeSingle();

        if (!callerRole) {
            return new Response(
                JSON.stringify({ error: "Forbidden: only admins can invite staff" }),
                { status: 403, headers: corsHeaders }
            );
        }

        const { email, full_name, role, permissions } = await req.json();

        if (!email || !role) {
            return new Response(JSON.stringify({ error: "email and role are required" }), { status: 400, headers: corsHeaders });
        }

        // Validate role
        const allowedRoles = ["admin", "staff"];
        if (!allowedRoles.includes(role)) {
            return new Response(JSON.stringify({ error: "Invalid role" }), { status: 400, headers: corsHeaders });
        }

        // Only super_admin can create admins
        if (role === "admin" && callerRole.role !== "super_admin") {
            return new Response(
                JSON.stringify({ error: "Only super admins can create admins" }),
                { status: 403, headers: corsHeaders }
            );
        }

        // Invite user — sends email with magic link to set password
        const siteUrl = Deno.env.get("SITE_URL") ?? "http://localhost:5173";
        const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
            data: { full_name: full_name ?? "" },
            redirectTo: `${siteUrl}/login`,
        });

        if (inviteError) {
            return new Response(JSON.stringify({ error: inviteError.message }), { status: 400, headers: corsHeaders });
        }

        const newUserId = inviteData.user.id;

        // Assign role (upsert in case user already existed)
        const { error: roleError } = await adminClient
            .from("user_roles")
            .upsert({ user_id: newUserId, role }, { onConflict: "user_id" });

        if (roleError) throw roleError;

        // Assign permissions for staff
        if (role === "staff" && Array.isArray(permissions) && permissions.length > 0) {
            await adminClient.from("staff_permissions").delete().eq("user_id", newUserId);
            const { error: permError } = await adminClient.from("staff_permissions").insert(
                permissions.map((p: string) => ({ user_id: newUserId, permission: p, granted_by: user.id }))
            );
            if (permError) throw permError;
        }

        return new Response(
            JSON.stringify({ success: true, user_id: newUserId, message: `Invitation sent to ${email}` }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err: any) {
        console.error("invite-staff error:", err);
        return new Response(JSON.stringify({ error: err.message ?? "Internal error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
