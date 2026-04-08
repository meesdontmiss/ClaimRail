'use client'

import { useEffect } from 'react'

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
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
          <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Critical Error</h2>
            <p className="text-gray-600 mb-4">
              A critical error occurred. Please refresh the page or contact support if the problem persists.
            </p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Refresh page
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
