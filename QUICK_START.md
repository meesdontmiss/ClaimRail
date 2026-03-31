# 🚀 ClaimRail - Quick Start Checklist

## ⚡ 3 Critical Steps (Do These First!)

### 1️⃣ Configure Spotify OAuth (5 minutes)

1. Go to https://developer.spotify.com/dashboard
2. Log in with your Spotify account
3. Click **"Create app"**
4. Fill in:
   - **App name:** ClaimRail
   - **App description:** Music publishing royalty management
   - **Redirect URI:** `http://localhost:3000/api/auth/callback/spotify`
   - **Website:** (optional)
   - ✅ Check "Web API"
5. Click **Save**
6. Click **"Get client ID and secret"**
7. Copy both values to `.env.local`:

```bash
# Edit this file: c:\Users\16303\Desktop\CURSOR\WEB 2\autopublish\claimrail\.env.local
SPOTIFY_CLIENT_ID=paste_your_client_id_here
SPOTIFY_CLIENT_SECRET=paste_your_client_secret_here
```

---

### 2️⃣ Generate NextAuth Secret (1 minute)

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Minimum 33 -Maximum 126 }))
```

Copy the output and add to `.env.local`:
```bash
NEXTAUTH_SECRET=paste_the_generated_secret_here
```

---

### 3️⃣ Add Supabase API Keys (2 minutes)

1. Go to https://supabase.com/dashboard/project/nzzaxfxolslrvonyihfx/settings/api
2. Copy the **`anon` `public`** key → paste into `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_ANON_KEY=paste_anon_key_here
   ```
3. Copy the **`service_role`** key → paste into `.env.local`:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=paste_service_role_key_here
   ```

---

## ✅ Verify Setup

### Step 1: Check `.env.local`

Your file should now have ALL values filled in:
```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Spotify OAuth ✅
SPOTIFY_CLIENT_ID=1234567890abcdef...
SPOTIFY_CLIENT_SECRET=abcdef1234567890...

# NextAuth ✅
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=long_random_secret_string...

# Supabase ✅
NEXT_PUBLIC_SUPABASE_URL=https://nzzaxfxolslrvonyihfx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Direct Postgres Connection ✅
DATABASE_URL=postgresql://postgres:Paradisevices420!@db.nzzaxfxolslrvonyihfx.supabase.co:5432/postgres
```

### Step 2: Start Development Server

```bash
npm run dev
```

### Step 3: Test Authentication

1. Open http://localhost:3000
2. Click **"Connect with Spotify"** or **"Launch App"**
3. Authorize the app when prompted by Spotify
4. You should be redirected to the dashboard

### Step 4: Verify Database

1. Go to https://supabase.com/dashboard/project/nzzaxfxolslrvonyihfx
2. Click **"Table Editor"**
3. You should see all 7 tables:
   - users
   - recordings
   - composition_works
   - writers
   - work_splits
   - catalog_issues
   - claim_tasks

4. After logging in, check the `users` table - you should see your user record!

---

## 🎯 You're Ready!

Once all checkboxes are ✅, you can:

- ✅ Import tracks from Spotify
- ✅ View catalog audit results
- ✅ Fix metadata issues
- ✅ Generate registration data
- ✅ Export CSV claim packets

All data will now persist in Supabase instead of localStorage!

---

## 🆘 Troubleshooting

### "Invalid redirect URI" from Spotify
- Make sure the redirect URI in Spotify Dashboard matches EXACTLY:
  `http://localhost:3000/api/auth/callback/spotify`
- No trailing slashes, correct protocol (http not https for local)

### "NextAuth error" or "Missing secret"
- Ensure `NEXTAUTH_SECRET` is set in `.env.local`
- Restart the dev server after changing env variables

### "Database connection error"
- Verify `DATABASE_URL` is correct in `.env.local`
- Check that your Supabase project is active
- Try running `npm run db:push` again

### "No user record created"
- Check browser console for errors
- Verify Spotify OAuth is working (check if you're redirected back)
- Check Supabase logs in the dashboard

### "RLS policy error" / "No data showing"
- Verify RLS policies were created (check Supabase SQL Editor)
- Run the migration file again if needed
- Check that your user has the correct Spotify ID

---

## 📚 Next Steps

After verifying everything works:

1. **Read SETUP.md** for detailed documentation
2. **Read AUDIT_SUMMARY.md** for full architecture overview
3. **Check src/app/actions/recordings.ts** for available server actions
4. **Explore the database** in Supabase Table Editor

---

## 🎨 Development Workflow

```bash
# Daily development
npm run dev                    # Start dev server

# Making schema changes
# 1. Edit src/lib/db/schema.ts
npm run db:generate            # Generate migration
npm run db:push                # Push to database

# Viewing database
npm run db:studio              # Open Drizzle Studio GUI
# OR visit Supabase dashboard

# Before committing
npm run lint                   # Check for errors
git add .
git commit -m "description"
```

---

**Status:** Ready to develop! 🚀  
**Database:** ✅ Connected to Supabase  
**Authentication:** ⏳ Waiting for Spotify config  
**Next Action:** Complete the 3 critical steps above
