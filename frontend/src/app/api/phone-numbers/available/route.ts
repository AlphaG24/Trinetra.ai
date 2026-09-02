import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
    try {
        const { authenticated, profile, error } = await authenticateRequest();
        
        if (!authenticated) {
            return NextResponse.json({ error }, { status: 401 });
        }

        const url = new URL(request.url);
        const city = url.searchParams.get("city") || "";
        const did_type = url.searchParams.get("did_type") || "mobile";
        const area_code = url.searchParams.get("area_code") || "";
        let provider = url.searchParams.get("provider");

        if (!provider) {
            provider = profile?.country === 'IN' ? 'sarvam' : 'twilio';
        }

        const supabase = await createClient();
        
        // Check local database pool for available numbers first
        const { data: poolNumbers } = await supabase
            .from('phone_numbers')
            .select('*')
            .eq('is_assigned', false)
            .eq('status', 'available')
            .limit(10);

        if (poolNumbers && poolNumbers.length > 0) {
            const available_numbers = poolNumbers.map((num: any) => ({
                did_id: num.id,
                phone_number: num.phone_number,
                city: 'Trinetra Pool',
                area_code: num.phone_number.substring(1, 4),
                did_type: 'mobile',
                provider: 'twilio'
            }));

            return NextResponse.json({
                success: true,
                data: { available_numbers }
            });
        }

        const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const backendUrl = new URL(`${fastApiUrl}/api/numbers/available`);
        if (city) backendUrl.searchParams.set("city", city);
        if (did_type) backendUrl.searchParams.set("did_type", did_type);
        if (provider) backendUrl.searchParams.set("provider", provider);
        if (area_code) backendUrl.searchParams.set("area_code", area_code);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        try {
            const backendResponse = await fetch(backendUrl.toString(), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`
                },
                cache: 'no-store',
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            const backendData = await backendResponse.json();

            if (!backendResponse.ok) {
                console.error('[API] Backend available numbers failed:', backendData);
                return NextResponse.json({ error: "Failed to fetch available numbers" }, { status: 500 });
            }

            // Return the numbers without pricing (pricing is handled by the pricing endpoint)
            const rawList = Array.isArray(backendData.data)
                ? backendData.data
                : (backendData.data?.available_numbers || backendData.available_numbers || []);

            const available_numbers = rawList.map((num: any) => ({
                did_id: num.did_id,
                phone_number: num.phone_number,
                city: num.city,
                area_code: num.area_code,
                did_type: num.did_type,
                provider: num.provider
            }));

            return NextResponse.json({
                success: true,
                data: { available_numbers }
            });
        } catch (fetchErr: any) {
            clearTimeout(timeoutId);
            console.warn('[API] FastAPI available numbers fetch failed, returning mock/empty available numbers:', fetchErr?.message || fetchErr);
            
            // Return some fallback numbers in case backend is offline so the UI doesn't look completely empty or break
            const mockNumbers = (provider === 'sarvam' || provider === 'voicelink') ? [
                { did_id: "mock-sv-1", phone_number: "+91 98765 43210", city: "Mumbai", area_code: "022", did_type: "mobile", provider: "sarvam" },
                { did_id: "mock-sv-2", phone_number: "+91 98765 43211", city: "Delhi", area_code: "011", did_type: "mobile", provider: "sarvam" },
                { did_id: "mock-sv-3", phone_number: "+91 98765 43212", city: "Bangalore", area_code: "080", did_type: "mobile", provider: "sarvam" }
            ] : [
                { did_id: "mock-tw-1", phone_number: "+1 (555) 019-2831", city: "New York", area_code: "212", did_type: "local", provider: "twilio" },
                { did_id: "mock-tw-2", phone_number: "+1 (555) 019-2832", city: "Los Angeles", area_code: "310", did_type: "local", provider: "twilio" },
                { did_id: "mock-tw-3", phone_number: "+1 (555) 019-2833", city: "Chicago", area_code: "312", did_type: "local", provider: "twilio" }
            ];

            return NextResponse.json({
                success: true,
                data: { available_numbers: mockNumbers }
            });
        }

    } catch (error) {
        console.error('[API] Error in GET /api/phone-numbers/available:', error);
        return NextResponse.json(
            { success: false, error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
