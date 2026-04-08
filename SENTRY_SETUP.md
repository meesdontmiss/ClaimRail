# Sentry Error Monitoring Setup

## Overview

Sentry provides real-time error tracking, performance monitoring, and user session replay for production applications.

---

## Step 1: Create Sentry Account

1. **Sign Up:**
   - Visit: https://sentry.io/signup/
   - Free tier includes: 5,000 errors/month, 10,000 transactions/month
   - Use GitHub or email to sign up

2. **Create Project:**
   - Click **"Create Project"**
   - Select framework: **Next.js**
   - Name: `claimrail`

3. **Get DSN:**
   - Go to: Project Settings → Client Keys (DSN)
   - Copy the DSN (looks like: `https://abc123@o123456.ingest.sentry.io/1234567`)

---

## Step 2: Configure Environment Variables

### Local Development

Add to `.env.local`:
```env
# Sentry (disabled in development)
NEXT_PUBLIC_SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/1234567
```

### Production (Vercel)

Add to Vercel → Settings → Environment Variables:
| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Your DSN from Sentry | Production |

---

## Step 3: Verify Configuration

Sentry is already configured in:
- ✅ `sentry.client.config.ts` - Browser error tracking
- ✅ `sentry.server.config.ts` - Server-side error tracking
- ✅ `sentry.edge.config.ts` - Edge function error tracking

**Features enabled:**
- Error tracking with stack traces
- Performance monitoring (traces)
- Session replay (records user sessions when errors occur)
- Only active in production (`enabled: process.env.NODE_ENV === "production"`)

---

## Step 4: Test Sentry Integration

### Trigger Test Error

Create a test page to verify Sentry is working:

```typescript
// src/app/test-sentry/page.tsx
'use client'

import * as Sentry from '@sentry/nextjs'

export default function TestSentry() {
  const triggerError = () => {
    try {
      throw new Error('Sentry test error')
    } catch (error) {
      Sentry.captureException(error)
    }
  }

  return (
    <div>
      <h1>Test Sentry</h1>
      <button onClick={triggerError}>Trigger Error</button>
    </div>
  )
}
```

### Check Sentry Dashboard

1. Go to your Sentry project dashboard
2. Click **"Issues"**
3. You should see the test error appear
4. Click on the error to see:
   - Stack trace
   - Browser/OS info
   - User actions (breadcrumbs)
   - Affected users count

---

## Step 5: Advanced Configuration

### Track User Identity

Add to `sentry.client.config.ts`:

```typescript
Sentry.init({
  // ... existing config
  beforeSend(event) {
    if (event.user) {
      event.user.email = event.user.email?.replace(/@.*/, '@***')
    }
    return event
  },
})
```

### Custom Error Tracking

Capture specific errors in your code:

```typescript
import * as Sentry from '@sentry/nextjs'

// Capture exception
try {
  // your code
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: 'billing' },
    user: { id: userId },
  })
}
```

### Performance Monitoring

Track slow API calls:

```typescript
import * as Sentry from '@sentry/nextjs'

const transaction = Sentry.startTransaction({ name: 'import-tracks' })

try {
  // Your code here
  transaction.setStatus('ok')
} catch (error) {
  transaction.setStatus('error')
  throw error
} finally {
  transaction.finish()
}
```

---

## Step 6: Set Up Alerts

### Email Notifications

1. Go to: Project Settings → Alerts
2. Click **"Create Alert"**
3. Configure:
   - **Trigger:** "When issues are first created"
   - **Action:** "Send a notification to [your email]"

### Slack Integration (Optional)

1. Go to: Organization Settings → Integrations
2. Click **"Add Integration"** → Slack
3. Configure which channels receive alerts

---

## Step 7: Monitor Production

### Daily Checks

- Check Sentry dashboard for new errors
- Review performance metrics (p50, p95, p99 response times)
- Check error rate trends

### Weekly Reviews

- Top error sources
- Most affected users
- Performance regressions
- Browser/OS-specific issues

---

## Sentry Dashboard URLs

After setup:
- **Project Dashboard:** https://sentry.io/organizations/[your-org]/issues/
- **Performance:** https://sentry.io/organizations/[your-org]/performance/
- **Replays:** https://sentry.io/organizations/[your-org]/replays/
- **Alerts:** https://sentry.io/organizations/[your-org]/alerts/

---

## Troubleshooting

### Sentry Not Receiving Events

**Check:**
1. `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. `NODE_ENV=production` (Sentry is disabled in development)
3. Network requests to Sentry aren't blocked by ad blockers
4. Check browser console for Sentry SDK errors

### Too Many Errors

**Solutions:**
1. Filter out expected/ignored errors:
```typescript
Sentry.init({
  ignoreErrors: ['Expected error message', /NetworkError/],
})
```

2. Adjust sample rate:
```typescript
Sentry.init({
  tracesSampleRate: 0.1, // 10% instead of 100%
})
```

### False Positives

**Fix:**
- Add error filtering in `beforeSend`
- Use `Sentry.captureMessage()` for intentional logs
- Mark expected errors with tags

---

## Cost Management

**Free Tier Limits:**
- 5,000 errors/month
- 10,000 transactions/month
- 1 GB session replay storage

**If you exceed limits:**
- Reduce `tracesSampleRate`
- Increase error filtering
- Upgrade to Team plan ($26/month)

---

## Next Steps

After Sentry is configured:
1. Monitor errors daily for the first week
2. Set up weekly error review cadence
3. Create runbooks for common error patterns
4. Integrate with your CI/CD pipeline for release tracking
5. Add custom tags for different features (billing, auth, automation)

---

**Documentation:**
- Sentry Next.js SDK: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Performance Monitoring: https://docs.sentry.io/platforms/javascript/guides/nextjs/performance/
- Session Replay: https://docs.sentry.io/platforms/javascript/guides/nextjs/session-replay/
