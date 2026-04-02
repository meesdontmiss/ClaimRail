import { NextResponse } from 'next/server'
import { failAutomationJob, isAutomationWorkerAuthorized } from '@/lib/automation-jobs'

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
    const body = await req.json()
    const workerId = typeof body?.workerId === 'string' && body.workerId ? body.workerId : 'automation-worker'

    if (!body?.error) {
      return NextResponse.json({ error: 'error is required' }, { status: 400 })
    }

    const result = await failAutomationJob(
      jobId,
      workerId,
      body.error,
      body.metadata && typeof body.metadata === 'object' ? body.metadata as Record<string, unknown> : undefined
    )

    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error('Automation worker fail error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fail automation job' },
      { status: 500 }
    )
  }
}
