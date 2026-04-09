import fs from "node:fs/promises";
import path from "node:path";

const BMI_LOGIN_URL = "https://www.bmi.com/login";
const BMI_REGISTER_URL = "https://www.bmi.com/register-work";
const BMI_REPERTOIRE_SEARCH_URL = "https://repertoire.bmi.com/main/search";

function resolveRole(role) {
  if (role === "publisher") return "Publisher";
  if (role === "composer") return "Composer";
  return "Writer";
}

function normalizeText(value) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function primaryArtistName(value) {
  return (value || "")
    .split(/(?:\s+feat\.?\s+|\s+featuring\s+|\s+with\s+)/i)[0]
    .trim();
}

function pickSearchTitle(seed) {
  return seed.compositionTitle || seed.title;
}

function buildSearchStrategies(seed) {
  const title = pickSearchTitle(seed);
  const strategies = [];

  if (seed.iswc) {
    strategies.push({
      label: "iswc",
      mainSearch: "ISWC",
      mainSearchText: seed.iswc,
    });
  }

  if (title) {
    const artist = primaryArtistName(seed.artist);

    if (artist) {
      strategies.push({
        label: "title+performer",
        mainSearch: "Title",
        mainSearchText: title,
        subSearch: "Performer",
        subSearchText: artist,
      });
    }

    const firstWriter = seed.writers?.find((writer) => writer.name)?.name;
    if (firstWriter) {
      strategies.push({
        label: "title+writer",
        mainSearch: "Title",
        mainSearchText: title,
        subSearch: "Writer/Composer",
        subSearchText: firstWriter,
      });
    }
  }

  return strategies;
}

function mergeWorks(existing, incoming) {
  if (!existing) {
    return incoming;
  }

  return {
    ...existing,
    bmiWorkId: existing.bmiWorkId || incoming.bmiWorkId || null,
    iswc: existing.iswc || incoming.iswc || null,
    performer: existing.performer || incoming.performer || null,
    status: existing.status || incoming.status || null,
    writers:
      existing.writers?.length > 0
        ? existing.writers
        : incoming.writers,
    rawPayload: {
      ...(existing.rawPayload || {}),
      ...(incoming.rawPayload || {}),
      strategies: [
        ...new Set([
          ...((existing.rawPayload && existing.rawPayload.strategies) || []),
          ...((incoming.rawPayload && incoming.rawPayload.strategies) || []),
        ]),
      ],
    },
  };
}

async function runRegistrationViaPlaywright(job, env) {
  const { chromium } = await import("playwright");

  const browser = await chromium.launch({
    headless: env.PLAYWRIGHT_HEADLESS !== "false",
  });

  const page = await browser.newPage();

  try {
    await page.goto(BMI_LOGIN_URL, { waitUntil: "networkidle" });
    await page.fill('input[name="username"]', job.credentials.username);
    await page.fill('input[name="password"]', job.credentials.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState("networkidle");

    await page.goto(BMI_REGISTER_URL, { waitUntil: "networkidle" });
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

async function createRepertoireContext(env) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: env.PLAYWRIGHT_HEADLESS !== "false",
  });
  const context = await browser.newContext();
  await context.addCookies([
    {
      name: "disc",
      value: new Date().toISOString(),
      domain: "repertoire.bmi.com",
      path: "/",
      expires: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
    },
  ]);

  return { browser, context };
}

async function ensureSearchPage(page) {
  await page.goto(BMI_REPERTOIRE_SEARCH_URL, { waitUntil: "networkidle" });

  if (page.url().includes("/Main/Disclaimer")) {
    const acceptButton = page.locator("#btnAccept");
    if (await acceptButton.count()) {
      await acceptButton.click();
      await page.waitForLoadState("networkidle");
    }
  }
}

