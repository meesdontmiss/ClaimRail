"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { AppContext, AppStore, createInitialState } from "@/lib/store";
import { Recording, ClaimTask } from "@/lib/types";
import { computeStats, scoreRecording } from "@/lib/mock-data";

interface ServerAppState {
  recordings: Recording[];
  claimTasks: ClaimTask[];
  catalogImported: boolean;
}

function isAuthError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message === "Unauthorized" || error.message === "Session expired. Please sign in again.")
  );
}

function recalculateRecording(recording: Recording): Recording {
  return {
    ...recording,
    claimReadinessScore: scoreRecording(recording),
  };
}

function normalizeState(state: ServerAppState) {
  const recordings = state.recordings.map(recalculateRecording);
  return {
    recordings,
    claimTasks: state.claimTasks,
    catalogImported: state.catalogImported,
    stats: computeStats(recordings),
  };
}

async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [state, setState] = useState(() => createInitialState(false));
  const [loaded, setLoaded] = useState(false);

  const refreshState = useCallback(async () => {
    try {
      const nextState = await readJson<ServerAppState>("/api/app-state");
      setState(normalizeState(nextState));
      setLoaded(true);
    } catch (error) {
      if (isAuthError(error)) {
        setState(createInitialState(false));
        setLoaded(true);
        await signOut({ callbackUrl: "/connect?reauth=1" });
        return;
      }

      throw error;
    }
  }, []);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated") {
      queueMicrotask(() => {
        setState(createInitialState(false));
        setLoaded(true);
      });
      return;
    }

    let cancelled = false;

    void readJson<ServerAppState>("/api/app-state")
      .then((nextState) => {
        if (cancelled) {
          return;
        }

        setState(normalizeState(nextState));
        setLoaded(true);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        if (isAuthError(error)) {
          setState(createInitialState(false));
          setLoaded(true);
          void signOut({ callbackUrl: "/connect?reauth=1" });
          return;
        }

        console.error("Failed to load app state:", error);
        setState(createInitialState(false));
        setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  const importRecordings = useCallback((recordings: Recording[], options?: { pruneMissingSpotify?: boolean }) => {
    const optimisticRecordings = [...state.recordings, ...recordings].map(recalculateRecording);

    setState({
      recordings: optimisticRecordings,
      claimTasks: state.claimTasks,
      catalogImported: true,
      stats: computeStats(optimisticRecordings),
    });

    void readJson<{ success: boolean }>("/api/catalog/import", {
      method: "POST",
      body: JSON.stringify({
        recordings,
        pruneMissingSpotify: options?.pruneMissingSpotify ?? false,
      }),
    }).then(refreshState).catch((error) => {
      console.error("Failed to import recordings:", error);
      void refreshState();
    });
  }, [refreshState, state.claimTasks, state.recordings]);

  const resolveIssue = useCallback((recordingId: string, issueId: string) => {
    setState((prev) => {
      const recordings = prev.recordings.map((recording) => {
        if (recording.id !== recordingId) {
          return recording;
        }

        return recalculateRecording({
          ...recording,
          issues: recording.issues.map((issue) =>
            issue.id === issueId ? { ...issue, resolved: true } : issue
          ),
        });
      });

      return {
        ...prev,
        recordings,
        stats: computeStats(recordings),
      };
    });

    void readJson<{ success: boolean }>("/api/catalog/issues/resolve", {
      method: "POST",
      body: JSON.stringify({ issueId }),
    }).then(refreshState).catch((error) => {
      console.error("Failed to resolve issue:", error);
      void refreshState();
    });
  }, [refreshState]);

  const updateRecording = useCallback((recordingId: string, updates: Partial<Recording>) => {
    let nextRecording: Recording | null = null;

    setState((prev) => {
      const recordings = prev.recordings.map((recording) => {
        if (recording.id !== recordingId) {
          return recording;
        }

        nextRecording = recalculateRecording({ ...recording, ...updates });
        return nextRecording;
      });

      return {
        ...prev,
        recordings,
        stats: computeStats(recordings),
      };
    });

    void readJson<{ success: boolean }>(`/api/catalog/recordings/${recordingId}`, {
      method: "PATCH",
      body: JSON.stringify({ recording: nextRecording }),
    }).then(refreshState).catch((error) => {
      console.error("Failed to update recording:", error);
      void refreshState();
    });
  }, [refreshState]);

  const updateTaskStatus = useCallback((taskId: string, status: ClaimTask["status"]) => {
    setState((prev) => ({
      ...prev,
      claimTasks: prev.claimTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status,
              completedAt:
                status === "completed"
                  ? new Date().toISOString().slice(0, 10)
                  : null,
            }
          : task
      ),
    }));

    void readJson<{ success: boolean }>(`/api/catalog/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }).then(refreshState).catch((error) => {
      console.error("Failed to update task status:", error);
      void refreshState();
    });
  }, [refreshState]);

  const bulkResolveIssues = useCallback((issueIds: string[]) => {
    if (issueIds.length === 0) {
      return;
    }

    setState((prev) => {
      const recordings = prev.recordings.map((recording) =>
        recalculateRecording({
          ...recording,
          issues: recording.issues.map((issue) =>
            issueIds.includes(issue.id) ? { ...issue, resolved: true } : issue
          ),
        })
      );

      return {
        ...prev,
        recordings,
        stats: computeStats(recordings),
      };
    });

    void readJson<{ success: boolean }>("/api/catalog/issues/bulk-resolve", {
      method: "POST",
      body: JSON.stringify({ issueIds }),
    }).then(refreshState).catch((error) => {
      console.error("Failed to bulk resolve issues:", error);
      void refreshState();
    });
  }, [refreshState]);

  const store: AppStore = useMemo(
    () => ({
      ...state,
      importRecordings,
      resolveIssue,
      updateRecording,
      updateTaskStatus,
      bulkResolveIssues,
      refreshCatalog: refreshState,
    }),
    [bulkResolveIssues, importRecordings, refreshState, resolveIssue, state, updateRecording, updateTaskStatus]
  );

  if (status === "authenticated" && !loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Syncing your catalog...
        </div>
      </div>
    );
  }

  return <AppContext.Provider value={store}>{children}</AppContext.Provider>;
}
