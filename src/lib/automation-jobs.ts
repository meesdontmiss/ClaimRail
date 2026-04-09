import { createHash } from 'node:crypto'
import { and, desc, eq, inArray, lt } from 'drizzle-orm'
import { decryptSecret } from '@/lib/crypto'
import { db } from '@/lib/db'
import {
  automationJobEvents,
  automationJobs,
  automationWorkerHeartbeats,
  bmiCatalogMatches,
  bmiCatalogWorks,
  bmiRegistrations,
  compositionWorks,
  recordings,
  users,
  workSplits,
  writers,
  type AutomationEventLevel,
  type AutomationJob,
  type AutomationJobStatus,
} from '@/lib/db/schema'
import { buildExternalWorkKey, matchRecordingsToBMIWorks, type SyncedBMIWork } from '@/lib/bmi/matching'

type StoredEncryptedSecret = {
  iv: string
  content: string
  tag: string
}

type StoredBMICredentials = {
  username: StoredEncryptedSecret
  password: StoredEncryptedSecret
}

function isStoredBMICredentials(value: unknown): value is StoredBMICredentials {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<StoredBMICredentials>
  return Boolean(
    candidate.username &&
    typeof candidate.username === 'object' &&
    candidate.password &&
    typeof candidate.password === 'object'
  )
}

export interface BMIAutomationPayload {
  workTitle: string
  isrc: string | null
  writers: Array<{
    name: string
    ipi: string | null
    pro: string | null
    share: number
    role: string | null
  }>
}

export interface BMICatalogSyncPayload {
  artistHint: string | null
  searchSeeds: Array<{
    recordingId: string
    title: string
    artist: string
    compositionTitle: string | null
    iswc: string | null
    writers: Array<{
      name: string
      ipi: string | null
    }>
  }>
}

export interface BMICatalogSyncResult {
  syncedCount: number
  works: SyncedBMIWork[]
  screenshotPath?: string | null
  catalogUrl?: string | null
  metadata?: Record<string, unknown>
}

interface BMIRegistrationWorkerJob {
  id: string
  type: 'bmi_registration'
  recordingId: string
  compositionWorkId: string | null
  userId: string
  attempts: number
  maxAttempts: number
  payload: BMIAutomationPayload
  credentials: {
    username: string
    password: string
  }
}

interface BMICatalogSyncWorkerJob {
  id: string
  type: 'bmi_catalog_sync'
  recordingId: null
  compositionWorkId: null
  userId: string
  attempts: number
  maxAttempts: number
  payload: BMICatalogSyncPayload
}

export type WorkerExecutableJob = BMIRegistrationWorkerJob | BMICatalogSyncWorkerJob

interface FallbackWriterSeed {
  name: string
  pro?: string | null
  ipi?: string | null
}

function secretFingerprint(secret: string) {
  return createHash('sha256').update(secret).digest('hex').slice(0, 12)
}

