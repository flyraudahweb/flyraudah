

# Proposal Page Updates

## Changes Overview

### 1. Fix PDF/Print Download
The current `window.print()` approach has issues. We'll add a proper PDF download button using `jsPDF` + `html2canvas` (both already installed) that renders the proposal to a high-quality PDF. The print button will remain as a secondary option, and a new "Download PDF" button will be added.

### 2. Change Company from BINAH INNOVATION LTD to FADAK MEDIA HUB
All references to "BINAH INNOVATION LTD" will be replaced with "FADAK MEDIA HUB". The logo initials will change from "BI" to "FMH". The RC number will be removed (Fadak Media Hub details will replace it). Fatima Dauda Kurfi's role will be updated to "Chief Executive Director, Fadak Media Hub".

### 3. Add Media & Branding Package (Basic) Section
A new section will be added after the platform features, presenting the Basic Media & Branding package as an add-on service. This includes:
- Social media management
- Content creation (graphics, reels, videos)
- Promotional video production
- Professional photoshoots
- Campaign strategy development

The price field for media will be left blank (shown as "TBD" or a dash) as requested.

### 4. Update Pricing to Total ₦2,000,000
The pricing table will be restructured into two parts:
- **Part A: Digital Platform** (the main deliverable) -- platform line items adjusted to sum appropriately
- **Part B: Media & Branding (Basic Package)** -- price shown as blank/TBD
- **Grand Total: ₦2,000,000**

The platform remains the priority and main focus of the proposal.

### 5. Update Executive Summary
Reflect that this is now a joint Technology + Media proposal from Fadak Media Hub, with the digital platform as the primary deliverable and media services as a complementary add-on.

---

## Technical Details

### File: `src/pages/Proposal.tsx`

**PDF Download Fix:**
- Add a `useRef` on the proposal content wrapper
- Add a "Download PDF" button that uses `html2canvas` to capture the content and `jsPDF` to generate a multi-page A4 PDF
- Keep the existing "Print" button as secondary

**Company Rebrand:**
- Logo: "BI" to "FMH"
- All "BINAH INNOVATION LTD" text to "FADAK MEDIA HUB"
- Subtitle: "Chief Executive Director, Fadak Media Hub"
- Remove RC Number line, replace with company tagline

**New Section (Section 04: Media & Branding Services):**
- Added as a new page with `page-break` class
- Lists the Basic package services
- Monthly retainer price left as "______" (blank for user to fill)

**Pricing Table Update:**
- Platform items repriced to leave room for media, total = ₦2,000,000
- Media line item added with blank price
- Grand total row shows ₦2,000,000

**Section Renumbering:**
- 01: Executive Summary
- 02: Problems Addressed
- 03: Platform Features & Deliverables
- 04: Media & Branding Services (Basic Package) -- NEW
- 05: Pricing Breakdown (updated)
- 06: Project Timeline
- 07: Contact Information

