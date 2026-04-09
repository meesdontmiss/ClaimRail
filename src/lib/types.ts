// Database types (from Drizzle schema)
export type {
  User,
  Recording as DatabaseRecording,
  CompositionWork as DatabaseCompositionWork,
  Writer as DatabaseWriter,
  WorkSplit as DatabaseWorkSplit,
  CatalogIssue as DatabaseCatalogIssue,
  ClaimTask as DatabaseClaimTask,
  IssueSeverity as DatabaseIssueSeverity,
  IssueType as DatabaseIssueType,
  TaskStatus as DatabaseTaskStatus,
  WriterRole as DatabaseWriterRole
} from '@/lib/db/schema'

// Legacy/App-level types (for UI compatibility)
// These are kept for backward compatibility with existing UI components
export type IssueType =
  | "missing_writer"
  | "invalid_splits"
  | "no_composition_work"
  | "missing_pro_admin"
  | "duplicate_work"
  | "incomplete_registration"
  | "missing_isrc"
  | "missing_release_date";

export type IssueSeverity = "high" | "medium" | "low";

export type ClaimTaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type BMIRegistrationStatus = "needs_registration" | "pending" | "confirmed" | "unverified";
export type RecordingOwnershipStatus = "owned" | "not_mine";
export type BMIVerificationSource = "registration" | "catalog_sync";

export interface Recording {
  id: string;
  spotifyId?: string | null;
  title: string;
  artist: string;
  album: string;
  albumArt?: string | null;
  ownershipStatus?: RecordingOwnershipStatus;
  ownershipNote?: string | null;
  isrc: string | null;
  releaseDate: string | null;
  duration: string | null;
  claimReadinessScore: number;
  issues: CatalogIssue[];
  compositionWork: CompositionWork | null;
  importedAt: string;
}

export interface CompositionWork {
  id: string;
  title: string;
  pro?: string | null;
  writers: Writer[];
  splits: WorkSplit[];
  proRegistered: boolean;
  adminRegistered: boolean;
  iswc: string | null;
  bmiRegistrationStatus?: BMIRegistrationStatus;
  bmiConfirmationNumber?: string | null;
  bmiRegisteredAt?: string | null;
  bmiVerificationSource?: BMIVerificationSource | null;
  bmiMatchedWorkId?: string | null;
  bmiMatchedWorkTitle?: string | null;
  bmiMatchedIswc?: string | null;
  bmiLastVerifiedAt?: string | null;
}

export interface Writer {
  id: string;
  name: string;
  pro: string | null;
  ipi: string | null;
  role: "writer" | "composer" | "producer" | "publisher" | "lyricist" | "composer_lyricist" | "arranger";
}

export interface WorkSplit {
  writerId: string;
  writerName: string;
  percentage: number;
}

export interface CatalogIssue {
  id: string;
  recordingId: string;
  type: IssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  actionLabel: string;
  resolved: boolean;
}

export interface ClaimTask {
  id: string;
  recordingId: string;
  title: string;
  description: string;
  status: ClaimTaskStatus;
  createdAt: string;
  completedAt: string | null;
}

export interface CatalogStats {
  totalSongs: number;
  fullyReady: number;
  needingAction: number;
  highRisk: number;
  confirmedBMIRegistrations: number;
  pendingBMIRegistrations: number;
  unverifiedBMIClaims: number;
  avgReadinessScore: number;
}

export interface BMISyncStatus {
  jobId: string | null;
  status:
    | "idle"
    | "queued"
    | "claimed"
    | "running"
    | "completed"
    | "failed"
    | "needs_human"
    | "cancelled";
  syncedWorks: number;
  matchedSongs: number;
  queuedAt: string | null;
  completedAt: string | null;
  lastError: string | null;
  source: string | null;
}

export interface CSVRow {
  [key: string]: string;
}

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  missing_writer: "Missing songwriter info",
  invalid_splits: "Ownership splits don't add up",
  no_composition_work: "No linked composition",
  missing_pro_admin: "Missing PRO or admin details",
  duplicate_work: "Possible duplicate",
  incomplete_registration: "Incomplete registration",
  missing_isrc: "Missing ISRC code",
  missing_release_date: "Missing release date",
};

export const ISSUE_SEVERITY_CONFIG: Record<IssueSeverity, { label: string; color: string }> = {
  high: { label: "High Risk", color: "danger" },
  medium: { label: "Medium Risk", color: "warning" },
  low: { label: "Low Risk", color: "secondary" },
};
