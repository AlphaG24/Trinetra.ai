import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
    return createAdminClient(
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
        
        // 1. Authenticate user directly via Supabase server client
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            console.error('[Release API] Auth failed:', authError);
            return NextResponse.json({ error: "Authentication required" }, { status: 401 });
        }

        const adminClient = getAdminClient();

        // 2. Fetch user profile with admin privileges to avoid RLS locks
        const { data: profile } = await adminClient
            .from("profiles")
            .select("id, organization_id, role")
            .eq("id", user.id)
            .single();
        
        if (!profile?.organization_id && profile?.role !== 'admin') {
            return NextResponse.json({ error: "No organization found" }, { status: 400 });
        }

        // 3. Verify ownership via admin client
        const { data: phone_number, error: fetchError } = await adminClient
            .from("phone_numbers")
            .select("*")
            .eq("id", phone_number_id)
            .single();

        if (fetchError || !phone_number) {
            return NextResponse.json({ error: "Phone number not found" }, { status: 404 });
        }

        const isOwner = 
            phone_number.organization_id === profile.organization_id || 
            phone_number.assigned_org_id === profile.organization_id || 
            profile.role === 'admin';

        if (!isOwner) {
            return NextResponse.json({ error: "Forbidden: You do not own this resource" }, { status: 403 });
        }

        if (phone_number.status === 'released') {
            return NextResponse.json({ error: "Number is already released" }, { status: 400 });
        }

        // 4. Unassign from all agents
        const { error: deleteError } = await adminClient
            .from("agent_phone_numbers")
            .delete()
            .eq("phone_number_id", phone_number_id);

        if (deleteError) {
            console.warn('[Release API] Notice unassigning agent bindings:', deleteError);
        }

        // 5. If registered in BYON vault, clear assigned agent
        await adminClient
            .from("byon_phone_numbers")
            .update({ 
                assigned_agent_id: null, 
                status: 'unassigned',
                updated_at: new Date().toISOString() 
            })
            .eq("phone_number", phone_number.phone_number);

        // 6. Notify FastAPI backend if active
        const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        try {
            await fetch(`${fastApiUrl}/api/numbers/${phone_number_id}/release`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`
                }
            });
        } catch (backendErr) {
            console.warn('[Release API] Backend release ping notice:', backendErr);
        }

        // 7. Update phone_numbers record to released and clear all assignments
        const { error: updateError } = await adminClient
            .from("phone_numbers")
            .update({ 
                status: 'released',
                organization_id: null,
                assigned_org_id: null,
                assigned_agent_id: null,
                is_assigned: false,
                renewal_date: null,
                released_at: new Date().toISOString() 
            })
            .eq("id", phone_number_id);

        if (updateError) {
            console.error('[Release API] Error releasing phone number:', updateError);
            return NextResponse.json({ error: "Database error releasing number: " + updateError.message }, { status: 500 });
        }

        // 8. In-app activity and notification
        try {
            await adminClient.from("notifications").insert({
                user_id: user.id,
                organization_id: profile.organization_id,
                title: "Phone Number Released",
                message: `Phone number ${phone_number.phone_number} has been released and returned to the pool.`,
                type: "number_released",
                read: false
            });

            await adminClient.from("activity_log").insert({
                user_id: user.id,
                activity_type: "number_released",
                title: "Phone Number Released",
                description: `Released number ${phone_number.phone_number}`,
                metadata: {
                    organization_id: profile.organization_id,
                    phone_number: phone_number.phone_number,
                    phone_number_id: phone_number_id
                }
            });
        } catch (logErr) {
            console.warn('[Release API] Logging notice:', logErr);
        }

        return NextResponse.json({ 
            success: true, 
            message: `Number ${phone_number.phone_number} successfully released.` 
        });

    } catch (err: any) {
        console.error('[Release API] Critical error:', err);
        return NextResponse.json({ error: err.message || "Failed to release number" }, { status: 500 });
    }
}
