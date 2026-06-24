import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { userId, newPlan } = await request.json();

    if (!userId || !newPlan) {
      return NextResponse.json(
        { error: "userId and newPlan are required" },
        { status: 400 }
      );
    }

    const validPlans = ["free", "pro", "enterprise"] as const;
    if (!validPlans.includes(newPlan)) {
      return NextResponse.json(
        { error: "Invalid plan type" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Plan upgrade logic
    const planCredits: Record<string, number> = {
      free: 50,
      pro: 500,
      enterprise: 5000,
    };

    const currentPlanCredits = planCredits[user.plan] ?? 50;
    const targetPlanCredits = planCredits[newPlan];
    let newCreditBalance: number;

    if (targetPlanCredits > currentPlanCredits) {
      newCreditBalance = user.credits + (targetPlanCredits - currentPlanCredits);
    } else {
      newCreditBalance = Math.min(user.credits, targetPlanCredits);
    }

    // Update user plan and subscription record
    const [updatedUser] = await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: {
          plan: newPlan,
          credits: newCreditBalance,
        },
      }),
      db.subscription.upsert({
        where: {
          id: `${userId}-${newPlan}`,
        },
        create: {
          userId,
          plan: newPlan,
          status: "active",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        update: {
          plan: newPlan,
          status: "active",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    // Add notification about the upgrade
    await db.notification.create({
      data: {
        userId,
        title: "Plan mis à jour",
        message: `Votre plan a été changé pour ${newPlan}. Nouveau solde: ${newCreditBalance} crédits.`,
        type: "success",
        read: false,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        plan: updatedUser.plan,
        credits: updatedUser.credits,
      },
    });
  } catch (error) {
    console.error("Subscription upgrade error:", error);
    return NextResponse.json(
      { error: "Failed to upgrade subscription" },
      { status: 500 }
    );
  }
}