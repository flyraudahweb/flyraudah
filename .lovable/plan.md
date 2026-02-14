

## Phase 2: Parts 3, 4 & 5 -- Package Browsing, Booking Flow, Payments & Documents

This plan covers three interconnected features that complete the User Portal experience. Together, they let a user browse database-driven packages, book one through a guided wizard, pay via card or bank transfer, and manage their documents.

---

### Part 3: Database-Driven Package Browsing

**Current state:** The public `/packages` page and `PackageCard` component read from a static `src/data/packages.ts` array. The dashboard packages page already fetches from the database.

**Changes:**

1. **Refactor `/packages` page** to fetch from the database using React Query instead of the static array. Query `packages` table joined with `package_accommodations` and `package_dates`, filtered by `status = 'active'`.

2. **Add type/category filter** to the existing price, month, and city filters (Hajj vs Umrah toggle, Premium/Standard/Budget chips).

3. **Create a Package Detail page** (`/packages/:id`) showing:
   - Full package info, all inclusions, accommodation details with star ratings
   - All available travel dates with Islamic calendar dates
   - Capacity/availability bar
   - "Book Now" button linking to the booking wizard
   - Breadcrumb navigation

4. **Update `PackageCard`** to accept database-shaped data (snake_case fields from Supabase) instead of the static `TravelPackage` type. The "View Details" button links to `/packages/:id`, and "Book Now" links to `/dashboard/book/:id`.

5. **Update `DashboardPackages`** to also link to detail/booking views.

6. **Keep `src/data/packages.ts`** as a reference/fallback but all runtime data comes from the database.

---

### Part 4: 5-Step Booking Wizard

**New route:** `/dashboard/book/:packageId`

A protected, multi-step form using React Hook Form + Zod validation.

**Step 1 -- Package Confirmation**
- Display selected package summary (name, price, dates, accommodation)
- User selects a travel date from `package_dates`
- Shows price breakdown (full price vs deposit option if `deposit_allowed`)

**Step 2 -- Pilgrim Information**
- Full name (as on passport), passport number, passport expiry
- Date of birth, gender
- Upload passport photo (to `passport-photos` storage bucket)
- Zod validation: passport format, expiry must be future date, all required

**Step 3 -- Travel Preferences**
- Departure city (from package's `departure_cities` array)
- Room preference (from accommodation `room_types`)
- Special requests / medical needs (textarea)
- Emergency contact: name, phone (+234 format), relationship

**Step 4 -- Payment Selection**
- Shows total amount and deposit option (for Hajj)
- Payment method choice: Bank Transfer or Card (Paystack)
- If bank transfer: shows WEMA Bank details + receipt upload
- If card: initiates Paystack checkout

**Step 5 -- Confirmation**
- Shows booking reference (auto-generated `RTT-YYYY-XXXXXX`)
- Booking summary with status
- "View My Bookings" and "Download Receipt" buttons

**Database interaction:**
- INSERT into `bookings` table with all pilgrim/travel data
- INSERT into `documents` for passport photo upload
- INSERT into `payments` for payment record
- Decrement `packages.available` count

**Component structure:**
- `src/pages/dashboard/BookingWizard.tsx` -- main wizard container with step state
- `src/components/booking/StepPackageConfirm.tsx`
- `src/components/booking/StepPilgrimInfo.tsx`
- `src/components/booking/StepTravelPrefs.tsx`
- `src/components/booking/StepPayment.tsx`
- `src/components/booking/StepConfirmation.tsx`
- `src/components/booking/BookingStepIndicator.tsx` -- progress bar

---

### Part 5: Payments & Documents

**Paystack Integration:**
- Create an edge function `create-paystack-checkout` that initializes a Paystack transaction using the Paystack secret key
- The edge function returns an `authorization_url` that the frontend redirects to
- Create a callback handler edge function `paystack-webhook` to verify payment and update `payments` status
- Frontend payment callback page `/payment/callback` verifies via the edge function

**Bank Transfer Flow:**
- Display WEMA Bank account details (0122809772)
- User uploads proof of payment to `payment-receipts` storage bucket
- Creates a `payments` record with `method: 'bank_transfer'` and `status: 'pending'`
- Admin will verify later (Phase 4)

**Document Management (enhanced `DashboardDocuments`):**
- Upload new documents (passport, vaccine certificate) to `documents` storage bucket
- Document type selector using the `document_type` enum
- Associate documents with a booking
- Download existing documents via signed URLs
- Delete own documents

**Payment History (enhanced `DashboardPayments`):**
- Show payment timeline per booking (deposit -> installments -> final)
- Balance remaining indicator
- "Make Payment" button for outstanding balances
- Receipt download for verified payments

---

### Technical Details

**New files to create:**
```text
src/pages/dashboard/BookingWizard.tsx
src/pages/PackageDetail.tsx
src/pages/PaymentCallback.tsx
src/components/booking/StepPackageConfirm.tsx
src/components/booking/StepPilgrimInfo.tsx
src/components/booking/StepTravelPrefs.tsx
src/components/booking/StepPayment.tsx
src/components/booking/StepConfirmation.tsx
src/components/booking/BookingStepIndicator.tsx
supabase/functions/create-paystack-checkout/index.ts
supabase/functions/verify-paystack-payment/index.ts
```

**Files to modify:**
```text
src/App.tsx                          -- add new routes
src/pages/Packages.tsx               -- switch to database queries
src/components/packages/PackageCard.tsx -- accept DB data shape
src/pages/dashboard/DashboardPackages.tsx -- add book/detail links
src/pages/dashboard/DashboardDocuments.tsx -- add upload capability
src/pages/dashboard/DashboardPayments.tsx -- add make-payment flow
src/pages/dashboard/DashboardBookings.tsx -- add booking detail view
src/i18n/locales/en.json             -- new translation keys
```

**Database changes:**
- No schema changes needed -- all tables already exist with the right columns
- Storage bucket RLS policies for `passport-photos`, `payment-receipts`, and `documents` (upload/read for authenticated users on their own files)

**Secrets needed:**
- `PAYSTACK_SECRET_KEY` -- required for the edge function to initialize and verify transactions

**Security considerations:**
- Booking wizard is behind `ProtectedRoute`
- All database writes use `user_id = auth.uid()` enforced by RLS
- File uploads scoped to user's own directory in storage buckets
- Paystack verification done server-side in edge function (never trust client)
- Zod validation on all form inputs (passport number format, phone format, date ranges)

