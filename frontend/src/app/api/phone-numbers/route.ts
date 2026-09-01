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
        
        const orgId = profile.organization_id;
        const userId = user.id;
        const adminClient = getAdminClient();

        // Fetch phone_numbers table records for this user/organization
        let query = adminClient
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
            .eq("is_assigned", true)
            .order("created_at", { ascending: false });

        if (orgId) {
            query = query.or(`organization_id.eq.${orgId},assigned_org_id.eq.${orgId}`);
        } else {
            query = query.or(`organization_id.eq.${userId},assigned_org_id.eq.${userId}`);
        }

        const { data: phone_numbers, error: dbError } = await query;

        if (dbError) {
            console.error('[API] Database Error in phone_numbers:', dbError);
        }

        const formattedNumbers = (phone_numbers || []).map((num: any) => ({
            ...num,
            status: num.status || "active",
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
