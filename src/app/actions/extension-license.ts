'use server'

import { revalidatePath } from 'next/cache'
import {
  generateExtensionApiKeyForSession,
  getExtensionAccessStatusForApiKey,
  getExtensionUsageStatsForSession,
  revokeExtensionApiKeyForSession,
  trackExtensionRegistrationForApiKey,
} from '@/lib/extension-service'

export async function generateExtensionAPIKey() {
  try {
    const result = await generateExtensionApiKeyForSession()

    if ('success' in result && result.success) {
      revalidatePath('/dashboard/settings')
    }

    return result
  } catch (error) {
    console.error('Generate API key error:', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to generate API key',
    }
  }
}

export async function revokeExtensionAPIKey() {
  try {
    const result = await revokeExtensionApiKeyForSession()

    if ('success' in result && result.success) {
      revalidatePath('/dashboard/settings')
    }

    return result
  } catch (error) {
    console.error('Revoke API key error:', error)
    return {
      error: error instanceof Error ? error.message : 'Failed to revoke API key',
    }
  }
}

export async function verifyExtensionAPIKey(apiKey: string) {
  try {
    return await getExtensionAccessStatusForApiKey(apiKey)
  } catch (error) {
    console.error('Verify API key error:', error)
    return {
      valid: false,
      tier: 'none' as const,
      weeklyLimit: 0,
      registrationsThisWeek: 0,
      canRegister: false,
      isUnlimited: false,
      message: 'Verification failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function getExtensionUsageStats() {
  try {
    return await getExtensionUsageStatsForSession()
  } catch (error) {
    console.error('Get usage stats error:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function trackExtensionRegistration(apiKey: string, recordingId: string) {
  try {
    return await trackExtensionRegistrationForApiKey(apiKey, recordingId)
  } catch (error) {
    console.error('Track registration error:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
