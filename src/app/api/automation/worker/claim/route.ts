import { NextResponse } from 'next/server'
import { claimNextAutomationJob, isAutomationWorkerAuthorized } from '@/lib/automation-jobs'
import { getDatabaseRuntimeSummary, serializeRuntimeError } from '@/lib/runtime-diagnostics'

export async function POST(req: Request) {
  if (!isAutomationWorkerAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized worker' }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const workerId = typeof body?.workerId === 'string' && body.workerId ? body.workerId : 'automation-worker'
    const job = await claimNextAutomationJob(workerId)

    if (!job) {
      return NextResponse.json({ job: null })
    }

    return NextResponse.json({ job })
  } catch (error) {
    const dbSummary = getDatabaseRuntimeSummary()
    const runtimeError = serializeRuntimeError(error)
    console.error('Automation worker claim error:', {
      dbSummary,
      runtimeError,
    })
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to claim automation job',
        debug: {
          dbSummary,
          runtimeError,
        },
      },
      { status: 500 }
    )
  }
}
