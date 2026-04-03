"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface BillingActionsProps {
  authenticated: boolean;
  subscriptionTier: "free" | "pro";
  billingReady: boolean;
  compact?: boolean;
}

async function beginBillingFlow(endpoint: "/api/billing/checkout" | "/api/billing/portal") {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const result = (await response.json().catch(() => ({}))) as {
    error?: string;
    url?: string;
  };

  if (!response.ok || !result.url) {
    throw new Error(result.error || "Billing request failed.");
  }

  window.location.assign(result.url);
}

export function BillingActions({
  authenticated,
  subscriptionTier,
  billingReady,
  compact = false,
}: BillingActionsProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!authenticated) {
      router.push("/connect");
      return;
    }

    setLoadingAction("checkout");
    setError(null);
    try {
      await beginBillingFlow("/api/billing/checkout");
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Checkout failed."
      );
      setLoadingAction(null);
    }
  };

  const handlePortal = async () => {
    setLoadingAction("portal");
    setError(null);
    try {
      await beginBillingFlow("/api/billing/portal");
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "Portal launch failed."
      );
      setLoadingAction(null);
    }
  };

  const showPortal = authenticated && subscriptionTier === "pro";

  return (
    <div className="space-y-3">
      {showPortal ? (
        <Button
          onClick={handlePortal}
          disabled={!billingReady || loadingAction !== null}
          variant={compact ? "outline" : "default"}
          size={compact ? "default" : "lg"}
          className="gap-2"
        >
          {loadingAction === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Manage billing
        </Button>
      ) : (
        <Button
          onClick={handleCheckout}
          disabled={!billingReady || loadingAction !== null}
          variant={compact ? "outline" : "default"}
          size={compact ? "default" : "lg"}
          className="gap-2"
        >
          {loadingAction === "checkout" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {authenticated ? "Upgrade to Pro" : "Sign in to upgrade"}
        </Button>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {!billingReady ? (
        <p className="text-xs text-muted-foreground">
          Billing keys are configured, but checkout still needs Stripe webhook setup to activate Pro automatically after payment.
        </p>
      ) : null}
    </div>
  );
}
