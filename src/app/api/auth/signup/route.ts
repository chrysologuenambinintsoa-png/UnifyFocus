import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { buildSessionUserPayload, isAdminEmail, setSessionCookies } from "@/lib/auth";

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

    const sessionUser = buildSessionUserPayload({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      provider: user.provider,
      credits: user.credits,
      plan: user.plan as "free" | "pro" | "enterprise",
      role: user.role as "user" | "admin",
      isBlocked: user.isBlocked,
      createdAt: user.createdAt,
    });

    const res = NextResponse.json({ user: sessionUser });
    setSessionCookies(res, sessionUser);
    return res;
  } catch (err) {
    console.error("[POST /api/auth/signup] Error:", err);
    return NextResponse.json(
      { error: "Erreur lors de l'inscription" },
      { status: 500 }
    );
  }
}