
# Replace Packages with Real Data from Flyers

## Overview
Delete all existing mock packages from the database and insert the 7 real packages extracted from the uploaded flyers. Also update the local `src/data/packages.ts` file to match.

No bookings exist yet, so it's safe to do a clean replacement.

## Packages to Insert (from flyers)

| # | Package Name | Type | Category | Price | Airline | City |
|---|---|---|---|---|---|---|
| 1 | Hajj 2026 | hajj | premium | N7,800,000 | EgyptAir/Saudi Airlines | Abuja, Kano, Lagos |
| 2 | Ramadan Umrah 2026 - Premium (Abuja) | umrah | premium | N5,500,000 | EgyptAir | Abuja |
| 3 | Ramadan Umrah 2026 - Premium (Kano) | umrah | premium | N5,500,000 | Saudi Airlines | Kano |
| 4 | Ramadan Umrah 2026 - Standard (Kano) | umrah | standard | N4,500,000 | MaxAir | Kano |
| 5 | Sha'ban Umrah 2026 - Budget | umrah | budget | N3,000,000 | Fly Adeal | Kano |
| 6 | Sha'ban Umrah 2026 - Standard (EgyptAir) | umrah | standard | N3,700,000 | EgyptAir | Kano |
| 7 | Sha'ban Umrah 2026 - Standard (Fly Adeal) | umrah | standard | N3,700,000 | Fly Adeal | Kano |

## Key Differences from Current Data
- Standard Ramadan now Kano-only (was Abuja/Kano), with 9 departure dates (was 6)
- Sha'ban Standard split into 2 separate packages (EgyptAir and Fly Adeal versions, was 1 combined)
- Total: 7 packages (was 6)

## Steps

### Step 1: Clear existing data from database
Delete all rows from `package_accommodations`, `package_dates`, then `packages` (in that order due to foreign keys).

### Step 2: Insert new packages into database
Insert 7 packages with correct details, then their dates and accommodations.

Travel dates per package:
- **Hajj**: Jun 1 -> Jul 12 (Nigeria to Saudi Arabia)
- **Premium Abuja**: Mar 3 Abuja->Madina, Mar 20 Jeddah->Abuja
- **Premium Kano**: Mar 6 Kano->Jeddah, Mar 20 Jeddah->Kano
- **Standard Kano (MaxAir)**: 9 dates -- Feb 18, 23, 25, Mar 1, 2, 5, 6, 8, 11 departures
- **Sha'ban Budget**: Feb 3 Kano->Jed, Feb 16 Jed->Kano
- **Sha'ban Standard (EgyptAir)**: Feb 15 Kano->Madina, Mar 3 Jeddah->Kano
- **Sha'ban Standard (Fly Adeal)**: Feb 16 Kano->Jed, Mar 3 Jeddah->Kano

### Step 3: Update `src/data/packages.ts`
Replace the hardcoded package array to match the new 7 packages (this file is used as a local fallback/reference).

## Technical Details

### Database Operations (using insert/update/delete tool)
1. `DELETE FROM package_accommodations` -- clear accommodations
2. `DELETE FROM package_dates` -- clear dates
3. `DELETE FROM packages` -- clear packages
4. `INSERT INTO packages (...)` -- 7 rows with correct name, type, category, season, year, price, currency, agent_discount, deposit_allowed, minimum_deposit, capacity, available, inclusions, airlines, departure_cities, duration, status, featured
5. `INSERT INTO package_dates (...)` -- 13 date rows total (1 Hajj + 1 Premium Abuja + 1 Premium Kano + 9 Standard Kano + 1 Budget + 1 Standard EgyptAir + 1 Standard Fly Adeal = ~15 rows, including returns embedded in each row)
6. `INSERT INTO package_accommodations (...)` -- 14 rows (2 per package: makkah + madinah)

### File Change: `src/data/packages.ts`
Update the `packages` array to reflect the 7 new packages with matching data.
