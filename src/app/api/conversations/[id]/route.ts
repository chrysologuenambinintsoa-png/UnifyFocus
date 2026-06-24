import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/conversations/[id] - Get a single conversation with messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const conversation = await db.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          select: {
            id: true,
            conversationId: true,
            role: true,
            content: true,
            model: true,
            attachments: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        userId: conversation.userId,
        title: conversation.title,
        model: conversation.model,
        type: conversation.type,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        messages: conversation.messages.map((m) => ({
          id: m.id,
          conversationId: m.conversationId,
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
          model: m.model,
          attachments: m.attachments ?? undefined,
          createdAt: m.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("Failed to fetch conversation:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}

// PATCH /api/conversations/[id] - Update a conversation
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title, model } = await req.json();

    const conversation = await db.conversation.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(model && { model }),
        updatedAt: new Date(),
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
    console.error("Failed to update conversation:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[id] - Delete a conversation
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.conversation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete conversation:", error);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}