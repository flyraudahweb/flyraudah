
## Fix Inconsistent Section Padding

### Problem
The WhyChoose and Testimonials sections use `px-4 sm:px-8 lg:px-12` on their container divs, while the header and packages section use `container mx-auto px-4`. This causes misaligned left/right padding across the page.

### Solution
Update the container padding in two files to match the `px-4` pattern used by the header and packages section.

### Files to Modify

1. **`src/components/landing/WhyChoose.tsx`** (line 17)
   - Change `px-4 sm:px-8 lg:px-12` to `px-4`

2. **`src/components/landing/Testimonials.tsx`** (line 34)
   - Change `px-4 sm:px-8 lg:px-12` to `px-4`

Both already use `container mx-auto`, so just removing the extra responsive padding will align them with the header and other sections.