function normalizeCatalogTitle(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getAutomationWorkerSecretConfig() {
  const explicitSecret = process.env.AUTOMATION_WORKER_SECRET?.trim()
  if (explicitSecret) {
    return {
      secret: explicitSecret,
      source: 'AUTOMATION_WORKER_SECRET',
      fingerprint: secretFingerprint(explicitSecret),
    }
  }

  const encryptionSecret = process.env.CLAIMRAIL_ENCRYPTION_SECRET?.trim()
  if (encryptionSecret) {
    return {
      secret: encryptionSecret,
      source: 'CLAIMRAIL_ENCRYPTION_SECRET',
      fingerprint: secretFingerprint(encryptionSecret),
    }
  }

  const nextAuthSecret = process.env.NEXTAUTH_SECRET?.trim()
  if (nextAuthSecret) {
    return {
      secret: nextAuthSecret,
      source: 'NEXTAUTH_SECRET',
      fingerprint: secretFingerprint(nextAuthSecret),
    }
  }

  return {
    secret: '',
    source: null,
    fingerprint: null,
  }
}

export function isAutomationWorkerAuthorized(request: Request) {
  const config = getAutomationWorkerSecretConfig()
  const secret = config.secret

  if (!secret) {
    console.error('Automation worker auth rejected: no app-side worker secret is configured')
    return false
  }

  const provided =
    request.headers.get('x-claimrail-worker-secret') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    ''

  const authorized = provided === secret

  if (!authorized) {
    console.error('Automation worker auth rejected', {
      expectedSource: config.source,
      expectedFingerprint: config.fingerprint,
      providedFingerprint: provided ? secretFingerprint(provided) : null,
    })
  }

  return authorized
}

export async function appendAutomationEvent(
  jobId: string,
  level: AutomationEventLevel,
  message: string,
  metadata?: Record<string, unknown>
) {
  await db.insert(automationJobEvents).values({
    jobId,
    level,
    message,
    metadata: metadata ?? null,
  })
}

export async function recordAutomationWorkerPing(
  workerId: string,
  metadata?: Record<string, unknown>
) {
  const existing = await db.query.automationWorkerHeartbeats.findFirst({
    where: eq(automationWorkerHeartbeats.workerId, workerId),
  })

  if (existing) {
    await db.update(automationWorkerHeartbeats)
      .set({
        lastSeenAt: new Date(),
        metadata: metadata ?? null,
      })
      .where(eq(automationWorkerHeartbeats.id, existing.id))

    return
  }

  await db.insert(automationWorkerHeartbeats).values({
    workerId,
    metadata: metadata ?? null,
  })
}

export async function getLatestAutomationWorkerHeartbeat() {
  return db.query.automationWorkerHeartbeats.findFirst({
    orderBy: [desc(automationWorkerHeartbeats.lastSeenAt)],
  })
}

function mapWriterRole(role: string | null | undefined) {
  if (role === 'publisher') {
    return 'publisher'
  }

  if (role === 'composer' || role === 'arranger') {
    return 'composer'
  }

  return 'writer'
}

export async function enqueueBMIRegistrationJob(
  recordingId: string,
  userId: string,
  fallbackWriter?: FallbackWriterSeed
) {
  return db.transaction(async (tx) => {
    const recording = await tx.query.recordings.findFirst({
      where: and(eq(recordings.id, recordingId), eq(recordings.userId, userId)),
      with: {
        compositionWork: {
          with: {
            writers: {
              with: {
                splits: true,
              },
            },
          },
        },
        user: true,
      },
    })

    if (!recording) {
      return { success: false, error: 'Recording not found' }
    }

    if (!recording.user?.bmiCredentialsEncrypted || !isStoredBMICredentials(recording.user.bmiCredentialsEncrypted)) {
      return { success: false, error: 'BMI credentials are required before queueing automation jobs' }
    }

    const existingJob = await tx.query.automationJobs.findFirst({
      where: and(
        eq(automationJobs.recordingId, recordingId),
        eq(automationJobs.type, 'bmi_registration'),
        inArray(automationJobs.status, ['queued', 'claimed', 'running'])
      ),
    })

    if (existingJob) {
      return { success: true, jobId: existingJob.id, alreadyQueued: true }
    }

    let compositionWork: typeof recording.compositionWork | null = recording.compositionWork

    if (!compositionWork) {
      if (!fallbackWriter?.name) {
        return { success: false, error: 'Recording is missing composition data and no fallback writer info was provided' }
      }

      const [newCompositionWork] = await tx.insert(compositionWorks).values({
        recordingId: recording.id,
        title: recording.title,
        proRegistered: false,
        adminRegistered: false,
      }).returning()

      const [newWriter] = await tx.insert(writers).values({
        compositionWorkId: newCompositionWork.id,
        name: fallbackWriter.name,
        pro: fallbackWriter.pro ?? null,
        ipi: fallbackWriter.ipi ?? null,
        role: 'composer_lyricist',
      }).returning()

      await tx.insert(workSplits).values({
        writerId: newWriter.id,
        percentage: 100,
      })

      const reloadedCompositionWork = await tx.query.compositionWorks.findFirst({
        where: eq(compositionWorks.id, newCompositionWork.id),
        with: {
          writers: {
            with: {
              splits: true,
            },
          },
        },
      })

      compositionWork = reloadedCompositionWork ?? null
    }

    if (!compositionWork || compositionWork.writers.length === 0) {
      return { success: false, error: 'Composition writers are required before queueing automation jobs' }
    }

    const payload: BMIAutomationPayload = {
      workTitle: compositionWork.title,
      isrc: recording.isrc ?? null,
      writers: compositionWork.writers.map((writer) => ({
        name: writer.name,
        ipi: writer.ipi ?? null,
        pro: writer.pro ?? null,
        share: writer.splits[0]?.percentage ?? 0,
        role: mapWriterRole(writer.role),
      })),
    }

    const [job] = await tx.insert(automationJobs).values({
      userId,
      recordingId,
      compositionWorkId: compositionWork.id,
      type: 'bmi_registration',
      status: 'queued',
      payload,
    }).returning()

    await tx.insert(automationJobEvents).values({
      jobId: job.id,
      level: 'info',
      message: 'Job queued for autonomous BMI registration',
      metadata: {
        recordingId,
        workTitle: payload.workTitle,
      },
    })

    return { success: true, jobId: job.id, alreadyQueued: false }
  })
}

export async function enqueueBMICatalogSyncJob(userId: string) {
  return db.transaction(async (tx) => {
    const user = await tx.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!user) {
      return { success: false, error: 'User not found' }
    }

    const userRecordings = await tx.query.recordings.findMany({
      where: and(eq(recordings.userId, userId), eq(recordings.ownershipStatus, 'owned')),
      with: {
        compositionWork: {
          with: {
            writers: true,
          },
        },
      },
    })

    if (userRecordings.length === 0) {
      return { success: false, error: 'Import at least one owned release before running a BMI sync' }
    }

    const existingJob = await tx.query.automationJobs.findFirst({
      where: and(
        eq(automationJobs.userId, userId),
        eq(automationJobs.type, 'bmi_catalog_sync'),
        inArray(automationJobs.status, ['queued', 'claimed', 'running'])
      ),
    })

    if (existingJob) {
      return { success: true, jobId: existingJob.id, alreadyQueued: true }
    }

    const [job] = await tx.insert(automationJobs).values({
      userId,
      recordingId: null,
      compositionWorkId: null,
      type: 'bmi_catalog_sync',
      status: 'queued',
      priority: 10,
      payload: {
        artistHint: user.name ?? user.email ?? null,
        searchSeeds: userRecordings.map((recording) => ({
          recordingId: recording.id,
          title: recording.title,
          artist: recording.artist,
          compositionTitle: recording.compositionWork?.title ?? null,
          iswc: recording.compositionWork?.iswc ?? null,
          writers: (recording.compositionWork?.writers ?? []).map((writer) => ({
            name: writer.name,
            ipi: writer.ipi ?? null,
          })),
        })),
      } satisfies BMICatalogSyncPayload,
    }).returning()

    await tx.insert(automationJobEvents).values({
      jobId: job.id,
      level: 'info',
      message: 'Job queued for BMI catalog sync',
      metadata: {
        userId,
        searchSeedCount: userRecordings.length,
      },
    })

    return { success: true, jobId: job.id, alreadyQueued: false }
  })
}

