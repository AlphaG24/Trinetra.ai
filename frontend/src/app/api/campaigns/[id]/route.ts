import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { authenticated, profile, error } = await authenticateRequest();
    if (!authenticated || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }
    
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${fastApiUrl}/api/campaigns/${id}`, {
      method: "GET",
      cache: "no-store"
    });
    
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.detail || "Failed to fetch campaign details" }, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { authenticated, profile, error } = await authenticateRequest();
    if (!authenticated || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }
    
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${fastApiUrl}/api/campaigns/${id}`, {
      method: "DELETE"
    });
    
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.detail || "Failed to delete campaign" }, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
