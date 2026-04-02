import { Recording, CatalogStats, ClaimTask } from "./types";

export const MOCK_RECORDINGS: Recording[] = [
  {
    id: "rec-1",
    title: "Midnight Drive",
    artist: "Luna Parker",
    album: "City Lights",
    isrc: "US-ABC-24-00001",
    releaseDate: "2024-03-15",
    duration: "3:42",
    claimReadinessScore: 92,
    issues: [],
    compositionWork: {
      id: "cw-1",
      title: "Midnight Drive",
      writers: [{ id: "w-1", name: "Luna Parker", pro: "BMI", ipi: "00123456789", role: "composer_lyricist" }],
      splits: [{ writerId: "w-1", writerName: "Luna Parker", percentage: 100 }],
      proRegistered: true,
      adminRegistered: true,
      iswc: "T-012345678-9",
    },
    importedAt: "2024-06-01",
  },
  {
    id: "rec-2",
    title: "Golden Hour",
    artist: "Luna Parker",
    album: "City Lights",
    isrc: "US-ABC-24-00002",
    releaseDate: "2024-03-15",
    duration: "4:11",
    claimReadinessScore: 45,
    issues: [
      {
        id: "iss-1",
        recordingId: "rec-2",
        type: "missing_writer",
        severity: "high",
        title: "Missing songwriter info",
        description: "No songwriter is listed for this song. Without writer info, you can't collect publishing royalties.",
        actionLabel: "Add songwriter",
        resolved: false,
      },
      {
        id: "iss-2",
        recordingId: "rec-2",
        type: "missing_pro_admin",
        severity: "high",
        title: "Missing PRO or admin details",
        description: "No PRO affiliation or publishing admin is connected. This means mechanical and performance royalties may go uncollected.",
        actionLabel: "Add PRO info",
        resolved: false,
      },
    ],
    compositionWork: null,
    importedAt: "2024-06-01",
  },
  {
    id: "rec-3",
    title: "Echoes",
    artist: "Luna Parker",
    album: "City Lights",
    isrc: "US-ABC-24-00003",
    releaseDate: "2024-03-15",
    duration: "3:28",
    claimReadinessScore: 68,
    issues: [
      {
        id: "iss-3",
        recordingId: "rec-3",
        type: "invalid_splits",
        severity: "medium",
        title: "Ownership splits don't add up",
        description: "Writer splits total 80%. They need to equal 100% before you can register the composition.",
        actionLabel: "Fix splits",
        resolved: false,
      },
    ],
    compositionWork: {
      id: "cw-3",
      title: "Echoes",
      writers: [
        { id: "w-1", name: "Luna Parker", pro: "BMI", ipi: "00123456789", role: "composer_lyricist" },
        { id: "w-2", name: "Jamie Cross", pro: null, ipi: null, role: "composer" },
      ],
      splits: [
        { writerId: "w-1", writerName: "Luna Parker", percentage: 50 },
        { writerId: "w-2", writerName: "Jamie Cross", percentage: 30 },
      ],
      proRegistered: false,
      adminRegistered: false,
      iswc: null,
    },
    importedAt: "2024-06-01",
  },
  {
    id: "rec-4",
    title: "Neon Skyline",
    artist: "Luna Parker",
    album: "Afterglow",
    isrc: null,
    releaseDate: "2023-08-22",
    duration: "3:55",
    claimReadinessScore: 22,
    issues: [
      {
        id: "iss-4",
        recordingId: "rec-4",
        type: "missing_isrc",
        severity: "high",
        title: "Missing ISRC code",
        description: "This recording has no ISRC. Without it, royalty systems can't match payments to this song.",
        actionLabel: "Add ISRC",
        resolved: false,
      },
      {
        id: "iss-5",
        recordingId: "rec-4",
        type: "no_composition_work",
        severity: "high",
        title: "No linked composition",
        description: "There's no composition work tied to this recording. Publishing royalties require a registered composition.",
        actionLabel: "Create composition",
        resolved: false,
      },
      {
        id: "iss-6",
        recordingId: "rec-4",
        type: "missing_writer",
        severity: "high",
        title: "Missing songwriter info",
        description: "No songwriter is listed for this song.",
        actionLabel: "Add songwriter",
        resolved: false,
      },
    ],
    compositionWork: null,
    importedAt: "2024-06-01",
  },
  {
    id: "rec-5",
    title: "Paper Walls",
    artist: "Luna Parker",
    album: "Afterglow",
    isrc: "US-ABC-23-00010",
    releaseDate: "2023-08-22",
    duration: "4:03",
    claimReadinessScore: 55,
    issues: [
      {
        id: "iss-7",
        recordingId: "rec-5",
        type: "duplicate_work",
        severity: "medium",
        title: "Possible duplicate",
        description: "A composition with a very similar title and writer already exists. Duplicates can cause royalty conflicts.",
        actionLabel: "Review duplicate",
        resolved: false,
      },
      {
        id: "iss-8",
        recordingId: "rec-5",
        type: "missing_pro_admin",
        severity: "medium",
        title: "Missing PRO or admin details",
        description: "No publishing admin is connected for this work.",
        actionLabel: "Add admin info",
        resolved: false,
      },
    ],
    compositionWork: {
      id: "cw-5",
      title: "Paper Walls",
      writers: [{ id: "w-1", name: "Luna Parker", pro: "BMI", ipi: "00123456789", role: "composer_lyricist" }],
      splits: [{ writerId: "w-1", writerName: "Luna Parker", percentage: 100 }],
      proRegistered: true,
      adminRegistered: false,
      iswc: null,
    },
    importedAt: "2024-06-01",
  },
  {
    id: "rec-6",
    title: "Runaway",
    artist: "Luna Parker",
    album: "Afterglow",
    isrc: "US-ABC-23-00011",
    releaseDate: "2023-08-22",
    duration: "3:19",
    claimReadinessScore: 78,
    issues: [
      {
        id: "iss-9",
        recordingId: "rec-6",
        type: "incomplete_registration",
        severity: "low",
        title: "Incomplete registration",
        description: "This work is partially registered but missing the ISWC code for international matching.",
        actionLabel: "Complete registration",
        resolved: false,
      },
    ],
    compositionWork: {
      id: "cw-6",
      title: "Runaway",
      writers: [{ id: "w-1", name: "Luna Parker", pro: "BMI", ipi: "00123456789", role: "composer_lyricist" }],
      splits: [{ writerId: "w-1", writerName: "Luna Parker", percentage: 100 }],
      proRegistered: true,
      adminRegistered: true,
      iswc: null,
    },
    importedAt: "2024-06-01",
  },
  {
    id: "rec-7",
    title: "Gravity",
    artist: "Luna Parker ft. Max Reid",
    album: "Singles",
    isrc: "US-ABC-22-00005",
    releaseDate: null,
    duration: "3:47",
    claimReadinessScore: 30,
    issues: [
      {
        id: "iss-10",
        recordingId: "rec-7",
        type: "missing_release_date",
        severity: "medium",
        title: "Missing release date",
        description: "No release date is set. Some registries require this to process claims.",
        actionLabel: "Add release date",
        resolved: false,
      },
      {
        id: "iss-11",
        recordingId: "rec-7",
        type: "invalid_splits",
        severity: "high",
        title: "Ownership splits don't add up",
        description: "Writer splits total 150%. They need to equal 100%.",
        actionLabel: "Fix splits",
        resolved: false,
      },
      {
        id: "iss-12",
        recordingId: "rec-7",
        type: "missing_pro_admin",
        severity: "high",
        title: "Missing PRO or admin details",
        description: "Co-writer Max Reid has no PRO affiliation listed.",
        actionLabel: "Add PRO info",
        resolved: false,
      },
    ],
    compositionWork: {
      id: "cw-7",
      title: "Gravity",
      writers: [
        { id: "w-1", name: "Luna Parker", pro: "BMI", ipi: "00123456789", role: "composer_lyricist" },
        { id: "w-3", name: "Max Reid", pro: null, ipi: null, role: "composer" },
      ],
      splits: [
        { writerId: "w-1", writerName: "Luna Parker", percentage: 75 },
        { writerId: "w-3", writerName: "Max Reid", percentage: 75 },
      ],
      proRegistered: false,
      adminRegistered: false,
      iswc: null,
    },
    importedAt: "2024-06-01",
  },
  {
    id: "rec-8",
    title: "Static",
    artist: "Luna Parker",
    album: "Singles",
    isrc: "US-ABC-22-00006",
    releaseDate: "2022-11-10",
    duration: "2:58",
    claimReadinessScore: 85,
    issues: [
      {
        id: "iss-13",
        recordingId: "rec-8",
        type: "incomplete_registration",
        severity: "low",
        title: "Incomplete registration",
        description: "Missing ISWC for international matching.",
        actionLabel: "Complete registration",
        resolved: false,
      },
    ],
    compositionWork: {
      id: "cw-8",
      title: "Static",
      writers: [{ id: "w-1", name: "Luna Parker", pro: "BMI", ipi: "00123456789", role: "composer_lyricist" }],
      splits: [{ writerId: "w-1", writerName: "Luna Parker", percentage: 100 }],
      proRegistered: true,
      adminRegistered: true,
      iswc: null,
    },
    importedAt: "2024-06-01",
  },
];

