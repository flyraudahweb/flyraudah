import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { email, timestamp, userAgent } = await req.json();

        // Get client IP from Supabase headers
        const clientIp = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "Unknown IP";

        // Fetch location data (using ipapi.co - free tier doesn't require key for low volume)
        let locationData = "Unknown Location";
        if (clientIp !== "Unknown IP" && clientIp !== "127.0.0.1" && clientIp !== "::1") {
            try {
                const locRes = await fetch(`https://ipapi.co/${clientIp}/json/`);
                if (locRes.ok) {
                    const loc = await locRes.json();
                    locationData = `${loc.city || ""}, ${loc.region || ""}, ${loc.country_name || ""}`.replace(/^, /, "");
                }
            } catch (e) {
                console.error("Location lookup error:", e);
            }
        }

        const loginTime = timestamp ? new Date(timestamp).toLocaleString("en-NG", {
            dateStyle: "full",
            timeStyle: "medium"
        }) : new Date().toLocaleString();

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin: 0; padding: 0; background-color: #fcfbf8; font-family: sans-serif; color: #064e3b; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; }
        .header { padding: 30px; text-align: center; background-color: #064e3b; }
        .logo { max-height: 50px; }
        .content { padding: 40px; }
        .alert-box { background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; padding: 20px; margin-bottom: 24px; color: #991b1b; }
        .info-grid { display: table; width: 100%; border-collapse: collapse; }
        .info-row { display: table-row; }
        .info-label { display: table-cell; padding: 8px 0; font-weight: bold; color: #6b7280; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
        .info-value { display: table-cell; padding: 8px 0; color: #111827; font-size: 14px; border-bottom: 1px solid #f3f4f6; text-align: right; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b7280; background-color: #f9fafb; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://i.postimg.cc/2S5XkGW1/log.png" alt="Raudah" class="logo">
        </div>
        <div class="content">
            <h2 style="margin-top:0;">Admin Login Detected</h2>
            <div class="alert-box">
                <strong>Security Alert:</strong> A successful admin login was recorded for your account. If this was not you, please reset your password immediately.
            </div>
            
            <div class="info-grid">
                <div class="info-row">
                    <div class="info-label">Email Account</div>
                    <div class="info-value">${email}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Date & Time</div>
                    <div class="info-value">${loginTime}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Estimated Location</div>
                    <div class="info-value" style="color:#a16207; font-weight:bold;">${locationData}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">IP Address</div>
                    <div class="info-value">${clientIp}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Device/Browser</div>
                    <div class="info-value" style="font-size:11px; max-width:200px; overflow:hidden;">${userAgent}</div>
                </div>
            </div>
        </div>
        <div class="footer">
            &copy; 2026 Raudah Travels & Tours. Nigeria's Trusted Hajj & Umrah Partner.
        </div>
    </div>
</body>
</html>`;

        // Send email via Resend
        const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: "Raudah Security <onboarding@resend.dev>",
                to: ["flyraudahweb@gmail.com"], // Security notifications to the primary admin
                subject: `⚠️ Admin Login Alert: ${email}`,
                html: emailHtml,
            }),
        });

        const emailData = await emailRes.json();

        return new Response(JSON.stringify({ success: true, location: locationData }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error) {
        console.error("send-login-notification error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
