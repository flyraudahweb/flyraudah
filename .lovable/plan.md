

# Add MOU Section to the Proposal

## What's Being Added

A new **Memorandum of Understanding (MOU)** section (Section 08) will be added between the Contact page and the footer. It will be a separate page containing:

- **Parties**: FADAK MEDIA HUB NIGERIA LIMITED and Rauda Travel and Agency
- **Scope of Work**: Summary of deliverables (Digital Platform + Media & Branding)
- **Payment Terms**: Total amount (N2,000,000), payment schedule/milestones
- **Timeline**: 7-day delivery commitment
- **Ownership & IP**: Platform ownership transfers to Rauda upon full payment
- **Confidentiality**: Both parties agree to keep project details confidential
- **Signature Lines**: Spaces for both parties to sign with name, title, date, and signature fields

This gives the proposal a formal, binding feel and makes it ready for sign-off.

---

## Technical Details

### File: `src/pages/Proposal.tsx`

1. **Create `MOUPage` component** -- A new page component styled consistently with the rest of the proposal (`proposal-page`, `page-break`, `25mm` padding). Contains multiple `data-pdf-section` blocks for proper PDF rendering:
   - Section header (08 - Memorandum of Understanding)
   - Parties clause
   - Scope, payment terms, timeline, ownership, and confidentiality clauses (numbered 1-5)
   - Signature block with two columns (FADAK MEDIA HUB and Rauda Travel and Agency)

2. **Update main render** (line 88) -- Add `<MOUPage />` between `<ContactPage />` and the closing `</div>`.

3. **Renumber footer** -- The footer stays in `ContactPage`; the MOU is inserted as a new page before the footer or after contact. Since contact already has the footer, MOU will be placed between `PricingTimelinePage` and `ContactPage`, making Contact + Footer the final page. Alternatively, MOU goes after Contact as the very last page.

   The MOU will be added **after ContactPage** as the final page of the proposal, since it's the document that gets signed last.

4. **Section numbering** -- MOU becomes Section **08**.
