import { Recording } from "./types";

export type ClaimDestinationKey = "bmi" | "mlc" | "songtrust";
export type ClaimLane = "performance" | "mechanical" | "publishing_admin";
export type ClaimState = "ready" | "blocked" | "in_progress" | "complete";
export type AutomationMode = "autonomous" | "handoff";

export interface ClaimDestinationMeta {
  key: ClaimDestinationKey;
  label: string;
  lane: ClaimLane;
  description: string;
  actionLabel: string;
  href: string;
  automationMode: AutomationMode;
}

export interface ClaimSongAction {
  id: string;
  recordingId: string;
  songTitle: string;
  artist: string;
  destination: ClaimDestinationKey;
  lane: ClaimLane;
  state: ClaimState;
  blockers: string[];
  summary: string;
}

export interface ClaimDestinationSummary extends ClaimDestinationMeta {
  total: number;
  ready: number;
  blocked: number;
  inProgress: number;
  complete: number;
  nextStep: string;
}

export interface ClaimCenterSnapshot {
  totalSongs: number;
  readyNow: number;
  blocked: number;
  inProgress: number;
  complete: number;
  topBlockers: { label: string; count: number }[];
  destinations: ClaimDestinationSummary[];
  actions: ClaimSongAction[];
}

export const CLAIM_DESTINATIONS: ClaimDestinationMeta[] = [
  {
    key: "bmi",
    label: "BMI",
    lane: "performance",
    description:
      "Performance royalty registration for songs that still need BMI work registration.",
    actionLabel: "Open BMI automation",
    href: "/register",
    automationMode: "autonomous",
  },
  {
    key: "mlc",
    label: "The MLC",
    lane: "mechanical",
    description:
      "Mechanical royalty claiming for compositions that are ready to be registered or reviewed in The MLC.",
    actionLabel: "Open The MLC",
    href: "https://portal.themlc.com/",
    automationMode: "handoff",
  },
  {
    key: "songtrust",
    label: "Songtrust",
    lane: "publishing_admin",
    description:
      "Publishing admin handoff for songs that need global admin and mechanical collection support.",
    actionLabel: "Open Songtrust",
    href: "https://login.songtrust.com/",
    automationMode: "handoff",
  },
];

function hasValidSplits(recording: Recording) {
  const splits = recording.compositionWork?.splits ?? [];
  if (splits.length === 0) {
    return false;
  }

  const total = splits.reduce((sum, split) => sum + split.percentage, 0);
  return Math.abs(total - 100) < 0.5;
}

function collectBaseBlockers(recording: Recording) {
  const blockers: string[] = [];

  if (!recording.compositionWork) {
    blockers.push("No linked composition");
  }

  if ((recording.compositionWork?.writers.length ?? 0) === 0) {
    blockers.push("No songwriter attached");
  }

  if (recording.compositionWork && !hasValidSplits(recording)) {
    blockers.push("Splits do not total 100%");
  }

  if (!recording.isrc) {
    blockers.push("Missing ISRC");
  }

  if (!recording.releaseDate) {
    blockers.push("Missing release date");
  }

  return blockers;
}

function buildBMIAction(recording: Recording): ClaimSongAction {
  const blockers = collectBaseBlockers(recording);
  const bmiStatus = recording.compositionWork?.bmiRegistrationStatus;

  if (bmiStatus === "confirmed") {
    const viaCatalogSync =
      recording.compositionWork?.bmiVerificationSource === "catalog_sync";

    return {
      id: `claim-bmi-${recording.id}`,
      recordingId: recording.id,
      songTitle: recording.title,
      artist: recording.artist,
      destination: "bmi",
      lane: "performance",
      state: "complete",
      blockers: [],
      summary: viaCatalogSync
        ? `ClaimRail verified this song against BMI repertoire${recording.compositionWork?.bmiMatchedWorkId ? ` (BMI Work ID ${recording.compositionWork.bmiMatchedWorkId})` : ""}.`
        : "BMI registration is already tracked in ClaimRail.",
    };
  }

  if (bmiStatus === "unverified") {
    return {
      id: `claim-bmi-${recording.id}`,
      recordingId: recording.id,
      songTitle: recording.title,
      artist: recording.artist,
      destination: "bmi",
      lane: "performance",
      state: "blocked",
      blockers: ["BMI is only locally marked, not verified in ClaimRail"],
      summary:
        "ClaimRail does not have a live BMI repertoire match or tracked registration event for this song yet.",
    };
  }

  if (bmiStatus === "pending") {
    return {
      id: `claim-bmi-${recording.id}`,
      recordingId: recording.id,
      songTitle: recording.title,
      artist: recording.artist,
      destination: "bmi",
      lane: "performance",
      state: "in_progress",
      blockers: [],
      summary: "BMI automation or reconciliation is already in progress.",
    };
  }

  return {
    id: `claim-bmi-${recording.id}`,
    recordingId: recording.id,
    songTitle: recording.title,
    artist: recording.artist,
    destination: "bmi",
    lane: "performance",
    state: blockers.length > 0 ? "blocked" : "ready",
    blockers,
    summary:
      blockers.length > 0
        ? "Fix the metadata blockers before queueing BMI automation."
        : "Ready for BMI automation or manual BMI work registration.",
  };
}

