
# Fix: Stale Module Cache Error on Dashboard

## Problem
After a new deployment, the PWA service worker or browser cache serves old JavaScript chunk filenames (e.g., `DashboardOverview-nvugvt5h.js`) that no longer exist on the server. This causes a `TypeError: error loading dynamically imported module` when navigating to the dashboard.

## Solution
Wrap all `lazy()` imports with a retry mechanism that automatically reloads the page when a chunk fails to load. This is a standard pattern for Vite + PWA apps.

## Changes

### 1. Create a `lazyWithRetry` helper (`src/lib/lazyWithRetry.ts`)
A utility function that wraps `React.lazy()` and catches chunk load errors. On failure, it forces a full page reload (once) to fetch the latest assets from the server.

```text
lazyWithRetry(importFn)
  --> try import()
      --> success: return module
      --> fail (chunk error): 
          --> check sessionStorage flag to prevent infinite reload loop
          --> set flag, window.location.reload()
```

### 2. Update `src/App.tsx`
Replace all `lazy(() => import(...))` calls with `lazyWithRetry(() => import(...))`.

### 3. Update `src/components/ui/error-boundary.tsx`
Add detection for chunk loading errors specifically -- if the error message contains "dynamically imported module" or "Failed to fetch", offer a "Reload Page" button that does a hard refresh instead of just retrying the render.

## Why This Works
- First visit after deployment: old chunk fails to load, page auto-reloads, fresh chunks are fetched
- The `sessionStorage` flag prevents an infinite reload loop if the server itself is down
- The error boundary provides a manual fallback if auto-reload doesn't resolve it
