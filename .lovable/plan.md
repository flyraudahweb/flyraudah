

# Admin Dashboard Enhancement and Beautiful ID Tags

## Overview

Two major improvements: (1) Transform the admin dashboard overview into a rich, data-dense command center with more visualizations, and (2) Redesign the ID tags into beautiful, print-ready pilgrim ID cards with branding and professional design.

---

## Part 1: Enhanced Admin Dashboard Overview

The current `AdminOverview` page only shows 4 basic stat cards. We'll transform it into a comprehensive dashboard with inline charts, recent activity tables, and quick-action links.

### New Dashboard Sections

**1. Enhanced Stat Cards (top row)**
- Total Revenue (with percentage change indicator)
- Total Bookings
- Active Pilgrims (confirmed bookings)
- Pending Payments (with urgent badge)
- Total Agents
- Conversion Rate (confirmed / total bookings)

**2. Inline Charts (merged from Analytics, summarized)**
- Revenue trend (mini area chart, last 6 months)
- Booking status breakdown (donut chart)
- Package type split (Hajj vs Umrah pie)

**3. Recent Activity Section**
- Latest 5 bookings table
- Latest 5 payments table (with verify quick-action)

**4. Quick Actions Bar**
- Link cards to: Manage Packages, Verify Payments, View Pilgrims, AI Assistant

### Data Queries
- Fetch profiles count, agents count in addition to existing queries
- All data comes from existing tables (bookings, payments, packages, profiles, agents)

---

## Part 2: Beautiful Pilgrim ID Cards

Completely redesign `AdminIdTags.tsx` to generate professional, branded ID cards.

### ID Card Design Features

**Card Layout (credit-card size, landscape orientation):**
- Emerald green gradient header with Raudah logo and "PILGRIM ID CARD" title
- Gold accent stripe divider
- Pilgrim photo placeholder (avatar with initials)
- Full name in large text
- Info grid: Reference, Package, Passport No., Gender, Status, Departure City
- QR code (right side) encoding the booking reference
- Footer with "Raudah Travels & Tours" and year
- Islamic geometric pattern watermark in background

**Print Styles:**
- 2 cards per A4 page (landscape cards stacked)
- Proper page-break handling
- Print-optimized colors (no screen-only effects)
- Clean borders and shadows for cutting guides

**PDF Generation:**
- Redesigned PDF output matching the on-screen card design
- Proper font sizing, spacing, and branding elements
- QR code properly embedded

**On-screen Preview:**
- Show a live preview of the ID card before printing
- Cards displayed in a grid layout
- Each card is a mini visual replica of the printed version

---

## Technical Details

### Files Modified

| File | Changes |
|------|---------|
| `src/pages/admin/AdminOverview.tsx` | Complete rewrite: add 6 stat cards, 3 inline charts (area, donut, pie), recent bookings/payments tables, quick action links. Import recharts components. |
| `src/pages/admin/AdminIdTags.tsx` | Complete redesign: beautiful branded ID card component with emerald/gold theme, Islamic patterns, QR code, photo placeholder. Redesigned print and PDF output with proper card layout. |
| `src/index.css` | Add print-specific CSS for ID cards (`@media print` rules) and `.id-card` styling classes. |

### No New Dependencies
- Uses existing `recharts` for dashboard charts
- Uses existing `jsPDF` for PDF generation
- Uses existing `qrcode.react` for QR codes (switch from API-based to client-side)
- All styling via Tailwind + custom CSS

### Design Tokens Used
- Primary emerald: `hsl(162, 90%, 17%)` -- card header
- Secondary gold: `hsl(43, 56%, 52%)` -- accent stripe, borders
- Playfair Display for card headings
- Inter for card body text

