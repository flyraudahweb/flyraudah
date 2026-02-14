

# Fix: Demo Admin/Agent Login Redirecting to User Dashboard

## Root Cause

There's a race condition between two competing navigation triggers in `Login.tsx`:

1. **Role-aware redirect** (line 39-44): Waits for `roles` to populate, then routes to `/admin`, `/agent`, or `/dashboard` accordingly.
2. **2-second fallback timeout** (line 56-58): Always navigates to `/dashboard` after 2 seconds, regardless of role.

The fallback timeout wins because `fetchUserData` in `AuthContext.tsx` is wrapped in a `setTimeout(..., 0)` (line 51), adding extra delay. By the time roles arrive, the user is already on `/dashboard`.

## Fix

### File: `src/pages/Login.tsx`

- Remove the 2-second `setTimeout` fallback entirely
- Update the `useEffect` to also handle the case where roles might be empty (regular users without explicit roles)
- Use a smarter approach: after login, wait for `loading` to become `false` (indicating AuthContext finished fetching), then redirect based on whatever roles are available

```text
Before:
  useEffect checks: loginSuccess && roles.length > 0
  setTimeout always goes to /dashboard after 2s

After:
  useEffect checks: loginSuccess && !loading
  No setTimeout fallback needed
  Routes based on roles (which may be empty for regular users -> /dashboard)
```

### File: `src/contexts/AuthContext.tsx`

- Ensure `fetchUserData` completes before `loading` is set to `false` on auth state change
- Remove the unnecessary `setTimeout` wrapper around `fetchUserData`
- Set `loading = false` only AFTER `fetchUserData` resolves

```text
Before:
  onAuthStateChange -> setLoading(false) immediately
  setTimeout(() => fetchUserData(...), 0) runs later

After:
  onAuthStateChange -> await fetchUserData(...)
  Then setLoading(false)
```

This ensures the `loading` flag accurately reflects when user data (including roles) is fully loaded, so the Login page can reliably redirect based on the user's actual role.

