
# Dynamic Search Widget in Hero Section

## Problem
The hero search widget has hardcoded month options (February, March, June, July). When new packages are added with different travel dates, these months won't appear. The search needs to pull real data from the database.

## Solution

### 1. Fetch available months dynamically from the database
**File:** `src/components/landing/Hero.tsx`

- Import `useQuery` from TanStack React Query and `supabase` client
- Query `package_dates` table (joined through active packages) to get all available travel months
- Parse outbound dates into unique `yyyy-MM` values and derive display labels (e.g., "February 2026")
- Replace the hardcoded `<option>` list with dynamically generated options

### 2. Pass the actual `yyyy-MM` value as the month parameter
**File:** `src/components/landing/Hero.tsx`

- Instead of passing abbreviations like `feb`, `mar`, pass the actual `yyyy-MM` value (e.g., `2026-02`) as the `month` query param
- This removes the need for a hardcoded month mapping and works with any future dates

### 3. Update Packages page to accept `yyyy-MM` month format directly
**File:** `src/pages/Packages.tsx`

- Update the `useEffect` that reads URL params to accept both the old abbreviation format (backward compat) AND the new `yyyy-MM` format directly
- If `month` param matches `yyyy-MM` pattern, use it directly as the filter value
- Otherwise fall back to the existing `MONTH_MAP` lookup

## Technical Details

### Hero.tsx Changes
```typescript
// Add imports
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";

// Fetch active package dates
const { data: monthOptions = [] } = useQuery({
  queryKey: ["hero-month-options"],
  queryFn: async () => {
    const { data } = await supabase
      .from("packages")
      .select("package_dates(outbound)")
      .eq("status", "active");
    const months = new Set<string>();
    data?.forEach((pkg) =>
      pkg.package_dates?.forEach((d) => {
        months.add(format(parseISO(d.outbound), "yyyy-MM"));
      })
    );
    return Array.from(months).sort().map((m) => ({
      value: m,
      label: format(parseISO(`${m}-01`), "MMMM yyyy"),
    }));
  },
});

// Replace hardcoded options with:
{monthOptions.map((opt) => (
  <option key={opt.value} value={opt.value}>{opt.label}</option>
))}
```

### Packages.tsx Changes
```typescript
// Updated useEffect to handle both formats
useEffect(() => {
  const typeParam = searchParams.get("type");
  if (typeParam === "hajj" || typeParam === "umrah") {
    setSelectedType(typeParam);
  }
  const monthParam = searchParams.get("month");
  if (monthParam) {
    if (/^\d{4}-\d{2}$/.test(monthParam)) {
      setSelectedMonth(monthParam); // direct yyyy-MM format
    } else if (MONTH_MAP[monthParam]) {
      setSelectedMonth(MONTH_MAP[monthParam]); // legacy abbreviation
    }
  }
}, [searchParams]);
```

This ensures the search widget always shows current travel months from the database and works correctly as new packages are added.
