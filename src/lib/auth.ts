import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { User } from "@/store/app-store";

export function buildSessionUserPayload(user: Partial<User> & { id: string; email: string; name: string | null; avatar: string | null; provider?: string; credits?: number; plan?: "free" | "pro" | "enterprise"; role?: "user" | "admin"; isBlocked?: boolean; createdAt?: string | Date }): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    avatar: user.avatar ?? null,
    provider: user.provider ?? "email",
    credits: user.credits ?? 50,
    plan: (user.plan ?? "free") as "free" | "pro" | "enterprise",
    role: (user.role ?? "user") as "user" | "admin",
    isBlocked: user.isBlocked ?? false,
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
  };
}

export function setSessionCookies(res: NextResponse, user: User) {
  res.cookies.set("userId", user.id, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  res.cookies.set("sessionUser", encodeURIComponent(JSON.stringify(user)), {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

function isPrismaConfigured(): boolean {
  const databaseUrl = process.env.DATABASE_URL || "";
  return databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://");
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.toLowerCase();

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAIL ? email.toLowerCase() === ADMIN_EMAIL : false;
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const sessionUserCookie = cookieStore.get("sessionUser")?.value;
  if (sessionUserCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(sessionUserCookie)) as User;
      if (parsed?.id && parsed?.email) {
        return buildSessionUserPayload(parsed);
      }
    } catch {
      // ignore invalid cookie and fall back to DB lookup
    }
  }

  const userId = cookieStore.get("userId")?.value;
  if (!userId) return null;

  if (!isPrismaConfigured()) {
    return null;
  }

  try {
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
  } catch (error) {
    console.warn("Auth session lookup failed:", error);
    return null;
  }
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
