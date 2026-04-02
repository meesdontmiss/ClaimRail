import { NextResponse } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { requireUser } from '@/lib/session'
import { db } from '@/lib/db'
import { compositionWorks, recordings, workSplits, writers } from '@/lib/db/schema'
import type { Recording } from '@/lib/types'

interface RouteContext {
  params: Promise<{
    recordingId: string
  }>
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { recordingId } = await context.params
    const user = await requireUser()
    const body = await req.json()
    const recording = body?.recording as Recording | undefined

    if (!recording) {
      return NextResponse.json({ error: 'Recording payload required' }, { status: 400 })
    }

    const existingRecording = await db.query.recordings.findFirst({
      where: and(eq(recordings.id, recordingId), eq(recordings.userId, user.id)),
      with: {
        compositionWork: {
          with: {
            writers: true,
          },
        },
      },
    })

    if (!existingRecording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 })
    }

    await db.transaction(async (tx) => {
      await tx.update(recordings)
        .set({
          title: recording.title,
          artist: recording.artist,
          album: recording.album,
          isrc: recording.isrc,
          releaseDate: recording.releaseDate ?? undefined,
          duration: recording.duration ?? undefined,
          claimReadinessScore: recording.claimReadinessScore,
        })
        .where(eq(recordings.id, recordingId))

      if (!recording.compositionWork) {
        return
      }

      let compositionWorkId = existingRecording.compositionWork?.id

      if (compositionWorkId) {
        await tx.update(compositionWorks)
          .set({
            title: recording.compositionWork.title,
            proRegistered: recording.compositionWork.proRegistered,
            adminRegistered: recording.compositionWork.adminRegistered,
            iswc: recording.compositionWork.iswc,
          })
          .where(eq(compositionWorks.id, compositionWorkId))

        const existingWriterIds = existingRecording.compositionWork?.writers.map((writer) => writer.id) ?? []
        if (existingWriterIds.length > 0) {
          await tx.delete(workSplits).where(inArray(workSplits.writerId, existingWriterIds))
          await tx.delete(writers).where(inArray(writers.id, existingWriterIds))
        }
      } else {
        const [newCompositionWork] = await tx.insert(compositionWorks).values({
          recordingId,
          title: recording.compositionWork.title,
          proRegistered: recording.compositionWork.proRegistered,
          adminRegistered: recording.compositionWork.adminRegistered,
          iswc: recording.compositionWork.iswc,
        }).returning()

        compositionWorkId = newCompositionWork.id
      }

      for (const writer of recording.compositionWork.writers) {
        const [newWriter] = await tx.insert(writers).values({
          compositionWorkId,
          name: writer.name,
          pro: writer.pro,
          ipi: writer.ipi,
          role: writer.role,
        }).returning()

        const writerSplits = recording.compositionWork.splits.filter((split) => split.writerId === writer.id)
        if (writerSplits.length > 0) {
          await tx.insert(workSplits).values(
            writerSplits.map((split) => ({
              writerId: newWriter.id,
              percentage: split.percentage,
            }))
          )
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Catalog recording update API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update recording' },
      { status: 500 }
    )
  }
}
