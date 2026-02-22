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

    // 1. Verify with Paystack API
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
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
      .select("id, status, package_id")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      throw new Error("Booking not found in database");
    }

    if (booking.status === "confirmed") {
      // Idempotent — already confirmed
      return new Response(JSON.stringify({ status: "verified", bookingId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fetch authoritative package price
    const { data: pkg, error: pkgErr } = await supabase
      .from("packages")
      .select("price")
      .eq("id", booking.package_id)
      .single();

    if (pkgErr || !pkg) {
      throw new Error("Package not found");
    }

    // 4. CRITICAL: Reject if paid amount is less than expected (allow 1% rounding tolerance)
    const expectedNaira = Number(pkg.price);
    const tolerance = expectedNaira * 0.01;
    if (paystackNaira < expectedNaira - tolerance) {
      console.error(
        `FRAUD ATTEMPT: booking ${bookingId} — expected ₦${expectedNaira}, Paystack reported ₦${paystackNaira} (ref: ${reference})`
      );
      return new Response(
        JSON.stringify({ status: "failed", message: "Payment amount does not match booking price" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Mark payment as verified
    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status: "verified",
        paystack_reference: reference,
        verified_at: new Date().toISOString(),
      })
      .eq("booking_id", bookingId)
      .eq("method", "paystack");

    if (updateError) throw updateError;

    // 6. Confirm the booking
    const { error: bookingUpdateError } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId);

    if (bookingUpdateError) throw bookingUpdateError;

    // 7. Send receipt email (fire-and-forget)
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
