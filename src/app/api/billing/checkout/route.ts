import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { checkRateLimit, createRateLimitHeaders } from "@/lib/rate-limit";
import {
  ensureClaimRailProPrice,
  getBillingBaseUrl,
  getOrCreateStripeCustomer,
  getStripe,
} from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    
    // Rate limit: 3 checkout attempts per minute per user
    const rateLimit = checkRateLimit(`billing:checkout:${user.id}`, {
      maxRequests: 3,
      windowMs: 60_000,
    });

    if (!rateLimit.success) {
      const headers = createRateLimitHeaders(
        rateLimit.remaining,
        rateLimit.reset,
        rateLimit.limit
      );
      return NextResponse.json(
        { error: "Too many requests. Please try again in a minute." },
        { status: 429, headers }
      );
    }
    
    const stripe = getStripe();
    const customerId = await getOrCreateStripeCustomer({
      userId: user.id,
      email: user.email,
      name: user.name,
      existingCustomerId: user.stripeCustomerId,
    });

    if (user.stripeSubscriptionStatus === "active") {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${getBillingBaseUrl()}/dashboard/settings?billing=portal`,
      });

      return NextResponse.json({ url: portalSession.url });
    }

    const priceId = await ensureClaimRailProPrice();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      metadata: {
        userId: user.id,
        plan: "claimrail_pro_extension",
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan: "claimrail_pro_extension",
        },
      },
      success_url: `${getBillingBaseUrl()}/dashboard/settings?billing=success`,
      cancel_url: `${getBillingBaseUrl()}/pricing?billing=cancelled`,
    });

    if (!session.url) {
      throw new Error("Stripe checkout session did not return a URL.");
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Create Stripe checkout session error:", error);
    const status =
      error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create checkout session",
      },
      { status }
    );
  }
}
