
# Fix: Blank White Space on Cover Page PDF

## Root Cause

The `CoverPage` component currently has **4 separate `data-pdf-section` attributes** on individual inner divs:

1. Letterhead (logo + company name) — small element
2. Cover letter block (address, attention, body) — conditional
3. Proposal title block (title, client name, location) — medium element
4. Date/Confidential block — small element

The PDF engine (`handleDownloadPDF`) queries ALL `[data-pdf-section]` elements across the whole document and captures each one as a standalone image via `html2canvas`. It then stacks them in the PDF with only a 3mm gap between each image.

This means:
- The `mt-8` (32px) spacing between sections is **lost** — the engine doesn't see whitespace, only element content
- The `py-8` padding inside the title block box is captured, but the margin above it is not
- Each captured section is tiny, and when stacked, they leave a **large blank remainder** on the first PDF page because the sum of the tiny captured heights is far less than one full A4 page height

## The Fix — One Change Only

**Merge all 4 `data-pdf-section` attributes into ONE wrapper** around all the cover page content. When the entire cover is one captured image, `html2canvas` captures the full layout including all margins, paddings, and spacing — exactly as it looks on screen.

The outer `div.proposal-page` (which controls `max-width`, `shadow`, and padding) stays as-is. A new inner `div data-pdf-section` wraps everything inside it.

### Before (4 separate sections):
```
div.proposal-page
  ├── div[data-pdf-section]   ← letterhead only
  ├── div[data-pdf-section]   ← cover letter block (conditional)
  ├── div[data-pdf-section]   ← title block
  └── div[data-pdf-section]   ← date block
```

### After (1 unified section):
```
div.proposal-page
  └── div[data-pdf-section]   ← wraps everything
        ├── div               ← letterhead
        ├── div               ← cover letter block (conditional)
        ├── div               ← title block
        └── div               ← date block
```

## File to Modify

| File | Change |
|------|--------|
| `src/pages/Proposal.tsx` | In `CoverPage`: remove `data-pdf-section` from the 4 inner divs; add one `data-pdf-section` wrapper div around all content inside `div.proposal-page` |

## What Does NOT Change
- The visual layout on screen — identical
- All spacing, margins, and padding — preserved
- The letter address block rendering — unchanged
- PDF engine logic (`handleDownloadPDF`) — untouched
- All other pages and their `data-pdf-section` attributes — untouched
- MOU toggle, team toggle, templates — all untouched
