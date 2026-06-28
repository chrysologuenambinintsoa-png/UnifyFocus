import { db } from "@/lib/db";
import { generateTextAI } from "@/lib/ai.server";
import { normalizePrompt, extractPromptIntent } from "@/lib/prompt";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId, prompt, options, model, subtype } = await req.json();

    const normalizedPrompt = normalizePrompt(prompt);
    const promptIntent = extractPromptIntent(prompt);

    if (!userId || !prompt) {
      return NextResponse.json(
        { error: "Utilisateur et prompt requis" },
        { status: 400 }
      );
    }

    if (
      subtype === "image-to-text" &&
      !(options && options.sourceImage)
    ) {
      return NextResponse.json(
        { error: "Une image source est requise pour cette action." },
        { status: 400 }
      );
    }

    if (
      subtype === "video-to-text" &&
      !(options && options.sourceVideo)
    ) {
      return NextResponse.json(
        { error: "Une vidéo source est requise pour cette action." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === "admin";
    if (!user || (!isAdmin && user.credits < 1)) {
      return NextResponse.json(
        { error: "Crédits insuffisants" },
        { status: 402 }
      );
    }

    const generation = await db.generation.create({
      data: {
        userId,
        type: "text",
        prompt,
        status: "pending",
        credits: 1,
      },
    });
    const effectivePrompt =
      subtype === "image-to-text"
        ? `Extrait le texte de l'image suivante et fournis-le clairement. Contexte : ${normalizedPrompt}\n\nImage : ${
            options?.sourceImage ?? ""
          }\n\n[Prompt Metadata]: ${JSON.stringify(promptIntent)}`
        : subtype === "video-to-text"
        ? `Transcris la vidéo suivante et fournis le texte de manière claire et structurée. Contexte : ${normalizedPrompt}\n\nVidéo : ${
            options?.sourceVideo ?? ""
          }\n\n[Prompt Metadata]: ${JSON.stringify(promptIntent)}`
        : `${normalizedPrompt}\n\n[Prompt Metadata]: ${JSON.stringify(promptIntent)}`;

    try {
      const result = await generateTextAI(effectivePrompt, options ?? {}, model);

      const [updatedUser, completed] = await db.$transaction([
        db.user.update({
          where: { id: userId },
          data: isAdmin ? {} : { credits: { decrement: 1 } },
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
    console.error("Text generation failed:", error);
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