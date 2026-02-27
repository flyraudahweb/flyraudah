import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Missing Authorization header");
        const token = authHeader.replace("Bearer ", "");

        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? ""
        );

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
        if (authError || !user) {
            throw new Error(`Auth Error: ${authError?.message || "No user found"}`);
        }

        // Must be super_admin or admin
        const { data: roleData, error: roleError } = await supabaseClient
            .rpc('has_role', { _user_id: user.id, _role: 'admin' });

        if (roleError || !roleData) {
            throw new Error("Unauthorized: Only admins can top up wallets");
        }

        const { agent_id, amount } = await req.json();

        if (!agent_id || !amount || amount <= 0) {
            throw new Error("Invalid parameters");
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store securely via service role
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { error: insertError } = await supabaseAdmin
            .from("admin_otp_requests")
            .insert({
                admin_id: user.id,
                agent_id,
                amount,
                otp_hash: otp, // In a true production environment, hash this securely
                expires_at: new Date(Date.now() + 15 * 60000).toISOString(), // 15 mins
            });

        if (insertError) throw insertError;

        // Send email using Resend
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (!resendApiKey) {
            console.warn("RESEND_API_KEY not found. Simulating OTP send in local/dev.");
            return new Response(JSON.stringify({ message: "OTP sent (simulated)" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
                from: "Raudah Travels <onboarding@resend.dev>",
                to: [user.email],
                subject: "Wallet Top-Up Verification Code",
                html: `
          <h2>Wallet Top-Up Request</h2>
          <p>You have requested to top up an agent's wallet with ${amount}.</p>
          <p>Your verification code is: <strong>${otp}</strong></p>
          <p>This code expires in 15 minutes.</p>
        `,
            }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Failed to send email: ${errorText}`);
        }

        return new Response(JSON.stringify({ message: "OTP sent successfully" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
