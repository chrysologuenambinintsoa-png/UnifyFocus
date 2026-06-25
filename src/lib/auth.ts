import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { User } from "@/store/app-store";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase();

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAIL ? email.toLowerCase() === ADMIN_EMAIL : false;
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;
  if (!userId) return null;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.isBlocked) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    provider: user.provider,
    credits: user.credits,
    plan: user.plan as "free" | "pro" | "enterprise",
    role: user.role as "user" | "admin",
    isBlocked: user.isBlocked,
    createdAt: user.createdAt.toISOString(),
  };
}

export function checkAdmin(user: User | null) {
  return user?.role === "admin";
}

export function requireAdmin(user: User | null) {
  if (!checkAdmin(user)) {
    return NextResponse.json(
      { error: "Accès administrateur requis" },
      { status: 403 }
    );
  }
  return null;
}

export async function logAdminAction(adminId: string, action: string, details?: string) {
  return db.adminAuditLog.create({
    data: {
      adminId,
      action,
      details,
    },
  });
}