async function buildWorkerJob(jobId: string): Promise<WorkerExecutableJob | null> {
  const job = await db.query.automationJobs.findFirst({
    where: eq(automationJobs.id, jobId),
    with: {
      user: true,
    },
  })

  if (!job) {
    return null
  }

  if (job.type === 'bmi_catalog_sync') {
    return {
      id: job.id,
      type: 'bmi_catalog_sync',
      recordingId: null,
      compositionWorkId: null,
      userId: job.userId,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      payload: job.payload as BMICatalogSyncPayload,
    }
  }

  if (!job.user?.bmiCredentialsEncrypted || !isStoredBMICredentials(job.user.bmiCredentialsEncrypted)) {
    return null
  }

  return {
    id: job.id,
    type: 'bmi_registration',
    recordingId: job.recordingId as string,
    compositionWorkId: job.compositionWorkId,
    userId: job.userId,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    payload: job.payload as BMIAutomationPayload,
    credentials: {
      username: decryptSecret(job.user.bmiCredentialsEncrypted.username),
      password: decryptSecret(job.user.bmiCredentialsEncrypted.password),
    },
  }
}

export async function claimNextAutomationJob(workerId: string) {
  // Use a transaction to prevent race conditions
  const claimedJob = await db.transaction(async (tx) => {
    // Find the next job atomically
    const nextJob = await tx.query.automationJobs.findFirst({
      where: and(
        eq(automationJobs.status, 'queued'),
        lt(automationJobs.attempts, automationJobs.maxAttempts)
      ),
      orderBy: (table, operators) => [operators.asc(table.priority), operators.asc(table.createdAt)],
    })

    if (!nextJob) {
      return null
    }

    // Atomically claim the job
    const [claimed] = await tx.update(automationJobs)
      .set({
        status: 'claimed',
        workerId,
        workerClaimedAt: new Date(),
        attempts: nextJob.attempts + 1,
        updatedAt: new Date(),
      })
      .where(and(
        eq(automationJobs.id, nextJob.id),
        eq(automationJobs.status, 'queued') // Ensure still queued
      ))
      .returning({ id: automationJobs.id })

    if (!claimed) {
      // Another worker claimed it first
      return null
    }

    await appendAutomationEvent(nextJob.id, 'info', 'Worker claimed job', { workerId })

    return nextJob.id
  })

  if (!claimedJob) {
    return null
  }

  return buildWorkerJob(claimedJob)
}

