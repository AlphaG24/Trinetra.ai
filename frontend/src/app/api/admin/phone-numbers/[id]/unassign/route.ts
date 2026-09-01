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
    let phoneRowId: string | null = null;
    let isAssigned = false;

    // Look up in phone_numbers table
    let phoneQuery = adminClient.from("phone_numbers").select("*").eq("id", number_id);
    const { data: phoneRow } = await phoneQuery.maybeSingle();

    if (phoneRow) {
      phoneRowId = phoneRow.id;
      if (!targetPhone) targetPhone = phoneRow.phone_number;
      if (!assignedOrgId) assignedOrgId = phoneRow.assigned_org_id || phoneRow.organization_id || null;
      if (!assignedAgentId) assignedAgentId = phoneRow.assigned_agent_id || null;
      isAssigned = phoneRow.is_assigned;
    }

    // Fallback: check agent_phone_numbers junction table if org/agent is missing
    if (phoneRowId && (!assignedOrgId || !assignedAgentId)) {
      const { data: apnRows } = await adminClient
        .from("agent_phone_numbers")
        .select("agent_id, agents(id, organization_id, user_id)")
        .eq("phone_number_id", phoneRowId);

      if (apnRows && apnRows.length > 0) {
        for (const apn of apnRows) {
          if (!assignedAgentId && apn.agent_id) assignedAgentId = apn.agent_id;
          const agentOrg = (apn.agents as any)?.organization_id || (apn.agents as any)?.user_id;
          if (!assignedOrgId && agentOrg) assignedOrgId = agentOrg;
        }
      }
    }

    // Fallback: check agents table by phone_number if still missing
    if (targetPhone && (!assignedOrgId || !assignedAgentId)) {
      const { data: agentByPhone } = await adminClient
        .from("agents")
        .select("id, organization_id, user_id")
        .eq("phone_number", targetPhone)
        .maybeSingle();

      if (agentByPhone) {
        if (!assignedAgentId) assignedAgentId = agentByPhone.id;
        if (!assignedOrgId) assignedOrgId = agentByPhone.organization_id || agentByPhone.user_id || null;
      }
    }

    if (!phoneRowId) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 });
    }

    // "If number is not assigned (is_assigned = false): Return 400: Number is not assigned to any account."
    if (!isAssigned) {
      return NextResponse.json({ error: "Number is not assigned to any account." }, { status: 400 });
    }

    // Clean up / release in phone_numbers table
    await adminClient
      .from("phone_numbers")
      .update({
        is_assigned: false,
        status: "active",
        assigned_org_id: null,
        assigned_agent_id: null,
        organization_id: null,
        renewal_date: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", phoneRowId);

    // b. Update agents table (remove phone number from agent)
    if (assignedAgentId) {
      await adminClient
        .from("agents")
        .update({ phone_number: null, updated_at: new Date().toISOString() })
        .eq("id", assignedAgentId);
    }

    if (targetPhone) {
      await adminClient
        .from("agents")
        .update({ phone_number: null, updated_at: new Date().toISOString() })
        .eq("phone_number", targetPhone);
    }

    // c. Delete from agent_phone_numbers junction table (if exists)
    await adminClient
      .from("agent_phone_numbers")
      .delete()
      .eq("phone_number_id", phoneRowId);

    // d. Remove from campaigns: Find campaigns using this number and remove the number reference
    if (targetPhone) {
      await adminClient
        .from("campaigns")
        .update({ outbound_phone_number: null, updated_at: new Date().toISOString() })
        .eq("outbound_phone_number", targetPhone);
    }

    // Create notification for assigned organization / user
    if (assignedOrgId) {
      const default_message = `We regret to inform you that your phone number ${targetPhone || "assigned line"} has been unassigned by our team. This may happen due to service updates or policy changes. We sincerely apologize for any inconvenience. If you have questions, please contact our support team.`;
      
      const notificationMessage = custom_message?.trim() || default_message;

      // Find user profiles matching organization_id OR user profile id
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id")
        .or(`organization_id.eq.${assignedOrgId},id.eq.${assignedOrgId}`);

      if (profiles && profiles.length > 0) {
        const notificationRows = profiles.map((p) => ({
          user_id: p.id,
          title: "Phone Number Unassigned",
          message: notificationMessage,
          type: "number_unassigned", // Specifically requested type
          is_read: false
        }));

        const { error: notifErr } = await adminClient.from("notifications").insert(notificationRows);
        if (notifErr) {
          console.error("[Admin Unassign] Notification insert error:", notifErr);
        } else {
          console.log(`[Admin Unassign] Sent unassign notification to ${notificationRows.length} user(s).`);
        }
      } else {
        console.warn(`[Admin Unassign] Warning: No profile found for assignedOrgId ${assignedOrgId}`);
      }
    }

    // Log to audit
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      organization_id: assignedOrgId, // Adding org_id so it belongs to the org timeline if needed
      action: "number_unassigned",
      resource_type: "phone_number",
      resource_id: phoneRowId,
      new_values: {
        phone_number: targetPhone,
        previous_org_id: assignedOrgId,
        custom_message: custom_message || null
      }
    });

    // Also keep activity log for backward compatibility if needed, but per instruction audit_logs is required.
    
    return NextResponse.json({
      success: true,
      message: `Phone number ${targetPhone || ""} unassigned and agent access terminated successfully.`
    });

  } catch (err: any) {
    console.error("[Admin Unassign Number] POST Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
