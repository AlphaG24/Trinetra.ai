import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET: Fetch number bidding config & list all bids for a number
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: number_id } = await params;
    const { authenticated, profile } = await authenticateRequest();

    if (!authenticated || !profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "admin" && profile.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const adminClient = getAdminClient();

    // 1. Fetch phone number details
    const { data: phoneRow, error: phoneErr } = await adminClient
      .from("phone_numbers")
      .select("*")
      .eq("id", number_id)
      .single();

    if (phoneErr || !phoneRow) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 });
    }

    // 2. Fetch all bids for this number
    const { data: bids, error: bidsErr } = await adminClient
      .from("number_bids")
      .select(`
        *,
        bidder_profile:profiles!number_bids_user_id_fkey(id, full_name, email),
        bidder_org:organizations!number_bids_organization_id_fkey(id, name)
      `)
      .eq("phone_number_id", number_id)
      .order("created_at", { ascending: false });

    if (bidsErr) {
      console.error("[Admin Bidding GET] Fetch bids error:", bidsErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        phone_number: phoneRow,
        bids: bids || []
      }
    });

  } catch (err: any) {
    console.error("[Admin Bidding GET] Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// POST: Toggle bidding_enabled, set minimum_bid_paisa, set auction_ends_at
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: number_id } = await params;
    const { authenticated, profile, user } = await authenticateRequest();

    if (!authenticated || !profile || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (profile.role !== "admin" && profile.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { bidding_enabled, minimum_bid_paisa, auction_ends_at } = body;

    const adminClient = getAdminClient();

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (typeof bidding_enabled === "boolean") {
      updates.bidding_enabled = bidding_enabled;
    }
    if (minimum_bid_paisa !== undefined) {
      updates.minimum_bid_paisa = Math.max(0, parseInt(minimum_bid_paisa, 10) || 0);
    }
    if (auction_ends_at !== undefined) {
      updates.auction_ends_at = auction_ends_at ? new Date(auction_ends_at).toISOString() : null;
    }

    const { data: updated, error } = await adminClient
      .from("phone_numbers")
      .update(updates)
      .eq("id", number_id)
      .select()
      .single();

    if (error) {
      console.error("[Admin Bidding POST] Update error:", error);
      return NextResponse.json({ error: "Failed to update bidding settings" }, { status: 500 });
    }

    // Log to audit logs
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      action: "number_bidding_configured",
      resource_type: "phone_number",
      resource_id: number_id,
      new_values: updates
    });

    return NextResponse.json({
      success: true,
      message: "Bidding settings updated successfully",
      data: updated
    });

  } catch (err: any) {
    console.error("[Admin Bidding POST] Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
