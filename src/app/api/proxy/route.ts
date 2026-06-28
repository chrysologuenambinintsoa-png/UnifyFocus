import { NextRequest, NextResponse } from "next/server";

function isAllowedHost(url: URL) {
  const hostname = url.hostname.toLowerCase();
  return (
    hostname === "s3.amazonaws.com" ||
    hostname.endsWith(".amazonaws.com")
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
