'use server'

import { db } from '@/lib/db'
import { recordings, catalogIssues, claimTasks, users } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { buildTaskFromIssue } from '@/lib/catalog-state'

// ==================== Recordings ====================

export async function getRecordings(userId: string) {
  try {
    const userRecordings = await db.query.recordings.findMany({
      where: eq(recordings.userId, userId),
      orderBy: (recordings, { desc }) => [desc(recordings.createdAt)]
    })
    return { success: true, data: userRecordings }
  } catch (error) {
    console.error('Error fetching recordings:', error)
    return { success: false, error: 'Failed to fetch recordings' }
  }
}

export async function getRecordingById(recordingId: string, userId: string) {
  try {
    const recording = await db.query.recordings.findFirst({
      where: and(
        eq(recordings.id, recordingId),
        eq(recordings.userId, userId)
      )
    })
    
    if (!recording) {
      return { success: false, error: 'Recording not found' }
    }
    
    return { success: true, data: recording }
  } catch (error) {
    console.error('Error fetching recording:', error)
    return { success: false, error: 'Failed to fetch recording' }
  }
}

export async function createRecording(recording: {
  userId: string
  spotifyId: string
  title: string
  artist: string
  album?: string
  albumArt?: string
  isrc?: string
  releaseDate?: string
  duration?: string
  claimReadinessScore?: number
}) {
  try {
    const [newRecording] = await db.insert(recordings).values(recording).returning()
    revalidatePath('/dashboard')
    revalidatePath('/audit')
    return { success: true, data: newRecording }
  } catch (error) {
    console.error('Error creating recording:', error)
    return { success: false, error: 'Failed to create recording' }
  }
}

export async function updateRecording(
  recordingId: string,
  userId: string,
  updates: Partial<typeof recordings.$inferInsert>
) {
  try {
    const [updated] = await db
      .update(recordings)
      .set(updates)
      .where(
        and(
          eq(recordings.id, recordingId),
          eq(recordings.userId, userId)
        )
      )
      .returning()
    
    revalidatePath('/dashboard')
    revalidatePath('/audit')
    revalidatePath('/fix')
    
    return { success: true, data: updated }
  } catch (error) {
    console.error('Error updating recording:', error)
    return { success: false, error: 'Failed to update recording' }
  }
}

export async function deleteRecording(recordingId: string, userId: string) {
  try {
    await db
      .delete(recordings)
      .where(
        and(
          eq(recordings.id, recordingId),
          eq(recordings.userId, userId)
        )
      )
    
    revalidatePath('/dashboard')
    revalidatePath('/audit')
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting recording:', error)
    return { success: false, error: 'Failed to delete recording' }
  }
}

export async function bulkUpsertRecordings(recordingsData: Array<typeof recordings.$inferInsert>) {
  try {
    await db.insert(recordings).values(recordingsData).onConflictDoNothing()
    
    revalidatePath('/dashboard')
    revalidatePath('/audit')
    
    return { success: true }
  } catch (error) {
    console.error('Error bulk inserting recordings:', error)
    return { success: false, error: 'Failed to bulk insert recordings' }
  }
}

// ==================== Catalog Issues ====================

export async function getCatalogIssues(userId: string, resolved?: boolean) {
  try {
    const userRecordingIds = await db.query.recordings.findMany({
      where: eq(recordings.userId, userId),
      columns: { id: true },
    })

    const recordingIds = userRecordingIds.map((recording) => recording.id)

    if (recordingIds.length === 0) {
      return { success: true, data: [] }
    }

    const issues = await db.query.catalogIssues.findMany({
      where:
        resolved !== undefined
          ? and(
              inArray(catalogIssues.recordingId, recordingIds),
              eq(catalogIssues.resolved, resolved)
            )
          : inArray(catalogIssues.recordingId, recordingIds),
    })
    
    return { success: true, data: issues }
  } catch (error) {
    console.error('Error fetching catalog issues:', error)
    return { success: false, error: 'Failed to fetch catalog issues' }
  }
}

