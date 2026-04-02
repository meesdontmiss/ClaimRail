import { NextResponse } from 'next/server'
import { getExtensionSongData } from '@/app/actions/extension'
import { getExtensionApiKeyFromRequest } from '@/lib/extension-service'

/**
 * GET /api/extension/song-data
 * 
 * Get pending songs for extension (Pro feature)
 */
export async function GET(req: Request) {
  try {
    const apiKey = getExtensionApiKeyFromRequest(req)
    const result = await getExtensionSongData(apiKey ?? undefined)
    
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      )
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Extension song data API error:', error)
    return NextResponse.json(
      { error: 'Failed to get song data' },
      { status: 500 }
    )
  }
}
