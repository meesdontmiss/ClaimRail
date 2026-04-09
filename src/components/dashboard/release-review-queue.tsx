"use client";

import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CatalogIssue, CompositionWork, type Recording } from "@/lib/types";
import type { ClaimSongAction } from "@/lib/claim-center";
import { AlertCircle, Check, CheckCircle2, ChevronDown, ChevronUp, Music, X } from "lucide-react";

type ReleaseKind = "album" | "single";
type ReviewState = "blocked" | "ready" | "in_progress" | "complete";

interface IssueWithSong extends CatalogIssue {
  songTitle: string;
  songArtist: string;
  recordingId: string;
}

interface RecordingClaimBundle {
  bmi?: ClaimSongAction;
  mlc?: ClaimSongAction;
  songtrust?: ClaimSongAction;
}

interface ReleaseSongRow {
  recording: Recording;
  unresolvedIssues: CatalogIssue[];
  claimBundle: RecordingClaimBundle;
  reviewState: ReviewState;
  needsReview: boolean;
}

interface ReleaseGroup {
  id: string;
  label: string;
  kind: ReleaseKind;
  songs: ReleaseSongRow[];
  coverArt: string | null;
  songPreview: string[];
  reviewSummary: string;
  reviewSongs: number;
  blockedSongs: number;
  readySongs: number;
  inProgressSongs: number;
  completeSongs: number;
  totalIssues: number;
}

interface ReleaseReviewQueueProps {
  claimActions: ClaimSongAction[];
  recordings: Recording[];
  resolveIssue: (recordingId: string, issueId: string) => void;
  updateRecording: (recordingId: string, updates: Partial<Recording>) => void;
}

function normalizeReleaseLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isGenericSingleLabel(value: string) {
  const normalized = normalizeReleaseLabel(value);
  return normalized === "single" || normalized === "singles";
}

function getStateBadgeVariant(state: ReviewState) {
  switch (state) {
    case "blocked":
      return "danger" as const;
    case "ready":
      return "warning" as const;
    case "in_progress":
      return "secondary" as const;
    default:
      return "success" as const;
  }
}

function getStateLabel(state: ReviewState) {
  switch (state) {
    case "blocked":
      return "Blocked";
    case "ready":
      return "Ready";
    case "in_progress":
      return "In progress";
    default:
      return "Covered";
  }
}

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

function getReviewState(bundle: RecordingClaimBundle): ReviewState {
  const relevantActions = [bundle.bmi, bundle.mlc, bundle.songtrust].filter(
    Boolean
  ) as ClaimSongAction[];

  if (relevantActions.some((action) => action.state === "blocked")) {
    return "blocked";
  }
  if (relevantActions.some((action) => action.state === "ready")) {
    return "ready";
  }
  if (relevantActions.some((action) => action.state === "in_progress")) {
    return "in_progress";
  }
  return "complete";
}

function getReviewSummary(group: Pick<ReleaseGroup, "blockedSongs" | "readySongs" | "inProgressSongs" | "reviewSongs">) {
  if (group.blockedSongs > 0) {
    return `${group.blockedSongs} song${group.blockedSongs === 1 ? "" : "s"} still need metadata fixes before BMI or publishing registration can move.`;
  }

  if (group.readySongs > 0) {
    return `${group.readySongs} song${group.readySongs === 1 ? "" : "s"} look ready for BMI / publishing registration once you confirm the details.`;
  }

  if (group.inProgressSongs > 0) {
    return `${group.inProgressSongs} song${group.inProgressSongs === 1 ? "" : "s"} are already moving through ClaimRail's registration flow.`;
  }

  if (group.reviewSongs === 0) {
    return "ClaimRail currently sees this release as covered across BMI, The MLC, and publishing admin.";
  }

  return "ClaimRail still sees open publishing follow-up on this release.";
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
        return [{ key: "pro", label: "PRO", placeholder: "e.g., BMI, ASCAP, SESAC" }];
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
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, [field.key]: event.target.value }))
                }
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs italic text-muted-foreground">No additional info needed.</p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onResolve(formData)} className="h-7 gap-1 text-xs">
          <Check className="h-3 w-3" /> Save and resolve
        </Button>
        <Button size="sm" variant="ghost" onClick={onSkip} className="h-7 gap-1 text-xs">
          <X className="h-3 w-3" /> Skip
        </Button>
      </div>
    </div>
  );
}

