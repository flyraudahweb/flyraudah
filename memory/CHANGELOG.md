# Raudah Travels â€” Feature Changelog

> [!IMPORTANT]
> **ðŸ¤– AI AGENT MANDATORY PROTOCOL**
>
> Every AI agent working on this project **MUST** append an entry to this file for **every session** in which a change is made â€” no matter how small. This is the only way future agents can stay in context and avoid breaking existing features.
>
> **Rules for every AI agent:**
> 1. **Read this file first** before touching any code, so you understand the current state.
> 2. **Check `PROJECT_INDEX.md`** for the full schema, routes, and architecture.
> 3. **Append an entry** to the Changelog section below as the last thing you do in a session.
> 4. **Update `PROJECT_INDEX.md`** if you add/change any DB table, route, edge function, or major feature.
> 5. **Use the conversation ID** provided in your current session as the `Conversation` field.
> 6. Never remove, edit, or wipe existing entries â€” only append new ones at the TOP.
> 7. If you are unsure whether a change is worth logging â€” log it anyway.

> **Purpose:** This file tracks every significant feature addition, modification, bug fix, schema change, and security update made to the Raudah Travels application. All AI agents and developers MUST append an entry here when making changes.
>
> **Format per entry:**
> - Date (YYYY-MM-DD)
> - Conversation ID (if made by an AI agent)
> - Summary of what changed
> - Files/tables affected

---

## How to Add an Entry (READ BEFORE CODING)

> [!NOTE]
> Add your new entry at the **TOP** of the `## Changelog` section (below the divider), NOT at the bottom. Newest entries must always appear first.

Copy-paste this template and fill it in:

```markdown
### YYYY-MM-DD â€” [Short title of change]
- **Conversation:** `{conversation-id-from-your-current-session}`
- **Type:** Feature | Bug Fix | Schema Change | Security Fix | Refactor | UI/UX | Documentation
- **Changed Files:** `list/key/files.tsx`, `supabase/migrations/XYZ.sql`, etc.
- **Summary:** 2â€“5 sentences explaining what changed and WHY it was needed.
- **DB Migrations:** Filename of any new `.sql` migration file(s). Write "None" if not applicable.
- **Breaking:** Yes/No â€” will this break existing data, APIs, or UI if not applied everywhere?
```

