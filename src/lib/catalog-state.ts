import { CatalogIssue, ClaimTask, ClaimTaskStatus, Recording, Writer } from '@/lib/types'

type RecordingWithRelations = {
  id: string
  spotifyId: string | null
  title: string
  artist: string
  album: string | null
  albumArt: string | null
  ownershipStatus: string | null
  ownershipNote: string | null
  isrc: string | null
  releaseDate: string | Date | null
  duration: string | null
  claimReadinessScore: number | null
  importedAt: string | Date | null
  compositionWork?: {
    id: string
    title: string
    pro: string | null
    proRegistered: boolean | null
    adminRegistered: boolean | null
    iswc: string | null
    bmiRegistrations?: Array<{
      confirmationNumber: string
      registeredAt: string | Date
      status: string
    }>
    writers: Array<{
      id: string
      name: string
      pro: string | null
      ipi: string | null
      role: 'writer' | 'composer' | 'producer' | 'publisher' | 'lyricist' | 'composer_lyricist' | 'arranger' | null
      splits: Array<{
        percentage: number
      }>
    }>
  } | null
  catalogIssues?: Array<{
    id: string
    recordingId: string
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    title: string
    description: string
    actionLabel: string | null
    resolved: boolean | null
  }>
  claimTasks?: Array<{
    id: string
    recordingId: string
    title: string
    description: string
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
    createdDate: string | Date | null
    completedAt: string | Date | null
  }>
  automationJobs?: Array<{
    status: 'queued' | 'claimed' | 'running' | 'completed' | 'failed' | 'needs_human' | 'cancelled'
  }>
  bmiCatalogMatches?: Array<{
    verified: boolean
    createdAt: string | Date
    bmiCatalogWork: {
      bmiWorkId: string | null
      title: string
      iswc: string | null
      lastSeenAt: string | Date
      source: string
    } | null
  }>
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value.slice(0, 10)
  }

  return value.toISOString().slice(0, 10)
}

function normalizeIssueType(type: string): CatalogIssue['type'] {
  switch (type) {
    case 'missing_writer':
    case 'invalid_splits':
    case 'no_composition_work':
    case 'missing_pro_admin':
    case 'duplicate_work':
    case 'incomplete_registration':
    case 'missing_isrc':
    case 'missing_release_date':
      return type
    default:
      return 'missing_pro_admin'
  }
}

function normalizeIssueSeverity(severity: 'low' | 'medium' | 'high' | 'critical'): CatalogIssue['severity'] {
  if (severity === 'critical') {
    return 'high'
  }

  return severity
}

function normalizeTaskStatus(status: ClaimTask['status'] | 'cancelled'): ClaimTaskStatus {
  if (status === 'cancelled') {
    return 'cancelled'
  }

  return status
}

function deriveBMIRegistrationMeta(
  recording: RecordingWithRelations
): Pick<
  NonNullable<Recording['compositionWork']>,
  | 'bmiRegistrationStatus'
  | 'bmiConfirmationNumber'
  | 'bmiRegisteredAt'
  | 'bmiVerificationSource'
  | 'bmiMatchedWorkId'
  | 'bmiMatchedWorkTitle'
  | 'bmiMatchedIswc'
  | 'bmiLastVerifiedAt'
