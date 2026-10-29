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

    // 2. Fetch User Profile to get organization_id and role
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Strict isolation: Shubhansh agent (dd4da4c1-9deb-4047-8927-5e12402e6b1f) is strictly locked to Nexus account
    const SHUBH_AGENT_ID = "dd4da4c1-9deb-4047-8927-5e12402e6b1f";
    const NEXUS_ORG_ID = "b1ddf1e9-abc1-4ff4-90f5-3ac66913738a";
    const NEXUS_OWNER_ID = "9363a829-8d11-42ae-bfff-d8ea5c17a71b";
    const NEXUS_EMAIL = "nexus.ai.ops@gmail.com";

    const userEmail = (user.email || '').toLowerCase().trim();
    const isNexusUser = user.id === NEXUS_OWNER_ID || userEmail === NEXUS_EMAIL || profile.organization_id === NEXUS_ORG_ID;

    if (agentId === SHUBH_AGENT_ID && !isNexusUser) {
      return NextResponse.json({ error: "Unauthorized access: Agent details are restricted exclusively to the Nexus owner account." }, { status: 403 });
    }

    // 3. Verify agent belongs strictly to the user or user's organization
    const admin = createAdminClient();
    const { data: agentRecord } = await admin
      .from("agents")
      .select("id, organization_id, user_id")
      .eq("id", agentId)
      .maybeSingle();

    if (!agentRecord) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const hasAccess = agentRecord.user_id === user.id || (profile.organization_id && agentRecord.organization_id === profile.organization_id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Unauthorized access: Agent details are restricted to the creator account." }, { status: 403 });
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
