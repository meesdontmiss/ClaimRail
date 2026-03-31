"use client";

import React, { useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import {
  CatalogIssue,
  ISSUE_TYPE_LABELS,
  ISSUE_SEVERITY_CONFIG,
  CompositionWork,
} from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertCircle,
  CheckCircle2,
  Search,
  Check,
  X,
} from "lucide-react";

interface IssueWithSong extends CatalogIssue {
  songTitle: string;
  songArtist: string;
}

interface FixFormProps {
  issue: IssueWithSong;
  onResolve: (formData: Record<string, string>) => void;
  onSkip: () => void;
}

function FixForm({ issue, onResolve, onSkip }: FixFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});

  const fields: { key: string; label: string; placeholder: string }[] = (() => {
    switch (issue.type) {
      case "missing_writer":
        return [
          {
            key: "writerName",
            label: "Songwriter name",
            placeholder: "e.g., Your full legal name",
          },
          {
            key: "pro",
            label: "PRO affiliation",
            placeholder: "e.g., BMI, ASCAP, SESAC",
          },
          {
            key: "ipi",
            label: "IPI number (optional)",
            placeholder: "e.g., 00123456789",
          },
        ];
      case "invalid_splits":
        return [
          {
            key: "writer1Split",
            label: "Your share (%)",
            placeholder: "e.g., 50",
          },
          {
            key: "writer2Split",
            label: "Co-writer share (%)",
            placeholder: "e.g., 50",
          },
        ];
      case "no_composition_work":
        return [
          {
            key: "workTitle",
            label: "Composition title",
            placeholder: "Usually same as song title",
          },
          {
            key: "writerName",
            label: "Primary songwriter",
            placeholder: "Your full legal name",
          },
        ];
      case "missing_pro_admin":
        return [
          {
            key: "pro",
            label: "PRO (Performance Rights Org)",
            placeholder: "e.g., BMI, ASCAP, SESAC, PRS",
          },
          {
            key: "admin",
            label: "Publishing admin (optional)",
            placeholder: "e.g., Songtrust, TuneCore Publishing",
          },
        ];
      case "missing_isrc":
        return [
          {
            key: "isrc",
            label: "ISRC code",
            placeholder: "e.g., US-ABC-24-00001",
          },
        ];
      case "missing_release_date":
        return [
          {
            key: "releaseDate",
            label: "Release date",
            placeholder: "YYYY-MM-DD",
          },
        ];
      case "incomplete_registration":
        return [
          {
            key: "iswc",
            label: "ISWC code (optional)",
            placeholder: "e.g., T-012345678-9",
          },
        ];
      default:
        return [];
    }
  })();

  return (
    <div className="space-y-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium">{issue.songTitle}</p>
          <p className="text-xs text-muted-foreground">{issue.songArtist}</p>
        </div>
        <Badge
          variant={
            issue.severity === "high"
              ? "danger"
              : issue.severity === "medium"
              ? "warning"
              : "secondary"
          }
        >
          {ISSUE_SEVERITY_CONFIG[issue.severity].label}
        </Badge>
      </div>

      <div>
        <p className="text-sm font-medium">{issue.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{issue.description}</p>
      </div>

      {fields.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.key}>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {field.label}
              </label>
              <Input
                placeholder={field.placeholder}
                value={formData[field.key] || ""}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    [field.key]: event.target.value,
                  }))
                }
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          {issue.type === "duplicate_work"
            ? "Review the potential duplicate and confirm whether this is the same work or a different one."
            : "No additional information needed."}
        </p>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={() => onResolve(formData)} className="gap-1">
          <Check className="h-3 w-3" />
          {issue.type === "duplicate_work" ? "Not a duplicate" : "Save & resolve"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onSkip} className="gap-1">
          <X className="h-3 w-3" />
          Skip for now
        </Button>
      </div>
    </div>
  );
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
      writers: [],
      splits: [],
      proRegistered: false,
      adminRegistered: false,
      iswc: null,
    }
  );
}

