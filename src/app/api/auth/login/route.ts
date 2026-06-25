import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth";

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
    console.error("[POST /api/auth/login] Error:", err);
    return NextResponse.json(
      { error: "Erreur lors de la connexion" },
      { status: 500 }
    );
  }
}