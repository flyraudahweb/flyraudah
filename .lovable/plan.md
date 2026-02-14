

## Align All Sections to Wider Padding

### Problem
The WhyChoose and Testimonials sections previously had nicer, wider padding (`px-4 sm:px-8 lg:px-12`) but were changed to `px-4` to match the nav. Instead, we should do the opposite: bring back the wider padding on those sections and update the nav and all other sections to match.

### Solution
Update every section's container to use `px-4 sm:px-8 lg:px-12` for consistent, wider horizontal padding across the entire page.

### Files to Modify

1. **`src/components/landing/Header.tsx`** (line 55)
   - Change `container mx-auto px-4` to `container mx-auto px-4 sm:px-8 lg:px-12`

2. **`src/components/landing/Hero.tsx`** (line 30)
   - Change `container mx-auto px-4` to `container mx-auto px-4 sm:px-8 lg:px-12`

3. **`src/components/landing/PackagesSection.tsx`** (line 12)
   - Change `container mx-auto px-4` to `container mx-auto px-4 sm:px-8 lg:px-12`

4. **`src/components/landing/WhyChoose.tsx`** (line 17)
   - Change `container mx-auto px-4` back to `container mx-auto px-4 sm:px-8 lg:px-12`

5. **`src/components/landing/Testimonials.tsx`** (line 34)
   - Change `container mx-auto px-4` back to `container mx-auto px-4 sm:px-8 lg:px-12`

6. **`src/components/landing/CTABanner.tsx`** (line 18)
   - Change `container mx-auto px-4` to `container mx-auto px-4 sm:px-8 lg:px-12`

7. **`src/components/landing/Footer.tsx`** (line 21)
   - Change `container mx-auto px-4` to `container mx-auto px-4 sm:px-8 lg:px-12`

This ensures every section has identical responsive horizontal padding throughout the page.
