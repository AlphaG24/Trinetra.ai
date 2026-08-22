import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Proxy to FastAPI backend which has all API keys
    const backendUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${backendUrl}/api/knowledge/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[Knowledge Q&A] Backend error:", errText);
      return NextResponse.json({ error: "Failed to generate answer" }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("[Knowledge Q&A] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}