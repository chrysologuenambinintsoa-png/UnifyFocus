import { db } from "@/lib/db";
import { generateAudioAI } from "@/lib/ai.server";
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

    if (subtype === "music-to-music" && !(options && options.sourceAudio)) {
      return NextResponse.json(
        { error: "Un fichier audio source est requis pour transformer une piste." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || user.credits < 1) {
      return NextResponse.json(
        { error: "Crédits insuffisants" },
        { status: 402 }
      );
    }

    const creditCost = subtype === "text-generation" ? 1 : 2;
    if (!user || user.credits < creditCost) {
      return NextResponse.json(
        { error: `Crédits insuffisants (${creditCost} nécessaires)` },
        { status: 402 }
      );
    }

    const generation = await db.generation.create({
      data: {
        userId,
        type: "audio",
        prompt,
        status: "pending",
        credits: creditCost,
      },
    });

    const effectivePrompt =
      subtype === "music-to-music"
        ? `Transforme l'audio source selon le prompt suivant : ${normalizedPrompt}\n\n[Prompt Metadata]: ${JSON.stringify(promptIntent)}`
        : `${normalizedPrompt}\n\n[Prompt Metadata]: ${JSON.stringify(promptIntent)}`;

    try {
      const result = await generateAudioAI(effectivePrompt, options ?? {});

      const [updatedUser, completed] = await db.$transaction([
        db.user.update({
          where: { id: userId },
          data: { credits: { decrement: creditCost } },
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
    console.error("Audio generation failed:", error);
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
