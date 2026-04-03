import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowRight, BadgeDollarSign, MonitorCog, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authOptions } from "@/lib/auth";
import { BillingActions } from "@/components/billing/billing-actions";
import { getCurrentUser } from "@/lib/session";

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user ? await getCurrentUser() : null;
  const billingReady = Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  );
  const webhookReady = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
  const subscriptionTier = user?.stripeSubscriptionStatus === "active" ? "pro" : "free";

  return (
    <main className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <div className="mb-10 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.3em] text-primary">
          Pricing
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Choose the workflow that fits your catalog
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          ClaimRail keeps pricing simple with a flat $20/year plan for catalog audit, registration prep, and automation tools.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BadgeDollarSign className="h-5 w-5 text-primary" />
                ClaimRail Core
              </CardTitle>
              <Badge variant="success">Live</Badge>
            </div>
            <CardDescription>
              Catalog audit, issue fixing, registration prep, and export workflows included in one annual plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-5xl font-bold tracking-tight">$20</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Per year. No payout commission and no royalty percentage.
              </p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Spotify and CSV imports</li>
              <li>Catalog health scoring and issue tracking</li>
              <li>Registration prep for BMI and publishing admins</li>
              <li>Claim packet exports and progress tracking</li>
            </ul>
            <Button asChild size="lg" className="gap-2">
              <Link href="/connect">
                Start ClaimRail
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MonitorCog className="h-5 w-5 text-primary" />
                ClaimRail Pro Extension
              </CardTitle>
              <Badge variant={billingReady ? "default" : "warning"}>
                {billingReady ? "Checkout ready" : "Manual enablement"}
              </Badge>
            </div>
            <CardDescription>
              Faster browser automation for BMI registrations and extension-powered workflows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <p className="text-5xl font-bold tracking-tight">$20</p>
              <p className="mt-2 text-sm text-muted-foreground">Per year for advanced extension access.</p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Chrome extension API access</li>
              <li>Unlimited extension-driven registrations</li>
              <li>Pending-song queue for quick auto-fill</li>
              <li>Credentials and key management from dashboard settings</li>
            </ul>
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-muted-foreground">
              {billingReady
                ? webhookReady
                  ? "Stripe checkout is wired for this environment and webhook sync is configured."
                  : "Stripe checkout is wired, but STRIPE_WEBHOOK_SECRET still needs to be configured so Pro activates automatically after payment."
                : "Stripe is not configured in this environment yet, so Pro upgrades should be enabled manually until billing credentials are added."}
            </div>
            <BillingActions
              authenticated={Boolean(session?.user)}
              subscriptionTier={subscriptionTier}
              billingReady={billingReady}
            />
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link href={session?.user ? "/dashboard/settings" : "/connect"}>
                {session?.user ? "Open settings" : "Connect Spotify first"}
                <Sparkles className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
