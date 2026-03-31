'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, bmiRegistrations } from '@/lib/db/schema'
import { eq, and, gte } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'

/**
 * Generate a new API key for extension access
 */
export async function generateExtensionAPIKey() {
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

    // Generate secure random API key
    const apiKey = `cr_${randomBytes(32).toString('hex')}`

    // Store in database
    await db.update(users)
      .set({
        extensionApiKey: apiKey,
        extensionApiKeyCreatedAt: new Date(),
      })
      .where(eq(users.id, user.id))

    revalidatePath('/dashboard/settings')

    return { 
      success: true, 
      apiKey,
      message: 'API key generated successfully'
    }

  } catch (error) {
    console.error('Generate API key error:', error)
    return { 
      error: error instanceof Error ? error.message : 'Failed to generate API key' 
    }
  }
}

/**
 * Revoke current API key
 */
export async function revokeExtensionAPIKey() {
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

    // Clear API key
    await db.update(users)
      .set({
        extensionApiKey: null,
        extensionApiKeyCreatedAt: null,
      })
      .where(eq(users.id, user.id))

    revalidatePath('/dashboard/settings')

    return { 
      success: true, 
      message: 'API key revoked successfully' 
    }

  } catch (error) {
    console.error('Revoke API key error:', error)
    return { 
      error: error instanceof Error ? error.message : 'Failed to revoke API key' 
    }
  }
}

/**
 * Verify API key and return subscription status
 * Called by Chrome extension to check access
 */
export async function verifyExtensionAPIKey(apiKey: string) {
  try {
    if (!apiKey) {
      return {
        valid: false,
        tier: 'none',
        message: 'No API key provided',
        requiresLogin: true,
      }
    }

    // Find user with this API key
    const user = await db.query.users.findFirst({
      where: eq(users.extensionApiKey, apiKey),
    })

    if (!user) {
      return {
        valid: false,
        tier: 'none',
        message: 'Invalid API key',
        requiresLogin: true,
      }
    }

    // Check if API key is expired (optional: add expiry logic)
    // For now, keys don't expire unless revoked

    // Check subscription status
    const isPro = user.stripeSubscriptionStatus === 'active'
    const tier = isPro ? 'pro' : 'free'

    // Count registrations this week (for free tier limit)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const registrationsThisWeek = await db.query.bmiRegistrations.findMany({
      where: and(
        gte(bmiRegistrations.registeredAt, weekAgo),
        // Note: You'd need to join with composition_works to filter by user
        // Simplified here - implement proper join in production
      ),
    })

    const count = registrationsThisWeek.length
    const weeklyLimit = isPro ? Infinity : 1
    const canRegister = isPro || count < weeklyLimit

    return {
      valid: true,
      tier,
      userId: user.id,
      email: user.email,
      weeklyLimit: isPro ? Infinity : 1,
      registrationsThisWeek: count,
      canRegister,
      message: isPro 
        ? 'Pro plan active - Unlimited registrations!' 
        : 'Free plan - 1 registration per week',
    }

  } catch (error) {
    console.error('Verify API key error:', error)
    return {
      valid: false,
      tier: 'none',
      message: 'Verification failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get extension usage stats for user
 */
export async function getExtensionUsageStats() {
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

    // Get API key status
    const hasApiKey = !!user.extensionApiKey
    const apiKeyCreatedAt = user.extensionApiKeyCreatedAt

    // Count registrations this week
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    // Get all user's recordings
    const userRecordings: any = await db.query.recordings.findMany({
      where: eq(users.id, user.id),
      with: {
        compositionWork: true,
      },
    })

    const compositionWorkIds = userRecordings
      .filter((r: any) => r.compositionWork)
      .map((r: any) => r.compositionWork!.id)

    const registrationsThisWeek = await db.query.bmiRegistrations.findMany({
      where: and(
        gte(bmiRegistrations.registeredAt, weekAgo),
        // Filter by user's composition works
      ),
    })

    const count = registrationsThisWeek.length
    const isPro = user.stripeSubscriptionStatus === 'active'
    const weeklyLimit = isPro ? Infinity : 1
    const weeklyRemaining = isPro ? Infinity : Math.max(0, weeklyLimit - count)

    return {
      hasApiKey,
      apiKeyCreatedAt,
      subscriptionTier: isPro ? 'pro' : 'free',
      registrationsThisWeek: count,
      weeklyLimit: isPro ? Infinity : 1,
      weeklyRemaining,
      isPro,
    }

  } catch (error) {
    console.error('Get usage stats error:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Track extension registration (for free tier limit)
 */
export async function trackExtensionRegistration(compositionWorkId: string) {
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

    const userRecordings: any = await db.query.recordings.findMany({
      where: eq(users.id, user.id),
      with: { compositionWork: true },
    })

    const compositionWorkIds = userRecordings
      .filter((r: any) => r.compositionWork)
      .map((r: any) => r.compositionWork!.id)

    const registrationsThisWeek = await db.query.bmiRegistrations.findMany({
      where: and(
        gte(bmiRegistrations.registeredAt, weekAgo),
        // Filter by user's works
      ),
    })

    const count = registrationsThisWeek.length
    const isPro = user.stripeSubscriptionStatus === 'active'

    if (count >= 1 && !isPro) {
      return {
        error: 'Weekly limit reached',
        upgradeRequired: true,
        currentCount: count,
        weeklyLimit: 1,
      }
    }

    // Track the registration
    // Note: This would be called after successful BMI registration
    return { success: true, count: count + 1 }

  } catch (error) {
    console.error('Track registration error:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
