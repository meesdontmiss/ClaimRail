"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ReleaseReviewQueue } from "@/components/dashboard/release-review-queue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { buildClaimCenterSnapshot } from "@/lib/claim-center";
import { useAppStore } from "@/lib/store";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  Music,
  Settings,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export default function DashboardPage() {
  const {
    recordings,
    stats,
    bmiSync,
    claimTasks,
    flagRecordingsNotMine,
    queueBMIAutomation,
    queueBMICatalogSync,
    resolveIssue,
    updateRecording,
    updateTaskStatus,
    refreshCatalog,
  } = useAppStore();

  const claimSnapshot = useMemo(() => buildClaimCenterSnapshot(recordings), [recordings]);
  const [selectedExportIds, setSelectedExportIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [syncingBMI, setSyncingBMI] = useState(false);
  const [bmiSyncFeedback, setBmiSyncFeedback] = useState<string | null>(null);

  const readySongs = useMemo(
    () =>
      recordings.filter(
        (recording) =>
          recording.ownershipStatus !== "not_mine" &&
          recording.claimReadinessScore >= 80
      ),
    [recordings]
  );

  const openIssueCount = useMemo(
    () =>
      recordings.reduce(
        (count, recording) =>
          recording.ownershipStatus === "not_mine"
            ? count
            : count + recording.issues.filter((issue) => !issue.resolved).length,
        0
      ),
    [recordings]
  );

  const completedTasks = useMemo(
    () => claimTasks.filter((task) => task.status === "completed"),
    [claimTasks]
  );

  const taskProgress = claimTasks.length > 0
    ? Math.round((completedTasks.length / claimTasks.length) * 100)
    : 0;

  const handleRescan = async () => {
    setScanning(true);
    try {
      await refreshCatalog();
    } finally {
      setScanning(false);
    }
  };

  const handleBMISync = async () => {
    setSyncingBMI(true);
    setBmiSyncFeedback(null);

    try {
      const result = await queueBMICatalogSync();
      setBmiSyncFeedback(
        result.alreadyQueued
          ? "BMI sync is already queued. ClaimRail will keep that run and update the dashboard when it finishes."
          : "BMI sync queued. ClaimRail will compare your catalog against live BMI repertoire before you mass-file anything."
      );
    } catch (error) {
      setBmiSyncFeedback(
        error instanceof Error ? error.message : "Failed to queue BMI sync."
      );
    } finally {
      setSyncingBMI(false);
    }
  };

  const handleExport = () => {
    setExporting(true);

    const songsToExport = recordings.filter((recording) => selectedExportIds.has(recording.id));
    const csvRows = [
      ["Song Title", "Artist", "Album", "ISRC", "Release Date", "Score", "Writers", "Splits", "PRO", "ISWC"].join(","),
      ...songsToExport.map((recording) => {
        const writers = recording.compositionWork?.writers.map((writer) => writer.name).join("; ") || "";
        const splits =
          recording.compositionWork?.splits
            .map((split) => `${split.writerName}: ${split.percentage}%`)
            .join("; ") || "";
        const pro =
          recording.compositionWork?.writers.map((writer) => writer.pro || "N/A").join("; ") || "";

        return [
          `"${recording.title}"`,
          `"${recording.artist}"`,
          `"${recording.album}"`,
          recording.isrc || "",
          recording.releaseDate || "",
          recording.claimReadinessScore,
          `"${writers}"`,
          `"${splits}"`,
          `"${pro}"`,
          recording.compositionWork?.iswc || "",
        ].join(",");
      }),
    ].join("\n");

    setTimeout(() => {
      const blob = new Blob([csvRows], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `claimrail-export-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setExporting(false);
      setExported(true);
    }, 800);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Your catalog at a glance.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRescan}
              disabled={scanning}
              className="gap-2"
            >
              {scanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <TrendingUp className="h-3 w-3" />}
              {scanning ? "Syncing..." : "Refresh"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleBMISync()}
              disabled={syncingBMI}
              className="gap-2"
            >
              {syncingBMI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {syncingBMI ? "Queueing BMI sync..." : "Sync BMI catalog"}
            </Button>
            <Link href="/dashboard/settings">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-3 w-3" /> Settings
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <Music className="h-6 w-6 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.totalSongs}</p>
                <p className="text-xs text-muted-foreground">Songs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              <div>
                <p className="text-2xl font-bold text-primary">{stats.fullyReady}</p>
                <p className="text-xs text-muted-foreground">Metadata-ready</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">{openIssueCount}</p>
                <p className="text-xs text-muted-foreground">Open issues</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <CheckCircle2 className="h-6 w-6 text-warning" />
              <div>
                <p className="text-2xl font-bold">{stats.confirmedBMIRegistrations}</p>
                <p className="text-xs text-muted-foreground">BMI confirmed</p>
                <p className="text-[10px] text-muted-foreground">
                  {stats.pendingBMIRegistrations} pending | {stats.unverifiedBMIClaims} unverified
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="flex flex-col gap-1 py-4 text-sm">
            <p className="font-medium text-foreground">BMI accuracy note</p>
            <p className="text-muted-foreground">
              ClaimRail only treats BMI as confirmed when it has either a tracked registration confirmation or a live
              BMI repertoire match from sync. Songs that were only marked locally as BMI-registered stay unverified
              until we have real proof.
            </p>
            <p className="text-muted-foreground">
              {bmiSync?.status === "completed"
                ? `Latest sync verified ${bmiSync.matchedSongs} song${bmiSync.matchedSongs === 1 ? "" : "s"} across ${bmiSync.syncedWorks} BMI repertoire work${bmiSync.syncedWorks === 1 ? "" : "s"}${bmiSync.completedAt ? ` on ${new Date(bmiSync.completedAt).toLocaleString()}` : ""}.`
                : bmiSync?.status && bmiSync.status !== "idle"
                  ? `BMI sync is currently ${bmiSync.status.replace("_", " ")}${bmiSync.lastError ? `: ${bmiSync.lastError}` : "."}`
                  : "Run BMI sync before mass registration so ClaimRail can remove songs that already exist in BMI."}
            </p>
            {bmiSyncFeedback ? (
              <p className="text-xs text-primary">{bmiSyncFeedback}</p>
            ) : null}
          </CardContent>
        </Card>

        {recordings.length === 0 ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Music className="mb-3 h-10 w-10 text-primary/60" />
              <p className="text-lg font-semibold">Import your catalog to get started</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Connect your Google account to start. ClaimRail will audit your metadata,
                find missing royalties, and handle the rest.
              </p>
              <Link href="/connect" className="mt-4">
                <Button className="gap-2">Import Catalog</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <ReleaseReviewQueue
              recordings={recordings}
              claimActions={claimSnapshot.actions}
              resolveIssue={resolveIssue}
              updateRecording={updateRecording}
              flagRecordingsNotMine={flagRecordingsNotMine}
              queueBMIAutomation={queueBMIAutomation}
            />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Claim Status</CardTitle>
                <CardDescription>
                  ClaimRail-tracked status across royalty destinations, including live BMI repertoire sync results once you run them.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  {claimSnapshot.destinations.map((destination) => (
                    <div key={destination.key} className="rounded-lg border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-medium">{destination.label}</p>
                        <Badge
                          variant={destination.automationMode === "autonomous" ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {destination.automationMode === "autonomous" ? "Auto" : "Manual"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                        <div>
                          <p className="text-sm font-bold text-warning">{destination.ready}</p>
                          <p className="text-muted-foreground">Ready</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-destructive">{destination.blocked}</p>
                          <p className="text-muted-foreground">Blocked</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold">{destination.inProgress}</p>
                          <p className="text-muted-foreground">Moving</p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">{destination.complete}</p>
                          <p className="text-muted-foreground">Done</p>
                        </div>
                      </div>
                      {destination.href.startsWith("http") ? (
                        <a
                          href={destination.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          {destination.label} portal <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Tasks</CardTitle>
                  <CardDescription>
                    {completedTasks.length}/{claimTasks.length} completed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {claimTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No tasks yet. Import your catalog to generate them.
                    </p>
                  ) : (
                    <>
                      <Progress
                        value={taskProgress}
                        className="mb-3 h-2"
                        indicatorClassName="bg-primary"
                      />
                      {claimTasks.slice(0, 6).map((task) => (
                        <div key={task.id} className="flex items-center gap-2 text-sm">
                          {task.status === "completed" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                          ) : (
                            <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-white/20" />
                          )}
                          <span
                            className={`flex-1 truncate ${
                              task.status === "completed" ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {task.title}
                          </span>
                          {task.status !== "completed" ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[10px]"
                              onClick={() => updateTaskStatus(task.id, "completed")}
                            >
                              Done
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Export</CardTitle>
                  <CardDescription>Download claim-ready metadata as CSV.</CardDescription>
                </CardHeader>
                <CardContent>
                  {readySongs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No songs at 80%+ readiness yet. Fix issues above to unlock export.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <div className="mb-2 flex items-center gap-2">
                        <Checkbox
                          checked={selectedExportIds.size === readySongs.length && readySongs.length > 0}
                          onCheckedChange={() => {
                            if (selectedExportIds.size === readySongs.length) {
                              setSelectedExportIds(new Set());
                            } else {
                              setSelectedExportIds(new Set(readySongs.map((recording) => recording.id)));
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          Select all ({readySongs.length} ready)
                        </span>
                      </div>
                      {readySongs.slice(0, 8).map((recording) => (
                        <div key={recording.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={selectedExportIds.has(recording.id)}
                            onCheckedChange={() => {
                              setSelectedExportIds((previous) => {
                                const next = new Set(previous);
                                if (next.has(recording.id)) {
                                  next.delete(recording.id);
                                } else {
                                  next.add(recording.id);
                                }
                                return next;
                              });
                            }}
                          />
                          <span className="flex-1 truncate">{recording.title}</span>
                          <Badge variant="success" className="text-[10px]">
                            {recording.claimReadinessScore}%
                          </Badge>
                        </div>
                      ))}
                      <Button
                        onClick={handleExport}
                        disabled={selectedExportIds.size === 0 || exporting}
                        className="mt-2 w-full gap-2"
                        size="sm"
                      >
                        {exporting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        {exporting
                          ? "Generating..."
                          : `Export ${selectedExportIds.size} song${selectedExportIds.size !== 1 ? "s" : ""}`}
                      </Button>
                      {exported ? (
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <CheckCircle2 className="h-3 w-3" /> Exported!
                        </div>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
