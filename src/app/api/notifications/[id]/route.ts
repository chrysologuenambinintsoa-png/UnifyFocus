import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// PUT /api/notifications/[id] - Mark a notification as read
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { read, userId } = await req.json();

    // Verify the notification belongs to the user
    const existingNotification = await db.notification.findFirst({
      where: { id, userId },
    });

    if (!existingNotification) {
      return NextResponse.json(
        { error: "Notification not found or access denied" },
        { status: 404 }
      );
    }

    const notification = await db.notification.update({
      data: {
        read: read !== undefined ? read : existingNotification.read,
      },
      where: { id },
    });

    return NextResponse.json({
      notification: {
        id: notification.id,
        userId: notification.userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: notification.read,
        actionUrl: notification.actionUrl,
        createdAt: notification.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Failed to update notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - Delete a notification
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await req.json();

    // Verify the notification belongs to the user
    const existingNotification = await db.notification.findFirst({
      where: { id, userId },
    });

    if (!existingNotification) {
      return NextResponse.json(
        { error: "Notification not found or access denied" },
        { status: 404 }
      );
    }

    await db.notification.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete notification:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}