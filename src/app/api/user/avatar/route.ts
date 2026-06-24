import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/user/avatar - Upload avatar
export async function POST(request: NextRequest) {
  try {
    const { userId, avatar } = await request.json();

    if (!userId || !avatar) {
      return NextResponse.json(
        { error: "userId and avatar are required" },
        { status: 400 }
      );
    }

      // Verify user exists and that avatar can be edited (only for local/email accounts)
      const existing = await db.user.findUnique({ where: { id: userId } });
      if (!existing) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      if (existing.provider !== "email") {
        return NextResponse.json({ error: "Avatar modification not allowed for OAuth accounts" }, { status: 403 });
      }

      // Update user avatar in database
      const updatedUser = await db.user.update({
        where: { id: userId },
        data: { avatar },
      });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    );
  }
}

// DELETE /api/user/avatar - Remove avatar
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (existing.provider !== "email") {
      return NextResponse.json({ error: "Avatar modification not allowed for OAuth accounts" }, { status: 403 });
    }

    // Remove user avatar from database
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { avatar: null },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Error removing avatar:", error);
    return NextResponse.json(
      { error: "Failed to remove avatar" },
      { status: 500 }
    );
  }
}