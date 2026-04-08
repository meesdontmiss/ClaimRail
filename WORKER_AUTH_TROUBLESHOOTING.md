# Worker Authentication Troubleshooting

## Issue: "Unauthorized worker" Error

If you see this error in `worker-session.err.log`:
```
[worker] ping failed Error: Unauthorized worker
```

## Root Cause

The worker and API must share the same secret. The resolution order is:
1. `AUTOMATION_WORKER_SECRET` (highest priority)
2. `CLAIMRAIL_ENCRYPTION_SECRET`
3. `NEXTAUTH_SECRET` (fallback)

## Fix Steps

### 1. Verify Environment Variables

Both the worker AND the Vercel deployment must have matching secrets.

**In `.env.local`:**
```env
AUTOMATION_WORKER_SECRET=Hx7QmR2vLp9cTf4NwKa8Yz1DsVu6JeBn3Cg5MtXqPk0ArLi7UhSe2FoWdNm8PyK4
```

**In Vercel (Production):**
- Go to Vercel → Your Project → Settings → Environment Variables
- Ensure `AUTOMATION_WORKER_SECRET` is set to the **exact same value**
- Redeploy after adding/updating

### 2. Check Secret Fingerprint

The worker logs a fingerprint of its secret on startup. Compare it with the API's expected fingerprint.

**Worker logs should show:**
```
[worker] auth config {
  baseUrl: 'https://claim-rail.vercel.app',
  workerId: 'local-worker-1',
  secretSource: 'AUTOMATION_WORKER_SECRET',
  secretFingerprint: 'abc123def456...'
}
```

**API logs (when worker tries to connect) should show matching fingerprint.**

### 3. Test Worker Locally

```bash
# Make sure .env.local has AUTOMATION_WORKER_SECRET set
npm run worker:once
```

Expected output:
```
[worker] auth config { ... }
[worker] ping successful
[worker] no jobs available
```

### 4. Test Worker Against Production

If running worker locally but targeting production API:

```bash
# Create .env.production.local
AUTOMATION_BASE_URL=https://claim-rail.vercel.app
AUTOMATION_WORKER_SECRET=<same_as_vercel>
AUTOMATION_WORKER_ID=local-test-worker

# Run worker
dotenv -e .env.production.local -- node worker/index.mjs --once
```

### 5. Common Mistakes

❌ **Different secrets in different places**
- Worker uses `AUTOMATION_WORKER_SECRET`
- Vercel has only `NEXTAUTH_SECRET`
- **Fix:** Add `AUTOMATION_WORKER_SECRET` to Vercel

❌ **Trailing whitespace or newlines**
- Copy-paste errors add invisible characters
- **Fix:** Use `.trim()` (already in code) or re-enter the secret

❌ **Secret was rotated**
- Someone regenerated NEXTAUTH_SECRET but didn't update worker
- **Fix:** Ensure all three secrets match across environments

## Verification Checklist

- [ ] `AUTOMATION_WORKER_SECRET` is set in `.env.local`
- [ ] `AUTOMATION_WORKER_SECRET` is set in Vercel (production)
- [ ] Values are **identical** (case-sensitive, no extra whitespace)
- [ ] Worker logs show `secretSource: 'AUTOMATION_WORKER_SECRET'`
- [ ] API and worker fingerprint match
- [ ] Worker ping succeeds without "Unauthorized" error

## Still Not Working?

Run this diagnostic script:

```bash
node -e "
const crypto = require('crypto');
const secret = process.env.AUTOMATION_WORKER_SECRET;
if (!secret) {
  console.error('AUTOMATION_WORKER_SECRET is not set!');
  process.exit(1);
}
const fingerprint = crypto.createHash('sha256').update(secret).digest('hex').slice(0, 12);
console.log('Secret length:', secret.length);
console.log('Fingerprint:', fingerprint);
console.log('First 4 chars:', secret.slice(0, 4));
console.log('Last 4 chars:', secret.slice(-4));
"
```

Compare the fingerprint output between your worker environment and Vercel logs.
