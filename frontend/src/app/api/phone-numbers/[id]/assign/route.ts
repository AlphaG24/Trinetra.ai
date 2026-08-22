import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: phone_number_id } = await params;
        const { authenticated, user, profile, error, supabase } = await authenticateRequest();
        
        if (!authenticated || !user) {
            return NextResponse.json({ error }, { status: 401 });
        }
        
        if (!profile?.organization_id) {
            return NextResponse.json({ error: "No organization found" }, { status: 400 });
        }

        const body = await request.json();
        const { agent_id, is_primary = false } = body;

        if (!agent_id) {
            return NextResponse.json({ error: "agent_id is required" }, { status: 400 });
        }

        // Verify phone number ownership
        const { data: phone_number, error: phoneError } = await supabase
            .from("phone_numbers")
            .select("organization_id, phone_number")
            .eq("id", phone_number_id)
            .single();

        if (phoneError || !phone_number) {
            return NextResponse.json({ error: "Phone number not found" }, { status: 404 });
        }

        if (phone_number.organization_id !== profile.organization_id) {
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

        if (agent.organization_id !== profile.organization_id) {
            return NextResponse.json({ error: "Forbidden: You do not own this agent" }, { status: 403 });
        }

        // Check if already assigned
        const { data: existingAssignment } = await supabase
            .from("agent_phone_numbers")
            .select("phone_number_id")
            .eq("phone_number_id", phone_number_id)
            .eq("agent_id", agent_id)
            .single();

        if (is_primary) {
            // Unset primary for other numbers of this agent
            await supabase
                .from("agent_phone_numbers")
                .update({ is_primary: false })
                .eq("agent_id", agent_id);
        }

        if (existingAssignment) {
            if (is_primary) {
                // Update existing assignment to be primary
                const { error: updateError } = await supabase
                    .from("agent_phone_numbers")
                    .update({ is_primary: true })
                    .eq("agent_id", agent_id)
                    .eq("phone_number_id", phone_number_id);
                
                if (updateError) {
                    return NextResponse.json({ error: "Database error during assignment update" }, { status: 500 });
                }
            } else {
                return NextResponse.json({ error: "Number already assigned to this agent" }, { status: 409 });
            }
        } else {
            // Insert assignment
            const { error: insertError } = await supabase
                .from("agent_phone_numbers")
                .insert({
                    agent_id,
                    phone_number_id,
                    is_primary
                });

            if (insertError) {
                console.error('[API] Error assigning number:', insertError);
                return NextResponse.json({ error: "Database error during assignment" }, { status: 500 });
            }
        }

        // Write to activity_log
        await supabase.from("activity_log").insert({
            user_id: user.id,
            organization_id: profile.organization_id,
            activity_type: 'number_assigned',
            title: 'Phone Number Assigned',
            description: `Assigned ${phone_number.phone_number} to agent ${agent.name}`
        });

        return NextResponse.json({
            success: true,
            data: {
                assignment: { agent_id, phone_number_id, is_primary }
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
