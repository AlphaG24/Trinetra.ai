import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

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
            provider = profile?.country === 'IN' ? 'voicelink' : 'twilio';
        }

        // Call FastAPI Backend
        const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const backendUrl = new URL(`${fastApiUrl}/api/numbers/available`);
        if (city) backendUrl.searchParams.set("city", city);
        if (did_type) backendUrl.searchParams.set("did_type", did_type);
        if (provider) backendUrl.searchParams.set("provider", provider);
        if (area_code) backendUrl.searchParams.set("area_code", area_code);

        const backendResponse = await fetch(backendUrl.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`
            },
            // Cache for 2 minutes
            next: { revalidate: 120 }
        });

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

    } catch (error) {
        console.error('[API] Error in GET /api/phone-numbers/available:', error);
        return NextResponse.json(
            { success: false, error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
