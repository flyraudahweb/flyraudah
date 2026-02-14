
## Landing Page Design Refinements

### Requested Changes Summary
1. **Hero Title Spacing**: Push "Begin Your Spiritually Uplifting Journey" down from the top
2. **Remove Scroll Indicator**: Hide the "Scroll" text and animated chevron at the bottom of the hero
3. **Package Display Strategy**: Show only 3 packages on the landing page with a "View All Packages" button to navigate to a dedicated packages page
4. **Section Padding**: Increase horizontal padding on three key sections:
   - "2026 Hajj & Umrah Packages"
   - "Why Choose Raudah"
   - "What Our Pilgrims Say" (Testimonials)

### Technical Implementation Plan

#### 1. Hero Section (`src/components/landing/Hero.tsx`)
- **Increase top padding**: Change `pt-24` to `pt-32` or `pt-40` on the main content container (line 30) to push the title down
- **Remove scroll indicator**: Delete or hide the scroll indicator div (lines 119-128) by either:
  - Removing the entire motion.div containing the scroll indicator
  - OR adding `hidden` className to conditionally hide it
- This will create more breathing room and remove the visual clutter at the bottom

#### 2. Packages Section Overhaul (`src/components/landing/PackagesSection.tsx`)
- **Display only 3 packages**: Modify the filter logic (line 234-238) to:
  - `filter((p) => p.status === "active").slice(0, 3)` to show only the first 3 active packages
- **Add "View All Packages" button**: After the packages grid, add a centered button with gold styling that:
  - Links to a new `/packages` route (future dedicated packages page)
  - Uses consistent styling: `gold-gradient` background, large size
  - Positioned with `mt-12` and `mx-auto`
- **Increase section padding**: Change the container `px-4` to `px-8` or `px-12` (line 220) for increased horizontal padding

#### 3. Why Choose Section (`src/components/landing/WhyChoose.tsx`)
- **Increase section padding**: Change the container `px-4` to `px-8` or `px-12` (line 17) for increased horizontal padding
- No other changes needed to this component

#### 4. Testimonials Section (`src/components/landing/Testimonials.tsx`)
- **Increase section padding**: Change the container `px-4` to `px-8` or `px-12` (line 34) for increased horizontal padding
- No other changes needed to this component

#### 5. Routing Consideration (Future Phase 2)
- The "View All Packages" button will link to `/packages`
- A new route and page component (`/pages/Packages.tsx` or similar) will be needed to display all packages
- This can be added in a future update, but the button structure should be prepared now

### Visual Results
- Hero section has more prominent spacing with the title sitting lower on the screen
- Scroll indicator removed for a cleaner hero bottom edge
- Packages section is not cluttered with all 6 packages; users see top 3 and click to see more
- All three main sections (Packages, Why Choose, Testimonials) have increased horizontal breathing room for a more luxurious, spacious feel
- Button to view all packages encourages exploration without overwhelming the initial view

### No Breaking Changes
- All changes are additive or cosmetic (styling/layout)
- No data structure changes needed
- Existing components remain functional
- The future `/packages` route can be added independently
