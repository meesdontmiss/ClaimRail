import { createHash } from 'node:crypto'
import { and, desc, eq, inArray, lt } from 'drizzle-orm'
import { decryptSecret } from '@/lib/crypto'
import { db } from '@/lib/db'
import {
  automationJobEvents,
  automationJobs,
  automationWorkerHeartbeats,
  bmiRegistrations,
  compositionWorks,
  recordings,
  workSplits,
  writers,
  type AutomationEventLevel,
  type AutomationJobStatus,
} from '@/lib/db/schema'

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

export interface WorkerExecutableJob {
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

interface FallbackWriterSeed {
  name: string
  pro?: string | null
  ipi?: string | null
}

function secretFingerprint(secret: string) {
  return createHash('sha256').update(secret).digest('hex').slice(0, 12)
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

async function buildWorkerJob(jobId: string): Promise<WorkerExecutableJob | null> {
  const job = await db.query.automationJobs.findFirst({
    where: eq(automationJobs.id, jobId),
    with: {
      user: true,
    },
  })

  if (!job || !job.user?.bmiCredentialsEncrypted || !isStoredBMICredentials(job.user.bmiCredentialsEncrypted)) {
    return null
  }

  return {
    id: job.id,
    type: job.type,
    recordingId: job.recordingId,
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

export async function completeBMIAutomationJob(
  jobId: string,
  workerId: string,
  result: {
    confirmationNumber: string
    workId?: string | null
    screenshotPath?: string | null
    metadata?: Record<string, unknown>
  }
) {
  const job = await db.query.automationJobs.findFirst({
    where: eq(automationJobs.id, jobId),
  })

  if (!job) {
    return { success: false, error: 'Job not found' }
  }

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
      .where(eq(automationJobs.id, jobId))

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

  await appendAutomationEvent(jobId, 'info', 'Job completed successfully', {
    workerId,
    confirmationNumber: result.confirmationNumber,
    ...(result.metadata ?? {}),
  })

  return { success: true }
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
