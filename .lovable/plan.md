
## Replace Text Logo with Image Logo

### What Changes
Replace the "Raudah Travels" text-based logo with the provided image logo (`https://i.ibb.co/C3zkfpVR/Rauda-Logo-2-PNG.png`) in the two places it appears as a visual brand mark:

### Files to Modify

**1. `src/components/landing/Header.tsx` (lines 56-68)**
- Replace the two `<span>` elements ("Raudah" + "Travels") with an `<img>` tag
- The logo image will be sized appropriately for the header (h-10 on mobile, h-12 on desktop)
- Maintain the link wrapping so clicking the logo still navigates home

**2. `src/components/landing/Footer.tsx` (lines 23-27)**
- Replace the "Raudah Travels & Tours" heading text with the logo image
- Center it and size it slightly larger for the footer context (h-14 or h-16)
- Keep the tagline "Your Gateway to the Holy Lands" below

### Technical Details
- Use the external URL directly as the `src` for the `<img>` tag
- Add appropriate `alt="Raudah Travels & Tours"` for accessibility
- Apply `object-contain` to preserve aspect ratio
- In the header, the logo will adapt between scrolled/unscrolled states using brightness or invert filters if needed for contrast against the transparent hero background
