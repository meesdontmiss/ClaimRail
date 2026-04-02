import { NextResponse } from 'next/server'
import { trackExtensionRegistration } from '@/app/actions/extension'
import { getExtensionApiKeyFromRequest } from '@/lib/extension-service'

/**
 * POST /api/extension/track-registration
 * 
 * Track registration for free tier weekly limit
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const apiKey = body?.licenseKey ?? getExtensionApiKeyFromRequest(req)
    const recordingId = body?.recordingId
    const result = await trackExtensionRegistration(apiKey ?? undefined, recordingId)
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error, upgradeRequired: result.upgradeRequired },
        { status: result.error === 'Recording ID required' ? 400 : 403 }
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
