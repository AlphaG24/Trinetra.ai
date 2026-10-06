"""
backend/app/services/number_lifecycle_service.py

Virtual Number Lifecycle Engine (Grace Period, Hold Period & Missed Call Digests).
Implements Master Plan Section 18.7 (Authoritative Overrides).

Core Mandates:
1. No 90-Day Cooling:
   - Callers hear a neutral, professional "currently unavailable" message immediately upon expiration.
2. 15-Day Grace Period:
   - Customer retains ownership/reservation of the number.
   - Alternate-day reminders sent to owner.
   - Inbound calls tracked as missed calls.
3. 14-Day Administrative Hold Period:
   - Begins after 15-day grace period expires without renewal.
   - Prevents immediate third-party pool reassignment.
   - Neutral unavailable message continues.
4. Missed Call Tracking & Daily Digest:
   - Inbound calls during grace & hold logged with caller masking.
   - Aggregated into daily digest with one-click reactivation link.
5. Reactivation Workflow:
   - One-click restoration back to 'active' upon wallet renewal / top-up.
"""

import os
import secrets
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple

from database import supabase_admin

logger = logging.getLogger("NumberLifecycleService")

# Lifecycle Constants
GRACE_PERIOD_DAYS = 15
DEFAULT_HOLD_PERIOD_DAYS = int(os.getenv("HOLD_PERIOD_DAYS", "14"))
TOTAL_LIFECYCLE_DAYS = GRACE_PERIOD_DAYS + DEFAULT_HOLD_PERIOD_DAYS

NEUTRAL_UNAVAILABLE_MESSAGE = (
    "The number you have dialed is currently unavailable. Please try again later."
)
NEUTRAL_TWIML_RESPONSE = (
    f'<?xml version="1.0" encoding="UTF-8"?>\n'
    f"<Response>\n"
    f"    <Say voice=\"Polly.Aditi\">{NEUTRAL_UNAVAILABLE_MESSAGE}</Say>\n"
    f"    <Hangup/>\n"
    f"</Response>"
)


