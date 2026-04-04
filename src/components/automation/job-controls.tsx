"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelAutomationJobAction, retryAutomationJobAction } from "@/app/actions/automation-jobs";
import { Loader2, RotateCcw, Square } from "lucide-react";

interface JobControlsProps {
  jobId: string;
  status: string;
}

export function JobControls({ jobId, status }: JobControlsProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canRetry = ["failed", "needs_human", "cancelled"].includes(status);
  const canCancel = ["queued", "claimed", "running", "needs_human"].includes(status);

  const run = (action: () => Promise<{ success: boolean; error?: string }>) => {
    setFeedback(null);
    setError(null);

    startTransition(() => {
      void action()
        .then((result) => {
          if (!result.success) {
            setError(result.error || "Automation action failed.");
            return;
          }

          setFeedback("Automation queue updated.");
          router.refresh();
        })
        .catch((actionError) => {
          setError(actionError instanceof Error ? actionError.message : "Automation action failed.");
        });
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {canRetry ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => run(() => retryAutomationJobAction(jobId))}
            className="gap-2"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Retry job
          </Button>
        ) : null}
        {canCancel ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isPending}
            onClick={() => run(() => cancelAutomationJobAction(jobId))}
            className="gap-2"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
            Cancel job
          </Button>
        ) : null}
      </div>
      {feedback ? <p className="text-xs text-primary">{feedback}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
