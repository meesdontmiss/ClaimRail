import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { resolveIssue } from '@/app/actions/recordings'

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body = await req.json()
    const issueId = body?.issueId as string | undefined

    if (!issueId) {
      return NextResponse.json({ error: 'Issue ID required' }, { status: 400 })
    }

    const result = await resolveIssue(issueId, user.id)
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    console.error('Resolve issue API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve issue' },
      { status: 500 }
    )
  }
}
