"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { buildClaimCenterSnapshot } from "@/lib/claim-center";
import { ISSUE_TYPE_LABELS, ISSUE_SEVERITY_CONFIG, CatalogIssue, CompositionWork } from "@/lib/types";
import {
  Music,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Download,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Loader2,
  Settings,
  ExternalLink,
} from "lucide-react";

function scoreColor(score: number): string {
  if (score >= 80) return "bg-primary";
  if (score >= 50) return "bg-warning";
  return "bg-destructive";
}

function scoreBadge(score: number): "success" | "warning" | "danger" {
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "danger";
}

interface IssueWithSong extends CatalogIssue {
  songTitle: string;
  songArtist: string;
  recordingId: string;
}

function buildCompositionWork(
  existingWork: CompositionWork | null,
  recordingId: string,
  songTitle: string
): CompositionWork {
  return (
    existingWork ?? {
      id: `cw-${recordingId}`,
      title: songTitle,
      pro: null,
      writers: [],
      splits: [],
      proRegistered: false,
      adminRegistered: false,
      iswc: null,
    }
  );
}

function InlineFixForm({
  issue,
  onResolve,
  onSkip,
}: {
  issue: IssueWithSong;
  onResolve: (formData: Record<string, string>) => void;
  onSkip: () => void;
}) {
  const [formData, setFormData] = useState<Record<string, string>>({});

  const fields: { key: string; label: string; placeholder: string }[] = (() => {
    switch (issue.type) {
      case "missing_writer":
        return [
          { key: "writerName", label: "Songwriter name", placeholder: "e.g., Your full legal name" },
          { key: "pro", label: "PRO affiliation", placeholder: "e.g., BMI, ASCAP" },
        ];
      case "invalid_splits":
        return [
          { key: "writer1Split", label: "Your share (%)", placeholder: "e.g., 50" },
          { key: "writer2Split", label: "Co-writer share (%)", placeholder: "e.g., 50" },
        ];
      case "no_composition_work":
        return [
          { key: "workTitle", label: "Composition title", placeholder: "Usually same as song title" },
          { key: "writerName", label: "Primary songwriter", placeholder: "Your full legal name" },
        ];
      case "missing_pro_admin":
        return [
          { key: "pro", label: "PRO", placeholder: "e.g., BMI, ASCAP, SESAC" },
        ];
      case "missing_isrc":
        return [{ key: "isrc", label: "ISRC code", placeholder: "e.g., US-ABC-24-00001" }];
      case "missing_release_date":
        return [{ key: "releaseDate", label: "Release date", placeholder: "YYYY-MM-DD" }];
      default:
        return [];
    }
  })();

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      {fields.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-xs text-muted-foreground">{field.label}</label>
              <Input
                placeholder={field.placeholder}
                value={formData[field.key] || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No additional info needed.</p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onResolve(formData)} className="h-7 gap-1 text-xs">
          <Check className="h-3 w-3" /> Save & resolve
        </Button>
        <Button size="sm" variant="ghost" onClick={onSkip} className="h-7 gap-1 text-xs">
          <X className="h-3 w-3" /> Skip
        </Button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { recordings, stats, claimTasks, resolveIssue, updateRecording, updateTaskStatus, refreshCatalog } = useAppStore();
  const claimSnapshot = useMemo(() => buildClaimCenterSnapshot(recordings), [recordings]);

  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);
  const [fixingIssueId, setFixingIssueId] = useState<string | null>(null);
  const [selectedExportIds, setSelectedExportIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);
  const [scanning, setScanning] = useState(false);

  const readySongs = useMemo(() => recordings.filter((r) => r.claimReadinessScore >= 80), [recordings]);

  const allIssues: IssueWithSong[] = useMemo(
    () =>
      recordings.flatMap((r) =>
        r.issues
          .filter((i) => !i.resolved)
          .map((i) => ({ ...i, songTitle: r.title, songArtist: r.artist, recordingId: r.id }))
      ),
    [recordings]
  );

  const handleRescan = async () => {
    setScanning(true);
    try { await refreshCatalog(); } finally { setScanning(false); }
  };

  const handleResolve = (issue: IssueWithSong, formData: Record<string, string>) => {
    const recording = recordings.find((r) => r.id === issue.recordingId);
    if (!recording) return;

    switch (issue.type) {
      case "missing_writer": {
        const cw = buildCompositionWork(recording.compositionWork, recording.id, recording.title);
        const writerId = `writer-${recording.id}`;
        const writerName = formData.writerName || recording.artist;
        updateRecording(recording.id, {
          compositionWork: {
            ...cw,
            writers: [...cw.writers.filter((w) => w.id !== writerId), { id: writerId, name: writerName, pro: formData.pro || null, ipi: null, role: "composer_lyricist" }],
            splits: cw.splits.length > 0 ? cw.splits : [{ writerId, writerName, percentage: 100 }],
          },
        });
        break;
      }
      case "no_composition_work": {
        const writerName = formData.writerName || recording.artist;
        updateRecording(recording.id, {
          compositionWork: {
            id: `cw-${recording.id}`, title: formData.workTitle || recording.title, pro: null,
            writers: [{ id: `writer-${recording.id}`, name: writerName, pro: null, ipi: null, role: "composer_lyricist" }],
            splits: [{ writerId: `writer-${recording.id}`, writerName, percentage: 100 }],
            proRegistered: false, adminRegistered: false, iswc: null,
          },
        });
        break;
      }
      case "missing_pro_admin": {
        const cw = buildCompositionWork(recording.compositionWork, recording.id, recording.title);
        updateRecording(recording.id, { compositionWork: { ...cw, pro: formData.pro || cw.pro || null } });
        break;
      }
      case "missing_isrc":
        updateRecording(recording.id, { isrc: formData.isrc || recording.isrc });
        break;
      case "missing_release_date":
        updateRecording(recording.id, { releaseDate: formData.releaseDate || recording.releaseDate });
        break;
      case "invalid_splits": {
        const cw = buildCompositionWork(recording.compositionWork, recording.id, recording.title);
        const [w1, w2] = cw.writers;
        if (w1 && w2) {
          updateRecording(recording.id, {
            compositionWork: { ...cw, splits: [{ writerId: w1.id, writerName: w1.name, percentage: Number(formData.writer1Split || 0) }, { writerId: w2.id, writerName: w2.name, percentage: Number(formData.writer2Split || 0) }] },
          });
        }
        break;
      }
    }
    resolveIssue(issue.recordingId, issue.id);
    setFixingIssueId(null);
  };

  const handleExport = () => {
    setExporting(true);
    const songsToExport = recordings.filter((r) => selectedExportIds.has(r.id));
    const csvRows = [
      ["Song Title", "Artist", "Album", "ISRC", "Release Date", "Score", "Writers", "Splits", "PRO", "ISWC"].join(","),
      ...songsToExport.map((r) => {
        const writers = r.compositionWork?.writers.map((w) => w.name).join("; ") || "";
        const splits = r.compositionWork?.splits.map((s) => `${s.writerName}: ${s.percentage}%`).join("; ") || "";
        const pro = r.compositionWork?.writers.map((w) => w.pro || "N/A").join("; ") || "";
        return [`"${r.title}"`, `"${r.artist}"`, `"${r.album}"`, r.isrc || "", r.releaseDate || "", r.claimReadinessScore, `"${writers}"`, `"${splits}"`, `"${pro}"`, r.compositionWork?.iswc || ""].join(",");
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
    }, 800);
  };

  const completedTasks = claimTasks.filter((t) => t.status === "completed");
  const taskProgress = claimTasks.length > 0 ? Math.round((completedTasks.length / claimTasks.length) * 100) : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
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
            <Button variant="outline" size="sm" onClick={handleRescan} disabled={scanning} className="gap-2">
              {scanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <TrendingUp className="h-3 w-3" />}
              {scanning ? "Syncing..." : "Refresh"}
            </Button>
            <Link href="/dashboard/settings">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-3 w-3" /> Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
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
                <p className="text-xs text-muted-foreground">Claim-ready</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">{allIssues.length}</p>
                <p className="text-xs text-muted-foreground">Open issues</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <DollarSign className="h-6 w-6 text-warning" />
              <div>
                <p className="text-2xl font-bold">{stats.estimatedOpportunity}</p>
                <p className="text-xs text-muted-foreground">At risk/yr</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {recordings.length === 0 ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Music className="mb-3 h-10 w-10 text-primary/60" />
              <p className="text-lg font-semibold">Import your catalog to get started</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Connect your Google account to start. ClaimRail will audit your metadata, find missing royalties, and handle the rest.
              </p>
              <Link href="/connect" className="mt-4">
                <Button className="gap-2">Import Catalog</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Catalog — every song with inline issues */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your Catalog</CardTitle>
                <CardDescription>Click a song to see issues and fix them inline.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {recordings.map((rec) => {
                  const unresolvedIssues = rec.issues.filter((i) => !i.resolved);
                  const isExpanded = expandedSongId === rec.id;

                  return (
                    <div key={rec.id} className="rounded-lg border border-white/[0.04]">
                      <div
                        className="flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-white/[0.02]"
                        onClick={() => setExpandedSongId(isExpanded ? null : rec.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{rec.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{rec.artist} · {rec.album}</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 w-28">
                          <Progress value={rec.claimReadinessScore} className="h-1.5" indicatorClassName={scoreColor(rec.claimReadinessScore)} />
                          <span className="text-xs font-medium w-8 text-right">{rec.claimReadinessScore}%</span>
                        </div>
                        {unresolvedIssues.length > 0 ? (
                          <Badge variant={unresolvedIssues.some((i) => i.severity === "high") ? "danger" : "warning"} className="text-[10px]">
                            {unresolvedIssues.length}
                          </Badge>
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        )}
                        {isExpanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                      </div>

                      {isExpanded && (
                        <div className="border-t border-white/[0.04] bg-white/[0.01] px-3 pb-3 pt-2 space-y-2">
                          <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 text-xs">
                            <div><span className="text-muted-foreground">ISRC:</span> <span className={rec.isrc ? "" : "text-destructive"}>{rec.isrc || "Missing"}</span></div>
                            <div><span className="text-muted-foreground">Released:</span> <span className={rec.releaseDate ? "" : "text-destructive"}>{rec.releaseDate || "Missing"}</span></div>
                            <div><span className="text-muted-foreground">Composition:</span> <span className={rec.compositionWork ? "text-primary" : "text-destructive"}>{rec.compositionWork ? "Linked" : "Missing"}</span></div>
                            <div><span className="text-muted-foreground">Score:</span> <Badge variant={scoreBadge(rec.claimReadinessScore)} className="text-[10px] ml-1">{rec.claimReadinessScore}%</Badge></div>
                          </div>

                          {unresolvedIssues.length === 0 ? (
                            <div className="flex items-center gap-2 text-primary text-xs py-1">
                              <CheckCircle2 className="h-3 w-3" /> Ready for claiming
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {unresolvedIssues.map((issue) => (
                                <div key={issue.id}>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <AlertCircle className={`h-3 w-3 shrink-0 ${issue.severity === "high" ? "text-destructive" : "text-warning"}`} />
                                      <span className="text-xs font-medium truncate">{issue.title}</span>
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-[10px] px-2 shrink-0"
                                      onClick={(e) => { e.stopPropagation(); setFixingIssueId(fixingIssueId === issue.id ? null : issue.id); }}
                                    >
                                      {fixingIssueId === issue.id ? "Close" : "Fix"}
                                    </Button>
                                  </div>
                                  {fixingIssueId === issue.id && (
                                    <InlineFixForm
                                      issue={{ ...issue, songTitle: rec.title, songArtist: rec.artist, recordingId: rec.id }}
                                      onResolve={(formData) => handleResolve({ ...issue, songTitle: rec.title, songArtist: rec.artist, recordingId: rec.id }, formData)}
                                      onSkip={() => { resolveIssue(rec.id, issue.id); setFixingIssueId(null); }}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Claim Status — simplified */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Claim Status</CardTitle>
                <CardDescription>Where your songs stand across royalty destinations.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3">
                  {claimSnapshot.destinations.map((dest) => (
                    <div key={dest.key} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">{dest.label}</p>
                        <Badge variant={dest.automationMode === "autonomous" ? "default" : "secondary"} className="text-[10px]">
                          {dest.automationMode === "autonomous" ? "Auto" : "Manual"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                        <div><p className="text-sm font-bold text-warning">{dest.ready}</p><p className="text-muted-foreground">Ready</p></div>
                        <div><p className="text-sm font-bold text-destructive">{dest.blocked}</p><p className="text-muted-foreground">Blocked</p></div>
                        <div><p className="text-sm font-bold">{dest.inProgress}</p><p className="text-muted-foreground">Moving</p></div>
                        <div><p className="text-sm font-bold text-primary">{dest.complete}</p><p className="text-muted-foreground">Done</p></div>
                      </div>
                      {dest.href.startsWith("http") && (
                        <a href={dest.href} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                          {dest.label} portal <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tasks + Export side by side */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Task Progress */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Tasks</CardTitle>
                  <CardDescription>{completedTasks.length}/{claimTasks.length} completed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {claimTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tasks yet. Import your catalog to generate them.</p>
                  ) : (
                    <>
                      <Progress value={taskProgress} className="h-2 mb-3" indicatorClassName="bg-primary" />
                      {claimTasks.slice(0, 6).map((task) => (
                        <div key={task.id} className="flex items-center gap-2 text-sm">
                          {task.status === "completed" ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : (
                            <div className="h-3.5 w-3.5 rounded-full border border-white/20 shrink-0" />
                          )}
                          <span className={`flex-1 truncate ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>
                          {task.status !== "completed" && (
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => updateTaskStatus(task.id, "completed")}>
                              Done
                            </Button>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Export */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Export</CardTitle>
                  <CardDescription>Download claim-ready metadata as CSV.</CardDescription>
                </CardHeader>
                <CardContent>
                  {readySongs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No songs at 80%+ readiness yet. Fix issues above to unlock export.</p>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox
                          checked={selectedExportIds.size === readySongs.length && readySongs.length > 0}
                          onCheckedChange={() => {
                            if (selectedExportIds.size === readySongs.length) setSelectedExportIds(new Set());
                            else setSelectedExportIds(new Set(readySongs.map((r) => r.id)));
                          }}
                        />
                        <span className="text-xs text-muted-foreground">Select all ({readySongs.length} ready)</span>
                      </div>
                      {readySongs.slice(0, 8).map((rec) => (
                        <div key={rec.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={selectedExportIds.has(rec.id)}
                            onCheckedChange={() => {
                              setSelectedExportIds((prev) => {
                                const next = new Set(prev);
                                if (next.has(rec.id)) next.delete(rec.id); else next.add(rec.id);
                                return next;
                              });
                            }}
                          />
                          <span className="flex-1 truncate">{rec.title}</span>
                          <Badge variant="success" className="text-[10px]">{rec.claimReadinessScore}%</Badge>
                        </div>
                      ))}
                      <Button onClick={handleExport} disabled={selectedExportIds.size === 0 || exporting} className="w-full gap-2 mt-2" size="sm">
                        {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                        {exporting ? "Generating..." : `Export ${selectedExportIds.size} song${selectedExportIds.size !== 1 ? "s" : ""}`}
                      </Button>
                      {exported && (
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <CheckCircle2 className="h-3 w-3" /> Exported!
                        </div>
                      )}
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
