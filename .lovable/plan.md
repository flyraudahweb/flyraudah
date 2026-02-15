

# Fix Hidden PDF Content and Reorganize Contact/Team into MOU Page

## Issues to Fix

1. **Cover page demo link hidden in PDF** -- The entire cover page is one large `data-pdf-section` block. When rendered to canvas, the bottom portion (including the demo link) gets cut off if it exceeds the PDF page height.
2. **Other hidden texts** -- "Primary Deliverable", "Payment receipts & transaction history", "Target audience analysis & engagement planning", and the confidentiality clause are similarly being cut because their parent sections are too tall for a single PDF page.
3. **Move team, contact info, and footer into the MOU page** -- Consolidate so the final page contains both the MOU and the team/contact/footer details.

---

## Technical Details

### File: `src/pages/Proposal.tsx`

**1. Split Cover Page into multiple `data-pdf-section` blocks**

Currently lines 98-126 are a single `data-pdf-section`. Split into 3 separate sections:
- Logo + company name
- Proposal title + prepared for
- Date, confidential label, and demo link

This ensures smaller canvas captures and nothing gets clipped.

**2. Split large feature sections that overflow**

The `PlatformFeaturesPage` (line 173) has its subtitle "Primary Deliverable -- Comprehensive Digital Platform" inside the same `data-pdf-section` as the section title. The "Payment Gateway" feature block (lines 216-224) with "Payment receipts & transaction history" is its own section already, so the issue is likely the overall page height causing canvas overflow. Fix by ensuring each `data-pdf-section` is compact.

Similarly for `MediaBrandingPage`, the "Campaign Strategy" block (lines 273-278) containing "Target audience analysis" and the MOU confidentiality clause (line 462) -- verify these are in their own `data-pdf-section` blocks (they already appear to be, so the fix is ensuring proper page-break handling in the PDF generator).

**3. Improve PDF generator page-break logic**

Update the PDF generation loop (lines 30-50) to handle sections that are taller than a full page, and to always add a new page when a section won't fit, even if it's the first section on a page. Currently line 40 skips page-break check for the first section.

**4. Move Team + Contact + Footer from `ContactPage` into `MOUPage`**

- Move the team members array, contact details (email, website, address), and footer block from `ContactPage` into `MOUPage`, placing them after the signature block.
- Delete the `ContactPage` component entirely.
- Remove `<ContactPage />` from the main render (line 89).
- Each moved block keeps its own `data-pdf-section` attribute.

**5. Renumber sections**

Since `ContactPage` (Section 07) is removed and its content merges into `MOUPage` (Section 08), the MOU section stays as **08** and the team/contact content no longer needs a section number (it becomes part of the MOU page's supplementary info). Alternatively, keep Section 07 as "Contact & Team" header within the MOU page layout.

