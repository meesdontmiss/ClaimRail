# ClaimRail + OpenCLAW Integration

## Auto-Register Works with BMI Using AI Agent

This guide shows how to set up OpenCLAW to automatically register your music works with BMI.

---

## 🦞 What is OpenCLAW?

OpenCLAW is a **free, open-source AI agent** that can automate browser tasks like:
- Logging into websites
- Filling out forms
- Submitting data
- Scraping confirmation numbers

Perfect for automating BMI work registration!

---

## 📥 Step 1: Install OpenCLAW

### On Your Server/Computer

```bash
# Install Node.js 22+ first, then:
npm install -g openclaw@latest

# Run onboarding
openclaw onboard

# Access dashboard at http://localhost:18789
```

### Configure for ClaimRail

1. Open OpenCLAW dashboard: `http://localhost:18789`
2. Go to **Skills** → **Install Skill**
3. Install: `browser-automation`
4. Add your BMI credentials in **Vault** (encrypted storage)

---

## 🔧 Step 2: Set Up BMI Automation Skill

Create a new skill file at `~/.openclaw/skills/bmi-registration.js`:

```javascript
// BMI Work Registration Automation
export default {
  name: 'bmi-registration',
  trigger: /register.*bmi/i,
  
  async execute(context, params) {
    const { title, writers, isrc, shares } = params;
    
    // Navigate to BMI
    await browser.goto('https://www.bmi.com/login');
    
    // Login (credentials from vault)
    await browser.fill('#username', vault.get('bmi_username'));
    await browser.fill('#password', vault.get('bmi_password'));
    await browser.click('button[type="submit"]');
    
    // Navigate to work registration
    await browser.goto('https://www.bmi.com/register-work');
    
    // Fill form
    await browser.fill('#work-title', title);
    await browser.fill('#isrc', isrc);
    
    // Add writers
    for (const writer of writers) {
      await browser.click('Add Writer');
      await browser.fill('.writer-name', writer.name);
      await browser.fill('.writer-ipi', writer.ipi);
      await browser.select('.writer-share', writer.share);
    }
    
    // Submit
    await browser.click('button[type="submit"]');
    
    // Wait for confirmation
    const confirmation = await browser.getText('.confirmation-number');
    
    return { success: true, confirmation };
  }
};
```

---

## 🔗 Step 3: Connect ClaimRail to OpenCLAW

### Option A: Via MCP (Model Context Protocol)

Create `src/lib/openclaw/mcp-server.ts`:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const server = new McpServer({
  name: 'claimrail-bmi',
  version: '1.0.0',
});

server.tool('register_work', {
  title: 'string',
  writers: 'array',
  isrc: 'string',
  shares: 'object',
}, async (params) => {
  // Send to OpenCLAW via local API
  const response = await fetch('http://localhost:18789/api/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      skill: 'bmi-registration',
      params,
    }),
  });
  
  return await response.json();
});

export default server;
```

### Option B: Via HTTP API

Create `src/lib/openclaw/client.ts`:

```typescript
export async function registerWithBMI(workData: {
  title: string;
  writers: Array<{ name: string; ipi?: string; share: number }>;
  isrc: string;
}) {
  const response = await fetch('http://localhost:18789/api/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENCLAW_API_KEY}`,
    },
    body: JSON.stringify({
      skill: 'bmi-registration',
      params: workData,
    }),
  });
  
  if (!response.ok) {
    throw new Error('OpenCLAW registration failed');
  }
  
  const result = await response.json();
  return result;
}
```

---

## ⚙️ Step 4: Auto-Detect + Auto-Register Workflow

### Create Cron Job for Weekly Scans

Create `src/app/api/cron/scan-spotify/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { scanSpotifyForNewReleases } from '@/lib/spotify';
import { registerWithBMI } from '@/lib/openclaw/client';
import { getUserBySpotifyId } from '@/app/actions/recordings';

