"use client";

import { createContext, useContext } from "react";
import { Recording, ClaimTask, CatalogStats, BMISyncStatus } from "./types";
import { MOCK_RECORDINGS, MOCK_CLAIM_TASKS, computeStats } from "./mock-data";

export interface AppState {
  recordings: Recording[];
  claimTasks: ClaimTask[];
  stats: CatalogStats;
  catalogImported: boolean;
  bmiSync: BMISyncStatus | null;
}

export interface AppActions {
  importRecordings: (
    recordings: Recording[],
    options?: {
      pruneMissingSpotify?: boolean;
    }
  ) => void;
  resolveIssue: (recordingId: string, issueId: string) => void;
  updateRecording: (recordingId: string, updates: Partial<Recording>) => void;
  updateTaskStatus: (taskId: string, status: ClaimTask["status"]) => void;
  bulkResolveIssues: (issueIds: string[]) => void;
  flagRecordingsNotMine: (recordingIds: string[], releaseLabel: string) => Promise<void>;
  queueBMIAutomation: (
    recordingIds: string[]
  ) => Promise<{
    queuedCount: number;
    results: Array<{
      recordingId: string;
      success: boolean;
      error?: string;
      alreadyQueued?: boolean;
      jobId?: string;
    }>;
  }>;
  queueBMICatalogSync: () => Promise<{
    success: boolean;
    jobId?: string;
    alreadyQueued?: boolean;
    error?: string;
  }>;
  refreshCatalog: () => Promise<void>;
}

export type AppStore = AppState & AppActions;

export function createInitialState(useMock = false): AppState {
  const recordings = useMock ? MOCK_RECORDINGS : [];
  return {
    recordings,
    claimTasks: useMock ? MOCK_CLAIM_TASKS : [],
    stats: computeStats(recordings),
    catalogImported: useMock,
    bmiSync: null,
  };
}

export const AppContext = createContext<AppStore | null>(null);

export function useAppStore(): AppStore {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppStore must be used within AppProvider");
  return ctx;
}
