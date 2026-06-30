import { db } from "@/lib/db";
import { getSessionUser, requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const currentUser = await getSessionUser();
    const authError = requireAdmin(currentUser);
    if (authError) {
      return NextResponse.json(
        { error: "Accès administrateur requis" },
        { status: 403 }
      );
    }

    const [
      totalUsers,
      activeUsers,
      blockedUsers,
      adminUsers,
      totalCreditsUsed,
      recentLogsCount,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { isBlocked: false } }),
      db.user.count({ where: { isBlocked: true } }),
      db.user.count({ where: { role: "admin" } }),
      db.user.aggregate({
        _sum: {
          credits: true,
        },
      }),
      db.adminAuditLog.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    // Calculate system health based on various metrics
    let systemHealth: "healthy" | "warning" | "critical" = "healthy";
    const blockedPercentage = totalUsers > 0 ? (blockedUsers / totalUsers) * 100 : 0;
    
    if (blockedPercentage > 20 || totalUsers === 0) {
      systemHealth = "critical";
    } else if (blockedPercentage > 10 || recentLogsCount > 100) {
      systemHealth = "warning";
    }

    const stats = {
      totalUsers,
      activeUsers,
      blockedUsers,
      adminUsers,
      totalCreditsUsed: totalCreditsUsed._sum.credits || 0,
      apiCallsToday: recentLogsCount,
      systemHealth,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Impossible de récupérer les statistiques" },
      { status: 500 }
    );
  }
}
