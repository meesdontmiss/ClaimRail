import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, or } from 'drizzle-orm'

type AppUser = typeof users.$inferSelect

const userSessionColumns = {
  id: users.id,
  spotifyId: users.spotifyId,
  email: users.email,
  name: users.name,
  image: users.image,
  createdAt: users.createdAt,
} as const

function withMissingUserColumns(
  user: (typeof userSessionColumns extends infer _ ? {
    id: string
    spotifyId: string | null
    email: string | null
    name: string | null
    image: string | null
    createdAt: Date
  } : never)
): AppUser {
  return {
    ...user,
    bmiCredentialsEncrypted: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripeSubscriptionStatus: null,
    extensionApiKey: null,
    extensionApiKeyCreatedAt: null,
  }
}

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

  const whereClause =
    googleId && email
      ? or(eq(users.spotifyId, googleId), eq(users.email, email))
      : googleId
        ? eq(users.spotifyId, googleId)
        : eq(users.email, email!)

  let existingUser: AppUser | null = null

  try {
    existingUser = await db.query.users.findFirst({
      where: whereClause,
    }) ?? null
  } catch (error) {
    console.warn('Falling back to legacy users query shape:', error)
    existingUser = await db
      .select(userSessionColumns)
      .from(users)
      .where(whereClause)
      .limit(1)
      .then((rows) => rows[0] ? withMissingUserColumns(rows[0]) : null)
  }

  if (existingUser) {
    return existingUser
  }

  try {
    const [newUser] = await db
      .insert(users)
      .values({
        spotifyId: googleId ?? undefined,
        email: email ?? undefined,
        name: name ?? undefined,
        image: image ?? undefined,
      })
      .returning()

    return newUser ?? null
  } catch (error) {
    console.warn('Falling back to legacy users insert shape:', error)

    const [newUser] = await db
      .insert(users)
      .values({
        spotifyId: googleId ?? undefined,
        email: email ?? undefined,
        name: name ?? undefined,
        image: image ?? undefined,
      })
      .returning(userSessionColumns)

    return newUser ? withMissingUserColumns(newUser) : null
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
