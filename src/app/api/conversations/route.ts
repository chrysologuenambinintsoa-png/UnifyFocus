import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/conversations - List all conversations for a user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 400 }
      );
    }

    const conversations = await db.conversation.findMany({
      where: { userId, type: "chat" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 1, // Just get first message for preview
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        id: c.id,
        userId: c.userId,
        title: c.title,
        model: c.model,
        type: c.type as "text" | "image" | "video",
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        messages: c.messages.map((m) => ({
          id: m.id,
          conversationId: m.conversationId,
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
          model: m.model,
          createdAt: m.createdAt.toISOString(),
        })),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(req: NextRequest) {
  try {
    const { userId, title, model, type } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID required" },
        { status: 400 }
      );
    }

    const conversation = await db.conversation.create({
      data: {
        userId,
        title: title || "Nouvelle conversation",
        model: model || "gpt-4",
        type: type || "text",
      },
    });

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        userId: conversation.userId,
        title: conversation.title,
        model: conversation.model,
        type: conversation.type,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to create conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}