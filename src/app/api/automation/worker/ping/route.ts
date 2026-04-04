import { NextResponse } from 'next/server'
import { isAutomationWorkerAuthorized, recordAutomationWorkerPing } from '@/lib/automation-jobs'

export async function POST(req: Request) {
  if (!isAutomationWorkerAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized worker' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const workerId = typeof body?.workerId === 'string' && body.workerId ? body.workerId : 'automation-worker'
    const metadata =
      body?.metadata && typeof body.metadata === 'object'
        ? body.metadata as Record<string, unknown>
        : undefined

    await recordAutomationWorkerPing(workerId, metadata)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Automation worker ping error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record worker heartbeat' },
      { status: 500 }
    )
  }
}