export const MOCK_CLAIM_TASKS: ClaimTask[] = [
  {
    id: "task-1",
    recordingId: "rec-2",
    title: "Register composition for 'Golden Hour'",
    description: "Create and register the composition work with your PRO.",
    status: "pending",
    createdAt: "2024-06-02",
    completedAt: null,
  },
  {
    id: "task-2",
    recordingId: "rec-4",
    title: "Add ISRC for 'Neon Skyline'",
    description: "Get the ISRC from DistroKid and add it to the recording metadata.",
    status: "in_progress",
    createdAt: "2024-06-02",
    completedAt: null,
  },
  {
    id: "task-3",
    recordingId: "rec-1",
    title: "Export claim packet for 'Midnight Drive'",
    description: "This song is fully ready. Export its metadata for submission.",
    status: "completed",
    createdAt: "2024-06-01",
    completedAt: "2024-06-03",
  },
  {
    id: "task-4",
    recordingId: "rec-7",
    title: "Fix splits for 'Gravity'",
    description: "Current splits total 150%. Correct to equal 100%.",
    status: "pending",
    createdAt: "2024-06-02",
    completedAt: null,
  },
  {
    id: "task-5",
    recordingId: "rec-5",
    title: "Resolve duplicate for 'Paper Walls'",
    description: "Review and resolve potential duplicate composition.",
    status: "pending",
    createdAt: "2024-06-02",
    completedAt: null,
  },
];

