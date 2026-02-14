
# Fix PackageCard: Remove Capacity Bar and Fix Expanded Details

## What's Wrong
1. The "45/200 booked" capacity bar is showing fake booking numbers -- needs to be removed entirely.
2. The "More Details" expanded section references old camelCase field names (`pkg.makkah`, `pkg.madinah`, `pkg.dates`, `pkg.depositAllowed`) but the Supabase data uses snake_case names (`package_accommodations`, `package_dates`, `deposit_allowed`). This causes the expanded section to show empty/broken data on the Packages page.

## Changes

### File: `src/components/packages/PackageCard.tsx`

1. **Remove the entire capacity bar section** (the "X/Y booked" text and progress bar)

2. **Fix field name mapping** to handle both local (camelCase) and Supabase (snake_case) data:
   - `pkg.depositAllowed` OR `pkg.deposit_allowed`
   - `pkg.minimumDeposit` OR `pkg.minimum_deposit`
   - `pkg.departure_cities` OR `pkg.departureCities`
   - Accommodations: derive `makkah`/`madinah` from `pkg.package_accommodations` array (filter by `city`) or fall back to `pkg.makkah`/`pkg.madinah`
   - Dates: use `pkg.package_dates` or fall back to `pkg.dates`
   - For dates from Supabase, the return field is `return_date` (not `return`)

3. **Keep everything else the same** -- inclusions, price, airlines, tier badges, expand/collapse, action buttons all stay.
