import { relations } from 'drizzle-orm'
import { pgTable, uuid, text, integer, boolean, date, timestamp, pgEnum, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core'

// Enums
export const issueSeverityEnum = pgEnum('issue_severity', ['low', 'medium', 'high', 'critical'])
export const issueTypeEnum = pgEnum('issue_type', [
  'missing_isrc',
  'missing_release_date',
  'missing_writer',
  'missing_writers',
  'missing_pro_admin',
  'missing_pro_registration',
  'missing_admin',
  'no_composition_work',
  'invalid_splits',
  'incomplete_splits',
  'incomplete_registration',
  'metadata_mismatch',
  'duplicate_work',
  'duplicate_isrc',
  'other'
])
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'completed', 'cancelled'])
export const writerRoleEnum = pgEnum('writer_role', [
  'writer',
  'composer',
  'producer',
  'publisher',
  'lyricist',
  'composer_lyricist',
  'arranger'
])
export const automationJobTypeEnum = pgEnum('automation_job_type', ['bmi_registration'])
export const automationJobStatusEnum = pgEnum('automation_job_status', [
  'queued',
  'claimed',
  'running',
  'completed',
  'failed',
  'needs_human',
  'cancelled'
])
export const automationEventLevelEnum = pgEnum('automation_event_level', ['info', 'warning', 'error'])

// Users table (linked to NextAuth/Spotify)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  spotifyId: text('spotify_id').unique(),
  email: text('email').unique(),
  name: text('name'),
  image: text('image'),
  bmiCredentialsEncrypted: jsonb('bmi_credentials_encrypted'), // { username: string, password: string }
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeSubscriptionStatus: text('stripe_subscription_status'),
  extensionApiKey: text('extension_api_key').unique(),
  extensionApiKeyCreatedAt: timestamp('extension_api_key_created_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

// Recordings (imported tracks from Spotify)
export const recordings = pgTable('recordings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  spotifyId: text('spotify_id'),
  title: text('title').notNull(),
  artist: text('artist').notNull(),
  album: text('album'),
  isrc: text('isrc'),
  releaseDate: date('release_date'),
  duration: text('duration'),
  claimReadinessScore: integer('claim_readiness_score').default(0),
  importedAt: date('imported_at').defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
}, (table) => [
  index('recordings_user_id_idx').on(table.userId),
  uniqueIndex('recordings_user_spotify_id_idx').on(table.userId, table.spotifyId),
])

