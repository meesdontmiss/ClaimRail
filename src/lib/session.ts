import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserBySpotifyId, createUser } from '@/app/actions/recordings'

/**
 * Get the current authenticated user from the database
 * This should be used in server components and server actions
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return null
  }

  // Extract Spotify ID from session
  // Note: NextAuth stores the Spotify user ID in the session
  const spotifyId = (session.user as any).id
  
  if (!spotifyId) {
    return null
  }

  try {
    // Try to get user from database
    const userResult = await getUserBySpotifyId(spotifyId)
    
    if (userResult.success && userResult.data) {
      return userResult.data
    }

    // User doesn't exist in database yet - create them
    const createResult = await createUser({
      spotifyId,
      email: session.user.email ?? undefined,
      name: session.user.name ?? undefined,
      image: session.user.image ?? undefined
    })

    if (createResult.success && createResult.data) {
      return createResult.data
    }

    return null
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Require authentication - throws if not authenticated
 * Use this in server components that require auth
 */
export async function requireUser() {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}
