import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { authenticated, profile, error, supabase } = await authenticateRequest();
    if (!authenticated || !profile || !supabase) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }
    
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(`${fastApiUrl}/api/campaigns/${id}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal
      });
      
      const data = await response.json();
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return NextResponse.json({ error: data.detail || "Failed to fetch campaign details" }, { status: response.status });
      }
      
      return NextResponse.json(data);
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      console.warn(`[GET /api/campaigns/${id}] FastAPI fetch failed, falling back to direct database query:`, fetchErr);

      try {
        const { data: dbCampaign, error: dbError } = await supabase
          .from("campaigns")
          .select(`
            *,
            agents (
              name
            )
          `)
          .eq("id", id)
          .single();

        if (dbError) {
          console.error(`[GET /api/campaigns/${id}] Supabase fallback query failed:`, dbError);
          return NextResponse.json({ error: "Failed to fetch campaign from database" }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          data: dbCampaign
        });
      } catch (dbFallbackErr: any) {
        console.error(`[GET /api/campaigns/${id}] Supabase fallback exception:`, dbFallbackErr);
        return NextResponse.json({ error: "Backend server is offline or unreachable" }, { status: 503 });
      }
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { authenticated, profile, error } = await authenticateRequest();
    if (!authenticated || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }
    
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
    const response = await fetch(`${fastApiUrl}/api/campaigns/${id}`, {
      method: "DELETE"
    });
    
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.detail || "Failed to delete campaign" }, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
