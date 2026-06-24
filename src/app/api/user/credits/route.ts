import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId, plan } = await req.json();

    if (!userId || !plan) {
      return NextResponse.json(
        { error: "userId et plan requis" },
        { status: 400 }
      );
    }

    const creditMap: Record<string, number> = {
      free: 50,
      pro: 500,
      enterprise: 5000,
    };

    const [updatedUser] = await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: {
          plan,
          credits: creditMap[plan] || 50,
        },
      }),
      db.subscription.upsert({
        where: {
          id: `${userId}-${plan}`,
        },
        create: {
          userId,
          plan,
          status: "active",
          currentPeriodEnd: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ),
        },
        update: {
          plan,
          status: "active",
          currentPeriodEnd: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ),
        },
      }),
    ]);

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        credits: updatedUser.credits,
        plan: updatedUser.plan,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Erreur mise à jour crédits" },
      { status: 500 }
    );
  }
}