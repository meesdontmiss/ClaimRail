"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { LaunchGuideCard } from "@/components/setup/launch-guide-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/lib/store";
import { buildClaimCenterSnapshot, ClaimDestinationSummary, ClaimSongAction } from "@/lib/claim-center";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ExternalLink,
  Landmark,
  ListChecks,
  LoaderCircle,
  Music,
  ShieldAlert,
} from "lucide-react";

function stateVariant(state: ClaimSongAction["state"]): "success" | "warning" | "danger" | "secondary" {
  if (state === "complete") return "success";
  if (state === "ready") return "warning";
  if (state === "blocked") return "danger";
  return "secondary";
}

function stateLabel(state: ClaimSongAction["state"]) {
  if (state === "ready") return "Ready now";
  if (state === "blocked") return "Blocked";
  if (state === "in_progress") return "In progress";
  return "Covered";
}

function DestinationCard({ destination }: { destination: ClaimDestinationSummary }) {
  const isInternal = destination.href.startsWith("/");
  const needsAttention = destination.ready > 0 || destination.blocked > 0;

  return (
    <Card className={needsAttention ? "border-primary/20 bg-primary/5" : undefined}>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{destination.label}</CardTitle>
            <CardDescription>{destination.description}</CardDescription>
          </div>
          <Badge variant={destination.automationMode === "autonomous" ? "default" : "secondary"}>
            {destination.automationMode === "autonomous" ? "ClaimRail automation" : "Official portal"}
          </Badge>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="rounded-lg border bg-background/60 p-2">
            <p className="text-lg font-semibold">{destination.ready}</p>
            <p className="text-muted-foreground">Ready</p>
          </div>
          <div className="rounded-lg border bg-background/60 p-2">
            <p className="text-lg font-semibold">{destination.blocked}</p>
            <p className="text-muted-foreground">Blocked</p>
          </div>
          <div className="rounded-lg border bg-background/60 p-2">
            <p className="text-lg font-semibold">{destination.inProgress}</p>
            <p className="text-muted-foreground">Moving</p>
          </div>
          <div className="rounded-lg border bg-background/60 p-2">
            <p className="text-lg font-semibold">{destination.complete}</p>
            <p className="text-muted-foreground">Covered</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{destination.nextStep}</p>
        {isInternal ? (
          <Link href={destination.href}>
            <Button className="w-full justify-between">
              {destination.actionLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <a href={destination.href} target="_blank" rel="noopener noreferrer" className="block">
            <Button className="w-full justify-between" variant="outline">
              {destination.actionLabel}
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        )}
      </CardContent>
    </Card>
  );
}

export default function ClaimsPage() {
  const { recordings } = useAppStore();
  const snapshot = useMemo(() => buildClaimCenterSnapshot(recordings), [recordings]);

  const readyActions = snapshot.actions.filter((action) => action.state === "ready").slice(0, 8);
  const blockedActions = snapshot.actions.filter((action) => action.state === "blocked").slice(0, 8);

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Claim Center</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              ClaimRail does not receive royalty payouts. It prepares your metadata, queues automation where we can,
              and sends you to the official destinations that pay artists directly.
            </p>
          </div>
          <Badge variant="outline" className="px-3 py-1 text-xs">
            Rights orchestration
          </Badge>
        </div>

        <LaunchGuideCard
          title="How Claim Center is meant to work"
          description="This is the control room for everything after import. Use it to decide which songs are ready for automation, which ones need fixes, and where to go next."
          steps={[
            {
              title: "Import a real catalog source first",
              detail: "A distributor CSV plus your artist-page enrichment is the fastest way to get a trustworthy snapshot.",
              href: "/connect",
              hrefLabel: "Open Connect",
              complete: snapshot.totalSongs > 0,
            },
            {
              title: "Fix blockers before you hand anything off",
              detail: "Missing writers, invalid splits, and missing composition links are the main reasons claims stall later.",
              href: "/fix",
              hrefLabel: "Open Fix",
              complete: snapshot.blocked === 0,
            },
            {
              title: "Use ClaimRail for queueing, not payout custody",
              detail: "BMI, The MLC, and publishing admins remain the payout destinations. ClaimRail just gets you there much faster.",
              href: "/register",
              hrefLabel: "Open Register",
            },
          ]}
          tip="Performance royalties, mechanical royalties, and publishing-admin coverage move through different systems. The cards below keep those lanes separate so users know exactly where the next action belongs."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <CardContent className="flex items-center gap-4 py-5">
              <Music className="h-8 w-8 shrink-0 text-primary" />
              <div>
                <p className="text-2xl font-bold">{snapshot.totalSongs}</p>
                <p className="text-xs text-muted-foreground">Songs tracked</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="flex items-center gap-4 py-5">
              <ListChecks className="h-8 w-8 shrink-0 text-warning" />
              <div>
                <p className="text-2xl font-bold text-warning">{snapshot.readyNow}</p>
                <p className="text-xs text-muted-foreground">Ready actions</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-4 py-5">
              <ShieldAlert className="h-8 w-8 shrink-0 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">{snapshot.blocked}</p>
                <p className="text-xs text-muted-foreground">Blocked actions</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-5">
              <LoaderCircle className="h-8 w-8 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{snapshot.inProgress}</p>
                <p className="text-xs text-muted-foreground">In progress</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-4 py-5">
              <CheckCircle2 className="h-8 w-8 shrink-0 text-primary" />
              <div>
                <p className="text-2xl font-bold text-primary">{snapshot.complete}</p>
                <p className="text-xs text-muted-foreground">Covered already</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {snapshot.destinations.map((destination) => (
            <DestinationCard key={destination.key} destination={destination} />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Next Best Actions</CardTitle>
              <CardDescription>
                The songs below are the fastest path to getting more of the catalog properly covered.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {readyActions.length === 0 ? (
                <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                  No claim actions are ready yet. Head to <Link href="/fix" className="underline underline-offset-4">Fix</Link> or <Link href="/connect" className="underline underline-offset-4">Connect</Link> to improve the catalog snapshot first.
                </div>
              ) : (
                readyActions.map((action) => (
                  <div key={action.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{action.songTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          {action.artist} · {action.summary}
                        </p>
                      </div>
                      <Badge variant={stateVariant(action.state)}>{stateLabel(action.state)}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline">{action.destination.toUpperCase()}</Badge>
                      <Badge variant="outline">{action.lane.replace("_", " ")}</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Most Common Blockers</CardTitle>
                <CardDescription>
                  These are the metadata gaps stopping the most claim actions right now.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {snapshot.topBlockers.length === 0 ? (
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                    No repeated blockers at the moment.
                  </div>
                ) : (
                  snapshot.topBlockers.map((blocker) => (
                    <div key={blocker.label} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm">{blocker.label}</span>
                      </div>
                      <Badge variant="danger">{blocker.count}</Badge>
                    </div>
                  ))
                )}
                <Link href="/fix">
                  <Button variant="outline" className="w-full justify-between">
                    Resolve blockers in Fix
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Automation Boundaries</CardTitle>
                <CardDescription>
                  This is where ClaimRail helps the most without pretending to be the rights platform itself.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-lg border bg-background/60 p-3">
                  <p className="font-medium text-foreground">BMI lane</p>
                  <p>ClaimRail can prep and queue autonomous submission work, but BMI is still the official registration and payout destination.</p>
                </div>
                <div className="rounded-lg border bg-background/60 p-3">
                  <p className="font-medium text-foreground">Mechanical lane</p>
                  <p>Use ClaimRail to reach The MLC with cleaner metadata and fewer missing fields, then finish in the official portal.</p>
                </div>
                <div className="rounded-lg border bg-background/60 p-3">
                  <p className="font-medium text-foreground">Publishing admin lane</p>
                  <p>ClaimRail should tee up Songtrust or another admin service, not replace them.</p>
                </div>
                <Link href="/dashboard/automation">
                  <Button variant="outline" className="w-full justify-between">
                    View automation queue
                    <Bot className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Blocked Songs Requiring Manual Cleanup</CardTitle>
            <CardDescription>
              These songs are not ready for handoff yet because the rights metadata is still incomplete.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {blockedActions.length === 0 ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                No blocked actions right now.
              </div>
            ) : (
              blockedActions.map((action) => (
                <div key={action.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{action.songTitle}</p>
                      <p className="text-xs text-muted-foreground">{action.artist}</p>
                    </div>
                    <Badge variant="danger">{action.destination.toUpperCase()}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{action.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {action.blockers.map((blocker) => (
                      <Badge key={blocker} variant="outline">
                        {blocker}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Landmark className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Official payout destinations stay official</p>
                <p className="text-sm text-muted-foreground">
                  ClaimRail helps users get registered correctly and faster. Royalties still flow from BMI, The MLC, and any publishing admin directly to the artist.
                </p>
              </div>
            </div>
            <Link href="/register">
              <Button>Go to Register</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