export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  
  const { userId } = await req.json();
  
  // Get user from DB
  const user = await getUserBySpotifyId(userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' });
  }
  
  // Scan Spotify for new releases
  const newReleases = await scanSpotifyForNewReleases(user.spotifyId);
  
  // Auto-register each with BMI
  const results = [];
  for (const release of newReleases) {
    try {
      const bmiResult = await registerWithBMI({
        title: release.title,
        writers: release.writers,
        isrc: release.isrc,
      });
      
      results.push({
        title: release.title,
        success: true,
        confirmation: bmiResult.confirmation,
      });
    } catch (error) {
      results.push({
        title: release.title,
        success: false,
        error: error.message,
      });
    }
  }
  
  // Send email notification
  await sendEmailNotification(user.email, results);
  
  return NextResponse.json({ success: true, results });
}
```

### Set Up Weekly Cron

Add to `package.json`:

```json
{
  "scripts": {
    "cron:scan": "curl -X POST http://localhost:3000/api/cron/scan-spotify -H 'Authorization: Bearer YOUR_CRON_SECRET' -H 'Content-Type: application/json' -d '{\"userId\": \"all\"}'"
  }
}
```

Add to crontab (Linux/Mac):

```bash
# Run every Monday at 9 AM
0 9 * * 1 curl -X POST http://localhost:3000/api/cron/scan-spotify -H 'Authorization: Bearer YOUR_CRON_SECRET' -H 'Content-Type: application/json' -d '{"userId": "all"}'
```

---

## 🔐 Security Best Practices

### 1. Encrypt BMI Credentials

Use AWS KMS or similar:

```typescript
import { KMS } from '@aws-sdk/client-kms';

const kms = new KMS({ region: 'us-east-1' });

export async function encryptCredentials(credentials: string) {
  const { CiphertextBlob } = await kms.encrypt({
    KeyId: process.env.KMS_KEY_ID,
    Plaintext: credentials,
  });
  return CiphertextBlob.toString('base64');
}

export async function decryptCredentials(encrypted: string) {
  const { Plaintext } = await kms.decrypt({
    CiphertextBlob: Buffer.from(encrypted, 'base64'),
  });
  return Plaintext.toString('utf-8');
}
```

### 2. Store in OpenCLAW Vault

```bash
openclaw vault set bmi_username your_username
openclaw vault set bmi_password your_password
```

### 3. Use Environment Variables

Create `.env.local`:

```bash
OPENCLAW_API_KEY=your_openclaw_key
OPENCLAW_URL=http://localhost:18789
CRON_SECRET=your_random_secret_here
KMS_KEY_ID=your_aws_kms_key_id
```

---

## 📊 Monitoring & Error Handling

### Create Dashboard for Registration Status

Create `src/app/dashboard/registrations/page.tsx`:

```typescript
export default function RegistrationsPage() {
  const { data: registrations } = useQuery(['registrations'], fetchRegistrations);
  
  return (
    <div>
      <h1>BMI Registrations</h1>
      <table>
        <thead>
          <tr>
            <th>Song Title</th>
            <th>Date Registered</th>
            <th>Confirmation #</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {registrations.map(reg => (
            <tr key={reg.id}>
              <td>{reg.title}</td>
              <td>{reg.registeredAt}</td>
              <td>{reg.confirmationNumber}</td>
              <td>
                <Badge variant={reg.status === 'success' ? 'success' : 'error'}>
                  {reg.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Error Notifications

If BMI registration fails, notify user:

```typescript
if (result.success === false) {
  await sendEmail({
    to: user.email,
    subject: '⚠️ BMI Registration Failed',
    body: `Failed to register "${result.title}" with BMI. Error: ${result.error}`,
  });
}
```

---

## 💰 Monetization

### Stripe Subscription ($20/year)

Create `src/app/api/stripe/checkout/route.ts`:

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      {
        price_data: {
          product_data: { name: 'ClaimRail Pro' },
          unit_amount: 2000, // $20
          recurring: { interval: 'year' },
        },
        quantity: 1,
      },
    ],
    success_url: `${req.headers.get('origin')}/dashboard?subscribed=true`,
    cancel_url: `${req.headers.get('origin')}/pricing`,
  });
  
  return NextResponse.json({ url: session.url });
}
```

---

## 🚀 Full Workflow Summary

```
User Signs Up ($20/year)
    ↓
Connects Spotify Account
    ↓
Enters BMI Credentials (encrypted vault)
    ↓
Weekly Cron Runs (every Monday)
    ↓
Scans Spotify for New Releases
    ↓
For Each New Song:
  - OpenCLAW logs into BMI
  - Fills work registration form
  - Submits
  - Gets confirmation number
    ↓
Logs to ClaimRail database
    ↓
Email to user: "✅ 3 songs registered"
    ↓
Royalties flow to user's BMI account
```

---

## 🎯 Next Steps

1. Install OpenCLAW locally
2. Create BMI registration skill
3. Test with your own BMI account
4. Integrate with ClaimRail
5. Add Stripe billing
6. Deploy to production

---

## 📚 Resources

- OpenCLAW Docs: https://github.com/SamurAIGPT/awesome-openclaw
- BMI Registration: https://www.bmi.com/register-work
- MCP SDK: https://github.com/modelcontextprotocol/sdk
- Stripe Subscriptions: https://stripe.com/docs/billing/subscriptions/build-subscription