function buildMLCAction(recording: Recording): ClaimSongAction {
  const blockers = collectBaseBlockers(recording).filter(
    (blocker) => blocker !== "Missing release date"
  );
  const adminRegistered = recording.compositionWork?.adminRegistered ?? false;

  if (adminRegistered) {
    return {
      id: `claim-mlc-${recording.id}`,
      recordingId: recording.id,
      songTitle: recording.title,
      artist: recording.artist,
      destination: "mlc",
      lane: "mechanical",
      state: "complete",
      blockers: [],
      summary: "Mechanical collection appears covered by an existing admin workflow.",
    };
  }

  return {
    id: `claim-mlc-${recording.id}`,
    recordingId: recording.id,
    songTitle: recording.title,
    artist: recording.artist,
    destination: "mlc",
    lane: "mechanical",
    state: blockers.length > 0 ? "blocked" : "ready",
    blockers,
    summary:
      blockers.length > 0
        ? "Complete core composition metadata before claiming mechanicals in The MLC."
        : "Ready for a direct The MLC handoff.",
  };
}

function buildSongtrustAction(recording: Recording): ClaimSongAction {
  const blockers = collectBaseBlockers(recording);
  const adminRegistered = recording.compositionWork?.adminRegistered ?? false;

  if (adminRegistered) {
    return {
      id: `claim-songtrust-${recording.id}`,
      recordingId: recording.id,
      songTitle: recording.title,
      artist: recording.artist,
      destination: "songtrust",
      lane: "publishing_admin",
      state: "complete",
      blockers: [],
      summary: "A publishing admin relationship is already tracked for this song.",
    };
  }

  return {
    id: `claim-songtrust-${recording.id}`,
    recordingId: recording.id,
    songTitle: recording.title,
    artist: recording.artist,
    destination: "songtrust",
    lane: "publishing_admin",
    state: blockers.length > 0 ? "blocked" : "ready",
    blockers,
    summary:
      blockers.length > 0
        ? "Finish the songwriter and split details before handing this off to Songtrust."
        : "Ready for Songtrust or another publishing admin handoff.",
  };
}

export function buildClaimCenterSnapshot(recordings: Recording[]): ClaimCenterSnapshot {
  const activeRecordings = recordings.filter((recording) => recording.ownershipStatus !== "not_mine");

  const actions = activeRecordings.flatMap((recording) => [
    buildBMIAction(recording),
    buildMLCAction(recording),
    buildSongtrustAction(recording),
  ]);

  const topBlockersMap = new Map<string, number>();
  actions
    .filter((action) => action.state === "blocked")
    .forEach((action) => {
      action.blockers.forEach((blocker) => {
        topBlockersMap.set(blocker, (topBlockersMap.get(blocker) ?? 0) + 1);
      });
    });

  const destinations = CLAIM_DESTINATIONS.map((destination) => {
    const destinationActions = actions.filter(
      (action) => action.destination === destination.key
    );

    const ready = destinationActions.filter((action) => action.state === "ready").length;
    const blocked = destinationActions.filter((action) => action.state === "blocked").length;
    const inProgress = destinationActions.filter(
      (action) => action.state === "in_progress"
    ).length;
    const complete = destinationActions.filter((action) => action.state === "complete").length;

    let nextStep = "Import more catalog data to start this workflow.";
    if (ready > 0) {
      nextStep =
        destination.automationMode === "autonomous"
          ? "Queue the ready songs through ClaimRail automation."
          : "Open the destination and continue the handoff with your prepared metadata.";
    } else if (blocked > 0) {
      nextStep = "Resolve blockers or verify unconfirmed BMI claims before treating this lane as covered.";
    } else if (inProgress > 0) {
      nextStep = "Keep an eye on jobs already moving through this lane.";
    } else if (complete > 0) {
      nextStep = "This lane is mostly covered for the current catalog snapshot.";
    }

    return {
      ...destination,
      total: destinationActions.length,
      ready,
      blocked,
      inProgress,
      complete,
      nextStep,
    };
  });

  return {
    totalSongs: activeRecordings.length,
    readyNow: actions.filter((action) => action.state === "ready").length,
    blocked: actions.filter((action) => action.state === "blocked").length,
    inProgress: actions.filter((action) => action.state === "in_progress").length,
    complete: actions.filter((action) => action.state === "complete").length,
    topBlockers: Array.from(topBlockersMap.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 4),
    destinations,
    actions,
  };
}
