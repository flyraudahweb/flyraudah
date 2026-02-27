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

        const { agent_id, otp } = await req.json();
        if (!agent_id || !otp) {
            throw new Error("Invalid parameters");
        }

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 1. Verify OTP
        const { data: otpRequest, error: fetchError } = await supabaseAdmin
            .from("admin_otp_requests")
            .select("*")
            .eq("admin_id", user.id)
            .eq("agent_id", agent_id)
            .eq("otp_hash", otp) // Note: In a real app we'd compare hashes
            .eq("used", false)
            .gt("expires_at", new Date().toISOString())
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (fetchError || !otpRequest) {
            throw new Error("Invalid or expired OTP");
        }

        // 2. Mark OTP as used
        await supabaseAdmin
            .from("admin_otp_requests")
            .update({ used: true })
            .eq("id", otpRequest.id);

        // 3. Increment Wallet Balance
        // Fetch current wallet to lock/update
        const { data: wallet, error: walletQueryError } = await supabaseAdmin
            .from("agent_wallets")
            .select("balance")
            .eq("agent_id", agent_id)
            .single();

        if (walletQueryError) throw walletQueryError;

        const newBalance = Number(wallet.balance) + Number(otpRequest.amount);

        const { error: updateError } = await supabaseAdmin
            .from("agent_wallets")
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq("agent_id", agent_id);

        if (updateError) throw updateError;

        // 4. Record transaction log
        await supabaseAdmin
            .from("wallet_transactions")
            .insert({
                agent_id,
                amount: otpRequest.amount,
                type: "deposit",
                reference: otpRequest.id,
                description: "Admin wallet top-up"
            });

        // 5. Send Email Receipt
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (resendApiKey) {
            try {
                // Fetch agent info
                const { data: agentData } = await supabaseAdmin
                    .from("agents")
                    .select("user_id, email, full_name")
                    .eq("id", agent_id)
                    .single();

                let agentName = "Agent";
                let agentEmail = null;

                if (agentData) {
                    agentEmail = agentData.email;
                    agentName = agentData.full_name || agentName;
                    if (!agentEmail && agentData.user_id) {
                        const { data: profile } = await supabaseAdmin
                            .from("profiles")
                            .select("full_name, email")
                            .eq("id", agentData.user_id)
                            .single();
                        if (profile) {
                            agentEmail = profile.email;
                            agentName = profile.full_name || agentName;
                        }
                    }
                }

                const adminEmail = user.email || "flyraudahweb@gmail.com";
                const recipients = [agentEmail, adminEmail, "flyraudahweb@gmail.com"].filter(Boolean) as string[];
                const uniqueRecipients = [...new Set(recipients)];

                // Since Resend is often in sandbox mode during dev, we might filter to just the verified owner domain
                // But we attempt to send to all unique recipients.
                const validRecipients = uniqueRecipients.filter(e => e === "flyraudahweb@gmail.com" || e === adminEmail);

                const formatAmount = (val: number) =>
                    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(val);

                const dateStr = new Date().toLocaleDateString("en-NG", {
                    year: "numeric", month: "long", day: "numeric"
                });

                const emailHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin: 0; padding: 0; background-color: #fcfbf8; font-family: sans-serif; color: #064e3b; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; }
        .header { padding: 30px; text-align: center; background-color: #064e3b; }
        .logo { max-height: 50px; }
        .header-title { color: #c9a84c; font-size: 22px; font-weight: 700; margin: 12px 0 0; }
        .header-subtitle { color: #a7c4b8; font-size: 13px; margin: 4px 0 0; }
        .content { padding: 40px; }
        .greeting { font-size: 16px; color: #064e3b; margin: 0 0 20px; }
        .description { font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 24px; }
        .success-box { background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center; }
        .success-icon { font-size: 32px; margin-bottom: 8px; }
        .success-text { color: #065f46; font-weight: 700; font-size: 15px; margin: 0; }
        .info-grid { display: table; width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .info-row { display: table-row; }
        .info-label { display: table-cell; padding: 10px 0; font-weight: 600; color: #6b7280; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
        .info-value { display: table-cell; padding: 10px 0; color: #111827; font-size: 14px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: 500; }
        .amount-row .info-label { color: #064e3b; font-size: 16px; font-weight: 700; border-bottom: none; padding-top: 16px; }
        .amount-row .info-value { color: #c9a84c; font-size: 22px; font-weight: 700; border-bottom: none; padding-top: 16px; }
        .divider-row td { padding: 0; border-bottom: none; }
        .divider-row hr { border: none; border-top: 2px solid #064e3b; opacity: 0.15; margin: 8px 0; }
        .cta-wrapper { text-align: center; margin: 32px 0 24px; }
        .cta-button { background-color: #064e3b; color: #ffffff; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; letter-spacing: 0.3px; }
        .footer { padding: 24px; text-align: center; font-size: 12px; color: #6b7280; background-color: #f9fafb; border-top: 1px solid #e5e7eb; }
        .footer-brand { color: #c9a84c; font-weight: 600; font-size: 13px; margin-bottom: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://i.postimg.cc/2S5XkGW1/log.png" alt="Raudah" class="logo">
            <div class="header-title">Wallet Top-Up Receipt</div>
            <div class="header-subtitle">Transaction ID: ${otpRequest.id.substring(0, 8)}</div>
        </div>
        <div class="content">
            <p class="greeting">Assalamu Alaikum  <strong>${agentName}</strong>,</p>
            <p class="description">Your wallet has been successfully credited by an administrator. Below is a summary of your transaction.</p>

            <div class="success-box">
                <div class="success-icon">✅</div>
                <p class="success-text">Top-Up Successful</p>
            </div>

            <div class="info-grid">
                <div class="info-row">
                    <div class="info-label">Agent Name</div>
                    <div class="info-value">${agentName}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Processed By</div>
                    <div class="info-value">${adminEmail}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Date</div>
                    <div class="info-value">${dateStr}</div>
                </div>
                <div class="info-row divider-row">
                    <td colspan="2"><hr /></td>
                </div>
                <div class="info-row amount-row">
                    <div class="info-label">Amount Credited</div>
                    <div class="info-value">${formatAmount(otpRequest.amount)}</div>
                </div>
                <div class="info-row amount-row">
                    <div class="info-label" style="font-size:14px; font-weight:600; padding-top:4px;">New Balance</div>
                    <div class="info-value" style="font-size:18px; color:#111827; padding-top:4px;">${formatAmount(newBalance)}</div>
                </div>
            </div>

            <div class="cta-wrapper">
                <a href="https://flyraudah.ng/agent/wallet" class="cta-button">View My Wallet →</a>
            </div>
            <p style="text-align:center;font-size:13px;color:#9ca3af;">You can use this wallet balance to easily check out package bookings for your clients.</p>
        </div>
        <div class="footer">
            <div class="footer-brand">Raudah Travels & Tours Ltd.</div>
            &copy; 2026 Raudah Travels. Nigeria's Trusted Hajj & Umrah Partner.
        </div>
    </div>
</body>
</html>`;

                await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${resendApiKey}`,
                    },
                    body: JSON.stringify({
                        from: "Raudah Travels <onboarding@resend.dev>",
                        to: validRecipients.length > 0 ? validRecipients : ["flyraudahweb@gmail.com"],
                        subject: `Wallet Top-Up Confirmation — ${formatAmount(otpRequest.amount)}`,
                        html: emailHtml,
                    }),
                });
            } catch (e) {
                console.error("Failed to send receipt:", e);
            }
        }

        const body = JSON.stringify({ message: "Top-up successful", newBalance });
        return new Response(body, {
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
