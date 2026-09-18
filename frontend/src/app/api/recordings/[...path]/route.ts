import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params;
    const subPath = path.join("/");
    const backendUrl = (
      process.env.INTERNAL_BACKEND_URL ||
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_FASTAPI_URL ||
      "http://localhost:8000"
    ).replace(/\/+$/, "");

    const targetUrl = `${backendUrl}/api/voice/recordings/${subPath}`;

    const headers: Record<string, string> = {};
    const range = request.headers.get("range");
    if (range) {
      headers["range"] = range;
    }

    const backendRes = await fetch(targetUrl, {
      method: "GET",
      headers,
    });

    if (!backendRes.ok && backendRes.status !== 206) {
      return new NextResponse(null, { status: backendRes.status });
    }

    const responseHeaders = new Headers();
    const contentType = backendRes.headers.get("content-type") || "audio/mpeg";
    const contentLength = backendRes.headers.get("content-length");
    const contentRange = backendRes.headers.get("content-range");
    const acceptRanges = backendRes.headers.get("accept-ranges") || "bytes";

    responseHeaders.set("Content-Type", contentType);
    responseHeaders.set("Accept-Ranges", acceptRanges);
    if (contentLength) responseHeaders.set("Content-Length", contentLength);
    if (contentRange) responseHeaders.set("Content-Range", contentRange);
    responseHeaders.set("Cache-Control", "public, max-age=86400, immutable");

    return new NextResponse(backendRes.body, {
      status: backendRes.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error("[Recordings Proxy Error]", error);
    return new NextResponse(null, { status: 502 });
  }
}
