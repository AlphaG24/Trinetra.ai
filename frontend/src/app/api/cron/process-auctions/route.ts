import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET: Cron endpoint to process expired phone line auctions & 24-hour claim window timeouts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secretParam = searchParams.get("secret");
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Validate authorization (if CRON_SECRET is configured)
    if (cronSecret) {
      const isHeaderValid = authHeader === `Bearer ${cronSecret}`;
      const isParamValid = secretParam === cronSecret;
      if (!isHeaderValid && !isParamValid) {
        return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
      }
    }

    const adminClient = getAdminClient();
    const nowIso = new Date().toISOString();
    const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const summary = {
      auctions_processed: 0,
      winners_notified: 0,
      expired_claims: 0,
      numbers_returned_to_pool: 0
    };

    // 1. Handle expired 24-hour claim windows for bids in 'won' status
    const { data: expiredWonBids, error: wonBidsErr } = await adminClient
      .from("number_bids")
      .select("id, phone_number_id, organization_id, user_id, updated_at")
      .eq("status", "won")
      .lte("updated_at", yesterdayIso);

    if (!wonBidsErr && expiredWonBids) {
      for (const bid of expiredWonBids) {
        // Mark bid as lost
        await adminClient
          .from("number_bids")
          .update({ status: "lost", updated_at: nowIso })
          .eq("id", bid.id);

        summary.expired_claims += 1;

        // Check for next highest active bid
        const { data: nextBids } = await adminClient
          .from("number_bids")
          .select("*")
          .eq("phone_number_id", bid.phone_number_id)
          .eq("status", "active")
          .order("bid_amount_paisa", { ascending: false })
          .limit(1);

        const nextBid = nextBids?.[0];

        if (nextBid) {
          // Promote next bid to won
          await adminClient
            .from("number_bids")
            .update({ status: "won", updated_at: nowIso })
            .eq("id", nextBid.id);

          const { data: phoneRow } = await adminClient
            .from("phone_numbers")
            .select("phone_number")
            .eq("id", bid.phone_number_id)
            .single();

          await adminClient.from("notifications").insert({
            user_id: nextBid.user_id,
            title: "Winning Bid Priority Purchase Available! 🎯",
            message: `Previous claim window expired. You are now the top bidder for phone number ${phoneRow?.phone_number || ""}! Claim within 24 hours at ₹${(nextBid.bid_amount_paisa / 100).toFixed(2)}.`,
            type: "auction_won",
            is_read: false
          });

          summary.winners_notified += 1;
        } else {
          // Unassign and return to pool
          await adminClient
            .from("phone_numbers")
            .update({
              is_assigned: false,
              status: "active",
              assigned_org_id: null,
              assigned_agent_id: null,
              organization_id: null,
              renewal_date: null,
              bidding_enabled: false,
              updated_at: nowIso
            })
            .eq("id", bid.phone_number_id);

          summary.numbers_returned_to_pool += 1;
        }
      }
    }

    // 2. Handle expired assigned numbers with bidding_enabled = true
    const { data: expiredNumbers, error: expErr } = await adminClient
      .from("phone_numbers")
      .select("*")
      .eq("is_assigned", true)
      .eq("bidding_enabled", true)
      .lt("renewal_date", nowIso);

    if (!expErr && expiredNumbers) {
      for (const phone of expiredNumbers) {
        summary.auctions_processed += 1;

        // Fetch top active bid
        const { data: topBids } = await adminClient
          .from("number_bids")
          .select("*")
          .eq("phone_number_id", phone.id)
          .eq("status", "active")
          .order("bid_amount_paisa", { ascending: false })
          .limit(1);

        const topBid = topBids?.[0];

        if (topBid) {
          // Mark top bid as won
          await adminClient
            .from("number_bids")
            .update({ status: "won", updated_at: nowIso })
            .eq("id", topBid.id);

          // Update phone status
          await adminClient
            .from("phone_numbers")
            .update({ status: "active", updated_at: nowIso })
            .eq("id", phone.id);

          // Notify winner
          await adminClient.from("notifications").insert({
            user_id: topBid.user_id,
            title: "Auction Won: Priority Purchase Open! 🏆",
            message: `Phone number ${phone.phone_number} owner did not renew. Complete your priority purchase within 24 hours at ₹${(topBid.bid_amount_paisa / 100).toFixed(2)}.`,
            type: "auction_won",
            is_read: false
          });

          summary.winners_notified += 1;
        } else {
          // Unassign to available pool
          await adminClient
            .from("phone_numbers")
            .update({
              is_assigned: false,
              status: "active",
              assigned_org_id: null,
              assigned_agent_id: null,
              organization_id: null,
              renewal_date: null,
              bidding_enabled: false,
              updated_at: nowIso
            })
            .eq("id", phone.id);

          summary.numbers_returned_to_pool += 1;
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: nowIso,
      summary
    });

  } catch (err: any) {
    console.error("[Cron Process Auctions API] Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
