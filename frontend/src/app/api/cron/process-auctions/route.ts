import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET: Cron endpoint to process:
// 1. Expired 24-hour claim windows for winning bids
// 2. Pre-expiration alerts (3 days & 24 hours) for assigned phone numbers
// 3. Expired phone numbers (bidding priority winner or auto-release to pool)
// 4. Pre-expiration alerts (3 days & 24 hours) for voice agents
// 5. Expired agent subscriptions (Trinetra Dignity Quota Guarantee: keep active if minutes remain)
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
    const now = new Date();
    const nowIso = now.toISOString();
    const yesterdayIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const threeDaysFromNowIso = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const oneDayFromNowIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const summary = {
      auctions_processed: 0,
      winners_notified: 0,
      expired_claims: 0,
      numbers_returned_to_pool: 0,
      number_alerts_sent: 0,
      agent_alerts_sent: 0,
      agents_dignity_protected: 0,
      agents_paused: 0
    };

    // Helper: get primary user_id for an organization
    const orgUserCache = new Map<string, string>();
    async function getOrgUserId(orgId: string | null): Promise<string | null> {
      if (!orgId) return null;
      if (orgUserCache.has(orgId)) return orgUserCache.get(orgId)!;

      const { data: member } = await adminClient
        .from("profiles")
        .select("id")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (member?.id) {
        orgUserCache.set(orgId, member.id);
        return member.id;
      }
      return null;
    }

    // =========================================================================
    // 1. Handle expired 24-hour claim windows for bids in 'won' status
    // =========================================================================
    const { data: expiredWonBids, error: wonBidsErr } = await adminClient
      .from("number_bids")
      .select("id, phone_number_id, organization_id, user_id, updated_at")
      .eq("status", "won")
      .lte("updated_at", yesterdayIso);

    if (!wonBidsErr && expiredWonBids) {
      for (const bid of expiredWonBids) {
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
            action_url: "/dashboard/numbers",
            action_label: "Claim Number",
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
              expiry_alerts_sent: [],
              updated_at: nowIso
            })
            .eq("id", bid.phone_number_id);

          summary.numbers_returned_to_pool += 1;
        }
      }
    }

    // =========================================================================
    // 2. Pre-Expiration Alerts for Assigned Phone Numbers (3 Days & 24 Hours)
    // =========================================================================
    const { data: upcomingExpiringNumbers } = await adminClient
      .from("phone_numbers")
      .select("id, phone_number, renewal_date, organization_id, assigned_org_id, expiry_alerts_sent")
      .eq("is_assigned", true)
      .not("renewal_date", "is", null)
      .gt("renewal_date", nowIso)
      .lte("renewal_date", threeDaysFromNowIso);

    if (upcomingExpiringNumbers) {
      for (const phone of upcomingExpiringNumbers) {
        const renewalTime = new Date(phone.renewal_date).getTime();
        const diffMs = renewalTime - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        const alertsSent: string[] = Array.isArray(phone.expiry_alerts_sent)
          ? phone.expiry_alerts_sent
          : [];

        const targetOrgId = phone.organization_id || phone.assigned_org_id;
        const targetUserId = await getOrgUserId(targetOrgId);

        if (!targetUserId) continue;

        // 24 Hours Alert
        if (diffHours <= 24 && !alertsSent.includes("24_hours")) {
          await adminClient.from("notifications").insert({
            user_id: targetUserId,
            title: "Urgent: Phone Number Expiring in 24 Hours! 🚨",
            message: `Your phone number ${phone.phone_number} will expire in less than 24 hours. Please renew now to maintain inbound and outbound line connectivity.`,
            type: "warning",
            action_url: "/dashboard/numbers",
            action_label: "Renew Line",
            is_read: false
          });

          await adminClient
            .from("phone_numbers")
            .update({
              expiry_alerts_sent: [...alertsSent, "24_hours"],
              updated_at: nowIso
            })
            .eq("id", phone.id);

          summary.number_alerts_sent += 1;
        }
        // 3 Days Alert
        else if (diffHours <= 72 && !alertsSent.includes("3_days")) {
          const expiryDateFormatted = new Date(phone.renewal_date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
          });

          await adminClient.from("notifications").insert({
            user_id: targetUserId,
            title: "Phone Number Expiring Soon ⚠️",
            message: `Your virtual phone line ${phone.phone_number} is scheduled to expire on ${expiryDateFormatted}. Renew to avoid line release.`,
            type: "info",
            action_url: "/dashboard/numbers",
            action_label: "View Numbers",
            is_read: false
          });

          await adminClient
            .from("phone_numbers")
            .update({
              expiry_alerts_sent: [...alertsSent, "3_days"],
              updated_at: nowIso
            })
            .eq("id", phone.id);

          summary.number_alerts_sent += 1;
        }
      }
    }

    // =========================================================================
    // 3. Expired Assigned Phone Numbers (Bidding Check vs Universal Auto-Release)
    // =========================================================================
    const { data: expiredNumbers, error: expErr } = await adminClient
      .from("phone_numbers")
      .select("*")
      .eq("is_assigned", true)
      .not("renewal_date", "is", null)
      .lt("renewal_date", nowIso);

    if (!expErr && expiredNumbers) {
      for (const phone of expiredNumbers) {
        summary.auctions_processed += 1;
        const targetOrgId = phone.organization_id || phone.assigned_org_id;
        const targetUserId = await getOrgUserId(targetOrgId);

        if (phone.bidding_enabled) {
          // Check for top active bid
          const { data: topBids } = await adminClient
            .from("number_bids")
            .select("*")
            .eq("phone_number_id", phone.id)
            .eq("status", "active")
            .order("bid_amount_paisa", { ascending: false })
            .limit(1);

          const topBid = topBids?.[0];

          if (topBid) {
            await adminClient
              .from("number_bids")
              .update({ status: "won", updated_at: nowIso })
              .eq("id", topBid.id);

            await adminClient
              .from("phone_numbers")
              .update({ status: "active", updated_at: nowIso })
              .eq("id", phone.id);

            await adminClient.from("notifications").insert({
              user_id: topBid.user_id,
              title: "Auction Won: Priority Purchase Open! 🏆",
              message: `Phone number ${phone.phone_number} owner did not renew. Complete your priority purchase within 24 hours at ₹${(topBid.bid_amount_paisa / 100).toFixed(2)}.`,
              type: "auction_won",
              action_url: "/dashboard/numbers",
              action_label: "Purchase Now",
              is_read: false
            });

            summary.winners_notified += 1;
            continue;
          }
        }

        // Universal Auto-Release: Unassign and return standard number to pool
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
            expiry_alerts_sent: [],
            updated_at: nowIso
          })
          .eq("id", phone.id);

        if (targetUserId) {
          await adminClient.from("notifications").insert({
            user_id: targetUserId,
            title: "Phone Number Released to Pool 📞",
            message: `Your virtual phone line ${phone.phone_number} was not renewed and has been returned to the available number pool.`,
            type: "warning",
            action_url: "/dashboard/numbers",
            action_label: "Browse Numbers",
            is_read: false
          });
        }

        summary.numbers_returned_to_pool += 1;
      }
    }

    // =========================================================================
    // 4. Pre-Expiration Alerts for Voice Agents (3 Days & 24 Hours)
    // =========================================================================
    const { data: upcomingExpiringAgents } = await adminClient
      .from("agents")
      .select("id, name, user_id, organization_id, subscription_expires_at, minutes_limit, minutes_used, expiry_alerts_sent")
      .not("subscription_expires_at", "is", null)
      .gt("subscription_expires_at", nowIso)
      .lte("subscription_expires_at", threeDaysFromNowIso);

    if (upcomingExpiringAgents) {
      for (const agent of upcomingExpiringAgents) {
        const subTime = new Date(agent.subscription_expires_at).getTime();
        const diffHours = (subTime - now.getTime()) / (1000 * 60 * 60);

        const alertsSent: string[] = Array.isArray(agent.expiry_alerts_sent)
          ? agent.expiry_alerts_sent
          : [];

        const targetUserId = agent.user_id || (await getOrgUserId(agent.organization_id));
        if (!targetUserId) continue;

        // 24 Hours Alert
        if (diffHours <= 24 && !alertsSent.includes("24_hours")) {
          await adminClient.from("notifications").insert({
            user_id: targetUserId,
            title: `Agent Plan Expiring in 24h: "${agent.name}" ⏳`,
            message: `The subscription timeline for agent "${agent.name}" expires in 24 hours. Trinetra Dignity Guarantee: Any remaining call minutes will stay fully active until you consume them!`,
            type: "warning",
            action_url: "/dashboard/billing",
            action_label: "Extend Plan",
            is_read: false
          });

          await adminClient
            .from("agents")
            .update({
              expiry_alerts_sent: [...alertsSent, "24_hours"],
              updated_at: nowIso
            })
            .eq("id", agent.id);

          summary.agent_alerts_sent += 1;
        }
        // 3 Days Alert
        else if (diffHours <= 72 && !alertsSent.includes("3_days")) {
          const expiryFormatted = new Date(agent.subscription_expires_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
          });

          await adminClient.from("notifications").insert({
            user_id: targetUserId,
            title: `Agent Subscription Reminder: "${agent.name}" ⚠️`,
            message: `The active period for agent "${agent.name}" ends on ${expiryFormatted}. Unused voice minutes are never lost and will remain available after the period ends.`,
            type: "info",
            action_url: "/dashboard/billing",
            action_label: "View Billing",
            is_read: false
          });

          await adminClient
            .from("agents")
            .update({
              expiry_alerts_sent: [...alertsSent, "3_days"],
              updated_at: nowIso
            })
            .eq("id", agent.id);

          summary.agent_alerts_sent += 1;
        }
      }
    }

    // =========================================================================
    // 5. Expired Agent Subscriptions (Trinetra Dignity Quota Guarantee)
    // =========================================================================
    const { data: expiredAgents } = await adminClient
      .from("agents")
      .select("id, name, user_id, organization_id, subscription_expires_at, minutes_limit, minutes_used, status, expiry_alerts_sent")
      .not("subscription_expires_at", "is", null)
      .lt("subscription_expires_at", nowIso);

    if (expiredAgents) {
      for (const agent of expiredAgents) {
        const alertsSent: string[] = Array.isArray(agent.expiry_alerts_sent)
          ? agent.expiry_alerts_sent
          : [];

        if (alertsSent.includes("expired")) {
          // Already evaluated expiration
          continue;
        }

        const targetUserId = agent.user_id || (await getOrgUserId(agent.organization_id));
        const limit = agent.minutes_limit || 0;
        const used = agent.minutes_used || 0;
        const remainingMinutes = Math.max(0, limit - used);

        // TRINETRA DIGNITY QUOTA GUARANTEE:
        // If the user has remaining voice minutes, KEEP AGENT ACTIVE!
        if (remainingMinutes > 0) {
          if (targetUserId) {
            await adminClient.from("notifications").insert({
              user_id: targetUserId,
              title: `Dignity Quota Active: "${agent.name}" ✨`,
              message: `Your subscription duration for "${agent.name}" has completed, but you still have ${remainingMinutes} unused call minutes. As promised by Trinetra AI, your agent stays fully operational until your minutes are finished!`,
              type: "info",
              action_url: "/dashboard/billing",
              action_label: "Top-Up Minutes",
              is_read: false
            });
          }

          await adminClient
            .from("agents")
            .update({
              expiry_alerts_sent: [...alertsSent, "expired"],
              updated_at: nowIso
            })
            .eq("id", agent.id);

          summary.agents_dignity_protected += 1;
        } else {
          // Quota is 0 and timeline expired -> Pause agent
          await adminClient
            .from("agents")
            .update({
              status: "paused",
              expiry_alerts_sent: [...alertsSent, "expired"],
              updated_at: nowIso
            })
            .eq("id", agent.id);

          if (targetUserId) {
            await adminClient.from("notifications").insert({
              user_id: targetUserId,
              title: `Agent Paused: "${agent.name}" 🛑`,
              message: `Agent "${agent.name}" has completed its plan duration and all call minutes have been consumed. Please renew your plan or add minutes to resume operations.`,
              type: "warning",
              action_url: "/dashboard/billing",
              action_label: "Renew Agent",
              is_read: false
            });
          }

          summary.agents_paused += 1;
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
