import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const localUrl = (process.env.NEXT_PUBLIC_FASTAPI_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
    const fallbackProdUrl = 'https://trinetra-ai-3d0a.onrender.com'
    
    let response: Response
    try {
      response = await fetch(`${localUrl}/api/voice/tts-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(4000),
      })
    } catch {
      // Fallback to production backend
      response = await fetch(`${fallbackProdUrl}/api/voice/tts-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }
    
    if (!response.ok) {
      let errorMsg = `TTS preview failed (${response.status})`
      try {
        const errorData = await response.json()
        errorMsg = errorData.detail || errorData.error || errorMsg
      } catch {
        const errorText = await response.text()
        if (errorText) errorMsg = errorText
      }
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }
    
    const audioBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(audioBuffer).toString('base64')
    // Ensure we handle the content type dynamically, backend might return mp3 or wav
    const contentType = response.headers.get('content-type') || 'audio/wav'
    const audioUrl = `data:${contentType};base64,${base64}`
    
    return NextResponse.json({ success: true, audioUrl, message: 'TTS preview ready' })
  } catch (error: any) {
    console.error("TTS Test Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
