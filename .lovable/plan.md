

# Fix PDF Text Clipping Issues

## Problem

Despite previous splits, several texts are still being cut off in the downloaded PDF:
- Cover page demo link ("raudahtravels.lovable.app") partially hidden
- "Primary Deliverable" subtitle, "Payment receipts & transaction history", "Target audience analysis & engagement planning"
- Confidentiality clause text

The root cause is twofold: (1) the PDF generator's bottom margin buffer is too tight, causing sections near page boundaries to clip, and (2) the MOUPage contains too many `data-pdf-section` blocks in a single tall wrapper, causing later sections to overflow.

## Technical Changes (File: `src/pages/Proposal.tsx`)

### 1. Increase PDF bottom margin buffer

Change the page-fit check from `pdfHeight - marginTop` (282mm) to `pdfHeight - marginTop - 5` (277mm), giving a safer 20mm bottom margin to prevent clipping at page edges.

### 2. Force new page after cover page sections

Add a sentinel/spacer approach: after the cover page's last `data-pdf-section`, the generator should start a new page for the next content. Achieve this by reducing the cover page top padding from `40mm` to `30mm` so sections don't start so deep into the page.

### 3. Split MOUPage into two separate page wrappers

The current MOUPage is one div containing 7+ `data-pdf-section` blocks (MOU header, clauses 1-4, confidentiality, signatures, team, contact info, footer). This is too much content for reliable pagination. Split into:

- **MOUPage**: Contains sections 07 (MOU title, clauses, confidentiality, signatures)
- **ContactTeamPage**: A new separate page wrapper containing section 08 (Contact & Team, contact info card, footer)

This ensures the team/contact content starts on a fresh PDF page and doesn't get squeezed into whatever space remains after the MOU.

### 4. Ensure each FeatureBlock page uses separate section captures

The PlatformFeaturesPage and MediaBrandingPage already have individual `data-pdf-section` per feature block -- these are fine. The fix is primarily the bottom margin buffer (#1) which prevents their last items from clipping.

## Summary of edits

- Lines 24-25: Add `marginBottom = 20` and use `pdfHeight - marginBottom` for the page-fit check
- Line 108: Reduce cover page padding from `40mm 25mm` to `30mm 25mm`
- Lines 468-515: Extract team, contact info, and footer into a new `ContactTeamPage` component with its own page wrapper
- Line 100: Add `<ContactTeamPage />` after `<MOUPage />`