> {
  const compositionWork = recording.compositionWork
  const latestCatalogMatch = [...(recording.bmiCatalogMatches ?? [])]
    .filter((match) => match.verified && match.bmiCatalogWork)
    .sort(
      (left, right) =>
        new Date(right.bmiCatalogWork?.lastSeenAt ?? right.createdAt).getTime() -
        new Date(left.bmiCatalogWork?.lastSeenAt ?? left.createdAt).getTime()
    )[0]

  if (!compositionWork && !latestCatalogMatch?.bmiCatalogWork) {
    return {
      bmiRegistrationStatus: recording.automationJobs?.some((job) =>
        ['queued', 'claimed', 'running'].includes(job.status)
      )
        ? 'pending'
        : 'needs_registration',
      bmiConfirmationNumber: null,
      bmiRegisteredAt: null,
      bmiVerificationSource: null,
      bmiMatchedWorkId: null,
      bmiMatchedWorkTitle: null,
      bmiMatchedIswc: null,
      bmiLastVerifiedAt: null,
    }
  }

  const latestBMIRegistration = [...(compositionWork?.bmiRegistrations ?? [])]
    .sort(
      (left, right) =>
        new Date(right.registeredAt).getTime() - new Date(left.registeredAt).getTime()
    )[0]

  if (latestBMIRegistration?.status === 'success' && compositionWork) {
    return {
      bmiRegistrationStatus: 'confirmed',
      bmiConfirmationNumber: latestBMIRegistration.confirmationNumber,
      bmiRegisteredAt: formatDate(latestBMIRegistration.registeredAt),
      bmiVerificationSource: 'registration',
      bmiMatchedWorkId: compositionWork.iswc ?? null,
      bmiMatchedWorkTitle: compositionWork.title,
      bmiMatchedIswc: compositionWork.iswc ?? null,
      bmiLastVerifiedAt: formatDate(latestBMIRegistration.registeredAt),
    }
  }

  if (latestCatalogMatch?.bmiCatalogWork) {
    return {
      bmiRegistrationStatus: 'confirmed',
      bmiConfirmationNumber: null,
      bmiRegisteredAt: formatDate(latestCatalogMatch.bmiCatalogWork.lastSeenAt),
      bmiVerificationSource: 'catalog_sync',
      bmiMatchedWorkId: latestCatalogMatch.bmiCatalogWork.bmiWorkId ?? null,
      bmiMatchedWorkTitle: latestCatalogMatch.bmiCatalogWork.title,
      bmiMatchedIswc: latestCatalogMatch.bmiCatalogWork.iswc ?? null,
      bmiLastVerifiedAt: formatDate(latestCatalogMatch.bmiCatalogWork.lastSeenAt),
    }
  }

  if (latestBMIRegistration?.status === 'pending') {
    return {
      bmiRegistrationStatus: 'pending',
      bmiConfirmationNumber: latestBMIRegistration.confirmationNumber,
      bmiRegisteredAt: formatDate(latestBMIRegistration.registeredAt),
      bmiVerificationSource: null,
      bmiMatchedWorkId: null,
      bmiMatchedWorkTitle: null,
      bmiMatchedIswc: null,
      bmiLastVerifiedAt: null,
    }
  }

  if (recording.automationJobs?.some((job) => ['queued', 'claimed', 'running'].includes(job.status))) {
    return {
      bmiRegistrationStatus: 'pending',
      bmiConfirmationNumber: null,
      bmiRegisteredAt: null,
      bmiVerificationSource: null,
      bmiMatchedWorkId: null,
      bmiMatchedWorkTitle: null,
      bmiMatchedIswc: null,
      bmiLastVerifiedAt: null,
    }
  }

  if (compositionWork?.proRegistered && compositionWork.pro?.trim().toUpperCase() === 'BMI') {
    return {
      bmiRegistrationStatus: 'unverified',
      bmiConfirmationNumber: null,
      bmiRegisteredAt: null,
      bmiVerificationSource: null,
      bmiMatchedWorkId: null,
      bmiMatchedWorkTitle: null,
      bmiMatchedIswc: null,
      bmiLastVerifiedAt: null,
    }
  }

  return {
    bmiRegistrationStatus: 'needs_registration',
    bmiConfirmationNumber: null,
    bmiRegisteredAt: null,
    bmiVerificationSource: null,
    bmiMatchedWorkId: null,
    bmiMatchedWorkTitle: null,
    bmiMatchedIswc: null,
    bmiLastVerifiedAt: null,
  }
}

