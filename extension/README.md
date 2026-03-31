# ClaimRail Chrome Extension

🎵 **Auto-fill BMI work registration forms with one click!**

---

## 🚀 Features

### Free Tier
- ✅ 1 BMI registration per week
- ✅ Manual form auto-fill
- ✅ Basic song data import

### Pro Tier ($20/year)
- ✅ **Unlimited** BMI registrations
- ✅ **Auto-detect** new Spotify releases
- ✅ **Batch register** multiple songs
- ✅ **Priority** form filling
- ✅ **Email notifications**
- ✅ **Registration history**

---

## 📦 Installation (Development)

### 1. Build the Extension

```bash
cd extension

# Install dependencies (if any)
npm init -y

# No build step needed - plain JavaScript!
```

### 2. Load in Chrome

1. Open Chrome: `chrome://extensions/`
2. Enable **Developer Mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extension` folder
5. Extension icon appears in toolbar!

### 3. Pin Extension (Optional)

Click the puzzle piece icon → Pin "ClaimRail Auto-Register"

---

## 🎯 How to Use

### For Users:

1. **Install extension** from Chrome Web Store
2. **Click extension icon** → Connect ClaimRail account
3. **Log in** to ClaimRail
4. **Go to BMI.com** → Register a Work
5. **Click extension icon** → "Auto-Fill BMI Form"
6. **Review** the filled form
7. **Click Submit** on BMI

### For Pro Users:

1. **Enable auto-detect** in ClaimRail dashboard
2. **New release detected** on Spotify
3. **Extension notification** appears
4. **Click notification** → Opens BMI with form pre-filled
5. **Submit** → Done!

---

## 💰 Monetization

### Chrome Web Store Setup

1. **Create Developer Account**
   - Go to: https://chrome.google.com/webstore/devconsole
   - Pay **one-time $5 fee**
   - Takes ~1 hour for approval

2. **Create New Item**
   - Upload extension ZIP
   - Add screenshots (1280x800 recommended)
   - Add description
   - Set pricing: **Free** (subscriptions handled on your site)

3. **Submit for Review**
   - Takes 1-3 days typically
   - Must comply with Chrome Web Store policies

### Subscription Flow

```
User installs extension (free)
    ↓
Opens extension → Sees "Connect ClaimRail Account"
    ↓
Logs in to ClaimRail
    ↓
Extension verifies subscription via API
    ↓
Free tier: 1 registration/week
Pro tier: Unlimited registrations
    ↓
User clicks "Upgrade to Pro" → Opens ClaimRail checkout
    ↓
Stripe payment → Subscription activated
    ↓
Extension detects Pro status → Unlocks unlimited feature
```

---

## 🔐 Security

### API Key Authentication

- Extension gets API key after user logs in
- API key stored in `chrome.storage.local` (encrypted by Chrome)
- All API calls use Bearer token authentication
- API keys can be revoked from ClaimRail dashboard

### Subscription Verification

```javascript
// background.js - Runs on every extension open
const response = await fetch('https://claimrail.com/api/extension/verify', {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});

const data = await response.json();

if (!data.valid || !data.canRegister) {
  showUpgradeScreen();
  return;
}

// Grant access
```

---

## 🛠️ Development

### File Structure

```
extension/
├── manifest.json          # Extension config
├── background.js          # Service worker (subscription checks)
├── content.js            # Injected into BMI.com (form filling)
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### Testing Locally

1. **Load unpacked extension** (see Installation)
2. **Open popup** → Click extension icon
3. **Open DevTools** → Right-click popup → Inspect
4. **Test subscription flows**:
   - Free tier (1/week limit)
   - Pro tier (unlimited)
   - No subscription (upgrade prompt)

### Debugging

```javascript
// In background.js or content.js
console.log('Debug message');

// View logs:
// - background.js: chrome://extensions → ClaimRail → Service Worker
// - content.js: BMI.com page → DevTools → Console
// - popup.js: Popup → Right-click → Inspect → Console
```

---

## 📤 Publishing to Chrome Web Store

### 1. Prepare Assets

- **Icon**: 128x128 PNG (transparent background)
- **Screenshots**: 1280x800 PNG (show extension in action)
- **Promo tile**: 440x280 PNG
- **Description**: Clear value prop + features list

### 2. Create ZIP

