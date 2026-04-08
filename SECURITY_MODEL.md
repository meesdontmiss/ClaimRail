# Security Model & Authorization

## Overview

ClaimRail uses **application-level authorization** instead of database-level Row Level Security (RLS).

## Why Not RLS?

RLS policies in Supabase use `auth.uid()` which only works with **Supabase Auth**. This application uses **NextAuth** with Spotify OAuth, which means:
- `auth.uid()` always returns `NULL`
- RLS policies would never match any rows
- All legitimate queries would be blocked

## Current Security Architecture

### Layer 1: Authentication (NextAuth)
- Spotify OAuth flow
- JWT sessions with automatic token refresh
- Server-side session validation via `requireUser()`

### Layer 2: Authorization (Application Code)
All database queries are scoped to the authenticated user:

```typescript
// ✅ CORRECT - User-scoped query
const recordings = await db.query.recordings.findMany({
  where: eq(recordings.userId, userId),
})

// ❌ WRONG - No user scoping (would leak data)
const recordings = await db.query.recordings.findMany()
```

### Layer 3: API Route Protection
- Protected routes check NextAuth session
- Worker routes validate `AUTOMATION_WORKER_SECRET`
- Stripe webhooks validate signature

## Service Role Key Usage

The app uses `SUPABASE_SERVICE_ROLE_KEY` which:
- ✅ Bypasses RLS (necessary since RLS is incompatible with NextAuth)
- ✅ Has full database access
- ✅ **Only used server-side** (never exposed to client)
- ✅ Protected by application-level authorization

## Security Checklist

### Developer Guidelines

When adding new database operations, ALWAYS:

1. **Get the user ID:**
   ```typescript
   const user = await requireUser()
   const userId = user.id
   ```

2. **Scope all queries to userId:**
   ```typescript
   where: eq(recordings.userId, userId)
   ```

3. **Validate ownership before updates/deletes:**
   ```typescript
   const recording = await db.query.recordings.findFirst({
     where: and(
       eq(recordings.id, recordingId),
       eq(recordings.userId, userId)
     ),
   })
   
   if (!recording) {
     return { error: 'Not found' } // Don't reveal if it exists for another user
   }
   ```

### Code Review Checks

- [ ] All database queries include userId filtering
- [ ] API routes validate session
- [ ] Error messages don't leak existence of other users' data
- [ ] No client-side access to service_role key

## Future: Enabling RLS

If you want database-level security in the future:

### Option A: Migrate to Supabase Auth
1. Replace NextAuth with `@supabase/auth`
2. Use Spotify as external provider in Supabase
3. Enable RLS policies with `auth.uid()`
4. Remove service_role key usage

### Option B: Custom RLS with NextAuth
1. Store NextAuth session token in a header
2. Create Postgres function to validate token
3. Use that function in RLS policies instead of `auth.uid()`

### Option C: Hybrid Approach
1. Keep NextAuth for OAuth
2. Sync users to Supabase Auth on first login
3. Enable RLS with `auth.uid()`
4. Use service_role only for background workers

## Migration 005

The `005_fix_rls_for_nextauth.sql` migration:
- Disables RLS on all tables (since it doesn't work anyway)
- Drops all broken policies that reference `auth.uid()`
- Documents the security model for future reference

**This does NOT reduce security** - it just acknowledges the reality that RLS was already non-functional.

## Testing Authorization

Run the test suite to verify authorization works correctly:

```bash
npm run test
```

Tests verify:
- Worker authentication with secret validation
- Crypto encryption/decryption
- Stripe customer synchronization
- Database schema completeness
