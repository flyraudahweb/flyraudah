

# Fix Booking Form Issues

## Issue 1: Travel Date Not Selectable
The travel dates exist in the database and the booking wizard code renders them as clickable buttons. The dates **should** be selectable in the user booking wizard (Step 1). However, in the **Agent Booking** form (`AgentBookForClient.tsx`), the Select component for dates works correctly based on the code.

If the issue is specifically in the user booking wizard, the date buttons should be working -- but we will add better visual feedback and ensure the click handler fires correctly by switching from raw `<button>` elements to proper interactive components.

## Issue 2: Room Preference Not Selecting
**Root cause found:** The database stores city names in **lowercase** (`makkah`, `madinah`), but the code filters with **capitalized** names (`"Makkah"`, `"Madinah"`). This means `makkahAccom` and `madinahAccom` are always `undefined`, resulting in an empty room dropdown.

**File:** `src/pages/dashboard/BookingWizard.tsx` (lines 171-172)
- Change `a.city === "Makkah"` to `a.city?.toLowerCase() === "makkah"`
- Change `a.city === "Madinah"` to `a.city?.toLowerCase() === "madinah"`

## Issue 3: Paystack Checkout Not Working
**Root cause found:** The `onSubmitBooking` function creates the booking and payment record in the database, but when the user selects "Card Payment (Paystack)", it **never calls the `create-paystack-checkout` edge function**. It just jumps to the confirmation page (Step 5) with a "pending" payment.

**Fix in** `src/pages/dashboard/BookingWizard.tsx`:
- After creating the booking and payment record, if `paymentMethod === "card"`, call the `create-paystack-checkout` edge function with the user's email, amount, and booking ID
- Redirect the user to the Paystack authorization URL returned by the edge function
- Only show the confirmation page (Step 5) for bank transfer payments
- For Paystack, the user will return via `/payment-callback` after completing payment on Paystack's hosted page

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/dashboard/BookingWizard.tsx` | Fix city case comparison for room types; add Paystack checkout redirect after booking creation |

## Technical Details

The Paystack flow after the fix:
1. User clicks "Complete Booking" with Paystack selected
2. Booking + payment records created in DB (status: pending)
3. Edge function `create-paystack-checkout` is called with email, amount, booking ID
4. User is redirected to Paystack's hosted payment page
5. After payment, Paystack redirects to `/payment-callback?reference=xxx`
6. The existing `verify-paystack-payment` edge function verifies and updates the payment status

