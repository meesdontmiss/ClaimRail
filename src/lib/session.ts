import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Get the current authenticated user from the database
 * This should be used in server components and server actions
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return null
  }

  const spotifyId = session.user.id

  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.spotifyId, spotifyId),
    })

    if (existingUser) {
      return existingUser
    }

    const [newUser] = await db.insert(users).values({
      spotifyId,
      email: session.user.email ?? undefined,
      name: session.user.name ?? undefined,
      image: session.user.image ?? undefined,
    }).returning()

    return newUser ?? null
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