export default function FixPage() {
  const { recordings, resolveIssue, updateRecording, bulkResolveIssues } =
    useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIssueIds, setSelectedIssueIds] = useState<Set<string>>(new Set());
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>("all");

  const allIssues = useMemo(
    () =>
      recordings.flatMap((recording) =>
        recording.issues
          .filter((issue) => !issue.resolved)
          .map((issue) => ({
            ...issue,
            songTitle: recording.title,
            songArtist: recording.artist,
            recordingId: recording.id,
          }))
      ),
    [recordings]
  );

  const filteredIssues = useMemo(() => {
    return allIssues.filter((issue) => {
      const matchesSearch =
        issue.songTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        issue.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType =
        issueTypeFilter === "all" || issue.type === issueTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [allIssues, searchQuery, issueTypeFilter]);

  const highPriority = filteredIssues.filter((issue) => issue.severity === "high");
  const mediumPriority = filteredIssues.filter(
    (issue) => issue.severity === "medium"
  );
  const lowPriority = filteredIssues.filter((issue) => issue.severity === "low");

  const issueTypes = useMemo(() => {
    const types = new Map<string, number>();
    allIssues.forEach((issue) => {
      types.set(issue.type, (types.get(issue.type) || 0) + 1);
    });
    return types;
  }, [allIssues]);

  const toggleSelect = (id: string) => {
    setSelectedIssueIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIssueIds.size === filteredIssues.length) {
      setSelectedIssueIds(new Set());
    } else {
      setSelectedIssueIds(new Set(filteredIssues.map((issue) => issue.id)));
    }
  };

  const handleBulkResolve = () => {
    bulkResolveIssues(Array.from(selectedIssueIds));
    setSelectedIssueIds(new Set());
  };

  const handleResolve = (
    issue: IssueWithSong & { recordingId: string },
    formData: Record<string, string>
  ) => {
    const recording = recordings.find((item) => item.id === issue.recordingId);
    if (!recording) {
      return;
    }

    switch (issue.type) {
      case "missing_writer": {
        const compositionWork = buildCompositionWork(
          recording.compositionWork,
          recording.id,
          recording.title
        );
        const writerId = `writer-${recording.id}`;
        const writerName = formData.writerName || recording.artist;
        updateRecording(recording.id, {
          compositionWork: {
            ...compositionWork,
            writers: [
              ...compositionWork.writers.filter((writer) => writer.id !== writerId),
              {
                id: writerId,
                name: writerName,
                pro: formData.pro || null,
                ipi: formData.ipi || null,
                role: "composer_lyricist",
              },
            ],
            splits:
              compositionWork.splits.length > 0
                ? compositionWork.splits
                : [
                    {
                      writerId,
                      writerName,
                      percentage: 100,
                    },
                  ],
          },
        });
        break;
      }
      case "invalid_splits": {
        const compositionWork = buildCompositionWork(
          recording.compositionWork,
          recording.id,
          recording.title
        );
        const [firstWriter, secondWriter] = compositionWork.writers;
        if (firstWriter && secondWriter) {
          updateRecording(recording.id, {
            compositionWork: {
              ...compositionWork,
              splits: [
                {
                  writerId: firstWriter.id,
                  writerName: firstWriter.name,
                  percentage: Number(formData.writer1Split || 0),
                },
                {
                  writerId: secondWriter.id,
                  writerName: secondWriter.name,
                  percentage: Number(formData.writer2Split || 0),
                },
              ],
            },
          });
        }
        break;
      }
      case "no_composition_work": {
        const writerName = formData.writerName || recording.artist;
        updateRecording(recording.id, {
          compositionWork: {
            id: `cw-${recording.id}`,
            title: formData.workTitle || recording.title,
            writers: [
              {
                id: `writer-${recording.id}`,
                name: writerName,
                pro: null,
                ipi: null,
                role: "composer_lyricist",
              },
            ],
            splits: [
              {
                writerId: `writer-${recording.id}`,
                writerName,
                percentage: 100,
              },
            ],
            proRegistered: false,
            adminRegistered: false,
            iswc: null,
          },
        });
        break;
      }
      case "missing_pro_admin": {
        const compositionWork = buildCompositionWork(
          recording.compositionWork,
          recording.id,
          recording.title
        );
        updateRecording(recording.id, {
          compositionWork: {
            ...compositionWork,
            proRegistered: Boolean(formData.pro) || compositionWork.proRegistered,
            adminRegistered:
              Boolean(formData.admin) || compositionWork.adminRegistered,
          },
        });
        break;
      }
      case "missing_isrc":
        updateRecording(recording.id, { isrc: formData.isrc || recording.isrc });
        break;
      case "missing_release_date":
        updateRecording(recording.id, {
          releaseDate: formData.releaseDate || recording.releaseDate,
        });
        break;
      case "incomplete_registration": {
        const compositionWork = buildCompositionWork(
          recording.compositionWork,
          recording.id,
          recording.title
        );
        updateRecording(recording.id, {
          compositionWork: {
            ...compositionWork,
            iswc: formData.iswc || compositionWork.iswc,
          },
        });
        break;
      }
      default:
        break;
    }

    resolveIssue(issue.recordingId, issue.id);
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fix Issues</h1>
            <p className="mt-1 text-muted-foreground">
              Resolve metadata problems so your songs can start collecting royalties.
            </p>
          </div>
          {selectedIssueIds.size > 0 && (
            <Button onClick={handleBulkResolve} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Resolve {selectedIssueIds.size} selected
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Badge variant="danger" className="px-3 py-1.5 text-sm">
            {highPriority.length} high-risk
          </Badge>
          <Badge variant="warning" className="px-3 py-1.5 text-sm">
            {mediumPriority.length} medium-risk
          </Badge>
          <Badge variant="secondary" className="px-3 py-1.5 text-sm">
            {lowPriority.length} low-risk
          </Badge>
          <Badge variant="outline" className="px-3 py-1.5 text-sm">
            {allIssues.length} total issues
          </Badge>
        </div>

        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search songs or issues..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={issueTypeFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIssueTypeFilter("all")}
                >
                  All
                </Button>
                {Array.from(issueTypes.entries()).map(([type, count]) => (
                  <Button
                    key={type}
                    variant={issueTypeFilter === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIssueTypeFilter(type)}
                    className="gap-1"
                  >
                    {ISSUE_TYPE_LABELS[type as keyof typeof ISSUE_TYPE_LABELS]
                      ?.split(" ")
                      .slice(0, 2)
                      .join(" ") || type}
                    <Badge
                      variant="secondary"
                      className="ml-1 px-1.5 py-0 text-xs"
                    >
                      {count}
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {filteredIssues.length > 0 && (
          <div className="flex items-center gap-3">
            <Checkbox
              checked={
                selectedIssueIds.size === filteredIssues.length &&
                filteredIssues.length > 0
              }
              onCheckedChange={selectAll}
            />
            <span className="text-sm text-muted-foreground">
              Select all ({filteredIssues.length} issues)
            </span>
          </div>
        )}

        {filteredIssues.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <CheckCircle2 className="mb-3 h-12 w-12 text-success" />
              <p className="text-lg font-medium">All clear!</p>
              <p className="text-sm text-muted-foreground">
                {allIssues.length === 0
                  ? "No issues found in your catalog."
                  : "No issues match your current filter."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {[
              { label: "High Risk - Fix these first", issues: highPriority, tone: "text-destructive" },
              { label: "Medium Risk", issues: mediumPriority, tone: "text-warning" },
              { label: "Low Risk", issues: lowPriority, tone: "text-muted-foreground" },
            ]
              .filter((section) => section.issues.length > 0)
              .map((section) => (
                <div key={section.label}>
                  <div className="mb-3 flex items-center gap-2">
                    <AlertCircle className={`h-4 w-4 ${section.tone}`} />
                    <h2 className={`text-sm font-semibold uppercase tracking-wide ${section.tone}`}>
                      {section.label}
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {section.issues.map((issue) => (
                      <div key={issue.id} className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedIssueIds.has(issue.id)}
                          onCheckedChange={() => toggleSelect(issue.id)}
                          className="mt-4"
                        />
                        <div className="flex-1">
                          <FixForm
                            issue={issue}
                            onResolve={(formData) => handleResolve(issue, formData)}
                            onSkip={() => {}}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
