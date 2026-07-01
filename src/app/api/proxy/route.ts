import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("url");
    if (!target) return NextResponse.json({ error: "url query required" }, { status: 400 });

    const res = await fetch(target, { method: "GET" });
    if (!res.ok) return NextResponse.json({ error: `Upstream responded ${res.status}` }, { status: 502 });

    const contentType = res.headers.get("content-type") || "application/octet-stream";

    const headers: Record<string,string> = {
      "Content-Type": contentType,
    };

    return new NextResponse(res.body, { headers });
  } catch (err) {
    return NextResponse.json({ error: (err instanceof Error) ? err.message : String(err) }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";

function isAllowedHost(url: URL) {
  const hostname = url.hostname.toLowerCase();
  return (
    hostname === "s3.amazonaws.com" ||
    hostname.endsWith(".amazonaws.com") ||
    hostname === "results.deapi.ai" ||
    hostname === "deapi.ai" ||
    hostname.endsWith(".deapi.ai")
  );
}

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(urlParam);
  } catch {
    return NextResponse.json({ error: "Invalid url parameter" }, { status: 400 });
  }

  if (!isAllowedHost(targetUrl)) {
    return NextResponse.json({ error: "Unauthorized proxy host" }, { status: 403 });
  }

  const response = await fetch(targetUrl.toString(), {
    headers: {
      Accept: "*/*",
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: `Failed to fetch remote resource: ${response.statusText}` },
      { status: 502 }
    );
  }

  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  const body = await response.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}
