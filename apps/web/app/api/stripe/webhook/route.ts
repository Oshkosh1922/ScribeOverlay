import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "../../../../lib/prisma";

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test", { apiVersion: "2023-10-16" });

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const body = Buffer.from(await req.arrayBuffer());
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET || "whsec_dev");
  } catch (err) {
    return NextResponse.json({ error: `Webhook Error: ${(err as Error).message}` }, { status: 400 });
  }

  const data = event.data.object as Stripe.Subscription;
  const workspaceId = data.metadata?.workspaceId;
  const plan = (data.items?.data?.[0]?.price?.nickname as "free" | "pro" | "team") || "pro";

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    await prisma.subscription.upsert({
      where: { stripeSubscriptionId: data.id },
      create: {
        stripeSubscriptionId: data.id,
        stripeCustomerId: data.customer as string,
        workspaceId: workspaceId ?? undefined,
        plan,
        status: "active",
        currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end * 1000) : null
      },
      update: {
        plan,
        status: data.status === "canceled" ? "canceled" : "active",
        currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end * 1000) : null
      }
    });
  }

  if (event.type === "customer.subscription.deleted") {
    if (data.id) {
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: data.id },
        data: { status: "canceled" }
      });
    }
  }

  return NextResponse.json({ received: true });
}
