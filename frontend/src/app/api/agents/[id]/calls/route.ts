import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const supabase = await createClient();

    // 1. Authenticate User
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

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // 3. Query voice_calls WHERE agent_id = requested agent AND (organization_id = user's org OR user_id = user.id)
    const { data: calls, error: queryError } = await supabase
      .from("voice_calls")
      .select("id, created_at, duration_seconds, sentiment, outcome, caller_phone, transcript_text:transcript, status, recording_url")
      .eq("agent_id", agentId)
      .or(`organization_id.eq.${profile?.organization_id || user.id},user_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (queryError) {
      console.error("[Calls API] Query error:", queryError);
      return NextResponse.json({ error: queryError.message }, { status: 550 });
    }

    return NextResponse.json(calls || []);
  } catch (error: any) {
    console.error("[Calls API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
