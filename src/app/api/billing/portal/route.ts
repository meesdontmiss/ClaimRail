import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getBillingBaseUrl, getOrCreateStripeCustomer, getStripe } from "@/lib/stripe";

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

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getBillingBaseUrl()}/dashboard/settings?billing=portal`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Create Stripe billing portal session error:", error);
    const status =
      error instanceof Error && error.message === "Unauthorized" ? 401 : 500;
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create billing portal session",
      },
      { status }
    );
  }
}
