import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/user/settings?userId=xxx
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId requis" },
        { status: 400 }
      );
    }

    // On peut vérifier l'existence de l'utilisateur et récupérer les settings en une seule requête
    const userWithSettings = await db.user.findUnique({
      where: { id: userId },
      include: { settings: true },
    });

    if (!userWithSettings) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    let settings = userWithSettings.settings;

    // Utilisation de l'upsert pour éviter les conditions de concurrence (race conditions)
    if (!settings) {
      settings = await db.userSettings.upsert({
        where: { userId },
        update: {},
        create: {
          userId,
          theme: "system",
          language: "fr",
          notifications: true,
          emailAlerts: true,
          autoSave: true,
        }
      });
    }

    return NextResponse.json({
      settings,
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des paramètres" },
      { status: 500 }
    );
  }
}

// PUT /api/user/settings
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, theme, language, notifications, emailAlerts, autoSave } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId requis" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Build update data (only include provided fields)
    const updateData: {
      theme?: string;
      language?: string;
      notifications?: boolean;
      emailAlerts?: boolean;
      autoSave?: boolean;
    } = {};

    // Mapping automatique des champs présents dans le body
    const fields = { theme, language, notifications, emailAlerts, autoSave };
    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined) (updateData as any)[key] = value;
    });

    let settings = await db.userSettings.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        theme: "system",
        language: "fr",
        notifications: true,
        emailAlerts: true,
        autoSave: true,
        ...updateData,
      },
    });

    return NextResponse.json({
      settings,
      message: "Paramètres mis à jour avec succès",
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des paramètres" },
      { status: 500 }
    );
  }
}

// DELETE /api/user/settings?userId=xxx
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId requis" },
        { status: 400 }
      );
    }

    // Delete settings
    await db.userSettings.deleteMany({
      where: { userId },
    });

    return NextResponse.json({
      message: "Paramètres supprimés avec succès",
    });
  } catch (error) {
    console.error("Error deleting settings:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression des paramètres" },
      { status: 500 }
    );
  }
}