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

    let fetchUrl = targetUrl;
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    };

    // Handle Sarvam Voice Agent Audio Recordings
    if (targetUrl.includes("sarvam.ai")) {
      const sarvamKey = process.env.SARVAM_WORKSPACE_API_KEY || 
        process.env.SARVAM_API_KEY || 
        process.env.SARVA_VOICE_AGENTS || 
        "sk_samvaad_werdeggz_BnUoezMCwoT5iHjhMKEVNipM";
      if (sarvamKey) {
        headers["X-API-Key"] = sarvamKey;
      }

      // If it's an indus.sarvam.ai/media signed link or analytics URL, parse parameters and use the stable recordings API
      try {
        const parsedUrl = new URL(targetUrl);
        const orgId = parsedUrl.searchParams.get("org_id");
        const workspaceId = parsedUrl.searchParams.get("workspace_id");
        const appId = parsedUrl.searchParams.get("app_id");
        const interactionId = parsedUrl.searchParams.get("interaction_id");

        if (orgId && workspaceId && appId && interactionId) {
          fetchUrl = `https://apps.sarvam.ai/api/analytics/v1/${orgId}/${workspaceId}/${appId}/recordings/${interactionId}`;
        }
      } catch (parseErr) {
        console.warn("[Audio Download] Could not parse Sarvam URL parameters:", parseErr);
      }
    }

    // Fetch the audio stream from upstream
    const upstreamRes = await fetch(fetchUrl, { headers });

    if (!upstreamRes.ok) {
      console.warn(`[Audio Download] Upstream fetch to ${fetchUrl} failed with status ${upstreamRes.status}`);
      // Fallback: if transformed URL failed, try original URL
      if (fetchUrl !== targetUrl) {
        const fallbackRes = await fetch(targetUrl, { headers });
        if (fallbackRes.ok) {
          const fbContentType = fallbackRes.headers.get("content-type") || "audio/wav";
          const fbBuffer = await fallbackRes.arrayBuffer();
          return new NextResponse(fbBuffer, {
            status: 200,
            headers: {
              "Content-Type": fbContentType,
              "Content-Disposition": `attachment; filename="${customFilename}"`,
              "Content-Length": fbBuffer.byteLength.toString(),
              "Accept-Ranges": "bytes",
              "Cache-Control": "public, max-age=31536000, immutable"
            }
          });
        }
      }

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
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch (err: any) {
    console.error("[Audio Download Proxy Error]", err);
    return NextResponse.json({ error: err.message || "Failed to download audio" }, { status: 500 });
  }
}
