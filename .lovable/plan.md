
# UI Polish: Hero Text Size and Sidebar Logo Fixes

## Changes

### 1. Reduce Hero Title Text Size
The hero heading "Raudah Travels & Tours, Your Gateway to the Holy Lands" is too large, especially on bigger screens. The font sizes will be scaled down:
- Current: `text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl`
- New: `text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl`

**File:** `src/components/landing/Hero.tsx`

### 2. Invert Dashboard Sidebar Logo to White
The logo in the client dashboard sidebar appears dark/blue against the dark green background, making it hard to read. Adding `brightness-0 invert` CSS filter to make it white.

**File:** `src/components/dashboard/DashboardSidebar.tsx` (line 56 -- add `brightness-0 invert`)

### 3. Invert Admin Sidebar Logo to White
Same fix for the admin sidebar.

**File:** `src/components/admin/AdminSidebar.tsx` (line 46 -- add `brightness-0 invert`)

### 4. Invert Agent Sidebar Logo to White
Same fix for the agent sidebar.

**File:** `src/components/agent/AgentSidebar.tsx` (line 44 -- add `brightness-0 invert`)

### 5. Invert Mobile Header Logos
The mobile top-bar logos in all three dashboard layouts also need the same white inversion since they sit on light backgrounds -- actually these are on `bg-card` (white/light) so they should remain as-is. Only the sidebar logos (dark green background) need inversion.

## Technical Details

All changes are CSS-only class additions -- no logic changes required.

- **Hero.tsx**: Reduce `h1` font size classes by one step each
- **DashboardSidebar.tsx, AdminSidebar.tsx, AgentSidebar.tsx**: Add `brightness-0 invert` to the sidebar `<img>` logo elements
