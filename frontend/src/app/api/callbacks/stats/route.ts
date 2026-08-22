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

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      { count: scheduledCount, error: scheduledErr },
      { count: todayCount, error: todayErr },
      { count: missedCount, error: missedErr },
      { count: completedCount, error: completedErr },
      { data: upcoming, error: upcomingErr }
    ] = await Promise.all([
      supabase
        .from("callbacks")
        .select('*', { count: 'exact', head: true })
        .eq("organization_id", profile.organization_id)
        .eq("status", "scheduled"),
      supabase
        .from("callbacks")
        .select('*', { count: 'exact', head: true })
        .eq("organization_id", profile.organization_id)
        .gte("scheduled_at", todayStart.toISOString())
        .lte("scheduled_at", todayEnd.toISOString()),
      supabase
        .from("callbacks")
        .select('*', { count: 'exact', head: true })
        .eq("organization_id", profile.organization_id)
        .eq("status", "missed"),
      supabase
        .from("callbacks")
        .select('*', { count: 'exact', head: true })
        .eq("organization_id", profile.organization_id)
        .eq("status", "completed"),
      supabase
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
        .eq("organization_id", profile.organization_id)
        .eq("status", "scheduled")
        .order("scheduled_at", { ascending: true })
        .limit(5)
    ]);

    if (scheduledErr || todayErr || missedErr || completedErr || upcomingErr) {
      console.error('[API] Error fetching callback stats:', { scheduledErr, todayErr, missedErr, completedErr, upcomingErr });
      return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          scheduled_count: scheduledCount || 0,
          today_count: todayCount || 0,
          missed_count: missedCount || 0,
          completed_count: completedCount || 0,
          upcoming: upcoming || []
        }
      }
    });

  } catch (err) {
    console.error('[API] Error in GET /api/callbacks/stats:', err);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
