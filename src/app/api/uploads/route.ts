import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";

async function countUserUploadsToday(uploadDir: string, userId: string) {
  const entries = await fs.readdir(uploadDir);
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);

  const matchingFiles = await Promise.all(
    entries
      .filter((entry) => entry.startsWith(`${userId}_`))
      .map(async (entry) => {
        const fullPath = path.join(uploadDir, entry);
        const stat = await fs.stat(fullPath);
        return stat.mtime >= startOfDay ? entry : null;
      })
  );

  return matchingFiles.filter(Boolean).length;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const userId = formData.get("userId")?.toString();
    const uploadDir = path.resolve("./public/uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    if (userId) {
      const user = await db.user.findUnique({ where: { id: userId } });
      const isAdmin = user?.role === "admin";
      if (!user) {
        return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
      }

      if (!isAdmin && user.plan === "free") {
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        const dailyLimit = user.plan === "enterprise" ? 100 : user.plan === "pro" ? 20 : 5;
        const uploadCount = await countUserUploadsToday(uploadDir, userId);

        if (uploadCount >= dailyLimit) {
          return NextResponse.json(
            { error: `Limite quotidienne d'uploads atteinte pour votre plan (${dailyLimit}/jour).` },
            { status: 429 }
          );
        }
      }
    }

    const urls: string[] = [];

    for (const entry of formData.entries()) {
      const [key, value] = entry;
      // value is a File/Blob in the browser
      if (typeof (value as any).arrayBuffer === "function") {
        const file: any = value;
        const name = file.name || `${Date.now()}_${key}`;
        const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
        const filename = `${userId || "anon"}_${Date.now()}_${safeName}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(path.join(uploadDir, filename), buffer);
        urls.push(`/uploads/${filename}`);
      }
    }

    return NextResponse.json({ urls });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
