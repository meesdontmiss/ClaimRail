import { NextResponse } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { requireUser } from '@/lib/session'
import { db } from '@/lib/db'
import { claimTasks, recordings } from '@/lib/db/schema'
import type { ClaimTaskStatus } from '@/lib/types'

interface RouteContext {
  params: Promise<{
    taskId: string
  }>
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { taskId } = await context.params
    const user = await requireUser()
    const body = await req.json()
    const status = body?.status as ClaimTaskStatus | undefined

    if (!status) {
      return NextResponse.json({ error: 'Task status required' }, { status: 400 })
    }

    const normalizedStatus =
      status === 'completed'
        ? 'completed'
        : status === 'in_progress'
          ? 'in_progress'
          : status === 'cancelled'
            ? 'cancelled'
            : 'pending'

    const userRecordings = await db.query.recordings.findMany({
      where: eq(recordings.userId, user.id),
      columns: { id: true },
    })
    const recordingIds = userRecordings.map((recording) => recording.id)

    if (recordingIds.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const [updatedTask] = await db.update(claimTasks)
      .set({
        status: normalizedStatus,
        completedAt: normalizedStatus === 'completed' ? new Date() : null,
      })
      .where(
        and(
          eq(claimTasks.id, taskId),
          inArray(claimTasks.recordingId, recordingIds)
        )
      )
      .returning({ id: claimTasks.id })

    if (!updatedTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Task update API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update task' },
      { status: 500 }
    )
  }
}
