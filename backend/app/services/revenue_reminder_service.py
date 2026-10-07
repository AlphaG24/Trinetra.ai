"""
Revenue Reminder & Weekly Digest Service for Trinetra AI.

Handles:
1. Automated 3-day reminder to business owners for unconfirmed quotes.
   - Guaranteed single-use (reminds only once via metadata flag).
   - Delivers one-click 'Closed' and 'Lost' action buttons.
2. Weekly revenue summary digest (Estimated pipeline vs Confirmed revenue, ROI).
"""

import os
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

from database import supabase_admin
from app.services.revenue_service import RevenueService
from app.services.notification_service import NotificationService

logger = logging.getLogger("RevenueReminderService")

class RevenueReminderService:
    @classmethod
    async def process_unconfirmed_reminders(cls) -> int:
        """
        Finds open revenue events older than 3 days that have not been reminded yet.
        Dispatches a polite WhatsApp / Telegram / Dashboard reminder with one-click action links.
        """
        if not RevenueService.is_feature_enabled():
            return 0

        now_utc = datetime.now(timezone.utc)
        three_days_ago = (now_utc - timedelta(days=3)).isoformat()

        try:
            # Query unconfirmed deals with quotes created >= 3 days ago
            res = await asyncio.to_thread(
                supabase_admin.table("revenue_events")
                .select("id, business_id, quoted_amount, currency, lead_id, call_id, metadata, created_at, leads(full_name, phone, company_name)")
                .eq("deal_status", "open")
                .not_.is_("quoted_amount", "null")
                .lte("created_at", three_days_ago)
                .limit(100)
                .execute
            )
            events = res.data or []
        except Exception as e:
            logger.error(f"[RevenueReminderService] Error querying unconfirmed quotes: {e}")
            return 0

        reminded_count = 0
        app_base = os.getenv("NEXT_PUBLIC_APP_URL", "https://trinetraedu-ai.com").rstrip("/")

        for ev in events:
            metadata = ev.get("metadata") or {}
            # Strict single-reminder guard
            if metadata.get("reminder_sent"):
                continue

            event_id = ev["id"]
            business_id = ev["business_id"]
            quoted_amt = float(ev.get("quoted_amount") or 0.0)
            currency = ev.get("currency", "INR")

            # Resolve prospect details
            lead_info = ev.get("leads") or {}
            prospect_name = lead_info.get("full_name") or metadata.get("caller_name") or "Prospect"
            prospect_phone = lead_info.get("phone") or metadata.get("caller_phone") or ""

            # Generate signed, expiring action tokens
            won_token = RevenueService.generate_action_token(event_id, business_id, "won")
            lost_token = RevenueService.generate_action_token(event_id, business_id, "lost")
            won_url = f"{app_base}/api/revenue/action?token={won_token}"
            lost_url = f"{app_base}/api/revenue/action?token={lost_token}"

            title = f"⏳ Deal Follow-Up: {prospect_name} ({currency} {quoted_amt:,.2f})"
            msg = (
                f"Hi! You quoted *{currency} {quoted_amt:,.2f}* to *{prospect_name}* 3 days ago.\n"
                f"Did this deal close or was it lost?\n\n"
                f"👉 [Mark Won ({currency} {quoted_amt:,.2f})]({won_url})\n"
                f"❌ [Mark Lost]({lost_url})"
            )

            try:
                await NotificationService.dispatch(
                    user_id=business_id,
                    event_type="new_lead",  # High priority channel alert
                    title=title,
                    message=msg,
                    payload={
                        "revenue_event_id": event_id,
                        "quoted_amount": quoted_amt,
                        "won_url": won_url,
                        "lost_url": lost_url,
                        "action_label": "Confirm Deal",
                        "action_url": won_url
                    }
                )

                # Mark reminder as sent to avoid repeated nagging
                updated_meta = {**metadata, "reminder_sent": True, "reminder_sent_at": now_utc.isoformat()}
                await asyncio.to_thread(
                    supabase_admin.table("revenue_events")
                    .update({"metadata": updated_meta})
                    .eq("id", event_id)
                    .execute
                )

                # Append to audit trail
                await asyncio.to_thread(
                    supabase_admin.table("revenue_audit_logs").insert({
                        "revenue_event_id": event_id,
                        "business_id": business_id,
                        "action": "unconfirmed_quote_reminder_sent",
                        "changed_by": "system_reminder_service",
                        "metadata": {"quoted_amount": quoted_amt}
                    }).execute
                )

                reminded_count += 1
                logger.info(f"[RevenueReminderService] Sent 3-day reminder for revenue_event {event_id} to business {business_id}")
            except Exception as d_err:
                logger.warning(f"[RevenueReminderService] Failed to dispatch reminder for event {event_id}: {d_err}")

        return reminded_count

    @classmethod
    async def send_weekly_revenue_digests(cls) -> int:
        """
        Dispatches a weekly Monday morning revenue summary digest to each active business owner.
        """
        if not RevenueService.is_feature_enabled():
            return 0

        # Fetch distinct business owners with revenue events or profiles
        try:
            p_res = await asyncio.to_thread(
                supabase_admin.table("profiles").select("id, email, full_name").limit(500).execute
            )
            profiles = p_res.data or []
        except Exception as e:
            logger.error(f"[RevenueReminderService] Error fetching profiles for weekly digest: {e}")
            return 0

        sent_count = 0
        app_base = os.getenv("NEXT_PUBLIC_APP_URL", "https://trinetraedu-ai.com").rstrip("/")

        for prof in profiles:
            user_id = prof["id"]
            user_name = prof.get("full_name") or "Partner"

            try:
                metrics = await RevenueService.get_business_revenue_metrics(business_id=user_id)
                pipeline = metrics["estimated_pipeline"]
                confirmed = metrics["confirmed_revenue"]
                won_count = metrics["deal_counts"]["won"]
                open_count = metrics["deal_counts"]["open"]
                roi_mult = metrics["roi_multiplier"]

                # Only dispatch if business has active activity or revenue
                if pipeline == 0 and confirmed == 0 and won_count == 0 and open_count == 0:
                    continue

                title = "📊 Your Weekly Trinetra Revenue Digest"
                msg = (
                    f"Good morning, {user_name}! Here is your revenue performance summary for this month:\n\n"
                    f"📈 *Estimated Pipeline:* ₹{pipeline:,.2f} ({open_count} active leads)\n"
                    f"💰 *Confirmed Revenue:* ₹{confirmed:,.2f} ({won_count} closed deals)\n"
                    f"🚀 *Estimated ROI:* {roi_mult}x return on your Trinetra investment\n\n"
                    f"👉 [View Revenue Analytics Dashboard]({app_base}/dashboard/revenue)"
                )

                await NotificationService.dispatch(
                    user_id=user_id,
                    event_type="weekly_report",
                    title=title,
                    message=msg,
                    payload={
                        "pipeline": pipeline,
                        "confirmed": confirmed,
                        "roi": roi_mult,
                        "action_url": f"{app_base}/dashboard/revenue",
                        "action_label": "View Revenue"
                    }
                )
                sent_count += 1
            except Exception as u_err:
                logger.warning(f"[RevenueReminderService] Error sending weekly digest to {user_id}: {u_err}")

        return sent_count
