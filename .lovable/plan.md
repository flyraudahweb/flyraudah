

# Fix PDF Text Clipping and Demo Link Label

## Root Cause

The text clipping (e.g., "yideo" instead of "video", "IIMITED" instead of "LIMITED", "muless" instead of "unless") is caused by `html2canvas` cutting off the top/bottom pixels of text in each captured `data-pdf-section`. When sections have no vertical padding, the bitmap capture clips character ascenders/descenders at section boundaries.

## Changes (File: `src/pages/Proposal.tsx`)

### 1. Add vertical padding to all PDF sections via inline style

Before capturing each section in `handleDownloadPDF`, temporarily add padding to each `data-pdf-section` element to give html2canvas breathing room around text. Then remove it after capture. This prevents letter clipping without affecting the on-screen layout.

```
for (const section of sections) {
  // Temporarily add padding for clean capture
  const prevPadding = section.style.padding;
  section.style.padding = "6px 2px";

  const canvas = await html2canvas(section, { ... });

  // Restore original padding
  section.style.padding = prevPadding;
  ...
}
```

### 2. Increase html2canvas scale from 2 to 3

Higher resolution capture produces sharper text in the final PDF, reducing the blurry/cut appearance when scaled to A4 dimensions.

### 3. Set a fixed width on the container before PDF generation

Before iterating sections, temporarily set the proposal container to a fixed pixel width (e.g., 800px) so html2canvas renders consistently regardless of the user's viewport size. Restore after generation.

### 4. Label the demo link on the Cover Page

Change the bare link on line 135-137 from:
```
<a href="...">raudahtravels.lovable.app</a>
```
to:
```
<p>Demo: <a href="...">raudahtravels.lovable.app</a></p>
```

### 5. Label the footer demo link

Same change for the footer link on line 515-517 -- prefix with "Demo:" for clarity.

## Summary

- Lines 30-61 (`handleDownloadPDF`): Add temp padding to sections before capture, increase scale to 3, set fixed container width
- Lines 132-138 (Cover Page): Add "Demo:" label to link
- Lines 515-517 (Footer): Add "Demo:" label to link

