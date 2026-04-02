import { AppShell } from '@/components/app-shell'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { listAutomationJobsForUser } from '@/lib/automation-jobs'
import { requireUser } from '@/lib/session'

function statusVariant(status: string) {
  switch (status) {
    case 'completed':
      return 'success' as const
    case 'failed':
    case 'needs_human':
      return 'danger' as const
    case 'running':
    case 'claimed':
      return 'warning' as const
    default:
      return 'secondary' as const
  }
}

export default async function AutomationPage() {
  const user = await requireUser()
  const jobs = await listAutomationJobsForUser(user.id)

  const activeCount = jobs.filter((job) => ['queued', 'claimed', 'running'].includes(job.status)).length
  const completedCount = jobs.filter((job) => job.status === 'completed').length
  const needsHumanCount = jobs.filter((job) => job.status === 'needs_human').length

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automation</h1>
          <p className="mt-1 text-muted-foreground">
            Track autonomous registration jobs, worker activity, and intervention needs.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="py-6">
              <p className="text-3xl font-bold">{activeCount}</p>
              <p className="text-sm text-muted-foreground">Queued or running jobs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6">
              <p className="text-3xl font-bold text-primary">{completedCount}</p>
              <p className="text-sm text-muted-foreground">Completed jobs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6">
              <p className="text-3xl font-bold text-warning">{needsHumanCount}</p>
              <p className="text-sm text-muted-foreground">Need human review</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Job Timeline</CardTitle>
            <CardDescription>
              Every autonomous BMI registration appears here with the latest worker events.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No automation jobs yet. Queue one from the Register page.
              </p>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{job.recording.title}</p>
                        <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {job.recording.artist} - attempts {job.attempts}/{job.maxAttempts}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created {new Date(job.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {job.lastError && (
                    <div className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                      {job.lastError}
                    </div>
                  )}

                  {job.result != null ? (
                    <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                      <p className="font-medium text-primary">Latest result</p>
                      <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">
                        {JSON.stringify(job.result, null, 2)}
                      </pre>
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-2">
                    {job.events.slice(0, 5).map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start justify-between gap-4 rounded-lg border border-white/[0.04] bg-black/10 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm">{event.message}</p>
                          <p className="text-xs text-muted-foreground">{event.level}</p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(event.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
