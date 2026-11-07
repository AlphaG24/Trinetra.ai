import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const supabase = await createClient();

    // 1. Authenticate User (SEC-003, SEC-006)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch User Profile to get organization_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    // 3. Query Recent Voice Calls for this agent scoped to user/org
    const orgId = profile?.organization_id || user.id;
    const { data: calls, error: callsError } = await supabase
      .from("voice_calls")
      .select("id, duration_seconds, sentiment, transcript, recording_url, created_at, caller_name, caller_phone, status, outcome")
      .eq("agent_id", agentId)
      .or(`organization_id.eq.${orgId},user_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(30);

    if (callsError) {
      console.error("[api/agents/[id]/calls] Query error:", callsError.message);
      return NextResponse.json({ error: "Failed to fetch call logs" }, { status: 500 });
    }

    return NextResponse.json(calls || []);
  } catch (err: any) {
    console.error("[api/agents/[id]/calls] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
