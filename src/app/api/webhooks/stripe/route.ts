import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: "2026-05-27.dahlia" })
  : null;

export async function POST(req: Request) {
  console.log("[Stripe Webhook] Received POST request");

  try {
    if (!stripe) {
      console.error("[Stripe Webhook] Stripe client not initialized");
      return NextResponse.json({ error: "Stripe non configuré" }, { status: 500 });
    }

    if (!stripeWebhookSecret) {
      console.error("[Stripe Webhook] Webhook secret not configured");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get("stripe-signature") || "";

    console.log("[Stripe Webhook] Body length:", body.length, "Signature present:", !!signature);

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret);
      console.log("[Stripe Webhook] Event constructed successfully:", event.type, event.id);
    } catch (err) {
      console.error("[Stripe Webhook] Event construction failed:", err);
      return NextResponse.json({ error: "Signature webhook invalide" }, { status: 400 });
    }

    console.log("[Stripe Webhook] Processing event type:", event.type);

    // Log all events for debugging
    console.log(
      "[Stripe Webhook] Full event:",
      JSON.stringify(
        {
          type: event.type,
          id: event.id,
          created: event.created,
          dataObject: {
            id: (event.data.object as { id?: string }).id,
            metadata: (event.data.object as { metadata?: unknown }).metadata,
            customer: (event.data.object as { customer?: string }).customer,
          },
        },
        null,
        2
      )
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId as string | undefined;
      const newPlan = session.metadata?.newPlan as string | undefined;
      const stripeCustomerId = session.customer as string | undefined;

      console.log(
        "[Stripe Webhook] checkout.session.completed:",
        JSON.stringify({ userId, newPlan, stripeCustomerId, sessionId: session.id }, null, 2)
      );

      if (!userId || !newPlan || !stripeCustomerId) {
        console.warn(
          "[Stripe Webhook] Missing required metadata:",
          JSON.stringify({ userId, newPlan, stripeCustomerId })
        );
        return NextResponse.json({ received: true });
      }

      try {
        await db.$transaction(async () => {
          await db.user.update({
            where: { id: userId },
            data: {
              plan: newPlan as "free" | "pro" | "enterprise",
              credits: newPlan === "pro" ? 500 : 5000,
              stripeId: stripeCustomerId,
            },
          });
          console.log(
            "[Stripe Webhook] User updated successfully:",
            JSON.stringify({ userId, newPlan, newCredits: newPlan === "pro" ? 500 : 5000 }, null, 2)
          );

          await db.subscription.upsert({
            where: { id: `${userId}-${newPlan}` },
            create: {
              userId,
              plan: newPlan as "free" | "pro" | "enterprise",
              status: "active",
              stripeId: stripeCustomerId,
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
            update: {
              plan: newPlan as "free" | "pro" | "enterprise",
              status: "active",
              stripeId: stripeCustomerId,
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });

          await db.notification.create({
            data: {
              userId,
              title: "Paiement reçu",
              message: `Votre plan ${newPlan} est actif. Merci pour votre achat !`,
              type: "success",
              read: false,
            },
          });
        });

        console.log("[Stripe Webhook] Transaction completed successfully");
      } catch (dbErr) {
        console.error(
          "[Stripe Webhook] Database transaction error:",
          JSON.stringify(
            { userId, newPlan, error: dbErr instanceof Error ? dbErr.message : String(dbErr) },
            null,
            2
          )
        );
        throw dbErr;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(
      "[Stripe Webhook] Fatal error:",
      JSON.stringify(
        { error: error instanceof Error ? error.message : String(error) },
        null,
        2
      )
    );
    return NextResponse.json({ error: "Erreur Stripe webhook" }, { status: 500 });
  }
}
