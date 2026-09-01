"""
Number Auction Service Module
Handles background execution of expired phone line renewals, priority bidding claims,
and automatic pool return fallback.
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from supabase import create_client, Client

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "https://euoucnrjfucowzqdeqpy.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def get_admin_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def process_expired_number_auctions():
    """
    Daily scheduled function:
    1. Finds assigned numbers with expired renewal_date and bidding_enabled = True.
    2. Selects highest active bidder, marks bid as 'won', and alerts bidder.
    3. Handles 24h claim window expiration for previously won bids.
    4. Clears numbers with no bids back to the public available pool.
    """
    if not SUPABASE_SERVICE_KEY:
        logger.error("[Auction Service] Missing SUPABASE_SERVICE_ROLE_KEY!")
        return {"success": False, "error": "Missing service key"}

    supabase = get_admin_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    yesterday_iso = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

    results = {
        "auctions_processed": 0,
        "winners_notified": 0,
        "expired_claims": 0,
        "numbers_returned_to_pool": 0
    }

    try:
        # A. Check 24-hour claim window expiration for bids in 'won' status
        won_bids_res = supabase.table("number_bids") \
            .select("id, phone_number_id, organization_id, user_id, updated_at") \
            .eq("status", "won") \
            .lte("updated_at", yesterday_iso) \
            .execute()

        expired_won_bids = won_bids_res.data or []

        for bid in expired_won_bids:
            bid_id = bid["id"]
            phone_id = bid["phone_number_id"]

            # Mark this bid as lost due to 24h timeout
            supabase.table("number_bids").update({
                "status": "lost",
                "updated_at": now_iso
            }).eq("id", bid_id).execute()

            results["expired_claims"] += 1

            # Check if next highest active bid exists for this number
            next_bids_res = supabase.table("number_bids") \
                .select("*") \
                .eq("phone_number_id", phone_id) \
                .eq("status", "active") \
                .order("bid_amount_paisa", desc=True) \
                .limit(1) \
                .execute()

            next_bid = (next_bids_res.data or [None])[0]

            if next_bid:
                # Mark next highest bid as won
                supabase.table("number_bids").update({
                    "status": "won",
                    "updated_at": now_iso
                }).eq("id", next_bid["id"]).execute()

                # Notify next bidder
                phone_res = supabase.table("phone_numbers").select("phone_number").eq("id", phone_id).single().execute()
                phone_num = phone_res.data.get("phone_number", "") if phone_res.data else ""

                supabase.table("notifications").insert({
                    "user_id": next_bid["user_id"],
                    "title": "Winning Bid Priority Purchase Available! 🎯",
                    "message": f"Previous claim expired. You are now the top bidder for phone number {phone_num}! Complete your purchase within 24 hours at ₹{next_bid['bid_amount_paisa'] / 100:.2f}.",
                    "type": "auction_won",
                    "is_read": False
                }).execute()

                results["winners_notified"] += 1
            else:
                # Return number to available pool
                supabase.table("phone_numbers").update({
                    "is_assigned": False,
                    "status": "active",
                    "assigned_org_id": None,
                    "assigned_agent_id": None,
                    "organization_id": None,
                    "renewal_date": None,
                    "bidding_enabled": False,
                    "updated_at": now_iso
                }).eq("id", phone_id).execute()

                results["numbers_returned_to_pool"] += 1

        # B. Process expired assigned numbers where renewal_date < now() and bidding_enabled = True
        expired_numbers_res = supabase.table("phone_numbers") \
            .select("*") \
            .eq("is_assigned", True) \
            .eq("bidding_enabled", True) \
            .lt("renewal_date", now_iso) \
            .execute()

        expired_numbers = expired_numbers_res.data or []

        for phone in expired_numbers:
            phone_id = phone["id"]
            phone_num = phone["phone_number"]
            results["auctions_processed"] += 1

            # Fetch highest active bid
            top_bid_res = supabase.table("number_bids") \
                .select("*") \
                .eq("phone_number_id", phone_id) \
                .eq("status", "active") \
                .order("bid_amount_paisa", desc=True) \
                .limit(1) \
                .execute()

            top_bid = (top_bid_res.data or [None])[0]

            if top_bid:
                # 1. Mark top bid as 'won'
                supabase.table("number_bids").update({
                    "status": "won",
                    "updated_at": now_iso
                }).eq("id", top_bid["id"]).execute()

                # 2. Put number in pending state (keep is_assigned=True for 24h priority window)
                supabase.table("phone_numbers").update({
                    "status": "active",
                    "updated_at": now_iso
                }).eq("id", phone_id).execute()

                # 3. Notify winning bidder
                bid_rupees = top_bid["bid_amount_paisa"] / 100
                supabase.table("notifications").insert({
                    "user_id": top_bid["user_id"],
                    "title": "Auction Won: Priority Purchase Open! 🏆",
                    "message": f"Phone number {phone_num} owner did not renew. Complete your priority purchase within 24 hours at ₹{bid_rupees:.2f}.",
                    "type": "auction_won",
                    "is_read": False
                }).execute()

                results["winners_notified"] += 1
            else:
                # No bids: Return number directly to available pool
                supabase.table("phone_numbers").update({
                    "is_assigned": False,
                    "status": "active",
                    "assigned_org_id": None,
                    "assigned_agent_id": None,
                    "organization_id": None,
                    "renewal_date": None,
                    "bidding_enabled": False,
                    "updated_at": now_iso
                }).eq("id", phone_id).execute()

                results["numbers_returned_to_pool"] += 1

        logger.info(f"[Auction Service] Execution summary: {results}")
        return {"success": True, "data": results}

    except Exception as err:
        logger.error(f"[Auction Service] Error: {err}")
        return {"success": False, "error": str(err)}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    res = process_expired_number_auctions()
    print("Execution Result:", res)
