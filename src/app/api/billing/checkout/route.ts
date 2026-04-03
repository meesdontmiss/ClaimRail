import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import {
  ensureClaimRailProPrice,
  getBillingBaseUrl,
  getOrCreateStripeCustomer,
  getStripe,
} from "@/lib/stripe";

export async function POST() {
  try {
    const user = await requireUser();
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
