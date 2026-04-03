"use client";

import Link from "next/link";
import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LaunchGuideCard } from "@/components/setup/launch-guide-card";
import { BillingActions } from "@/components/billing/billing-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { clearBMICredentials, saveBMICredentials, testBMICredentials } from "@/app/actions/bmi-registration";
import {
  generateExtensionAPIKey,
  revokeExtensionAPIKey,
} from "@/app/actions/extension-license";
import { Bot, CheckCircle2, Copy, ExternalLink, KeyRound, Loader2, Shield, Sparkles } from "lucide-react";

interface SettingsScreenProps {
  userId: string;
  hasBMICredentials: boolean;
  subscriptionTier: "free" | "pro";
  registrationsThisWeek: number;
  weeklyLimit: number | null;
  apiKeyCreatedAt: string | null;
  hasApiKey: boolean;
  billingReady: boolean;
  billingWebhookReady: boolean;
  automationReady: boolean;
}

function formatDate(dateString: string | null) {
  if (!dateString) {
    return "Never";
  }

  return new Date(dateString).toLocaleString();
}

export function SettingsScreen({
  userId,
  hasBMICredentials,
  subscriptionTier,
  registrationsThisWeek,
  weeklyLimit,
  apiKeyCreatedAt,
  hasApiKey,
  billingReady,
  billingWebhookReady,
  automationReady,
}: SettingsScreenProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const usageLabel = useMemo(() => {
    if (weeklyLimit == null) {
      return `${registrationsThisWeek} registrations this week`;
    }

    return `${registrationsThisWeek}/${weeklyLimit} registrations this week`;
  }, [registrationsThisWeek, weeklyLimit]);

  const runAction = (action: () => Promise<void>) => {
    setFeedback(null);
    setError(null);
    startTransition(() => {
      void action().catch((actionError) => {
        setError(actionError instanceof Error ? actionError.message : "Something went wrong");
      });
    });
  };

  const handleGenerateKey = () => {
    runAction(async () => {
      const result = await generateExtensionAPIKey();

      if ("error" in result && result.error) {
        throw new Error(result.error);
      }

      if ("apiKey" in result && result.apiKey) {
        setApiKey(result.apiKey);
        setFeedback("Generated a new extension API key. Copy it now; only the hash is stored.");
      }

      router.refresh();
    });
  };

  const handleRevokeKey = () => {
    runAction(async () => {
      const result = await revokeExtensionAPIKey();

      if ("error" in result && result.error) {
        throw new Error(result.error);
      }

      setApiKey(null);
      setFeedback("Revoked the current extension API key.");
      router.refresh();
    });
  };

  const handleCopyKey = async () => {
    if (!apiKey) {
      return;
    }

    await navigator.clipboard.writeText(apiKey);
    setFeedback("Copied the API key to your clipboard.");
  };

  const handleSaveCredentials = () => {
    runAction(async () => {
      if (!username || !password) {
        throw new Error("Enter both your BMI username and password.");
      }

      const result = await saveBMICredentials(userId, username, password);
      if (!result.success) {
        throw new Error(result.error || "Failed to save BMI credentials.");
      }

      setFeedback("Saved BMI credentials with encryption at rest.");
      setPassword("");
      router.refresh();
    });
  };

  const handleTestCredentials = () => {
    runAction(async () => {
      const result = await testBMICredentials(userId);
      if (!result.success) {
        throw new Error(result.error || "BMI credential test failed.");
      }

      setFeedback(result.message || "BMI credentials are valid.");
    });
  };

  const handleClearCredentials = () => {
    runAction(async () => {
      const result = await clearBMICredentials(userId);
      if (!result.success) {
        throw new Error(result.error || "Failed to clear BMI credentials.");
      }

      setUsername("");
      setPassword("");
      setFeedback(result.message || "BMI credentials removed.");
      router.refresh();
    });
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="mt-1 text-muted-foreground">
              Manage secure credentials, extension access, and launch configuration.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={subscriptionTier === "pro" ? "success" : "secondary"}>
              {subscriptionTier === "pro" ? "Pro" : "Free"}
            </Badge>
            <Badge variant="outline">{usageLabel}</Badge>
          </div>
        </div>

        {(feedback || error) && (
          <Card className={error ? "border-destructive/40 bg-destructive/5" : "border-primary/30 bg-primary/5"}>
            <CardContent className="py-4 text-sm">
              <p className={error ? "text-destructive" : "text-primary"}>{error || feedback}</p>
            </CardContent>
          </Card>
        )}

        <LaunchGuideCard
          title="Recommended setup order"
          description="Most launch issues come from doing the right tasks in the wrong order. This checklist keeps the critical pieces aligned."
          steps={[
            {
              title: "Save BMI credentials",
              detail: "ClaimRail needs a working BMI login before it can test or automate anything.",
              complete: hasBMICredentials,
            },
            {
              title: "Generate your extension API key",
              detail: "The extension uses this key to verify access and fetch per-song registration data.",
              complete: hasApiKey,
            },
            {
              title: "Run the automation worker",
              detail: "Set AUTOMATION_WORKER_SECRET in the app and the worker environment, then leave the worker running.",
              href: "/dashboard/automation",
              hrefLabel: "Open Automation",
              complete: automationReady,
            },
          ]}
          tip="Stripe is optional unless you are turning on paid self-serve upgrades right now. The worker secret and BMI credentials matter much more for getting autonomous registration working."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <KeyRound className="h-5 w-5 text-primary" />
                Extension API Key
              </CardTitle>
              <CardDescription>
                The Chrome extension authenticates with a personal API key. Only a one-way hash is stored on the server.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Current status</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={hasApiKey ? "success" : "secondary"}>
                    {hasApiKey ? "Active key on file" : "No active key"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Last generated: {formatDate(apiKeyCreatedAt)}
                  </span>
                </div>
              </div>

              {apiKey && (
                <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    Copy this key now. It won&apos;t be shown again.
                  </div>
                  <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs break-all">
                    {apiKey}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCopyKey} className="gap-2">
                    <Copy className="h-3.5 w-3.5" />
                    Copy key
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleGenerateKey} disabled={isPending} className="gap-2">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate new key
                </Button>
                <Button variant="outline" onClick={handleRevokeKey} disabled={isPending || !hasApiKey}>
                  Revoke key
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Shield className="h-5 w-5 text-primary" />
                BMI Credentials
              </CardTitle>
              <CardDescription>
                Save your BMI login so ClaimRail can test credentials and drive automated registration workflows.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    BMI username
                  </label>
                  <Input
                    placeholder="your BMI username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    BMI password
                  </label>
                  <Input
                    type="password"
                    placeholder="your BMI password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-sm">
                  Stored credentials:{" "}
                  <span className={hasBMICredentials ? "text-primary" : "text-muted-foreground"}>
                    {hasBMICredentials ? "Encrypted and ready" : "Not configured"}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleSaveCredentials} disabled={isPending} className="gap-2">
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save credentials
                </Button>
                <Button variant="outline" onClick={handleTestCredentials} disabled={isPending || !hasBMICredentials}>
                  Test login
                </Button>
                <Button variant="ghost" onClick={handleClearCredentials} disabled={isPending || !hasBMICredentials}>
                  Remove stored credentials
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Billing And Launch Status</CardTitle>
            <CardDescription>
              Pricing is now surfaced in-product, and this section keeps the subscription state visible while billing integration is finalized.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Billing provider status:{" "}
                <span className={billingReady ? "text-primary" : "text-warning"}>
                  {billingReady ? "Configured" : "Needs Stripe environment configuration"}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Webhook sync:{" "}
                <span className={billingWebhookReady ? "text-primary" : "text-warning"}>
                  {billingWebhookReady ? "Configured" : "Missing STRIPE_WEBHOOK_SECRET"}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Current plan: {subscriptionTier === "pro" ? "ClaimRail Pro" : "ClaimRail Free"}
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <BillingActions
                authenticated
                subscriptionTier={subscriptionTier}
                billingReady={billingReady}
                compact
              />
              <Button asChild variant="outline" className="gap-2">
                <Link href="/pricing">
                  View pricing
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Bot className="h-5 w-5 text-primary" />
              Automation Worker
            </CardTitle>
            <CardDescription>
              Full autonomous BMI registration requires a running worker process in addition to your saved BMI credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Worker secret:{" "}
                <span className={automationReady ? "text-primary" : "text-warning"}>
                  {automationReady ? "Configured" : "Missing AUTOMATION_WORKER_SECRET"}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Execution provider: Built-in Playwright worker
              </p>
            </div>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/dashboard/automation">
                View automation queue
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
