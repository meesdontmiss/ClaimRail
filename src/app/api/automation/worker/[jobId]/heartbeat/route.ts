import { NextResponse } from 'next/server'
import { isAutomationWorkerAuthorized, markAutomationJobRunning } from '@/lib/automation-jobs'

interface RouteContext {
  params: Promise<{
    jobId: string
  }>
}

export async function POST(req: Request, context: RouteContext) {
  if (!isAutomationWorkerAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized worker' }, { status: 401 })
  }

  try {
    const { jobId } = await context.params
    const body = await req.json().catch(() => ({}))
    const workerId = typeof body?.workerId === 'string' && body.workerId ? body.workerId : 'automation-worker'
    const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata as Record<string, unknown> : undefined

    await markAutomationJobRunning(jobId, workerId, metadata)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Automation worker heartbeat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to heartbeat automation job' },
      { status: 500 }
    )
  }
}
