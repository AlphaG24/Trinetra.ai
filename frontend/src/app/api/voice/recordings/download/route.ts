import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const audioUrl = searchParams.get("url");
    const customFilename = searchParams.get("filename") || `call_recording_${Date.now()}.wav`;

    if (!audioUrl) {
      return NextResponse.json({ error: "Missing audio url parameter" }, { status: 400 });
    }

    // Decode url if needed
    const targetUrl = decodeURIComponent(audioUrl);

    // Fetch the audio stream from the upstream provider (Sarvam / S3 / Twilio)
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Vaakriti-Audio-Downloader/1.0"
      }
    });

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `Upstream provider returned ${upstreamRes.status}` },
        { status: upstreamRes.status }
      );
    }

    const contentType = upstreamRes.headers.get("content-type") || "audio/wav";
    const audioBuffer = await upstreamRes.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${customFilename}"`,
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch (err: any) {
    console.error("[Audio Download Proxy Error]", err);
    return NextResponse.json({ error: err.message || "Failed to download audio" }, { status: 500 });
  }
}
