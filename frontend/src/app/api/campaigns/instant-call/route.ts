import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const { authenticated, user, profile, error } = await authenticateRequest();
    if (!authenticated || !user || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, phone, agent_id, notes } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone number are required" }, { status: 400 });
    }

    const backendUrl = 
      process.env.INTERNAL_BACKEND_URL || 
      process.env.NEXT_PUBLIC_API_URL || 
      process.env.NEXT_PUBLIC_BACKEND_URL || 
      (process.env.NODE_ENV === "production" ? "https://trinetra-ai-1-6f2n.onrender.com" : "http://localhost:8000");

    const payload = {
      name,
      phone,
      agent_id: agent_id || undefined,
      organization_id: profile.organization_id || undefined,
      notes: notes || "Direct Live Dial"
    };

    const res = await fetch(`${backendUrl}/api/campaigns/instant-call`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || "Failed to trigger instant call via backend" },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[POST /api/campaigns/instant-call] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