export function createIssueTemplate(recording: Pick<Recording, 'id' | 'title' | 'artist' | 'isrc' | 'releaseDate' | 'compositionWork'>): CatalogIssue[] {
  const issues: CatalogIssue[] = []
  const hasCompositionWork = Boolean(recording.compositionWork)
  const hasWriters = Boolean(recording.compositionWork?.writers?.length)
  const hasProRegistration = Boolean(recording.compositionWork?.proRegistered)
  const hasAdminRegistration = Boolean(recording.compositionWork?.adminRegistered)

  if (!recording.isrc) {
    issues.push({
      id: crypto.randomUUID(),
      recordingId: recording.id,
      type: 'missing_isrc',
      severity: 'high',
      title: 'Missing ISRC code',
      description: "This recording has no ISRC. Without it, royalty systems can't match payments to this song.",
      actionLabel: 'Add ISRC',
      resolved: false,
    })
  }

  if (!recording.releaseDate) {
    issues.push({
      id: crypto.randomUUID(),
      recordingId: recording.id,
      type: 'missing_release_date',
      severity: 'medium',
      title: 'Missing release date',
      description: 'No release date is set. Some registries require this to process claims.',
      actionLabel: 'Add release date',
      resolved: false,
    })
  }

  if (!hasCompositionWork) {
    issues.push({
      id: crypto.randomUUID(),
      recordingId: recording.id,
      type: 'no_composition_work',
      severity: 'high',
      title: 'No linked composition',
      description: "There's no composition work tied to this recording. Publishing royalties require a registered composition.",
      actionLabel: 'Create composition',
      resolved: false,
    })

  }

  if (!hasWriters) {
    issues.push({
      id: crypto.randomUUID(),
      recordingId: recording.id,
      type: 'missing_writer',
      severity: 'high',
      title: 'Missing songwriter info',
      description: "No songwriter is listed for this song. Without writer info, you can't collect publishing royalties.",
      actionLabel: 'Add songwriter',
      resolved: false,
    })
  }

  if (!hasProRegistration || !hasAdminRegistration) {
    issues.push({
      id: crypto.randomUUID(),
      recordingId: recording.id,
      type: 'missing_pro_admin',
      severity: 'high',
      title: 'Not registered with BMI/ASCAP or Songtrust',
      description: "This song isn't fully registered with a PRO and publishing admin. Performance and mechanical royalties are likely going uncollected.",
      actionLabel: 'Register now',
      resolved: false,
    })
  }

  return issues
}

export function buildTaskFromIssue(recordingTitle: string, issue: CatalogIssue): Omit<ClaimTask, 'id' | 'createdAt' | 'completedAt'> {
  switch (issue.type) {
    case 'missing_writer':
      return {
        recordingId: issue.recordingId,
        title: `Add songwriter info for "${recordingTitle}"`,
        description: 'Add writer names, PRO affiliations, and IPI details so this composition can be registered.',
        status: 'pending',
      }
    case 'invalid_splits':
      return {
        recordingId: issue.recordingId,
        title: `Fix writer splits for "${recordingTitle}"`,
        description: 'Ownership percentages must total 100% before registration.',
        status: 'pending',
      }
    case 'no_composition_work':
      return {
        recordingId: issue.recordingId,
        title: `Create composition work for "${recordingTitle}"`,
        description: 'Link this recording to its composition so publishing royalties can be claimed.',
        status: 'pending',
      }
    case 'missing_pro_admin':
      return {
        recordingId: issue.recordingId,
        title: `Prepare registration for "${recordingTitle}"`,
        description: 'Add PRO or publishing admin details so performance and mechanical royalties can be collected.',
        status: 'pending',
      }
    case 'missing_isrc':
      return {
        recordingId: issue.recordingId,
        title: `Add ISRC for "${recordingTitle}"`,
        description: 'Add the official ISRC so downstream royalty systems can match this recording.',
        status: 'pending',
      }
    case 'missing_release_date':
      return {
        recordingId: issue.recordingId,
        title: `Add release date for "${recordingTitle}"`,
        description: 'Release dates are often required for registrations and audits.',
        status: 'pending',
      }
    case 'incomplete_registration':
      return {
        recordingId: issue.recordingId,
        title: `Complete registration details for "${recordingTitle}"`,
        description: 'Finish the metadata needed to fully register this work.',
        status: 'pending',
      }
    default:
      return {
        recordingId: issue.recordingId,
        title: `Review "${recordingTitle}"`,
        description: issue.description,
        status: 'pending',
      }
  }
}

