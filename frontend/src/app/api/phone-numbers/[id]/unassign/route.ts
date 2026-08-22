import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

export async function DELETE(
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
        const { agent_id } = body;

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

        // Delete assignment
        // Supabase-js returns count of deleted rows if we pass count: 'exact'
        const { count, error: deleteError } = await supabase
            .from("agent_phone_numbers")
            .delete({ count: 'exact' })
            .eq("phone_number_id", phone_number_id)
            .eq("agent_id", agent_id);

        if (deleteError) {
            console.error('[API] Error unassigning number:', deleteError);
            return NextResponse.json({ error: "Database error during unassignment" }, { status: 500 });
        }

        if (count === 0) {
            return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
        }

        // Write to activity_log
        await supabase.from("activity_log").insert({
            user_id: user.id,
            organization_id: profile.organization_id,
            activity_type: 'number_unassigned',
            title: 'Phone Number Unassigned',
            description: `Unassigned ${phone_number.phone_number} from agent ${agent.name}`
        });

        return NextResponse.json({
            success: true,
            data: { message: "Number unassigned" }
        });

    } catch (error) {
        console.error('[API] Error in DELETE /api/phone-numbers/[id]/unassign:', error);
        return NextResponse.json(
            { success: false, error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
