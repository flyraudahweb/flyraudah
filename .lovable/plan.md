
# Dedicated Packages Page with Filters

## Overview
Create a new `/packages` page that displays all travel packages with filtering by price range, travel date, and departure city. The page reuses the existing `PackageCard` component and matches the ultra-luxury design language.

---

## New Files

### 1. `src/pages/Packages.tsx`
A dedicated page with:
- **Hero banner**: Compact header with emerald gradient background, page title "All Packages", and breadcrumb (Home > Packages)
- **Filter bar**: Sticky/visible filter section with three filters side by side (responsive - stacks on mobile):
  - **Price Range**: A dual-handle slider (using existing Radix Slider) with min/max labels showing formatted NGN values. Range: 3,000,000 to 8,000,000
  - **Travel Date**: A Select dropdown (using existing Radix Select) with month options extracted from the package dates (e.g., "February 2026", "March 2026", "June 2026", "All Dates")
  - **Departure City**: A Select dropdown with options derived from package data ("All Cities", "Abuja", "Kano", "Lagos")
- **Active filter chips**: Show active filters as removable badges below the filter bar
- **Results count**: "Showing X of Y packages"
- **Package grid**: 3-column grid (same as landing page) showing filtered results using the existing `PackageCard` component
- **Empty state**: A styled message when no packages match filters
- **Back to home link**: Button or breadcrumb to return to the landing page

### 2. Extract `PackageCard` into `src/components/packages/PackageCard.tsx`
Move the `PackageCard` component and `tierConfig` out of `PackagesSection.tsx` into its own file so both the landing page section and the new packages page can import it without duplication.

---

## Modified Files

### 3. `src/components/landing/PackagesSection.tsx`
- Remove the inline `PackageCard` component and `tierConfig`
- Import `PackageCard` from `@/components/packages/PackageCard`

### 4. `src/App.tsx`
- Add route: `<Route path="/packages" element={<Packages />} />`
- Import the new Packages page

### 5. `src/components/landing/Header.tsx`
- Update the "Packages" nav link from `#packages` to `/packages` so it navigates to the dedicated page (or keep both -- anchor on landing, route link otherwise)

### 6. `src/components/landing/PackagesSection.tsx`
- Update the "View All Packages" button to use `react-router-dom` `Link` instead of `window.location.href`

---

## Filter Logic (in Packages.tsx)

```text
1. Start with all active packages
2. Apply price filter: keep packages where price >= min AND price <= max
3. Apply date filter: if a month is selected, keep packages that have at least one date in that month
4. Apply city filter: if a city is selected, keep packages whose departureCities array includes it
5. Display filtered results in the grid
```

---

## Design Details

- Page background matches landing page gradient style (cream-to-white)
- Filter bar has a card-like container with subtle border, matching the luxury aesthetic
- Slider track uses emerald/gold accent colors
- Select dropdowns use the existing styled Select component
- The compact hero at top uses the same emerald gradient as the main hero but shorter (py-16)
- Header component is included at the top for navigation consistency
- Footer is included at the bottom

---

## Technical Notes
- No new dependencies needed -- uses existing Radix Select, Radix Slider, framer-motion, and react-router-dom
- Price slider values stored as `[min, max]` state with debounce-free direct filtering
- Date options are computed from the packages data to avoid hardcoding months
- The PackageCard component is fully reusable with no changes needed to its internals
