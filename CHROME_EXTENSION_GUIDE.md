# Chrome Extension Setup & Distribution Guide

## Overview

ClaimRail includes a Chrome extension (Manifest V3) that auto-fills BMI work registration forms when users visit bmi.com.

---

## Extension Structure

```
extension/
├── manifest.json       # Extension configuration (Manifest V3)
├── background.js       # Service worker (handles events)
├── content.js          # Content script (injects into BMI pages)
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic
└── README.md           # Extension documentation
```

---

## Local Development Testing

### Step 1: Load Extension in Developer Mode

1. **Open Chrome Extensions Page:**
   - Navigate to: `chrome://extensions/`
   - Or: Menu (⋮) → More Tools → Extensions

2. **Enable Developer Mode:**
   - Toggle **"Developer mode"** switch (top right)

3. **Load Unpacked Extension:**
   - Click **"Load unpacked"** button
   - Select the `extension/` folder from your project
   - Extension should appear in the list

4. **Verify Installation:**
   - Extension icon appears in Chrome toolbar
   - Click icon to see popup
   - Check `chrome://extensions/` for any errors

### Step 2: Test on BMI.com

1. **Visit BMI Website:**
   - Go to: https://www.bmi.com/
   - Navigate to work registration page

2. **Extension Should:**
   - Auto-detect BMI registration forms
   - Pre-fill with ClaimRail data (if configured)
   - Show status in popup

3. **Debug:**
   - Right-click page → Inspect
   - Go to **Console** tab
   - Look for extension log messages

---

## Preparing for Chrome Web Store

### Step 1: Update manifest.json

Current `manifest.json` needs these updates for production:

```json
{
  "manifest_version": 3,
  "name": "ClaimRail BMI Assistant",
  "version": "1.0.0",
  "description": "Auto-fill BMI work registration forms with your ClaimRail data",
  "permissions": [
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "https://www.bmi.com/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://www.bmi.com/*"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### Step 2: Create Extension Icons

Create `extension/icons/` folder with:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

**Design Guidelines:**
- Use ClaimRail brand colors
- Simple, recognizable icon
- Transparent background
- Test at small sizes (16x16 must be readable)

**Tools:**
- Figma, Canva, or hire a designer on Fiverr
- Export as PNG with transparency

### Step 3: Create Screenshots for Store

Take 3-5 screenshots showing:
1. Extension popup interface
2. Auto-fill in action on BMI.com
3. Success/error states
4. Settings/configuration page

**Requirements:**
- 1280x800 or 640x400 pixels
- JPG or PNG format
- No promotional text in screenshots

### Step 4: Write Store Listing

**Title:** ClaimRail BMI Assistant

**Summary (132 chars):**
Automatically fill BMI registration forms with your ClaimRail data. Save time and avoid errors.

**Description:**
```
ClaimRail BMI Assistant helps independent musicians and songwriters automatically fill out BMI work registration forms, saving hours of manual data entry.

FEATURES:
• Auto-detect BMI registration forms
• Pre-fill songwriter and composition data
• Sync with your ClaimRail account
• Reduce registration errors
• Save time on publishing admin

HOW IT WORKS:
1. Install the extension
2. Connect to your ClaimRail account
3. Visit BMI.com work registration page
4. Extension auto-fills the forms for you

PRIVACY:
• Only active on BMI.com
• Never stores your BMI credentials
• Encrypted communication with ClaimRail
• Open source code

