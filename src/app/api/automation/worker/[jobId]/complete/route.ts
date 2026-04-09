import { NextResponse } from 'next/server'
import { completeAutomationJob, isAutomationWorkerAuthorized } from '@/lib/automation-jobs'

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
    const rawBody = await req.json()
    const body = rawBody && typeof rawBody === 'object' ? rawBody as Record<string, unknown> : {}
    const workerId = typeof body.workerId === 'string' && body.workerId ? body.workerId : 'automation-worker'
    const { workerId: _ignoredWorkerId, ...resultPayload } = body
    const result = await completeAutomationJob(jobId, workerId, resultPayload)

    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error('Automation worker completion error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete automation job' },
      { status: 500 }
    )
  }
}