export async function markAutomationJobRunning(jobId: string, workerId: string, metadata?: Record<string, unknown>) {
  await db.update(automationJobs)
    .set({
      status: 'running',
      workerId,
      updatedAt: new Date(),
    })
    .where(eq(automationJobs.id, jobId))

  await appendAutomationEvent(jobId, 'info', 'Worker heartbeat', {
    workerId,
    ...(metadata ?? {}),
  })
}

function isBMIRegistrationCompletionResult(
  value: unknown
): value is {
  confirmationNumber: string
  workId?: string | null
  screenshotPath?: string | null
  metadata?: Record<string, unknown>
} {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof (value as { confirmationNumber?: unknown }).confirmationNumber === 'string'
  )
}

function isBMICatalogSyncCompletionResult(value: unknown): value is BMICatalogSyncResult {
  return Boolean(
    value &&
    typeof value === 'object' &&
    typeof (value as { syncedCount?: unknown }).syncedCount === 'number' &&
    Array.isArray((value as { works?: unknown }).works)
  )
}

async function completeBMIRegistrationJob(
  job: AutomationJob,
  workerId: string,
  result: {
    confirmationNumber: string
    workId?: string | null
    screenshotPath?: string | null
    metadata?: Record<string, unknown>
  }
) {
  await db.transaction(async (tx) => {
    await tx.update(automationJobs)
      .set({
        status: 'completed',
        workerId,
        result,
        completedAt: new Date(),
        updatedAt: new Date(),
        lastError: null,
      })
      .where(eq(automationJobs.id, job.id))

    if (job.compositionWorkId) {
      await tx.update(compositionWorks)
        .set({
          pro: 'BMI',
          proRegistered: true,
          iswc: result.workId ?? undefined,
        })
        .where(eq(compositionWorks.id, job.compositionWorkId))

      await tx.insert(bmiRegistrations).values({
        compositionWorkId: job.compositionWorkId,
        confirmationNumber: result.confirmationNumber,
        status: 'success',
        screenshotPath: result.screenshotPath ?? null,
      })
    }
  })

  await appendAutomationEvent(job.id, 'info', 'Job completed successfully', {
    workerId,
    confirmationNumber: result.confirmationNumber,
    ...(result.metadata ?? {}),
  })

  return { success: true }
}