class NumberLifecycleService:
    """Enterprise management engine for virtual phone number lifecycle states."""

    _running: bool = False
    _worker_task: Optional[asyncio.Task] = None
    _poll_interval_seconds: int = 1800  # Run every 30 minutes

    @classmethod
    def start_worker(cls):
        """Start background lifecycle transition scheduler task."""
        if cls._running:
            logger.info("[NumberLifecycleService] Worker is already running.")
            return

        cls._running = True
        cls._worker_task = asyncio.create_task(cls._worker_loop())
        logger.info("[NumberLifecycleService] Background automated lifecycle worker started.")

    @classmethod
    def stop_worker(cls):
        """Stop background worker."""
        cls._running = False
        if cls._worker_task:
            cls._worker_task.cancel()
            cls._worker_task = None
        logger.info("[NumberLifecycleService] Background automated lifecycle worker stopped.")

    @classmethod
    async def _worker_loop(cls):
        """Main polling loop for number lifecycle transitions."""
        while cls._running:
            try:
                service = cls()
                service.process_lifecycle_transitions()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[NumberLifecycleService] Unexpected error in worker loop: {e}", exc_info=True)

            try:
                await asyncio.sleep(cls._poll_interval_seconds)
            except asyncio.CancelledError:
                break

    def __init__(self, supabase_client=None):
        self.supabase = supabase_client or supabase_admin

    # -------------------------------------------------------------------------
    # Helper: PII-Safe Phone Masking
    # -------------------------------------------------------------------------
    @staticmethod
    def mask_phone_number(phone: str) -> str:
        """
        Masks the middle 5 digits of a phone number for PII compliance.
        E.g. '+919876543210' -> '+9198XXXXX210'
        """
        if not phone or len(phone) < 7:
            return "****"
        clean = phone.strip()
        prefix = clean[:5]
        suffix = clean[-3:]
        masked_len = max(len(clean) - 8, 3)
        return f"{prefix}{'X' * masked_len}{suffix}"

    # -------------------------------------------------------------------------
    # 1. Expire Number (Transition to Grace Period)
    # -------------------------------------------------------------------------
    def expire_number(
        self,
        phone_number_id: str,
        organization_id: Optional[str] = None,
        custom_hold_days: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Marks an active number as expired, transitioning it immediately into 15-day grace period.
        Revokes and disconnects it from any connected agent per Master Plan Section 18.7.
        """
        now = datetime.now(timezone.utc)
        grace_ends = now + timedelta(days=GRACE_PERIOD_DAYS)
        hold_days = custom_hold_days or DEFAULT_HOLD_PERIOD_DAYS
        hold_ends = grace_ends + timedelta(days=hold_days)
        reactivation_token = secrets.token_urlsafe(32)

        # 1. Fetch current phone number record to resolve phone string and tenant
        num_query = self.supabase.table("phone_numbers").select("*").eq("id", phone_number_id)
        num_res = num_query.execute()

        if not num_res.data or len(num_res.data) == 0:
            raise ValueError(f"Phone number not found: {phone_number_id}")

        num_data = num_res.data[0]
        phone_str = num_data.get("phone_number")
        assigned_agent_id = num_data.get("assigned_agent_id")
        resolved_org_id = num_data.get("organization_id") or organization_id

        # If org not directly on phone_number, attempt to find from agent junction
        if not resolved_org_id:
            try:
                apn_res = self.supabase.table("agent_phone_numbers").select("agent_id").eq("phone_number_id", phone_number_id).limit(1).execute()
                if apn_res.data and len(apn_res.data) > 0:
                    found_agent_id = apn_res.data[0]["agent_id"]
                    assigned_agent_id = assigned_agent_id or found_agent_id
                    agent_res = self.supabase.table("agents").select("organization_id").eq("id", found_agent_id).limit(1).execute()
                    if agent_res.data and len(agent_res.data) > 0:
                        resolved_org_id = agent_res.data[0].get("organization_id")
            except Exception as e:
                logger.warning(f"Error checking agent org for {phone_number_id}: {e}")

        # 2. Update phone_numbers table
        update_payload = {
            "status": "grace_period",
            "is_assigned": False,
            "assigned_agent_id": None,
            "expired_at": now.isoformat(),
            "grace_period_ends_at": grace_ends.isoformat(),
            "hold_period_ends_at": hold_ends.isoformat(),
            "missed_calls_count": 0,
            "reactivation_token": reactivation_token,
            "updated_at": now.isoformat(),
        }
        if resolved_org_id:
            update_payload["organization_id"] = resolved_org_id
            update_payload["assigned_org_id"] = resolved_org_id

        res = self.supabase.table("phone_numbers").update(update_payload).eq("id", phone_number_id).execute()

        # 3. REVOCATION: Unlink from agent_phone_numbers junction table
        try:
            self.supabase.table("agent_phone_numbers").delete().eq("phone_number_id", phone_number_id).execute()
        except Exception as e:
            logger.warning(f"Error unlinking agent_phone_numbers for {phone_number_id}: {e}")

        # 4. REVOCATION: Clear phone_number on agents table
        if phone_str:
            try:
                self.supabase.table("agents").update({
                    "phone_number": None,
                    "telephony_provider": "simulated"
                }).eq("phone_number", phone_str).execute()
            except Exception as e:
                logger.warning(f"Error clearing agents.phone_number for {phone_str}: {e}")

        if assigned_agent_id:
            try:
                self.supabase.table("agents").update({
                    "phone_number": None,
                    "telephony_provider": "simulated"
                }).eq("id", assigned_agent_id).execute()
            except Exception as e:
                logger.warning(f"Error clearing agent {assigned_agent_id}: {e}")

        # 5. Also sync phone_number_pool if number exists there
        try:
            self.supabase.table("phone_number_pool").update({
                "assigned_agent_id": None,
                "updated_at": now.isoformat()
            }).eq("phone_number", phone_str).execute()
        except Exception as e:
            logger.debug(f"Note on pool sync: {e}")

        # 6. IN-APP USER NOTIFICATION: Inform tenant that number entered 15-day grace period
        target_user_ids = set()
        if resolved_org_id:
            try:
                prof_res = self.supabase.table("profiles").select("id").eq("organization_id", resolved_org_id).execute()
                for p in (prof_res.data or []):
                    target_user_ids.add(p["id"])
            except Exception as e:
                logger.warning(f"Error querying profiles for org {resolved_org_id}: {e}")

        # Also notify agent owner if present
        if assigned_agent_id:
            try:
                agent_user = self.supabase.table("agents").select("user_id").eq("id", assigned_agent_id).limit(1).execute()
                if agent_user.data and agent_user.data[0].get("user_id"):
                    target_user_ids.add(agent_user.data[0]["user_id"])
            except Exception:
                pass

        if not target_user_ids:
            try:
                admin_res = self.supabase.table("profiles").select("id").in_("role", ["super_admin", "admin"]).execute()
                for p in (admin_res.data or []):
                    target_user_ids.add(p["id"])
            except Exception:
                pass

        formatted_grace_end = grace_ends.strftime("%d %b %Y")
        for uid in target_user_ids:
            try:
                self.supabase.table("notifications").insert({
                    "user_id": uid,
                    "title": "Virtual Number Entered 15-Day Grace Period",
                    "message": (
                        f"Your virtual number {phone_str or ''} pack has expired and is now in a 15-day grace period until {formatted_grace_end}. "
                        f"The number has been unlinked from your AI agent to prevent dropped calls. Please renew your number to restore live calling."
                    ),
                    "type": "warning",
                    "action_url": "/dashboard/phone-numbers",
                    "action_label": "Renew Number",
                    "is_read": False,
                    "created_at": now.isoformat(),
                }).execute()
                logger.info(f"Grace period notification created for user {uid} on number {phone_str}")
            except Exception as e:
                logger.warning(f"Error inserting grace notification for {uid}: {e}")

        logger.info(
            f"Number {phone_number_id} ({phone_str}) entered 15-day grace period until {grace_ends.isoformat()}. "
            f"Revoked from all agents. User notifications sent."
        )
        return res.data[0] if res.data else update_payload

    # -------------------------------------------------------------------------
    # 2. Inbound Webhook Call Check & Missed Call Logging
    # -------------------------------------------------------------------------
    def check_inbound_call_lifecycle(
        self,
        called_number: str,
        caller_number: str,
    ) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        """
        Checks if called number is in grace_period or hold_period.
        If yes:
          - Logs missed call record in number_lifecycle_missed_calls.
          - Increments phone_numbers.missed_calls_count.
          - Returns (True, NEUTRAL_TWIML_RESPONSE, details).
        If no:
          - Returns (False, "", None).
        """
        clean_called = called_number.replace("+", "").strip()
        res = (
            self.supabase.table("phone_numbers")
            .select("id, organization_id, phone_number, status, reactivation_token, missed_calls_count")
            .or_(f"phone_number.eq.{called_number},phone_number.eq.+{clean_called},phone_number.eq.{clean_called}")
            .limit(1)
            .execute()
        )

        if not res.data or len(res.data) == 0:
            return False, "", None

        row = res.data[0]
        status = row.get("status")

        if status not in ("grace_period", "hold_period"):
            return False, "", None

        phone_id = row["id"]
        org_id = row["organization_id"]
        now_iso = datetime.now(timezone.utc).isoformat()
        masked_caller = self.mask_phone_number(caller_number)

        # 1. Log missed call record
        missed_record = {
            "phone_number_id": phone_id,
            "organization_id": org_id,
            "caller_number": caller_number,
            "caller_number_masked": masked_caller,
            "called_number": called_number,
            "lifecycle_stage": status,
            "neutral_message_played": NEUTRAL_UNAVAILABLE_MESSAGE,
            "created_at": now_iso,
        }
        self.supabase.table("number_lifecycle_missed_calls").insert(missed_record).execute()

        # 2. Increment missed calls counter on phone_numbers
        current_count = row.get("missed_calls_count", 0) or 0
        self.supabase.table("phone_numbers").update({
            "missed_calls_count": current_count + 1,
            "updated_at": now_iso,
        }).eq("id", phone_id).execute()

        details = {
            "phone_number_id": phone_id,
            "organization_id": org_id,
            "lifecycle_stage": status,
            "caller_masked": masked_caller,
            "missed_calls_count": current_count + 1,
            "message": NEUTRAL_UNAVAILABLE_MESSAGE,
        }

        logger.info(f"Neutral unavailable message played for {status} number {called_number}; missed call logged.")
        return True, NEUTRAL_TWIML_RESPONSE, details

    # -------------------------------------------------------------------------
    # 3. Automated Lifecycle State Progression (Cron Worker)
    # -------------------------------------------------------------------------
    def process_lifecycle_transitions(self) -> Dict[str, Any]:
        """
        Background transition engine:
        - Scans 'active' numbers with expired renewal_date or exceeded validity and moves them to 'grace_period'.
        - Moves numbers from grace_period to hold_period once grace_period_ends_at is passed.
        - Moves numbers from hold_period to released / quarantined once hold_period_ends_at is passed.
        """
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        # 1. Sweep active numbers whose validity/renewal has expired
        res_active = (
            self.supabase.table("phone_numbers")
            .select("id, organization_id, phone_number, renewal_date, provisioned_at, validity_days")
            .eq("status", "active")
            .execute()
        )
        active_numbers = res_active.data or []
        moved_to_grace = []

        for num in active_numbers:
            # Only expire numbers allocated to tenants or assigned to agents.
            # Unallocated platform inventory remains active in the available pool.
            is_allocated = bool(num.get("organization_id"))
            if not is_allocated:
                try:
                    apn = self.supabase.table("agent_phone_numbers").select("agent_id").eq("phone_number_id", num["id"]).limit(1).execute()
                    if apn.data and len(apn.data) > 0:
                        is_allocated = True
                except Exception:
                    pass

            if not is_allocated:
                continue

            expired = False
            # Check renewal_date
            renewal_str = num.get("renewal_date")
            if renewal_str:
                renewal_dt = datetime.fromisoformat(renewal_str.replace("Z", "+00:00"))
                if now >= renewal_dt:
                    expired = True
            # Check provisioned_at + validity_days (fallback if renewal_date not set)
            elif num.get("provisioned_at"):
                prov_dt = datetime.fromisoformat(num["provisioned_at"].replace("Z", "+00:00"))
                validity = num.get("validity_days") or 30
                if now >= (prov_dt + timedelta(days=validity)):
                    expired = True

            if expired:
                try:
                    self.expire_number(num["id"], organization_id=num.get("organization_id"))
                    moved_to_grace.append(num["id"])
                    logger.info(f"[Cron] Active number {num.get('phone_number')} (id: {num['id']}) expired -> transitioned to grace_period.")
                except Exception as e:
                    logger.error(f"[Cron] Failed to expire active number {num['id']}: {e}")

        # 2. Check Grace -> Hold
        res_grace = (
            self.supabase.table("phone_numbers")
            .select("id, organization_id, phone_number, grace_period_ends_at, hold_period_ends_at")
            .eq("status", "grace_period")
            .execute()
        )
        grace_numbers = res_grace.data or []

        res_hold = (
            self.supabase.table("phone_numbers")
            .select("id, organization_id, phone_number, hold_period_ends_at")
            .eq("status", "hold_period")
            .execute()
        )
        hold_numbers = res_hold.data or []

        moved_to_hold = []
        moved_to_released = []

        for num in grace_numbers:
            ends_at_str = num.get("grace_period_ends_at")
            if ends_at_str:
                ends_at = datetime.fromisoformat(ends_at_str.replace("Z", "+00:00"))
                if now >= ends_at:
                    self.supabase.table("phone_numbers").update({
                        "status": "hold_period",
                        "updated_at": now_iso,
                    }).eq("id", num["id"]).execute()
                    moved_to_hold.append(num["id"])

        # 3. Check Hold -> Released / Quarantined
        for num in hold_numbers:
            ends_at_str = num.get("hold_period_ends_at")
            if ends_at_str:
                ends_at = datetime.fromisoformat(ends_at_str.replace("Z", "+00:00"))
                if now >= ends_at:
                    self.supabase.table("phone_numbers").update({
                        "status": "released",
                        "released_at": now_iso,
                        "updated_at": now_iso,
                    }).eq("id", num["id"]).execute()
                    moved_to_released.append(num["id"])

        return {
            "processed_at": now_iso,
            "moved_to_grace_count": len(moved_to_grace),
            "moved_to_grace_ids": moved_to_grace,
            "moved_to_hold_count": len(moved_to_hold),
            "moved_to_hold_ids": moved_to_hold,
            "moved_to_released_count": len(moved_to_released),
            "moved_to_released_ids": moved_to_released,
        }

    # -------------------------------------------------------------------------
    # 4. Missed Call Daily Digest Generator
    # -------------------------------------------------------------------------
    def generate_daily_missed_call_digest(
        self,
        phone_number_id: str,
        base_url: str = "https://vaakriti.com",
    ) -> Dict[str, Any]:
        """
        Aggregates missed calls for a number in grace/hold and generates daily digest payload.
        """
        res_num = (
            self.supabase.table("phone_numbers")
            .select("id, organization_id, phone_number, status, reactivation_token, missed_calls_count")
            .eq("id", phone_number_id)
            .execute()
        )
        if not res_num.data or len(res_num.data) == 0:
            raise ValueError(f"Phone number not found: {phone_number_id}")

        num = res_num.data[0]
        token = num.get("reactivation_token") or secrets.token_urlsafe(32)
        org_id = num["organization_id"]

        # Fetch missed calls
        res_missed = (
            self.supabase.table("number_lifecycle_missed_calls")
            .select("caller_number, caller_number_masked, created_at")
            .eq("phone_number_id", phone_number_id)
            .execute()
        )
        missed_list = res_missed.data or []
        unique_callers = len(set(m.get("caller_number") for m in missed_list))
        total_missed = len(missed_list)

        reactivation_url = f"{base_url}/billing/numbers/{phone_number_id}/reactivate?token={token}"
        today_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        digest_record = {
            "phone_number_id": phone_number_id,
            "organization_id": org_id,
            "digest_date": today_date,
            "missed_calls_count": total_missed,
            "unique_callers_count": unique_callers,
            "reactivation_url": reactivation_url,
            "status": "generated",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self.supabase.table("number_lifecycle_digests").insert(digest_record).execute()

        return {
            "phone_number_id": phone_number_id,
            "phone_number": num.get("phone_number"),
            "organization_id": org_id,
            "lifecycle_status": num.get("status"),
            "digest_date": today_date,
            "total_missed_calls": total_missed,
            "unique_callers": unique_callers,
            "reactivation_url": reactivation_url,
            "summary_message": (
                f"You missed {total_missed} incoming customer calls ({unique_callers} unique callers) "
                f"on {num.get('phone_number')}. Re-activate your number instantly to resume AI voice call handling: "
                f"{reactivation_url}"
            ),
        }

    # -------------------------------------------------------------------------
    # 5. Reactivate Number (One-Click Restoration)
    # -------------------------------------------------------------------------
    def reactivate_number(
        self,
        phone_number_id: str,
        organization_id: str,
        token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Reactivates a number currently in grace_period or hold_period upon payment / renewal.
        Restores status to 'active' and clears token.
        """
        res_num = (
            self.supabase.table("phone_numbers")
            .select("*")
            .eq("id", phone_number_id)
            .eq("organization_id", organization_id)
            .execute()
        )
        if not res_num.data or len(res_num.data) == 0:
            raise ValueError("Phone number not found or tenant mismatch.")

        num = res_num.data[0]
        status = num.get("status")

        if status not in ("grace_period", "hold_period"):
            raise ValueError(f"Number cannot be reactivated from status '{status}'. Must be in grace_period or hold_period.")

        # If token is provided, verify token match
        if token and num.get("reactivation_token") and token != num.get("reactivation_token"):
            raise ValueError("Invalid reactivation token.")

        now_iso = datetime.now(timezone.utc).isoformat()
        update_payload = {
            "status": "active",
            "reactivated_at": now_iso,
            "reactivation_token": None,
            "expired_at": None,
            "grace_period_ends_at": None,
            "hold_period_ends_at": None,
            "updated_at": now_iso,
        }
        res_update = self.supabase.table("phone_numbers").update(update_payload).eq("id", phone_number_id).execute()

        logger.info(f"Number {phone_number_id} ({num.get('phone_number')}) successfully reactivated to active state.")
        return res_update.data[0] if res_update.data else update_payload
