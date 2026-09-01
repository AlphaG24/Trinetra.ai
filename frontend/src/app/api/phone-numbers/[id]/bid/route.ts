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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: number_id } = await params;
    const { authenticated, user, profile, error } = await authenticateRequest();

    if (!authenticated || !user || !profile) {
      return NextResponse.json({ error: error || "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { bid_amount_rupees, bid_amount_paisa } = body;

    const parsedBidPaisa = bid_amount_paisa 
      ? parseInt(bid_amount_paisa, 10) 
      : Math.round(parseFloat(bid_amount_rupees || "0") * 100);

    if (!parsedBidPaisa || isNaN(parsedBidPaisa) || parsedBidPaisa <= 0) {
      return NextResponse.json({ error: "Invalid bid amount" }, { status: 400 });
    }

    const userOrgId = profile.organization_id || user.id;
    const adminClient = getAdminClient();

    // 1. Fetch target phone number
    const { data: phoneRow, error: fetchErr } = await adminClient
      .from("phone_numbers")
      .select("*")
      .eq("id", number_id)
      .single();

    if (fetchErr || !phoneRow) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 });
    }

    // 2. Verify bidding is enabled
    if (!phoneRow.bidding_enabled) {
      return NextResponse.json({ error: "Bidding is not enabled for this phone number." }, { status: 400 });
    }

    // 3. Verify user's org is NOT the current owner
    const currentOwnerOrg = phoneRow.assigned_org_id || phoneRow.organization_id;
    if (phoneRow.is_assigned && currentOwnerOrg && currentOwnerOrg === userOrgId) {
      return NextResponse.json({ error: "You cannot place a bid on your own assigned phone number." }, { status: 400 });
    }

    // 4. Verify bid amount is greater than minimum & current bid
    const minRequiredPaisa = phoneRow.current_bid_paisa 
      ? phoneRow.current_bid_paisa + 100 // must exceed current highest bid by at least ₹1
      : (phoneRow.minimum_bid_paisa || 0);

    if (parsedBidPaisa < minRequiredPaisa) {
      const minRupees = (minRequiredPaisa / 100).toFixed(2);
      return NextResponse.json({ 
        error: `Your bid must be at least ₹${minRupees}` 
      }, { status: 400 });
    }

    // 5. Cancel any previous active bids for this org/user on this number
    await adminClient
      .from("number_bids")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("phone_number_id", number_id)
      .eq("organization_id", userOrgId)
      .eq("status", "active");

    // 6. Insert new bid
    const { data: newBid, error: insertErr } = await adminClient
      .from("number_bids")
      .insert({
        phone_number_id: number_id,
        organization_id: userOrgId,
        user_id: user.id,
        bid_amount_paisa: parsedBidPaisa,
        status: "active"
      })
      .select()
      .single();

    if (insertErr) {
      console.error("[User Bid API] Insert bid error:", insertErr);
      return NextResponse.json({ error: "Failed to place bid" }, { status: 500 });
    }

    // 7. Update phone_numbers table current_bid_paisa & bid_count
    const currentCount = phoneRow.bid_count || 0;
    await adminClient
      .from("phone_numbers")
      .update({
        current_bid_paisa: parsedBidPaisa,
        bid_count: currentCount + 1,
        updated_at: new Date().toISOString()
      })
      .eq("id", number_id);

    // 8. Log audit trail
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      organization_id: userOrgId,
      action: "number_bid_placed",
      resource_type: "phone_number",
      resource_id: number_id,
      new_values: {
        bid_amount_paisa: parsedBidPaisa,
        bid_id: newBid.id
      }
    });

    return NextResponse.json({
      success: true,
      message: `Your bid of ₹${(parsedBidPaisa / 100).toFixed(2)} has been placed successfully!`,
      data: newBid
    });

  } catch (err: any) {
    console.error("[User Bid API] Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
