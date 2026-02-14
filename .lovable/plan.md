
# Add Background Image Slideshow to Hero Section

## What Changes

Replace the single static background image with a slow crossfade slideshow cycling through 3 images:

1. Current `hero-bg.jpg` (existing local asset)
2. `https://i.ibb.co/d4SNVd8w/peopleattheairport.jpg` (new)
3. `https://i.ibb.co/fVmC1j7k/medinamosque.jpg` (new)

The slideshow will use a slow 8-second crossfade transition with each image visible for ~10 seconds, giving a luxurious, cinematic feel.

## Technical Approach

### File: `src/components/landing/Hero.tsx`

- Add a `useState` for the current slide index and a `useEffect` with `setInterval` to cycle images every 10 seconds
- Define an array of 3 image sources (local import + 2 external URLs)
- Replace the single `motion.div` background with 3 stacked absolutely-positioned divs, each showing one image
- Use Framer Motion's `AnimatePresence` to crossfade between slides with a long `duration: 2` seconds for a slow, smooth transition
- Keep the existing parallax scale animation on the active slide
- The geometric overlay and gradient overlay remain on top, unchanged

```text
Image cycle: 10s per image
Crossfade duration: 2s
Total cycle: ~30s for all 3 images
```

### No other files change
- No new dependencies needed (Framer Motion already installed)
- Overlays, content, search widget all stay exactly the same
