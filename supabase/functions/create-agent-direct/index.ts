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
        console.log("create-agent-direct starting...");
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        // ── 1. Verify caller is authenticated ───────────────────────────────────
        const authHeader = req.headers.get("Authorization") ?? "";
        const token = authHeader.replace("Bearer ", "");
        if (!token) {
            console.error("Missing token in request");
            return json({ error: "Unauthorized: missing token" }, 401);
        }

        const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token);
        if (authError || !caller) {
            console.error("Auth error:", authError?.message || "No user found for token");
            return json({ error: "Unauthorized: invalid token" }, 401);
        }

        console.log("Caller verified:", caller.email);

        // ── 2. Role check: accept admin OR super_admin ───────────────────────────
        const { data: callerRoles, error: rolesErr } = await adminClient
            .from("user_roles")
            .select("role")
            .eq("user_id", caller.id);

        if (rolesErr) {
            console.error("Error fetching caller roles:", rolesErr.message);
            return json({ error: "Failed to verify admin status" }, 500);
        }

        const roles = (callerRoles ?? []).map((r: any) => r.role as string);
        const isAdmin = roles.includes("admin") || roles.includes("super_admin");

        if (!isAdmin) {
            console.warn("User attempted admin action without role:", caller.email, "Roles:", roles);
            return json({ error: "Unauthorized: admin role required" }, 401);
        }

        // ── 3. Parse body ────────────────────────────────────────────────────────
        const body = await req.json();
        console.log("Parsing payload for email:", body.email);

        const {
            full_name,
            business_name,
            email,
            phone,
            temp_password,
            commission_rate = 0,
            commission_type = "percentage",
        } = body;

        if (!full_name || !business_name || !email || !phone || !temp_password) {
            return json({ error: "full_name, business_name, email, phone, and temp_password are required" }, 400);
        }

        // ── 4. Create or obtain auth user ─────────────────────────────────────────
        let agentUserId: string | null = null;

        // Try creating first
        const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
            email,
            password: temp_password,
            email_confirm: true,
            user_metadata: { full_name, phone },
        });

        if (createErr) {
            if (createErr.message.includes("already been registered") || createErr.message.includes("already exists")) {
                console.log("User already exists, seeking ID for:", email);
                // Seek in profiles table which is indexed by email and reliable
                const { data: existingProfile, error: profileFetchErr } = await adminClient
                    .from("profiles")
                    .select("id")
                    .eq("email", email)
                    .maybeSingle();

                if (profileFetchErr) {
                    console.error("Error fetching existing profile:", profileFetchErr.message);
                }

                if (existingProfile) {
                    agentUserId = existingProfile.id;
                    console.log("Found existing user ID from profile:", agentUserId);
                } else {
                    // Fallback to listUsers if not in profiles (long shot)
                    console.log("Not found in profiles, falling back to listUsers...");
                    const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers();
                    if (!listErr) {
                        const u = users.find(u => u.email === email);
                        if (u) agentUserId = u.id;
                    }
                }

                if (!agentUserId) {
                    return json({ error: "User is registered in Auth but cannot be resolved to a profile ID. Please contact support." }, 400);
                }
            } else {
                console.error("Create user error:", createErr.message);
                return json({ error: "Failed to create user: " + createErr.message }, 400);
            }
        } else {
            agentUserId = newUser.user.id;
            console.log("New user created with ID:", agentUserId);
        }

        // ── 5. Ensure profile row exists ─────────────────────────────────────────
        console.log("Upserting profile for:", agentUserId);
        const { error: profUpsertErr } = await adminClient.from("profiles").upsert({
            id: agentUserId,
            full_name,
            phone,
            email, // Make sure email is saved too
        });
        if (profUpsertErr) console.warn("Profile upsert warning:", profUpsertErr.message);

        // ── 6. Generate agent code and create agent record ───────────────────────
        console.log("Handling agent record for:", agentUserId);
        const { data: existingAgent, error: agentFetchErr } = await adminClient
            .from("agents")
            .select("agent_code")
            .eq("user_id", agentUserId)
            .maybeSingle();

        if (agentFetchErr) console.error("Error fetching existing agent:", agentFetchErr.message);

        let agentCode = existingAgent?.agent_code;

        if (!agentCode) {
            agentCode = "AGT-" + Date.now().toString(36).toUpperCase().slice(-6);
            console.log("Inserting new agent record with code:", agentCode);
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
            if (agentErr) {
                console.error("Agent insert error:", agentErr.message);
                return json({ error: "Failed to create agent record: " + agentErr.message }, 400);
            }
        } else {
            console.log("Updating existing agent record:", agentCode);
            const { error: agentErr } = await adminClient.from("agents")
                .update({
                    business_name,
                    contact_person: full_name,
                    phone,
                    commission_rate: Number(commission_rate),
                    commission_type,
                })
                .eq("user_id", agentUserId);
            if (agentErr) {
                console.error("Agent update error:", agentErr.message);
                return json({ error: "Failed to update agent record: " + agentErr.message }, 400);
            }
        }

        // ── 7. Assign agent role ─────────────────────────────────────────────────
        console.log("Upserting agent role for:", agentUserId);
        const { error: roleErr } = await adminClient.from("user_roles").upsert({
            user_id: agentUserId,
            role: "agent",
        }, { onConflict: "user_id,role" });

        if (roleErr) {
            console.error("Role assignment error:", roleErr.message);
            return json({ error: "Failed to assign role: " + roleErr.message }, 400);
        }

        console.log("Create agent success:", agentCode);
        return json({ success: true, agent_code: agentCode, user_id: agentUserId });

    } catch (e: any) {
        console.error("create-agent-direct terminal exception:", e.message);
        return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
    }
});
