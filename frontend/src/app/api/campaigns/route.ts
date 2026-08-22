import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const { authenticated, profile, error } = await authenticateRequest();
    if (!authenticated || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (!profile.organization_id || profile.organization_id === "null" || profile.organization_id === "undefined") {
      return NextResponse.json({ success: true, data: [] });
    }
    
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(`${fastApiUrl}/api/campaigns?organization_id=${profile.organization_id}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal
      });
      
      const data = await response.json();
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return NextResponse.json({ error: data.detail || "Failed to list campaigns" }, { status: response.status });
      }
      
      return NextResponse.json(data);
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      console.error("[GET /api/campaigns] FastAPI fetch failed:", fetchErr);
      return NextResponse.json({ error: "Backend server is offline or unreachable" }, { status: 503 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { authenticated, profile, error, supabase } = await authenticateRequest();
    if (!authenticated || !profile || !supabase) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }
    
    // Check if free user is attempting to create
    if (profile.plan_tier === "free" || profile.plan_tier === "free_demo") {
      return NextResponse.json({ error: "Feature locked. Please upgrade to a paid plan." }, { status: 403 });
    }

    const formData = await request.formData();
    const name = formData.get("name");
    const agentId = formData.get("agentId");
    const file = formData.get("file") as File;
    
    if (!name || !agentId || !file) {
      return NextResponse.json({ error: "Missing required fields (name, agentId, file)" }, { status: 400 });
    }

    // Validate that agent is not a free demo agent
    const { data: agent } = await supabase
      .from('agents')
      .select('id, name, is_demo, agent_type')
      .eq('id', agentId as string)
      .single();

    if (agent) {
      const rawName = agent.name || '';
      const cleanName = rawName.replace(/^\[[^\]]+\]\s*/, '').trim().toLowerCase();
      const isNameDemo = cleanName === 'demo' || cleanName.startsWith('demo');
      if (agent.is_demo === true || agent.agent_type === 'free_demo' || isNameDemo) {
        return NextResponse.json({ error: "Free demo agents cannot be used in campaigns. Only paid or premium demo agents are allowed." }, { status: 400 });
      }
    }

    // Re-pack for forwarding to FastAPI
    const forwardData = new FormData();
    forwardData.append("name", name as string);
    forwardData.append("agent_id", agentId as string);
    forwardData.append("organization_id", profile.organization_id);
    
    const startHours = formData.get("calling_hours_start");
    const endHours = formData.get("calling_hours_end");
    const tz = formData.get("timezone");
    const sched = formData.get("scheduled_start");
    
    if (startHours) forwardData.append("calling_hours_start", startHours as string);
    if (endHours) forwardData.append("calling_hours_end", endHours as string);
    if (tz) forwardData.append("timezone", tz as string);
    if (sched) forwardData.append("scheduled_start", sched as string);
    
    forwardData.append("file", file, file.name);

    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${fastApiUrl}/api/campaigns`, {
      method: "POST",
      body: forwardData
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.detail || "Failed to create campaign" }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
