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

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: phone_number_id } = await params;
        const { authenticated, user, profile, error, supabase } = await authenticateRequest();
        
        if (!authenticated || !user) {
            return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
        }
        
        if (!profile?.organization_id) {
            return NextResponse.json({ error: "No organization found" }, { status: 400 });
        }

        const body = await request.json();
        const { agent_id, is_primary = false } = body;

        if (!agent_id) {
            return NextResponse.json({ error: "agent_id is required" }, { status: 400 });
        }

        const orgId = profile.organization_id;
        const adminClient = getAdminClient();

        let phoneNumberRecord: {
            id: string;
            phone_number: string;
            provider: string;
            organization_id?: string;
            assigned_org_id?: string;
        } | null = null;

        // 1. Try finding in phone_numbers table first
        const { data: phoneRow } = await supabase
            .from("phone_numbers")
            .select("id, organization_id, assigned_org_id, phone_number, provider")
            .eq("id", phone_number_id)
            .maybeSingle();

        if (phoneRow) {
            phoneNumberRecord = phoneRow;
        } else {
            // 2. Fallback: try finding in phone_number_pool table
            const { data: poolRow } = await supabase
                .from("phone_number_pool")
                .select("id, assigned_organization_id, assigned_org_id, phone_number, provider")
                .eq("id", phone_number_id)
                .maybeSingle();

            if (poolRow) {
                phoneNumberRecord = {
                    id: poolRow.id,
                    phone_number: poolRow.phone_number,
                    provider: poolRow.provider || "voicelink",
                    organization_id: poolRow.assigned_organization_id || poolRow.assigned_org_id,
                    assigned_org_id: poolRow.assigned_organization_id || poolRow.assigned_org_id
                };

                // Ensure a corresponding row exists in phone_numbers table
                const { data: upsertedPhone } = await adminClient
                    .from("phone_numbers")
                    .upsert({
                        organization_id: orgId,
                        assigned_org_id: orgId,
                        phone_number: poolRow.phone_number,
                        city: "India",
                        did_type: "mobile",
                        provider: poolRow.provider || "voicelink",
                        is_assigned: true,
                        status: "active"
                    }, { onConflict: "phone_number" })
                    .select("id")
                    .single();

                if (upsertedPhone) {
                    phoneNumberRecord.id = upsertedPhone.id;
                }
            }
        }

        if (!phoneNumberRecord) {
            return NextResponse.json({ error: "Phone number not found" }, { status: 404 });
        }

        const ownsNumber = 
            phoneNumberRecord.organization_id === orgId || 
            phoneNumberRecord.assigned_org_id === orgId;

        if (!ownsNumber) {
            return NextResponse.json({ error: "Forbidden: You do not own this phone number" }, { status: 403 });
        }

        // Verify agent ownership
        const { data: agent, error: agentError } = await supabase
            .from("agents")
            .select("organization_id, name")
            .eq("id", agent_id)
            .single();

        if (agentError || !agent) {
            return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        if (agent.organization_id !== orgId) {
            return NextResponse.json({ error: "Forbidden: You do not own this agent" }, { status: 403 });
        }

        const targetPhoneId = phoneNumberRecord.id;

        // Check if already assigned
        const { data: existingAssignment } = await supabase
            .from("agent_phone_numbers")
            .select("phone_number_id")
            .eq("phone_number_id", targetPhoneId)
            .eq("agent_id", agent_id)
            .maybeSingle();

        if (is_primary) {
            // Unset primary for other numbers of this agent
            await supabase
                .from("agent_phone_numbers")
                .update({ is_primary: false })
                .eq("agent_id", agent_id);
        }

        if (existingAssignment) {
            if (is_primary) {
                await supabase
                    .from("agent_phone_numbers")
                    .update({ is_primary: true })
                    .eq("agent_id", agent_id)
                    .eq("phone_number_id", targetPhoneId);
            }
        } else {
            await adminClient
                .from("agent_phone_numbers")
                .insert({
                    agent_id,
                    phone_number_id: targetPhoneId,
                    is_primary
                });
        }

        // Update assigned_agent_id on phone_numbers table
        await adminClient
            .from("phone_numbers")
            .update({ assigned_agent_id: agent_id, is_assigned: true })
            .eq("id", targetPhoneId);

        // Also update assigned_agent_id on phone_number_pool table if matching number
        await adminClient
            .from("phone_number_pool")
            .update({ assigned_agent_id: agent_id, status: 'assigned' })
            .eq("phone_number", phoneNumberRecord.phone_number);

        // Keep agents table in sync if this is primary number
        if (is_primary) {
            await adminClient
                .from("agents")
                .update({
                    phone_number: phoneNumberRecord.phone_number,
                    telephony_provider: phoneNumberRecord.provider || "twilio"
                })
                .eq("id", agent_id);
        }

        // Write to activity_log
        await adminClient.from("activity_log").insert({
            user_id: user.id,
            organization_id: orgId,
            activity_type: 'number_assigned',
            title: 'Phone Number Assigned',
            description: `Assigned ${phoneNumberRecord.phone_number} to agent ${agent.name}`
        });

        return NextResponse.json({
            success: true,
            data: {
                assignment: { agent_id, phone_number_id: targetPhoneId, is_primary }
            }
        });

    } catch (error) {
        console.error('[API] Error in POST /api/phone-numbers/[id]/assign:', error);
        return NextResponse.json(
            { success: false, error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
