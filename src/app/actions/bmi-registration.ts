'use server'

import { db } from '@/lib/db'
import { recordings, compositionWorks, users, bmiRegistrations } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { registerWorkWithBMI, type BMIRegistrationData, validateBMICredentials } from '@/lib/bmi/client'
import { revalidatePath } from 'next/cache'
import { decryptSecret, encryptSecret } from '@/lib/crypto'

type StoredBMICredentials = {
  username: {
    iv: string
    content: string
    tag: string
  }
  password: {
    iv: string
    content: string
    tag: string
  }
}

function isStoredBMICredentials(value: unknown): value is StoredBMICredentials {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<StoredBMICredentials>
  return Boolean(
    candidate.username &&
    typeof candidate.username === 'object' &&
    candidate.password &&
    typeof candidate.password === 'object'
  )
}

/**
 * Register a recording's composition work with BMI automation
 */
export async function registerCompositionWithBMI(
  recordingId: string,
  userId: string
) {
  try {
    const recording = await db.query.recordings.findFirst({
      where: and(
        eq(recordings.id, recordingId),
        eq(recordings.userId, userId)
      ),
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
    });

    if (!recording) {
      return { success: false, error: 'Recording not found' };
    }

    if (!recording.compositionWork) {
      return {
        success: false,
        error: 'No composition work found for this recording'
      };
    }

    // Get user's encrypted BMI credentials from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user?.bmiCredentialsEncrypted || !isStoredBMICredentials(user.bmiCredentialsEncrypted)) {
      return {
        success: false,
        error: 'BMI credentials not configured. Please add them in settings.',
        requiresCredentials: true,
      };
    }

    // Prepare BMI registration data
    const compositionWork = recording.compositionWork;
    
    const bmiData: BMIRegistrationData = {
      workTitle: compositionWork.title,
      isrc: recording.isrc || undefined,
      writers: compositionWork.writers.map((writer) => ({
        name: writer.name,
        ipi: writer.ipi || undefined,
        pro: writer.pro || undefined,
        share: writer.splits[0]?.percentage || 0,
        role:
          writer.role === 'publisher'
            ? 'publisher'
            : writer.role === 'composer' || writer.role === 'arranger'
              ? 'composer'
              : 'writer',
      })),
    };

    // Validate writer shares total 100%
    const totalShares = bmiData.writers.reduce((sum, w) => sum + w.share, 0);
    if (Math.abs(totalShares - 100) > 0.01) {
      return {
        success: false,
        error: `Writer shares must total 100%. Current total: ${totalShares}%`,
      };
    }

    // Run BMI browser automation directly with Playwright
    const registrationResult = await registerWorkWithBMI(bmiData, {
      username: decryptSecret(user.bmiCredentialsEncrypted.username),
      password: decryptSecret(user.bmiCredentialsEncrypted.password),
    });

    if (!registrationResult.success) {
      return {
        success: false,
        error: registrationResult.error || 'BMI registration failed',
      };
    }

    // Update database with BMI registration info
    await db.update(compositionWorks)
      .set({
        proRegistered: true,
        iswc: registrationResult.workId || compositionWork.iswc,
      })
      .where(eq(compositionWorks.id, compositionWork.id));

    // Log the registration
    await db.insert(bmiRegistrations).values({
      compositionWorkId: compositionWork.id,
      confirmationNumber: registrationResult.confirmationNumber!,
      registeredAt: new Date(),
      status: 'success',
    });

    revalidatePath('/dashboard');
    revalidatePath('/register');

    return {
      success: true,
      confirmationNumber: registrationResult.confirmationNumber,
      message: 'Successfully registered with BMI!',
    };

  } catch (error) {
    console.error('BMI registration error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Batch register multiple compositions with BMI
 */
export async function batchRegisterWithBMI(
  recordingIds: string[],
  userId: string
) {
  const results = [];

  for (const recordingId of recordingIds) {
    const result = await registerCompositionWithBMI(recordingId, userId);
    results.push({
      recordingId,
      ...result,
    });

    // Add delay between registrations to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return {
    success: true,
    total: results.length,
    successCount,
    failCount,
    results,
  };
}

/**
 * Save user's BMI credentials (encrypted)
 */
export async function saveBMICredentials(
  userId: string,
  username: string,
  password: string
) {
  try {
    const encryptedUsername = await encryptCredential(username);
    const encryptedPassword = await encryptCredential(password);

    await db.update(users)
      .set({
        bmiCredentialsEncrypted: {
          username: encryptedUsername,
          password: encryptedPassword,
        },
      })
      .where(eq(users.id, userId));

    return { success: true, message: 'BMI credentials saved securely' };
  } catch (error) {
    console.error('Error saving BMI credentials:', error);
    return {
      success: false,
      error: 'Failed to save credentials',
    };
  }
}

export async function clearBMICredentials(userId: string) {
  try {
    await db.update(users)
      .set({
        bmiCredentialsEncrypted: null,
      })
      .where(eq(users.id, userId))

    return { success: true, message: 'BMI credentials removed' }
  } catch (error) {
    console.error('Error clearing BMI credentials:', error)
    return {
      success: false,
      error: 'Failed to clear credentials',
    }
  }
}

/**
 * Test BMI credentials by attempting login
 */
export async function testBMICredentials(userId: string) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user?.bmiCredentialsEncrypted || !isStoredBMICredentials(user.bmiCredentialsEncrypted)) {
      return {
        success: false,
        error: 'No BMI credentials found',
      };
    }

    const isValid = await validateBMICredentials({
      username: decryptSecret(user.bmiCredentialsEncrypted.username),
      password: decryptSecret(user.bmiCredentialsEncrypted.password),
    })

    if (isValid) {
      return { success: true, message: 'BMI credentials are valid!' };
    } else {
      return {
        success: false,
        error: 'BMI login failed. Please check your credentials.',
      };
    }
  } catch (error) {
    console.error('Error testing BMI credentials:', error);
    return {
      success: false,
      error: 'Failed to test credentials',
    };
  }
}

async function encryptCredential(credential: string) {
  return encryptSecret(credential)
}
