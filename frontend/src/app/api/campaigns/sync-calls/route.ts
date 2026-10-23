import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

export async function POST() {
  try {
    const { authenticated, user, profile, error } = await authenticateRequest();
    if (!authenticated || !user || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const backendUrl = 
      process.env.INTERNAL_BACKEND_URL || 
      process.env.NEXT_PUBLIC_API_URL || 
      process.env.NEXT_PUBLIC_BACKEND_URL || 
      (process.env.NODE_ENV === "production" ? "https://trinetra-ai-1-6f2n.onrender.com" : "http://localhost:8000");

    const res = await fetch(`${backendUrl}/api/campaigns/sync-calls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail || data.error || "Failed to sync calls" },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("[POST /api/campaigns/sync-calls] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
