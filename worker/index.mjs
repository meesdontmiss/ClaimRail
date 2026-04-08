import { setTimeout as delay } from "node:timers/promises";
import { createHash } from "node:crypto";
import { executeBMIJob } from "./providers/bmi.mjs";

function resolveWorkerSecret() {
  if (process.env.AUTOMATION_WORKER_SECRET) {
    return {
      value: process.env.AUTOMATION_WORKER_SECRET,
      source: "AUTOMATION_WORKER_SECRET",
    };
  }

  if (process.env.CLAIMRAIL_ENCRYPTION_SECRET) {
    return {
      value: process.env.CLAIMRAIL_ENCRYPTION_SECRET,
      source: "CLAIMRAIL_ENCRYPTION_SECRET",
    };
  }

  if (process.env.NEXTAUTH_SECRET) {
    return {
      value: process.env.NEXTAUTH_SECRET,
      source: "NEXTAUTH_SECRET",
    };
  }

  return {
    value: "",
    source: null,
  };
}

function secretFingerprint(secret) {
  return createHash("sha256").update(secret).digest("hex").slice(0, 12);
}

const workerSecret = resolveWorkerSecret();

const env = {
  AUTOMATION_BASE_URL:
    process.env.AUTOMATION_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000",
  AUTOMATION_WORKER_SECRET: workerSecret.value,
  AUTOMATION_WORKER_SECRET_SOURCE: workerSecret.source,
  AUTOMATION_WORKER_SECRET_FINGERPRINT: workerSecret.value
    ? secretFingerprint(workerSecret.value)
    : null,
  AUTOMATION_WORKER_ID:
    process.env.AUTOMATION_WORKER_ID || `worker-${process.pid}`,
  AUTOMATION_POLL_INTERVAL_MS: Number(process.env.AUTOMATION_POLL_INTERVAL_MS || 5000),
  PLAYWRIGHT_HEADLESS: process.env.PLAYWRIGHT_HEADLESS || "true",
};

if (!env.AUTOMATION_WORKER_SECRET) {
  throw new Error("AUTOMATION_WORKER_SECRET (or fallback app secret) must be configured.");
}

console.log("[worker] auth config", {
  baseUrl: env.AUTOMATION_BASE_URL,
  workerId: env.AUTOMATION_WORKER_ID,
  secretSource: env.AUTOMATION_WORKER_SECRET_SOURCE,
  secretFingerprint: env.AUTOMATION_WORKER_SECRET_FINGERPRINT,
});

const once = process.argv.includes("--once");

function formatDebugContext(debug) {
  if (!debug || typeof debug !== "object") {
    return null;
  }

  const parts = [];

  if (debug.dbSummary && typeof debug.dbSummary === "object") {
    const { host, database, fingerprint } = debug.dbSummary;
    if (host) {
      parts.push(`dbHost=${host}`);
    }
    if (database) {
      parts.push(`dbName=${database}`);
    }
    if (fingerprint) {
      parts.push(`dbFingerprint=${fingerprint}`);
    }
  }

  if (debug.runtimeError && typeof debug.runtimeError === "object") {
    const { code, table, detail, hint } = debug.runtimeError;
    if (code) {
      parts.push(`code=${code}`);
    }
    if (table) {
      parts.push(`table=${table}`);
    }
    if (detail) {
      parts.push(`detail=${detail}`);
    }
    if (hint) {
      parts.push(`hint=${hint}`);
    }
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

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

  const raw = await response.text();
  let data = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { error: raw };
    }
  }

  if (!response.ok) {
    const baseMessage =
      data && typeof data === "object" && typeof data.error === "string"
        ? data.error
        : `Worker API request failed for ${pathname} (${response.status})`;
    const debugMessage =
      data && typeof data === "object" ? formatDebugContext(data.debug) : null;

    throw new Error(debugMessage ? `${baseMessage} [${debugMessage}]` : baseMessage);
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
    let worked = false;

    try {
      worked = await pollOnce();
    } catch (error) {
      console.error("[worker] poll cycle failed", error);
      if (once) {
        throw error;
      }
    }

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
