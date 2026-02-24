import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { encodeHex } from "https://deno.land/std@0.208.0/encoding/hex.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
    // 1. Verify HMAC Signature
    const paystackSignature = req.headers.get("x-paystack-signature");
    if (!paystackSignature) {
        return new Response("No signature", { status: 401 });
    }

    const rawBody = await req.text();
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(PAYSTACK_SECRET_KEY),
        { name: "HMAC", hash: "SHA-512" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(rawBody)
    );

    const hashHex = encodeHex(signature);

    if (hashHex !== paystackSignature) {
        console.error("🚨 INVALID WEBHOOK SIGNATURE DETECTED!");
        return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.event === "charge.success") {
        const { reference, amount, metadata } = event.data;
        const bookingId = metadata?.booking_id;

        if (!bookingId) {
            console.error("No booking_id in webhook metadata");
            return new Response("No booking ID", { status: 400 });
        }

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        try {
            // ── FIX #2: Idempotency guard — skip if already verified ──
            const { data: existingPayment } = await supabaseAdmin
                .from("payments")
                .select("id, status")
                .eq("booking_id", bookingId)
                .eq("method", "paystack")
                .eq("status", "verified")
                .maybeSingle();

            if (existingPayment) {
                console.log(`Webhook idempotency: payment for booking ${bookingId} already verified, skipping.`);
                return new Response(JSON.stringify({ received: true, skipped: true }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // 2. Security Hardening: Cross-reference paid amount with DB price
            const { data: booking, error: bookingError } = await supabaseAdmin
                .from("bookings")
                .select(`
                    id,
                    agent_id,
                    packages (
                        price,
                        deposit_allowed,
                        minimum_deposit
                    )
                `)
                .eq("id", bookingId)
                .single();

            if (bookingError || !booking) throw new Error("Booking verification failed");

            const paidAmount = amount / 100;
            const pkg = booking.packages as any;

            // ── FIX #3 (webhook side): Calculate expected amount accounting for agent pricing ──
            let expectedPrice = Number(pkg.price);
            if (booking.agent_id) {
                const { data: agent } = await supabaseAdmin
                    .from("agents")
                    .select("commission_rate, commission_type")
                    .eq("id", booking.agent_id)
                    .single();

                if (agent) {
                    const rate = Number(agent.commission_rate ?? 0);
                    if (agent.commission_type === "fixed") {
                        expectedPrice = Math.max(0, expectedPrice - rate);
                    } else {
                        expectedPrice = expectedPrice * (1 - rate / 100);
                    }
                }
            }

            const isFullPrice = Math.abs(paidAmount - expectedPrice) < 1; // ₦1 tolerance
            const isDeposit = pkg.deposit_allowed && pkg.minimum_deposit && Math.abs(paidAmount - Number(pkg.minimum_deposit)) < 1;

            if (!isFullPrice && !isDeposit) {
                console.error(`🚨 FRAUD ALERT (WEBHOOK): Amount mismatch! Paid: ${paidAmount}, Expected: ${expectedPrice} or deposit ${pkg.minimum_deposit}`);
                return new Response("Amount mismatch", { status: 403 });
            }

            // ── FIX #7: Narrow update filter — only update pending payments ──
            const { error: updateError } = await supabaseAdmin
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

            const { data: updatedBooking, error: bookingUpdateError } = await supabaseAdmin
                .from("bookings")
                .update({ status: "confirmed" })
                .eq("id", bookingId)
                .select()
                .single();

            if (bookingUpdateError) throw bookingUpdateError;

            // 4. Trigger Tracking Activity
            await supabaseAdmin.from("user_activity").insert({
                user_id: updatedBooking.user_id,
                event_type: "payment_verified",
                package_id: updatedBooking.package_id,
                booking_id: bookingId,
                metadata: { method: "paystack", reference, amount: paidAmount, source: "webhook" }
            });

            // 5. Trigger receipt email (fire-and-forget)
            try {
                await fetch(`${SUPABASE_URL}/functions/v1/send-payment-receipt`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    },
                    body: JSON.stringify({
                        bookingId,
                        paymentAmount: paidAmount,
                        reference
                    }),
                });
            } catch (e) {
                console.error("Receipt error:", e);
            }

        } catch (err) {
            console.error("Webhook processing error:", err.message);
            return new Response(err.message, { status: 500 });
        }
    }

    return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
});
