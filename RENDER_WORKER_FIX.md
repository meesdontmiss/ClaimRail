# 🚨 Render Worker Database Error - FIX

## Problem

Your Render worker is failing with SQL errors like:
```
Failed query: select ... from "automation_worker_heartbeats"
Failed query: select ... from "automation_jobs"
```

## Root Cause

The **automation tables don't exist** on your Supabase database yet. The worker is correctly calling the Vercel API, but the API routes are failing because the database tables are missing.

## Solution: Apply Missing Migrations

You need to run the database migrations to create these tables:
- `automation_jobs`
- `automation_job_events`
- `automation_worker_heartbeats`

---

## Step 1: Check Which Tables Exist

Go to your Supabase dashboard:
1. Visit: https://supabase.com/dashboard/project/nzzaxfxolslrvonyihfx/sql
2. Run this query:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('automation_jobs', 'automation_worker_heartbeats', 'automation_job_events')
ORDER BY table_name;
```

**Expected result if tables are missing:**
```
(0 rows)
```

**If you see the tables listed, skip to Step 4.**

---

## Step 2: Check Migration Files

These migration files should exist:

```
supabase/migrations/
├── 001_initial_schema.sql              ✅ Should exist
├── 002_extension_and_auth_hardening.sql ✅ Should exist
├── 003_automation_jobs.sql              ⚠️ MAY NOT EXIST
├── 004_automation_worker_heartbeats.sql ⚠️ MAY NOT EXIST
└── 005_fix_rls_for_nextauth.sql         ⚠️ MAY NOT EXIST
```

**If 003, 004, or 005 don't exist, they need to be created.**

---

## Step 3: Create Missing Migration Files

### If `003_automation_jobs.sql` is missing:

Create it with this content:

```sql
-- Migration 003: Automation Jobs
-- Creates tables for background job queue system

CREATE TYPE automation_job_type AS ENUM ('bmi_registration');
CREATE TYPE automation_job_status AS ENUM ('queued', 'claimed', 'running', 'completed', 'failed', 'needs_human', 'cancelled');
CREATE TYPE automation_event_level AS ENUM ('info', 'warning', 'error');

CREATE TABLE IF NOT EXISTS automation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  recording_id UUID REFERENCES recordings(id) ON DELETE CASCADE NOT NULL,
  composition_work_id UUID REFERENCES composition_works(id) ON DELETE CASCADE,
  type automation_job_type NOT NULL,
  status automation_job_status DEFAULT 'queued' NOT NULL,
  priority INTEGER DEFAULT 100 NOT NULL,
  attempts INTEGER DEFAULT 0 NOT NULL,
  max_attempts INTEGER DEFAULT 3 NOT NULL,
  worker_id TEXT,
  worker_claimed_at TIMESTAMPTZ,
  payload JSONB NOT NULL,
  result JSONB,
  last_error TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS automation_job_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES automation_jobs(id) ON DELETE CASCADE NOT NULL,
  level automation_event_level DEFAULT 'info' NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX automation_jobs_user_id_idx ON automation_jobs(user_id);
CREATE INDEX automation_jobs_recording_id_idx ON automation_jobs(recording_id);
CREATE INDEX automation_jobs_status_priority_idx ON automation_jobs(status, priority, created_at);
CREATE INDEX automation_job_events_job_id_idx ON automation_job_events(job_id, created_at);
```

### If `004_automation_worker_heartbeats.sql` is missing:

Create it with this content:

```sql
-- Migration 004: Automation Worker Heartbeats
-- Tracks worker health and availability

CREATE TABLE IF NOT EXISTS automation_worker_heartbeats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id TEXT NOT NULL,
  metadata JSONB,
  last_seen_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX automation_worker_heartbeats_worker_id_idx ON automation_worker_heartbeats(worker_id);
CREATE INDEX automation_worker_heartbeats_last_seen_at_idx ON automation_worker_heartbeats(last_seen_at);
```

---

## Step 4: Apply Migrations

### Option A: Via Supabase SQL Editor (Recommended)

1. Go to: https://supabase.com/dashboard/project/nzzaxfxolslrvonyihfx/sql
2. Copy/paste each migration SQL **in order** (003, 004, 005)
3. Run them one at a time
4. Check for errors after each

### Option B: Via Drizzle Kit

```bash
# From your project root
npm run db:migrate
```

This will apply all pending migrations automatically.

### Option C: Via Supabase CLI

```bash
supabase link --project-ref nzzaxfxolslrvonyihfx
supabase db push
```

---

## Step 5: Verify Tables Were Created

Run this in Supabase SQL editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name LIKE 'automation%'
ORDER BY table_name;
```

**Expected result:**
```
table_name
---------------------------
automation_jobs
automation_job_events
automation_worker_heartbeats
(3 rows)
```

---

## Step 6: Restart Render Worker

After migrations are applied:

1. Go to Render dashboard: https://dashboard.render.com/
2. Find your worker service
3. Click **"Manual Deploy"** → **"Deploy latest commit"**
4. Wait for deployment to complete
5. Check logs

**Expected logs after fix:**
```
[worker] auth config { secretFingerprint: '9e690705c49d' }
[worker] ping successful
[worker] no jobs available (or job execution logs)
```

---

## Still Failing? Check These:

### 1. DATABASE_URL on Vercel

Make sure your Vercel project has `DATABASE_URL` set:
- Go to: Vercel → Your Project → Settings → Environment Variables
- Check `DATABASE_URL` exists and is correct
- Should be: `postgresql://postgres:...@db.nzzaxfxolslrvonyihfx.supabase.co:5432/postgres`
- **Redeploy after adding/updating**

### 2. API Routes Are Working

Test the API directly:

```bash
curl -X POST https://claim-rail.vercel.app/api/automation/worker/ping \
  -H "Content-Type: application/json" \
  -H "x-claimrail-worker-secret: YOUR_SECRET" \
  -d '{"workerId":"test-worker"}'
```

**Expected response (if tables exist):**
```json
{"success": true}
```

**If you get SQL errors, tables still don't exist.**

### 3. Check Vercel Function Logs

Go to: Vercel → Deployments → Latest → **Logs**

Look for errors when worker calls API. The full error message will show:
- Which query failed
- What table is missing
- Database connection issues

---

## Summary

**Problem:** Automation tables don't exist on Supabase  
**Fix:** Apply migrations 003, 004, 005  
**Verify:** Tables exist in Supabase SQL editor  
**Test:** Restart Render worker, check logs

After this, your worker should connect and start polling for jobs! 🚀
