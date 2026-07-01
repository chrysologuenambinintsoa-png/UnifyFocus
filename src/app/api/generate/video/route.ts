import { db } from "@/lib/db";
import { generateVideoAI } from "@/lib/ai.server";
import { normalizePrompt, extractPromptIntent } from "@/lib/prompt";
import { NextResponse } from "next/server";

function isFreePlanDailyQuotaExceeded(user: { id: string; plan: string | null; role?: string | null } | null, type: "audio" | "video") {
  if (!user || user.role === "admin") return false;
  if (user.plan !== "free") return false;

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const limits = {
    audio: 3,
    video: 3,
  } as const;

  return db.generation.count({
    where: {
      userId: user.id,
      type: type === "audio" ? "audio" : "video",
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

    // Debug: log presence of source video without printing full base64 data
    try {
      const optionKeys = options ? Object.keys(options) : [];
      console.log(`[api/generate/video] received options keys: ${optionKeys.join(",")}`);
      if (options && options.sourceVideo) {
        const src = String(options.sourceVideo);
        const isData = src.startsWith("data:");
        console.log(
          `[api/generate/video] sourceVideo present - dataUrl=${isData} length=${src.length}`
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

    const user = await db.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === "admin";
    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    if (!isAdmin) {
      const dailyLimit = getDailyQuotaLimit(user, "video");
      const currentCount = await db.generation.count({ where: { userId, type: "video", createdAt: { gte: new Date(new Date().setHours(0,0,0,0)), lte: new Date(new Date().setHours(23,59,59,999)) } } });
      if (currentCount >= dailyLimit) {
        return NextResponse.json(
          { error: `Limite quotidienne de vidéos atteinte pour votre plan (${dailyLimit}/jour).` },
          { status: 429 }
        );
      }

      if (user.credits < 5) {
        return NextResponse.json(
          { error: "Crédits insuffisants (5 nécessaires)" },
          { status: 402 }
        );
      }
    }

    if (subtype === "video-to-video" && !(options && options.sourceVideo)) {
      return NextResponse.json(
        { error: "Une vidéo source est requise pour cette action." },
        { status: 400 }
      );
    }

    const [updatedUser, generation] = await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: isAdmin ? {} : { credits: { decrement: 5 } },
      }),
      db.generation.create({
        data: {
          userId,
          type: "video",
          prompt,
          status: "pending",
          credits: 5,
        },
      }),
    ]);

    const effectivePrompt =
      subtype === "video-to-video"
        ? `Transforme la vidéo source selon le prompt suivant : ${normalizedPrompt}\n\n[Prompt Metadata]: ${JSON.stringify(promptIntent)}`
        : `${normalizedPrompt}\n\n[Prompt Metadata]: ${JSON.stringify(promptIntent)}`;

    const result = await generateVideoAI(effectivePrompt, options ?? {});

    const completed = await db.generation.update({
      where: { id: generation.id },
      data: { result, status: "completed" },
    });

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
    console.error("Video generation failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur de génération",
      },
      { status: 500 }
    );
  }
}