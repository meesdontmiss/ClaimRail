import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, syncStripeCustomerToUser, syncStripeSubscriptionByCustomer } from "@/lib/stripe";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured." },
      { status: 500 }
    );
  }

  try {
    const stripe = getStripe();
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await syncStripeCustomerToUser({
          userId:
            typeof session.client_reference_id === "string"
              ? session.client_reference_id
              : typeof session.metadata?.userId === "string"
                ? session.metadata.userId
                : null,
          customerId:
            typeof session.customer === "string" ? session.customer : "",
          subscriptionId:
            typeof session.subscription === "string" ? session.subscription : null,
          subscriptionStatus: session.payment_status === "paid" ? "active" : "incomplete",
        });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        if (typeof subscription.customer === "string") {
          await syncStripeSubscriptionByCustomer(subscription.customer, subscription);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Stripe webhook failed",
      },
      { status: 400 }
    );
  }
}
