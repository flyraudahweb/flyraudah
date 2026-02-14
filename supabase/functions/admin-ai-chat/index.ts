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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Verify admin
    const authHeader = req.headers.get("Authorization")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin only");

    const { messages, language } = await req.json();

    // Gather live metrics
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [
      { count: totalBookings },
      { count: todayBookings },
      { count: weekBookings },
      { count: totalUsers },
      { count: todayUsers },
      { count: totalAgents },
      { data: payments },
      { data: todayPayments },
      { data: monthPayments },
      { data: topAgents },
      { count: pendingPayments },
      { count: confirmedBookings },
      { count: pendingBookings },
    ] = await Promise.all([
      supabase.from("bookings").select("*", { count: "exact", head: true }),
      supabase.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", weekStart),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("agents").select("*", { count: "exact", head: true }),
      supabase.from("payments").select("amount, status"),
      supabase.from("payments").select("amount, status").gte("created_at", todayStart),
      supabase.from("payments").select("amount, status").gte("created_at", monthStart),
      supabase.from("bookings").select("agent_id").not("agent_id", "is", null),
      supabase.from("payments").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "confirmed"),
      supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    const totalRevenue = (payments || [])
      .filter((p: any) => p.status === "verified")
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

    const todayRevenue = (todayPayments || [])
      .filter((p: any) => p.status === "verified")
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

    const monthRevenue = (monthPayments || [])
      .filter((p: any) => p.status === "verified")
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

    // Count agent bookings
    const agentBookingCounts: Record<string, number> = {};
    (topAgents || []).forEach((b: any) => {
      agentBookingCounts[b.agent_id] = (agentBookingCounts[b.agent_id] || 0) + 1;
    });
    const topAgentIds = Object.entries(agentBookingCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    let topAgentDetails = "";
    if (topAgentIds.length > 0) {
      const { data: agentData } = await supabase
        .from("agents")
        .select("id, business_name, contact_person")
        .in("id", topAgentIds.map(([id]) => id));
      topAgentDetails = topAgentIds
        .map(([id, count]) => {
          const agent = (agentData || []).find((a: any) => a.id === id);
          return agent ? `${agent.business_name} (${agent.contact_person}): ${count} bookings` : `${id}: ${count} bookings`;
        })
        .join("\n");
    }

    const metricsContext = `
## Live Business Metrics (as of ${now.toISOString()})

### Sales & Revenue
- Total Revenue (all time): ₦${totalRevenue.toLocaleString()}
- Today's Revenue: ₦${todayRevenue.toLocaleString()}
- This Month's Revenue: ₦${monthRevenue.toLocaleString()}
- Total Bookings: ${totalBookings}
- Today's Bookings: ${todayBookings}
- This Week's Bookings: ${weekBookings}
- Confirmed Bookings: ${confirmedBookings}
- Pending Bookings: ${pendingBookings}

### Users & Agents
- Total Registered Users: ${totalUsers}
- New Users Today: ${todayUsers}
- Total Agents: ${totalAgents}
- Pending Payments: ${pendingPayments}

### Top Performing Agents
${topAgentDetails || "No agent bookings yet."}
`;

    const langInstruction = language === "ha"
      ? "Respond in Hausa language. If the user writes in English, still respond in Hausa."
      : "Respond in English. If the user writes in Hausa, still respond in English.";

    const systemPrompt = `You are the Raudah Travels AI Business Assistant. You help the admin manage their Hajj & Umrah travel business.

${langInstruction}

You have access to real-time business data. Use it to answer questions accurately. Here are the current metrics:

${metricsContext}

Guidelines:
- Be concise and professional
- Provide actionable insights when possible
- Format numbers with commas and ₦ for Nigerian Naira
- If asked about something not in the data, say so honestly
- You can provide business advice, operational insights, and recommendations
- When discussing growth, compare periods and suggest improvements`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("admin-ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
