-- Migration: Fix RLS Policies for NextAuth Compatibility
-- Created: April 8, 2026
-- Purpose: Replace auth.uid() dependencies with application-level security

-- IMPORTANT NOTE:
-- This app uses NextAuth (not Supabase Auth), so auth.uid() will always return NULL.
-- Since we're using the service_role key (which bypasses RLS), these policies are 
-- documented for future reference if you migrate to Supabase Auth.
-- 
-- CURRENT SECURITY MODEL:
-- ✅ All database access goes through server-side Drizzle ORM queries
-- ✅ Service role key bypasses RLS (by design)
-- ✅ Application code enforces user-scoped data access via userId filtering
-- ✅ Server actions use requireUser() auth guard
-- 
-- IF YOU WANT TO ENABLE RLS IN THE FUTURE:
-- Option A: Migrate to Supabase Auth for unified auth + RLS
-- Option B: Create custom RLS functions that work with NextAuth session tokens
-- Option C: Keep current model (service role + app-level authorization)

-- For now, we'll DROP the RLS policies that use auth.uid() and document the security model

-- Disable RLS on all tables (since service_role bypasses it anyway)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE recordings DISABLE ROW LEVEL SECURITY;
ALTER TABLE composition_works DISABLE ROW LEVEL SECURITY;
ALTER TABLE writers DISABLE ROW LEVEL SECURITY;
ALTER TABLE work_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_issues DISABLE ROW LEVEL SECURITY;
ALTER TABLE claim_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE bmi_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE automation_jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE automation_job_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE automation_worker_heartbeats DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth_debug_events DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies that use auth.uid()
DROP POLICY IF EXISTS "Users can view their own user record" ON users;
DROP POLICY IF EXISTS "Users can update their own user record" ON users;
DROP POLICY IF EXISTS "Users can view their own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can insert their own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can update their own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can delete their own recordings" ON recordings;
DROP POLICY IF EXISTS "Users can view composition works through recordings" ON composition_works;
DROP POLICY IF EXISTS "Users can insert composition works through recordings" ON composition_works;
DROP POLICY IF EXISTS "Users can update composition works through recordings" ON composition_works;
DROP POLICY IF EXISTS "Users can delete composition works through recordings" ON composition_works;
DROP POLICY IF EXISTS "Users can view writers through composition works" ON writers;
DROP POLICY IF EXISTS "Users can insert writers through composition works" ON writers;
DROP POLICY IF EXISTS "Users can update writers through composition works" ON writers;
DROP POLICY IF EXISTS "Users can delete writers through composition works" ON writers;
DROP POLICY IF EXISTS "Users can view work splits through writers" ON work_splits;
DROP POLICY IF EXISTS "Users can insert work splits through writers" ON work_splits;
DROP POLICY IF EXISTS "Users can update work splits through writers" ON work_splits;
DROP POLICY IF EXISTS "Users can delete work splits through writers" ON work_splits;
DROP POLICY IF EXISTS "Users can view catalog issues through recordings" ON catalog_issues;
DROP POLICY IF EXISTS "Users can insert catalog issues through recordings" ON catalog_issues;
DROP POLICY IF EXISTS "Users can update catalog issues through recordings" ON catalog_issues;
DROP POLICY IF EXISTS "Users can delete catalog issues through recordings" ON catalog_issues;
DROP POLICY IF EXISTS "Users can view claim tasks through recordings" ON claim_tasks;
DROP POLICY IF EXISTS "Users can insert claim tasks through recordings" ON claim_tasks;
DROP POLICY IF EXISTS "Users can update claim tasks through recordings" ON claim_tasks;
DROP POLICY IF EXISTS "Users can delete claim tasks through recordings" ON claim_tasks;

-- SECURITY DOCUMENTATION
-- 
-- Current Authorization Flow:
-- 1. User authenticates via Spotify OAuth (NextAuth)
-- 2. NextAuth creates JWT session with spotifyId
-- 3. Server components/actions call requireUser() to get userId
-- 4. All database queries filter by userId:
--    - db.query.recordings.findMany({ where: eq(recordings.userId, userId) })
--    - This ensures users can ONLY access their own data
-- 
-- 5. API routes validate session via NextAuth getSession()
-- 6. Worker routes validate via AUTOMATION_WORKER_SECRET header
-- 
-- This provides the same security as RLS, but at the application layer.
-- The trade-off: if a developer forgets to add userId filter, data leaks.
-- RLS would prevent this, but requires Supabase Auth integration.
--
-- RECOMMENDED: Add automated tests to ensure all queries are user-scoped.
