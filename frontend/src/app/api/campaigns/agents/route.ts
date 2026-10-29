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
    if (!authenticated || !profile || !user) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const orgId = profile.organization_id;
    const userId = user.id;
    const admin = getAdminClient();

    const isPrivileged =
      ['developer_tester', 'admin', 'super_admin'].includes(profile.role || '') ||
      ['raghav00424@gmail.com', 'raghav@trinetra.ai'].includes((profile.email || '').toLowerCase().trim());

    // 1. Fetch agents
    let agentsQuery = admin
      .from('agents')
      .select('id, name, status, is_demo, agent_type, phone_number, organization_id, user_id')
      .neq('status', 'deleted')
      .order('created_at', { ascending: false });

    if (!isPrivileged) {
      if (orgId) {
        agentsQuery = agentsQuery.or(`user_id.eq.${userId},organization_id.eq.${orgId}`);
      } else {
        agentsQuery = agentsQuery.eq('user_id', userId);
      }
    }

    const { data: agentsData, error: agentsError } = await agentsQuery;

    if (agentsError) {
      console.error("[GET /api/campaigns/agents] Agents query error:", agentsError);
      return NextResponse.json({ error: agentsError.message }, { status: 500 });
    }

    // 2. Fetch phone numbers mapped to agents
    const agentNumberMap = new Map<string, string>();

    // 2a. Direct agents.phone_number column
    (agentsData || []).forEach((agent: any) => {
      if (agent.phone_number) {
        agentNumberMap.set(agent.id, agent.phone_number);
      }
    });

    // 2b. phone_numbers table assigned_agent_id
    try {
      let pnQuery = admin
        .from('phone_numbers')
        .select('phone_number, assigned_agent_id, status')
        .eq('status', 'active')
        .not('assigned_agent_id', 'is', null);

      if (!isPrivileged && orgId) {
        pnQuery = pnQuery.or(`organization_id.eq.${orgId},organization_id.is.null`);
      }

      const { data: pnData } = await pnQuery;
      (pnData || []).forEach((p: any) => {
        if (p.assigned_agent_id && p.phone_number) {
          agentNumberMap.set(p.assigned_agent_id, p.phone_number);
        }
      });
    } catch (pnErr) {
      console.warn("[GET /api/campaigns/agents] phone_numbers lookup notice:", pnErr);
    }

    // 2c. agent_phone_numbers junction table
    try {
      const { data: apnData } = await admin
        .from('agent_phone_numbers')
        .select('agent_id, phone_numbers(phone_number, status)');

      (apnData || []).forEach((ap: any) => {
        const num = ap.phone_numbers?.phone_number;
        if (ap.agent_id && num) {
          agentNumberMap.set(ap.agent_id, num);
        }
      });
    } catch (apnErr) {
      console.warn("[GET /api/campaigns/agents] agent_phone_numbers lookup notice:", apnErr);
    }

    // 3. Filter for outbound dialer eligibility:
    // - Exclude free demo agents
    // - Must have an assigned phone number (Active Caller ID)
    const eligibleAgents = (agentsData || []).filter((agent: any) => {
      const rawName = agent.name || '';
      const cleanName = rawName.replace(/^\[[^\]]+\]\s*/, '').trim().toLowerCase();
      const isNameDemo = cleanName === 'demo' || cleanName.startsWith('demo');
      const isFreeDemo = agent.is_demo === true || agent.agent_type === 'free_demo' || isNameDemo;
      if (isFreeDemo) return false;

      return agentNumberMap.has(agent.id);
    });

    const mappedAgents = eligibleAgents.map((agent: any) => {
      const rawName = agent.name || '';
      const displayName = rawName
        .replace(/^\[[^\]]+\]\s*/, '')
        .replace(/\s*-\s*Demo\s*$/i, ' (Demo)')
        .replace(/\s*-\s*Trial\s*$/i, ' (Trial)');
      const assignedPhone = agentNumberMap.get(agent.id) || '';

      return {
        id: agent.id,
        name: `${displayName || 'Unnamed Agent'} (${assignedPhone})`,
        status: agent.status,
        phone_number: assignedPhone
      };
    });

    return NextResponse.json({
      success: true,
      agents: mappedAgents
    });
  } catch (err: any) {
    console.error("[GET /api/campaigns/agents] Catch error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
