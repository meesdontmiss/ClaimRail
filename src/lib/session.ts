import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, or } from 'drizzle-orm'

interface SpotifyProfileResponse {
  id: string
  email?: string | null
  display_name?: string | null
  images?: Array<{ url: string }>
}

async function getSpotifyProfile(accessToken: string) {
  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    return null
  }

  return response.json() as Promise<SpotifyProfileResponse>
}

/**
 * Get the current authenticated user from the database
 * This should be used in server components and server actions
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id && !session?.user?.email) {
    return null
  }

  let spotifyId = session.user?.id ?? null
  let email = session.user?.email ?? null
  let name = session.user?.name ?? null
  let image = session.user?.image ?? null

  if ((!spotifyId || !email) && session.accessToken) {
    const spotifyProfile = await getSpotifyProfile(session.accessToken)
    if (spotifyProfile) {
      spotifyId = spotifyId ?? spotifyProfile.id
      email = email ?? spotifyProfile.email ?? null
      name = name ?? spotifyProfile.display_name ?? null
      image = image ?? spotifyProfile.images?.[0]?.url ?? null
    }
  }

  if (!spotifyId && !email) {
    return null
  }

  try {
    const existingUser = await db.query.users.findFirst({
      where:
        spotifyId && email
          ? or(eq(users.spotifyId, spotifyId), eq(users.email, email))
          : spotifyId
            ? eq(users.spotifyId, spotifyId)
            : eq(users.email, email!),
    })

    if (existingUser) {
      if (!existingUser.spotifyId && spotifyId) {
        const [updatedUser] = await db
          .update(users)
          .set({
            spotifyId,
            email: email ?? existingUser.email ?? undefined,
            name: name ?? existingUser.name ?? undefined,
            image: image ?? existingUser.image ?? undefined,
          })
          .where(eq(users.id, existingUser.id))
          .returning()

        return updatedUser ?? existingUser
      }

      return existingUser
    }

    const [newUser] = await db.insert(users).values({
      spotifyId: spotifyId ?? undefined,
      email: email ?? undefined,
      name: name ?? undefined,
      image: image ?? undefined,
    }).returning()

    return newUser ?? null
  } catch (error) {
    console.error('Error getting current user:', error)

    if (!spotifyId && !email) {
      return null
    }

    try {
      return await db.query.users.findFirst({
        where:
          spotifyId && email
            ? or(eq(users.spotifyId, spotifyId), eq(users.email, email))
            : spotifyId
              ? eq(users.spotifyId, spotifyId)
              : eq(users.email, email!),
      })
    } catch (retryError) {
      console.error('Error retrying current user lookup:', retryError)
      return null
    }
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
