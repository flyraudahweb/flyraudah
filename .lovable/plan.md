
# Fix PDF Section Cutting and Enlarge Team Photos

## Changes

### 1. Section-Based PDF Generation
The current approach renders each `.proposal-page` as one canvas and then slices it if it overflows a single A4 page -- this causes content to be cut mid-text. The fix is to use `data-pdf-section` attributes on logical content blocks within each page. The PDF generator will iterate over these sections individually, capturing each one with `html2canvas` and placing it on the current page only if it fits; otherwise it starts a new page.

This ensures no section is ever split across two pages.

### 2. Enlarge Team Photos
Team member photos are currently `w-10 h-10` (40px). These will be increased to `w-20 h-20` (80px) for a more prominent, professional look in both the on-screen view and the PDF.

### 3. Split PricingContactPage into Separate Pages
The current `PricingContactPage` combines pricing, timeline, and contact into one long page -- which is the main cause of overflow/cutting. This will be split into:
- **PricingTimelinePage** (Sections 05 + 06)
- **ContactPage** (Section 07 with team photos + company details + footer)

---

## Technical Details

### File: `src/pages/Proposal.tsx`

**PDF Generation (lines 15-57):**
Replace the current page-based approach with a section-based approach:
- Query all `[data-pdf-section]` elements instead of `.proposal-page`
- For each section, capture with `html2canvas`, calculate its height in mm
- If it won't fit on the current page, add a new page first
- Add a small gap (3mm) between sections
- This prevents any content from being split across pages

**Team Photos (line 348):**
Change `className="w-10 h-10"` to `className="w-20 h-20"` for larger circular photos. Also increase the card padding slightly.

**Split PricingContactPage:**
- Create `PricingTimelinePage` containing Sections 05 and 06
- Create `ContactPage` containing Section 07 with team, company info, and footer
- Update the main render to use these two new components
- Add `data-pdf-section` attributes to each logical section in all pages

**Add `data-pdf-section` to all logical blocks:**
Every major section (cover, executive summary, problems, platform features, media services, pricing table, timeline, contact/team) gets a `data-pdf-section` wrapper so the PDF generator treats each as an atomic unit that won't be split.
