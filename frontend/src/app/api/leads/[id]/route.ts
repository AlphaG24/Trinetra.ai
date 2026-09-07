import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify lead ownership or admin authorization
    const adminSupabase = createAdminClient();
    const { data: lead, error: fetchError } = await adminSupabase
      .from("leads")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isOwner = lead.user_id === user.id;
    const isAdmin = profile && ['admin', 'super_admin'].includes(profile.role || '');

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    // Disconnect references in campaign_contacts & callbacks before delete
    await adminSupabase.from("campaign_contacts").update({ lead_id: null }).eq("lead_id", id);
    await adminSupabase.from("callbacks").update({ lead_id: null }).eq("lead_id", id);

    // Delete Lead using Admin Client (bypassing RLS)
    const { data, error } = await adminSupabase
      .from("leads")
      .delete()
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Lead deleted successfully" });
  } catch (error: any) {
    console.error("[Leads DELETE API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as {
      stage?: string;
      status?: string;
    } | null;

    if (!payload) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Determine the new stage
    const newStage = payload.stage || payload.status;
    if (!newStage) {
      return NextResponse.json({ error: "Missing stage or status field" }, { status: 400 });
    }

    const updateData: Record<string, any> = {
      stage: newStage,
      status: newStage,
      updated_at: new Date().toISOString(),
    };

    if (newStage.toLowerCase() === "converted") {
      updateData.converted_at = new Date().toISOString();
    }

    // Verify lead ownership or admin authorization
    const adminSupabase = createAdminClient();
    const { data: lead, error: fetchError } = await adminSupabase
      .from("leads")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isOwner = lead.user_id === user.id;
    const isAdmin = profile && ['admin', 'super_admin'].includes(profile.role || '');

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    // Update Lead using Admin Client (bypassing RLS)
    const { data, error } = await adminSupabase
      .from("leads")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead: data[0] });
  } catch (error: any) {
    console.error("[Leads PATCH API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
