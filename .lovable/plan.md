

# Fix Post-Login Redirect Not Going to Admin/Agent Dashboard

## Problem

After the auth deadlock fix, login always redirects to `/dashboard` regardless of the user's role (admin/agent). This happens because:

1. `signIn()` completes and sets `loginSuccess = true`
2. The `useEffect` checks `loginSuccess && !loading` -- but `loading` is already `false` (it was set during initial page load)
3. The redirect fires **immediately**, before `fetchUserData` (dispatched via `setTimeout`) has loaded the user's roles
4. Since `roles` is still an empty array, `hasRole("admin")` returns `false`, so every user lands on `/dashboard`

## Solution

Two changes are needed:

### File: `src/contexts/AuthContext.tsx`

Add a mechanism to let the Login page know when roles have been freshly loaded after a sign-in. The simplest approach: make `signIn` return a promise that also waits for roles to load.

- Modify `signIn` to call `fetchUserData` directly after successful authentication (not relying on the `onAuthStateChange` setTimeout)
- Return the fetched roles alongside the error so the caller has them immediately
- Keep the `onAuthStateChange` setTimeout for other auth events (token refresh, etc.)

```
signIn flow (fixed):
  1. signInWithPassword() -> success
  2. await fetchUserData() -> roles loaded
  3. return { error: null } -> Login page redirects with correct roles
```

### File: `src/pages/Login.tsx`

Update the redirect logic:

- Instead of using `loginSuccess` state + useEffect that races with role loading, perform the redirect directly in `onSubmit` after `signIn` completes (since `signIn` now awaits role fetching)
- Remove the `loginSuccess` state and its `useEffect` entirely
- Read `hasRole` after signIn resolves to get the correct destination

```
onSubmit (fixed):
  1. await signIn(email, password)
  2. if no error -> roles are now loaded
  3. navigate(hasRole("admin") ? "/admin" : hasRole("agent") ? "/agent" : "/dashboard")
```

## Why This Works

By awaiting `fetchUserData` inside `signIn` before returning, the Login page's redirect logic executes only after roles are available. No race condition, no timing issues.

## Files Changed

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | `signIn` calls `await fetchUserData()` after successful auth before returning |
| `src/pages/Login.tsx` | Remove `loginSuccess` state/effect, redirect directly in `onSubmit` after `signIn` resolves |

