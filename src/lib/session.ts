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

  if (!session?.user) {
    return null
  }

  const googleId = session.user.id ?? null
  const email = session.user.email ?? null
  const name = session.user.name ?? null
  const image = session.user.image ?? null

  if (!googleId && !email) {
    return null
  }

  try {
    const existingUser = await db.query.users.findFirst({
      where:
        googleId && email
          ? or(eq(users.spotifyId, googleId), eq(users.email, email))
          : googleId
            ? eq(users.spotifyId, googleId)
            : eq(users.email, email!),
    })

    if (existingUser) {
      return existingUser
    }

    const [newUser] = await db.insert(users).values({
      spotifyId: googleId ?? undefined,
      email: email ?? undefined,
      name: name ?? undefined,
      image: image ?? undefined,
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
