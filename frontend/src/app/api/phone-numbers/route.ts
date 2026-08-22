import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createClient } from "@supabase/supabase-js";

// We need an admin client to fetch pricing safely or we can just fetch without pricing, 
// wait the instructions say: "Or simpler: frontend will fetch pricing separately — just return the number data"
// I will do that to keep it simple.

export async function GET(request: Request) {
    try {
        const { authenticated, profile, error, supabase } = await authenticateRequest();
        
        if (!authenticated) {
            return NextResponse.json({ error }, { status: 401 });
        }
        
        if (!profile?.organization_id) {
            return NextResponse.json({ error: "No organization found" }, { status: 400 });
        }

        // We can use Supabase JS SDK to do the join, or RPC, but for simplicity and safety
        // the instructions gave exact SQL:
        // SELECT phone_numbers.*, array_agg(...) as assigned_agents FROM phone_numbers LEFT JOIN ...
        // Since we can't do raw SQL directly via the client, we can use the JS SDK relational querying.
        
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
            .eq("organization_id", profile.organization_id)
            .in("status", ["provisioning", "active"])
            .order("provisioned_at", { ascending: false });
            
        if (dbError) {
            console.error('[API] Database Error:', dbError);
            return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
        }

        // Format the nested assigned_agents to match the requested output
        const formattedNumbers = (phone_numbers || []).map((num: any) => ({
            ...num,
            assigned_agents: (num.assigned_agents || []).map((assignment: any) => ({
                agent_id: assignment.agent_id,
                agent_name: assignment.agents?.name || "Unknown",
                is_primary: assignment.is_primary
            }))
        }));

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
