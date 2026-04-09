'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="glass max-w-md rounded-3xl p-8 text-center">
        <h2 className="mb-2 text-2xl font-bold text-foreground">Something went wrong!</h2>
        <p className="mb-4 text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        <Button onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  )
}
