import { db } from "@/lib/db";
import { chatWithAIWithSearch } from "@/lib/ai.server";
import { extractImagesFromResponse } from "@/lib/ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId, conversationId, message, model, history, attachments } = await req.json();

    if (!userId || (!message && (!attachments || attachments.length === 0))) {
      return NextResponse.json(
        { error: "Utilisateur et message ou pièces jointes requis" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Check credits (1 credit per chat message)
    if (user.credits < 1) {
      return NextResponse.json(
        { error: "Crédits insuffisants (1 nécessaire)" },
        { status: 402 }
      );
    }

    // Build conversation context - Professional UnifyFocus assistant
    const systemPrompt = "Vous êtes l'assistant IA professionnel de UnifyFocus. Vous êtes utile, amical et professionnel. Répondez de manière concise, pertinente et structurée. Privilégiez un ton professionnel adapté au contexte professionnel. Si vous ne connaissez pas la réponse, dites-le honnêtement et proposez des pistes pour trouver l'information.";
    
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    let conversation;
    if (conversationId) {
      // Update existing conversation
      conversation = await db.conversation.findUnique({
        where: { id: conversationId },
      });
      
      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation non trouvée" },
          { status: 404 }
        );
      }

      // Save user message (include attachments if provided)
      await db.message.create({
        data: {
          conversationId,
          role: "user",
          content: message,
          attachments: attachments ?? undefined,
        },
      });
    }

    try {
      // Generate response with web search support when the user asks for recent or external information
      const { response, searchResults, usedSearch } = await chatWithAIWithSearch(messages, model || "gpt-4o", true);
      const responseAttachments = extractImagesFromResponse(response);

      // Deduct credit and save assistant message
      const [updatedUser] = await db.$transaction([
        db.user.update({
          where: { id: userId },
          data: { credits: { decrement: 1 } },
        }),
      ]);

      // Save assistant message
      if (conversationId) {
        await db.message.create({
          data: {
            conversationId,
            role: "assistant",
            content: response,
            attachments: responseAttachments.length > 0 ? responseAttachments : undefined,
          },
        });
      }

      // Update conversation timestamp
      if (conversationId) {
        await db.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date().toISOString() },
        });
      }

      return NextResponse.json({
        response,
        credits: updatedUser.credits,
        attachments: responseAttachments.length > 0 ? responseAttachments : undefined,
        ...(usedSearch ? { searchResults, usedSearch } : {}),
      });
    } catch (error) {
      console.error("Chat generation failed:", error);
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Échec de génération",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}