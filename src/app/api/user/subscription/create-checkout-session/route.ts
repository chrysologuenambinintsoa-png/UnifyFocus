import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";

const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: "2026-05-27.dahlia" })
  : null;

const PRO_PRICE_ID = process.env.STRIPE_PRICE_PRO?.trim();
const ENTERPRISE_PRICE_ID = process.env.STRIPE_PRICE_ENTERPRISE?.trim();

const PRICE_IDS: Record<"pro" | "enterprise", string | undefined> = {
  pro: PRO_PRICE_ID,
  enterprise: ENTERPRISE_PRICE_ID,
};

const PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";

export async function POST(req: Request) {
  try {
    console.log("[Checkout Route] Request started");
    console.log("[Checkout Route] Stripe initialized:", !!stripe);
    console.log("[Checkout Route] Price IDs configured:", { PRO_PRICE_ID, ENTERPRISE_PRICE_ID });

    if (!stripe) {
      console.error("[Checkout Route] Stripe not initialized - STRIPE_SECRET_KEY missing");
      return NextResponse.json(
        {
          error:
            "Stripe non configuré. Définissez STRIPE_SECRET_KEY dans .env.local puis redémarrez le serveur.",
        },
        { status: 500 }
      );
    }

    const body = await req.json();
    console.log("[Checkout Route] Request body:", JSON.stringify({ userId: body.userId, newPlan: body.newPlan }));

    const { userId, newPlan } = body;

    if (!userId || !newPlan) {
      console.error("[Checkout Route] Missing userId or newPlan");
      return NextResponse.json(
        { error: "userId et newPlan sont requis" },
        { status: 400 }
      );
    }

    if (!["pro", "enterprise"].includes(newPlan)) {
      console.error("[Checkout Route] Invalid plan:", newPlan);
      return NextResponse.json(
        { error: "Plan invalide pour le paiement" },
        { status: 400 }
      );
    }

    const priceId = PRICE_IDS[newPlan as "pro" | "enterprise"];
    console.log("[Checkout Route] Price ID for plan:", { newPlan, priceId });

    if (!priceId) {
      console.error("[Checkout Route] Price ID not configured for plan:", newPlan);
      return NextResponse.json(
        {
          error: `ID du prix Stripe pour ${newPlan} non configuré. Définissez STRIPE_PRICE_${newPlan.toUpperCase()} dans .env.local.`,
        },
        { status: 500 }
      );
    }

    if (!priceId.startsWith("price_")) {
      console.error("[Checkout Route] Invalid price ID format:", priceId);
      return NextResponse.json(
        {
          error: `ID Stripe invalide pour ${newPlan}. Utilisez un price ID commençant par price_.`,
        },
        { status: 500 }
      );
    }

    if (newPlan === "enterprise" && PRO_PRICE_ID && ENTERPRISE_PRICE_ID && PRO_PRICE_ID === ENTERPRISE_PRICE_ID) {
      console.error("[Checkout Route] Pro and Enterprise using same price ID");
      return NextResponse.json(
        {
          error:
            "Les plans Pro et Enterprise utilisent le même price ID. Vérifiez STRIPE_PRICE_PRO et STRIPE_PRICE_ENTERPRISE dans .env.local.",
        },
        { status: 500 }
      );
    }

    console.log("[Checkout Route] Fetching user:", userId);
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.error("[Checkout Route] User not found:", userId);
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    console.log("[Checkout Route] Creating Stripe session with price:", priceId);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: user.email ?? undefined,
      metadata: {
        userId,
        newPlan,
      },
      client_reference_id: userId,
      success_url: `${PUBLIC_APP_URL}/?checkout=success`,
      cancel_url: `${PUBLIC_APP_URL}/?checkout=cancel`,
    });

    console.log("[Checkout Route] Session created successfully:", session.id);
    return NextResponse.json({ url: session.url, id: session.id });
  } catch (error: unknown) {
    console.error("[Checkout Route] Exception caught:", error);
    let message = "Impossible de démarrer le paiement";
    let status = 500;
    let stripeErrorDetails: Record<string, unknown> | undefined;

    if (typeof error === "object" && error !== null) {
      const maybeStripeError = error as Stripe.StripeError & Record<string, unknown>;

      if (typeof maybeStripeError.message === "string") {
        message = maybeStripeError.message;
      }

      if (typeof maybeStripeError.statusCode === "number") {
        status = maybeStripeError.statusCode;
      }

      stripeErrorDetails = {
        type: maybeStripeError.type,
        code: maybeStripeError.code,
        requestId: maybeStripeError.requestId,
        param: maybeStripeError.param,
        decline_code: maybeStripeError.decline_code,
      };
    } else if (error instanceof Error) {
      message = error.message;
    }

    console.error(
      "Stripe checkout session error:",
      JSON.stringify({ message, status, stripeErrorDetails, error }, null, 2)
    );

    return NextResponse.json(
      {
        error: message,
        stripeError: stripeErrorDetails,
      },
      { status }
    );
  }
}
