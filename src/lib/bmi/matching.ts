import { createHash } from 'node:crypto'

export interface SyncedBMIWriter {
  name: string
  ipi?: string | null
  role?: string | null
  share?: number | null
}

export interface SyncedBMIWork {
  externalWorkKey?: string
  bmiWorkId?: string | null
  title: string
  iswc?: string | null
  writers: SyncedBMIWriter[]
  performer?: string | null
  source?: string | null
  status?: string | null
  rawPayload?: Record<string, unknown> | null
}

export interface MatchableRecording {
  id: string
  title: string
  artist: string
  compositionWork?: {
    id: string
    title: string
    iswc?: string | null
    writers: Array<{
      name: string
      ipi?: string | null
    }>
  } | null
}

export interface BMIMatchCandidate {
  recordingId: string
  compositionWorkId: string | null
  externalWorkKey: string
  matchStrategy: string
  confidence: number
  notes: string
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value: string | null | undefined) {
  return new Set(
    normalizeText(value)
      .split(' ')
      .filter(Boolean)
  )
}

function overlapRatio(left: Set<string>, right: Set<string>) {
  if (left.size === 0 || right.size === 0) {
    return 0
  }

  let overlap = 0
  for (const token of left) {
    if (right.has(token)) {
      overlap += 1
    }
  }

  return overlap / Math.max(left.size, right.size)
}

export function buildExternalWorkKey(work: SyncedBMIWork) {
  const explicitId = work.bmiWorkId?.trim()
  if (explicitId) {
    return explicitId
  }

  const writerFingerprint = work.writers
    .map((writer) => normalizeText(writer.ipi || writer.name))
    .filter(Boolean)
    .sort()
    .join('|')

  const fallbackSeed = [normalizeText(work.title), normalizeText(work.iswc), writerFingerprint].join('::')
  return createHash('sha256').update(fallbackSeed).digest('hex').slice(0, 24)
}

function buildMatchCandidate(recording: MatchableRecording, work: SyncedBMIWork): BMIMatchCandidate | null {
  const recordingTitle = normalizeText(recording.compositionWork?.title || recording.title)
  const workTitle = normalizeText(work.title)

  const recordingWriterNames = new Set(
    (recording.compositionWork?.writers ?? [])
      .map((writer) => normalizeText(writer.name))
      .filter(Boolean)
  )
  const recordingWriterIpis = new Set(
    (recording.compositionWork?.writers ?? [])
      .map((writer) => normalizeText(writer.ipi))
      .filter(Boolean)
  )

  const workWriterNames = new Set(
    work.writers
      .map((writer) => normalizeText(writer.name))
      .filter(Boolean)
  )
  const workWriterIpis = new Set(
    work.writers
      .map((writer) => normalizeText(writer.ipi))
      .filter(Boolean)
  )

  const strategies: string[] = []
  let confidence = 0

  if (recording.compositionWork?.iswc && work.iswc && normalizeText(recording.compositionWork.iswc) === normalizeText(work.iswc)) {
    confidence += 70
    strategies.push('iswc')
  }

  if (recordingTitle && workTitle) {
    if (recordingTitle === workTitle) {
      confidence += 45
      strategies.push('exact_title')
    } else {
      const titleOverlap = overlapRatio(tokenize(recordingTitle), tokenize(workTitle))
      if (titleOverlap >= 0.8) {
        confidence += 30
        strategies.push('close_title')
      } else if (titleOverlap >= 0.6) {
        confidence += 18
        strategies.push('partial_title')
      }
    }
  }

  if (recordingWriterIpis.size > 0 && workWriterIpis.size > 0) {
    const ipiOverlap = overlapRatio(recordingWriterIpis, workWriterIpis)
    if (ipiOverlap > 0) {
      confidence += 35
      strategies.push('writer_ipi')
    }
  }

  if (recordingWriterNames.size > 0 && workWriterNames.size > 0) {
    const nameOverlap = overlapRatio(recordingWriterNames, workWriterNames)
    if (nameOverlap >= 0.75) {
      confidence += 30
      strategies.push('writer_name_strong')
    } else if (nameOverlap >= 0.4) {
      confidence += 18
      strategies.push('writer_name_partial')
    }
  }

  if (work.performer && overlapRatio(tokenize(recording.artist), tokenize(work.performer)) >= 0.5) {
    confidence += 12
    strategies.push('performer_hint')
  }

  if (confidence < 60) {
    return null
  }

  return {
    recordingId: recording.id,
    compositionWorkId: recording.compositionWork?.id ?? null,
    externalWorkKey: buildExternalWorkKey(work),
    matchStrategy: strategies.join('+') || 'heuristic',
    confidence: Math.min(confidence, 100),
    notes: `Matched "${recording.title}" to BMI work "${work.title}" via ${strategies.join(', ') || 'heuristic scoring'}.`,
  }
}

export function matchRecordingsToBMIWorks(recordings: MatchableRecording[], works: SyncedBMIWork[]) {
  const matches: BMIMatchCandidate[] = []

  for (const recording of recordings) {
    const candidates = works
      .map((work) => buildMatchCandidate(recording, work))
      .filter((candidate): candidate is BMIMatchCandidate => Boolean(candidate))
      .sort((left, right) => right.confidence - left.confidence)

    if (candidates[0]) {
      matches.push(candidates[0])
    }
  }

  return matches
}
