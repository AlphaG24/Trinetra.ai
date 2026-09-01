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

    const userOrgId = profile.organization_id || user.id;
    const adminClient = getAdminClient();

    // 1. Verify user has a winning bid for this number
    const { data: winningBid, error: bidErr } = await adminClient
      .from("number_bids")
      .select("*")
      .eq("phone_number_id", number_id)
      .or(`organization_id.eq.${userOrgId},user_id.eq.${user.id}`)
      .eq("status", "won")
      .maybeSingle();

    if (bidErr || !winningBid) {
      return NextResponse.json({ 
        error: "No active winning bid found for your account on this phone number." 
      }, { status: 403 });
    }

    // 2. Fetch phone number
    const { data: phoneRow, error: phoneErr } = await adminClient
      .from("phone_numbers")
      .select("*")
      .eq("id", number_id)
      .single();

    if (phoneErr || !phoneRow) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 });
    }

    // 3. Compute 30-day renewal date
    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + 30);

    // 4. Assign phone number to winning bidder's org
    const { data: updatedPhone, error: updatePhoneErr } = await adminClient
      .from("phone_numbers")
      .update({
        is_assigned: true,
        status: "active",
        assigned_org_id: userOrgId,
        organization_id: userOrgId,
        renewal_date: renewalDate.toISOString(),
        bidding_enabled: false, // reset bidding
        updated_at: new Date().toISOString()
      })
      .eq("id", number_id)
      .select()
      .single();

    if (updatePhoneErr) {
      console.error("[Claim Bid] Update phone_numbers error:", updatePhoneErr);
      return NextResponse.json({ error: "Failed to assign phone number to your account" }, { status: 500 });
    }

    // 5. Mark winning bid as 'purchased'
    await adminClient
      .from("number_bids")
      .update({ status: "purchased", updated_at: new Date().toISOString() })
      .eq("id", winningBid.id);

    // 6. Mark all other bids for this number as 'lost'
    await adminClient
      .from("number_bids")
      .update({ status: "lost", updated_at: new Date().toISOString() })
      .eq("phone_number_id", number_id)
      .neq("id", winningBid.id);

    // 7. Insert notification
    await adminClient.from("notifications").insert({
      user_id: user.id,
      title: "Phone Number Priority Purchase Complete 🎉",
      message: `Congratulations! Phone number ${phoneRow.phone_number} has been claimed and assigned to your account.`,
      type: "number_assigned",
      is_read: false
    });

    // 8. Audit log
    await adminClient.from("audit_logs").insert({
      user_id: user.id,
      organization_id: userOrgId,
      action: "number_bid_claimed",
      resource_type: "phone_number",
      resource_id: number_id,
      new_values: {
        winning_bid_id: winningBid.id,
        amount_paisa: winningBid.bid_amount_paisa
      }
    });

    return NextResponse.json({
      success: true,
      message: `Phone number ${phoneRow.phone_number} successfully assigned to your account!`,
      data: updatedPhone
    });

  } catch (err: any) {
    console.error("[Claim Bid] Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
