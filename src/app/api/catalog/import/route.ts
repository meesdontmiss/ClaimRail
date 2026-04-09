import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { requireUser } from '@/lib/session'
import { db } from '@/lib/db'
import { catalogIssues, claimTasks, recordings } from '@/lib/db/schema'
import { buildTaskFromIssue, createIssueTemplate } from '@/lib/catalog-state'
import type { Recording } from '@/lib/types'

async function findExistingRecording(userId: string, recording: Recording) {
  if (recording.spotifyId) {
    return db.query.recordings.findFirst({
      where: and(
        eq(recordings.userId, userId),
        eq(recordings.spotifyId, recording.spotifyId)
      ),
    })
  }

  if (recording.isrc) {
    return db.query.recordings.findFirst({
      where: and(
        eq(recordings.userId, userId),
        eq(recordings.isrc, recording.isrc)
      ),
    })
  }

  if (recording.title && recording.artist) {
    return db.query.recordings.findFirst({
      where: and(
        eq(recordings.userId, userId),
        eq(recordings.title, recording.title),
        eq(recordings.artist, recording.artist)
      ),
    })
  }

  return null
}

function mergeImportedRecording(existingRecording: typeof recordings.$inferSelect, importedRecording: Recording) {
  return {
    spotifyId: importedRecording.spotifyId ?? existingRecording.spotifyId ?? undefined,
    title: importedRecording.title || existingRecording.title,
    artist: importedRecording.artist || existingRecording.artist,
    album: importedRecording.album || existingRecording.album,
    albumArt: importedRecording.albumArt ?? existingRecording.albumArt ?? undefined,
    isrc: importedRecording.isrc ?? existingRecording.isrc,
    releaseDate: importedRecording.releaseDate ?? existingRecording.releaseDate ?? undefined,
    duration: importedRecording.duration ?? existingRecording.duration ?? undefined,
    claimReadinessScore: Math.max(
      existingRecording.claimReadinessScore ?? 0,
      importedRecording.claimReadinessScore ?? 0
    ),
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const importedRecordings = Array.isArray(body?.recordings) ? (body.recordings as Recording[]) : []
    const pruneMissingSpotify = body?.pruneMissingSpotify === true

    if (importedRecordings.length === 0) {
      return NextResponse.json({ error: 'No recordings provided' }, { status: 400 })
    }

    const insertedIds: string[] = []
    let updatedCount = 0
    let prunedCount = 0

    await db.transaction(async (tx) => {
      for (const importedRecording of importedRecordings) {
        const existingRecording = await findExistingRecording(user.id, importedRecording)
        if (existingRecording) {
          await tx.update(recordings)
            .set(mergeImportedRecording(existingRecording, importedRecording))
            .where(eq(recordings.id, existingRecording.id))

          updatedCount += 1
          continue
        }

        const [newRecording] = await tx.insert(recordings).values({
          userId: user.id,
          spotifyId: importedRecording.spotifyId ?? null,
          title: importedRecording.title,
          artist: importedRecording.artist,
          album: importedRecording.album,
          albumArt: importedRecording.albumArt ?? null,
          isrc: importedRecording.isrc,
          releaseDate: importedRecording.releaseDate ?? undefined,
          duration: importedRecording.duration ?? undefined,
          claimReadinessScore: importedRecording.claimReadinessScore,
        }).returning()

        insertedIds.push(newRecording.id)

        const issues = importedRecording.issues?.length
          ? importedRecording.issues.map((issue) => ({
              recordingId: newRecording.id,
              type: issue.type,
              severity: issue.severity,
              title: issue.title,
              description: issue.description,
              actionLabel: issue.actionLabel,
              resolved: issue.resolved,
            }))
          : createIssueTemplate({
              id: newRecording.id,
              title: importedRecording.title,
              artist: importedRecording.artist,
              isrc: importedRecording.isrc,
              releaseDate: importedRecording.releaseDate,
              compositionWork: importedRecording.compositionWork,
            }).map((issue) => ({
              recordingId: newRecording.id,
              type: issue.type,
              severity: issue.severity,
              title: issue.title,
              description: issue.description,
              actionLabel: issue.actionLabel,
              resolved: issue.resolved,
            }))

        if (issues.length > 0) {
          const insertedIssues = await tx.insert(catalogIssues).values(issues).returning()
          const tasks: Array<typeof claimTasks.$inferInsert> = insertedIssues.map((issue) => {
            const task = buildTaskFromIssue(importedRecording.title, {
              id: issue.id,
              recordingId: issue.recordingId,
              type: issue.type as Recording['issues'][number]['type'],
              severity: issue.severity as Recording['issues'][number]['severity'],
              title: issue.title,
              description: issue.description,
              actionLabel: issue.actionLabel ?? 'Review',
              resolved: Boolean(issue.resolved),
            })

            return {
              recordingId: newRecording.id,
              title: task.title,
              description: task.description,
              status:
                task.status === 'completed'
                  ? 'completed'
                  : task.status === 'in_progress'
                    ? 'in_progress'
                    : task.status === 'cancelled'
                      ? 'cancelled'
                      : 'pending',
            }
          })

          if (tasks.length > 0) {
            await tx.insert(claimTasks).values(tasks)
          }
        }
      }

      if (pruneMissingSpotify) {
        const importedSpotifyIds = importedRecordings
          .map((recording) => recording.spotifyId)
          .filter((spotifyId): spotifyId is string => Boolean(spotifyId))

        if (importedSpotifyIds.length > 0) {
          const existingSpotifyRecordings = await tx.query.recordings.findMany({
            where: eq(recordings.userId, user.id),
            with: {
              compositionWork: true,
            },
          })

          const staleSpotifyRecordings = existingSpotifyRecordings.filter(
            (recording) =>
              Boolean(recording.spotifyId) &&
              !importedSpotifyIds.includes(recording.spotifyId!) &&
              !recording.compositionWork
          )

          for (const staleRecording of staleSpotifyRecordings) {
            await tx.delete(recordings).where(eq(recordings.id, staleRecording.id))
          }

          prunedCount = staleSpotifyRecordings.length
        }
      }
    })

    return NextResponse.json({
      success: true,
      inserted: insertedIds.length,
      updated: updatedCount,
      pruned: prunedCount,
    })
  } catch (error) {
    console.error('Catalog import API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import recordings' },
      { status: 500 }
    )
  }
}
