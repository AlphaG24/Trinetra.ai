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
    const timeoutId = setTimeout(() => controller.abort(), 4000);

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
          .maybeSingle();

        if (dbError) {
          console.error(`[GET /api/campaigns/${id}] Supabase fallback query failed:`, dbError);
          return NextResponse.json({ error: "Failed to fetch campaign from database" }, { status: 500 });
        }

        if (!dbCampaign) {
          return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
        }

        // Dynamically compute live counts from campaign_contacts
        try {
          const { data: contactsData } = await supabase
            .from("campaign_contacts")
            .select("call_status, call_attempts, lead_id")
            .eq("campaign_id", id);
          
          if (contactsData && contactsData.length > 0) {
            dbCampaign.total_contacts = contactsData.length;
            dbCampaign.contacts_called = Math.max(
              dbCampaign.contacts_called || 0,
              contactsData.filter((c: any) => (c.call_attempts || 0) > 0 || !['pending', ''].includes((c.call_status || '').toLowerCase())).length
            );
            dbCampaign.contacts_connected = Math.max(
              dbCampaign.contacts_connected || 0,
              contactsData.filter((c: any) => ['answered', 'completed', 'in-progress', 'connected'].includes((c.call_status || '').toLowerCase())).length
            );
            dbCampaign.leads_generated = Math.max(
              dbCampaign.leads_generated || 0,
              contactsData.filter((c: any) => c.lead_id !== null).length
            );
            dbCampaign.contacts_dnd = contactsData.filter((c: any) => (c.call_status || '').toLowerCase() === 'dnd').length;
          }
        } catch {}

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
    const { authenticated, profile, error, supabase } = await authenticateRequest();
    if (!authenticated || !profile || !supabase) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }
    
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
    try {
      const response = await fetch(`${fastApiUrl}/api/campaigns/${id}`, {
        method: "DELETE"
      });
      
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch (fetchErr) {
      console.warn(`[DELETE /api/campaigns/${id}] FastAPI fetch failed, falling back to direct database delete:`, fetchErr);
    }

    // Direct database deletion fallback
    // 1. Delete associated contacts first
    await supabase.from("campaign_contacts").delete().eq("campaign_id", id);

    // 2. Delete campaign
    const { error: dbError } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", id)
      .eq("organization_id", profile.organization_id);

    if (dbError) {
      return NextResponse.json({ error: dbError.message || "Failed to delete campaign" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Campaign deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