async function completeBMICatalogSyncJob(
  job: AutomationJob,
  workerId: string,
  result: BMICatalogSyncResult
) {
  const syncedWorks = result.works.map((work) => ({
    ...work,
    externalWorkKey: buildExternalWorkKey(work),
  }))

  const userRecordings = await db.query.recordings.findMany({
    where: and(eq(recordings.userId, job.userId), eq(recordings.ownershipStatus, 'owned')),
    with: {
      compositionWork: {
        with: {
          writers: true,
        },
      },
    },
  })

  const matches = matchRecordingsToBMIWorks(
    userRecordings.map((recording) => ({
      id: recording.id,
      title: recording.title,
      artist: recording.artist,
      compositionWork: recording.compositionWork
        ? {
            id: recording.compositionWork.id,
            title: recording.compositionWork.title,
            iswc: recording.compositionWork.iswc ?? null,
            writers: recording.compositionWork.writers.map((writer) => ({
              name: writer.name,
              ipi: writer.ipi ?? null,
            })),
          }
        : null,
    })),
    syncedWorks
  )

  await db.transaction(async (tx) => {
    await tx.update(automationJobs)
      .set({
        status: 'completed',
        workerId,
        result: {
          ...result,
          metadata: {
            ...(result.metadata ?? {}),
            matchedCount: matches.length,
            searchSeedCount: userRecordings.length,
          },
        },
        completedAt: new Date(),
        updatedAt: new Date(),
        lastError: null,
      })
      .where(eq(automationJobs.id, job.id))

    await tx.delete(bmiCatalogMatches).where(eq(bmiCatalogMatches.userId, job.userId))
    await tx.delete(bmiCatalogWorks).where(eq(bmiCatalogWorks.userId, job.userId))

    const insertedWorks = syncedWorks.length > 0
      ? await tx.insert(bmiCatalogWorks).values(
          syncedWorks.map((work) => ({
            userId: job.userId,
            externalWorkKey: work.externalWorkKey,
            bmiWorkId: work.bmiWorkId ?? null,
            title: work.title,
            normalizedTitle: normalizeCatalogTitle(work.title),
            iswc: work.iswc ?? null,
            writerSummary: work.writers.map((writer) => writer.name).filter(Boolean).join(', ') || null,
            source: work.source ?? 'bmi_repertoire_public',
            status: work.status ?? null,
            rawPayload: work.rawPayload ?? null,
          }))
        ).returning({
          id: bmiCatalogWorks.id,
          externalWorkKey: bmiCatalogWorks.externalWorkKey,
        })
      : []

    const catalogWorkIds = new Map(
      insertedWorks.map((work) => [work.externalWorkKey, work.id])
    )

    if (matches.length > 0) {
      await tx.insert(bmiCatalogMatches).values(
        matches
          .map((match) => {
            const bmiCatalogWorkId = catalogWorkIds.get(match.externalWorkKey)
            if (!bmiCatalogWorkId) {
              return null
            }

            return {
              userId: job.userId,
              recordingId: match.recordingId,
              compositionWorkId: match.compositionWorkId,
              bmiCatalogWorkId,
              matchStrategy: match.matchStrategy,
              confidence: match.confidence,
              notes: match.notes,
              verified: true,
            }
          })
          .filter((value): value is NonNullable<typeof value> => Boolean(value))
      )
    }
  })

  await appendAutomationEvent(job.id, 'info', 'BMI catalog sync completed', {
    workerId,
    syncedCount: syncedWorks.length,
    matchedCount: matches.length,
    ...(result.metadata ?? {}),
  })

  return {
    success: true,
    syncedCount: syncedWorks.length,
    matchedCount: matches.length,
  }
}

