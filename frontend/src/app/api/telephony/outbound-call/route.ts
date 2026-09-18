import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const { authenticated, profile, error } = await authenticateRequest();
    if (!authenticated || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { to_phone, agent_id, organization_id, from_phone } = body;

    if (!to_phone || !agent_id) {
      return NextResponse.json(
        { error: "to_phone and agent_id are required" },
        { status: 400 }
      );
    }

    const orgId = organization_id || profile.organization_id || profile.id;

    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://127.0.0.1:8000";
    const response = await fetch(`${fastApiUrl}/api/telephony/outbound-call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to_phone,
        from_phone: from_phone || null,
        agent_id,
        organization_id: orgId,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.detail || "Failed to trigger outbound call" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Outbound call error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
