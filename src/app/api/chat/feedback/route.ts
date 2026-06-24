import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { messageId, rating, userId } = await request.json();

    if (!messageId || !userId || !["good", "bad", "incomplete"].includes(rating)) {
      return NextResponse.json(
        { error: "Invalid messageId, userId or rating" },
        { status: 400 }
      );
    }

    // Save feedback to database
    const feedback = await db.messageFeedback.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
      update: {
        rating,
        updatedAt: new Date(),
      },
      create: {
        messageId,
        userId,
        rating,
      },
    });

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
