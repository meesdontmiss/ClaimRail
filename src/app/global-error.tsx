'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
          <div className="glass max-w-md rounded-3xl p-8 text-center">
            <h2 className="mb-2 text-2xl font-bold text-destructive">Critical Error</h2>
            <p className="mb-4 text-muted-foreground">
              A critical error occurred. Please refresh the page or contact support if the problem persists.
            </p>
            <Button variant="destructive" onClick={reset}>
              Refresh page
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}
