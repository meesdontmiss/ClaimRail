import { NextResponse } from 'next/server'
import { verifyExtensionAPIKey } from '@/app/actions/extension-license'
import { getExtensionApiKeyFromRequest } from '@/lib/extension-service'

/**
 * POST /api/extension/verify
 * 
 * Verify extension license key and return subscription status
 * Called by Chrome extension background script
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const licenseKey = body?.licenseKey ?? getExtensionApiKeyFromRequest(req)
    
    if (!licenseKey) {
      return NextResponse.json(
        { 
          valid: false, 
          tier: 'none', 
          message: 'No license key provided',
          requiresLicense: true,
        },
        { status: 401 }
      )
    }
    
    const result = await verifyExtensionAPIKey(licenseKey)
    
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
