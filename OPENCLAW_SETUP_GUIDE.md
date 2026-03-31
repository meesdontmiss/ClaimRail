# ClaimRail + OpenCLAW Setup Guide

## 🦞 Auto-Register Your Music with BMI (Fully Automated!)

This guide will help you set up **completely automatic BMI registration** for your music. Once configured, ClaimRail will:

1. ✅ Detect new releases on Spotify automatically
2. ✅ Log into BMI.com for you
3. ✅ Fill out work registration forms
4. ✅ Submit and get confirmation numbers
5. ✅ Email you when it's done

**Zero manual work required after initial setup!**

---

## 📋 Prerequisites

- ClaimRail account ($20/year subscription)
- BMI account (free at [bmi.com](https://www.bmi.com))
- A computer or server to run OpenCLAW (can be your home PC, VPS, etc.)
- About 30 minutes for initial setup

---

## 🚀 Step-by-Step Setup

### Step 1: Install OpenCLAW (5 minutes)

OpenCLAW is the free AI agent that will automate BMI registration for you.

#### On Windows/Mac/Linux:

```bash
# First, install Node.js 22+ from https://nodejs.org

# Then install OpenCLAW globally
npm install -g openclaw@latest

# Run the onboarding
openclaw onboard
```

#### Verify Installation:

Open your browser to: `http://localhost:18789`

You should see the OpenCLAW dashboard!

---

### Step 2: Install BMI Registration Skill (5 minutes)

1. **Download the BMI skill file:**
   - Get the file from ClaimRail: `openclaw-skills/bmi-work-registration.js`
   - Or copy it from the ClaimRail GitHub repo

2. **Install the skill:**
   ```bash
   # Copy to OpenCLAW skills folder
   cp bmi-work-registration.js ~/.openclaw/skills/
   
   # Verify it's installed
   openclaw skills list
   ```

3. **Restart OpenCLAW:**
   ```bash
   openclaw restart
   ```

---

### Step 3: Add Your BMI Credentials (3 minutes)

OpenCLAW needs your BMI login to register works on your behalf.

#### In the OpenCLAW Dashboard:

1. Go to **Vault** (left sidebar)
2. Click **Add New Credential**
3. Add these two entries:
   - **Key:** `bmi_username` → **Value:** your BMI username
   - **Key:** `bmi_password` → **Value:** your BMI password
4. Click **Save** (credentials are encrypted locally)

✅ Your credentials never leave your machine!

---

### Step 4: Connect ClaimRail to OpenCLAW (5 minutes)

1. **In your ClaimRail dashboard:**
   - Go to **Settings** → **Integrations**
   - Click **Connect OpenCLAW**

2. **Enter your OpenCLAW URL:**
   - If running locally: `http://localhost:18789`
   - If on a server: `http://your-server-ip:18789`

3. **Test Connection:**
   - Click **Test Connection**
   - Should show: ✅ Connected to OpenCLAW

4. **Test BMI Login:**
   - Click **Test BMI Login**
   - OpenCLAW will attempt to log into BMI
   - Should show: ✅ BMI login successful

---

### Step 5: Connect Your Spotify Account (2 minutes)

1. **In ClaimRail dashboard:**
   - Go to **Settings** → **Spotify**
   - Click **Connect with Spotify**

2. **Authorize ClaimRail:**
   - Log into your Spotify account
   - Click **Agree** to grant permissions

3. **Verify Connection:**
   - Should show your Spotify artist name
   - Shows number of releases in your catalog

---

### Step 6: Enable Auto-Registration (3 minutes)

1. **In ClaimRail dashboard:**
   - Go to **Settings** → **Auto-Registration**
   - Toggle **Enable BMI Auto-Registration** to ON

2. **Configure Scan Frequency:**
   - Choose how often to scan Spotify:
     - **Weekly** (recommended) - Every Monday at 9 AM
     - **Daily** - Every day at 9 AM
     - **Monthly** - First of each month

3. **Email Notifications:**
   - ✅ Email me when new songs are registered
   - ✅ Email me if registration fails
   - ✅ Send weekly summary

4. **Click Save Settings**

---

## ✅ You're Done!

### What Happens Now:

```
Every Week (or your chosen frequency):
┌────────────────────────────────────────────┐
│ 1. ClaimRail scans your Spotify catalog    │
│ 2. Detects new releases (by ISRC)          │
│ 3. Prepares BMI registration data          │
│ 4. Sends data to OpenCLAW                  │
│ 5. OpenCLAW logs into BMI.com              │
│ 6. Fills out work registration form        │
│ 7. Submits and gets confirmation number    │
│ 8. Logs registration in ClaimRail          │
│ 9. Emails you: "✅ 3 songs registered!"    │
└────────────────────────────────────────────┘

You: Do nothing! Royalties start collecting.
```

---

## 📊 Monitoring Your Registrations

### In ClaimRail Dashboard:

1. **Go to Dashboard → Registrations**
   - See all BMI registrations
   - Confirmation numbers
   - Registration dates
   - Status (success/failed)

2. **View Details:**
   - Click any registration
   - See full submission data
   - Download confirmation screenshot

---

## 🔧 Troubleshooting

### OpenCLAW Won't Start

```bash
# Check Node.js version
node --version  # Should be v22+

# Reinstall OpenCLAW
npm install -g openclaw@latest

# Check logs
openclaw logs
```

### BMI Login Fails

1. **Verify credentials in Vault:**
   - Go to Vault in OpenCLAW dashboard
   - Check `bmi_username` and `bmi_password`
   - Update if changed

2. **Check BMI account status:**
   - Log into bmi.com manually
   - Ensure account is in good standing

3. **Retry:**
   - In ClaimRail: Settings → Test BMI Login

### Registration Fails for a Song

**Common reasons:**
- Writer shares don't total 100%
- Missing required writer info (name, IPI)
- BMI server error

**What happens:**
- ClaimRail emails you the error
- Shows what went wrong
- You can manually fix and retry

---

## 🔐 Security & Privacy

### Your Data Is Safe:

- **BMI Credentials:** Encrypted locally, never sent to ClaimRail servers
- **Spotify Data:** Only read access, can't modify your catalog
- **Registration Data:** Stored encrypted in your database
- **OpenCLAW:** Runs on YOUR machine, you control everything

### What ClaimRail Stores:

- ✅ Song metadata (title, artist, ISRC)
- ✅ Writer names and splits
- ✅ BMI confirmation numbers
- ❌ NOT your BMI password (stays in OpenCLAW vault)
- ❌ NOT your Spotify password (OAuth only)

---

## 💰 Subscription & Billing

### $20/Year Includes:

- ✅ Unlimited BMI registrations
- ✅ Weekly Spotify scanning
- ✅ Auto-registration via OpenCLAW
- ✅ Email notifications
- ✅ Registration history dashboard
- ✅ Support & updates

### Billing:

- Charged annually via Stripe
- Cancel anytime
- 30-day money-back guarantee

---

## 🆘 Need Help?

### Resources:

- **Docs:** https://claimrail.com/docs
- **Status Page:** https://status.claimrail.com
- **Email Support:** support@claimrail.com
- **Discord Community:** https://discord.gg/claimrail

### Common Issues:

| Issue | Solution |
|-------|----------|
| OpenCLAW won't connect | Check firewall, ensure port 18789 is open |
| BMI registration fails | Verify writer shares = 100% |
| Spotify not syncing | Reconnect Spotify account in settings |
| Not receiving emails | Check spam folder, add noreply@claimrail.com |

---

## 🎉 Success!

Once you see your first registration confirmation email, you're all set!

**From now on:**
- Release music on DistroKid/any distributor
- ClaimRail auto-detects on Spotify
- OpenCLAW auto-registers with BMI
- You collect royalties passively

**Total time investment:** 30 minutes setup  
**Ongoing time:** 0 minutes (fully automatic!)

---

## 📚 Advanced Configuration

### Run OpenCLAW on a VPS (24/7)

For true set-and-forget, run OpenCLAW on a cloud server:

```bash
# Example: DigitalOcean droplet ($6/month)
# Ubuntu 22.04, 1GB RAM

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install OpenCLAW
npm install -g openclaw@latest

# Run as systemd service
sudo nano /etc/systemd/system/openclaw.service

# Add this:
[Unit]
Description=OpenCLAW
After=network.target

[Service]
ExecStart=/usr/bin/openclaw start
Restart=always
User=yourusername

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable openclaw
sudo systemctl start openclaw
```

Now it runs 24/7 even if your computer is off!

---

**Ready to start? Go to [ClaimRail Dashboard](https://claimrail.com) and connect your Spotify account!** 🚀
