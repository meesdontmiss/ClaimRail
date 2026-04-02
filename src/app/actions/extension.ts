'use server'

import { revalidatePath } from 'next/cache'
import {
  generateExtensionApiKeyForSession,
  getExtensionAccessStatusForSession,
  getPendingExtensionSongsForApiKey as getPendingSongsForApiKey,
  trackExtensionRegistrationForApiKey,
} from '@/lib/extension-service'

export async function verifyExtensionAccess() {
  try {
    return await getExtensionAccessStatusForSession()
  } catch (error) {
    console.error('Extension verification error:', error)
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

export async function getExtensionSongData(apiKey?: string) {
  try {
    if (!apiKey) {
      return { error: 'API key required' }
    }

    return await getPendingSongsForApiKey(apiKey)
  } catch (error) {
    console.error('Get song data error:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function trackExtensionRegistration(apiKey?: string, recordingId?: string) {
  try {
    if (!apiKey) {
      return { error: 'API key required' }
    }

    if (!recordingId) {
      return { error: 'Recording ID required' }
    }

    return await trackExtensionRegistrationForApiKey(apiKey, recordingId)
  } catch (error) {
    console.error('Track registration error:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function generateExtensionApiKey() {
  try {
    const result = await generateExtensionApiKeyForSession()

    if ('success' in result && result.success) {
      revalidatePath('/dashboard')
    }

    return result
  } catch (error) {
    console.error('Generate API key error:', error)
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
