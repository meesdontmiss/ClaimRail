import fs from "node:fs/promises";
import path from "node:path";

function resolveRole(role) {
  if (role === "publisher") return "Publisher";
  if (role === "composer") return "Composer";
  return "Writer";
}

async function runViaOpenClaw(job, env) {
  const response = await fetch(`${env.OPENCLAW_URL}/api/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(env.OPENCLAW_API_KEY
        ? { Authorization: `Bearer ${env.OPENCLAW_API_KEY}` }
        : {}),
    },
    body: JSON.stringify({
      skill: "bmi-work-registration",
      params: {
        ...job.payload,
        credentials: job.credentials,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenCLAW request failed: ${await response.text()}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || "OpenCLAW job failed");
  }

  return {
    confirmationNumber: result.confirmationNumber,
    workId: result.workId || null,
    screenshotPath: result.screenshot || null,
    metadata: {
      provider: "openclaw",
    },
  };
}

async function runViaPlaywright(job, env) {
  const { chromium } = await import("playwright");

  const browser = await chromium.launch({
    headless: env.PLAYWRIGHT_HEADLESS !== "false",
  });

  const page = await browser.newPage();

  try {
    await page.goto("https://www.bmi.com/login", { waitUntil: "networkidle" });
    await page.fill('input[name="username"]', job.credentials.username);
    await page.fill('input[name="password"]', job.credentials.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState("networkidle");

    await page.goto("https://www.bmi.com/register-work", { waitUntil: "networkidle" });
    await page.fill("#work-title", job.payload.workTitle);

    if (job.payload.isrc) {
      await page.fill("#isrc-code", job.payload.isrc);
    }

    for (const writer of job.payload.writers) {
      const addWriterButton = page.locator("button.add-writer");
      if (await addWriterButton.count()) {
        await addWriterButton.first().click();
        await page.waitForTimeout(300);
      }

      await page.locator(".writer-name-input").last().fill(writer.name);
      if (writer.ipi) {
        await page.locator(".writer-ipi-input").last().fill(writer.ipi);
      }
      if (writer.pro) {
        await page.locator(".writer-pro-select").last().selectOption(writer.pro);
      }
      await page.locator(".writer-share-input").last().fill(String(writer.share));
      await page.locator(".writer-role-select").last().selectOption(resolveRole(writer.role));
    }

    await page.click('button[type="submit"]');
    await page.waitForSelector(".confirmation-message", { timeout: 15000 });

    const confirmationNumber = (await page.locator(".confirmation-number").textContent())?.trim();
    const workId = (await page.locator(".work-id").textContent())?.trim() || null;

    if (!confirmationNumber) {
      throw new Error("BMI confirmation number was not found.");
    }

    const artifactsDir = path.resolve(process.cwd(), "worker-artifacts");
    await fs.mkdir(artifactsDir, { recursive: true });
    const screenshotPath = path.join(artifactsDir, `${job.id}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    return {
      confirmationNumber,
      workId,
      screenshotPath,
      metadata: {
        provider: "playwright",
      },
    };
  } finally {
    await browser.close();
  }
}

export async function executeBMIJob(job, env) {
  if (env.OPENCLAW_URL) {
    return runViaOpenClaw(job, env);
  }

  return runViaPlaywright(job, env);
}
