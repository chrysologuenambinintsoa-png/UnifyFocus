import { db } from "@/lib/db";
import { getSessionUser, requireAdmin, logAdminAction } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const currentUser = await getSessionUser();
  const authError = requireAdmin(currentUser);
  if (authError) return authError;

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      credits: true,
      plan: true,
      role: true,
      isBlocked: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const currentUser = await getSessionUser();
  const authError = requireAdmin(currentUser);
  if (authError) return authError;

  const { email, name, password, role } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email et mot de passe requis" },
      { status: 400 }
    );
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Un utilisateur avec cet email existe déjà" },
      { status: 409 }
    );
  }

  const newUser = await db.user.create({
    data: {
      email,
      name: name || email.split("@")[0],
      passwordHash: "hash_" + Buffer.from(password).toString("base64"),
      provider: "email",
      credits: 50,
      plan: "free",
      role: role === "admin" ? "admin" : "user",
      isBlocked: false,
    },
  });

  await logAdminAction(
    currentUser!.id,
    "create_user",
    `Création de l'utilisateur ${newUser.email} (${newUser.id}) avec rôle ${newUser.role}`
  );

  return NextResponse.json({
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      avatar: newUser.avatar,
      credits: newUser.credits,
      plan: newUser.plan,
      role: newUser.role,
      isBlocked: newUser.isBlocked,
    },
  });
}
