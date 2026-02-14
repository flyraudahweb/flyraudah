import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
        if (!isAdmin) throw new Error("Admin only");
      }
    }

    const password = "Demo1234!";

    const demoUsers = [
      { email: "demo-admin@raudah.com", name: "Admin Demo", phone: "+2348000000001", roles: ["admin"] },
      { email: "demo-agent@raudah.com", name: "Agent Demo", phone: "+2348000000002", roles: ["agent"] },
      { email: "demo-user1@raudah.com", name: "Aisha Mohammed (Demo)", phone: "+2348000000003", roles: [] },
      { email: "demo-user2@raudah.com", name: "Ibrahim Suleiman (Demo)", phone: "+2348000000004", roles: [] },
      { email: "demo-user3@raudah.com", name: "Fatima Bello (Demo)", phone: "+2348000000005", roles: [] },
    ];

    const createdUsers: { id: string; email: string; roles: string[] }[] = [];

    for (const du of demoUsers) {
      // Check if already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u: any) => u.email === du.email);

      let userId: string;
      if (existing) {
        userId = existing.id;
      } else {
        const { data: newUser, error } = await supabase.auth.admin.createUser({
          email: du.email,
          password,
          email_confirm: true,
          user_metadata: { full_name: du.name },
        });
        if (error) {
          console.error(`Failed to create ${du.email}:`, error.message);
          continue;
        }
        userId = newUser.user.id;
      }

      // Update profile
      await supabase.from("profiles").upsert({
        id: userId,
        full_name: du.name,
        phone: du.phone,
      });

      // Add extra roles
      for (const role of du.roles) {
        await supabase.from("user_roles").upsert(
          { user_id: userId, role },
          { onConflict: "user_id,role" }
        );
      }

      createdUsers.push({ id: userId, email: du.email, roles: du.roles });
    }

    // Create agent record for demo-agent
    const agentUser = createdUsers.find((u) => u.email === "demo-agent@raudah.com");
    if (agentUser) {
      const { data: existingAgent } = await supabase
        .from("agents")
        .select("id")
        .eq("user_id", agentUser.id)
        .maybeSingle();

      if (!existingAgent) {
        await supabase.from("agents").insert({
          user_id: agentUser.id,
          business_name: "Demo Travel Agency",
          contact_person: "Agent Demo",
          email: "demo-agent@raudah.com",
          phone: "+2348000000002",
          agent_code: "AGT-DEMO01",
          status: "active",
          commission_rate: 5,
        });
      }
    }

    // Get active packages for bookings
    const { data: packages } = await supabase
      .from("packages")
      .select("id, price, name, package_dates(id)")
      .eq("status", "active")
      .limit(3);

    if (packages && packages.length > 0) {
      const regularUsers = createdUsers.filter(
        (u) => !u.roles.includes("admin") && !u.roles.includes("agent")
      );

      for (let i = 0; i < regularUsers.length; i++) {
        const user = regularUsers[i];
        const pkg = packages[i % packages.length];
        const pkgDates = (pkg as any).package_dates || [];

        // Check if booking already exists
        const { data: existingBooking } = await supabase
          .from("bookings")
          .select("id")
          .eq("user_id", user.id)
          .eq("package_id", pkg.id)
          .maybeSingle();

        if (existingBooking) continue;

        const { data: booking, error: bookErr } = await supabase
          .from("bookings")
          .insert({
            user_id: user.id,
            package_id: pkg.id,
            package_date_id: pkgDates[0]?.id || null,
            full_name: demoUsers.find((d) => d.email === user.email)!.name,
            status: i === 0 ? "confirmed" : "pending",
            gender: i === 0 ? "female" : i === 1 ? "male" : "female",
            passport_number: `A${String(10000000 + i).slice(1)}`,
            passport_expiry: "2028-12-31",
            date_of_birth: `199${i}-05-15`,
            departure_city: "Abuja",
            room_preference: "double",
          })
          .select("id")
          .single();

        if (bookErr) {
          console.error("Booking error:", bookErr.message);
          continue;
        }

        if (booking) {
          // Create payments
          const paymentStatuses = ["verified", "pending", "verified"];
          await supabase.from("payments").insert({
            booking_id: booking.id,
            amount: i === 0 ? pkg.price : (pkg.price as number) * 0.3,
            method: i === 0 ? "bank_transfer" : "paystack",
            status: paymentStatuses[i] || "pending",
            paystack_reference: i === 1 ? `PSK-DEMO-${Date.now()}` : null,
            verified_at:
              paymentStatuses[i] === "verified"
                ? new Date().toISOString()
                : null,
          });

          // Second payment for first user
          if (i === 0) {
            await supabase.from("payments").insert({
              booking_id: booking.id,
              amount: (pkg.price as number) * 0.5,
              method: "bank_transfer",
              status: "verified",
              verified_at: new Date().toISOString(),
            });
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Seeded ${createdUsers.length} demo accounts with bookings and payments.`,
        accounts: demoUsers.map((d) => ({
          email: d.email,
          password,
          role: d.roles[0] || "user",
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("seed-demo-data error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
