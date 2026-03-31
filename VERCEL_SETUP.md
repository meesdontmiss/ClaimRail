# 🚀 Vercel Deployment Setup Guide

## ⚠️ CRITICAL: Spotify OAuth Fix Required

Your Spotify login is failing because the callback URLs don't match your production domain.

---

## ✅ Step 1: Update Spotify Dashboard

1. Go to https://developer.spotify.com/dashboard
2. Click on your **ClaimRail** app
3. Click **"Edit Settings"**
4. Add these **Redirect URIs**:

```
https://claimrail.vercel.app/api/auth/callback/spotify
http://localhost:3000/api/auth/callback/spotify
```

5. Click **"Save"**

---

## ✅ Step 2: Add Environment Variables to Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Click on your **ClaimRail** project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `SPOTIFY_CLIENT_ID` | `4a0efa32622e44558b8b16eb58e6d70e` | Production |
| `SPOTIFY_CLIENT_SECRET` | `6141336077e640b484523d38d6ca1606` | Production |
| `NEXTAUTH_SECRET` | `UVchMW5BPzltXGZKVTZvYyo5cUdCSm12PkloeHpHcWIsSHtcaSJ2Z2B1KX1kImddWnh6NUZlKWAuSSlMXl5eTg==` | Production |
| `NEXTAUTH_URL` | `https://claimrail.vercel.app` | Production |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nzzaxfxolslrvonyihfx.supabase.co` | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56emF4ZnhvbHNscnZvbnlpaGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5ODU4MDksImV4cCI6MjA5MDU2MTgwOX0.nSFvjfGo7vzhEilalp_H9cbfqi_klC5n2ttjGptLxZQ` | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56emF4ZnhvbHNscnZvbnlpaGZ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk4NTgwOSwiZXhwIjoyMDkwNTYxODA5fQ.v5upQOnnJr10WRc6iuTtpFaHQ0GdVJzZUtGbkeNpwfA` | Production |
| `DATABASE_URL` | `postgresql://postgres:Paradisevices420!@db.nzzaxfxolslrvonyihfx.supabase.co:5432/postgres` | Production |

5. Click **"Save"** after each variable

---

## ✅ Step 3: Redeploy on Vercel

1. Go to your Vercel project
2. Click **"Deployments"** tab
3. Click the **⋮** menu on the latest deployment
4. Click **"Redeploy"**
5. This will rebuild with the new environment variables

---

## ✅ Step 4: Test Spotify Login

1. Go to https://claimrail.vercel.app
2. Click **"Connect with Spotify"** or **"Launch App"**
3. You should be redirected to Spotify authorization
4. Click **"Agree"**
5. You should be redirected back to the app dashboard

---

## 🔧 Troubleshooting

### "Something went wrong" error

**Check:**
1. Spotify redirect URIs match EXACTLY
2. Environment variables are set in Vercel
3. NEXTAUTH_URL matches your Vercel domain

### "Invalid redirect_uri"

**Make sure:**
- The redirect URI in Spotify Dashboard is EXACTLY:
  `https://claimrail.vercel.app/api/auth/callback/spotify`
- No trailing slash
- Uses `https://` not `http://`

### Still not working?

**Try:**
1. Clear browser cache and cookies
2. Try incognito mode
3. Check Vercel function logs for errors
4. Verify Spotify app is NOT in development mode (or add your email as a test user)

---

## 📝 Local Development

For local testing, keep these in your `.env.local`:

```bash
NEXTAUTH_URL=http://localhost:3000
SPOTIFY_CLIENT_ID=4a0efa32622e44558b8b16eb58e6d70e
SPOTIFY_CLIENT_SECRET=6141336077e640b484523d38d6ca1606
```

And make sure `http://localhost:3000/api/auth/callback/spotify` is in your Spotify redirect URIs.

---

## 🎯 Summary

**What was wrong:**
- `NEXTAUTH_URL` was set to `http://localhost:3000` but you're deploying to Vercel
- Spotify callback URL didn't match your production domain

**What to fix:**
1. ✅ Add production callback URL to Spotify Dashboard
2. ✅ Add environment variables to Vercel
3. ✅ Redeploy

**After fixing:**
- Spotify login will work on production
- Users can authenticate and import their catalog
- Everything flows to your Supabase database

---

**Need help?** Check Vercel logs: https://vercel.com/dashboard → ClaimRail → Deployments → Click latest → **Logs**
