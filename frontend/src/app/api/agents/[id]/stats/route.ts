import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

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

    // 2. Fetch User Profile to get organization_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // 3. Query Calls Today — use IST midnight (UTC+5:30) for Indian users
    // Server runs in UTC; IST midnight = 18:30 UTC previous day
    const nowUtc = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000; // +5:30
    const nowIst = new Date(nowUtc.getTime() + istOffsetMs);
    const todayStart = new Date(
      Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate()) - istOffsetMs
    );

    const { count: callsToday, error: errCallsToday } = await supabase
      .from('voice_calls')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .or(`organization_id.eq.${profile?.organization_id || user.id},user_id.eq.${user.id}`)
      .gte('created_at', todayStart.toISOString());

    // 4. Query Avg Call Duration and total duration for this specific agent
    const { data: allCalls, error: errAllCalls } = await supabase
      .from('voice_calls')
      .select('duration_seconds')
      .eq('agent_id', agentId)
      .or(`organization_id.eq.${profile?.organization_id || user.id},user_id.eq.${user.id}`);

    const allSeconds = allCalls?.reduce((acc, c) => acc + (c.duration_seconds || 0), 0) || 0;
    const avgDurationSeconds = allCalls && allCalls.length > 0 ? allSeconds / allCalls.length : 0;
    const avgDuration = (avgDurationSeconds / 60).toFixed(1);
    const agentCallMinutes = Math.ceil(allSeconds / 60);

    const { data: agentData } = await supabase
      .from('agents')
      .select('minutes_used, user_id, is_demo')
      .eq('id', agentId)
      .maybeSingle();

    // Use agent-specific call logs minutes or recorded agent minutes (do not mix with other agents)
    const minutesUsed = agentCallMinutes > 0 ? agentCallMinutes : (agentData?.minutes_used || 0);

    // 5. Query Leads Generated
    const { count: leadsGenerated, error: errLeads } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('user_id', user.id); // Leads are user_id bound in RLS

    // 6. Query organization wallet for claimed emergency minutes buffer
    const { data: walletData } = await supabase
      .from('wallets')
      .select('emergency_minutes_available')
      .eq('organization_id', profile.organization_id)
      .maybeSingle();

    const emergencyMinutes = walletData?.emergency_minutes_available || 0;

    return NextResponse.json({
      callsToday: callsToday || 0,
      minutesUsed: minutesUsed || 0,
      leadsGenerated: leadsGenerated || 0,
      avgDuration: parseFloat(avgDuration) || 0.0,
      emergencyMinutes: emergencyMinutes
    });
  } catch (error: any) {
    console.error("[Stats API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
