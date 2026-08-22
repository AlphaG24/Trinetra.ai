import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const { authenticated, profile, error, supabase } = await authenticateRequest();
    if (!authenticated) {
      return NextResponse.json({ error }, { status: 401 });
    }
    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const agent_id = searchParams.get("agent_id");
    const priority = searchParams.get("priority");
    const date = searchParams.get("date"); // YYYY-MM-DD

    let query = supabase
      .from("callbacks")
      .select(`
        *,
        agent:agents (
          id,
          name
        ),
        lead:leads (
          id,
          full_name
        )
      `)
      .eq("organization_id", profile.organization_id);

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
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        callbacks: callbacks || []
      }
    });

  } catch (err) {
    console.error('[API] Error in GET /api/callbacks:', err);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { authenticated, profile, user, error, supabase } = await authenticateRequest();
    if (!authenticated) {
      return NextResponse.json({ error }, { status: 401 });
    }
    if (!profile?.organization_id) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { agent_id, prospect_name, prospect_phone, scheduled_at, notes, priority, lead_id, original_call_id } = payload;

    if (!agent_id) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }
    if (!prospect_phone) {
      return NextResponse.json({ error: "Prospect phone is required" }, { status: 400 });
    }
    if (!scheduled_at) {
      return NextResponse.json({ error: "Scheduled time is required" }, { status: 400 });
    }

    // Validate: agent_id belongs to organization
    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, name")
      .eq("id", agent_id)
      .eq("organization_id", profile.organization_id)
      .maybeSingle();

    if (agentError || !agent) {
      return NextResponse.json({ error: "Agent not found or unauthorized" }, { status: 400 });
    }

    // Validate: scheduled_at is in the future
    if (new Date(scheduled_at) <= new Date()) {
      return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
    }

    // Insert callback
    const { data: callback, error: insertError } = await supabase
      .from("callbacks")
      .insert({
        organization_id: profile.organization_id,
        agent_id,
        lead_id: lead_id || null,
        original_call_id: original_call_id || null,
        prospect_name: prospect_name || "Unknown",
        prospect_phone,
        scheduled_at,
        notes: notes || "",
        priority: (priority || "normal").toLowerCase(),
        status: "scheduled"
      })
      .select()
      .single();

    if (insertError) {
      console.error('[API] Database Error scheduling callback:', insertError);
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }

    // Write to activity log
    await supabase.from("activity_log").insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      activity_type: "callback_scheduled",
      title: "Callback Scheduled",
      description: `Callback scheduled for ${prospect_phone} with agent ${agent.name} at ${new Date(scheduled_at).toLocaleString()}`
    });

    return NextResponse.json({
      success: true,
      data: {
        callback
      }
    }, { status: 201 });

  } catch (err) {
    console.error('[API] Error in POST /api/callbacks:', err);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
