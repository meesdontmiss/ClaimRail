# Database Migration Guide

## Overview

ClaimRail uses Drizzle ORM for database management with Supabase PostgreSQL.

## Current State

- **Schema file:** `src/lib/db/schema.ts`
- **Migrations directory:** `supabase/migrations/`
- **Drizzle output:** `drizzle/` (generated, don't commit)

## Migration Files

| File | Purpose | Status |
|------|---------|--------|
| `001_initial_schema.sql` | Core tables + RLS | ✅ Applied |
| `002_extension_and_auth_hardening.sql` | Extension features | ✅ Applied |
| `003_automation_jobs.sql` | Automation job queue | ✅ Applied |
| `004_automation_worker_heartbeats.sql` | Worker health monitoring | ✅ Applied |
| `005_fix_rls_for_nextauth.sql` | Fix RLS for NextAuth | ⚠️ **NEEDS TO BE APPLIED** |

## How to Apply Migrations

### Option 1: Using Drizzle Kit (Recommended)

```bash
# Generate new migrations from schema changes
npm run db:generate

# Apply all pending migrations
npm run db:migrate

# Push schema directly (development only, skips migrations)
npm run db:push
```

### Option 2: Manual SQL Execution

```bash
# Connect to Supabase database
# Go to: https://supabase.com/dashboard/project/nzzaxfxolslrvonyihfx/sql

# Copy/paste SQL from migration files
# Run each migration in order (001, 002, 003, 004, 005)
```

### Option 3: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link project
supabase link --project-ref nzzaxfxolslrvonyihfx

# Push migrations
supabase db push
```

## Verifying Database State

### Check Tables Exist

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables (13 total):
- `users`
- `recordings`
- `composition_works`
- `writers`
- `work_splits`
- `catalog_issues`
- `claim_tasks`
- `bmi_registrations`
- `automation_jobs`
- `automation_job_events`
- `automation_worker_heartbeats`
- `auth_debug_events`

### Check Enums

```sql
SELECT enum_type, string_agg(enum_label, ', ' ORDER BY enumsortorder)
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
GROUP BY enum_type;
```

### Check Indexes

```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

## Migration 005: Fix RLS for NextAuth

**IMPORTANT:** This migration disables RLS policies that use `auth.uid()` since this app uses NextAuth (not Supabase Auth).

**What it does:**
- Disables RLS on all tables
- Drops broken policies that reference `auth.uid()`
- Documents the application-level security model

**Security impact:** NONE
- RLS was already non-functional with NextAuth
- Application code enforces user-scoped data access
- Service role key is only used server-side

**To apply:**
```bash
# Via Supabase Dashboard SQL Editor
# Copy contents of supabase/migrations/005_fix_rls_for_nextauth.sql
# Paste and execute

# Or via CLI
npm run db:migrate
```

## Common Issues

### Schema Drift

If your database schema doesn't match `schema.ts`:

```bash
# Check what's different
npm run db:studio

# This opens Drizzle Studio at http://localhost:3000
# You can visually compare your schema vs. database
```

### Missing Columns

If you get errors like `column does not exist`:

```bash
# Generate migration for new columns
npm run db:generate

# Apply it
npm run db:migrate
```

### Migration Already Applied

If you see `migration already applied` errors:

```bash
# Check migration status
npm run db:studio

# Skip already applied, only apply new ones
npm run db:migrate
```

## Best Practices

1. **Always backup before migrations**
   - Supabase auto-backups daily
   - Manual backup: Supabase Dashboard → Database → Backups

2. **Test migrations locally first**
   - Use `npm run db:push` in development
   - Verify schema matches expected state

3. **Never skip migration order**
   - Migrations must be applied sequentially (001, 002, 003...)
   - Skipping causes schema inconsistencies

4. **Document schema changes**
   - Update `schema.ts` first
   - Generate migration automatically
   - Review generated SQL before applying

## Next Steps

After applying migration 005:

```bash
npm run db:migrate
```

Verify RLS is disabled:

```sql
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
AND relkind = 'r';
```

All tables should show `relrowsecurity = false` after migration 005.
