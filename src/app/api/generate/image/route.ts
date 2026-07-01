import { db } from "@/lib/db";
import { generateImageAI } from "@/lib/ai.server";
import { normalizePrompt, extractPromptIntent } from "@/lib/prompt";
import { NextResponse } from "next/server";

function isFreePlanDailyQuotaExceeded(user: { id: string; plan: string | null; role?: string | null } | null, type: "image" | "audio" | "video") {
  if (!user || user.role === "admin") return false;
  if (user.plan !== "free") return false;

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const limits = {
    image: 5,
    audio: 3,
    video: 3,
  } as const;

  return db.generation.count({
    where: {
      userId: user.id,
      type,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  }).then((count) => count >= limits[type]);
}

export async function POST(req: Request) {
  try {
    const { userId, prompt, options, model, subtype } = await req.json();

    const normalizedPrompt = normalizePrompt(prompt);
    const promptIntent = extractPromptIntent(prompt);

    // Debug: log presence of source image without printing full base64 data
    try {
      const optionKeys = options ? Object.keys(options) : [];
      console.log(`[api/generate/image] received options keys: ${optionKeys.join(",")}`);
      if (options && options.sourceImage) {
        const src = String(options.sourceImage);
        const isData = src.startsWith("data:");
        console.log(
          `[api/generate/image] sourceImage present - dataUrl=${isData} length=${src.length}`
        );
      }
    } catch (e) {
      // ignore logging errors
    }

    if (!userId || !prompt) {
      return NextResponse.json(
        { error: "Utilisateur et prompt requis" },
        { status: 400 }
      );
    }

    if (subtype === "image-to-image" && !(options && options.sourceImage)) {
      return NextResponse.json(
        { error: "Une image source est requise pour cette action." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === "admin";
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    if (!isAdmin) {
      const dailyLimitReached = await isFreePlanDailyQuotaExceeded(user, "image");
      if (dailyLimitReached) {
        return NextResponse.json(
          { error: "Limite quotidienne d'images atteinte pour le plan gratuit (5/jour)." },
          { status: 429 }
        );
      }

      if (user.credits < 3) {
        return NextResponse.json(
          { error: "Crédits insuffisants (3 nécessaires)" },
          { status: 402 }
        );
      }
    }

    const generation = await db.generation.create({
      data: {
        userId,
        type: "image",
        prompt,
        status: "pending",
        credits: 3,
      },
    });

    const effectivePrompt =
      subtype === "image-to-image"
        ? `Transforme l'image source selon le prompt suivant : ${normalizedPrompt}\n\n[Prompt Metadata]: ${JSON.stringify(promptIntent)}`
        : `${normalizedPrompt}\n\n[Prompt Metadata]: ${JSON.stringify(promptIntent)}`;

    try {
      const result = await generateImageAI(effectivePrompt, options ?? {});

      const [updatedUser, completed] = await db.$transaction([
        db.user.update({
          where: { id: userId },
          data: isAdmin ? {} : { credits: { decrement: 3 } },
        }),
        db.generation.update({
          where: { id: generation.id },
          data: { result, status: "completed" },
        }),
      ]);

      return NextResponse.json({
        generation: {
          id: completed.id,
          type: completed.type,
          prompt: completed.prompt,
          result: completed.result,
          status: completed.status,
          credits: completed.credits,
          createdAt: completed.createdAt.toISOString(),
        },
        credits: updatedUser.credits,
      });
    } catch (error) {
      await db.generation.update({
        where: { id: generation.id },
        data: {
          status: "failed",
          result:
            error instanceof Error
              ? error.message
              : "Échec de génération",
        },
      });
      throw error;
    }
  } catch (error) {
    console.error("Image generation failed:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur de génération";
    const status = errorMessage.includes("for image generation") ? 501 : 500;
    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status }
    );
  }
}