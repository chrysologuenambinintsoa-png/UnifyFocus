import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 }
      );
    }

    const generations = await db.generation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      generations: generations.map((g) => ({
        id: g.id,
        type: g.type,
        prompt: g.prompt,
        result: g.result,
        status: g.status,
        credits: g.credits,
        createdAt: g.createdAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Erreur récupération" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      // delete a single generation for the user (safe deleteMany to ensure user ownership)
      const result = await db.generation.deleteMany({ where: { id, userId: user.id } });
      return NextResponse.json({ deleted: result.count });
    }

    // delete all generations for the user
    const result = await db.generation.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error("Failed to delete generations:", error);
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}