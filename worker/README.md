# ClaimRail Automation Worker

Run the worker alongside the Next.js app to process autonomous BMI registration jobs.

## Environment

- `AUTOMATION_BASE_URL` - ClaimRail app URL, defaults to `NEXT_PUBLIC_APP_URL` or `http://localhost:3000`
- `AUTOMATION_WORKER_SECRET` - dedicated shared secret for worker-only API routes
- `AUTOMATION_WORKER_ID` - optional worker identifier for job logs
- `AUTOMATION_POLL_INTERVAL_MS` - polling interval in milliseconds, defaults to `5000`
- `PLAYWRIGHT_HEADLESS` - set to `false` to watch the Playwright browser locally

`npm run worker:dev` and `npm run worker:once` both load `.env.local` automatically through `dotenv-cli`.

## Commands

```bash
npm run worker:dev
npm run worker:once
```
