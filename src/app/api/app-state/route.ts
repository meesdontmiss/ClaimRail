import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { db } from '@/lib/db'
import { automationJobs, recordings } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { computeStats } from '@/lib/mock-data'
import { toAppRecording, toAppTasks } from '@/lib/catalog-state'
import { getDatabaseRuntimeSummary, serializeRuntimeError } from '@/lib/runtime-diagnostics'

export async function GET() {
  try {
    const user = await requireUser()

    const userRecordings = await db.query.recordings.findMany({
      where: eq(recordings.userId, user.id),
      with: {
        compositionWork: {
          with: {
            bmiRegistrations: true,
            writers: {
              with: {
                splits: true,
              },
            },
          },
        },
        automationJobs: true,
        bmiCatalogMatches: {
          with: {
            bmiCatalogWork: true,
          },
        },
        catalogIssues: true,
        claimTasks: true,
      },
      orderBy: (table, operators) => [operators.desc(table.createdAt)],
    })

    const latestBMISyncJob = await db.query.automationJobs.findFirst({
      where: and(eq(automationJobs.userId, user.id), eq(automationJobs.type, 'bmi_catalog_sync')),
      orderBy: (table, operators) => [operators.desc(table.createdAt)],
    })

    const appRecordings = userRecordings.map(toAppRecording)
    const appTasks = toAppTasks(userRecordings)
    const bmiSyncResult =
      latestBMISyncJob?.result && typeof latestBMISyncJob.result === 'object'
        ? (latestBMISyncJob.result as {
            syncedCount?: number
            metadata?: {
              matchedCount?: number
              provider?: string
            }
          })
        : null

    return NextResponse.json({
      recordings: appRecordings,
      claimTasks: appTasks,
      stats: computeStats(appRecordings),
      catalogImported: appRecordings.length > 0,
      bmiSync: latestBMISyncJob
        ? {
            jobId: latestBMISyncJob.id,
            status: latestBMISyncJob.status,
            syncedWorks: typeof bmiSyncResult?.syncedCount === 'number' ? bmiSyncResult.syncedCount : 0,
            matchedSongs:
              typeof bmiSyncResult?.metadata?.matchedCount === 'number'
                ? bmiSyncResult.metadata.matchedCount
                : 0,
            queuedAt: latestBMISyncJob.createdAt ? new Date(latestBMISyncJob.createdAt).toISOString() : null,
            completedAt: latestBMISyncJob.completedAt ? new Date(latestBMISyncJob.completedAt).toISOString() : null,
            lastError: latestBMISyncJob.lastError ?? null,
            source: bmiSyncResult?.metadata?.provider ?? null,
          }
        : null,
    })
  } catch (error) {
    const dbSummary = getDatabaseRuntimeSummary()
    const runtimeError = serializeRuntimeError(error)

    console.error('App state API error:', {
      dbSummary,
      runtimeError,
    })
    const isUnauthorized = error instanceof Error && error.message === 'Unauthorized'

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load app state',
        debug: isUnauthorized
          ? undefined
          : {
              dbSummary,
              runtimeError,
            },
      },
      { status: isUnauthorized ? 401 : 500 }
    )
  }
}
