import { randomBytes } from 'crypto'
import { and, eq, gte, or } from 'drizzle-orm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { bmiRegistrations, compositionWorks, recordings, users } from '@/lib/db/schema'
import { hashApiKey } from '@/lib/crypto'

const FREE_WEEKLY_LIMIT = 1

type DBUser = typeof users.$inferSelect

export interface ExtensionAccessStatus {
  valid: boolean
  tier: 'free' | 'pro' | 'none'
  weeklyLimit: number | null
  registrationsThisWeek: number
  canRegister: boolean
  isUnlimited: boolean
  message: string
  email?: string | null
  userId?: string
  requiresLogin?: boolean
  requiresLicense?: boolean
  error?: string
}

export interface ExtensionSong {
  id: string
  title: string
  artist: string
  isrc: string | null
  writers: Array<{
    name: string
    ipi: string | null
    pro: string | null
    share: number
    role: string | null
  }>
}

function isBMIRegisteredWork(work: { proRegistered: boolean | null; pro: string | null }) {
  return Boolean(work.proRegistered) && work.pro?.trim().toUpperCase() === 'BMI'
}

function isProUser(user: DBUser) {
  return user.stripeSubscriptionStatus === 'active'
}

async function countWeeklyRegistrationsForUser(userId: string) {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const registrationsThisWeek = await db
    .select({ id: bmiRegistrations.id })
    .from(bmiRegistrations)
    .innerJoin(
      compositionWorks,
      eq(bmiRegistrations.compositionWorkId, compositionWorks.id)
    )
    .innerJoin(
      recordings,
      eq(compositionWorks.recordingId, recordings.id)
    )
    .where(
      and(
        eq(recordings.userId, userId),
        gte(bmiRegistrations.registeredAt, weekAgo)
      )
    )

  return registrationsThisWeek.length
}

async function buildAccessStatus(user: DBUser): Promise<ExtensionAccessStatus> {
  const registrationsThisWeek = await countWeeklyRegistrationsForUser(user.id)
  const pro = isProUser(user)

  return {
    valid: true,
    tier: pro ? 'pro' : 'free',
    weeklyLimit: pro ? null : FREE_WEEKLY_LIMIT,
    registrationsThisWeek,
    canRegister: pro || registrationsThisWeek < FREE_WEEKLY_LIMIT,
    isUnlimited: pro,
    message: pro
      ? 'Pro plan active - unlimited registrations.'
      : 'Free plan - 1 registration per week.',
    email: user.email,
    userId: user.id,
  }
}

async function getCurrentSessionUserRecord() {
  const session = await getServerSession(authOptions)
  const spotifyId = session?.user?.id

  if (!spotifyId) {
    return null
  }

  return db.query.users.findFirst({
    where: eq(users.spotifyId, spotifyId),
  })
}

export async function getExtensionAccessStatusForSession() {
  const user = await getCurrentSessionUserRecord()

  if (!user) {
    return {
      valid: false,
      tier: 'none',
      weeklyLimit: 0,
      registrationsThisWeek: 0,
      canRegister: false,
      isUnlimited: false,
      message: 'Not logged in',
      requiresLogin: true,
    } satisfies ExtensionAccessStatus
  }

  return buildAccessStatus(user)
}

export async function getExtensionUsageStatsForSession() {
  const user = await getCurrentSessionUserRecord()

  if (!user) {
    return { error: 'Not authenticated' as const }
  }

  const access = await buildAccessStatus(user)

  return {
    hasApiKey: !!user.extensionApiKey,
    apiKeyCreatedAt: user.extensionApiKeyCreatedAt,
    subscriptionTier: access.tier,
    registrationsThisWeek: access.registrationsThisWeek,
    weeklyLimit: access.weeklyLimit,
    weeklyRemaining: access.isUnlimited
      ? null
      : Math.max(0, FREE_WEEKLY_LIMIT - access.registrationsThisWeek),
    isPro: access.isUnlimited,
  }
}

export async function generateExtensionApiKeyForSession() {
  const user = await getCurrentSessionUserRecord()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const apiKey = `cr_${randomBytes(32).toString('hex')}`
  const apiKeyHash = hashApiKey(apiKey)

  await db
    .update(users)
    .set({
      extensionApiKey: apiKeyHash,
      extensionApiKeyCreatedAt: new Date(),
    })
    .where(eq(users.id, user.id))

  return {
    success: true,
    apiKey,
    message: 'API key generated successfully',
  }
}

