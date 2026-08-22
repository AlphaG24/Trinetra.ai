import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const backendUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
  
  const response = await fetch(`${backendUrl}/api/agents/enhance-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[Enhance Prompt] Backend error:", errText);
    return NextResponse.json({ error: "Failed to enhance prompt" }, { status: 500 });
  }

  const data = await response.json();
  return NextResponse.json(data);
}
