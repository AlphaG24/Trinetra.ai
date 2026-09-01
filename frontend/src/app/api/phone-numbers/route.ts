import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

export async function GET(request: Request) {
    try {
        const { authenticated, profile, error, supabase } = await authenticateRequest();
        
        if (!authenticated || !profile) {
            return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
        }
        
        if (!profile.organization_id) {
            return NextResponse.json({ error: "No organization found" }, { status: 400 });
        }

        const orgId = profile.organization_id;

        // 1. Query phone_numbers table for user's organization
        const { data: phone_numbers, error: dbError } = await supabase
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
            .or(`organization_id.eq.${orgId},assigned_org_id.eq.${orgId}`)
            .order("created_at", { ascending: false });
            
        if (dbError) {
            console.error('[API] Database Error in phone_numbers:', dbError);
        }

        // 2. Query phone_number_pool table for assigned numbers belonging to user's organization
        const { data: poolAssigned, error: poolError } = await supabase
            .from("phone_number_pool")
            .select(`
                *,
                assigned_agent:agents(id, name)
            `)
            .or(`assigned_organization_id.eq.${orgId},assigned_org_id.eq.${orgId}`)
            .eq("status", "assigned");

        if (poolError) {
            console.error('[API] Database Error in phone_number_pool:', poolError);
        }

        // Map and deduplicate numbers by clean phone_number string
        const numberMap = new Map<string, any>();

        // Process records from phone_numbers table
        (phone_numbers || []).forEach((num: any) => {
            const rawPhone = num.phone_number || "";
            const cleanKey = rawPhone.replace(/[\s\-\(\)]/g, "");
            
            numberMap.set(cleanKey, {
                ...num,
                assigned_agents: (num.assigned_agents || []).map((assignment: any) => ({
                    agent_id: assignment.agent_id,
                    agent_name: assignment.agents?.name || "Unknown",
                    is_primary: assignment.is_primary
                }))
            });
        });

        // Process/merge records from phone_number_pool table
        (poolAssigned || []).forEach((poolNum: any) => {
            const rawPhone = poolNum.phone_number || "";
            const cleanKey = rawPhone.replace(/[\s\-\(\)]/g, "");

            const assignedAgentList = poolNum.assigned_agent ? [{
                agent_id: poolNum.assigned_agent.id,
                agent_name: poolNum.assigned_agent.name,
                is_primary: true
            }] : [];

            if (!numberMap.has(cleanKey)) {
                numberMap.set(cleanKey, {
                    id: poolNum.id,
                    phone_number: poolNum.phone_number,
                    city: poolNum.city || "India",
                    did_type: poolNum.did_type || "mobile",
                    provider: poolNum.provider || "voicelink",
                    status: "active",
                    retail_price_paisa: poolNum.retail_price_paisa || 29900,
                    renewal_date: poolNum.renewal_date,
                    assigned_org_id: poolNum.assigned_organization_id || poolNum.assigned_org_id,
                    organization_id: poolNum.assigned_organization_id || poolNum.assigned_org_id,
                    assigned_agents: assignedAgentList
                });
            } else {
                const existing = numberMap.get(cleanKey);
                if ((!existing.assigned_agents || existing.assigned_agents.length === 0) && assignedAgentList.length > 0) {
                    existing.assigned_agents = assignedAgentList;
                }
                if (!existing.renewal_date && poolNum.renewal_date) {
                    existing.renewal_date = poolNum.renewal_date;
                }
                if (!existing.retail_price_paisa && poolNum.retail_price_paisa) {
                    existing.retail_price_paisa = poolNum.retail_price_paisa;
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
