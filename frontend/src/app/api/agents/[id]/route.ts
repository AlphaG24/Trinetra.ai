import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(
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

    const body = await request.json();

    // 2. Allowed whitelist columns
    const allowedKeys = [
      'name', 'role', 'voice_provider', 'voice_id', 'cloned_voice_id', 'voice_speed', 'voice_pitch',
      'system_prompt', 'temperature', 'max_tokens', 'greeting_message', 'fallback_message', 'ending_message',
      'personality', 'personalities'
    ];

    const updates: Record<string, any> = {};
    for (const key of allowedKeys) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid update parameters provided." }, { status: 400 });
    }

    // Ensure the updated agent belongs to this user
    const { data: updatedAgent, error: updateError } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', agentId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error("[Agent Update API] Error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, agent: updatedAgent });
  } catch (error: any) {
    console.error("[Agent Update API] Catch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: agentId } = await params;
    const supabase = await createClient();

    // 1. Authenticate User (GoTrue / Auth API works fine with cookies)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Initialize Service Role client to bypass RLS/session forwarding bugs
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. Fetch agent first using service role to check ownership
    const { data: agent, error: fetchError } = await adminClient
      .from('agents')
      .select('user_id')
      .eq('id', agentId)
      .maybeSingle();

    if (fetchError) {
      console.error("[Agent Delete API] Fetch error:", fetchError);
      return NextResponse.json({ error: "Failed to verify agent ownership." }, { status: 500 });
    }

    if (!agent) {
      return NextResponse.json({ error: "Agent not found or already deleted." }, { status: 404 });
    }

    // Strict ownership verification
    if (agent.user_id !== user.id) {
      console.warn(`[Agent Delete API] User ${user.id} attempted to delete agent owned by ${agent.user_id}`);
      return NextResponse.json({ error: "Forbidden: You do not own this agent." }, { status: 403 });
    }

    // 4. Perform the hard delete using service role client
    const { error: deleteError } = await adminClient
      .from('agents')
      .delete()
      .eq('id', agentId);

    if (deleteError) {
      console.error("[Agent Delete API] Service Role DELETE Error:", deleteError);
      return NextResponse.json({ 
        error: `Delete failed: ${deleteError.message}. If this persists, verify foreign key cascades.`
      }, { status: 500 });
    }

    console.log(`[Agent Delete API] Agent ${agentId} permanently deleted via service role for user ${user.id}`);
    return NextResponse.json({ success: true, message: "Agent deleted successfully." });
  } catch (error: any) {
    console.error("[Agent Delete API] Catch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

    // 2. Fetch agent with assigned phone numbers
    const { data: agent, error: fetchError } = await supabase
      .from('agents')
      .select(`
        *,
        agent_phone_numbers (
          is_primary,
          phone_numbers (
            phone_number,
            provider
          )
        )
      `)
      .eq('id', agentId)
      .single();

    if (fetchError || !agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const primaryAssigned = agent.agent_phone_numbers?.find((ap: any) => ap.is_primary) || agent.agent_phone_numbers?.[0];
    const assignedPhoneNumber = primaryAssigned?.phone_numbers?.phone_number || agent.phone_number || null;
    const assignedProvider = primaryAssigned?.phone_numbers?.provider || agent.telephony_provider || 'twilio';

    return NextResponse.json({
      success: true,
      data: {
        ...agent,
        phone_number: assignedPhoneNumber,
        telephony_provider: assignedProvider
      }
    });
  } catch (error: any) {
    console.error("[Agent Fetch API] Catch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