REQUIRES:
• ClaimRail account (https://claim-rail.vercel.app)
• BMI account (https://www.bmi.com)

Support: support@claimrail.com
Privacy Policy: https://claim-rail.vercel.app/privacy
```

### Step 5: Create Privacy Policy

Create a simple privacy policy page:

```
ClaimRail Extension Privacy Policy

Last updated: April 8, 2026

What We Collect:
- BMI credentials (encrypted, stored locally only)
- ClaimRail API key (encrypted, stored locally)
- Form auto-fill status

What We Don't Collect:
- Browsing history
- Personal information beyond form fields
- Analytics or tracking data

How We Use Data:
- Auto-fill BMI registration forms
- Sync with your ClaimRail account
- Improve extension features

Data Storage:
- All data stored locally in your browser
- Encrypted using AES-256
- Never transmitted to third parties

Contact:
support@claimrail.com
```

---

## Publishing to Chrome Web Store

### Step 1: Create Developer Account

1. **Register:**
   - Go to: https://chrome.google.com/webstore/devconsole/
   - Pay one-time $5 registration fee
   - Complete account verification

2. **Prepare ZIP File:**
   ```bash
   # Create production ZIP (exclude dev files)
   cd extension/
   zip -r ../claimrail-extension.zip \
     manifest.json \
     background.js \
     content.js \
     popup.html \
     popup.js \
     icons/
   ```

### Step 2: Submit Extension

1. **Upload Package:**
   - Click **"New Item"** in Developer Dashboard
   - Upload `claimrail-extension.zip`
   - Fill in store listing details

2. **Complete Listing:**
   - Add title, description, screenshots
   - Select category: **Productivity**
   - Set language: **English**
   - Add privacy policy URL

3. **Review & Publish:**
   - Google reviews extensions (1-3 business days)
   - You'll get email notification
   - Extension goes live after approval

### Step 3: Post-Publication

1. **Monitor Reviews:**
   - Respond to user feedback
   - Fix reported bugs promptly

2. **Track Metrics:**
   - Users, installs, uninstalls
   - Error reports from Chrome

3. **Update Regularly:**
   - Fix bugs
   - Add features
   - Maintain compatibility with Chrome updates

---

## Alternative Distribution Methods

### Option A: Direct Download (Sideload)

For users who don't want Chrome Web Store:

1. **Host ZIP on GitHub Releases:**
   ```bash
   # Create release on GitHub
   # Users download and extract
   # Load unpacked in developer mode
   ```

2. **Provide Install Instructions:**
   - Document in README
   - Video tutorial
   - Support channel

### Option B: Enterprise Distribution

For organizations:

1. **Create CRX Package:**
   ```bash
   # Chrome Developer Dashboard
   # Download .crx file
   # Distribute to enterprise users
   ```

2. **Group Policy Configuration:**
   - IT admins can force-install via GPO
   - No user action required

---

## Extension Security Best Practices

### Current Security Model

✅ **Implemented:**
- API key verification (`/api/extension/verify`)
- Encrypted credential storage
- Only active on BMI.com (host_permissions)
- No external script injection

✅ **Recommended:**
- Rotate API keys regularly
- Add content security policy (CSP)
- Implement extension update mechanism
- Add telemetry for error reporting (optional)

### Security Checklist

- [ ] Never store plaintext credentials
- [ ] Validate all API responses
- [ ] Use HTTPS for all communications
- [ ] Implement token refresh on expiration
- [ ] Add rate limiting to extension API calls
- [ ] Review content script for XSS vulnerabilities
- [ ] Test with Chrome's security scanner

---

## Troubleshooting

### Extension Not Loading

**Check:**
1. Developer mode is enabled
2. No errors in `chrome://extensions/`
3. `manifest.json` is valid
4. All referenced files exist

### Auto-Fill Not Working

**Debug:**
1. Open Chrome DevTools on BMI.com
2. Check Console for errors
3. Verify content.js is injected
4. Check Network tab for API calls

### API Key Invalid

**Fix:**
1. Go to ClaimRail dashboard
2. Settings → Extension API Key
3. Generate new key
4. Enter in extension popup

---

## Future Enhancements

### Phase 2 Features
- ASCAP form support
- SESAC form support
- Multi-PRO support
- Bulk work registration
- Export to CSV/Excel
- Offline mode

### Phase 3 Features
- AI-assisted metadata completion
- ISRC lookup integration
- Automatic songwriter splits
- Real-time sync with ClaimRail

---

## Support Resources

- **Extension Docs:** https://developer.chrome.com/docs/extensions/
- **Manifest V3 Guide:** https://developer.chrome.com/docs/extensions/mv3/intro/
- **Publishing Guide:** https://developer.chrome.com/docs/webstore/publish/
- **ClaimRail Support:** Check dashboard or email support@claimrail.com

---

**Next Steps:**
1. Create extension icons
2. Update manifest.json with production config
3. Test locally on BMI.com
4. Create Chrome Web Store listing
5. Submit for review
6. Monitor after publication
