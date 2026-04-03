"use client";

import React, { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download,
  CheckCircle2,
  Clock,
  Package,
  Send,
  AlertCircle,
  Loader2,
} from "lucide-react";

export default function RecoverPage() {
  const { recordings, claimTasks, updateTaskStatus } = useAppStore();
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());

  const readySongs = useMemo(
    () => recordings.filter((r) => r.claimReadinessScore >= 80),
    [recordings]
  );

  const almostReady = useMemo(
    () => recordings.filter((r) => r.claimReadinessScore >= 50 && r.claimReadinessScore < 80),
    [recordings]
  );

  const completedTasks = claimTasks.filter((t) => t.status === "completed");
  const taskProgress = claimTasks.length > 0 ? Math.round((completedTasks.length / claimTasks.length) * 100) : 0;

  const toggleSong = (id: string) => {
    setSelectedSongIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllReady = () => {
    if (selectedSongIds.size === readySongs.length) {
      setSelectedSongIds(new Set());
    } else {
      setSelectedSongIds(new Set(readySongs.map((r) => r.id)));
    }
  };

  const handleExport = () => {
    setExporting(true);

    const songsToExport = recordings.filter((r) => selectedSongIds.has(r.id));
    const csvRows = [
      ["Song Title", "Artist", "Album", "ISRC", "Release Date", "Claim Readiness Score", "Writers", "Splits", "PRO", "ISWC"].join(","),
      ...songsToExport.map((r) => {
        const writers = r.compositionWork?.writers.map((w) => w.name).join("; ") || "";
        const splits = r.compositionWork?.splits.map((s) => `${s.writerName}: ${s.percentage}%`).join("; ") || "";
        const pro = r.compositionWork?.writers.map((w) => w.pro || "N/A").join("; ") || "";
        const iswc = r.compositionWork?.iswc || "";
        return [
          `"${r.title}"`,
          `"${r.artist}"`,
          `"${r.album}"`,
          r.isrc || "",
          r.releaseDate || "",
          r.claimReadinessScore,
          `"${writers}"`,
          `"${splits}"`,
          `"${pro}"`,
          iswc,
        ].join(",");
      }),
    ].join("\n");

    setTimeout(() => {
      const blob = new Blob([csvRows], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `claimrail-export-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
      setExported(true);
    }, 1500);
  };

  return (
    <AppShell>
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recover</h1>
        <p className="mt-1 text-muted-foreground">
          Export claim-ready metadata and track your submission progress.
        </p>
      </div>

      {/* Progress Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{readySongs.length}</p>
              <p className="text-sm text-muted-foreground">Songs ready to claim</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{almostReady.length}</p>
              <p className="text-sm text-muted-foreground">Almost ready</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Send className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedTasks.length}/{claimTasks.length}</p>
              <p className="text-sm text-muted-foreground">Tasks completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submission Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overall Claim Progress</CardTitle>
          <CardDescription>Track how close you are to collecting all your royalties</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{taskProgress}%</span>
            </div>
            <Progress value={taskProgress} className="h-3" indicatorClassName="bg-primary" />
            <p className="text-xs text-muted-foreground">
              {completedTasks.length} of {claimTasks.length} claim tasks completed
            </p>
          </div>

          <Separator className="my-6" />

          <div className="space-y-3">
            {claimTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 rounded-lg border p-3">
                {task.status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                ) : task.status === "in_progress" ? (
                  <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                    {task.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{task.description}</p>
                </div>
                {task.status === "completed" ? (
                  <Badge variant="success">Done</Badge>
                ) : task.status === "in_progress" ? (
                  <Button
                    size="sm"
                    onClick={() => updateTaskStatus(task.id, "completed")}
                    className="gap-1"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Mark done
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateTaskStatus(task.id, "in_progress")}
                    className="gap-1"
                  >
                    Start
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Export Claim Packet
          </CardTitle>
          <CardDescription>
            Select songs and export a CSV with all the metadata needed for PRO registration and publishing admin claims.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {readySongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">No songs are ready for export yet</p>
              <p className="text-xs text-muted-foreground">
                Fix the issues on the Fix page to get songs to 80%+ readiness.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-3">
                <Checkbox
                  checked={selectedSongIds.size === readySongs.length && readySongs.length > 0}
                  onCheckedChange={selectAllReady}
                />
                <span className="text-sm text-muted-foreground">
                  Select all ready songs ({readySongs.length})
                </span>
              </div>

              <div className="space-y-2 mb-6">
                {readySongs.map((rec) => (
                  <div key={rec.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
                    <Checkbox
                      checked={selectedSongIds.has(rec.id)}
                      onCheckedChange={() => toggleSong(rec.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{rec.title}</p>
                      <p className="text-xs text-muted-foreground">{rec.artist} &middot; {rec.album}</p>
                    </div>
                    <Badge variant="success">{rec.claimReadinessScore}%</Badge>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleExport}
                  disabled={selectedSongIds.size === 0 || exporting}
                  className="gap-2"
                  size="lg"
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {exporting ? "Generating..." : `Export ${selectedSongIds.size} song${selectedSongIds.size !== 1 ? "s" : ""}`}
                </Button>
                {exported && (
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Exported successfully!</span>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Where to Submit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Where to Submit Your Claims</CardTitle>
          <CardDescription>
            Once you have your claim packet, here&apos;s where to register your works.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold">Performance Rights Organizations (PROs)</h3>
              <p className="mt-1 text-xs text-muted-foreground">Register your compositions to collect performance royalties</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["BMI", "ASCAP", "SESAC", "PRS", "SOCAN"].map((pro) => (
                  <Badge key={pro} variant="outline">{pro}</Badge>
                ))}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="text-sm font-semibold">Publishing Admin Services</h3>
              <p className="mt-1 text-xs text-muted-foreground">Collect mechanical royalties globally</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Songtrust", "TuneCore Publishing", "CD Baby Pro", "Sentric"].map((admin) => (
                  <Badge key={admin} variant="outline">{admin}</Badge>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            ClaimRail helps you prepare your metadata. Phase 2 will include direct integrations with these services.
          </p>
        </CardContent>
      </Card>
    </div>
    </AppShell>
  );
}
