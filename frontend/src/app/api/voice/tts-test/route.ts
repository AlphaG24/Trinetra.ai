import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const backendUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000'
    
    const response = await fetch(`${backendUrl}/api/voice/tts-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    
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
