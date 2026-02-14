

# Phase 1 (Part 2): Database Foundation Setup

## Summary

Set up the complete backend database schema on Lovable Cloud, including authentication, all core tables with Row Level Security, storage buckets, and seed the 6 existing packages into the database.

---

## Step 1: Authentication Configuration

- Enable email/password authentication
- Keep email confirmation enabled (users must verify before signing in)

## Step 2: Database Schema (Single Migration)

Create all tables, enums, functions, triggers, and RLS policies in one migration:

### Enums

- `app_role` -- `admin`, `moderator`, `agent`, `user`
- `booking_status` -- `pending`, `confirmed`, `cancelled`, `completed`
- `payment_status` -- `pending`, `verified`, `rejected`, `refunded`
- `payment_method` -- `paystack`, `bank_transfer`, `ussd`
- `document_type` -- `passport`, `vaccine_certificate`, `visa`, `flight_ticket`, `hotel_voucher`, `booking_confirmation`, `payment_receipt`, `pre_departure_guide`
- `agent_status` -- `active`, `suspended`, `pending`
- `package_status` -- `active`, `draft`, `archived`
- `package_type` -- `hajj`, `umrah`
- `package_category` -- `premium`, `standard`, `budget`

### Tables

1. **profiles** -- `id` (FK to auth.users), `full_name`, `phone`, `language_preference` (default 'en'), `avatar_url`, `created_at`, `updated_at`

2. **user_roles** -- `id`, `user_id` (FK to auth.users), `role` (app_role, default 'user'), unique on (user_id, role)

3. **packages** -- `id`, `name`, `type` (package_type), `category` (package_category), `season`, `year`, `price`, `currency`, `agent_discount`, `deposit_allowed`, `minimum_deposit`, `capacity`, `available`, `inclusions` (text[]), `airlines` (text[]), `departure_cities` (text[]), `duration`, `description`, `image_url`, `status` (package_status), `featured`, `created_at`, `updated_at`

4. **package_dates** -- `id`, `package_id` (FK), `outbound`, `outbound_route`, `return_date`, `return_route`, `airline`, `islamic_date`, `islamic_return_date`

5. **package_accommodations** -- `id`, `package_id` (FK), `city` ('makkah' or 'madinah'), `hotel`, `distance_from_haram`, `distance_from_masjid`, `rating`, `room_types` (text[])

6. **bookings** -- `id`, `reference` (unique, format RTT-2026-XXXXXX), `user_id` (FK), `package_id` (FK), `package_date_id` (FK), `status` (booking_status), `full_name`, `passport_number`, `passport_expiry`, `date_of_birth`, `gender`, `emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_relationship`, `departure_city`, `room_preference`, `special_requests`, `created_at`, `updated_at`

7. **payments** -- `id`, `booking_id` (FK), `amount`, `method` (payment_method), `status` (payment_status), `paystack_reference`, `proof_of_payment_url`, `verified_by`, `verified_at`, `notes`, `created_at`

8. **documents** -- `id`, `booking_id` (FK), `user_id` (FK), `type` (document_type), `file_url`, `file_name`, `uploaded_at`

9. **agents** -- `id`, `user_id` (FK to auth.users), `business_name`, `contact_person`, `email`, `phone`, `agent_code` (unique), `commission_rate` (numeric), `status` (agent_status), `created_at`, `updated_at`

### Helper Function

- `has_role(user_id, role)` -- Security definer function to check roles without RLS recursion

### Auto-Profile Trigger

- Trigger on `auth.users` insert to auto-create a profile row and assign default 'user' role

### Booking Reference Function

- Database function to generate unique `RTT-2026-XXXXXX` references on booking insert

### RLS Policies

| Table | Policy |
|---|---|
| **profiles** | Users read/update own profile; admins read all |
| **user_roles** | Users read own roles; admins manage all |
| **packages** | Public read for active packages; admins full CRUD |
| **package_dates** | Public read; admins full CRUD |
| **package_accommodations** | Public read; admins full CRUD |
| **bookings** | Users read/create own; agents read their clients'; admins read all |
| **payments** | Users read own; admins full access |
| **documents** | Users read/upload own; admins full access |
| **agents** | Agents read own; admins full CRUD |

## Step 3: Storage Buckets

Create three storage buckets with appropriate RLS:

- **passport-photos** -- private, users upload own, admins read all
- **payment-receipts** -- private, users upload own, admins read all
- **documents** -- private, users upload own, admins read all

## Step 4: Seed Package Data

Insert the 6 existing packages from `src/data/packages.ts` into the `packages`, `package_dates`, and `package_accommodations` tables using the data insert tool.

## Step 5: Code Updates

No major frontend changes in this step -- the landing page continues using static data. The database is being prepared for Phase 2 (User Portal & Booking System) where we'll switch to querying from the database.

---

## Technical Details

### Full Table Relationships

```text
auth.users
  |-- profiles (1:1)
  |-- user_roles (1:many)
  |-- bookings (1:many)
  |-- documents (1:many)
  |-- agents (1:1, optional)

packages
  |-- package_dates (1:many)
  |-- package_accommodations (1:many)
  |-- bookings (1:many)

bookings
  |-- payments (1:many)
  |-- documents (1:many)
```

### Migration Order

1. Create enums
2. Create `has_role` function
3. Create tables (profiles, user_roles, packages, package_dates, package_accommodations, bookings, payments, documents, agents)
4. Enable RLS on all tables
5. Create all RLS policies
6. Create auto-profile trigger
7. Create booking reference function
8. Create storage buckets with policies

### Security Notes

- Roles stored in separate `user_roles` table (never on profiles)
- `has_role()` uses `SECURITY DEFINER` to avoid RLS recursion
- All tables have RLS enabled with appropriate policies
- No files stored in database -- only URLs to storage buckets
- Package read access is public (no auth required) for the landing page

