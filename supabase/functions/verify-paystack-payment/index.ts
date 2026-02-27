import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYSTACK_API_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { reference } = await req.json();

    if (!reference) {
      return new Response(JSON.stringify({ error: "Missing reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Verify with Paystack API (server-side, authoritative)
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${PAYSTACK_API_KEY}` },
    });

    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data.status !== "success") {
      return new Response(JSON.stringify({ status: "failed", message: "Payment not verified by Paystack" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paystackKobo: number = verifyData.data.amount;
    const paystackNaira = paystackKobo / 100;
    const bookingId = verifyData.data.metadata?.booking_id;

    if (!bookingId) {
      throw new Error("No booking ID in Paystack metadata");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Fetch booking and check status
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("id, status, package_id, agent_id, user_id")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      throw new Error("Booking not found in database");
    }

    // ── SECURITY: Authorize requester (Issue #8) ──
    const authHeader = req.headers.get("Authorization");
    const isServiceRole = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;

    if (!isServiceRole) {
      if (!authHeader) throw new Error("Missing Authorization header");

      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (userError || !user) throw new Error("Unauthorized user");

      // Check if user is the booking owner or an admin
      const { data: userRole } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();

      if (booking.user_id !== user.id && !userRole) {
        console.error(`PERMISSION DENIED: User ${user.id} attempted to verify booking ${bookingId} owned by ${booking.user_id}`);
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // ── FIX #2 + #5: Idempotency guard — if already confirmed, return immediately ──
    if (booking.status === "confirmed") {
      return new Response(JSON.stringify({ status: "verified", bookingId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── FIX #2: Also check if there's already a verified payment to prevent TOCTOU race ──
    const { data: alreadyVerified } = await supabase
      .from("payments")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("method", "paystack")
      .eq("status", "verified")
      .maybeSingle();

    if (alreadyVerified) {
      // Payment was verified (likely by webhook), just make sure booking is confirmed too
      await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", bookingId)
        .neq("status", "confirmed"); // No-op if already confirmed
      return new Response(JSON.stringify({ status: "verified", bookingId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fetch authoritative package price
    const { data: pkg, error: pkgErr } = await supabase
      .from("packages")
      .select("price, agent_discount")
      .eq("id", booking.package_id)
      .single();

    if (pkgErr || !pkg) {
      throw new Error("Package not found");
    }

    // 4. Calculate authoritative expected price (same logic as checkout + webhook)
    let expectedNaira = Number(pkg.price);
    if (booking.agent_id) {
      const { data: agent } = await supabase
        .from("agents")
        .select("commission_rate, commission_type")
        .eq("id", booking.agent_id)
        .single();

      if (agent) {
        const rate = Number(agent.commission_rate ?? 0);
        const pkgDiscount = Number(pkg.agent_discount ?? 0);

        if (agent.commission_type === "fixed") {
          expectedNaira = Math.max(0, expectedNaira - rate);
        } else if (rate > 0) {
          expectedNaira = expectedNaira * (1 - rate / 100);
        } else {
          expectedNaira = Math.max(0, expectedNaira - pkgDiscount);
        }
      }
    }

    // 5. CRITICAL: Reject if paid amount is less than expected (₦1 tolerance for rounding)
    const tolerance = Math.max(1, expectedNaira * 0.01);
    if (paystackNaira < expectedNaira - tolerance) {
      console.error(
        `FRAUD ATTEMPT: booking ${bookingId} — expected ₦${expectedNaira}, Paystack reported ₦${paystackNaira} (ref: ${reference})`
      );
      return new Response(
        JSON.stringify({ status: "failed", message: "Payment amount does not match booking price" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── FIX #7: Only update pending payments (not already-verified ones) ──
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status: "verified",
        paystack_reference: reference,
        verified_at: new Date().toISOString(),
      })
      .eq("booking_id", bookingId)
      .eq("method", "paystack")
      .eq("status", "pending");

    if (updateError) throw updateError;

    // 6. Confirm the booking
    const { error: bookingUpdateError } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId);

    if (bookingUpdateError) throw bookingUpdateError;

    // 7. Track activity
    await supabase.from("user_activity").insert({
      user_id: booking.user_id,
      event_type: "payment_verified",
      package_id: booking.package_id,
      booking_id: bookingId,
      metadata: { method: "paystack", reference, amount: paystackNaira, source: "verify_callback" }
    });

    // 8. Send receipt email (fire-and-forget)
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-payment-receipt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ bookingId, paymentAmount: paystackNaira, reference }),
      });
    } catch (emailErr) {
      console.error("Receipt email failed:", emailErr);
    }

    return new Response(JSON.stringify({ status: "verified", bookingId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("verify-paystack-payment error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
