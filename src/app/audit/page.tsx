"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { ISSUE_TYPE_LABELS } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Search,
  AlertCircle,
  CheckCircle2,
  Music,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Disc3,
} from "lucide-react";

function scoreColor(score: number): string {
  if (score >= 80) return "bg-primary";
  if (score >= 50) return "bg-warning";
  return "bg-destructive";
}

function scoreBadgeVariant(score: number): "success" | "warning" | "danger" {
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "danger";
}

export default function AuditPage() {
  const { recordings, stats } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const filteredRecordings = recordings.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.album.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterSeverity === "all") return matchesSearch;
    if (filterSeverity === "clean") return matchesSearch && r.issues.filter((i) => !i.resolved).length === 0;
    return matchesSearch && r.issues.some((i) => i.severity === filterSeverity && !i.resolved);
  });

  const issuesByType = recordings
    .flatMap((r) => r.issues.filter((i) => !i.resolved))
    .reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const handleRescan = () => {
    setScanning(true);
    setTimeout(() => setScanning(false), 2000);
  };

  return (
    <AppShell>
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit</h1>
          <p className="mt-1 text-muted-foreground">
            Scan your catalog for missing publishing metadata and claim blockers.
          </p>
        </div>
        <Button onClick={handleRescan} disabled={scanning} className="gap-2">
          {scanning ? (
            <Disc3 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {scanning ? "Scanning..." : "Re-scan Catalog"}
        </Button>
      </div>

      {/* Issue Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:border-primary/50" onClick={() => setFilterSeverity("all")}>
          <CardContent className="flex items-center gap-4 py-4">
            <Music className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{stats.totalSongs}</p>
              <p className="text-xs text-muted-foreground">Total songs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-destructive/50" onClick={() => setFilterSeverity("high")}>
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-2xl font-bold text-destructive">{stats.highRisk}</p>
              <p className="text-xs text-muted-foreground">High-risk songs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-warning/50" onClick={() => setFilterSeverity("medium")}>
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="h-8 w-8 text-warning" />
            <div>
              <p className="text-2xl font-bold text-warning">
                {recordings.filter((r) => r.issues.some((i) => i.severity === "medium" && !i.resolved)).length}
              </p>
              <p className="text-xs text-muted-foreground">Medium-risk songs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-success/50" onClick={() => setFilterSeverity("clean")}>
          <CardContent className="flex items-center gap-4 py-4">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <div>
              <p className="text-2xl font-bold text-success">{stats.fullyReady}</p>
              <p className="text-xs text-muted-foreground">Fully ready</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Issue Breakdown</CardTitle>
          <CardDescription>Types of problems found across your catalog</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(issuesByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">{ISSUE_TYPE_LABELS[type as keyof typeof ISSUE_TYPE_LABELS] || type}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
            {Object.keys(issuesByType).length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground">No issues found. Your catalog looks clean!</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Song List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Song-by-Song Audit</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search songs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={filterSeverity} onValueChange={setFilterSeverity}>
            <TabsList>
              <TabsTrigger value="all">All ({recordings.length})</TabsTrigger>
              <TabsTrigger value="high">High Risk ({stats.highRisk})</TabsTrigger>
              <TabsTrigger value="medium">
                Medium ({recordings.filter((r) => r.issues.some((i) => i.severity === "medium" && !i.resolved)).length})
              </TabsTrigger>
              <TabsTrigger value="clean">Clean ({stats.fullyReady})</TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-2">
              {filteredRecordings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">No songs match your filter</p>
                  <p className="text-xs text-muted-foreground">Try adjusting your search or filter</p>
                </div>
              ) : (
                filteredRecordings.map((rec) => {
                  const unresolvedIssues = rec.issues.filter((i) => !i.resolved);
                  const isExpanded = expandedId === rec.id;

                  return (
                    <div key={rec.id} className="rounded-lg border">
                      <div
                        className="flex cursor-pointer items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{rec.title}</p>
                            {unresolvedIssues.length === 0 && (
                              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {rec.artist} &middot; {rec.album}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="hidden sm:flex items-center gap-2 w-32">
                            <Progress
                              value={rec.claimReadinessScore}
                              className="h-2"
                              indicatorClassName={scoreColor(rec.claimReadinessScore)}
                            />
                            <span className="text-xs font-medium w-8">{rec.claimReadinessScore}%</span>
                          </div>

                          {unresolvedIssues.length > 0 && (
                            <Badge
                              variant={
                                unresolvedIssues.some((i) => i.severity === "high")
                                  ? "danger"
                                  : unresolvedIssues.some((i) => i.severity === "medium")
                                  ? "warning"
                                  : "secondary"
                              }
                            >
                              {unresolvedIssues.length} issue{unresolvedIssues.length !== 1 ? "s" : ""}
                            </Badge>
                          )}

                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-white/[0.04] bg-white/[0.02] p-4">
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                            <div>
                              <p className="text-xs text-muted-foreground">ISRC</p>
                              <p className="text-sm font-medium">{rec.isrc || <span className="text-destructive">Missing</span>}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Release Date</p>
                              <p className="text-sm font-medium">{rec.releaseDate || <span className="text-destructive">Missing</span>}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Composition</p>
                              <p className="text-sm font-medium">
                                {rec.compositionWork ? (
                                  <span className="text-success">Linked</span>
                                ) : (
                                  <span className="text-destructive">Not linked</span>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Claim Readiness</p>
                              <Badge variant={scoreBadgeVariant(rec.claimReadinessScore)}>
                                {rec.claimReadinessScore}%
                              </Badge>
                            </div>
                          </div>

                          {unresolvedIssues.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Issues</p>
                              {unresolvedIssues.map((issue) => (
                                <div key={issue.id} className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                                  <AlertCircle
                                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                                      issue.severity === "high" ? "text-destructive" : issue.severity === "medium" ? "text-warning" : "text-muted-foreground"
                                    }`}
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{issue.title}</p>
                                    <p className="text-xs text-muted-foreground">{issue.description}</p>
                                  </div>
                                  <Link href="/fix">
                                    <Button size="sm" variant="outline" className="shrink-0 gap-1">
                                      {issue.actionLabel} <ArrowRight className="h-3 w-3" />
                                    </Button>
                                  </Link>
                                </div>
                              ))}
                            </div>
                          )}

                          {unresolvedIssues.length === 0 && (
                            <div className="flex items-center gap-2 text-success">
                              <CheckCircle2 className="h-4 w-4" />
                              <p className="text-sm font-medium">This song is fully ready for claiming</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
    </AppShell>
  );
}
