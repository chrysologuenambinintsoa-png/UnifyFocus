import { db } from "@/lib/db";
import type { AppSetting } from "@prisma/client";
import { getSessionUser, requireAdmin, logAdminAction } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const currentUser = await getSessionUser();
  const authError = requireAdmin(currentUser);
  if (authError) return authError;

  const settings = await db.appSetting.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const currentUser = await getSessionUser();
  const authError = requireAdmin(currentUser);
  if (authError) return authError;

  const body = await req.json();
  const items = Array.isArray(body.settings) ? body.settings : [];

  const updatedSettings: AppSetting[] = [];

  for (const item of items) {
    if (!item?.key || item.value === undefined) continue;
    const setting = await db.appSetting.upsert({
      where: { key: item.key },
      update: {
        value: item.value,
        label: item.label || item.key,
        description: item.description || null,
      },
      create: {
        key: item.key,
        value: item.value,
        label: item.label || item.key,
        description: item.description || null,
      },
    });
    updatedSettings.push(setting);
  }

  await logAdminAction(
    currentUser!.id,
    "update_settings",
    `Mise à jour des paramètres administrateur (${updatedSettings.length} éléments)`
  );

  return NextResponse.json({ settings: updatedSettings });
}