async function parseBMIRepertoireResults(page) {
  return page.evaluate(() => {
    const text = (value) => (value || "").replace(/\s+/g, " ").trim();

    const resultsFound = text(document.querySelector(".results-font")?.textContent);
    const resultLists = [...document.querySelectorAll(".result-list")];

    const works = resultLists.map((list) => {
      const openerCells = [...list.querySelectorAll(".opener td")].map((cell) => text(cell.textContent));
      const detailTables = [...list.querySelectorAll(".details-slide table")].map((table) =>
        [...table.querySelectorAll("tr")].map((row) =>
          [...row.querySelectorAll("th,td")]
            .map((cell) => text(cell.textContent))
            .filter(Boolean)
        ).filter((row) => row.length > 0)
      );

      const writerTable = detailTables.find(
        (rows) => rows[0]?.[0]?.toLowerCase() === "writers / composers"
      );
      const rightsTable = detailTables.find(
        (rows) => rows[0]?.[0]?.toLowerCase() === "total % controlled"
      );
      const iswcTable = detailTables.find((rows) => rows[0]?.[0]?.toLowerCase() === "iswc");

      const writerRows = (writerTable || []).slice(1);
      const performerBlock = [...list.querySelectorAll(".details-content-block-03")]
        .map((block) => text(block.textContent))
        .find((block) => block.toLowerCase().startsWith("performers"));

      return {
        title: openerCells[0] || null,
        bmiWorkId: openerCells[1] || null,
        performer: performerBlock
          ? performerBlock.replace(/^performers/i, "").trim() || null
          : openerCells[4]?.replace(/^performer/i, "").trim() || null,
        iswc: iswcTable?.[1]?.[0] || null,
        writers: writerRows.map((row) => ({
          name: row[0] || "",
          ipi: row[2] || null,
          role: "writer",
        })),
        status: list.querySelector(".icon-checkmark-outline") ? "reconciled" : null,
        rawPayload: {
          resultsFound,
          rights: rightsTable || [],
        },
      };
    }).filter((work) => work.title);

    return {
      resultsFound,
      works,
    };
  });
}

async function runBMIRepertoireSearch(page, strategy) {
  await ensureSearchPage(page);

  await page.selectOption("#selectMainSearch", strategy.mainSearch);
  await page.locator("#Main_Search_Text").fill("");
  await page.locator("#Main_Search_Text").fill(strategy.mainSearchText);

  if (strategy.subSearch && strategy.subSearchText) {
    await page.selectOption("#selectSubSearch", strategy.subSearch);
    await page.locator("#Sub_Search_Text").fill("");
    await page.locator("#Sub_Search_Text").fill(strategy.subSearchText);
  } else {
    await page.selectOption("#selectSubSearch", "Please Select");
    const subSearchInput = page.locator("#Sub_Search_Text");
    if (await subSearchInput.count()) {
      await subSearchInput.fill("");
    }
  }

  await page.locator("#Search_Type_BMI").check({ force: true });
  await page.click("#btnSearch");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);

  if (page.url().includes("/Main/Disclaimer")) {
    const acceptButton = page.locator("#btnAccept");
    if (await acceptButton.count()) {
      await acceptButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
    }
  }

  const parsed = await parseBMIRepertoireResults(page);
  if (!parsed.resultsFound) {
    throw new Error("BMI repertoire search page did not render a result count.");
  }

  return parsed.works;
}

async function executeBMICatalogSyncJob(job, env) {
  const { browser, context } = await createRepertoireContext(env);
  const page = await context.newPage();

  try {
    const worksByKey = new Map();
    const searchLog = [];

    for (const seed of job.payload.searchSeeds || []) {
      const strategies = buildSearchStrategies(seed);
      let foundForSeed = false;

      for (const strategy of strategies) {
        const results = await runBMIRepertoireSearch(page, strategy);
        searchLog.push({
          recordingId: seed.recordingId,
          strategy: strategy.label,
          hits: results.length,
        });

        for (const work of results) {
          const titleMatches =
            normalizeText(work.title) === normalizeText(pickSearchTitle(seed)) ||
            normalizeText(work.title) === normalizeText(seed.title);
          if (!titleMatches && strategy.label !== "iswc") {
            continue;
          }

          const key = work.bmiWorkId || `${normalizeText(work.title)}::${normalizeText(work.performer)}`;
          worksByKey.set(
            key,
            mergeWorks(worksByKey.get(key), {
              ...work,
              source: "bmi_repertoire_public",
              rawPayload: {
                ...(work.rawPayload || {}),
                recordingId: seed.recordingId,
                strategies: [strategy.label],
              },
            })
          );
          foundForSeed = true;
        }

        if (foundForSeed) {
          break;
        }
      }
    }

    const artifactsDir = path.resolve(process.cwd(), "worker-artifacts");
    await fs.mkdir(artifactsDir, { recursive: true });
    const screenshotPath = path.join(artifactsDir, `${job.id}-bmi-sync.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    return {
      syncedCount: worksByKey.size,
      works: [...worksByKey.values()],
      screenshotPath,
      catalogUrl: page.url(),
      metadata: {
        provider: "bmi_repertoire_public",
        searchLog,
      },
    };
  } finally {
    await browser.close();
  }
}

export async function executeBMIRegistrationJob(job, env) {
  return runRegistrationViaPlaywright(job, env);
}

export async function executeBMICatalogSyncJobForWorker(job, env) {
  return executeBMICatalogSyncJob(job, env);
}
