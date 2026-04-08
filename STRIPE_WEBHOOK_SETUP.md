# Stripe Webhook Setup Guide

## Overview
This guide will help you configure Stripe webhooks to handle payment confirmations, subscription lifecycle events, and billing synchronization.

---

## Step 1: Create Webhook Endpoint in Stripe Dashboard

### For Production (Live Mode)

1. **Go to Stripe Dashboard**
   - Visit: https://dashboard.stripe.com/webhooks
   - Make sure you're in **Live mode** (toggle at top right)

2. **Add Endpoint**
   - Click **"Add endpoint"**
   - Enter endpoint URL: `https://claim-rail.vercel.app/api/stripe/webhook`
   - Click **"Continue"**

3. **Select Events to Listen To**
   Choose these specific events:
   - ✅ `checkout.session.completed` - Payment confirmation
   - ✅ `customer.subscription.created` - New subscription
   - ✅ `customer.subscription.updated` - Subscription changes
   - ✅ `customer.subscription.deleted` - Cancellation
   - ✅ `invoice.payment_succeeded` - Successful payments
   - ✅ `invoice.payment_failed` - Failed payments
   - ✅ `customer.updated` - Customer info changes

4. **Save the Webhook**
   - Click **"Add endpoint"**
   - Copy the **Signing secret** (starts with `whsec_`)

5. **Update Environment Variable**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Update `STRIPE_WEBHOOK_SECRET` with the new signing secret
   - Example: `whsec_abc123def456...`
   - Redeploy your application

---

## Step 2: Test Locally with Stripe CLI

### Install Stripe CLI

**Windows:**
```powershell
# Using Scoop
scoop install stripe-cli

# Or download from https://github.com/stripe/stripe-cli/releases
```

**Mac:**
```bash
brew install stripe/stripe-cli/stripe
```

### Login and Listen

1. **Authenticate:**
   ```bash
   stripe login
   ```

2. **Start Webhook Forwarder:**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

3. **Copy the Webhook Secret:**
   - The CLI will output a signing secret
   - Add it to your `.env.local`:
     ```
     STRIPE_WEBHOOK_SECRET=whsec_test_secret_from_cli
     ```

4. **Trigger Test Events:**
   ```bash
   # Test checkout completion
   stripe trigger checkout.session.completed

   # Test subscription creation
   stripe trigger customer.subscription.created
   ```

---

## Step 3: Verify Webhook is Working

### Check Application Logs

After setting up the webhook, monitor your logs:

**Local:**
```bash
npm run dev
# Watch for webhook-related log messages
```

**Vercel Production:**
```bash
# Go to Vercel Dashboard → Deployments → Logs
# Look for Stripe webhook-related entries
```

### Expected Log Messages

✅ **Success:**
```
[Stripe] Webhook received: checkout.session.completed
[Stripe] Customer synced successfully
```

❌ **Errors to Watch For:**
```
STRIPE_WEBHOOK_SECRET is not configured
Missing Stripe signature
No signatures found matching the expected signature
```

---

## Step 4: Update Production Environment

### Vercel Environment Variables

Add/update these in Vercel → Settings → Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `STRIPE_WEBHOOK_SECRET` | `whsec_live_abc123...` (from Stripe Dashboard) | Production |
| `STRIPE_SECRET_KEY` | Your live key (already set) | Production |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Your live pub key (already set) | Production |
| `STRIPE_PRO_PRICE_ID` | `price_1TIGpQJBcOvvPHWiUVDpW5UV` (already set) | Production |

### Redeploy

After updating environment variables:
1. Go to Vercel → Deployments
2. Click the **⋮** menu on latest deployment
3. Click **"Redeploy"**

---

## Step 5: Test the Full Flow

### Test Checkout Flow

1. **Start Local Dev Server:**
   ```bash
   npm run dev
   ```

2. **Go to Pricing Page:**
   - Visit: http://localhost:3000/pricing
   - Click "Subscribe" on Pro plan

3. **Complete Test Payment:**
   - Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits

4. **Verify Database:**
   ```bash
   npm run db:studio
   # Check users table for:
   # - stripe_customer_id
   # - stripe_subscription_id  
   # - stripe_subscription_status = 'active'
   ```

---

## Troubleshooting

### Webhook Not Receiving Events

**Check:**
1. Endpoint URL is correct and accessible
2. `STRIPE_WEBHOOK_SECRET` is set correctly
3. Webhook signature validation is passing
4. Application is running and accessible

**Test Endpoint:**
```bash
curl -X POST https://claim-rail.vercel.app/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{"type":"checkout.session.completed"}'
```

Expected response: `400 Bad Request` (missing signature is expected)

### Signature Validation Failing

**Fix:**
1. Ensure `STRIPE_WEBHOOK_SECRET` matches exactly what Stripe provided
2. No extra whitespace or newlines in the secret
3. Check that raw body (not JSON parsed) is being used for signature validation

### Events Not Processing

**Debug:**
1. Check Stripe Dashboard → Webhooks → Recent deliveries
2. Look for failed delivery attempts
3. Check your application logs for error messages
4. Verify the event types match what you're handling in code

---

## Security Best Practices

✅ **Do:**
- Keep webhook secret confidential
- Use different secrets for test/live environments
- Monitor webhook delivery failures in Stripe Dashboard
- Implement idempotency for critical operations

❌ **Don't:**
- Commit webhook secrets to version control
- Share webhook URLs publicly
- Ignore webhook delivery failures
- Trust webhook payloads without signature validation

---

## Next Steps

After webhook is configured:
1. Test subscription cancellation flow
2. Test payment failure handling
3. Verify subscription renewal works
4. Set up Stripe alerts for failed webhook deliveries
5. Monitor webhook metrics in Stripe Dashboard

---

**Need Help?**
- Stripe Webhook Docs: https://stripe.com/docs/webhooks
- Stripe CLI Docs: https://stripe.com/docs/stripe-cli
- ClaimRail Support: Check `/api/debug/auth-events/latest` endpoint