export function toAppRecording(recording: RecordingWithRelations): Recording {
  const bmiRegistrationMeta = deriveBMIRegistrationMeta(recording)
  const compositionWorkSource = recording.compositionWork
    ? recording.compositionWork
    : bmiRegistrationMeta.bmiVerificationSource === 'catalog_sync'
      ? {
          id: `bmi-sync-${recording.id}`,
          title: recording.title,
          pro: 'BMI',
          proRegistered: true,
          adminRegistered: false,
          iswc: bmiRegistrationMeta.bmiMatchedIswc ?? null,
          writers: [],
        }
      : null

  const compositionWork = compositionWorkSource
      ? {
        id: compositionWorkSource.id,
        title: compositionWorkSource.title,
        pro: compositionWorkSource.pro ?? null,
        proRegistered: Boolean(compositionWorkSource.proRegistered),
        adminRegistered: Boolean(compositionWorkSource.adminRegistered),
        iswc: compositionWorkSource.iswc ?? null,
        bmiRegistrationStatus: bmiRegistrationMeta.bmiRegistrationStatus,
        bmiConfirmationNumber: bmiRegistrationMeta.bmiConfirmationNumber,
        bmiRegisteredAt: bmiRegistrationMeta.bmiRegisteredAt,
        bmiVerificationSource: bmiRegistrationMeta.bmiVerificationSource,
        bmiMatchedWorkId: bmiRegistrationMeta.bmiMatchedWorkId,
        bmiMatchedWorkTitle: bmiRegistrationMeta.bmiMatchedWorkTitle,
        bmiMatchedIswc: bmiRegistrationMeta.bmiMatchedIswc,
        bmiLastVerifiedAt: bmiRegistrationMeta.bmiLastVerifiedAt,
        writers: compositionWorkSource.writers.map((writer) => ({
          id: writer.id,
          name: writer.name,
          pro: writer.pro ?? null,
          ipi: writer.ipi ?? null,
          role: writer.role ?? 'writer',
        })),
        splits: compositionWorkSource.writers.flatMap((writer) =>
          writer.splits.map((split) => ({
            writerId: writer.id,
            writerName: writer.name,
            percentage: split.percentage,
          }))
        ),
      }
    : null

  return {
    id: recording.id,
    spotifyId: recording.spotifyId,
    title: recording.title,
    artist: recording.artist,
    album: recording.album ?? '',
    albumArt: recording.albumArt ?? null,
    ownershipStatus: recording.ownershipStatus === 'not_mine' ? 'not_mine' : 'owned',
    ownershipNote: recording.ownershipNote ?? null,
    isrc: recording.isrc ?? null,
    releaseDate: formatDate(recording.releaseDate),
    duration: recording.duration ?? null,
    claimReadinessScore: recording.claimReadinessScore ?? 0,
    importedAt: formatDate(recording.importedAt) ?? new Date().toISOString().slice(0, 10),
    compositionWork,
    issues: (recording.catalogIssues ?? []).map((issue) => ({
      id: issue.id,
      recordingId: issue.recordingId,
      type: normalizeIssueType(issue.type),
      severity: normalizeIssueSeverity(issue.severity),
      title: issue.title,
      description: issue.description,
      actionLabel: issue.actionLabel ?? 'Review',
      resolved: Boolean(issue.resolved),
    })),
  }
}

export function toAppTasks(recordings: RecordingWithRelations[]): ClaimTask[] {
  return recordings
    .flatMap((recording) => recording.claimTasks ?? [])
    .map((task) => ({
      id: task.id,
      recordingId: task.recordingId,
      title: task.title,
      description: task.description,
      status: normalizeTaskStatus(task.status),
      createdAt: formatDate(task.createdDate) ?? new Date().toISOString().slice(0, 10),
      completedAt: formatDate(task.completedAt),
    }))
    .sort((left, right) => {
      if (left.status === 'completed' && right.status !== 'completed') {
        return 1
      }

      if (left.status !== 'completed' && right.status === 'completed') {
        return -1
      }

      return right.createdAt.localeCompare(left.createdAt)
    })
}
