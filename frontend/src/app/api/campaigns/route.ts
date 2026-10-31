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
    const { authenticated, profile, user, error } = await authenticateRequest();
    if (!authenticated) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const admin = getAdminClient();
    const userEmail = (user?.email || profile?.email || "").toLowerCase().trim();
    const userRole = (profile?.role || user?.app_metadata?.role || user?.user_metadata?.role || "").toLowerCase().trim();

    // Privileged users (Raghav, super_admins, admins, developers) see all campaigns
    const isPrivileged =
      ['developer_tester', 'admin', 'super_admin'].includes(userRole) ||
      userEmail.includes("raghav") ||
      userEmail.includes("admin") ||
      userEmail.includes("trinetra");

    let orgId = profile?.organization_id;
    const userId = profile?.id || user?.id;

    if (!orgId && userId) {
      try {
        const { data: member } = await admin
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();
        if (member?.organization_id) {
          orgId = member.organization_id;
        }
      } catch {}
    }

    try {
      let query = admin
        .from("campaigns")
        .select(`
          *,
          agents (
            name,
            phone_number,
            telephony_provider
          )
        `)
        .order("created_at", { ascending: false });

      if (!isPrivileged) {
        if (orgId) {
          query = query.or(`organization_id.eq.${orgId},organization_id.eq.${userId}`);
        } else if (userId) {
          query = query.eq("organization_id", userId);
        }
      }

      const { data: dbCampaigns, error: dbError } = await query;

      if (!dbError && dbCampaigns && dbCampaigns.length > 0) {
        return NextResponse.json({
          success: true,
          data: dbCampaigns
        });
      }
    } catch (queryErr) {
      console.warn("[GET /api/campaigns] Direct relation query exception:", queryErr);
    }

    // Resilient fallback query: select all columns without strict joins
    try {
      let simpleQuery = admin
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (!isPrivileged) {
        if (orgId) {
          simpleQuery = simpleQuery.or(`organization_id.eq.${orgId},organization_id.eq.${userId}`);
        } else if (userId) {
          simpleQuery = simpleQuery.eq("organization_id", userId);
        }
      }

      const { data: simpleCampaigns, error: simpleErr } = await simpleQuery;

      if (!simpleErr && simpleCampaigns && simpleCampaigns.length > 0) {
        // Hydrate agent names
        const agentIds = Array.from(new Set(simpleCampaigns.map((c: any) => c.agent_id).filter(Boolean)));
        let agentMap: Record<string, any> = {};
        if (agentIds.length > 0) {
          const { data: agentRows } = await admin
            .from("agents")
            .select("id, name, phone_number, telephony_provider")
            .in("id", agentIds);
          if (agentRows) {
            agentRows.forEach((a: any) => {
              agentMap[a.id] = a;
            });
          }
        }

        const enriched = simpleCampaigns.map((c: any) => ({
          ...c,
          agents: agentMap[c.agent_id] || { name: "Shubh" }
        }));

        return NextResponse.json({
          success: true,
          data: enriched
        });
      }

      // If still empty and user is privileged, return all existing campaigns
      if (isPrivileged) {
        const { data: allCampaigns } = await admin
          .from("campaigns")
          .select("*")
          .order("created_at", { ascending: false });

        return NextResponse.json({
          success: true,
          data: allCampaigns || []
        });
      }

      return NextResponse.json({
        success: true,
        data: simpleCampaigns || []
      });
    } catch (fallbackErr) {
      console.error("[GET /api/campaigns] Fallback query error:", fallbackErr);
      return NextResponse.json({ success: true, data: [] });
    }
  } catch (err: any) {
    console.error("[GET /api/campaigns] Top-level handler error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
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

    const admin = getAdminClient();
    const orgId = profile.organization_id || "b1ddf1e9-abc1-4ff4-90f5-3ac66913738a";

    const insertData: any = {
      name: payload.name || "Untitled Campaign",
      organization_id: orgId,
      agent_id: payload.agent_id,
      calling_hours_start: payload.calling_hours_start || "10:00:00",
      calling_hours_end: payload.calling_hours_end || "18:00:00",
      timezone: payload.timezone || "Asia/Kolkata",
      status: "ready",
      total_contacts: payload.total_contacts || 0,
      contacts_called: 0,
      contacts_connected: 0,
      leads_generated: 0
    };

    const { data: newCampaign, error: insertError } = await admin
      .from("campaigns")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("[POST /api/campaigns] Insert error:", insertError);
      return NextResponse.json({ error: insertError.message || "Failed to create campaign" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: newCampaign
    });
  } catch (err: any) {
    console.error("[POST /api/campaigns] Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
