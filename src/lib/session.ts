import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, or } from 'drizzle-orm'

/**
 * Get the current authenticated user from the database
 * This should be used in server components and server actions
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id && !session?.user?.email) {
    return null
  }

  const spotifyId = session.user?.id ?? null
  const email = session.user?.email ?? null

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
            name: session.user?.name ?? existingUser.name ?? undefined,
            image: session.user?.image ?? existingUser.image ?? undefined,
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
