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

    let targetPhone: string | null = null;
    let assignedOrgId: string | null = null;
    let assignedAgentId: string | null = null;
    let poolRowId: string | null = null;
    let phoneRowId: string | null = null;

    // 1. Look up in phone_number_pool
    const { data: poolRow } = await adminClient
      .from("phone_number_pool")
      .select("*")
      .eq("id", number_id)
      .maybeSingle();

    if (poolRow) {
      poolRowId = poolRow.id;
      targetPhone = poolRow.phone_number;
      assignedOrgId = poolRow.assigned_organization_id || poolRow.assigned_org_id || null;
      assignedAgentId = poolRow.assigned_agent_id || null;
    }

    // 2. Look up in phone_numbers table
    let phoneQuery = adminClient.from("phone_numbers").select("*");
    if (poolRowId) {
      phoneQuery = phoneQuery.or(`id.eq.${number_id},phone_number.eq.${targetPhone}`);
    } else {
      phoneQuery = phoneQuery.eq("id", number_id);
    }
    const { data: phoneRow } = await phoneQuery.maybeSingle();

    if (phoneRow) {
      phoneRowId = phoneRow.id;
      if (!targetPhone) targetPhone = phoneRow.phone_number;
      if (!assignedOrgId) assignedOrgId = phoneRow.assigned_org_id || phoneRow.organization_id || null;
      if (!assignedAgentId) assignedAgentId = phoneRow.assigned_agent_id || null;
    }

    // If still not found by ID, attempt lookup by phone_number if parameter is a phone string
    if (!poolRowId && !phoneRowId) {
      const { data: fallbackPool } = await adminClient
        .from("phone_number_pool")
        .select("*")
        .eq("phone_number", number_id)
        .maybeSingle();

      if (fallbackPool) {
        poolRowId = fallbackPool.id;
        targetPhone = fallbackPool.phone_number;
        assignedOrgId = fallbackPool.assigned_organization_id || fallbackPool.assigned_org_id || null;
        assignedAgentId = fallbackPool.assigned_agent_id || null;
      }
    }

    if (!poolRowId && !phoneRowId && !targetPhone) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 });
    }

    // 3. Mark number as AVAILABLE / UNASSIGNED in phone_number_pool
    if (poolRowId) {
      const { error: poolErr } = await adminClient
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
        .eq("id", poolRowId);

      if (poolErr) {
        console.error("[Admin Unassign] Error updating phone_number_pool:", poolErr);
      }
    } else if (targetPhone) {
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
        .eq("phone_number", targetPhone);
    }

    // 4. Clean up / release in phone_numbers table
    if (phoneRowId) {
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
        .eq("id", phoneRowId);
    } else if (targetPhone) {
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
        .eq("phone_number", targetPhone);
    }

    // 5. Delete agent mapping records in agent_phone_numbers table
    if (phoneRowId) {
      await adminClient
        .from("agent_phone_numbers")
        .delete()
        .eq("phone_number_id", phoneRowId);
    }

    // 6. TERMINATE AGENT ACCESS: Unassign number from agents table to prohibit active agent usage
    if (targetPhone) {
      await adminClient
        .from("agents")
        .update({
          phone_number: null,
          telephony_provider: null,
          updated_at: new Date().toISOString()
        })
        .eq("phone_number", targetPhone);
    }

    if (assignedAgentId) {
      await adminClient
        .from("agents")
        .update({
          phone_number: null,
          telephony_provider: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", assignedAgentId);
    }

    // 7. Create notification for assigned organization users
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

        await adminClient.from("notifications").insert(notificationRows);
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
      message: `Phone number ${targetPhone || ""} unassigned and agent access terminated successfully.`
    });

  } catch (err: any) {
    console.error("[Admin Unassign Number] POST Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
