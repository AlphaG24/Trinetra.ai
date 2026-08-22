import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

export async function GET(request: Request) {
    try {
        const { authenticated, error } = await authenticateRequest();
        
        if (!authenticated) {
            return NextResponse.json({ error }, { status: 401 });
        }

        // Call FastAPI Backend
        const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const backendResponse = await fetch(`${fastApiUrl}/api/pricing/display`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`
            },
            // Cache for 5 minutes
            next: { revalidate: 300 }
        });

        const backendData = await backendResponse.json();

        if (!backendResponse.ok) {
            console.error('[API] Backend pricing failed:', backendData);
            return NextResponse.json({ error: "Failed to fetch pricing information" }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: backendData.data || backendData
        });

    } catch (error) {
        console.error('[API] Error in GET /api/phone-numbers/pricing:', error);
        return NextResponse.json(
            { success: false, error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
