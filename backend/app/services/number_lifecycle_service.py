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
        """
        now = datetime.now(timezone.utc)
        grace_ends = now + timedelta(days=GRACE_PERIOD_DAYS)
        hold_days = custom_hold_days or DEFAULT_HOLD_PERIOD_DAYS
        hold_ends = grace_ends + timedelta(days=hold_days)
        reactivation_token = secrets.token_urlsafe(32)

        update_payload = {
            "status": "grace_period",
            "expired_at": now.isoformat(),
            "grace_period_ends_at": grace_ends.isoformat(),
            "hold_period_ends_at": hold_ends.isoformat(),
            "missed_calls_count": 0,
            "reactivation_token": reactivation_token,
            "updated_at": now.isoformat(),
        }

        query = self.supabase.table("phone_numbers").update(update_payload).eq("id", phone_number_id)
        if organization_id:
            query = query.eq("organization_id", organization_id)
        res = query.execute()

        if not res.data or len(res.data) == 0:
            raise ValueError(f"Phone number not found or not owned by org: {phone_number_id}")

        logger.info(f"Number {phone_number_id} entered 15-day grace period until {grace_ends.isoformat()}")
        return res.data[0]

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
        - Moves numbers from grace_period to hold_period once grace_period_ends_at is passed.
        - Moves numbers from hold_period to released / quarantined once hold_period_ends_at is passed.
        """
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

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

        # Check Grace -> Hold
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

        # Check Hold -> Released / Quarantined
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
