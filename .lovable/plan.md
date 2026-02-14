
# Implementation Plan: Demo Accounts, Agent Application System, and Admin AI Assistant

This plan covers three major features. Given the scope, I'll break them into clear phases.

---

## Phase 1: Database Changes

### 1.1 Create `agent_applications` table
A new table to store agent applications submitted from the landing page.

```text
agent_applications
- id (uuid, PK)
- user_id (uuid, nullable - if logged in)
- business_name (text, required)
- contact_person (text, required)
- email (text, required)
- phone (text, required)
- message (text, nullable)
- status (text: 'pending' | 'approved' | 'rejected', default 'pending')
- reviewed_by (uuid, nullable)
- reviewed_at (timestamptz, nullable)
- created_at (timestamptz, default now())
```

RLS policies:
- Anyone (authenticated or anon) can INSERT
- Admins can SELECT/UPDATE all
- Users can SELECT their own applications

### 1.2 Seed Demo Data via SQL
Insert demo users through Supabase Auth admin API is not possible via migrations, so instead we'll create a **dedicated login page section** showing pre-configured demo credentials. The demo data (bookings, payments) will be seeded via SQL migration tied to known user IDs that we'll create by registering demo accounts manually or via an edge function.

**Alternative approach (recommended):** Create a `seed-demo-data` edge function that:
- Creates 5 demo auth users (1 admin, 1 agent, 3 regular users) via Supabase Admin API
- Inserts demo bookings + payments for the regular users
- Can be triggered once by the admin

---

## Phase 2: Agent Application System

### 2.1 Landing Page Changes

**File: `src/components/landing/Hero.tsx`**
- Replace the "Contact Us" button (the outline WhatsApp button) with a "Become an Agent" button
- This button opens a dialog/modal with the application form

**File: `src/components/landing/CTABanner.tsx`**
- Add a "Become an Agent" button alongside existing CTA buttons

### 2.2 New Component: `BecomeAgentDialog.tsx`
- Form fields: Business Name, Contact Person, Email, Phone, Message
- On submit: inserts into `agent_applications` table
- Shows success toast on completion
- Works for both logged-in and anonymous users (uses anon key)

### 2.3 Admin: Agent Applications Page

**New file: `src/pages/admin/AdminAgentApplications.tsx`**
- Lists all agent applications with status filters
- Admin can approve or reject
- On approval: creates entry in `agents` table + assigns 'agent' role in `user_roles` (requires a backend function)

**File: `src/components/admin/AdminSidebar.tsx`**
- Add "Agent Applications" menu item with `UserPlus` icon

**File: `src/App.tsx`**
- Add route `/admin/agent-applications`

### 2.4 Edge Function: `approve-agent-application`
- Called when admin approves an application
- Uses service role to:
  - Create agent record in `agents` table
  - Add 'agent' role to `user_roles`
  - Update application status to 'approved'

---

## Phase 3: Demo Accounts & Mock Data

### 3.1 Edge Function: `seed-demo-data`
Creates demo accounts and populates mock transaction data:

- **Demo Admin**: `demo-admin@raudah.com` / `Demo1234!`
- **Demo Agent**: `demo-agent@raudah.com` / `Demo1234!`
- **Demo Users** (3):
  - `demo-user1@raudah.com` / `Demo1234!` (Aisha Mohammed)
  - `demo-user2@raudah.com` / `Demo1234!` (Ibrahim Suleiman)
  - `demo-user3@raudah.com` / `Demo1234!` (Fatima Bello)

For each demo user, creates:
- Profile with full name and phone
- 1-2 bookings linked to real packages
- 1-2 payments (mix of verified/pending)
- Appropriate roles

### 3.2 Demo Login Section
**File: `src/pages/Login.tsx`**
- Add a "Demo Accounts" section below the login form
- Shows cards for Admin, Agent, and User demo accounts
- Click to auto-fill credentials and sign in

### 3.3 Demo Badge
- Tag demo accounts with a "(Demo)" label in their profile name so they're clearly identifiable across admin dashboards, pilgrim lists, and ID tags

---

## Phase 4: Admin AI Assistant (Gemini Integration)

### 4.1 Edge Function: `admin-ai-chat`
- Accepts user message + conversation history
- Queries the database for real-time business metrics before each response:
  - Total bookings, revenue, user count, agent count
  - Today's/this week's/this month's stats
  - Top agents by booking count
  - Payment status breakdown
- Injects these metrics as system context for the AI
- Uses Lovable AI Gateway with `google/gemini-3-flash-preview`
- Supports streaming responses
- System prompt instructs AI to respond in English or Hausa based on the user's language

### 4.2 New Page: `src/pages/admin/AdminAiAssistant.tsx`
- Chat interface with message history
- Streaming response display
- Predefined quick-prompt buttons:
  - "Today's sales"
  - "This month's revenue"
  - "Top-performing agents"
  - "User growth stats"
  - "Business advice"
  - "Operational insights"
- Language toggle (English/Hausa)
- Clean chat UI with admin branding

### 4.3 Admin Sidebar Update
**File: `src/components/admin/AdminSidebar.tsx`**
- Add "AI Assistant" menu item with `Bot` icon

### 4.4 Route Registration
**File: `src/App.tsx`**
- Add route `/admin/ai-assistant`

---

## Summary of New Files

| File | Purpose |
|------|---------|
| `src/components/landing/BecomeAgentDialog.tsx` | Agent application form modal |
| `src/pages/admin/AdminAgentApplications.tsx` | Admin page to review agent applications |
| `src/pages/admin/AdminAiAssistant.tsx` | Admin AI chat interface |
| `supabase/functions/approve-agent-application/index.ts` | Backend: approve agent + assign role |
| `supabase/functions/seed-demo-data/index.ts` | Backend: create demo accounts + data |
| `supabase/functions/admin-ai-chat/index.ts` | Backend: AI chat with business metrics |

## Files Modified

| File | Change |
|------|--------|
| `src/components/landing/Hero.tsx` | Replace "Contact Us" with "Become an Agent" |
| `src/components/landing/CTABanner.tsx` | Add "Become an Agent" button |
| `src/components/admin/AdminSidebar.tsx` | Add Agent Applications + AI Assistant menu items |
| `src/App.tsx` | Add 2 new admin routes |
| `src/pages/Login.tsx` | Add demo account quick-login section |
| `supabase/config.toml` | Register new edge functions |

## Technical Notes

- The `seed-demo-data` function uses `SUPABASE_SERVICE_ROLE_KEY` to create auth users via the Admin API
- The `approve-agent-application` function also uses service role to modify `user_roles`
- The AI assistant queries live database metrics server-side before each AI call, ensuring accurate real-time data
- All new tables have proper RLS policies
- Demo accounts are clearly labeled with "(Demo)" in their names
