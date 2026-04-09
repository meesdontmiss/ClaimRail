import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { db } from '@/lib/db'
import { recordings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
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
        catalogIssues: true,
        claimTasks: true,
      },
      orderBy: (table, operators) => [operators.desc(table.createdAt)],
    })

    const appRecordings = userRecordings.map(toAppRecording)
    const appTasks = toAppTasks(userRecordings)

    return NextResponse.json({
      recordings: appRecordings,
      claimTasks: appTasks,
      stats: computeStats(appRecordings),
      catalogImported: appRecordings.length > 0,
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
