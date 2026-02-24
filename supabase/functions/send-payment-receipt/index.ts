import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { bookingId, paymentAmount, reference } = await req.json();

    if (!bookingId) {
      return new Response(JSON.stringify({ error: "Missing bookingId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch booking with package details and agent info
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, packages(name, type, category, price, currency)")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    // Fetch user email from auth
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(booking.user_id);
    let userEmail = authUser?.user?.email;

    // Fallback: Fetch email from profiles if auth lookup fails
    if (!userEmail) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", booking.user_id)
        .single();
      userEmail = profile?.email;
    }

    if (!userEmail) {
      console.warn("User email not found for booking:", bookingId);
    }

    // Fetch profile for full name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", booking.user_id)
      .single();

    // Fetch agent email if booking was made by an agent
    let agentEmail = null;
    if (booking.agent_id) {
      const { data: agentData } = await supabase
        .from("agents")
        .select("email")
        .eq("id", booking.agent_id)
        .single();
      agentEmail = agentData?.email;
    }

    // Note: In Resend sandbox mode, we can only send to the verified owner email.
    // For now, we only include the admin to ensure delivery and avoid 403 errors.
    const adminEmail = "flyraudahweb@gmail.com";
    const recipients = [userEmail, agentEmail, adminEmail]
      .filter(Boolean)
      .filter(email => email === adminEmail) as string[];

    // We keep the original emails for in-app notifications
    const pilgrimEmail = userEmail;
    const bookingAgentEmail = agentEmail;
    const userName = profile?.full_name || booking.full_name || "Valued Customer";
    const packageInfo = booking.packages;
    const amount = paymentAmount || packageInfo?.price || 0;
    const currency = packageInfo?.currency || "NGN";
    const bookingRef = booking.reference || bookingId;
    const paymentDate = new Date().toLocaleDateString("en-NG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const formatAmount = (val: number) =>
      new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(val);

    // Create in-app notifications
    const notificationResults = [];

    // Notification for the pilgrim
    const { error: pilgrimNotifError } = await supabase.from("notifications").insert({
      user_id: booking.user_id,
      title: "Payment Verified ✓",
      message: `Your payment of ${formatAmount(amount)} for ${packageInfo?.name || "your package"} has been verified.`,
      type: "success",
      link: "/dashboard/bookings"
    });
    notificationResults.push({ type: "pilgrim", success: !pilgrimNotifError });

    // Notification for the agent (if applicable)
    if (booking.agent_id) {
      const { data: agentAccount } = await supabase
        .from("agents")
        .select("user_id")
        .eq("id", booking.agent_id)
        .single();

      if (agentAccount?.user_id) {
        const { error: agentNotifError } = await supabase.from("notifications").insert({
          user_id: agentAccount.user_id,
          title: "Client Payment Verified ✓",
          message: `Payment of ${formatAmount(amount)} for client ${userName} has been verified.`,
          type: "success",
          link: "/agent/bookings"
        });
        notificationResults.push({ type: "agent", success: !agentNotifError });
      }
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f1ec;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1a3c2a,#2d5a3f);padding:32px 40px;text-align:center;">
      <img src="https://i.ibb.co/C3zkfpVR/Rauda-Logo-2-PNG.png" alt="Raudah Travels" style="height:48px;margin-bottom:16px;" />
      <h1 style="color:#c9a84c;font-size:24px;margin:0;font-weight:700;">Payment Receipt</h1>
    </div>
    
    <!-- Body -->
    <div style="padding:40px;">
      <p style="color:#1a3c2a;font-size:16px;margin:0 0 24px;">
        Assalamu Alaikum <strong>${userName}</strong>,
      </p>
      <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
        We have received your payment successfully. Below are the details of your transaction:
      </p>
      
      <!-- Receipt Card -->
      <div style="background:#f8f6f1;border:1px solid #e8e2d6;border-radius:12px;padding:24px;margin:0 0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#888;font-size:13px;">Booking Reference</td>
            <td style="padding:8px 0;color:#1a3c2a;font-size:14px;font-weight:600;text-align:right;">${bookingRef}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#888;font-size:13px;">Package</td>
            <td style="padding:8px 0;color:#1a3c2a;font-size:14px;font-weight:600;text-align:right;">${packageInfo?.name || "N/A"}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#888;font-size:13px;">Type</td>
            <td style="padding:8px 0;color:#1a3c2a;font-size:14px;text-align:right;text-transform:capitalize;">${packageInfo?.type || "N/A"} — ${packageInfo?.category || ""}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#888;font-size:13px;">Payment Date</td>
            <td style="padding:8px 0;color:#1a3c2a;font-size:14px;text-align:right;">${paymentDate}</td>
          </tr>
          ${reference ? `<tr>
            <td style="padding:8px 0;color:#888;font-size:13px;">Transaction Ref</td>
            <td style="padding:8px 0;color:#1a3c2a;font-size:14px;text-align:right;">${reference}</td>
          </tr>` : ""}
          <tr>
            <td colspan="2" style="padding:12px 0 0;"><hr style="border:none;border-top:1px solid #e8e2d6;" /></td>
          </tr>
          <tr>
            <td style="padding:12px 0;color:#1a3c2a;font-size:16px;font-weight:700;">Amount Paid</td>
            <td style="padding:12px 0;color:#c9a84c;font-size:20px;font-weight:700;text-align:right;">${formatAmount(amount)}</td>
          </tr>
        </table>
      </div>
      
      <div style="background:#e8f5e9;border-radius:8px;padding:16px;text-align:center;margin:0 0 24px;">
        <p style="color:#2e7d32;font-size:14px;margin:0;font-weight:600;">✅ Payment Verified Successfully</p>
      </div>
      
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 8px;">
        Your booking has been confirmed. You can view your booking details and track your journey preparation in your dashboard.
      </p>
      <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 24px;">
        If you have any questions, please don't hesitate to contact us.
      </p>
      
      <div style="text-align:center;margin:32px 0;">
        <a href="https://flyraudah.ng/dashboard/bookings" style="background:linear-gradient(135deg,#c9a84c,#b8943f);color:#1a3c2a;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">View My Booking</a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background:#1a3c2a;padding:24px 40px;text-align:center;">
      <p style="color:#c9a84c;font-size:13px;margin:0 0 8px;font-weight:600;">Raudah Travels & Tours Ltd.</p>
      <p style="color:#a0a0a0;font-size:11px;margin:0;line-height:1.6;">
        Nigeria's Trusted Hajj & Umrah Partner<br />
        This is an automated receipt. Please keep it for your records.
      </p>
    </div>
  </div>
</body>
</html>`;

    let emailSent = false;
    let emailError = null;

    try {
      // Note: In Resend sandbox mode, we can only send to the verified owner email.
      // We send the receipt to the admin for verification, while the user/agent get in-app notifications.
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Raudah Travels <onboarding@resend.dev>",
          to: recipients,
          subject: `Payment Receipt — ${bookingRef}`,
          html: emailHtml,
        }),
      });

      const emailData = await emailRes.json();
      if (emailRes.ok) {
        emailSent = true;
      } else {
        emailError = emailData;
        console.error("Resend error (expected in sandbox):", emailData);
      }
    } catch (e) {
      emailError = e.message;
      console.error("Email send exception:", e);
    }

    return new Response(JSON.stringify({
      success: true,
      emailSent,
      emailError,
      notifications: notificationResults,
      message: emailSent ? "Receipt delivered via Email & Supabase" : "Receipt delivered via Supabase (Email restricted)"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-payment-receipt error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
