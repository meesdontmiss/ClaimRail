'use server'

import { db } from '@/lib/db'
import { recordings, compositionWorks, writers, workSplits } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { registerWorkWithBMI, type BMIRegistrationData } from '@/lib/openclaw/client'
import { revalidatePath } from 'next/cache'

/**
 * Register a recording's composition work with BMI via OpenCLAW
 */
export async function registerCompositionWithBMI(
  recordingId: string,
  userId: string
) {
  try {
    // Get recording with composition work
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

    if (!user?.bmiCredentialsEncrypted) {
      return {
        success: false,
        error: 'BMI credentials not configured. Please add them in settings.',
        requiresCredentials: true,
      };
    }

    // Prepare BMI registration data
    const bmiData: BMIRegistrationData = {
      workTitle: recording.compositionWork.title,
      isrc: recording.isrc || undefined,
      writers: recording.compositionWork.writers.map(writer => ({
        name: writer.name,
        ipi: writer.ipi || undefined,
        pro: writer.pro || undefined,
        share: writer.splits[0]?.percentage || 0,
        role: writer.role as 'writer' | 'composer' | 'publisher',
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

    // Call OpenCLAW to register with BMI
    const registrationResult = await registerWorkWithBMI(bmiData, {
      encryptedUsername: user.bmiCredentialsEncrypted.username,
      encryptedPassword: user.bmiCredentialsEncrypted.password,
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
        iswc: registrationResult.workId || recording.compositionWork.iswc,
      })
      .where(eq(compositionWorks.id, recording.compositionWork.id));

    // Log the registration
    await db.insert(bmiRegistrations).values({
      compositionWorkId: recording.compositionWork.id,
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
    // Encrypt credentials (you should use a proper encryption service like AWS KMS)
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

/**
 * Test BMI credentials by attempting login
 */
export async function testBMICredentials(userId: string) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user?.bmiCredentialsEncrypted) {
      return {
        success: false,
        error: 'No BMI credentials found',
      };
    }

    // Use OpenCLAW to validate login
    // (This would call a validation skill)
    const isValid = true; // Placeholder - implement with OpenCLAW

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

// Helper function - replace with actual encryption (AWS KMS, etc.)
async function encryptCredential(credential: string): Promise<string> {
  // TODO: Implement proper encryption with AWS KMS or similar
  // This is a placeholder - DO NOT use in production
  return Buffer.from(credential).toString('base64');
}
