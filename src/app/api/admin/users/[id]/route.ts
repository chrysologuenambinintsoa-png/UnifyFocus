import { db } from "@/lib/db";
import { getSessionUser, requireAdmin, logAdminAction } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const currentUser = await getSessionUser();
  const authError = requireAdmin(currentUser);
  if (authError) return authError;

  const userId = params.id;
  const body = await req.json();
  const { role, isBlocked } = body;

  if (!role && isBlocked === undefined) {
    return NextResponse.json(
      { error: "Aucun champ modifiable fourni" },
      { status: 400 }
    );
  }

  if (userId === currentUser?.id && role === "user") {
    return NextResponse.json(
      { error: "Vous ne pouvez pas retirer votre propre rôle d'administrateur." },
      { status: 400 }
    );
  }

  const updatedUser = await db.user.update({
    where: { id: userId },
    data: {
      role: role === "admin" ? "admin" : role === "user" ? "user" : undefined,
      isBlocked: isBlocked === undefined ? undefined : isBlocked,
    },
  });

  await logAdminAction(
    currentUser!.id,
    "update_user",
    `Mise à jour de l'utilisateur ${updatedUser.email} (${updatedUser.id}) role=${updatedUser.role} blocked=${updatedUser.isBlocked}`
  );

  return NextResponse.json({
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      avatar: updatedUser.avatar,
      credits: updatedUser.credits,
      plan: updatedUser.plan,
      role: updatedUser.role,
      isBlocked: updatedUser.isBlocked,
    },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const currentUser = await getSessionUser();
  const authError = requireAdmin(currentUser);
  if (authError) return authError;

  const userId = params.id;

  if (userId === currentUser?.id) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas supprimer votre propre compte depuis le panneau admin." },
      { status: 400 }
    );
  }

  const deletedUser = await db.user.delete({ where: { id: userId } });

  await logAdminAction(
    currentUser!.id,
    "delete_user",
    `Suppression de l'utilisateur ${deletedUser.email} (${deletedUser.id})`
  );

  return NextResponse.json({ success: true });
}
