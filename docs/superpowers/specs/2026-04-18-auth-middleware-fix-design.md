# Auth Middleware Fix — Design Spec

**Date:** 2026-04-18  
**Problem:** Desktop users get redirected to `/login` when clicking a mage card from `/dashboard`. Mobile works fine. Happens even in incognito and after clearing cookies.

## Root Cause

Two issues in combination:

1. **`auth.ts` uses `getSession()`** — reads cookies without server validation. Supabase explicitly says never use `getSession()` in server-side code. In edge cases (token rotation), it returns `null` even when the user is authenticated.

2. **`middleware.ts` wraps `updateSession`** — the wrapper loses cookie `options` (maxAge, secure, sameSite) when copying cookies into redirect responses. This causes cookies to be stored incorrectly after any redirect, breaking the session for subsequent protected routes like `/chat/[agent]`.

## Changes

### 1. `apps/web/src/lib/auth.ts`

Replace `supabase.auth.getSession()` with `supabase.auth.getUser()`:

```typescript
const { data: { user } } = await supabase.auth.getUser()
```

### 2. `apps/web/src/middleware.ts`

Rewrite using the official Supabase SSR pattern — inline, without `updateSession`. Key principle: `supabaseResponse` must be returned in ALL branches (including redirects) to carry updated cookies.

```typescript
// Pattern: supabaseResponse is created, Supabase client writes into it,
// and we ALWAYS return supabaseResponse (or redirect with its headers).
```

For redirects: copy `supabaseResponse` cookie headers into the redirect response to preserve the token refresh that may have occurred during `getUser()`.

### 3. `apps/web/src/lib/supabase/middleware.ts`

Delete — `updateSession` is only used in `middleware.ts` and is replaced by inline logic.

## Success Criteria

- Desktop: clicking mage card navigates to `/chat/[agent]` without redirect
- Mobile: existing behaviour unchanged
- Login → dashboard → any chat route works on desktop Chrome, incognito
