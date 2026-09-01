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

export async function GET(request: Request) {
    try {
        const { authenticated, user, profile, error } = await authenticateRequest();
        
        if (!authenticated || !user || !profile) {
            return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
        }
        
        const orgId = profile.organization_id || user.id;
        const userId = user.id;
        const adminClient = getAdminClient();

        // 1. Fetch assigned pool numbers for this organization or user
        const { data: poolAssigned, error: poolError } = await adminClient
            .from("phone_number_pool")
            .select(`
                *,
                assigned_agent:agents(id, name)
            `)
            .or(`assigned_organization_id.eq.${orgId},assigned_organization_id.eq.${userId},assigned_org_id.eq.${orgId},assigned_org_id.eq.${userId}`);

        if (poolError) {
            console.error('[API] Database Error in phone_number_pool:', poolError);
        }

        // Filter to only those that are assigned
        const activePoolAssigned = (poolAssigned || []).filter(
            p => p.status?.toLowerCase() === "assigned" || p.is_assigned === true
        );

        const numberMap = new Map<string, any>();

        // Add pool numbers assigned to this user/organization
        activePoolAssigned.forEach((poolNum: any) => {
            const rawPhone = poolNum.phone_number || "";
            const cleanKey = rawPhone.replace(/[\s\-\(\)]/g, "");

            const assignedAgentList = poolNum.assigned_agent ? [{
                agent_id: poolNum.assigned_agent.id,
                agent_name: poolNum.assigned_agent.name,
                is_primary: true
            }] : [];

            numberMap.set(cleanKey, {
                id: poolNum.id,
                phone_number: poolNum.phone_number,
                city: poolNum.city || "India",
                did_type: poolNum.did_type || "mobile",
                provider: poolNum.provider || "voicelink",
                status: "active",
                retail_price_paisa: poolNum.retail_price_paisa || 29900,
                renewal_date: poolNum.renewal_date,
                assigned_org_id: orgId,
                organization_id: orgId,
                assigned_agents: assignedAgentList
            });
        });

        // 2. Fetch all pool numbers to establish master ownership table
        const { data: allPoolNumbers } = await adminClient
            .from("phone_number_pool")
            .select("phone_number, status, assigned_organization_id, assigned_org_id");

        const poolMasterOwnership = new Map<string, { status: string; ownerOrgs: Set<string> }>();
        (allPoolNumbers || []).forEach((p: any) => {
            const cleanKey = (p.phone_number || "").replace(/[\s\-\(\)]/g, "");
            const owners = new Set<string>();
            if (p.assigned_organization_id) owners.add(p.assigned_organization_id);
            if (p.assigned_org_id) owners.add(p.assigned_org_id);

            poolMasterOwnership.set(cleanKey, {
                status: (p.status || "").toLowerCase(),
                ownerOrgs: owners
            });
        });

        // 3. Fetch phone_numbers table records for this user/organization
        const { data: phone_numbers, error: dbError } = await adminClient
            .from("phone_numbers")
            .select(`
                *,
                assigned_agents:agent_phone_numbers (
                    agent_id,
                    is_primary,
                    agents (
                        name
                    )
                )
            `)
            .or(`organization_id.eq.${orgId},organization_id.eq.${userId},assigned_org_id.eq.${orgId},assigned_org_id.eq.${userId}`)
            .order("created_at", { ascending: false });

        if (dbError) {
            console.error('[API] Database Error in phone_numbers:', dbError);
        }

        // Process phone_numbers table records:
        // Only include if NOT in pool, OR if pool master ownership includes THIS orgId/userId!
        (phone_numbers || []).forEach((num: any) => {
            const rawPhone = num.phone_number || "";
            const cleanKey = rawPhone.replace(/[\s\-\(\)]/g, "");
            
            const master = poolMasterOwnership.get(cleanKey);
            if (master) {
                const belongsToMe = master.ownerOrgs.has(orgId) || master.ownerOrgs.has(userId);
                if (!belongsToMe || master.status !== "assigned") {
                    // Belongs to another user in pool or is unassigned in pool! Skip!
                    return;
                }
            } else {
                // Non-pool phone_number: skip if released or not assigned
                if (num.status === "released" || num.is_assigned === false) {
                    return;
                }
            }

            if (!numberMap.has(cleanKey)) {
                numberMap.set(cleanKey, {
                    ...num,
                    assigned_agents: (num.assigned_agents || []).map((assignment: any) => ({
                        agent_id: assignment.agent_id,
                        agent_name: assignment.agents?.name || "Unknown",
                        is_primary: assignment.is_primary
                    }))
                });
            } else {
                const existing = numberMap.get(cleanKey);
                const assignedList = (num.assigned_agents || []).map((assignment: any) => ({
                    agent_id: assignment.agent_id,
                    agent_name: assignment.agents?.name || "Unknown",
                    is_primary: assignment.is_primary
                }));
                if (assignedList.length > 0 && (!existing.assigned_agents || existing.assigned_agents.length === 0)) {
                    existing.assigned_agents = assignedList;
                }
            }
        });

        const formattedNumbers = Array.from(numberMap.values());

        let baseLimit = 0;
        const tier = profile.plan_tier?.toLowerCase() || 'free';
        if (tier === 'trial') baseLimit = 1;
        else if (tier === 'starter') baseLimit = 2;
        else if (tier === 'professional') baseLimit = 5;

        const limit = baseLimit + (profile.additional_phone_numbers || 0);

        return NextResponse.json({
            success: true,
            data: {
                phone_numbers: formattedNumbers,
                limit
            }
        });

    } catch (error) {
        console.error('[API] Error in GET /api/phone-numbers:', error);
        return NextResponse.json(
            { success: false, error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
