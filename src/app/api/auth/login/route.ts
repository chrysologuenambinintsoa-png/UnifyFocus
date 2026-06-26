import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { buildSessionUserPayload, isAdminEmail, setSessionCookies } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    if (user.isBlocked) {
      return NextResponse.json(
        { error: "Compte bloqué. Contactez un administrateur." },
        { status: 403 }
      );
    }

    // Simple check for demo (use bcrypt in production)
    const passwordHash =
      "hash_" + Buffer.from(password).toString("base64");
    if (user.passwordHash !== passwordHash) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      );
    }

    // Update user role if email matches admin email
    if (isAdminEmail(email) && user.role !== "admin") {
      await db.user.update({
        where: { id: user.id },
        data: { role: "admin" },
      });
      user.role = "admin";
    }
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
    console.error("[POST /api/auth/login] Error:", err);
    return NextResponse.json(
      { error: "Erreur lors de la connexion" },
      { status: 500 }
    );
  }
}