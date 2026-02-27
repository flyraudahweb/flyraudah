# Raudah Travels — Project Index & AI Memory

> [!IMPORTANT]
> **🤖 AI AGENT — READ THIS FIRST, EVERY SINGLE SESSION**
>
> This is the master reference document for the Raudah Travels project. Before writing a single line of code you MUST:
>
> 1. **Read this file in full** to understand the current project state.
> 2. **Read [`CHANGELOG.md`](file:///c:/Users/DEEPMIND/Desktop/Raudah/raudahtravels/memory/CHANGELOG.md)** to see the most recent changes — start from the newest entries at the top.
> 3. **When your session ends**, log what you changed in `CHANGELOG.md` (append at the TOP of the Changelog section) and update any relevant sections of this file.
>
> Failure to update these files means the next AI agent will have outdated context, leading to broken features, duplicate work, or security regressions.

> **Purpose:** This document is the canonical reference for AI agents working on this project. It captures the full architecture, features, database schema, security model, and change history so that any agent can quickly understand the project state without re-reading all the source files.
>
> **Last indexed:** 2026-02-21 | **Maintained by:** AI agents — update on every change

---

## 1. Project Overview

| Field             | Value                                                                                 |
|-------------------|---------------------------------------------------------------------------------------|
| **App Name**      | Raudah Travels (`raudahtravels`)                                                     |
| **Purpose**       | Hajj & Umrah travel booking platform for Nigerian pilgrims                           |
| **Currency**      | Nigerian Naira (NGN) — displayed as ₦                                               |
| **Workspace**     | `c:\Users\DEEPMIND\Desktop\Raudah\raudahtravels`                                    |
| **Corpus Name**   | `aleeyuwada01/raudahtravels`                                                         |
| **Version**       | `0.0.0` (see `package.json`)                                                         |
| **Build Tool**    | Vite 5.4                                                                              |
| **Type**          | Progressive Web App (PWA) with `vite-plugin-pwa`                                    |
| **Language**      | TypeScript 5.8                                                                        |

---

## 2. Technology Stack

### Frontend
| Technology             | Version   | Purpose                                          |
|------------------------|-----------|--------------------------------------------------|
| React                  | 18.3      | UI library                                       |
| TypeScript             | 5.8       | Type safety                                      |
| Vite                   | 5.4       | Bundler / dev server                             |
| React Router DOM       | 6.30      | Client-side routing                              |
| TailwindCSS            | 3.4       | Styling                                          |
| Radix UI               | various   | Headless accessible UI primitives (full suite)   |
| shadcn/ui              | —         | UI component library (built on Radix)            |
| Framer Motion          | 12        | Animations                                       |
| TanStack React Query   | 5.83      | Server state / data fetching                     |
| React Hook Form        | 7.61      | Form management                                  |
| Zod                    | 3.25      | Schema validation                                |
| i18next / react-i18next| 25/16    | Internationalization (i18n)                      |
| Recharts               | 2.15      | Data visualization / analytics charts            |
| Sonner                 | 1.7       | Toast notifications                              |
| date-fns               | 3.6       | Date utilities                                   |
| pdf-js / jspdf         | 4.1       | PDF generation                                   |
| html2canvas            | 1.4       | HTML to image/canvas conversion                  |
| qrcode.react           | 4.2       | QR code generation                               |
| vite-plugin-pwa        | 1.2       | PWA manifest and service worker                  |
| react-helmet-async     | 2.0       | SEO meta tags per page                           |
| next-themes            | 0.3       | Dark/light theme support                         |

### Backend (Supabase)
| Service              | Details                                                            |
|----------------------|--------------------------------------------------------------------|
| **Supabase Project** | See `.env` for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`  |
| **Auth**             | Supabase Auth (email/password, magic link, password reset)        |
| **Database**         | PostgreSQL via Supabase (with RLS on all tables)                  |
| **Storage**          | 3 private buckets: `passport-photos`, `payment-receipts`, `documents` |
| **Edge Functions**   | Deno-based (8 functions — see §6)                                 |
| **Realtime**         | Enabled on `notifications` table                                  |

### Payment
| Service  | Integration                                                                 |
|----------|-----------------------------------------------------------------------------|
| Paystack | `create-paystack-checkout` edge fn initiates; `verify-paystack-payment` confirms; webhook via `PaymentCallback.tsx` |

---

## 3. User Roles & Access Control

The app has **6 roles** defined in the `app_role` enum, enforced via Supabase RLS:
| Role          | Access                                                                      |
|---------------|-----------------------------------------------------------------------------|
| `user`        | Default after signup. Can browse packages, book, pay, upload docs, view own data. |
| `agent`       | Must apply and be approved. Can manage a client directory, book on behalf of clients, view commissions. |
| `moderator`   | Defined in DB enum but not yet used in UI routing.                         |
| `staff`       | Limited admin access. Access is controlled via granular permissions in `staff_permissions`. |
| `admin`       | Full platform access. Can manage packages, payments, and staff (for roles < admin). |
| `super_admin` | Absolute access. Can manage all users, roles, and system-level settings.    |

**Staff Permissions System:**
- Located in `staff_permissions` table.
- Permissions include: `overview`, `packages`, `payments`, `pilgrims`, `analytics`, `id_tags`, `agents`, `bank_accounts`, `activity`, `amendments`, `support`, `settings`, `staff_management`.
- Admins/Super Admins assign permissions via the Staff Management UI.

**Auth helper functions (DB):**
```sql
public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
public.has_permission(_user_id uuid, _permission text) RETURNS boolean
```
Used in all RLS policies and frontend checks.
Used in all RLS policies. Marked `SECURITY DEFINER` + `STABLE`.

**Frontend enforcement:**
- `ProtectedRoute` component wraps protected routes.
- `requiredRole="admin"` or `requiredRole="agent"` props restrict route access.
- `useAuth()` hook provides `hasRole(role)` helper throughout the app.

---

## 4. Route Map

```
/                           → Landing page (Index.tsx)
/packages                   → Browse all packages (Packages.tsx)
/packages/:id               → Package detail view (PackageDetail.tsx)
/payment/callback           → Paystack payment callback (PaymentCallback.tsx)
/login                      → Auth: Login (Login.tsx)
/register                   → Auth: Register (Register.tsx)
/forgot-password            → Auth: Forgot password (ForgotPassword.tsx)
/reset-password             → Auth: Reset password (ResetPassword.tsx)
/install                    → PWA installation guide (Install.tsx)
/proposal                   → Business/agent proposal page (Proposal.tsx)

/dashboard/                 → Customer dashboard (ProtectedRoute, any auth user)
  index                     → DashboardOverview
  bookings                  → DashboardBookings
  packages                  → DashboardPackages
  payments                  → DashboardPayments
  documents                 → DashboardDocuments
  profile                   → DashboardProfile
  support                   → DashboardSupport
  book/:id                  → BookingWizard (multi-step booking form)

/admin/                     → Admin portal (ProtectedRoute, requiredRole="staff")
  index                     → AdminOverview (requires "overview" perm)
  packages                  → AdminPackages (requires "packages" perm)
  payments                  → AdminPayments (requires "payments" perm)
  pilgrims                  → AdminPilgrims (requires "pilgrims" perm)
  analytics                 → AdminAnalytics (requires "analytics" perm)
  id-tags                   → AdminIdTags (requires "id_tags" perm)
  agents                    → AdminAgents (requires "agents" perm)
  agent-applications        → AdminAgentApplications (requires "agents" perm)
  ai-assistant              → AdminAiAssistant (requires auth)
  bank-accounts             → AdminBankAccounts (requires "bank_accounts" perm)
  activity                  → AdminActivity (requires "activity" perm)
  amendments                → AdminAmendmentRequests (requires "amendments" perm)
  support                   → AdminSupport (requires "support" perm)
  settings                  → AdminSettings (requires "settings" perm)
  booking-form              → AdminBookingForm (requires "settings" perm)
  staff                     → AdminStaffManagement (requires "staff_management" perm)

/agent/                     → Agent portal (ProtectedRoute, requiredRole="agent")
  index                     → AgentOverview
  clients                   → AgentClients (client directory management)
  packages                  → AgentPackages
  book/:id                  → AgentBookForClient
  bookings                  → AgentBookings
  commissions               → AgentCommissions
```

---

## 5. Database Schema

All tables have Row Level Security (RLS) enabled.

app_role:          super_admin | admin | staff | moderator | agent | user
booking_status:    pending | confirmed | cancelled | completed
payment_status:    pending | verified | rejected | refunded
payment_method:    paystack | bank_transfer | ussd
document_type:     passport | vaccine_certificate | visa | flight_ticket |
                   hotel_voucher | booking_confirmation | payment_receipt | pre_departure_guide
agent_status:      active | suspended | pending
package_status:    active | draft | archived
package_type:      hajj | umrah
package_category:  premium | standard | budget
ticket_priority:   low | medium | high | urgent
ticket_status:     open | in_progress | resolved | closed
```

### Tables

#### `public.profiles`
Auto-created by `handle_new_user()` trigger on `auth.users` insert.
```
id (UUID PK → auth.users)
full_name, phone, avatar_url
language_preference (default: 'en')
created_at, updated_at
```

#### `public.user_roles`
```
id (UUID PK)
user_id → auth.users
role (app_role, default: 'user')
UNIQUE (user_id, role)
```

#### `public.packages`
```
id, name, type (hajj|umrah), category, season, year
price, currency (default: NGN), agent_discount
deposit_allowed, minimum_deposit
capacity, available
inclusions[], airlines[], departure_cities[]
duration, description, image_url
status (active|draft|archived), featured
created_at, updated_at
```

#### `public.package_dates`
```
id, package_id → packages
outbound (DATE), outbound_route
return_date (DATE), return_route
airline, islamic_date, islamic_return_date
```

#### `public.package_accommodations`
```
id, package_id → packages
city (makkah|madinah), hotel
distance_from_haram, distance_from_masjid
rating (int, default 3)
room_types[]
```

#### `public.bookings`
```
id, reference (auto-generated: RTT-{year}-{6digits})
user_id → auth.users
package_id → packages
package_date_id → package_dates
agent_id → agents          (nullable — set when agent books for client)
agent_client_id → agent_clients (nullable)
status (booking_status, default: pending)
full_name, passport_number, passport_expiry, date_of_birth, gender
emergency_contact_name, emergency_contact_phone, emergency_contact_relationship
departure_city, room_preference, special_requests
created_at, updated_at
```
**Booking reference format:** `RTT-{YEAR}-{6-digit-padded-random}` (collision-safe loop in trigger)

#### `public.payments`
```
id, booking_id → bookings
amount, method (payment_method)
status (payment_status, default: pending)
paystack_reference, proof_of_payment_url
verified_by → auth.users, verified_at
notes, created_at
```

#### `public.documents`
```
id, booking_id → bookings (nullable)
user_id → auth.users
type (document_type), file_url, file_name
uploaded_at
```

#### `public.agents`
```
id, user_id → auth.users (UNIQUE)
business_name, contact_person, email, phone
agent_code (UNIQUE)
commission_rate (numeric, default 0)
status (agent_status, default: pending)
created_at, updated_at
```

#### `public.agent_clients`
Agent's personal client directory (not linked to auth users).
```
id, agent_id → agents
full_name, email, phone
passport_number, passport_expiry, date_of_birth, gender
notes
created_at, updated_at
```

#### `public.agent_applications`
Public-facing agent signup application form.
```
id, user_id (nullable)
business_name, contact_person, email, phone, message
status (pending|approved|rejected, CHECK constraint)
reviewed_by, reviewed_at
created_at
```

#### `public.staff_permissions`
Granular permissions for staff members.
```
id (UUID PK), user_id → auth.users, permission (text), granted_by, created_at
```

#### `public.staff_support_specialties`
Links staff to support ticket categories.
```
id (UUID PK), user_id → auth.users, category (text), created_at
```

#### `public.bank_accounts`
Admin-managed accounts for manual payments.
```
id, bank_name, account_name, account_number, sort_code, is_active, created_at
```

#### `public.support_tickets`
Customer support tickets.
```
id, user_id, subject, description, category, priority, status, unread_count_admin, last_message_at, created_at, updated_at
```

#### `public.support_messages`
Messages within a support ticket.
```
id, ticket_id, sender_id, message, attachment_url, created_at
```

#### `public.user_activity`
Audit log of user actions.
```
id, user_id, event_type, metadata (json), package_id, booking_id, created_at
```

#### `public.booking_amendment_requests`
```
id, booking_id, user_id, requested_changes (json), status, admin_notes, reviewed_by, reviewed_at, created_at
```

#### `public.notifications`
Realtime-enabled. Auto-populated by DB triggers.
```
id, user_id, title, message, type, read, link, created_at
```
**Auto-notification triggers:**
- `on_booking_status_change` → notifies user when booking status changes
- `on_payment_status_change` → notifies user when payment status changes

### Storage Buckets (all private)
| Bucket             | Access Pattern                                      |
|--------------------|-----------------------------------------------------|
| `passport-photos`  | Users own folder; admins can read all              |
| `payment-receipts` | Users own folder; admins can read all              |
| `documents`        | Users own folder; admins can read all              |

### DB Functions
| Function                        | Purpose                                     |
|---------------------------------|---------------------------------------------|
| `has_role(user_id, role)`       | RLS helper — checks user_roles table        |
| `handle_new_user()`             | Trigger fn — creates profile + user role    |
| `generate_booking_reference()`  | Trigger fn — creates RTT-YYYY-XXXXXX ref    |
| `update_updated_at_column()`    | Trigger fn — auto-updates updated_at        |
| `notify_booking_status_change()`| Trigger fn — inserts notifications on booking update |
| `notify_payment_status_change()`| Trigger fn — inserts notifications on payment update |

---

## 6. Edge Functions (Supabase Deno)

Located in `supabase/functions/`:

| Function Name              | Purpose                                                              |
|----------------------------|----------------------------------------------------------------------|
| `admin-ai-chat`            | AI assistant for admins (uses custom prompt engineering)             |
| `approve-agent-application`| Approves agent applications — promotes user role to `agent`, creates agent record|
| `create-paystack-checkout` | Initiates payment with manual JWT verification for security          |
| `generate-proposal`        | AI-powered structured proposal generator from text/PDF               |
| `invite-staff`             | Admin-only tool to create staff accounts with preset credentials     |
| `seed-demo-data`           | Seeds demo packages and data for development/testing                |
| `send-payment-receipt`     | Manual verification receipt sender (service role bypass)             |
| `verify-paystack-payment`  | Verifies Paystack reference with hybrid auth (service/user)          |
| `_shared/`                 | Shared utilities (CORS, JWT helpers, validation)                     |

---

## 7. Frontend Architecture

### Key Files
| File                                    | Role                                        |
|-----------------------------------------|---------------------------------------------|
| `src/App.tsx`                           | Root app with all routes                    |
| `src/main.tsx`                          | React entry point                           |
| `src/contexts/AuthContext.tsx`          | Global auth state (session, user, roles)    |
| `src/integrations/supabase/client.ts`   | Supabase client singleton                   |
| `src/integrations/supabase/types.ts`    | Full TypeScript DB types (auto-generated)   |
| `src/lib/lazyWithRetry.ts`              | Lazy import with chunk error auto-retry     |
| `src/index.css`                         | Global styles & Tailwind config             |
| `src/components/auth/ProtectedRoute.tsx`| Route guard component                       |

### Component Directory Structure
```
src/components/
  admin/       → AdminLayout and admin-specific components
  agent/       → AgentLayout and agent-specific components
  auth/        → ProtectedRoute
  dashboard/   → DashboardLayout and dashboard components
  landing/     → Landing page sections (9 components)
  notifications/ → Notification bell/dropdown
  packages/    → Package card/list components
  ui/          → All shadcn/Radix UI primitives (52 components)
  NavLink.tsx  → Shared navigation link component
```

### Internationalization (i18n)
- Located in `src/i18n/` (5 files)
- Uses `i18next` + `react-i18next`
- Language preference stored per user in `profiles.language_preference`

### Hooks Directory
- `src/hooks/` — 3 custom hooks (exact names to be confirmed)

### Data Directory
- `src/data/` — 2 static data files (likely seed/mock data)

---

## 8. Security Model Summary

| Layer              | Implementation                                           |
|--------------------|----------------------------------------------------------|
| Auth               | Supabase JWT auth — token-based sessions                |
| Route guards       | `ProtectedRoute` component with `requiredRole` check     |
| DB access          | RLS enabled on ALL tables — no table is unprotected     |
| Storage access     | User folder isolation (`auth.uid()` in path check)      |
| Edge functions     | JWT-verified by Supabase (except where public needed)   |
| Role isolation     | `has_role()` SECURITY DEFINER function in all policies  |
| Notification inserts | Triggers use SECURITY DEFINER to bypass RLS safely   |

**Key RLS patterns:**
- Users can only see/modify their own data (`user_id = auth.uid()`)
- Admins bypass all restrictions via `has_role(auth.uid(), 'admin')`
- Agents have scoped access to their own bookings and client records
- Package browsing is public (anon-accessible) for `status = 'active'` packages
- Agent applications can be inserted anonymously (public form)

---

## 9. Development Notes

### Environment Variables (`.env`)
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
> ⚠️ The `.env` file is **not** in `.gitignore` — review before committing to public repo.

### Scripts
```bash
npm run dev        # Start Vite dev server
npm run build      # Production build
npm run build:dev  # Dev-mode build
npm run lint       # ESLint
npm run test       # Vitest (run once)
npm run test:watch # Vitest watch mode
npm run preview    # Preview production build
```

### Testing
- Vitest + Testing Library + jsdom
- Test files in `src/test/` (2 files)

### Migration Files (in order)
1. `20260214010035` — Base schema: all core tables, RLS, triggers, storage buckets
2. `20260214094341` — Notifications table + realtime + booking/payment auto-notify triggers
3. `20260214094416` — Security fix: tighten notifications INSERT policy
4. `20260214094953` — Agent clients table + agent booking/payment RLS policies
5. `20260214103802` — Agent applications table

---

## 10. Known Architecture Decisions

- **Lazy loading everywhere:** All pages use `lazyWithRetry()` (custom wrapper) for code splitting with automatic chunk error recovery.
- **Suspense + ErrorBoundary:** Wraps all lazy routes at app root.
- **Auth deadlock prevention:** `fetchUserData` is called inside `setTimeout(..., 0)` inside the `onAuthStateChange` listener to prevent Supabase auth listener blocking on DB calls.
- **Booking references:** Generated server-side by DB trigger with collision detection — format `RTT-{YEAR}-{6digits}`.
- **Agent flow:** Agents must first submit an `agent_applications` record → admin approves via `approve-agent-application` edge fn → user gets `agent` role → `agents` record created.
- **Dynamic Bank Accounts:** Admin-managed bank accounts displayed to pilgrims for transfers.
- **User Activity Tracking:** Real-time logging of customer interactions (`package_view`, `booking_start`, `payment_attempt`, etc.) to monitor conversion funnels.
- **AI Proposal Engine:** Uses advanced LLM templates to convert messy client requirements (PDF/Text) into professional Hajj/Umrah proposals.
- **Support Specialties:** Tickets are routed to staff based on their specialties (`payment`, `documents`, etc.).
- **Edge Function Hardening:** All critical edge functions use a manual JWT verification wrapper (`verifyAuth`) instead of relying solely on Supabase `verify_jwt` toggle, allowing for service-role bypass where necessary while maintaining user security.

---

*This document is maintained as a living index. When making changes to the project, update the relevant sections and append an entry to the `CHANGELOG.md` file in this same `docs/` directory.*
