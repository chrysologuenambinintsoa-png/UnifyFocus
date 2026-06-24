import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("userId", "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur" }, { status: 500 });
  }
}
