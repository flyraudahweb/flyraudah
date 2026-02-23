import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLE_LABELS: Record<string, string> = {
  staff: "Staff Member",
  admin: "Administrator",
  super_admin: "Super Administrator",
};

function buildInviteEmail(opts: {
  fullName: string;
  role: string;
  setupUrl: string;
  inviterName: string;
}): string {
  const roleLabel = ROLE_LABELS[opts.role] ?? opts.role;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Join Raudah Travels</title>
  <style>
    body { margin:0; padding:0; background-color:#fcfbf8; font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#064e3b; }
    .wrapper { padding: 40px 20px; }
    .container { max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(6,78,59,0.08); border:1px solid #e5e7eb; }
    .header { padding:36px 40px; text-align:center; background:linear-gradient(135deg,#064e3b 0%,#065f46 60%,#047857 100%); }
    .logo { max-height:56px; width:auto; }
    .badge { display:inline-block; margin-top:16px; padding:4px 14px; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.3); border-radius:20px; color:#ffffff; font-size:12px; font-weight:600; letter-spacing:0.05em; text-transform:uppercase; }
    .content { padding:44px 40px 36px; text-align:center; }
    .greeting { font-size:13px; color:#a16207; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; margin-bottom:8px; }
    h1 { font-family:'Playfair Display',Georgia,serif; font-size:30px; font-weight:700; color:#064e3b; margin:0 0 16px; line-height:1.25; }
    .subtitle { font-size:16px; color:#374151; line-height:1.7; margin:0 0 32px; }
    .role-chip { display:inline-block; padding:6px 18px; background:#f0fdf4; border:1.5px solid #86efac; border-radius:24px; color:#15803d; font-size:13px; font-weight:700; margin-bottom:32px; }
    .button { display:inline-block; padding:16px 40px; background:linear-gradient(135deg,#16a34a 0%,#15803d 50%,#166534 100%); color:#ffffff !important; text-decoration:none; font-size:16px; font-weight:700; border-radius:12px; box-shadow:0 4px 20px rgba(22,163,74,0.35); letter-spacing:0.01em; }
    .divider { border:none; border-top:1px solid #f3f4f6; margin:36px 0; }
    .detail-box { background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:20px 24px; text-align:left; margin-bottom:28px; }
    .detail-row { display:flex; justify-content:space-between; align-items:center; padding:6px 0; font-size:14px; }
    .detail-label { color:#6b7280; font-weight:500; }
    .detail-value { color:#111827; font-weight:600; }
    .expiry-note { font-size:13px; color:#9ca3af; margin:24px 0 0; line-height:1.6; }
    .expiry-url { word-break:break-all; color:#15803d; font-size:12px; margin-top:8px; }
    .footer { padding:28px 40px; background:#f9fafb; text-align:center; font-size:13px; color:#6b7280; border-top:1px solid #e5e7eb; }
    .gold-text { color:#a16207; font-weight:600; }
  </style>
</head>
<body>
<div class="wrapper">
  <div class="container">
    <div class="header">
      <img src="https://i.postimg.cc/2S5XkGW1/log.png" alt="Raudah Travels" class="logo">
      <div class="badge">Staff Invitation</div>
    </div>
    <div class="content">
      <div class="greeting">Assalamu Alaikum!</div>
      <h1>You're joining the<br>Raudah Travels team</h1>
      <p class="subtitle">
        <strong>${opts.inviterName}</strong> has invited you to join the Raudah Travels admin dashboard.
        Set up your account below to get started.
      </p>
      <div class="role-chip">Your Role: ${roleLabel}</div><br>
      <a href="${opts.setupUrl}" class="button">Set Up My Account &rarr;</a>
      <hr class="divider">
      <div class="detail-box">
        <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${opts.fullName || "—"}</span></div>
        <div class="detail-row"><span class="detail-label">Role</span><span class="detail-value">${roleLabel}</span></div>
        <div class="detail-row"><span class="detail-label">Platform</span><span class="detail-value">Raudah Travels Admin</span></div>
      </div>
      <p class="expiry-note">This link expires in <strong>24 hours</strong>. If the button doesn't work, paste this URL:</p>
      <p class="expiry-url">${opts.setupUrl}</p>
    </div>
    <div class="footer">
      <p style="margin:0 0 4px;">&copy; 2026 <span class="gold-text">Raudah Travels &amp; Tours</span>. All rights reserved.</p>
      <p style="margin:0;">Nigeria's Trusted Hajj &amp; Umrah Partner &bull; <a href="https://flyraudah.com.ng" style="color:#064e3b;">flyraudah.com.ng</a></p>
    </div>
  </div>
</div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://flyraudah.netlify.app";

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── 1. Verify caller ────────────────────────────────────────────────────────
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !caller) return json({ error: "Unauthorized" }, 401);

    // ── 2. Role check ───────────────────────────────────────────────────────────
    const { data: callerRoles } = await adminClient
      .from("user_roles").select("role").eq("user_id", caller.id);
    const roles = (callerRoles ?? []).map(r => r.role as string);
    const isSuperAdmin = roles.includes("super_admin");
    const isAdmin = roles.includes("admin") || isSuperAdmin;
    if (!isAdmin) return json({ error: "Forbidden: admin access required" }, 403);

    // ── 3. Parse body ───────────────────────────────────────────────────────────
    const { email, full_name, role, permissions } = await req.json();
    if (!email || !role) return json({ error: "email and role are required" }, 400);
    if (!["admin", "staff"].includes(role)) return json({ error: "Invalid role" }, 400);
    if (role === "admin" && !isSuperAdmin)
      return json({ error: "Only super admins can create admins" }, 403);

    // ── 4. Read email_provider from site_settings ───────────────────────────────
    const { data: settingRow } = await adminClient
      .from("site_settings" as any)
      .select("value")
      .eq("key", "email_provider")
      .maybeSingle();
    let rawValue = settingRow?.value ?? "supabase";
    if (typeof rawValue === "string" && rawValue.startsWith('"')) {
      try { rawValue = JSON.parse(rawValue); } catch { /* keep as-is */ }
    }
    const useResend = rawValue === "resend" && resendKey.length > 0;

    // ── 5. Helper: assign role+permissions ──────────────────────────────────────
    const assignRole = async (uid: string) => {
      await adminClient.from("user_roles").delete().eq("user_id", uid);
      const { error: roleErr } = await adminClient.from("user_roles").insert({ user_id: uid, role });
      if (roleErr) throw new Error("Role assignment failed: " + roleErr.message);
    };
    const assignPerms = async (uid: string) => {
      if (role === "staff" && Array.isArray(permissions) && permissions.length > 0) {
        await adminClient.from("staff_permissions").delete().eq("user_id", uid);
        const { error: permErr } = await adminClient.from("staff_permissions").insert(
          permissions.map((p: string) => ({ user_id: uid, permission: p, granted_by: caller.id }))
        );
        if (permErr) throw new Error("Permission assignment failed: " + permErr.message);
      }
    };

    // ── 6A. SUPABASE flow (default) ─────────────────────────────────────────────
    if (!useResend) {
      const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name: full_name ?? "" },
        redirectTo: `${siteUrl}/reset-password`,
      });
      if (inviteErr) return json({ error: inviteErr.message }, 400);
      await assignRole(inviteData.user.id);
      await assignPerms(inviteData.user.id);
      return json({ success: true, provider: "supabase", message: `Invite sent to ${email}` });
    }

    // ── 6B. RESEND flow ─────────────────────────────────────────────────────────
    const { data: allUsers } = await adminClient.auth.admin.listUsers();
    const existing = allUsers?.users?.find(u => u.email === email);
    let userId: string;

    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: { full_name: full_name ?? "" },
      });
      if (createErr) return json({ error: "Could not create user: " + createErr.message }, 400);
      userId = created.user.id;
    }

    await assignRole(userId);
    await assignPerms(userId);

    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${siteUrl}/reset-password` },
    });
    if (linkErr) throw new Error("Could not generate setup link: " + linkErr.message);

    const setupUrl = linkData.properties.action_link;
    const inviterName =
      (caller.user_metadata as any)?.full_name ??
      (caller.user_metadata as any)?.name ??
      caller.email ?? "The Raudah Travels Team";

    const html = buildInviteEmail({ fullName: full_name ?? "", role, setupUrl, inviterName });

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Raudah Travels <team@flyraudah.com.ng>",
        to: [email],
        subject: `You're invited to join the Raudah Travels team!`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const err = await resendRes.text();
      throw new Error("Resend error: " + err);
    }

    return json({ success: true, provider: "resend", message: `Branded invitation sent to ${email}` });

  } catch (err: any) {
    console.error("[invite-staff] ERROR:", err.message);
    return json({ error: err.message ?? "Internal Server Error" }, 500);
  }
});
