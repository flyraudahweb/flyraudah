import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Verify with Paystack
    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_API_KEY}`,
      },
    });

    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data.status !== "success") {
      return new Response(JSON.stringify({ status: "failed", message: "Payment not verified" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update payment in database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const bookingId = verifyData.data.metadata?.booking_id;
    if (!bookingId) {
      throw new Error("No booking ID in metadata");
    }

    // Update payment status
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

    // Update booking status to confirmed
    await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId);

    // Send payment receipt email (fire-and-forget, don't block verification)
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/send-payment-receipt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          bookingId,
          paymentAmount: verifyData.data.amount / 100, // Paystack returns amount in kobo
          reference,
        }),
      });
    } catch (emailErr) {
      console.error("Failed to send receipt email:", emailErr);
      // Don't fail the verification if email fails
    }

    return new Response(JSON.stringify({ status: "verified", bookingId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
