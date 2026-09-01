import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: number_id } = await params;
    const { authenticated, user, profile } = await authenticateRequest();

    if (!authenticated || !user || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "admin" && profile.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: Admin role required" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { custom_message } = body;

    const adminClient = getAdminClient();

    let targetPhone = "";
    let assignedOrgId: string | null = null;
    let poolRowId: string | null = null;
    let phoneRowId: string | null = null;

    // 1. Look up target number in phone_number_pool
    const { data: poolRow } = await adminClient
      .from("phone_number_pool")
      .select("*")
      .eq("id", number_id)
      .maybeSingle();

    if (poolRow) {
      poolRowId = poolRow.id;
      targetPhone = poolRow.phone_number;
      assignedOrgId = poolRow.assigned_organization_id || poolRow.assigned_org_id || null;
    }

    // 2. Look up target number in phone_numbers
    const { data: phoneRow } = await adminClient
      .from("phone_numbers")
      .select("*")
      .or(`id.eq.${number_id},phone_number.eq.${targetPhone || number_id}`)
      .maybeSingle();

    if (phoneRow) {
      phoneRowId = phoneRow.id;
      if (!targetPhone) targetPhone = phoneRow.phone_number;
      if (!assignedOrgId) assignedOrgId = phoneRow.assigned_org_id || phoneRow.organization_id || null;
    }

    if (!poolRowId && !phoneRowId) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 });
    }

    // 3. Mark number as available / unassigned in phone_number_pool
    if (poolRowId || targetPhone) {
      await adminClient
        .from("phone_number_pool")
        .update({
          status: "available",
          is_assigned: false,
          assigned_organization_id: null,
          assigned_org_id: null,
          assigned_agent_id: null,
          renewal_date: null,
          updated_at: new Date().toISOString()
        })
        .or(`id.eq.${poolRowId || number_id},phone_number.eq.${targetPhone}`);
    }

    // 4. Update or clean up phone_numbers table
    if (phoneRowId || targetPhone) {
      await adminClient
        .from("phone_numbers")
        .update({
          is_assigned: false,
          status: "released",
          assigned_org_id: null,
          assigned_agent_id: null,
          organization_id: null,
          updated_at: new Date().toISOString()
        })
        .or(`id.eq.${phoneRowId || number_id},phone_number.eq.${targetPhone}`);
    }

    // 5. Remove any agent_phone_numbers mapping
    if (phoneRowId) {
      await adminClient
        .from("agent_phone_numbers")
        .delete()
        .eq("phone_number_id", phoneRowId);
    }

    // 6. Create notification for assigned organization users
    if (assignedOrgId) {
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id")
        .eq("organization_id", assignedOrgId);

      const notificationMessage = custom_message?.trim() || 
        `We regret to inform you that your phone number ${targetPhone || "assigned line"} has been unassigned by our team. This may happen due to service updates or policy changes. We sincerely apologize for any inconvenience. If you have questions, please contact our support team.`;

      if (profiles && profiles.length > 0) {
        const notificationRows = profiles.map((p) => ({
          user_id: p.id,
          organization_id: assignedOrgId,
          title: "Phone Number Unassigned",
          message: notificationMessage,
          type: "warning",
          is_read: false
        }));

        const { error: notifErr } = await adminClient
          .from("notifications")
          .insert(notificationRows);

        if (notifErr) {
          console.error("[Admin Unassign Number] Notification insert error:", notifErr);
        }
      }

      // Log activity
      await adminClient.from("activity_log").insert({
        user_id: user.id,
        organization_id: assignedOrgId,
        activity_type: "number_unassigned",
        title: "Phone Number Unassigned by Admin",
        description: `Unassigned ${targetPhone} from organization`
      });
    }

    return NextResponse.json({
      success: true,
      message: `Phone number ${targetPhone} unassigned and returned to pool successfully.`
    });

  } catch (err: any) {
    console.error("[Admin Unassign Number] POST Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