export async function completeAutomationJob(
  jobId: string,
  workerId: string,
  result: unknown
) {
  const job = await db.query.automationJobs.findFirst({
    where: eq(automationJobs.id, jobId),
  })

  if (!job) {
    return { success: false, error: 'Job not found' }
  }

  if (job.type === 'bmi_catalog_sync') {
    if (!isBMICatalogSyncCompletionResult(result)) {
      return { success: false, error: 'Invalid BMI catalog sync completion payload' }
    }

    return completeBMICatalogSyncJob(job, workerId, result)
  }

  if (!isBMIRegistrationCompletionResult(result)) {
    return { success: false, error: 'Invalid BMI registration completion payload' }
  }

  return completeBMIRegistrationJob(job, workerId, result)
}

export async function failAutomationJob(
  jobId: string,
  workerId: string,
  errorMessage: string,
  metadata?: Record<string, unknown>
) {
  const job = await db.query.automationJobs.findFirst({
    where: eq(automationJobs.id, jobId),
  })

  if (!job) {
    return { success: false, error: 'Job not found' }
  }

  const nextStatus: AutomationJobStatus =
    job.attempts >= job.maxAttempts ? 'needs_human' : 'queued'

  await db.update(automationJobs)
    .set({
      status: nextStatus,
      workerId,
      lastError: errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(automationJobs.id, jobId))

  await appendAutomationEvent(
    jobId,
    nextStatus === 'needs_human' ? 'error' : 'warning',
    nextStatus === 'needs_human'
      ? 'Job moved to needs_human after max attempts'
      : 'Job failed and was re-queued',
    {
      workerId,
      errorMessage,
      ...(metadata ?? {}),
    }
  )

  return { success: true, status: nextStatus }
}

export async function listAutomationJobsForUser(userId: string) {
  return db.query.automationJobs.findMany({
    where: eq(automationJobs.userId, userId),
    with: {
      recording: true,
      events: true,
    },
    orderBy: (table, operators) => [operators.desc(table.createdAt)],
  })
}

export async function requeueAutomationJobForUser(jobId: string, userId: string) {
  const job = await db.query.automationJobs.findFirst({
    where: and(eq(automationJobs.id, jobId), eq(automationJobs.userId, userId)),
  })

  if (!job) {
    return { success: false, error: 'Job not found' }
  }

  if (!['failed', 'needs_human', 'cancelled'].includes(job.status)) {
    return { success: false, error: 'Only failed, needs_human, or cancelled jobs can be re-queued' }
  }

  await db.update(automationJobs)
    .set({
      status: 'queued',
      workerId: null,
      workerClaimedAt: null,
      completedAt: null,
      result: null,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(automationJobs.id, jobId))

  await appendAutomationEvent(jobId, 'info', 'Job re-queued by user', { userId })

  return { success: true }
}

export async function cancelAutomationJobForUser(jobId: string, userId: string) {
  const job = await db.query.automationJobs.findFirst({
    where: and(eq(automationJobs.id, jobId), eq(automationJobs.userId, userId)),
  })

  if (!job) {
    return { success: false, error: 'Job not found' }
  }

  if (!['queued', 'claimed', 'running', 'needs_human'].includes(job.status)) {
    return { success: false, error: 'Only queued, claimed, running, or needs_human jobs can be cancelled' }
  }

  await db.update(automationJobs)
    .set({
      status: 'cancelled',
      updatedAt: new Date(),
    })
    .where(eq(automationJobs.id, jobId))

  await appendAutomationEvent(jobId, 'warning', 'Job cancelled by user', { userId })

  return { success: true }
}
