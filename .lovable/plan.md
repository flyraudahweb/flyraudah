
# Fix: Cover Page Text Too Small in PDF

## Root Cause

The PDF engine captures each `data-pdf-section` element independently via `html2canvas` and scales it to fit `contentWidth = 180mm` in the PDF.

The problem is a mismatch in **captured canvas widths**:

- **Other pages** (Executive Summary, Feature pages, etc.) have their `data-pdf-section` div sitting *inside* a `padding: "25mm"` outer container. At 800px container width, 25mm on each side ≈ ~94px × 2 = ~188px of horizontal padding. So the inner section content is captured at roughly **612px** wide.
- **Cover page** has its single `data-pdf-section` as a direct child of `padding: "20mm 25mm"` — same horizontal padding as others (25mm each side), so technically the same ~612px capture width. However, the PDF engine line `section.style.padding = "8px 4px"` temporarily sets padding on the **section element itself**, not the outer page wrapper. Since the cover's `data-pdf-section` is an unstyled inner div (no explicit width), it fills the full inner width of the outer `proposal-page` div.

The actual root cause is simpler and confirmed by the screenshots: the cover page is captured at the **full 800px container width** because the `data-pdf-section` is an inline div with no constraints. The outer `proposal-page` div has `padding: "20mm 25mm"` but that padding applies to the *outer* element, and `html2canvas` captures the *section* element's rendered dimensions. The section div naturally expands to fill the content area of its padded parent — which is correct. But the engine then injects `section.style.padding = "8px 4px"` temporarily during capture, which **overrides the outer page's padding effect** for that capture snapshot.

More precisely: looking at the reference screenshot showing the cover page PDF output — the content is narrow with large left/right margins in the PDF, meaning the captured image is being placed correctly width-wise (180mm) but the text inside appears small because the cover page's `data-pdf-section` content area is being captured much wider than intended.

## The Real Fix

The correct fix is to give the cover page `data-pdf-section` explicit **horizontal padding that mirrors the page padding**, so when `html2canvas` captures it, the content has the same effective margins as all other pages.

Currently the PDF capture loop injects `section.style.padding = "8px 4px"` (8px top/bottom, 4px left/right). For all other pages, their sections are already inside a `25mm`-padded outer div, so the content naturally occupies the inner area. The cover's single section wraps everything inside the outer padded div — meaning the temporary `8px 4px` padding on the section itself doesn't replicate the outer page's 25mm side padding.

**Solution**: Add `data-pdf-margin` attribute to the cover page's section div and modify the PDF engine to detect it, OR — more simply — move the CoverPage's outer padding **onto** the `data-pdf-section` div itself (and remove it from the outer `proposal-page` div), so the captured element includes its own margins, matching what other page sections "see" from their padded parents.

The cleanest approach with **minimal change**: add a CSS class `cover-pdf-section` to the cover's `data-pdf-section` that sets `padding: 0 25mm` (matching other pages' side padding), so when the engine captures that element, the content has the same effective side margins as all other page sections. The top/bottom padding doesn't matter since the engine injects `8px` anyway.

Actually, the simplest and most targeted fix: in `handleDownloadPDF`, detect if the section is the cover section (first section or by a `data-cover-section` attribute) and skip the padding injection for it — OR set a larger padding that matches the 25mm side margins.

**Cleanest fix (two targeted changes):**

1. Add `data-cover` attribute to the cover page's `data-pdf-section` div.
2. In `handleDownloadPDF`, when processing a section with `data-cover`, instead of injecting `8px 4px`, inject padding that replicates `25mm` side margins relative to the 800px capture width. At 800px, 25mm ≈ 94px, so inject `section.style.padding = "8px 94px"` for cover, `"8px 4px"` for all others.

This makes the cover's captured content width match all other pages, and text scales identically when both are placed at 180mm in the PDF.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Proposal.tsx` | 1. Add `data-cover` attribute to cover page's `data-pdf-section` div. 2. In `handleDownloadPDF`, check for `data-cover` and apply `"8px 94px"` padding during capture instead of `"8px 4px"`. |

## What Does NOT Change
- Visual layout on screen — identical
- All other pages and their PDF capture logic — unchanged
- MOU toggle, team toggle, templates — unchanged
- Cover page structure and content — unchanged, just one attribute added