> [!TIP]
> **When to create a DB migration vs. direct SQL:** Always use a new `.sql` file in `supabase/migrations/` for schema changes. Never run raw SQL manually that is not tracked in a migration file. After applying, update the migration list in `PROJECT_INDEX.md §9.

---

## Changelog

### 2026-02-26 — Staff Management, AI Proposal & Security Hardening
- **Conversation:** `2b115ffc-2954-499c-a836-74d9938e01c4`
- **Type:** Feature | Security Fix | UI/UX
- **Changed Files:** `AdminStaffManagement.tsx`, `Proposal.tsx`, `App.tsx`, `staff_permissions` table, `generate-proposal` edge fn, `invite-staff` edge fn, `verifyAuth.ts`
- **Summary:** Implemented a full Staff Management system with granular permissions (`super_admin`, `staff` roles) and support ticket routing by specialty. Launched a new AI-powered Proposal Generation engine that processes document uploads or text into professional travel proposals. Hardened Edge Function security across the platform by implementing manual JWT verification (`verifyAuth`) to allow secure service-role bypass for system-triggered tasks. Added support ticket system with categorization and priority levels.
- **DB Migrations:** `20260224121700_full_schema_snapshot.sql`
- **Added Prompt Engineering Guide**: Created [PROMPT_ENGINEERING_GUIDE.md](file:///c:/Users/DEEPMIND/Desktop/Raudah/raudahtravels/memory/PROMPT_ENGINEERING_GUIDE.md) to help steer future AI-led feature implementations safely.

### 2026-02-21 — Payment, Tracking & Repeat Customer Features
- **Conversation:** `0334eb92-5dc8-480e-902d-06c80e79c730`
- **Type:** Feature | Schema Change | UI/UX
- **Changed Files:** `BookingWizard.tsx`, `PackageCard.tsx`, `PaymentCallback.tsx`, `AdminSidebar.tsx`, `App.tsx`, `.env`, `supabase/functions/`
- **Summary:** Fulfilled Umrah visa requirements by adding 14 new fields to `bookings` table. Implemented dynamic bank account management with a new Admin UI. Added a full user activity tracking system to monitor conversion funnels. Implemented form pre-filling for repeat customers using their latest booking data. Fixed Paystack CORS issues and hardened security by implementing manual JWT verification in the checkout initialization function.
- **DB Migrations:** `20260221_add_visa_fields.sql`, `20260221_bank_accounts.sql`, `20260221_user_activity.sql`
- **Breaking:** No — additive changes only.

### 2026-02-21 â€” Project Initial Index Created
- **Conversation:** `0334eb92-5dc8-480e-902d-06c80e79c730`
- **Type:** Documentation
- **Changed Files:** `docs/PROJECT_INDEX.md` (NEW), `docs/CHANGELOG.md` (NEW)
- **Summary:** Full project was indexed and this knowledge base was created from scratch. No code changes were made â€” only documentation.
- **DB Migrations:** N/A
- **Breaking:** No

---

### 2026-02-14 â€” Full Project Bootstrap (Initial Build)
- **Conversation:** Multiple (see conversation history between 2026-01-24 and 2026-02-14)
- **Type:** Feature (Initial Build)
- **Summary:** Full project bootstrapped from scratch. Includes:
  - Complete Supabase schema (5 migrations)
  - Three-portal architecture: Customer, Admin, Agent
  - Paystack payment integration (checkout + verify + receipt email)
  - PWA support with `vite-plugin-pwa`
  - i18n support
  - Full RLS security on all tables
  - Storage buckets for user documents
  - Realtime notifications system
  - Agent application workflow
  - Admin AI assistant feature
  - Pilgrim ID tag generation
  - Multi-step BookingWizard
  - Proposal page for agent recruitment

**DB Migrations (in order):**
1. `20260214010035` â€” Base schema (profiles, user_roles, packages, package_dates, package_accommodations, bookings, payments, documents, agents + all RLS + triggers + storage)
2. `20260214094341` â€” Notifications table + realtime + auto-notify triggers
3. `20260214094416` â€” Security fix: tightened notifications INSERT policy
4. `20260214094953` â€” Agent clients table + agent booking/payment policies
5. `20260214103802` â€” Agent applications table

---

## Quick Reference: What Each Conversation Changed

| Date       | Conversation Summary                      | Status   |
|------------|-------------------------------------------|----------|
| 2026-02-21 | Project indexed / memory created          | âœ… Done  |
| 2026-02-14 | Full Supabase migration / project built   | âœ… Done  |

*Add future rows here as the project evolves.*

---

## Feature Inventory (Current State)

### Customer-Facing Features
- [x] Landing page with package browsing
- [x] Package detail view (with dates, hotels, inclusions)
- [x] User registration and login
- [x] Password reset flow (email + token)
- [x] Multi-step booking wizard (personal info, passport, emergency contact, payment)
- [x] Payment via Paystack (card), bank transfer, USSD
- [x] Payment receipt upload (proof of payment for bank/USSD)
- [x] Document upload (passport, vaccine cert, visa, etc.)
- [x] Dashboard with booking/payment/document history
- [x] Real-time notifications (booking & payment status changes)
- [x] Support page (Tickets & Chat)
- [x] Profile management
- [x] PWA install prompt
- [x] Language preference setting (i18n)
- [x] Dark/light theme support
- [x] AI Proposal Generator (via Custom template)

### Admin Features
- [x] Package management (create/edit/archive Hajj & Umrah packages)
- [x] Payment verification (approve/reject)
- [x] Pilgrim management (view all pilgrims)
- [x] Analytics dashboard (charts via Recharts)
- [x] Pilgrim ID tag generation (with QR codes, PDF export)
- [x] Agent application review (approve/reject)
- [x] AI assistant chat (via `admin-ai-chat` edge function)
- [x] Notifications management
- [x] Staff Management (Role & Permission control)
- [x] Support Ticket Management (By specialty)
- [x] User Activity Audit Log
- [x] Booking Amendment review
- [x] Bank Account Management

### Agent Features
- [x] Agent application portal
- [x] Client directory management (CRUD)
- [x] Book packages on behalf of clients
- [x] View own bookings and their status
- [x] View commission summary
- [x] Package browsing

### Platform Features
- [x] Role-based access control (RBAC via Supabase RLS)
- [x] Granular Staff Permissions
- [x] Auto-generated booking references (RTT-YYYY-XXXXXX)
- [x] Supabase Realtime notifications
- [x] Islamic calendar dates on packages
- [x] Deposit support on packages (configurable min. deposit)
- [x] Agent discount pricing on packages
- [x] Error boundary + lazy loading with auto-retry
- [x] SEO meta tags per page (react-helmet-async)
- [x] Edge Function Security Hardening (Manual JWT verification)

### Not Yet Built (Future)
- [ ] Visa processing tracking (In progress - fields added)
- [ ] Flight ticket management
- [ ] Group booking
- [ ] WhatsApp/SMS notifications
