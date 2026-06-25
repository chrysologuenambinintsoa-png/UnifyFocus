import { db } from "@/lib/db";
import { generateCodeAI } from "@/lib/ai";
import { normalizePrompt, extractPromptIntent } from "@/lib/prompt";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId, prompt, options, subtype } = await req.json();

    const normalizedPrompt = normalizePrompt(prompt);
    const promptIntent = extractPromptIntent(prompt);

    if (!userId || !prompt) {
      return NextResponse.json(
        { error: "Utilisateur et prompt requis" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.role === "admin";
    if (!user || (!isAdmin && user.credits < 2)) {
      return NextResponse.json(
        { error: "Crédits insuffisants (2 nécessaires)" },
        { status: 402 }
      );
    }

    const generation = await db.generation.create({
      data: {
        userId,
        type: "code",
        prompt,
        status: "pending",
        credits: 2,
      },
    });

    const effectivePrompt =
      subtype === "code-refactor"
        ? `Refactorise le code suivant sans changer sa fonctionnalité :\n\n${normalizedPrompt}\n\n[Prompt Metadata]: ${JSON.stringify(promptIntent)}`
        : subtype === "code-explain"
        ? `Explique en détail le code suivant et indique ses points importants :\n\n${normalizedPrompt}\n\n[Prompt Metadata]: ${JSON.stringify(promptIntent)}`
        : subtype === "code-debug"
        ? `Trouve et corrige les bugs dans le code suivant, puis explique les modifications :\n\n${normalizedPrompt}\n\n[Prompt Metadata]: ${JSON.stringify(promptIntent)}`
        : `${normalizedPrompt}\n\n[Prompt Metadata]: ${JSON.stringify(promptIntent)}`;

    try {
      const result = await generateCodeAI(effectivePrompt, options ?? {});

      const [updatedUser, completed] = await db.$transaction([
        db.user.update({
          where: { id: userId },
          data: isAdmin ? {} : { credits: { decrement: 2 } },
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
          result: error instanceof Error ? error.message : "Échec de génération",
        },
      });
      throw error;
    }
  } catch (error) {
    console.error("Code generation failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erreur de génération",
      },
      { status: 500 }
    );
  }
}
