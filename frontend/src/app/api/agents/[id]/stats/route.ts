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

    // 3. Query Calls Today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: callsToday, error: errCallsToday } = await supabase
      .from('voice_calls')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .or(`organization_id.eq.${profile?.organization_id || user.id},user_id.eq.${user.id}`)
      .gte('created_at', todayStart.toISOString());

    // 4. Query Minutes Used This Month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { data: monthCalls, error: errMonthCalls } = await supabase
      .from('voice_calls')
      .select('duration_seconds')
      .eq('agent_id', agentId)
      .or(`organization_id.eq.${profile?.organization_id || user.id},user_id.eq.${user.id}`)
      .gte('created_at', monthStart.toISOString());

    const totalSeconds = monthCalls?.reduce((acc, c) => acc + (c.duration_seconds || 0), 0) || 0;
    const minutesUsed = Math.round(totalSeconds / 60);

    // 5. Query Leads Generated
    const { count: leadsGenerated, error: errLeads } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .eq('user_id', user.id); // Leads are user_id bound in RLS

    // 6. Query Avg Call Duration
    const { data: allCalls, error: errAllCalls } = await supabase
      .from('voice_calls')
      .select('duration_seconds')
      .eq('agent_id', agentId)
      .or(`organization_id.eq.${profile?.organization_id || user.id},user_id.eq.${user.id}`);

    const allSeconds = allCalls?.reduce((acc, c) => acc + (c.duration_seconds || 0), 0) || 0;
    const avgDurationSeconds = allCalls && allCalls.length > 0 ? allSeconds / allCalls.length : 0;
    const avgDuration = (avgDurationSeconds / 60).toFixed(1);

    return NextResponse.json({
      callsToday: callsToday || 0,
      minutesUsed: minutesUsed || 0,
      leadsGenerated: leadsGenerated || 0,
      avgDuration: parseFloat(avgDuration) || 0.0
    });
  } catch (error: any) {
    console.error("[Stats API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
