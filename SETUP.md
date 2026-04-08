# ClaimRail Setup Guide

## Quick Start

### 1. Environment Variables Setup

Your `.env.local` file has been created with the Supabase connection details. You still need to configure:

#### Spotify OAuth (Required)
1. Go to https://developer.spotify.com/dashboard
2. Click "Create App"
3. Fill in:
   - **App name**: ClaimRail (or your preferred name)
   - **App description**: Music publishing royalty management tool
   - **Redirect URI**: `http://localhost:3000/api/auth/callback/spotify`
   - **Website**: (optional)
   - Check the box for "Web API"
4. Save and copy your **Client ID** and **Client Secret**
5. Paste them into `.env.local`:
   ```bash
   SPOTIFY_CLIENT_ID=your_actual_client_id
   SPOTIFY_CLIENT_SECRET=your_actual_client_secret
   ```

#### NextAuth Secret (Required)
Generate a secure random secret:

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Minimum 33 -Maximum 126 }))
```

**macOS/Linux:**
```bash
openssl rand -base64 32
```

Paste the result into `.env.local`:
```bash
NEXTAUTH_SECRET=your_generated_secret_here
```

#### Supabase Keys (Required for Database)
1. Go to https://supabase.com/dashboard
2. Select your project: `nzzaxfxolslrvonyihfx`
3. Go to **Settings** → **API**
4. Copy the keys:
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

Your `.env.local` should now look like:
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000

SPOTIFY_CLIENT_ID=1234567890abcdef
SPOTIFY_CLIENT_SECRET=abcdef1234567890

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_long_random_secret_string_here

NEXT_PUBLIC_SUPABASE_URL=https://nzzaxfxolslrvonyihfx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

DATABASE_URL=postgresql://postgres:Paradisevices420!@db.nzzaxfxolslrvonyihfx.supabase.co:5432/postgres
```

---

### 2. Database Setup

#### Option A: Using Supabase Dashboard (Recommended for beginners)

1. Go to your Supabase project: https://supabase.com/dashboard/project/nzzaxfxolslrvonyihfx
2. Go to **SQL Editor**
3. Click "New Query"
4. Run every SQL file in `supabase/migrations/` in filename order (`001`, `002`, `003`, `004`, and any newer files)
5. Paste each file into the SQL editor and click "Run"
6. Verify the newer automation tables such as `automation_jobs`, `automation_job_events`, and `automation_worker_heartbeats` were created in **Table Editor**

#### Option B: Using Drizzle Kit (Recommended for developers)

```bash
# Generate migration files
npm run db:generate

# Push schema to database (creates tables)
npm run db:push

# Or run migrations
npm run db:migrate
```

#### Option C: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref nzzaxfxolslrvonyihfx

# Push migrations
supabase db push
```

---

### 3. Install Dependencies

```bash
npm install
```

---

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

---

## Database Schema

The following tables are created:

- **users** - User accounts (linked to Spotify)
- **recordings** - Imported tracks from Spotify
- **composition_works** - Publishing entities for each recording
- **writers** - Songwriters and publishers
- **work_splits** - Ownership percentages
- **catalog_issues** - Detected problems in catalog
- **claim_tasks** - Action items for users

All tables have Row Level Security (RLS) policies to ensure users can only access their own data.

---

## Available Commands

```bash
# Development
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:generate  # Generate Drizzle migrations
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio (GUI)

# Code Quality
npm run lint         # Run ESLint
```

---

## Architecture Overview

### Frontend
- **Next.js 16** with App Router
- **React 19**
- **Tailwind CSS v4** for styling
- **Radix UI** for components
- **Framer Motion** for animations

### Authentication
- **NextAuth.js** with Spotify provider
- JWT-based sessions
- Automatic token refresh

### Database
- **Supabase** (PostgreSQL)
- **Drizzle ORM** for type-safe queries
- **Row Level Security** for data isolation

### Server Actions
Located in `src/app/actions/`:
- `recordings.ts` - CRUD operations for recordings, issues, and tasks

---

## Next Steps

### Immediate (Before First Use)
1. ✅ Set up Spotify OAuth credentials
2. ✅ Generate NextAuth secret
3. ✅ Add Supabase keys to `.env.local`
4. ✅ Run database migrations

### Phase 1 (MVP)
- [ ] Migrate data from localStorage to Supabase
- [ ] Update `AppProvider` to use server actions
- [ ] Add database adapter for NextAuth (optional)
- [ ] Test full user flow with real data

### Phase 2 (Post-Launch)
- [ ] Integrate BMI API for direct registration
- [ ] Integrate Songtrust API
- [ ] Add Stripe Connect for 1% fee collection
- [ ] Add email notifications (Resend/SendGrid)
- [ ] Analytics and tracking

---

## Troubleshooting

### Spotify OAuth Not Working
- Ensure redirect URI matches exactly: `http://localhost:3000/api/auth/callback/spotify`
- Check that Client ID and Secret are correct
- Verify scopes include `user-read-email` and `user-read-private`

### Database Connection Errors
- Verify `DATABASE_URL` is correct
- Check that migrations ran successfully
- Ensure Supabase project is active

### NextAuth Session Issues
- Make sure `NEXTAUTH_SECRET` is set (not using dev fallback)
- Verify `NEXTAUTH_URL` matches your domain
- Clear browser cookies and try again

---

## Security Notes

⚠️ **Before Production:**
1. Change `NEXTAUTH_SECRET` to a production value
2. Update `NEXT_PUBLIC_APP_URL` to your production domain
3. Add production domain to Spotify app redirect URIs
4. Review RLS policies in Supabase dashboard
5. Enable 2FA on your Supabase account
6. Never commit `.env.local` to Git

---

## Support

For issues or questions:
- Check the README.md
- Review AGENTS.md for AI assistant guidelines
- Supabase docs: https://supabase.com/docs
- NextAuth docs: https://next-auth.js.org/docs
