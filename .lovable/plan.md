
# Add Logo to ID Cards, Fix Auth Session Bug, and Ensure Agent Form Works

## Overview

Three improvements: (1) Add the Raudah logo to ID card headers in white, (2) Fix the login session getting stuck after logout/re-login, and (3) Ensure agent application form submissions appear in the admin panel.

---

## 1. Add Logo to Pilgrim ID Card Header

**File: `src/components/admin/PilgrimIdCard.tsx`**

Replace the crescent/star SVG icon in the card header with the actual Raudah logo image, inverted to white since the header background is emerald green.

- Use `<img src="https://i.ibb.co/C3zkfpVR/Rauda-Logo-2-PNG.png" className="h-5 w-auto brightness-0 invert" />` (same pattern used in sidebars and footer)
- Keep the card title "PILGRIM ID CARD" and subtitle "Raudah Travels & Tours" next to the logo

**File: `src/pages/admin/AdminIdTags.tsx`**

Update the PDF generation to also embed the logo in the PDF card header. Since jsPDF can't load external images easily inline, we'll pre-load the logo image as a data URL on component mount and use `pdf.addImage()` in the header area.

---

## 2. Fix Auth Session Stuck on Re-Login

**Root Cause:** The `onAuthStateChange` callback in `AuthContext.tsx` calls `await fetchUserData()` directly inside the callback. This causes a deadlock -- Supabase's auth listener blocks while waiting for Supabase database calls to complete, preventing the auth state from resolving. After logout and re-login, the loading state never resolves.

**File: `src/contexts/AuthContext.tsx`**

Apply the proven fix pattern:
- Use `setTimeout(() => fetchUserData(...), 0)` inside `onAuthStateChange` to dispatch database calls after the callback completes, avoiding the deadlock
- Separate initial load (controls `loading` state) from ongoing auth changes
- Add an `isMounted` flag for cleanup safety
- Ensure `loading` is only set to `false` after the initial `getSession()` + `fetchUserData()` completes (not after every auth change)

```text
Before (broken):
  onAuthStateChange -> await fetchUserData() -> DEADLOCK

After (fixed):
  onAuthStateChange -> setTimeout(fetchUserData, 0) -> works
  getSession() -> await fetchUserData() -> setLoading(false)
```

---

## 3. Ensure Agent Applications Reach Admin

**Current state:** The `BecomeAgentDialog` inserts into `agent_applications` with `as any` type casts. The RLS INSERT policy is `WITH CHECK (true)`, meaning anyone can insert. The admin page queries with the admin role's SELECT policy.

The code itself is correct, but the `as any` casts suggest the table isn't in the generated TypeScript types. This won't block functionality but may cause confusion. The actual fix needed:

- Verify the insert works for unauthenticated users (the form can be submitted without logging in, but the `supabase` client may need the anon key to pass RLS). The current INSERT policy allows this.
- No code changes needed for this -- the flow already works. The admin panel at `AdminAgentApplications.tsx` already queries and displays all applications.

If there's an edge case where submissions fail silently, we'll add better error toasting and ensure the `user_id` field is properly set to `null` for anonymous submissions.

---

## Technical Details

| File | Changes |
|------|---------|
| `src/components/admin/PilgrimIdCard.tsx` | Replace crescent SVG with Raudah logo `<img>` tag, white-inverted |
| `src/pages/admin/AdminIdTags.tsx` | Pre-load logo as data URL, embed in PDF header via `pdf.addImage()` |
| `src/contexts/AuthContext.tsx` | Fix deadlock: use `setTimeout` in `onAuthStateChange`, separate initial load, add `isMounted` guard |