export async function resolveIssue(issueId: string, userId: string) {
  try {
    const userRecordingIds = await db.query.recordings.findMany({
      where: eq(recordings.userId, userId),
      columns: { id: true },
    })

    const recordingIds = userRecordingIds.map((recording) => recording.id)

    if (recordingIds.length === 0) {
      return { success: false, error: 'Issue not found' }
    }

    const targetIssue = await db.query.catalogIssues.findFirst({
      where: eq(catalogIssues.id, issueId),
      with: {
        recording: true,
      },
    })

    if (!targetIssue || !recordingIds.includes(targetIssue.recordingId)) {
      return { success: false, error: 'Issue not found' }
    }

    const [updated] = await db
      .update(catalogIssues)
      .set({ 
        resolved: true,
        resolvedAt: new Date()
      })
      .where(
        and(
          eq(catalogIssues.id, issueId),
          inArray(catalogIssues.recordingId, recordingIds)
        )
      )
      .returning()

    if (!updated) {
      return { success: false, error: 'Issue not found' }
    }

    const linkedTask = buildTaskFromIssue(targetIssue.recording.title, {
      id: targetIssue.id,
      recordingId: targetIssue.recordingId,
      type: targetIssue.type as Parameters<typeof buildTaskFromIssue>[1]['type'],
      severity: targetIssue.severity as Parameters<typeof buildTaskFromIssue>[1]['severity'],
      title: targetIssue.title,
      description: targetIssue.description,
      actionLabel: targetIssue.actionLabel ?? 'Review',
      resolved: Boolean(targetIssue.resolved),
    })

    await db.update(claimTasks)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(
        and(
          eq(claimTasks.recordingId, targetIssue.recordingId),
          eq(claimTasks.title, linkedTask.title)
        )
      )
    
    revalidatePath('/audit')
    revalidatePath('/fix')
    
    return { success: true, data: updated }
  } catch (error) {
    console.error('Error resolving issue:', error)
    return { success: false, error: 'Failed to resolve issue' }
  }
}

export async function createCatalogIssue(issue: {
  recordingId: string
  type: typeof catalogIssues.$inferInsert.type
  severity: typeof catalogIssues.$inferInsert.severity
  title: string
  description: string
  actionLabel?: string
}) {
  try {
    const [newIssue] = await db.insert(catalogIssues).values(issue).returning()
    revalidatePath('/audit')
    return { success: true, data: newIssue }
  } catch (error) {
    console.error('Error creating catalog issue:', error)
    return { success: false, error: 'Failed to create catalog issue' }
  }
}

// ==================== Claim Tasks ====================

export async function getClaimTasks(userId: string, status?: string) {
  try {
    const userRecordingIds = await db.query.recordings.findMany({
      where: eq(recordings.userId, userId),
      columns: { id: true },
    })

    const recordingIds = userRecordingIds.map((recording) => recording.id)

    if (recordingIds.length === 0) {
      return { success: true, data: [] }
    }

    const tasks = await db.query.claimTasks.findMany({
      where:
        status
          ? and(
              inArray(claimTasks.recordingId, recordingIds),
              eq(claimTasks.status, status as 'pending' | 'in_progress' | 'completed' | 'cancelled')
            )
          : inArray(claimTasks.recordingId, recordingIds),
    })
    
    return { success: true, data: tasks }
  } catch (error) {
    console.error('Error fetching claim tasks:', error)
    return { success: false, error: 'Failed to fetch claim tasks' }
  }
}

export async function completeTask(taskId: string, userId: string) {
  try {
    const userRecordingIds = await db.query.recordings.findMany({
      where: eq(recordings.userId, userId),
      columns: { id: true },
    })

    const recordingIds = userRecordingIds.map((recording) => recording.id)

    if (recordingIds.length === 0) {
      return { success: false, error: 'Task not found' }
    }

    const [updated] = await db
      .update(claimTasks)
      .set({ 
        status: 'completed',
        completedAt: new Date()
      })
      .where(
        and(
          eq(claimTasks.id, taskId),
          inArray(claimTasks.recordingId, recordingIds)
        )
      )
      .returning()

    if (!updated) {
      return { success: false, error: 'Task not found' }
    }
    
    revalidatePath('/dashboard')
    revalidatePath('/recover')
    
    return { success: true, data: updated }
  } catch (error) {
    console.error('Error completing task:', error)
    return { success: false, error: 'Failed to complete task' }
  }
}

export async function createClaimTask(task: {
  recordingId: string
  title: string
  description: string
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
}) {
  try {
    const [newTask] = await db.insert(claimTasks).values(task).returning()
    revalidatePath('/dashboard')
    return { success: true, data: newTask }
  } catch (error) {
    console.error('Error creating claim task:', error)
    return { success: false, error: 'Failed to create claim task' }
  }
}

// ==================== User ====================

export async function getUserBySpotifyId(spotifyId: string) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.spotifyId, spotifyId)
    })
    return { success: true, data: user }
  } catch (error) {
    console.error('Error fetching user:', error)
    return { success: false, error: 'Failed to fetch user' }
  }
}

export async function createUser(user: {
  spotifyId: string
  email?: string
  name?: string
  image?: string
}) {
  try {
    const [newUser] = await db.insert(users).values(user).returning()
    return { success: true, data: newUser }
  } catch (error) {
    console.error('Error creating user:', error)
    return { success: false, error: 'Failed to create user' }
  }
}

export async function updateUser(userId: string, updates: Partial<typeof users.$inferInsert>) {
  try {
    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning()
    
    return { success: true, data: updated }
  } catch (error) {
    console.error('Error updating user:', error)
    return { success: false, error: 'Failed to update user' }
  }
}