// Composition Works (publishing entities)
export const compositionWorks = pgTable('composition_works', {
  id: uuid('id').primaryKey().defaultRandom(),
  recordingId: uuid('recording_id').references(() => recordings.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  proRegistered: boolean('pro_registered').default(false),
  adminRegistered: boolean('admin_registered').default(false),
  iswc: text('iswc'),
  pro: text('pro'), // e.g., 'BMI', 'ASCAP', 'SESAC'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

// Writers (songwriters and publishers)
export const writers = pgTable('writers', {
  id: uuid('id').primaryKey().defaultRandom(),
  compositionWorkId: uuid('composition_work_id').references(() => compositionWorks.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  pro: text('pro'),
  ipi: text('ipi'),
  role: writerRoleEnum('role').default('writer')
})

// Work Splits (percentage ownership)
export const workSplits = pgTable('work_splits', {
  id: uuid('id').primaryKey().defaultRandom(),
  writerId: uuid('writer_id').references(() => writers.id, { onDelete: 'cascade' }).notNull(),
  percentage: integer('percentage').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

// Catalog Issues (problems detected in catalog)
export const catalogIssues = pgTable('catalog_issues', {
  id: uuid('id').primaryKey().defaultRandom(),
  recordingId: uuid('recording_id').references(() => recordings.id, { onDelete: 'cascade' }).notNull(),
  type: issueTypeEnum('type').notNull(),
  severity: issueSeverityEnum('severity').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  actionLabel: text('action_label'),
  resolved: boolean('resolved').default(false),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

// Claim Tasks (action items for users)
export const claimTasks = pgTable('claim_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  recordingId: uuid('recording_id').references(() => recordings.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: taskStatusEnum('status').default('pending').notNull(),
  createdDate: date('created_date').defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true })
})

// BMI Registrations (tracking auto-registrations)
export const bmiRegistrations = pgTable('bmi_registrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  compositionWorkId: uuid('composition_work_id').references(() => compositionWorks.id, { onDelete: 'cascade' }).notNull(),
  confirmationNumber: text('confirmation_number').notNull(),
  registeredAt: timestamp('registered_at', { withTimezone: true }).defaultNow().notNull(),
  status: text('status').notNull(), // 'success', 'failed', 'pending'
  errorMessage: text('error_message'),
  screenshotPath: text('screenshot_path'),
})

export const automationJobs = pgTable('automation_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  recordingId: uuid('recording_id').references(() => recordings.id, { onDelete: 'cascade' }).notNull(),
  compositionWorkId: uuid('composition_work_id').references(() => compositionWorks.id, { onDelete: 'cascade' }),
  type: automationJobTypeEnum('type').notNull(),
  status: automationJobStatusEnum('status').default('queued').notNull(),
  priority: integer('priority').default(100).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(3).notNull(),
  workerId: text('worker_id'),
  workerClaimedAt: timestamp('worker_claimed_at', { withTimezone: true }),
  payload: jsonb('payload').notNull(),
  result: jsonb('result'),
  lastError: text('last_error'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('automation_jobs_user_id_idx').on(table.userId),
  index('automation_jobs_recording_id_idx').on(table.recordingId),
  index('automation_jobs_status_priority_idx').on(table.status, table.priority, table.createdAt),
])

export const automationJobEvents = pgTable('automation_job_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').references(() => automationJobs.id, { onDelete: 'cascade' }).notNull(),
  level: automationEventLevelEnum('level').default('info').notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('automation_job_events_job_id_idx').on(table.jobId, table.createdAt),
])

export const usersRelations = relations(users, ({ many }) => ({
  recordings: many(recordings),
  automationJobs: many(automationJobs),
}))

export const recordingsRelations = relations(recordings, ({ one, many }) => ({
  user: one(users, {
    fields: [recordings.userId],
    references: [users.id],
  }),
  compositionWork: one(compositionWorks, {
    fields: [recordings.id],
    references: [compositionWorks.recordingId],
  }),
  catalogIssues: many(catalogIssues),
  claimTasks: many(claimTasks),
  automationJobs: many(automationJobs),
}))

export const compositionWorksRelations = relations(compositionWorks, ({ one, many }) => ({
  recording: one(recordings, {
    fields: [compositionWorks.recordingId],
    references: [recordings.id],
  }),
  writers: many(writers),
  bmiRegistrations: many(bmiRegistrations),
  automationJobs: many(automationJobs),
}))

export const writersRelations = relations(writers, ({ one, many }) => ({
  compositionWork: one(compositionWorks, {
    fields: [writers.compositionWorkId],
    references: [compositionWorks.id],
  }),
  splits: many(workSplits),
}))

export const workSplitsRelations = relations(workSplits, ({ one }) => ({
  writer: one(writers, {
    fields: [workSplits.writerId],
    references: [writers.id],
  }),
}))

export const catalogIssuesRelations = relations(catalogIssues, ({ one }) => ({
  recording: one(recordings, {
    fields: [catalogIssues.recordingId],
    references: [recordings.id],
  }),
}))

export const claimTasksRelations = relations(claimTasks, ({ one }) => ({
  recording: one(recordings, {
    fields: [claimTasks.recordingId],
    references: [recordings.id],
  }),
}))

export const bmiRegistrationsRelations = relations(bmiRegistrations, ({ one }) => ({
  compositionWork: one(compositionWorks, {
    fields: [bmiRegistrations.compositionWorkId],
    references: [compositionWorks.id],
  }),
}))

export const automationJobsRelations = relations(automationJobs, ({ one, many }) => ({
  user: one(users, {
    fields: [automationJobs.userId],
    references: [users.id],
  }),
  recording: one(recordings, {
    fields: [automationJobs.recordingId],
    references: [recordings.id],
  }),
  compositionWork: one(compositionWorks, {
    fields: [automationJobs.compositionWorkId],
    references: [compositionWorks.id],
  }),
  events: many(automationJobEvents),
}))

export const automationJobEventsRelations = relations(automationJobEvents, ({ one }) => ({
  job: one(automationJobs, {
    fields: [automationJobEvents.jobId],
    references: [automationJobs.id],
  }),
}))

// Type exports for use in application
export type User = typeof users.$inferSelect
export type Recording = typeof recordings.$inferSelect
export type CompositionWork = typeof compositionWorks.$inferSelect
export type Writer = typeof writers.$inferSelect
export type WorkSplit = typeof workSplits.$inferSelect
export type CatalogIssue = typeof catalogIssues.$inferSelect
export type ClaimTask = typeof claimTasks.$inferSelect
export type BMIRegistration = typeof bmiRegistrations.$inferSelect
export type AutomationJob = typeof automationJobs.$inferSelect
export type AutomationJobEvent = typeof automationJobEvents.$inferSelect

// Insert types
export type NewUser = typeof users.$inferInsert
export type NewRecording = typeof recordings.$inferInsert
export type NewCompositionWork = typeof compositionWorks.$inferInsert
export type NewWriter = typeof writers.$inferInsert
export type NewWorkSplit = typeof workSplits.$inferInsert
export type NewCatalogIssue = typeof catalogIssues.$inferInsert
export type NewClaimTask = typeof claimTasks.$inferInsert
export type NewBMIRegistration = typeof bmiRegistrations.$inferInsert
export type NewAutomationJob = typeof automationJobs.$inferInsert
export type NewAutomationJobEvent = typeof automationJobEvents.$inferInsert

// Enum type exports
export type IssueSeverity = typeof issueSeverityEnum.enumValues[number]
export type IssueType = typeof issueTypeEnum.enumValues[number]
export type TaskStatus = typeof taskStatusEnum.enumValues[number]
export type WriterRole = typeof writerRoleEnum.enumValues[number]
export type AutomationJobType = typeof automationJobTypeEnum.enumValues[number]
export type AutomationJobStatus = typeof automationJobStatusEnum.enumValues[number]
export type AutomationEventLevel = typeof automationEventLevelEnum.enumValues[number]