```bash
cd extension
zip -r claimrail-extension.zip . -x "*.git*" -x "node_modules"
```

### 3. Upload to Chrome Web Store

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click **New Item**
3. Upload ZIP
4. Fill in store listing:
   - **Name**: ClaimRail Auto-Register
   - **Description**: Automatically fill BMI work registration forms with one click. Connect your ClaimRail account to auto-detect new releases and register your music for royalties.
   - **Category**: Productivity
   - **Price**: Free

### 4. Privacy Policy

Required for extensions that access user data:

```markdown
# ClaimRail Extension Privacy Policy

## Data Collection
- We do NOT collect any browsing data
- We do NOT track your BMI.com activity
- We do NOT store your BMI credentials

## Data Usage
- Extension only accesses BMI.com to fill registration forms
- Song data is fetched from ClaimRail.com API
- All data stays between your browser, BMI.com, and ClaimRail.com

## Data Storage
- API key stored locally in Chrome storage (encrypted)
- No data is transmitted to third parties
- No cookies or tracking pixels

## User Rights
- You can revoke extension access anytime in ClaimRail settings
- You can delete your ClaimRail account (all data erased)
- You can uninstall extension (all local data removed)
```

### 5. Submit for Review

- Review time: 1-3 business days
- Common rejection reasons:
  - Misleading description
  - Missing privacy policy
  - Requesting unnecessary permissions
  - Broken functionality

---

## 🔄 Update Process

### Push Updates

1. **Update version** in `manifest.json`
2. **Make changes** to code
3. **Create new ZIP**
4. **Upload to Chrome Web Store**
5. **Submit for review** (again)

### Auto-Update

Chrome automatically updates extensions within 24 hours of approval.

---

## 📊 Metrics & Analytics

### Track in ClaimRail Dashboard

```sql
-- Extension usage stats
SELECT 
  u.name,
  u.email,
  u.stripe_subscription_status,
  COUNT(br.id) as registrations_via_extension,
  MAX(br.registered_at) as last_registration
FROM users u
LEFT JOIN bmi_registrations br ON u.id = br.composition_work_id
WHERE u.extension_api_key IS NOT NULL
GROUP BY u.id;
```

### Chrome Web Store Stats

- **Installs**: Total + active users
- **Uninstalls**: Churn rate
- **Reviews**: Average rating + feedback
- **Geography**: Where users are

---

## 🎨 Branding

### Extension Icon

- **Size**: 128x128 PNG
- **Style**: Match ClaimRail logo
- **Colors**: Use ClaimRail green (#1DB954)
- **Text**: Optional "CR" or music note

### Popup Design

- Match ClaimRail dashboard styling
- Use same fonts (Geist, Inter)
- Consistent color scheme
- Professional, clean UI

---

## 🆘 Troubleshooting

### Extension Not Working

1. **Check API key** → Re-login to ClaimRail
2. **Check subscription** → Ensure active in Stripe
3. **Check permissions** → Extension needs BMI.com access
4. **Restart Chrome** → Sometimes fixes issues

### Form Not Filling

1. **Check BMI.com layout** → They may have updated UI
2. **Update selectors** in `content.js`
3. **Test manually** → Try filling form yourself
4. **Check console** → Look for JavaScript errors

### Subscription Not Recognized

1. **Check Stripe webhook** → Ensure it's updating database
2. **Check API response** → Verify `/api/extension/verify` returns correct data
3. **Clear storage** → `chrome.storage.local.clear()` → Re-login

---

## 📚 Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome Web Store Payments](https://developer.chrome.com/docs/webstore/payments/)
- [Extension Best Practices](https://developer.chrome.com/docs/extensions/manifest/best-practices/)

---

## 💡 Future Features

- [ ] **Auto-submit** (with user confirmation)
- [ ] **Multi-PRO support** (ASCAP, SESAC)
- [ ] **Bulk upload** (register 10 songs at once)
- [ ] **Registration history** in extension popup
- [ ] **Dark mode** toggle
- [ ] **Keyboard shortcuts** (Alt+B to fill BMI form)
- [ ] **Offline mode** (cache song data)

---

**Ready to publish?** 🚀

1. Test thoroughly in development
2. Create store listing assets
3. Submit to Chrome Web Store
4. Announce to ClaimRail users!
