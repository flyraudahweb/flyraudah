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

    // Fetch booking with package details
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
    if (authError || !authUser?.user?.email) {
      throw new Error("User email not found");
    }

    // Fetch profile for full name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", booking.user_id)
      .single();

    const userEmail = authUser.user.email;
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
        <a href="https://raudahtravels.lovable.app/dashboard/bookings" style="background:linear-gradient(135deg,#c9a84c,#b8943f);color:#1a3c2a;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;">View My Booking</a>
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

    // Send email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Raudah Travels <onboarding@resend.dev>",
        to: [userEmail],
        subject: `Payment Receipt — ${bookingRef}`,
        html: emailHtml,
      }),
    });

    const emailData = await emailRes.json();

    if (!emailRes.ok) {
      console.error("Resend error:", emailData);
      throw new Error(`Email send failed: ${JSON.stringify(emailData)}`);
    }

    return new Response(JSON.stringify({ success: true, emailId: emailData.id }), {
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
