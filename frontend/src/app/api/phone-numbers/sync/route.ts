import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

export async function POST(request: Request) {
    try {
        const { authenticated, user, profile, error } = await authenticateRequest();
        
        if (!authenticated || !user) {
            return NextResponse.json({ success: false, data: [], error: error || "Unauthorized" });
        }
        
        if (!profile?.organization_id) {
            return NextResponse.json({ success: false, data: [], error: "No organization found" });
        }

        const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        
        try {
            const response = await fetch(`${fastApiUrl}/api/numbers/sync/${profile.organization_id}?provider=twilio`, {
                method: 'POST',
                signal: controller.signal
            });
            
            const data = await response.json();
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                return NextResponse.json({ 
                    success: false, 
                    data: [],
                    error: data.detail || data.error || "Sync failed" 
                });
            }
            
            return NextResponse.json({
                success: true,
                data
            });
        } catch (fetchErr: any) {
            clearTimeout(timeoutId);
            console.error("[POST /api/phone-numbers/sync] FastAPI sync failed:", fetchErr);
            return NextResponse.json({ success: false, data: [], error: "Backend server is offline or unreachable" }, { status: 503 });
        }
    } catch (err: any) {
        return NextResponse.json({ success: false, data: [], error: err.message || "Internal server error" }, { status: 500 });
    }
}
