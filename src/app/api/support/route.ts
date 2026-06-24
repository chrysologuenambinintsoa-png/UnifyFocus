import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // For now, persist to a local file under /tmp or log to console.
    // In production, you'd save to DB or forward to email/third-party.
    const payload = {
      userId: typeof userId === "string" ? userId : null,
      message,
      createdAt: new Date().toISOString(),
    };

    // Attempt to write to disk if possible
    try {
      const fs = await import("fs/promises");
      const path = "./tmp/support_messages.json";
      let existing: any[] = [];
      try {
        const raw = await fs.readFile(path, "utf8");
        existing = JSON.parse(raw || "[]");
      } catch (_) {
        existing = [];
      }
      existing.push(payload);
      await fs.mkdir("./tmp", { recursive: true });
      await fs.writeFile(path, JSON.stringify(existing, null, 2), "utf8");
    } catch (err) {
      console.warn("Could not write support message to disk:", err);
    }

    console.info("Support message received:", payload);

    return NextResponse.json({ ok: true, message: "Received" });
  } catch (err) {
    console.error("Failed to handle support POST:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
