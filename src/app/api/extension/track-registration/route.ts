import { NextResponse } from 'next/server'
import { trackExtensionRegistration } from '@/app/actions/extension'

/**
 * POST /api/extension/track-registration
 * 
 * Track registration for free tier weekly limit
 */
export async function POST(req: Request) {
  try {
    const result = await trackExtensionRegistration()
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error, upgradeRequired: result.upgradeRequired },
        { status: 403 }
      )
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Track registration API error:', error)
    return NextResponse.json(
      { error: 'Failed to track registration' },
      { status: 500 }
    )
  }
}
