import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: Request) {
  try {
    const { authenticated, profile, error } = await authenticateRequest();
    if (!authenticated || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const agent_id = searchParams.get("agent_id");
    const priority = searchParams.get("priority");
    const date = searchParams.get("date"); // YYYY-MM-DD

    const isPrivileged = ['developer_tester', 'admin', 'super_admin'].includes(profile.role || '') ||
      ['raghav00424@gmail.com', 'raghav@trinetra.ai'].includes((profile.email || '').toLowerCase().trim());

    const admin = getAdminClient();

    let query = admin
      .from("callbacks")
      .select(`
        *,
        agent:agents (
          id,
          name
        )
      `);

    if (!isPrivileged && profile.organization_id) {
      query = query.eq("organization_id", profile.organization_id);
    }

    if (status && status !== "all" && status !== "All") {
      query = query.eq("status", status.toLowerCase());
    }
    if (agent_id && agent_id !== "all" && agent_id !== "All") {
      query = query.eq("agent_id", agent_id);
    }
    if (priority && priority !== "all" && priority !== "All") {
      query = query.eq("priority", priority.toLowerCase());
    }
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query = query.gte("scheduled_at", startOfDay.toISOString()).lte("scheduled_at", endOfDay.toISOString());
    }

    const { data: callbacks, error: dbError } = await query
      .order("scheduled_at", { ascending: true });

    if (dbError) {
      console.error('[API] Database Error fetching callbacks:', dbError);
      return NextResponse.json({ success: true, data: { callbacks: [] } });
    }

    return NextResponse.json({
      success: true,
      data: {
        callbacks: callbacks || []
      }
    });

  } catch (err: any) {
    console.error('[API] Error in GET /api/callbacks:', err);
    return NextResponse.json({ success: true, data: { callbacks: [] } });
  }
}

export async function POST(request: Request) {
  try {
    const { authenticated, profile, user, error } = await authenticateRequest();
    if (!authenticated || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { agent_id, prospect_name, prospect_phone, scheduled_at, timezone, notes, priority, lead_id, original_call_id } = payload;

    if (!agent_id) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }
    if (!prospect_phone) {
      return NextResponse.json({ error: "Prospect phone is required" }, { status: 400 });
    }
    if (!scheduled_at) {
      return NextResponse.json({ error: "Scheduled time is required" }, { status: 400 });
    }

    const admin = getAdminClient();
    const orgId = profile.organization_id || "b1ddf1e9-abc1-4ff4-90f5-3ac66913738a";

    const { data: newCallback, error: insertError } = await admin
      .from("callbacks")
      .insert({
        organization_id: orgId,
        agent_id,
        prospect_name: prospect_name || "Prospect",
        prospect_phone,
        scheduled_at,
        timezone: timezone || "Asia/Kolkata",
        priority: priority || "medium",
        status: "scheduled",
        notes: notes || null,
        lead_id: lead_id || null,
        original_call_id: original_call_id || null,
        max_attempts: 3,
        attempt_count: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error("[API] Error inserting callback:", insertError);
      return NextResponse.json({ error: "Failed to schedule callback" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: newCallback
    });

  } catch (err: any) {
    console.error("[API] Error in POST /api/callbacks:", err);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
