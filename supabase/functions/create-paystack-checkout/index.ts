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
    // JWT verification is handled by the Supabase gateway (verify_jwt: true).
    const { bookingId, email } = await req.json();

    if (!bookingId || !email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SECURITY: Fetch the authoritative price from the DB, ignoring any client-sent amount ──
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, reference, status, package_id, agent_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.status === "confirmed" || booking.status === "cancelled") {
      return new Response(JSON.stringify({ error: "Booking is not in a payable state" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pkg, error: pkgError } = await supabase
      .from("packages")
      .select("price, agent_discount")
      .eq("id", booking.package_id)
      .single();

    if (pkgError || !pkg) {
      return new Response(JSON.stringify({ error: "Package not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── FIX #3: Calculate proper amount — account for agent wholesale pricing ──
    let amount = Number(pkg.price);
    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid package price" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
          amount = Math.max(0, amount - rate);
        } else if (rate > 0) {
          amount = amount * (1 - rate / 100);
        } else {
          amount = Math.max(0, amount - pkgDiscount);
        }
      }
    }

    // Initialize with Paystack — amount comes from DB, never from the client
    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // kobo
        reference: `${booking.reference || `booking-${bookingId}`}-${Date.now()}`,
        metadata: {
          booking_id: bookingId,
          cancel_action: `${Deno.env.get("SITE_URL") ?? "https://flyraudah.com"}/dashboard`,
        },
      }),
    });

    const data = await paystackRes.json();

    if (!data.status) {
      throw new Error(data.message || "Paystack request failed");
    }

    return new Response(JSON.stringify({
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
      amount, // return server-verified amount so the UI can display it
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
