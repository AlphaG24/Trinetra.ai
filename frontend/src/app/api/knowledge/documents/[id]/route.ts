import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: docId } = await params;
    const supabase = await createClient();

    // 1. Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch document & profile to verify org access
    const { data: doc } = await supabase
      .from("agent_knowledge")
      .select("id, user_id, agent_id")
      .eq("id", docId)
      .maybeSingle();

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, role")
      .eq("id", user.id)
      .maybeSingle();

    const { data: agent } = await supabase
      .from("agents")
      .select("organization_id, user_id")
      .eq("id", doc.agent_id)
      .maybeSingle();

    const isOwner = doc.user_id === user.id;
    const isSameOrg = profile?.organization_id && agent?.organization_id === profile.organization_id;
    const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

    if (!isOwner && !isSameOrg && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Delete document
    const { error: deleteError } = await supabase
      .from("agent_knowledge")
      .delete()
      .eq("id", docId);

    if (deleteError) {
      console.error("[Knowledge Delete] Error:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Document deleted successfully." });
  } catch (error: any) {
    console.error("[Knowledge Delete] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