export async function revokeExtensionApiKeyForSession() {
  const user = await getCurrentSessionUserRecord()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  await db
    .update(users)
    .set({
      extensionApiKey: null,
      extensionApiKeyCreatedAt: null,
    })
    .where(eq(users.id, user.id))

  return {
    success: true,
    message: 'API key revoked successfully',
  }
}

export async function getExtensionAccessStatusForApiKey(apiKey: string) {
  if (!apiKey) {
    return {
      valid: false,
      tier: 'none',
      weeklyLimit: 0,
      registrationsThisWeek: 0,
      canRegister: false,
      isUnlimited: false,
      message: 'No API key provided',
      requiresLicense: true,
    } satisfies ExtensionAccessStatus
  }

  const user = await db.query.users.findFirst({
    where: or(
      eq(users.extensionApiKey, hashApiKey(apiKey)),
      eq(users.extensionApiKey, apiKey)
    ),
  })

  if (!user) {
    return {
      valid: false,
      tier: 'none',
      weeklyLimit: 0,
      registrationsThisWeek: 0,
      canRegister: false,
      isUnlimited: false,
      message: 'Invalid API key',
      requiresLicense: true,
    } satisfies ExtensionAccessStatus
  }

  return buildAccessStatus(user)
}

async function getUserFromApiKey(apiKey: string) {
  const access = await getExtensionAccessStatusForApiKey(apiKey)

  if (!access.valid || !access.userId) {
    return { access, user: null }
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, access.userId),
  })

  return { access, user }
}

export async function getPendingExtensionSongsForApiKey(apiKey: string) {
  const { access, user } = await getUserFromApiKey(apiKey)

  if (!access.valid || !user) {
    return { error: access.message }
  }

  const userRecordings = await db.query.recordings.findMany({
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
    orderBy: (table, operators) => [operators.desc(table.createdAt)],
  })

  const songs: ExtensionSong[] = userRecordings
    .filter((recording) => recording.compositionWork && !isBMIRegisteredWork(recording.compositionWork))
    .map((recording) => ({
      id: recording.id,
      title: recording.compositionWork!.title,
      artist: recording.artist,
      isrc: recording.isrc ?? null,
      writers: recording.compositionWork!.writers.map((writer) => ({
        name: writer.name,
        ipi: writer.ipi ?? null,
        pro: writer.pro ?? null,
        share: writer.splits[0]?.percentage ?? 0,
        role: writer.role ?? null,
      })),
    }))

  return {
    songs,
    count: songs.length,
    tier: access.tier,
    canRegister: access.canRegister,
  }
}

export async function trackExtensionRegistrationForApiKey(apiKey: string, recordingId: string) {
  const { access, user } = await getUserFromApiKey(apiKey)

  if (!access.valid || !user) {
    return { error: access.message }
  }

  if (!recordingId) {
    return { error: 'Recording ID is required' }
  }

  if (!access.canRegister) {
    return {
      error: 'Weekly limit reached',
      upgradeRequired: true,
      currentCount: access.registrationsThisWeek,
      weeklyLimit: FREE_WEEKLY_LIMIT,
    }
  }

  const recording = await db.query.recordings.findFirst({
    where: and(eq(recordings.id, recordingId), eq(recordings.userId, user.id)),
    with: {
      compositionWork: true,
    },
  })

  if (!recording?.compositionWork) {
    return { error: 'Recording is missing composition data' }
  }

  await db.insert(bmiRegistrations).values({
    compositionWorkId: recording.compositionWork.id,
    confirmationNumber: `ext_${randomBytes(12).toString('hex')}`,
    status: 'pending',
    registeredAt: new Date(),
  })

  return {
    success: true,
    registrationsThisWeek: access.registrationsThisWeek + 1,
    weeklyLimit: access.weeklyLimit,
    canRegister: access.isUnlimited || access.registrationsThisWeek + 1 < FREE_WEEKLY_LIMIT,
  }
}

export function getExtensionApiKeyFromRequest(request: Request) {
  const authorization = request.headers.get('authorization')

  if (!authorization?.toLowerCase().startsWith('bearer ')) {
    return null
  }

  const apiKey = authorization.slice(7).trim()
  return apiKey || null
}
