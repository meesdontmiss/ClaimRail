"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { AppContext, AppStore, createInitialState } from "@/lib/store";
import { Recording, ClaimTask } from "@/lib/types";
import { computeStats, scoreRecording } from "@/lib/mock-data";

const APP_STATE_STORAGE_KEY = "claimrail.app-state.v1";

function isPersistedState(value: unknown): value is {
  recordings: Recording[];
  claimTasks: ClaimTask[];
  catalogImported: boolean;
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    recordings?: unknown;
    claimTasks?: unknown;
    catalogImported?: unknown;
  };

  return (
    Array.isArray(candidate.recordings) &&
    Array.isArray(candidate.claimTasks) &&
    typeof candidate.catalogImported === "boolean"
  );
}

function recalculateRecording(recording: Recording): Recording {
  return {
    ...recording,
    claimReadinessScore: scoreRecording(recording),
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(() => createInitialState(false));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const rawState = window.localStorage.getItem(APP_STATE_STORAGE_KEY);
      if (!rawState) {
        setHydrated(true);
        return;
      }

      const parsedState = JSON.parse(rawState);
      if (!isPersistedState(parsedState)) {
        setHydrated(true);
        return;
      }

      const recordings = parsedState.recordings.map(recalculateRecording);
      setState({
        recordings,
        claimTasks: parsedState.claimTasks,
        catalogImported: parsedState.catalogImported,
        stats: computeStats(recordings),
      });
    } catch {
      window.localStorage.removeItem(APP_STATE_STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(
      APP_STATE_STORAGE_KEY,
      JSON.stringify({
        recordings: state.recordings,
        claimTasks: state.claimTasks,
        catalogImported: state.catalogImported,
      })
    );
  }, [hydrated, state]);

  const importRecordings = useCallback((recordings: Recording[]) => {
    setState((prev) => {
      const newRecordings = [...prev.recordings, ...recordings].map(recalculateRecording);
      return {
        ...prev,
        recordings: newRecordings,
        stats: computeStats(newRecordings),
        catalogImported: true,
      };
    });
  }, []);

  const resolveIssue = useCallback((recordingId: string, issueId: string) => {
    setState((prev) => {
      const recordings = prev.recordings.map((r) => {
        if (r.id !== recordingId) return r;
        return recalculateRecording({
          ...r,
          issues: r.issues.map((i) => (i.id === issueId ? { ...i, resolved: true } : i)),
        });
      });
      return { ...prev, recordings, stats: computeStats(recordings) };
    });
  }, []);

  const updateRecording = useCallback((recordingId: string, updates: Partial<Recording>) => {
    setState((prev) => {
      const recordings = prev.recordings.map((r) =>
        r.id === recordingId ? recalculateRecording({ ...r, ...updates }) : r
      );
      return { ...prev, recordings, stats: computeStats(recordings) };
    });
  }, []);

  const updateTaskStatus = useCallback((taskId: string, status: ClaimTask["status"]) => {
    setState((prev) => ({
      ...prev,
      claimTasks: prev.claimTasks.map((t) =>
        t.id === taskId
          ? { ...t, status, completedAt: status === "completed" ? new Date().toISOString().split("T")[0] : t.completedAt }
          : t
      ),
    }));
  }, []);

  const bulkResolveIssues = useCallback((issueIds: string[]) => {
    setState((prev) => {
      const recordings = prev.recordings.map((r) =>
        recalculateRecording({
          ...r,
          issues: r.issues.map((i) => (issueIds.includes(i.id) ? { ...i, resolved: true } : i)),
        })
      );
      return { ...prev, recordings, stats: computeStats(recordings) };
    });
  }, []);

  const store: AppStore = useMemo(
    () => ({
      ...state,
      importRecordings,
      resolveIssue,
      updateRecording,
      updateTaskStatus,
      bulkResolveIssues,
    }),
    [state, importRecordings, resolveIssue, updateRecording, updateTaskStatus, bulkResolveIssues]
  );

  return <AppContext.Provider value={store}>{children}</AppContext.Provider>;
}
