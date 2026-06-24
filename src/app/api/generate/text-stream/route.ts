import { generateTextAIStreaming, requestCodeAIStreaming } from "@/lib/ai";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt, options, type = "text", model } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt requis" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    let buffer = "";

    const stream = new ReadableStream({
      async start(controller) {
        const sendChunk = (text: string) => {
          buffer += text;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: text, buffer })}\n\n`));
        };

        try {
          if (type === "code") {
            await requestCodeAIStreaming(prompt, options ?? {}, sendChunk, model);
          } else {
            await generateTextAIStreaming(prompt, options ?? {}, sendChunk, model);
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: error instanceof Error ? error.message : "Erreur de génération",
              })}\n\n`
            )
          );
          controller.close();
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Streaming generation failed:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erreur de génération",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}