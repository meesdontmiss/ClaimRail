import { NextResponse } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { requireUser } from '@/lib/session'
import { db } from '@/lib/db'
import { catalogIssues, claimTasks, recordings } from '@/lib/db/schema'
import { buildTaskFromIssue } from '@/lib/catalog-state'

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const issueIds = Array.isArray(body?.issueIds) ? (body.issueIds as string[]) : []

    if (issueIds.length === 0) {
      return NextResponse.json({ error: 'Issue IDs required' }, { status: 400 })
    }

    const userRecordings = await db.query.recordings.findMany({
      where: eq(recordings.userId, user.id),
      columns: { id: true },
    })
    const recordingIds = userRecordings.map((recording) => recording.id)

    if (recordingIds.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    const issuesToResolve = await db.query.catalogIssues.findMany({
      where: and(
        inArray(catalogIssues.id, issueIds),
        inArray(catalogIssues.recordingId, recordingIds)
      ),
      with: {
        recording: true,
      },
    })

    const updated = await db.update(catalogIssues)
      .set({
        resolved: true,
        resolvedAt: new Date(),
      })
      .where(
        and(
          inArray(catalogIssues.id, issueIds),
          inArray(catalogIssues.recordingId, recordingIds)
        )
      )
      .returning({ id: catalogIssues.id })

    for (const issue of issuesToResolve) {
      const linkedTask = buildTaskFromIssue(issue.recording.title, {
        id: issue.id,
        recordingId: issue.recordingId,
        type: issue.type as Parameters<typeof buildTaskFromIssue>[1]['type'],
        severity: issue.severity as Parameters<typeof buildTaskFromIssue>[1]['severity'],
        title: issue.title,
        description: issue.description,
        actionLabel: issue.actionLabel ?? 'Review',
        resolved: Boolean(issue.resolved),
      })

      await db.update(claimTasks)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(
          and(
            eq(claimTasks.recordingId, issue.recordingId),
            eq(claimTasks.title, linkedTask.title)
          )
        )
    }

    return NextResponse.json({ success: true, count: updated.length })
  } catch (error) {
    console.error('Bulk resolve issue API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to bulk resolve issues' },
      { status: 500 }
    )
  }
}
