import { NextResponse } from 'next/server'
import { getExtensionSongData } from '@/app/actions/extension'

/**
 * GET /api/extension/song-data
 * 
 * Get pending songs for extension (Pro feature)
 */
export async function GET(req: Request) {
  try {
    const result = await getExtensionSongData()
    
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
