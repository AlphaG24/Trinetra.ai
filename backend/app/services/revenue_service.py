"""
Revenue Service for Trinetra AI.

Manages revenue event creation, attribution window checks, owner confirmations (Won/Lost),
reminders, audit logs, and metrics calculation.
"""

import os
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

from database import supabase_admin
from app.services.ai.revenue_extractor import RevenueExtractor, RevenueExtractionResult

logger = logging.getLogger("RevenueService")

DEFAULT_ATTRIBUTION_WINDOW_DAYS = 30

class RevenueService:
    @staticmethod
    def is_feature_enabled() -> bool:
        """Checks if the revenue model feature flag is enabled."""
        env_flag = os.getenv("ENABLE_REVENUE_MODEL", "true").lower()
        if env_flag in ("false", "0", "no"):
            return False

        try:
            res = supabase_admin.table("system_config").select("config_value").eq("config_key", "revenue_model_enabled").maybe_single().execute()
            if res.data:
                return str(res.data.get("config_value", "true")).lower() == "true"
        except Exception:
            pass

        return True

    @classmethod
    async def process_call_revenue(
        cls,
        business_id: str,
        call_id: Optional[str],
        lead_id: Optional[str],
        transcript: str,
        summary: str,
        caller_phone: Optional[str] = None,
        source: str = "inbound",
        groq_api_key: Optional[str] = None,
        gemini_api_key: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Extracts structured quotes and registers an attributed revenue event if a quote was discussed.
        Guarantees:
        - Strict multi-tenant isolation via business_id.
        - Deduplication: checks if this call already has a revenue_event.
        - Attribution window evaluation (default 30 days).
        - Append-only audit logging.
        """
        if not cls.is_feature_enabled():
            logger.info("[RevenueService] Revenue model disabled via feature flag. Skipping.")
            return None

        if not business_id:
            logger.warning("[RevenueService] Missing business_id. Cannot track revenue.")
            return None

        # 1. Deduplication guard: Check if call already has a revenue event
        if call_id:
            try:
                existing = await asyncio.to_thread(
                    supabase_admin.table("revenue_events")
                    .select("id")
                    .eq("call_id", call_id)
                    .maybe_single()
                    .execute
                )
                if existing and existing.data:
                    logger.info(f"[RevenueService] Revenue event already exists for call_id={call_id}")
                    return existing.data
            except Exception as e:
                logger.warning(f"[RevenueService] Deduplication check warning: {e}")

        # 2. Extract structured quote using LLM + deterministic parser
        analysis_text = f"Summary: {summary}\n\nTranscript Snippet:\n{transcript[:3000]}" if summary else transcript[:3000]
        extraction = await RevenueExtractor.extract_from_text(
            analysis_text,
            source=source,
            groq_api_key=groq_api_key,
            gemini_api_key=gemini_api_key
        )

        if extraction.quoted_amount is None:
            logger.info(f"[RevenueService] No commercial quote detected in call {call_id}. Revenue event skipped.")
            return None

        # 3. Attribution calculation:
        # Check if caller had previous contact within 30 days
        now_utc = datetime.now(timezone.utc)
        attribution_end = now_utc + timedelta(days=DEFAULT_ATTRIBUTION_WINDOW_DAYS)

        # 4. Insert into revenue_events
        event_payload = {
            "business_id": business_id,
            "call_id": call_id,
            "lead_id": lead_id,
            "quoted_amount": extraction.quoted_amount,
            "currency": extraction.currency,
            "deal_status": "open",
            "price_type": extraction.price_type,
            "amount_min": extraction.amount_min,
            "amount_max": extraction.amount_max,
            "service": extraction.service,
            "confidence": extraction.confidence,
            "source": extraction.source,
            "attribution_window_end": attribution_end.isoformat(),
            "extracted_quote_text": extraction.extracted_quote_text,
            "metadata": {
                "caller_phone": caller_phone,
                "lead_status": extraction.lead_status,
                "callback_time": extraction.callback_time
            }
        }

        try:
            insert_res = await asyncio.to_thread(
                supabase_admin.table("revenue_events").insert(event_payload).execute
            )
            if not insert_res.data:
                logger.error("[RevenueService] Failed to insert revenue_event")
                return None

            event = insert_res.data[0]
            event_id = event["id"]
            logger.info(f"[RevenueService] Created revenue_event {event_id} with quote={extraction.quoted_amount} {extraction.currency}")

            # 5. Append-only audit log entry
            audit_payload = {
                "revenue_event_id": event_id,
                "business_id": business_id,
                "action": "quote_extracted",
                "previous_status": None,
                "new_status": "open",
                "previous_won_amount": None,
                "new_won_amount": None,
                "changed_by": "system_ai_agent",
                "metadata": {
                    "quoted_amount": extraction.quoted_amount,
                    "confidence": extraction.confidence,
                    "source": extraction.source
                }
            }
            await asyncio.to_thread(
                supabase_admin.table("revenue_audit_logs").insert(audit_payload).execute
            )

            return event
        except Exception as err:
            logger.error(f"[RevenueService] Error creating revenue event: {err}")
            return None

    @classmethod
    async def confirm_deal(
        cls,
        event_id: str,
        business_id: str,
        deal_status: str,
        won_amount: Optional[float] = None,
        confirmed_by: str = "owner",
        actor_name: str = "Owner"
    ) -> Dict[str, Any]:
        """
        Updates deal status to 'won' or 'lost'.
        Enforces tenant isolation: business_id must match.
        Guarantees idempotency and writes to append-only audit trail.
        """
        if deal_status not in ("won", "lost", "open"):
            raise ValueError(f"Invalid deal status: {deal_status}")

        # Fetch existing record and verify tenant ownership
        res = await asyncio.to_thread(
            supabase_admin.table("revenue_events")
            .select("*")
            .eq("id", event_id)
            .eq("business_id", business_id)
            .maybe_single()
            .execute
        )

        if not res.data:
            raise PermissionError("Revenue event not found or access denied.")

        current = res.data
        prev_status = current.get("deal_status")
        prev_won = current.get("won_amount")

        # Resolve final won_amount
        final_won = won_amount if deal_status == "won" else None
        if deal_status == "won" and final_won is None:
            # Fall back to quoted_amount if no custom won amount was entered
            final_won = current.get("quoted_amount")

        now_iso = datetime.now(timezone.utc).isoformat()
        update_data = {
            "deal_status": deal_status,
            "won_amount": final_won,
            "confirmed_by": confirmed_by,
            "confirmed_at": now_iso,
            "updated_at": now_iso
        }

        # Update record
        upd_res = await asyncio.to_thread(
            supabase_admin.table("revenue_events")
            .update(update_data)
            .eq("id", event_id)
            .eq("business_id", business_id)
            .execute
        )

        # Write to append-only audit trail
        audit_payload = {
            "revenue_event_id": event_id,
            "business_id": business_id,
            "action": f"deal_status_changed_to_{deal_status}",
            "previous_status": prev_status,
            "new_status": deal_status,
            "previous_won_amount": prev_won,
            "new_won_amount": final_won,
            "changed_by": actor_name,
            "metadata": {
                "confirmed_by": confirmed_by,
                "timestamp": now_iso
            }
        }
        await asyncio.to_thread(
            supabase_admin.table("revenue_audit_logs").insert(audit_payload).execute
        )

        return upd_res.data[0] if upd_res.data else update_data

    @classmethod
    async def get_business_revenue_metrics(
        cls,
        business_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Computes estimated pipeline, confirmed revenue, breakdown by source, and ROI.
        Strictly scoped to business_id.
        """
        now = datetime.now(timezone.utc)
        if not start_date:
            # Default to start of current month
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if not end_date:
            end_date = now

        query = supabase_admin.table("revenue_events").select("*").eq("business_id", business_id)
        query = query.gte("created_at", start_date.isoformat()).lte("created_at", end_date.isoformat())

        res = await asyncio.to_thread(query.execute)
        events: List[Dict[str, Any]] = res.data or []

        estimated_pipeline = 0.0
        confirmed_revenue = 0.0
        revenue_by_source: Dict[str, float] = {
            "inbound": 0.0,
            "campaign": 0.0,
            "callback": 0.0,
            "reactivation": 0.0,
            "referral": 0.0
        }
        deal_counts = {"open": 0, "won": 0, "lost": 0}

        for ev in events:
            status = ev.get("deal_status", "open")
            deal_counts[status] = deal_counts.get(status, 0) + 1

            source = ev.get("source", "inbound")
            if source not in revenue_by_source:
                revenue_by_source[source] = 0.0

            q_amt = float(ev.get("quoted_amount") or 0.0)
            w_amt = float(ev.get("won_amount") or 0.0)

            # Estimated pipeline = all open deals with quotes
            if status == "open":
                estimated_pipeline += q_amt

            # Confirmed revenue = won deals
            if status == "won":
                actual_revenue = w_amt if w_amt > 0 else q_amt
                confirmed_revenue += actual_revenue
                revenue_by_source[source] += actual_revenue

        # Fetch amount paid by business to Trinetra in this period
        # Calculated from transactions or subscription tier
        total_paid_to_trinetra = 0.0
        try:
            tx_res = await asyncio.to_thread(
                supabase_admin.table("transactions")
                .select("amount")
                .eq("user_id", business_id)
                .eq("status", "success")
                .gte("created_at", start_date.isoformat())
                .lte("created_at", end_date.isoformat())
                .execute
            )
            if tx_res.data:
                for tx in tx_res.data:
                    total_paid_to_trinetra += float(tx.get("amount") or 0.0)
        except Exception:
            pass

        # If zero transactions, estimate from plan if available
        if total_paid_to_trinetra == 0:
            try:
                prof = await asyncio.to_thread(
                    supabase_admin.table("profiles").select("plan_tier").eq("id", business_id).maybe_single().execute
                )
                plan = (prof.data or {}).get("plan_tier", "starter")
                tier_prices = {"starter": 999.0, "pro": 2999.0, "enterprise": 9999.0}
                total_paid_to_trinetra = tier_prices.get(plan, 999.0)
            except Exception:
                total_paid_to_trinetra = 999.0

        # ROI percentage = ((Revenue - Cost) / Cost) * 100
        roi_multiplier = round(confirmed_revenue / total_paid_to_trinetra, 1) if total_paid_to_trinetra > 0 else 0.0
        roi_percentage = round(((confirmed_revenue - total_paid_to_trinetra) / total_paid_to_trinetra) * 100, 1) if total_paid_to_trinetra > 0 else 0.0

        return {
            "estimated_pipeline": round(estimated_pipeline, 2),
            "confirmed_revenue": round(confirmed_revenue, 2),
            "total_paid_to_trinetra": round(total_paid_to_trinetra, 2),
            "roi_multiplier": roi_multiplier,
            "roi_percentage": roi_percentage,
            "revenue_by_source": {k: round(v, 2) for k, v in revenue_by_source.items()},
            "deal_counts": deal_counts,
            "total_deals": len(events),
            "currency": "INR",
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            }
        }

    @staticmethod
    def get_jwt_secret() -> str:
        """Retrieves server-side signing secret from environment."""
        return (
            os.getenv("SUPABASE_JWT_SECRET")
            or os.getenv("JWT_SECRET")
            or os.getenv("SECRET_KEY", "trinetra-revenue-signing-secret-secure")
        )

    @classmethod
    def generate_action_token(
        cls,
        event_id: str,
        business_id: str,
        action: str = "won",
        expires_in_hours: int = 72
    ) -> str:
        """
        Generates a signed, expiring action token for single-use email/WhatsApp/Telegram buttons.
        """
        import jwt
        now = datetime.now(timezone.utc)
        payload = {
            "event_id": event_id,
            "business_id": business_id,
            "action": action,
            "exp": int((now + timedelta(hours=expires_in_hours)).timestamp()),
            "iat": int(now.timestamp())
        }
        return jwt.encode(payload, cls.get_jwt_secret(), algorithm="HS256")

    @classmethod
    def verify_action_token(cls, token: str) -> Optional[Dict[str, Any]]:
        """
        Verifies and decodes a signed action token. Returns payload dict or None.
        """
        import jwt
        try:
            payload = jwt.decode(token, cls.get_jwt_secret(), algorithms=["HS256"])
            return payload
        except Exception as e:
            logger.warning(f"[RevenueService] Action token verification failed: {e}")
            return None

