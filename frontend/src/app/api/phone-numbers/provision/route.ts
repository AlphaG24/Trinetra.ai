import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

export async function POST(request: Request) {
    try {
        const { authenticated, user, profile, error, supabase } = await authenticateRequest();
        
        if (!authenticated || !user) {
            return NextResponse.json({ error }, { status: 401 });
        }
        
        if (!profile?.organization_id) {
            return NextResponse.json({ error: "No organization found" }, { status: 400 });
        }

        if (profile.plan_tier === 'free' || profile.plan_tier === 'free_demo') {
            return NextResponse.json(
                { error: "Phone numbers require a paid plan", code: "UPGRADE_REQUIRED" },
                { status: 402 }
            );
        }

        const body = await request.json();
        let { area_code, did_type, provider, phone_number } = body;

        const validDidTypes = ['mobile', 'landline', 'tollfree', '92series', 'local'];
        if (did_type && !validDidTypes.includes(did_type)) {
            return NextResponse.json({ error: "Invalid did_type" }, { status: 400 });
        }

        if (!provider) {
            provider = profile.country === 'IN' ? 'sarvam' : 'twilio';
        }

        // Only validate area_code if phone_number is NOT provided
        if (!phone_number) {
            if (!area_code) {
                area_code = provider === 'sarvam' ? '022' : '212';
            }

            if (provider === 'twilio') {
                // Strip leading zeros for Twilio
                area_code = area_code.replace(/^0+/, '');
                if (area_code.length !== 3 || !/^\d{3}$/.test(area_code)) {
                    return NextResponse.json({ 
                        success: false, 
                        error: 'US area code must be exactly 3 digits' 
                    }, { status: 400 });
                }
            } else if (provider === 'sarvam' || provider === 'exotel') {
                if (!/^\d{3,4}$/.test(area_code)) {
                    return NextResponse.json({
                        success: false,
                        error: 'Indian area code must be 3 or 4 digits'
                    }, { status: 400 });
                }
            }
        }

        // Active numbers count limit check
        const { count: activeCount, error: activeCountErr } = await supabase
            .from("phone_numbers")
            .select('*', { count: 'exact', head: true })
            .eq("organization_id", profile.organization_id)
            .in("status", ["provisioning", "active"]);

        if (activeCountErr) {
            console.error('[API] Active numbers count error:', activeCountErr);
            return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
        }

        let baseLimit = 0;
        const tier = profile.plan_tier?.toLowerCase() || 'free';
        if (tier === 'trial') baseLimit = 1;
        else if (tier === 'starter') baseLimit = 2;
        else if (tier === 'professional') baseLimit = 5;

        const limit = baseLimit + (profile.additional_phone_numbers || 0);

        // Bypass limit checks entirely if user has developer_tester role
        if (profile?.role !== 'developer_tester' && activeCount !== null && activeCount >= limit) {
            return NextResponse.json({
                error: `You have reached your limit of ${limit} phone numbers. Please purchase extra number slots in the billing page.`,
                code: "LIMIT_REACHED"
            }, { status: 403 });
        }

        // Rate limit check: max 5 numbers per day
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);
        
        const { count, error: countError } = await supabase
            .from("phone_numbers")
            .select('*', { count: 'exact', head: true })
            .eq("organization_id", profile.organization_id)
            .gte("created_at", yesterday.toISOString());

        if (countError) {
            console.error('[API] Rate limit check error:', countError);
            return NextResponse.json({ success: false, error: "Database error" }, { status: 500 });
        }

        if (count !== null && count >= 5) {
            const retryDate = new Date();
            retryDate.setHours(24, 0, 0, 0); // Next midnight
            return NextResponse.json({ 
                error: "Rate limit exceeded. Max 5 numbers per day.", 
                code: "RATE_LIMITED", 
                retry_after: retryDate.toISOString() 
            }, { status: 429 });
        }

        // ── POOL ALLOCATION STRATEGY ──────────────────────────────────────────
        // First try to resolve and assign the number from our database pre-purchased pool
        if (phone_number) {
            // Initialize Admin Client (using supabase service role key) to bypass RLS to update pool
            const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
            const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
            const supabaseAdmin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey!);

            const { data: poolNumber } = await supabaseAdmin
                .from('phone_numbers')
                .select('*')
                .eq('phone_number', phone_number)
                .eq('is_assigned', false)
                .maybeSingle();

            if (poolNumber) {
                console.log(`[Pool Provision] Allocating pre-purchased number ${phone_number} from database pool`);
                
                // Update pool status in phone_numbers directly
                const { data: phoneRow, error: phoneUpdateError } = await supabaseAdmin
                    .from('phone_numbers')
                    .update({
                        status: 'active',
                        is_assigned: true,
                        assigned_org_id: profile.organization_id,
                        organization_id: profile.organization_id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', poolNumber.id)
                    .select()
                    .single();

                if (!phoneUpdateError && phoneRow) {
                    await supabaseAdmin.from("activity_log").insert({
                        user_id: user.id,
                        organization_id: profile.organization_id,
                        activity_type: 'number_provisioned',
                        title: 'Phone Number Provisioned (Pool)',
                        description: `Provisioned pre-purchased number ${phoneRow.phone_number} from Trinetra pool`
                    });

                    return NextResponse.json({
                        success: true,
                        data: { phone_number: phoneRow }
                    }, { status: 201 });
                }
            }
        }

        // Call FastAPI Backend
        const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const fastApiBody: any = {
            organization_id: profile.organization_id,
            did_type: did_type || 'mobile',
            provider,
            user_id: user.id
        };

        if (phone_number) {
            fastApiBody.phone_number = phone_number;
            fastApiBody.area_code = area_code || '';
        } else {
            fastApiBody.area_code = area_code;
        }

        const backendResponse = await fetch(`${fastApiUrl}/api/numbers/provision`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify(fastApiBody)
        });

        const backendData = await backendResponse.json().catch(() => ({ detail: 'Provisioning failed' }));

        if (!backendResponse.ok) {
            return NextResponse.json({ 
                success: false, 
                error: backendData.detail || backendData.error || "Provisioning failed" 
            }, { status: backendResponse.status });
        }

        // Write to activity_log (FastAPI might do this, but the prompt says to do it here or assume success)
        // Note: The FastAPI backend's NumberService we built previously already inserts into audit_logs and activity_log.
        // But per instructions: "Write to activity_log". We will do it to follow instructions exactly.
        const phoneData = backendData.data?.phone_number || backendData;
        await supabase.from("activity_log").insert({
            user_id: user.id,
            organization_id: profile.organization_id,
            activity_type: 'number_provisioned',
            title: 'Phone Number Provisioned',
            description: `Provisioned ${phoneData.phone_number} (${phoneData.city || area_code}, ${phoneData.did_type})`
        });

        return NextResponse.json({
            success: true,
            data: { phone_number: phoneData }
        }, { status: 201 });

    } catch (error) {
        console.error('[API] Error in POST /api/phone-numbers/provision:', error);
        return NextResponse.json(
            { success: false, error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
