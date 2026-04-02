import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { enqueueBMIRegistrationJob } from '@/lib/automation-jobs'

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const recordingIds = Array.isArray(body?.recordingIds) ? (body.recordingIds as string[]) : []
    const writerInfo =
      body?.writerInfo && typeof body.writerInfo === 'object'
        ? {
            name: typeof body.writerInfo.name === 'string' ? body.writerInfo.name : '',
            pro: typeof body.writerInfo.pro === 'string' ? body.writerInfo.pro : null,
            ipi: typeof body.writerInfo.ipi === 'string' ? body.writerInfo.ipi : null,
          }
        : undefined

    if (recordingIds.length === 0) {
      return NextResponse.json({ error: 'Recording IDs required' }, { status: 400 })
    }

    const results = []
    for (const recordingId of recordingIds) {
      const result = await enqueueBMIRegistrationJob(recordingId, user.id, writerInfo)
      results.push({ recordingId, ...result })
    }

    return NextResponse.json({
      success: true,
      queuedCount: results.filter((result) => result.success).length,
      results,
    })
  } catch (error) {
    console.error('Automation job enqueue API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to enqueue automation jobs' },
      { status: 500 }
    )
  }
}
