import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, name, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 409 }
      );
    }

    // Simple hash for demo (use bcrypt in production)
    const passwordHash =
      "hash_" + Buffer.from(password).toString("base64");

    const user = await db.user.create({
      data: {
        email,
        name: name || email.split("@")[0],
        passwordHash,
        provider: "email",
        credits: 50,
        plan: "free",
        role: isAdminEmail(email) ? "admin" : "user",
        isBlocked: false,
      },
    });

    // Create free subscription
    await db.subscription.create({
      data: {
        userId: user.id,
        plan: "free",
        status: "active",
      },
    });

    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        credits: user.credits,
        plan: user.plan,
        role: user.role,
        isBlocked: user.isBlocked,
      },
    });
    res.cookies.set("userId", user.id, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    console.error("[POST /api/auth/signup] Error:", err);
    return NextResponse.json(
      { error: "Erreur lors de l'inscription" },
      { status: 500 }
    );
  }
}