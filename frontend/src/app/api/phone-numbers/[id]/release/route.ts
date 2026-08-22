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

        // Verify ownership
        const { data: phone_number, error: fetchError } = await supabase
            .from("phone_numbers")
            .select("organization_id, status, phone_number")
            .eq("id", phone_number_id)
            .single();

        if (fetchError || !phone_number) {
            return NextResponse.json({ error: "Phone number not found" }, { status: 404 });
        }

        if (phone_number.organization_id !== profile.organization_id) {
            return NextResponse.json({ error: "Forbidden: You do not own this resource" }, { status: 403 });
        }

        if (phone_number.status === 'released') {
            return NextResponse.json({ error: "Number already released" }, { status: 400 });
        }

        if (!['active', 'provisioning'].includes(phone_number.status)) {
            return NextResponse.json({ error: `Cannot release number in status: ${phone_number.status}` }, { status: 400 });
        }

        // Unassign from all agents
        const { error: deleteError } = await supabase
            .from("agent_phone_numbers")
            .delete()
            .eq("phone_number_id", phone_number_id);

        if (deleteError) {
            console.error('[API] Error unassigning agents during release:', deleteError);
            return NextResponse.json({ error: "Failed to release number safely" }, { status: 500 });
        }

        // Call FastAPI Backend (Assuming it handles the provider-level release)
        const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const backendResponse = await fetch(`${fastApiUrl}/api/numbers/${phone_number_id}/release`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`
            }
        });

        if (!backendResponse.ok) {
            console.error('[API] Backend release failed:', await backendResponse.text());
            return NextResponse.json({ error: "Provider release failed. Please try again." }, { status: 500 });
        }

        // Update local DB
        const { error: updateError } = await supabase
            .from("phone_numbers")
            .update({ status: 'released', released_at: new Date().toISOString() })
            .eq("id", phone_number_id);

        if (updateError) {
            console.error('[API] Error updating phone number status to released:', updateError);
            return NextResponse.json({ error: "Database error updating status" }, { status: 500 });
        }

        // Write to activity_log
        await supabase.from("activity_log").insert({
            user_id: user.id,
            organization_id: profile.organization_id,
            activity_type: 'number_released',
            title: 'Phone Number Released',
            description: `Released ${phone_number.phone_number}`
        });

        return NextResponse.json({
            success: true,
            data: { message: "Number released successfully" }
        });

    } catch (error) {
        console.error('[API] Error in POST /api/phone-numbers/[id]/release:', error);
        return NextResponse.json(
            { success: false, error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
