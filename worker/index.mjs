import { setTimeout as delay } from "node:timers/promises";
import { executeBMIJob } from "./providers/bmi.mjs";

const env = {
  AUTOMATION_BASE_URL:
    process.env.AUTOMATION_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000",
  AUTOMATION_WORKER_SECRET:
    process.env.AUTOMATION_WORKER_SECRET ||
    process.env.CLAIMRAIL_ENCRYPTION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "",
  AUTOMATION_WORKER_ID:
    process.env.AUTOMATION_WORKER_ID || `worker-${process.pid}`,
  AUTOMATION_POLL_INTERVAL_MS: Number(process.env.AUTOMATION_POLL_INTERVAL_MS || 5000),
  PLAYWRIGHT_HEADLESS: process.env.PLAYWRIGHT_HEADLESS || "true",
};

if (!env.AUTOMATION_WORKER_SECRET) {
  throw new Error("AUTOMATION_WORKER_SECRET (or fallback app secret) must be configured.");
}

const once = process.argv.includes("--once");

async function apiFetch(pathname, body) {
  const response = await fetch(`${env.AUTOMATION_BASE_URL}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-claimrail-worker-secret": env.AUTOMATION_WORKER_SECRET,
    },
    body: JSON.stringify({
      workerId: env.AUTOMATION_WORKER_ID,
      ...(body || {}),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Worker API request failed for ${pathname}`);
  }

  return data;
}

async function pingWorker(metadata) {
  try {
    await apiFetch("/api/automation/worker/ping", {
      metadata,
    });
  } catch (error) {
    console.error("[worker] ping failed", error);
  }
}

async function pollOnce() {
  await pingWorker({ stage: "polling", once });
  const claim = await apiFetch("/api/automation/worker/claim");
  if (!claim.job) {
    return false;
  }

  const job = claim.job;
  await apiFetch(`/api/automation/worker/${job.id}/heartbeat`, {
    metadata: { stage: "starting" },
  });

  try {
    let result;

    switch (job.type) {
      case "bmi_registration":
        result = await executeBMIJob(job, env);
        break;
      default:
        throw new Error(`Unsupported job type: ${job.type}`);
    }

    await apiFetch(`/api/automation/worker/${job.id}/complete`, result);
    console.log(`[worker] completed ${job.id}`);
  } catch (error) {
    await apiFetch(`/api/automation/worker/${job.id}/fail`, {
      error: error instanceof Error ? error.message : "Unknown worker error",
      metadata: {
        stage: "execution",
      },
    });
    console.error(`[worker] failed ${job.id}:`, error);
  }

  return true;
}

async function main() {
  do {
    const worked = await pollOnce();
    if (once) {
      break;
    }
    if (!worked) {
      await delay(env.AUTOMATION_POLL_INTERVAL_MS);
    }
  } while (!once);
}

main().catch((error) => {
  console.error("[worker] fatal error", error);
  process.exitCode = 1;
});
