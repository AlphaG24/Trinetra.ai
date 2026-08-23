import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { authenticated, profile, error, supabase } = await authenticateRequest();
    if (!authenticated || !profile || !supabase) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }
    
    // Get query params
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "20";
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    
    const fastApiUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://127.0.0.1:8000';
    let url = `${fastApiUrl}/api/campaigns/${id}/contacts?page=${page}&limit=${limit}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    if (status) {
      url += `&status=${encodeURIComponent(status)}`;
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal
      });
      
      const data = await response.json();
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        return NextResponse.json({ error: data.detail || "Failed to fetch campaign contacts" }, { status: response.status });
      }
      
      return NextResponse.json(data);
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      console.warn(`[GET /api/campaigns/${id}/contacts] FastAPI fetch failed, falling back to direct database query:`, fetchErr);

      try {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const from = (pageNum - 1) * limitNum;
        const to = from + limitNum - 1;

        let query = supabase
          .from("campaign_contacts")
          .select("*", { count: "exact" })
          .eq("campaign_id", id)
          .order("created_at", { ascending: false });

        if (status) {
          query = query.eq("call_status", status);
        }

        if (search) {
          query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,company_name.ilike.%${search}%`);
        }

        const { data: dbContacts, count, error: dbError } = await query.range(from, to);

        if (dbError) {
          console.error(`[GET /api/campaigns/${id}/contacts] Supabase fallback query failed:`, dbError);
          return NextResponse.json({ error: "Failed to fetch contacts from database" }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          data: dbContacts || [],
          total: count || 0,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil((count || 0) / limitNum)
        });
      } catch (dbFallbackErr: any) {
        console.error(`[GET /api/campaigns/${id}/contacts] Supabase fallback exception:`, dbFallbackErr);
        return NextResponse.json({ error: "Backend server is offline or unreachable" }, { status: 503 });
      }
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
