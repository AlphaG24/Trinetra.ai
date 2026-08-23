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

        try {
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
                throw new Error("Backend response error");
            }

            return NextResponse.json({
                success: true,
                data: backendData.data || backendData
            });
        } catch (fetchErr: any) {
            console.warn('[API] FastAPI pricing fetch failed, returning default display pricing:', fetchErr);
            return NextResponse.json({
                success: true,
                data: {
                    display_text: "₹2,500/month per line (all incoming calls free)"
                }
            });
        }

    } catch (error) {
        console.error('[API] Error in GET /api/phone-numbers/pricing:', error);
        return NextResponse.json(
            { success: false, error: "An unexpected error occurred" },
            { status: 500 }
        );
    }
}
