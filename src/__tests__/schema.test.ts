import { describe, it, expect } from 'vitest'
import {
  users,
  recordings,
  compositionWorks,
  writers,
  workSplits,
  catalogIssues,
  claimTasks,
  automationJobs,
  automationJobEvents,
  automationWorkerHeartbeats,
} from '@/lib/db/schema'

describe('Database Schema', () => {
  it('should have all required tables defined', () => {
    expect(users).toBeDefined()
    expect(recordings).toBeDefined()
    expect(compositionWorks).toBeDefined()
    expect(writers).toBeDefined()
    expect(workSplits).toBeDefined()
    expect(catalogIssues).toBeDefined()
    expect(claimTasks).toBeDefined()
    expect(automationJobs).toBeDefined()
    expect(automationJobEvents).toBeDefined()
    expect(automationWorkerHeartbeats).toBeDefined()
  })

  it('should have correct column definitions for users table', () => {
    expect(users.id).toBeDefined()
    expect(users.spotifyId).toBeDefined()
    expect(users.email).toBeDefined()
    expect(users.name).toBeDefined()
    expect(users.stripeCustomerId).toBeDefined()
    expect(users.stripeSubscriptionId).toBeDefined()
    expect(users.stripeSubscriptionStatus).toBeDefined()
    expect(users.bmiCredentialsEncrypted).toBeDefined()
    expect(users.extensionApiKey).toBeDefined()
  })

  it('should have correct column definitions for recordings table', () => {
    expect(recordings.id).toBeDefined()
    expect(recordings.userId).toBeDefined()
    expect(recordings.spotifyId).toBeDefined()
    expect(recordings.title).toBeDefined()
    expect(recordings.artist).toBeDefined()
    expect(recordings.isrc).toBeDefined()
    expect(recordings.claimReadinessScore).toBeDefined()
  })

  it('should have correct column definitions for automation jobs table', () => {
    expect(automationJobs.id).toBeDefined()
    expect(automationJobs.userId).toBeDefined()
    expect(automationJobs.recordingId).toBeDefined()
    expect(automationJobs.type).toBeDefined()
    expect(automationJobs.status).toBeDefined()
    expect(automationJobs.attempts).toBeDefined()
    expect(automationJobs.maxAttempts).toBeDefined()
    expect(automationJobs.workerId).toBeDefined()
    expect(automationJobs.payload).toBeDefined()
    expect(automationJobs.result).toBeDefined()
    expect(automationJobs.lastError).toBeDefined()
  })
})
