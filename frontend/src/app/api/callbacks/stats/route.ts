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

    const isPrivileged = ['developer_tester', 'admin', 'super_admin'].includes(profile.role || '') ||
      ['raghav00424@gmail.com', 'raghav@trinetra.ai'].includes((profile.email || '').toLowerCase().trim());

    const admin = getAdminClient();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let scheduledQ = admin.from("callbacks").select('*', { count: 'exact', head: true }).eq("status", "scheduled");
    let todayQ = admin.from("callbacks").select('*', { count: 'exact', head: true }).gte("scheduled_at", todayStart.toISOString()).lte("scheduled_at", todayEnd.toISOString());
    let missedQ = admin.from("callbacks").select('*', { count: 'exact', head: true }).eq("status", "missed");
    let completedQ = admin.from("callbacks").select('*', { count: 'exact', head: true }).eq("status", "completed");
    let upcomingQ = admin
      .from("callbacks")
      .select(`
        *,
        agent:agents (
          id,
          name
        )
      `)
      .eq("status", "scheduled")
      .order("scheduled_at", { ascending: true })
      .limit(5);

    if (!isPrivileged && profile.organization_id) {
      scheduledQ = scheduledQ.eq("organization_id", profile.organization_id);
      todayQ = todayQ.eq("organization_id", profile.organization_id);
      missedQ = missedQ.eq("organization_id", profile.organization_id);
      completedQ = completedQ.eq("organization_id", profile.organization_id);
      upcomingQ = upcomingQ.eq("organization_id", profile.organization_id);
    }

    const [
      { count: scheduledCount },
      { count: todayCount },
      { count: missedCount },
      { count: completedCount },
      { data: upcoming }
    ] = await Promise.all([
      scheduledQ,
      todayQ,
      missedQ,
      completedQ,
      upcomingQ
    ]);

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

  } catch (err: any) {
    console.error('[API] Error in GET /api/callbacks/stats:', err);
    return NextResponse.json({
      success: true,
      data: {
        stats: {
          scheduled_count: 0,
          today_count: 0,
          missed_count: 0,
          completed_count: 0,
          upcoming: []
        }
      }
    });
  }
}
