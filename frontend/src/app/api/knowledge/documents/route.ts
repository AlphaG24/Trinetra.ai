import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agent_id");

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    // 1. Resolve user's organization to ensure tenant isolation
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .maybeSingle();

    const userOrgId = profile?.organization_id;

    // 2. Verify agent belongs to user or user's organization
    const { data: agent } = await supabase
      .from("agents")
      .select("id, user_id, organization_id")
      .eq("id", agentId)
      .maybeSingle();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const hasAccess = 
      agent.user_id === user.id || 
      (userOrgId && agent.organization_id === userOrgId) || 
      profile?.role === "admin" || 
      profile?.role === "super_admin";

    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Fetch knowledge documents for this agent (using server-side client with org verification)
    const { data: docs, error: docsError } = await supabase
      .from("agent_knowledge")
      .select("id, name, status, created_at, file_url")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });

    if (docsError) {
      console.error("[Knowledge Documents] Query error:", docsError);
      return NextResponse.json({ error: docsError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, documents: docs || [] });
  } catch (error: any) {
    console.error("[Knowledge Documents] Fatal Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