export function ReleaseReviewQueue({
  claimActions,
  recordings,
  resolveIssue,
  updateRecording,
}: ReleaseReviewQueueProps) {
  const [catalogView, setCatalogView] = useState<"review" | "all">("review");
  const [releaseSearch, setReleaseSearch] = useState("");
  const [expandedReleaseId, setExpandedReleaseId] = useState<string | null>(null);
  const [expandedSongId, setExpandedSongId] = useState<string | null>(null);
  const [fixingIssueId, setFixingIssueId] = useState<string | null>(null);

  const claimActionsByRecording = useMemo(() => {
    const actions = new Map<string, RecordingClaimBundle>();
    for (const action of claimActions) {
      const current = actions.get(action.recordingId) ?? {};
      current[action.destination] = action;
      actions.set(action.recordingId, current);
    }
    return actions;
  }, [claimActions]);

  const releaseGroups = useMemo(() => {
    const groups = new Map<string, { id: string; label: string; kind: ReleaseKind; songs: ReleaseSongRow[] }>();
    const searchValue = normalizeReleaseLabel(releaseSearch);

    for (const recording of recordings) {
      const albumLabel = recording.album?.trim() || recording.title;
      const genericSingle = isGenericSingleLabel(albumLabel);
      const groupId = genericSingle
        ? `single::${normalizeReleaseLabel(recording.title)}`
        : `release::${normalizeReleaseLabel(albumLabel)}`;
      const claimBundle = claimActionsByRecording.get(recording.id) ?? {};
      const row: ReleaseSongRow = {
        recording,
        unresolvedIssues: recording.issues.filter((issue) => !issue.resolved),
        claimBundle,
        reviewState: getReviewState(claimBundle),
        needsReview: getReviewState(claimBundle) !== "complete",
      };
      const current = groups.get(groupId);
      if (current) current.songs.push(row);
      else groups.set(groupId, { id: groupId, label: albumLabel, kind: genericSingle ? "single" : "album", songs: [row] });
    }

    return [...groups.values()]
      .map((group) => {
        const songs = [...group.songs].sort((left, right) => {
          if (left.needsReview !== right.needsReview) {
            return left.needsReview ? -1 : 1;
          }
          if (left.unresolvedIssues.length !== right.unresolvedIssues.length) {
            return right.unresolvedIssues.length - left.unresolvedIssues.length;
          }
          if (left.reviewState !== right.reviewState) {
            const order: Record<ReviewState, number> = {
              blocked: 0,
              ready: 1,
              in_progress: 2,
              complete: 3,
            };

            return order[left.reviewState] - order[right.reviewState];
          }

          return left.recording.title.localeCompare(right.recording.title);
        });
        const kind: ReleaseKind = group.kind === "single" || songs.length === 1 ? "single" : "album";
        const label = kind === "single" && isGenericSingleLabel(group.label) ? songs[0]?.recording.title || group.label : group.label;
        const releaseGroup = {
          id: group.id,
          label,
          kind,
          songs,
          coverArt: songs.find((song) => song.recording.albumArt)?.recording.albumArt ?? null,
          songPreview: songs
            .filter((song) => song.needsReview)
            .slice(0, 3)
            .map((song) => song.recording.title),
          reviewSongs: songs.filter((song) => song.needsReview).length,
          blockedSongs: songs.filter((song) => song.reviewState === "blocked").length,
          readySongs: songs.filter((song) => song.reviewState === "ready").length,
          inProgressSongs: songs.filter((song) => song.reviewState === "in_progress").length,
          completeSongs: songs.filter((song) => song.reviewState === "complete").length,
          totalIssues: songs.reduce((sum, song) => sum + song.unresolvedIssues.length, 0),
          reviewSummary: "",
        } satisfies ReleaseGroup;

        releaseGroup.reviewSummary = getReviewSummary(releaseGroup);
        return releaseGroup;
      })
      .filter((group) => {
        if (catalogView === "review" && group.reviewSongs === 0) return false;
        if (!searchValue) return true;
        return (
          normalizeReleaseLabel(group.label).includes(searchValue) ||
          group.songs.some((song) =>
            normalizeReleaseLabel(`${song.recording.title} ${song.recording.artist}`).includes(searchValue)
          )
        );
      })
      .sort((left, right) => {
        if (left.kind !== right.kind) return left.kind === "album" ? -1 : 1;
        if (left.reviewSongs !== right.reviewSongs) return right.reviewSongs - left.reviewSongs;
        if (left.totalIssues !== right.totalIssues) return right.totalIssues - left.totalIssues;
        return left.label.localeCompare(right.label);
      });
  }, [catalogView, claimActionsByRecording, recordings, releaseSearch]);

  const albumGroups = releaseGroups.filter((group) => group.kind === "album");
  const singleGroups = releaseGroups.filter((group) => group.kind === "single");
  const reviewSongCount = releaseGroups.reduce((sum, group) => sum + group.reviewSongs, 0);
  const coveredSongCount = releaseGroups.reduce((sum, group) => sum + group.completeSongs, 0);

  const handleResolve = (recording: Recording, issue: IssueWithSong, formData: Record<string, string>) => {
    switch (issue.type) {
      case "missing_writer": {
        const compositionWork = buildCompositionWork(recording.compositionWork, recording.id, recording.title);
        const writerId = `writer-${recording.id}`;
        const writerName = formData.writerName || recording.artist;
        updateRecording(recording.id, {
          compositionWork: {
            ...compositionWork,
            writers: [
              ...compositionWork.writers.filter((writer) => writer.id !== writerId),
              { id: writerId, name: writerName, pro: formData.pro || null, ipi: null, role: "composer_lyricist" },
            ],
            splits: compositionWork.splits.length > 0 ? compositionWork.splits : [{ writerId, writerName, percentage: 100 }],
          },
        });
        break;
      }
      case "no_composition_work": {
        const writerName = formData.writerName || recording.artist;
        updateRecording(recording.id, {
          compositionWork: {
            id: `cw-${recording.id}`,
            title: formData.workTitle || recording.title,
            pro: null,
            writers: [{ id: `writer-${recording.id}`, name: writerName, pro: null, ipi: null, role: "composer_lyricist" }],
            splits: [{ writerId: `writer-${recording.id}`, writerName, percentage: 100 }],
            proRegistered: false,
            adminRegistered: false,
            iswc: null,
          },
        });
        break;
      }
      case "missing_pro_admin": {
        const compositionWork = buildCompositionWork(recording.compositionWork, recording.id, recording.title);
        updateRecording(recording.id, { compositionWork: { ...compositionWork, pro: formData.pro || compositionWork.pro || null } });
        break;
      }
      case "missing_isrc":
        updateRecording(recording.id, { isrc: formData.isrc || recording.isrc });
        break;
      case "missing_release_date":
        updateRecording(recording.id, { releaseDate: formData.releaseDate || recording.releaseDate });
        break;
      case "invalid_splits": {
        const compositionWork = buildCompositionWork(recording.compositionWork, recording.id, recording.title);
        const [writer1, writer2] = compositionWork.writers;
        if (writer1 && writer2) {
          updateRecording(recording.id, {
            compositionWork: {
              ...compositionWork,
              splits: [
                { writerId: writer1.id, writerName: writer1.name, percentage: Number(formData.writer1Split || 0) },
                { writerId: writer2.id, writerName: writer2.name, percentage: Number(formData.writer2Split || 0) },
              ],
            },
          });
        }
        break;
      }
    }

    resolveIssue(issue.recordingId, issue.id);
    setFixingIssueId(null);
  };

  const renderDestinationBadge = (label: string, action?: ClaimSongAction) =>
    action ? (
      <Badge variant={getStateBadgeVariant(action.state)} className="text-[10px]">
        {label} {getStateLabel(action.state)}
      </Badge>
    ) : null;

  const renderGroup = (group: ReleaseGroup) => {
    const isExpanded = expandedReleaseId === group.id;
    return (
      <div key={group.id} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <button
          type="button"
          className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-white/[0.02]"
          onClick={() => setExpandedReleaseId(isExpanded ? null : group.id)}
        >
          <div className="flex min-w-0 flex-1 items-start gap-4">
            {group.coverArt ? (
              <img
                src={group.coverArt}
                alt={`${group.label} cover art`}
                className="h-16 w-16 shrink-0 rounded-xl border border-white/10 object-cover shadow-[0_12px_24px_rgba(0,0,0,0.22)]"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-primary/70 shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
                <Music className="h-6 w-6" />
              </div>
            )}

            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">{group.label}</p>
                <Badge variant="outline" className="text-[10px]">{group.kind === "album" ? "Album" : "Single"}</Badge>
                {group.reviewSongs > 0 ? (
                  <Badge variant="warning" className="text-[10px]">{group.reviewSongs} need review</Badge>
                ) : (
                  <Badge variant="success" className="text-[10px]">Covered in ClaimRail</Badge>
                )}
              </div>
              <p className="text-xs leading-5 text-muted-foreground">{group.reviewSummary}</p>
              {group.songPreview.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {group.songPreview.map((title) => (
                    <span
                      key={`${group.id}-${title}`}
                      className="rounded-full border border-white/[0.08] bg-black/15 px-2 py-1 text-[10px] text-muted-foreground"
                    >
                      {title}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Everything in this release currently looks covered.</span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{group.songs.length} song{group.songs.length === 1 ? "" : "s"}</span>
                <span>{group.totalIssues} unresolved issue{group.totalIssues === 1 ? "" : "s"}</span>
                {group.blockedSongs > 0 ? <span>{group.blockedSongs} blocked</span> : null}
                {group.readySongs > 0 ? <span>{group.readySongs} ready</span> : null}
                {group.inProgressSongs > 0 ? <span>{group.inProgressSongs} in progress</span> : null}
              </div>
            </div>
          </div>
          {isExpanded ? <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
        </button>
        {isExpanded ? (
          <div className="space-y-2 border-t border-white/[0.05] px-3 py-3">
            {group.songs.map((song) => {
              const recording = song.recording;
              const isSongExpanded = expandedSongId === recording.id;
              return (
                <div key={recording.id} className="rounded-lg border border-white/[0.05] bg-white/[0.01]">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-white/[0.02]"
                    onClick={() => setExpandedSongId(isSongExpanded ? null : recording.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium">{recording.title}</p>
                        <Badge variant={getStateBadgeVariant(song.reviewState)} className="text-[10px]">{getStateLabel(song.reviewState)}</Badge>
                        {song.unresolvedIssues.length > 0 ? (
                          <Badge
                            variant={song.unresolvedIssues.some((issue) => issue.severity === "high") ? "danger" : "warning"}
                            className="text-[10px]"
                          >
                            {song.unresolvedIssues.length} issue{song.unresolvedIssues.length === 1 ? "" : "s"}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{recording.artist}</span>
                        {recording.releaseDate ? <span>{recording.releaseDate}</span> : null}
                        {renderDestinationBadge("BMI", song.claimBundle.bmi)}
                        {renderDestinationBadge("MLC", song.claimBundle.mlc)}
                        {renderDestinationBadge("Admin", song.claimBundle.songtrust)}
                      </div>
                    </div>
                    <div className="hidden w-28 items-center gap-2 sm:flex">
                      <Progress value={recording.claimReadinessScore} className="h-1.5" indicatorClassName={scoreColor(recording.claimReadinessScore)} />
                      <span className="w-8 text-right text-xs font-medium">{recording.claimReadinessScore}%</span>
                    </div>
                    {isSongExpanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  </button>
                  {isSongExpanded ? (
                    <div className="space-y-2 border-t border-white/[0.04] bg-white/[0.01] px-3 pb-3 pt-2">
                      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                        <div><span className="text-muted-foreground">ISRC:</span> <span className={recording.isrc ? "" : "text-destructive"}>{recording.isrc || "Missing"}</span></div>
                        <div><span className="text-muted-foreground">Release:</span> <span className={recording.releaseDate ? "" : "text-destructive"}>{recording.releaseDate || "Missing"}</span></div>
                        <div><span className="text-muted-foreground">Composition:</span> <span className={recording.compositionWork ? "text-primary" : "text-destructive"}>{recording.compositionWork ? "Linked" : "Missing"}</span></div>
                        <div><span className="text-muted-foreground">Score:</span> <Badge variant={scoreBadge(recording.claimReadinessScore)} className="ml-1 text-[10px]">{recording.claimReadinessScore}%</Badge></div>
                      </div>
                      {song.unresolvedIssues.length === 0 ? (
                        <div className="flex items-center gap-2 py-1 text-xs text-primary">
                          <CheckCircle2 className="h-3 w-3" /> Ready for claiming
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {song.unresolvedIssues.map((issue) => (
                            <div key={issue.id}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  <AlertCircle className={`h-3 w-3 shrink-0 ${issue.severity === "high" ? "text-destructive" : "text-warning"}`} />
                                  <span className="truncate text-xs font-medium">{issue.title}</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 shrink-0 px-2 text-[10px]"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setFixingIssueId(fixingIssueId === issue.id ? null : issue.id);
                                  }}
                                >
                                  {fixingIssueId === issue.id ? "Close" : "Fix"}
                                </Button>
                              </div>
                              {fixingIssueId === issue.id ? (
                                <InlineFixForm
                                  issue={{ ...issue, songTitle: recording.title, songArtist: recording.artist, recordingId: recording.id }}
                                  onResolve={(formData) =>
                                    handleResolve(
                                      recording,
                                      { ...issue, songTitle: recording.title, songArtist: recording.artist, recordingId: recording.id },
                                      formData
                                    )
                                  }
                                  onSkip={() => {
                                    resolveIssue(recording.id, issue.id);
                                    setFixingIssueId(null);
                                  }}
                                />
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-base">BMI / Publishing Review Queue</CardTitle>
            <CardDescription>
              Cover-art release cards keep albums together, singles separate, and push the releases with missing BMI or publishing coverage to the top of the feed.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="warning" className="text-[10px]">{reviewSongCount} songs need follow-up</Badge>
            <Badge variant="outline" className="text-[10px]">{albumGroups.length} album releases</Badge>
            <Badge variant="outline" className="text-[10px]">{singleGroups.length} singles</Badge>
            <Badge variant="success" className="text-[10px]">{coveredSongCount} covered</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full max-w-md">
            <Input
              value={releaseSearch}
              onChange={(event) => setReleaseSearch(event.target.value)}
              placeholder="Search release or song"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={catalogView === "review" ? "secondary" : "ghost"} onClick={() => setCatalogView("review")}>
              Needs review
            </Button>
            <Button size="sm" variant={catalogView === "all" ? "secondary" : "ghost"} onClick={() => setCatalogView("all")}>
              All imported
            </Button>
          </div>
        </div>

        {releaseGroups.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-sm text-muted-foreground">
            {catalogView === "review"
              ? "ClaimRail is not seeing any releases that still need BMI or publishing follow-up right now."
              : "No imported releases match this search yet."}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Albums</h3>
                <p className="text-xs text-muted-foreground">Review each release as one publishing packet.</p>
              </div>
              {albumGroups.length > 0 ? albumGroups.map(renderGroup) : (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-sm text-muted-foreground">
                  No albums match this view.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Singles</h3>
                <p className="text-xs text-muted-foreground">Singles stay separate so one-offs stay easy to clear.</p>
              </div>
              {singleGroups.length > 0 ? singleGroups.map(renderGroup) : (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-sm text-muted-foreground">
                  No singles match this view.
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
