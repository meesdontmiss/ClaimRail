import { NextResponse } from 'next/server'
import { enqueueBMICatalogSyncJob } from '@/lib/automation-jobs'
import { requireUser } from '@/lib/session'

export async function POST() {
  try {
    const user = await requireUser()
    const result = await enqueueBMICatalogSyncJob(user.id)

    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error('BMI sync enqueue API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to queue BMI sync' },
      { status: 500 }
    )
  }
}
