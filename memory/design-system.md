# Raudah Travels Admin Design System

This document outlines the core design layout, components, and colors used in the new Admin Dashboard, enabling quick, zero-regression migrations of legacy pages to the heavy glassmorphic aesthetic.

## 1. Typography

The dashboard uses the `font-dashboard` class globally (which maps to `Lato`, with an `Inter` fallback for special characters like the Naira sign `₦`).

*   **Primary Metric Numbers:** `text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tighter w-full [text-shadow:1px_1px_3px_rgba(0,0,0,0.6)]`
*   **Secondary Metric Numbers:** `text-3xl md:text-4xl lg:text-5xl font-black text-foreground tracking-tighter whitespace-nowrap`
*   **Metric Titles:** `text-white/90 text-[15px] font-bold` or `text-muted-foreground text-[15px] font-bold`

## 2. Colors & Gradients

*   **Primary Emerald Gradient (Used for primary stat cards like Total Revenue):**
    `bg-gradient-to-r from-emerald-500 via-emerald-500/90 to-transparent shadow-glass shadow-emerald-500/10`
*   **Primary Card Inner Mix-Blend Highlight (for the glass shine):**
    `<div className="absolute right-0 top-0 bottom-0 w-[15%] bg-gradient-to-l from-white to-transparent opacity-90 mix-blend-screen"></div>`
*   **Secondary Glass Cards (White panels):**
    `glass-panel-light border-0 rounded-xl overflow-hidden relative`

## 3. Engraved Icons (Absolute positioned, top-right)

For primary Emerald cards:
*   `<Icon className="absolute -right-4 -top-4 h-32 w-32 text-white/10 pointer-events-none transform -rotate-12" />`

For secondary / glass cards:
*   Emerald tint: `text-emerald-500/10`
*   Blue tint: `text-blue-500/5`
*   Amber tint: `text-amber-500/10`

## 4. Components

### Stat Card Structure (Primary)

```tsx
<Card className="border-0 overflow-hidden relative bg-gradient-to-r from-emerald-500 via-emerald-500/90 to-transparent shadow-glass shadow-emerald-500/10 rounded-xl">
  <div className="absolute right-0 top-0 bottom-0 w-[15%] bg-gradient-to-l from-white to-transparent opacity-90 mix-blend-screen"></div>
  <Wallet className="absolute -right-4 -top-4 h-32 w-32 text-white/10 pointer-events-none transform -rotate-12" />
  <CardContent className="p-6 relative z-10 w-4/5 flex flex-col justify-between h-full">
    <div className="flex items-center gap-2 mb-4">
      <p className="text-white/90 text-[15px] font-bold">Total Revenue</p>
    </div>
    <p className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tighter whitespace-nowrap w-full [text-shadow:1px_1px_3px_rgba(0,0,0,0.6)]">
      ₦ 123,456
    </p>
  </CardContent>
</Card>
```

### Stat Card Structure (Secondary)

```tsx
<Card className="glass-panel-light border-0 rounded-xl overflow-hidden relative">
  <CalendarCheck className="absolute -right-4 -top-4 h-32 w-32 text-emerald-500/10 pointer-events-none transform -rotate-12" />
  <CardContent className="p-6 flex flex-col justify-between h-full relative z-10">
    <div className="flex items-center gap-2 mb-4">
      <p className="text-muted-foreground text-[15px] font-bold">Total Bookings</p>
    </div>
    <div className="flex items-baseline gap-2">
      <p className="text-3xl md:text-4xl lg:text-5xl font-black text-foreground tracking-tighter whitespace-nowrap">
        150
      </p>
    </div>
  </CardContent>
</Card>
```

### Data DataTables/Containers
*   Tables should be wrapped in `<Card className="glass-panel-light border-0 rounded-xl overflow-hidden mt-6">`
*   Buttons should use Tailwind's `emerald` scheme for primary actions where appropriate.
