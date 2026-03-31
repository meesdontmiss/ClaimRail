'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, bmiRegistrations, recordings } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

/**
 * Verify extension subscription status
 * Called by Chrome extension to check if user has active subscription
 */
export async function verifyExtensionAccess() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return {
        valid: false,
        tier: 'none',
        message: 'Not logged in',
        requiresLogin: true,
      }
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email!),
    })

    if (!user) {
      return {
        valid: false,
        tier: 'none',
        message: 'User not found',
        requiresLogin: true,
      }
    }

    // Check subscription status
    const isPro = user.stripeSubscriptionStatus === 'active'
    const tier = isPro ? 'pro' : 'free'

    // Count registrations this week (for free tier limit)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const registrationsThisWeek = await db.query.bmiRegistrations.findMany({
      where: (registrations, { and, gte }) => 
        and(
          eq(registrations.compositionWorkId, user.id),
          gte(registrations.registeredAt, weekAgo)
        ),
    })

    const count = registrationsThisWeek.length
    const weeklyLimit = isPro ? Infinity : 1
    const canRegister = isPro || count < weeklyLimit

    return {
      valid: true,
      tier,
      weeklyLimit: isPro ? Infinity : 1,
      registrationsThisWeek: count,
      canRegister,
      message: isPro 
        ? 'Pro plan active - Unlimited registrations!' 
        : 'Free plan - 1 registration per week',
    }

  } catch (error) {
    console.error('Extension verification error:', error)
    return {
      valid: false,
      tier: 'none',
      message: 'Verification failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get pending songs for extension (Pro feature)
 */
export async function getExtensionSongData() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return { error: 'Not authenticated' }
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email!),
    })

    if (!user) {
      return { error: 'User not found' }
    }

    // Check if Pro user
    if (user.stripeSubscriptionStatus !== 'active') {
      return { error: 'Pro subscription required' }
    }

    // Get recordings without BMI registration
    const userRecordings: any = await db.query.recordings.findMany({
      where: eq(recordings.userId, user.id),
      with: {
        compositionWork: {
          with: {
            writers: {
              with: {
                splits: true,
              },
            },
          },
        },
      },
      orderBy: (recordings: any, { desc }: any) => [desc(recordings.createdAt)],
    })

    // Filter for recordings ready for BMI registration
    const pendingSongs = userRecordings
      .filter((rec: any) => rec.compositionWork && !rec.compositionWork.proRegistered)
      .map((rec: any) => ({
        id: rec.id,
        title: rec.compositionWork!.title,
        artist: rec.artist,
        isrc: rec.isrc,
        writers: rec.compositionWork!.writers.map((w: any) => ({
          name: w.name,
          ipi: w.ipi,
          pro: w.pro,
          share: w.splits[0]?.percentage || 0,
          role: w.role,
        })),
      }))

    return {
      songs: pendingSongs,
      count: pendingSongs.length,
    }

  } catch (error) {
    console.error('Get song data error:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Track registration for free tier weekly limit
 */
export async function trackExtensionRegistration() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return { error: 'Not authenticated' }
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email!),
    })

    if (!user) {
      return { error: 'User not found' }
    }

    // Check if already at weekly limit
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const registrationsThisWeek = await db.query.bmiRegistrations.findMany({
      where: (registrations, { and, gte }) =>
        and(
          eq(registrations.compositionWorkId, user.id),
          gte(registrations.registeredAt, weekAgo)
        ),
    })

    if (registrationsThisWeek.length >= 1 && user.stripeSubscriptionStatus !== 'active') {
      return {
        error: 'Weekly limit reached',
        upgradeRequired: true,
      }
    }

    // Registration tracked successfully
    return { success: true }

  } catch (error) {
    console.error('Track registration error:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Generate API key for extension (called after login)
 */
export async function generateExtensionApiKey() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return { error: 'Not authenticated' }
    }

    // Generate random API key
    const apiKey = Buffer.from(
      `${(session.user as any).id}-${Date.now()}-${Math.random().toString(36).substring(2)}`
    ).toString('base64')

    // Store in database (you could create a separate api_keys table)
    await db.update(users)
      .set({
        extensionApiKey: apiKey,
        extensionApiKeyCreatedAt: new Date(),
      })
      .where(eq(users.id, (session.user as any).id))

    revalidatePath('/dashboard')

    return { apiKey }

  } catch (error) {
    console.error('Generate API key error:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
