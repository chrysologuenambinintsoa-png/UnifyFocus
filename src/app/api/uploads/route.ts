import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const uploadDir = path.resolve("./public/uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const urls: string[] = [];

    for (const entry of formData.entries()) {
      const [key, value] = entry;
      // value is a File/Blob in the browser
      if (typeof (value as any).arrayBuffer === "function") {
        const file: any = value;
        const name = file.name || `${Date.now()}_${key}`;
        const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
        const filename = `${Date.now()}_${safeName}`;
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
