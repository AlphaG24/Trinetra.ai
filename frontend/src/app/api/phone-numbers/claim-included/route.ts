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

export async function POST(request: Request) {
  try {
    const { authenticated, user, profile, error } = await authenticateRequest();

    if (!authenticated || !user || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    if (!profile.organization_id) {
      return NextResponse.json({ error: "User has no organization assigned" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.number_id) {
      return NextResponse.json({ error: "Missing number_id" }, { status: 400 });
    }

    const { number_id, agent_id } = body;
    const adminClient = getAdminClient();

    // 1. Check user's current number usage vs allowed plan limit
    const { count: activeCount, error: activeCountErr } = await adminClient
      .from("phone_numbers")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", profile.organization_id)
      .in("status", ["provisioning", "active"]);

    if (activeCountErr) {
      console.error("[Claim Included] Active numbers count error:", activeCountErr);
      return NextResponse.json({ error: "Database error checking limit" }, { status: 500 });
    }

    let baseLimit = 0;
    const tier = (profile.plan_tier || "free").toLowerCase();
    if (tier === "trial") baseLimit = 1;
    else if (tier === "starter") baseLimit = 2;
    else if (tier === "professional") baseLimit = 5;

    const maxLimit = baseLimit + (profile.additional_phone_numbers || 0);

    // If activeCount is already at or above limit and user is not developer_tester, reject free claim
    if (profile.role !== "developer_tester" && activeCount !== null && activeCount >= maxLimit) {
      return NextResponse.json(
        {
          error: `You have already used all ${maxLimit} included number slots in your plan. Please purchase an extra number.`,
          code: "LIMIT_REACHED"
        },
        { status: 403 }
      );
    }

    // 2. Fetch the target phone number from inventory
    const { data: poolNumber, error: poolError } = await adminClient
      .from("phone_numbers")
      .select("*")
      .eq("id", number_id)
      .single();

    if (poolError || !poolNumber) {
      return NextResponse.json({ error: "Selected phone number not found" }, { status: 404 });
    }

    if (poolNumber.is_assigned || poolNumber.organization_id || poolNumber.assigned_org_id) {
      return NextResponse.json(
        { error: "This phone number is already claimed or assigned to another organization" },
        { status: 409 }
      );
    }

    // 3. Claim the number for this user's organization for ₹0 (included in plan)
    const updatePayload: Record<string, any> = {
      is_assigned: true,
      status: "active",
      organization_id: profile.organization_id,
      assigned_org_id: profile.organization_id,
      assigned_at: new Date().toISOString()
    };

    if (agent_id) {
      updatePayload.assigned_agent_id = agent_id;
    }

    const { error: updateErr } = await adminClient
      .from("phone_numbers")
      .update(updatePayload)
      .eq("id", poolNumber.id);

    if (updateErr) {
      console.error("[Claim Included] Update phone_numbers error:", updateErr);
      return NextResponse.json({ error: "Failed to claim phone number" }, { status: 500 });
    }

    // 4. If agent_id provided or user has an active agent, link to agent_phone_numbers
    let targetAgentId = agent_id;
    if (!targetAgentId) {
      const { data: orgAgents } = await adminClient
        .from("agents")
        .select("id")
        .eq("organization_id", profile.organization_id)
        .neq("status", "deleted")
        .limit(1);

      if (orgAgents && orgAgents.length > 0) {
        targetAgentId = orgAgents[0].id;
      }
    }

    if (targetAgentId) {
      try {
        await adminClient.from("agent_phone_numbers").insert({
          agent_id: targetAgentId,
          phone_number_id: poolNumber.id,
          is_primary: true
        });
        await adminClient.from("phone_numbers").update({ assigned_agent_id: targetAgentId }).eq("id", poolNumber.id);
      } catch (linkErr) {
        console.warn("[Claim Included] Error auto-linking to agent:", linkErr);
      }
    }

    // 5. Write activity log
    try {
      await adminClient.from("activity_log").insert({
        user_id: user.id,
        organization_id: profile.organization_id,
        activity_type: "number_provisioned",
        title: "Plan Phone Number Claimed",
        description: `Claimed included line ${poolNumber.phone_number} (${poolNumber.city || "Local"}) at ₹0`
      });
    } catch (actErr) {
      console.warn("[Claim Included] Activity log error:", actErr);
    }

    return NextResponse.json({
      success: true,
      message: "Phone number claimed successfully with your plan",
      data: {
        id: poolNumber.id,
        phone_number: poolNumber.phone_number,
        assigned_agent_id: targetAgentId || null
      }
    });
  } catch (err: any) {
    console.error("[Claim Included] Unexpected error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
