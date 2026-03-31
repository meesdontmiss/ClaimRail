import { NextResponse } from 'next/server'
import { verifyExtensionAccess } from '@/app/actions/extension'

/**
 * POST /api/extension/verify
 * 
 * Verify extension subscription status
 * Called by Chrome extension background script
 */
export async function POST(req: Request) {
  try {
    const result = await verifyExtensionAccess()
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Extension verify API error:', error)
    return NextResponse.json(
      { 
        valid: false, 
        tier: 'none', 
        message: 'Verification failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
