'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
      <div className="glass max-w-md rounded-3xl p-8 text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Dashboard Error</h2>
        <p className="mb-4 text-muted-foreground">
          There was a problem loading the dashboard. Please try refreshing the page.
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={reset}>
            Try again
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Refresh
          </Button>
        </div>
      </div>
    </div>
  )
}
