import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id, contactId } = await params;
    const { authenticated, profile, error } = await authenticateRequest();
    if (!authenticated || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
    const response = await fetch(
      `${fastApiUrl}/api/campaigns/${id}/contacts/${contactId}/retry`,
      { method: "POST" }
    );

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || "Failed to retry contact" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
