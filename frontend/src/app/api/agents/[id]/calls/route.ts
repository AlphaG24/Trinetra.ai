import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
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

    const isPrivileged = ['developer_tester', 'admin', 'super_admin'].includes(profile?.role || '');

    // 3. Verify agent belongs to user or user's organization (or user is privileged)
    const admin = createAdminClient();
    const { data: agentRecord } = await admin
      .from("agents")
      .select("id, organization_id, user_id")
      .eq("id", agentId)
      .maybeSingle();

    if (!isPrivileged && agentRecord && agentRecord.organization_id !== profile.organization_id && agentRecord.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized access to agent calls" }, { status: 403 });
    }

    // 4. Query voice_calls WHERE agent_id = requested agent
    const { data: calls, error: queryError } = await admin
      .from("voice_calls")
      .select("id, created_at, duration_seconds, sentiment, outcome, caller_phone, caller_name, transcript, status, recording_url")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (queryError) {
      console.error("[Calls API] Query error:", queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    return NextResponse.json(calls || []);
  } catch (error: any) {
    console.error("[Calls API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
