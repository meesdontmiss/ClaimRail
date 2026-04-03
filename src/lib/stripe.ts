import Stripe from "stripe";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

let stripeClient: Stripe | null = null;

function getRequiredEnv(name: "STRIPE_SECRET_KEY") {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"), {
      apiVersion: "2025-02-24.acacia",
    });
  }

  return stripeClient;
}

export function getBillingBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

export async function getOrCreateStripeCustomer(params: {
  userId: string;
  email?: string | null;
  name?: string | null;
  existingCustomerId?: string | null;
}) {
  const stripe = getStripe();

  if (params.existingCustomerId) {
    return params.existingCustomerId;
  }

  const customer = await stripe.customers.create({
    email: params.email ?? undefined,
    name: params.name ?? undefined,
    metadata: {
      userId: params.userId,
    },
  });

  await db
    .update(users)
    .set({
      stripeCustomerId: customer.id,
    })
    .where(eq(users.id, params.userId));

  return customer.id;
}

export async function ensureClaimRailProPrice() {
  const stripe = getStripe();
  const configuredPriceId = process.env.STRIPE_PRO_PRICE_ID?.trim();

  if (configuredPriceId) {
    return configuredPriceId;
  }

  const prices = await stripe.prices.list({
    lookup_keys: ["claimrail_pro_extension_annual"],
    active: true,
    limit: 1,
  });

  if (prices.data[0]?.id) {
    return prices.data[0].id;
  }

  const price = await stripe.prices.create({
    currency: "usd",
    unit_amount: 2000,
    recurring: {
      interval: "year",
    },
    lookup_key: "claimrail_pro_extension_annual",
    nickname: "ClaimRail Pro Extension Annual",
    product_data: {
      name: "ClaimRail Pro Extension",
      metadata: {
        claimrailPlan: "pro_extension",
      },
    },
    metadata: {
      claimrailPlan: "pro_extension",
    },
  });

  return price.id;
}

export async function syncStripeCustomerToUser(params: {
  userId?: string | null;
  customerId: string;
  subscriptionId?: string | null;
  subscriptionStatus?: string | null;
}) {
  if (!params.userId) {
    return;
  }

  await db
    .update(users)
    .set({
      stripeCustomerId: params.customerId,
      stripeSubscriptionId: params.subscriptionId ?? undefined,
      stripeSubscriptionStatus: params.subscriptionStatus ?? undefined,
    })
    .where(eq(users.id, params.userId));
}

export async function syncStripeSubscriptionByCustomer(customerId: string, subscription?: Stripe.Subscription | null) {
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
  });

  if (!user) {
    return;
  }

  await db
    .update(users)
    .set({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription?.id ?? null,
      stripeSubscriptionStatus: subscription?.status ?? null,
    })
    .where(eq(users.id, user.id));
}
