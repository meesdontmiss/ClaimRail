"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { LaunchGuideCard } from "@/components/setup/launch-guide-card";
import {
  checkRegistrationStatus,
  generateRegistrationActions,
  generateBMIRegistrationData,
  generateSongtrustRegistrationData,
  RegistrationAction,
} from "@/lib/registration";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  CheckCircle2,
  Music,
  Building2,
  DollarSign,
  Loader2,
  Send,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Bot,
} from "lucide-react";

export default function RegisterPage() {
  const { recordings, resolveIssue, updateRecording } = useAppStore();

  const statuses = useMemo(() => checkRegistrationStatus(recordings), [recordings]);
  const actions = useMemo(() => generateRegistrationActions(statuses), [statuses]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [automationQueueing, setAutomationQueueing] = useState(false);
  const [automationMessage, setAutomationMessage] = useState<string | null>(null);
  const [writerInfo, setWriterInfo] = useState({
    name: "",
    pro: "BMI",
    ipi: "",
  });

  const bmiActions = actions.filter((action) => action.service === "bmi");
  const songtrustActions = actions.filter(
    (action) => action.service === "songtrust"
  );

  const unregisteredBMI = bmiActions.filter((action) => !submittedIds.has(action.id));
  const unregisteredSongtrust = songtrustActions.filter(
    (action) => !submittedIds.has(action.id)
  );
  const selectedBMIRecordingIds = Array.from(selectedIds)
    .map((id) => actions.find((action) => action.id === id))
    .filter((action): action is RegistrationAction => Boolean(action && action.service === "bmi"))
    .map((action) => action.recordingId);

  const totalLoss = statuses.reduce(
    (sum, status) => sum + status.estimatedAnnualLoss,
    0
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllForService = (serviceActions: RegistrationAction[]) => {
    const unsubmitted = serviceActions.filter((action) => !submittedIds.has(action.id));
    const allSelected = unsubmitted.every((action) => selectedIds.has(action.id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        unsubmitted.forEach((action) => next.delete(action.id));
      } else {
        unsubmitted.forEach((action) => next.add(action.id));
      }
      return next;
    });
  };

  const handleBulkSubmit = async () => {
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const newSubmitted = new Set(submittedIds);
    selectedIds.forEach((id) => {
      newSubmitted.add(id);

      const action = actions.find((candidate) => candidate.id === id);
      if (!action) {
        return;
      }

      const recording = recordings.find((candidate) => candidate.id === action.recordingId);
      if (!recording) {
        return;
      }

      const compositionWork = recording.compositionWork ?? {
        id: `cw-${recording.id}`,
        title: recording.title,
        writers: [],
        splits: [],
        proRegistered: false,
        adminRegistered: false,
        iswc: null,
      };

      const updatedCompositionWork = {
        ...compositionWork,
        proRegistered:
          action.service === "bmi" ? true : compositionWork.proRegistered,
        adminRegistered:
          action.service === "songtrust"
            ? true
            : compositionWork.adminRegistered,
      };

      updateRecording(recording.id, { compositionWork: updatedCompositionWork });

      const issue = recording.issues.find(
        (candidate) =>
          candidate.type === "missing_pro_admin" && !candidate.resolved
      );

      if (
        issue &&
        updatedCompositionWork.proRegistered &&
        updatedCompositionWork.adminRegistered
      ) {
        resolveIssue(recording.id, issue.id);
      }
    });

    setSubmittedIds(newSubmitted);
    setSelectedIds(new Set());
    setSubmitting(false);
  };

  const handleQueueAutomation = async () => {
    if (selectedBMIRecordingIds.length === 0) {
      setAutomationMessage("Select one or more BMI registrations to queue.");
      return;
    }

    setAutomationQueueing(true);
    setAutomationMessage(null);

    try {
      const response = await fetch("/api/automation/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recordingIds: selectedBMIRecordingIds,
          writerInfo,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to queue automation jobs.");
      }

      const successfulJobs = Array.isArray(result.results)
        ? result.results.filter((item: { success?: boolean }) => item.success).length
        : 0;

      setAutomationMessage(
        successfulJobs > 0
          ? `Queued ${successfulJobs} autonomous BMI job${successfulJobs !== 1 ? "s" : ""}.`
          : "No new jobs were queued."
      );
    } catch (error) {
      setAutomationMessage(
        error instanceof Error ? error.message : "Failed to queue automation jobs."
      );
    } finally {
      setAutomationQueueing(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Register</h1>
            <p className="mt-1 text-muted-foreground">
              Prepare BMI and Songtrust registrations in bulk.
            </p>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleQueueAutomation}
                disabled={automationQueueing}
                variant="success"
                className="gap-2"
              >
                {automationQueueing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
                {automationQueueing
                  ? "Queueing..."
                  : `Queue ${selectedBMIRecordingIds.length} autonomous BMI job${
                      selectedBMIRecordingIds.length !== 1 ? "s" : ""
                    }`}
              </Button>
              <Button
                onClick={handleBulkSubmit}
                disabled={submitting}
                className="gap-2"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {submitting
                  ? "Preparing..."
                  : `Prepare ${selectedIds.size} song${
                      selectedIds.size !== 1 ? "s" : ""
                    }`}
              </Button>
            </div>
          )}
        </div>

        {automationMessage && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4 text-sm text-primary">
              {automationMessage}{" "}
              <Link href="/dashboard/automation" className="underline underline-offset-4">
                View automation queue
              </Link>
            </CardContent>
          </Card>
        )}

        <LaunchGuideCard
          title="Before you queue autonomous BMI jobs"
          description="This page prepares the actual registration workload. A little setup here prevents most failed or stuck jobs later."
          steps={[
            {
              title: "Save BMI credentials first",
              detail: "The worker can only log into BMI with credentials stored in Settings.",
              href: "/dashboard/settings",
              hrefLabel: "Open Settings",
            },
            {
              title: "Fill in writer fallback info",
              detail: "If a song is missing composition writers, ClaimRail uses the writer info on this page to build a valid work record.",
              complete: writerInfo.name.trim().length > 0,
            },
            {
              title: "Queue jobs, then watch Automation",
              detail: "Queued songs do not submit instantly. The worker has to claim them and drive BMI in the background.",
              href: "/dashboard/automation",
              hrefLabel: "View Automation",
            },
          ]}
          tip="If you select songs and queue them successfully but nothing changes afterward, the usual cause is a worker that is not running or not using the same AUTOMATION_WORKER_SECRET as the app."
        />

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 py-5">
              <Music className="h-8 w-8 shrink-0 text-primary" />
              <div>
                <p className="text-2xl font-bold">{recordings.length}</p>
                <p className="text-xs text-muted-foreground">Total songs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-5">
              <AlertCircle className="h-8 w-8 shrink-0 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">
                  {unregisteredBMI.length}
                </p>
                <p className="text-xs text-muted-foreground">Needs BMI prep</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-5">
              <AlertCircle className="h-8 w-8 shrink-0 text-warning" />
              <div>
                <p className="text-2xl font-bold text-warning">
                  {unregisteredSongtrust.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Needs Songtrust prep
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-4 py-5">
              <DollarSign className="h-8 w-8 shrink-0 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">
                  ${totalLoss.toLocaleString()}
                  <span className="text-sm font-normal">/yr</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Estimated lost royalties
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Writer Info</CardTitle>
            <CardDescription>
              We need this to register your songs. Fill it once and we&apos;ll use
              it for all submissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Legal name (as songwriter)
                </label>
                <Input
                  placeholder="e.g., Luna Parker"
                  value={writerInfo.name}
                  onChange={(event) =>
                    setWriterInfo((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  PRO affiliation
                </label>
                <Input
                  placeholder="e.g., BMI"
                  value={writerInfo.pro}
                  onChange={(event) =>
                    setWriterInfo((prev) => ({
                      ...prev,
                      pro: event.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  IPI number (if you have one)
                </label>
                <Input
                  placeholder="e.g., 00123456789"
                  value={writerInfo.ipi}
                  onChange={(event) =>
                    setWriterInfo((prev) => ({
                      ...prev,
                      ipi: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="bmi">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="bmi" className="gap-2">
              <Building2 className="h-4 w-4" />
              BMI
              {unregisteredBMI.length > 0 && (
                <Badge variant="danger" className="ml-1 px-1.5 py-0 text-[10px]">
                  {unregisteredBMI.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="songtrust" className="gap-2">
              <FileText className="h-4 w-4" />
              Songtrust
              {unregisteredSongtrust.length > 0 && (
                <Badge variant="warning" className="ml-1 px-1.5 py-0 text-[10px]">
                  {unregisteredSongtrust.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bmi" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">BMI Work Registration</CardTitle>
                    <CardDescription>
                      Prepare your compositions for BMI performance royalty registration.
                    </CardDescription>
                  </div>
                  <a
                    href="https://www.bmi.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    bmi.com <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardHeader>
              <CardContent>
                {unregisteredBMI.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <CheckCircle2 className="mb-3 h-10 w-10 text-success" />
                    <p className="text-sm font-medium">All songs prepped for BMI</p>
                    <p className="text-xs text-muted-foreground">
                      Performance royalty metadata looks complete.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex items-center gap-3">
                      <Checkbox
                        checked={
                          unregisteredBMI.length > 0 &&
                          unregisteredBMI.every((action) => selectedIds.has(action.id))
                        }
                        onCheckedChange={() => selectAllForService(bmiActions)}
                      />
                      <span className="text-sm text-muted-foreground">
                        Select all ({unregisteredBMI.length} pending)
                      </span>
                    </div>

                    <div className="space-y-2">
                      {bmiActions.map((action) => {
                        const isSubmitted = submittedIds.has(action.id);
                        const isExpanded = expandedAction === action.id;
                        const recording = recordings.find(
                          (candidate) => candidate.id === action.recordingId
                        );

                        return (
                          <div key={action.id} className="rounded-lg border">
                            <div className="flex items-center gap-3 p-3">
                              {isSubmitted ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                              ) : (
                                <Checkbox
                                  checked={selectedIds.has(action.id)}
                                  onCheckedChange={() => toggleSelect(action.id)}
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-sm font-medium ${
                                    isSubmitted
                                      ? "text-muted-foreground line-through"
                                      : ""
                                  }`}
                                >
                                  {action.songTitle}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {action.description}
                                </p>
                              </div>
                              {isSubmitted ? (
                                <Badge variant="success">Prepared</Badge>
                              ) : (
                                <button
                                  onClick={() =>
                                    setExpandedAction(isExpanded ? null : action.id)
                                  }
                                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                >
                                  Preview{" "}
                                  {isExpanded ? (
                                    <ChevronUp className="h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3" />
                                  )}
                                </button>
                              )}
                            </div>

                            {isExpanded && recording && (
                              <div className="border-t bg-muted/30 p-4">
                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  BMI Registration Data Preview
                                </p>
                                <pre className="overflow-x-auto rounded-md border bg-background p-3 text-xs">
                                  {JSON.stringify(
                                    {
                                      ...generateBMIRegistrationData(recording),
                                      writers: [
                                        {
                                          name: writerInfo.name || recording.artist,
                                          ipiNumber: writerInfo.ipi || "PENDING",
                                          role: "Author/Composer",
                                          ownership: 100,
                                        },
                                      ],
                                    },
                                    null,
                                    2
                                  )}
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="songtrust" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Songtrust Registration</CardTitle>
                    <CardDescription>
                      Prepare your compositions for Songtrust mechanical royalty registration.
                    </CardDescription>
                  </div>
                  <a
                    href="https://www.songtrust.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    songtrust.com <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardHeader>
              <CardContent>
                {unregisteredSongtrust.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <CheckCircle2 className="mb-3 h-10 w-10 text-success" />
                    <p className="text-sm font-medium">
                      All songs prepped for Songtrust
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Mechanical royalty metadata looks complete.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex items-center gap-3">
                      <Checkbox
                        checked={
                          unregisteredSongtrust.length > 0 &&
                          unregisteredSongtrust.every((action) =>
                            selectedIds.has(action.id)
                          )
                        }
                        onCheckedChange={() =>
                          selectAllForService(songtrustActions)
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        Select all ({unregisteredSongtrust.length} pending)
                      </span>
                    </div>

                    <div className="space-y-2">
                      {songtrustActions.map((action) => {
                        const isSubmitted = submittedIds.has(action.id);
                        const isExpanded = expandedAction === action.id;
                        const recording = recordings.find(
                          (candidate) => candidate.id === action.recordingId
                        );

                        return (
                          <div key={action.id} className="rounded-lg border">
                            <div className="flex items-center gap-3 p-3">
                              {isSubmitted ? (
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                              ) : (
                                <Checkbox
                                  checked={selectedIds.has(action.id)}
                                  onCheckedChange={() => toggleSelect(action.id)}
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-sm font-medium ${
                                    isSubmitted
                                      ? "text-muted-foreground line-through"
                                      : ""
                                  }`}
                                >
                                  {action.songTitle}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {action.description}
                                </p>
                              </div>
                              {isSubmitted ? (
                                <Badge variant="success">Prepared</Badge>
                              ) : (
                                <button
                                  onClick={() =>
                                    setExpandedAction(isExpanded ? null : action.id)
                                  }
                                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                >
                                  Preview{" "}
                                  {isExpanded ? (
                                    <ChevronUp className="h-3 w-3" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3" />
                                  )}
                                </button>
                              )}
                            </div>

                            {isExpanded && recording && (
                              <div className="border-t bg-muted/30 p-4">
                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  Songtrust Registration Data Preview
                                </p>
                                <pre className="overflow-x-auto rounded-md border bg-background p-3 text-xs">
                                  {JSON.stringify(
                                    {
                                      ...generateSongtrustRegistrationData(recording),
                                      writers: [
                                        {
                                          firstName: (
                                            writerInfo.name || recording.artist
                                          ).split(" ")[0],
                                          lastName: (
                                            writerInfo.name || recording.artist
                                          )
                                            .split(" ")
                                            .slice(1)
                                            .join(" "),
                                          ipi: writerInfo.ipi || "",
                                          pro: writerInfo.pro || "",
                                          ownershipPercentage: 100,
                                        },
                                      ],
                                    },
                                    null,
                                    2
                                  )}
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How Registration Prep Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  1
                </div>
                <p className="text-sm font-medium">We detect the gaps</p>
                <p className="text-xs text-muted-foreground">
                  We review your catalog and identify the works that still need
                  metadata before submission.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  2
                </div>
                <p className="text-sm font-medium">We prep your data</p>
                <p className="text-xs text-muted-foreground">
                  Using your writer info and ISRC codes, we generate complete
                  registration-ready metadata for each song.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  3
                </div>
                <p className="text-sm font-medium">Your backend submits it</p>
                <p className="text-xs text-muted-foreground">
                  ClaimRail now persists this prep state to your account. Direct
                  BMI automation still depends on your configured credentials and
                  a running Playwright worker.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-muted p-4">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> BMI registration requires an active BMI
                songwriter account. Songtrust registration works through their
                publishing admin platform. Songtrust remains a prep-and-export
                flow until that direct integration is added.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
