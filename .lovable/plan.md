

# Enhanced Print-Ready Pilgrim ID Cards with Batch Print & Auto-Generation

## What's Changing

The current ID card system works but has limitations: the PDF uses a fake QR pattern instead of real QR codes, the print layout isn't optimized for cutting, there's no auto-generate option, and the card design could be more polished. This plan addresses all of these.

---

## 1. Improved ID Card Design (On-Screen)

**Enhanced `PilgrimIdCard` component:**
- Add a subtle crescent moon and star icon in the header alongside the title
- Add a unique card number (formatted as `RTT-2026-XXXX` using last 4 of booking ID)
- Add an "Emergency Contact" placeholder line
- Add a holographic-style gold border effect on hover (screen only)
- Improve spacing and typography for a more premium feel
- Add a back-of-card section with terms/emergency info (for PDF only)

## 2. Real QR Codes in PDF

**Current problem:** The PDF uses a fake checkerboard pattern instead of actual QR codes.

**Fix:** Use `html2canvas` (already installed) to capture each `QRCodeSVG` as an image, then embed it into the PDF via `pdf.addImage()`. This gives pixel-perfect, scannable QR codes in the downloaded PDF.

## 3. Batch Print Optimization

**Print layout improvements in `index.css`:**
- Fixed card dimensions matching standard ID card size (85.6mm x 53.98mm, credit-card format)
- 4 cards per A4 page (2 columns x 2 rows) with cutting guides
- Dashed crop marks around each card for easy cutting
- Page numbers in print footer
- Force background colors to print (`-webkit-print-color-adjust: exact`)

**Batch controls in the UI:**
- "Print All Confirmed" quick button that auto-selects only confirmed bookings
- Card count per page selector (1, 2, or 4 per page)
- Print preview count badge showing total pages needed

## 4. Auto-Generate Feature

**New "Auto Generate All" button:**
- One click to generate PDF for ALL confirmed bookings (no manual selection needed)
- Shows a progress indicator during generation
- Automatically filters to only confirmed/approved status bookings
- Generates with filename including date and count: `pilgrim-ids-2026-02-14-25cards.pdf`

**Status filter tabs above the pilgrim list:**
- All | Confirmed | Pending | Cancelled
- Makes it easy to quickly select subsets

---

## Technical Details

### File: `src/pages/admin/AdminIdTags.tsx`

Major changes:
- Add status filter tabs (All / Confirmed / Pending) using existing Tabs component
- Add "Auto Generate All Confirmed" button in the actions bar
- Refactor `generatePDF` to capture real QR codes from hidden rendered SVGs using `html2canvas`
- Add cards-per-page option (1, 2, or 4)
- Add progress state during PDF generation
- Enhance `PilgrimIdCard` with card number, improved layout, and emergency contact line
- Add a hidden container that renders QR codes for PDF capture

### File: `src/index.css`

Print style enhancements:
- Credit-card sized cards with crop marks
- 4-up layout for batch printing
- Force print colors with `color-adjust: exact`
- Hide all non-card elements during print
- Add dashed cutting guide borders

### No new files or dependencies needed
- `html2canvas` is already installed for QR-to-image conversion
- `jsPDF` already installed
- `qrcode.react` already installed
- All UI components (Tabs, Badge, Button) already available

