"use client";

import React from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Music,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Search,
  Wrench,
  Download,
  Sparkles,
  Zap,
} from "lucide-react";

function ScoreColor(score: number): string {
  if (score >= 80) return "bg-primary";
  if (score >= 50) return "bg-warning";
  return "bg-destructive";
}

function ScoreBadgeVariant(score: number): "success" | "warning" | "danger" {
  if (score >= 80) return "success";
  if (score >= 50) return "warning";
  return "danger";
}

function StatCard({
  label,
  value,
  icon: Icon,
  aura,
  valueColor,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  aura: string;
  valueColor?: string;
}) {
  return (
    <div className={`group relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.1] ${aura}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-[#727280]">{label}</span>
        <Icon className="h-4 w-4 text-[#727280] group-hover:text-white/40 transition-colors" />
      </div>
      <p className={`text-3xl font-bold tracking-tight ${valueColor || "text-white"}`}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { recordings, stats, claimTasks } = useAppStore();

  const recentIssues = recordings
    .flatMap((r) => r.issues.filter((i) => !i.resolved).map((i) => ({ ...i, songTitle: r.title })))
    .slice(0, 5);

  const activeTasks = claimTasks.filter((t) => t.status !== "completed").slice(0, 4);

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Hero Header with aura */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-purple-500/15 blur-[80px]" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 shadow-[0_0_20px_rgba(29,185,84,0.2)]">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
                Dashboard
              </h1>
            </div>
            <p className="text-[#727280] text-sm mt-1 max-w-lg">
              Your catalog health at a glance. Find missing royalties, fix metadata, and start collecting what you&apos;re owed.
            </p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Songs" value={stats.totalSongs} icon={Music} aura="hover:shadow-[0_0_30px_rgba(139,92,246,0.08)]" />
          <StatCard label="Ready" value={stats.fullyReady} icon={CheckCircle2} aura="hover:shadow-[0_0_30px_rgba(29,185,84,0.1)]" valueColor="text-primary glow-text-green" />
          <StatCard label="Action" value={stats.needingAction} icon={AlertTriangle} aura="hover:shadow-[0_0_30px_rgba(245,158,11,0.1)]" valueColor="text-warning glow-text-amber" />
          <StatCard label="High Risk" value={stats.highRisk} icon={AlertCircle} aura="hover:shadow-[0_0_30px_rgba(227,72,80,0.1)]" valueColor="text-destructive glow-text-red" />
          <StatCard label="At Risk" value={stats.estimatedOpportunity} icon={DollarSign} aura="hover:shadow-[0_0_30px_rgba(139,92,246,0.08)]" />
          <StatCard label="Avg Score" value={stats.avgReadinessScore} icon={TrendingUp} aura="hover:shadow-[0_0_30px_rgba(59,130,246,0.08)]" />
        </div>

        {/* Claim Readiness Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Claim Readiness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recordings.map((rec) => (
                <div key={rec.id} className="group flex items-center gap-4 rounded-lg p-2.5 -mx-2.5 transition-all hover:bg-white/[0.02]">
                  <div className="w-40 truncate text-sm font-medium text-white/90">{rec.title}</div>
                  <div className="flex-1">
                    <Progress
                      value={rec.claimReadinessScore}
                      className="h-2"
                      indicatorClassName={ScoreColor(rec.claimReadinessScore)}
                    />
                  </div>
                  <Badge variant={ScoreBadgeVariant(rec.claimReadinessScore)} className="w-16 justify-center text-[11px]">
                    {rec.claimReadinessScore}%
                  </Badge>
                  <span className="w-20 text-right text-xs text-[#727280]">
                    {rec.issues.filter((i) => !i.resolved).length} issue{rec.issues.filter((i) => !i.resolved).length !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Recent Issues */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Top Issues</CardTitle>
              <Link href="/fix">
                <Button variant="ghost" size="sm" className="gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentIssues.length === 0 ? (
                  <p className="text-sm text-[#727280]">No open issues. Your catalog looks great!</p>
                ) : (
                  recentIssues.map((issue) => (
                    <div key={issue.id} className="flex items-start gap-3 rounded-lg border border-white/[0.04] bg-white/[0.01] p-3 transition-all hover:bg-white/[0.03] hover:border-white/[0.08]">
                      <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                        issue.severity === "high"
                          ? "bg-destructive shadow-[0_0_6px_rgba(227,72,80,0.6)]"
                          : issue.severity === "medium"
                          ? "bg-warning shadow-[0_0_6px_rgba(245,158,11,0.6)]"
                          : "bg-[#727280]"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/90">{issue.title}</p>
                        <p className="text-xs text-[#727280] truncate">{issue.songTitle}</p>
                      </div>
                      <Badge
                        variant={issue.severity === "high" ? "danger" : issue.severity === "medium" ? "warning" : "secondary"}
                        className="text-[10px]"
                      >
                        {issue.severity}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Claim Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Claim Tasks</CardTitle>
              <Link href="/recover">
                <Button variant="ghost" size="sm" className="gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activeTasks.length === 0 ? (
                  <p className="text-sm text-[#727280]">No active tasks.</p>
                ) : (
                  activeTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.01] p-3 transition-all hover:bg-white/[0.03] hover:border-white/[0.08]">
                      <div
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          task.status === "in_progress"
                            ? "bg-primary shadow-[0_0_6px_rgba(29,185,84,0.6)]"
                            : "bg-[#727280]"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white/90">{task.title}</p>
                        <p className="text-xs text-[#727280]">{task.description}</p>
                      </div>
                      <Badge variant={task.status === "in_progress" ? "default" : "secondary"} className="text-[10px]">
                        {task.status === "in_progress" ? "Active" : "Pending"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/audit" className="group">
            <div className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:bg-white/[0.04] hover:border-primary/20 hover:shadow-[0_0_30px_rgba(29,185,84,0.06)]">
              <Search className="h-5 w-5 text-primary mb-3" />
              <p className="text-sm font-semibold text-white/90">Run Catalog Audit</p>
              <p className="text-xs text-[#727280] mt-1">Scan for missing metadata</p>
              <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#727280] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
          <Link href="/fix" className="group">
            <div className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:bg-white/[0.04] hover:border-warning/20 hover:shadow-[0_0_30px_rgba(245,158,11,0.06)]">
              <Wrench className="h-5 w-5 text-warning mb-3" />
              <p className="text-sm font-semibold text-white/90">Fix Issues ({stats.needingAction})</p>
              <p className="text-xs text-[#727280] mt-1">Resolve metadata problems</p>
              <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#727280] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
          <Link href="/recover" className="group">
            <div className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:bg-white/[0.04] hover:border-purple-500/20 hover:shadow-[0_0_30px_rgba(139,92,246,0.06)]">
              <Download className="h-5 w-5 text-purple-400 mb-3" />
              <p className="text-sm font-semibold text-white/90">Export Claim Packet</p>
              <p className="text-xs text-[#727280] mt-1">Download ready metadata</p>
              <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#727280] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
