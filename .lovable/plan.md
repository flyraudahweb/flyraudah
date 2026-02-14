
## Fix Packages Section Padding

### Problem
The "2026 Hajj & Umrah Packages" section has extra horizontal padding (`px-4 sm:px-8 lg:px-12`) that doesn't match the header's container padding (`px-4`).

### Solution
Update `src/components/landing/PackagesSection.tsx` line 12 to change the container padding from `px-4 sm:px-8 lg:px-12` to just `px-4`, matching the header's `container mx-auto px-4` pattern.

### File to Modify
- `src/components/landing/PackagesSection.tsx` — change `px-4 sm:px-8 lg:px-12` to `px-4` on the container div (line 12)