export function computeStats(recordings: Recording[]): CatalogStats {
  const totalSongs = recordings.length;
  const fullyReady = recordings.filter((r) => r.claimReadinessScore >= 90).length;
  const highRisk = recordings.filter((r) => r.issues.some((i) => i.severity === "high" && !i.resolved)).length;
  const needingAction = recordings.filter((r) => r.claimReadinessScore < 90).length;
  const avgReadinessScore =
    totalSongs === 0
      ? 0
      : Math.round(recordings.reduce((sum, r) => sum + r.claimReadinessScore, 0) / totalSongs);

  const riskSongs = recordings.filter((r) => r.claimReadinessScore < 70);
  const estimatedPerSong = 150;
  const estimatedOpportunity = `$${(riskSongs.length * estimatedPerSong).toLocaleString()}`;

  return {
    totalSongs,
    fullyReady,
    needingAction,
    highRisk,
    estimatedOpportunity,
    avgReadinessScore,
  };
}

export function scoreRecording(rec: Partial<Recording>): number {
  let score = 0;
  const max = 100;

  if (rec.isrc) score += 15;
  if (rec.compositionWork) score += 20;
  if (rec.compositionWork?.writers && rec.compositionWork.writers.length > 0) {
    const allWritersComplete = rec.compositionWork.writers.every((w) => w.pro && w.ipi);
    score += allWritersComplete ? 15 : 5;
  }
  if (rec.compositionWork?.splits) {
    const total = rec.compositionWork.splits.reduce((s, sp) => s + sp.percentage, 0);
    if (total === 100) score += 15;
  }
  if (rec.compositionWork?.proRegistered) score += 10;
  if (rec.compositionWork?.adminRegistered) score += 10;
  if (rec.releaseDate) score += 10;
  if (!rec.issues || rec.issues.filter((i) => !i.resolved).length === 0) score += 5;

  return Math.min(score, max);
}
