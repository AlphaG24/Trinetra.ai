import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

from database import supabase_admin
from app.services.config_service import ConfigService
from app.services.telephony.factory import get_provider

logger = logging.getLogger("CallbackSchedulerService")

class CallbackSchedulerService:
    """
    Automated Background Callback Engine.
    Continuously monitors the `callbacks` table for scheduled callback commitments
    and automatically triggers outbound calls through the AI Voice Agent when due.
    """
    _running: bool = False
    _worker_task: Optional[asyncio.Task] = None
    _poll_interval_seconds: int = 30

    @classmethod
    def start_worker(cls):
        """Start the background callback scheduler task."""
        if cls._running:
            logger.info("[CallbackScheduler] Worker is already running.")
            return

        cls._running = True
        cls._worker_task = asyncio.create_task(cls._worker_loop())
        logger.info("[CallbackScheduler] Background automated callback scheduler started.")

    @classmethod
    def stop_worker(cls):
        """Stop the background worker."""
        cls._running = False
        if cls._worker_task:
            cls._worker_task.cancel()
            cls._worker_task = None
        logger.info("[CallbackScheduler] Background automated callback scheduler stopped.")

    @classmethod
    async def _worker_loop(cls):
        """Main polling loop for scheduled callbacks."""
        while cls._running:
            try:
                await cls.process_due_callbacks()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[CallbackScheduler] Unexpected error in worker loop: {e}", exc_info=True)
            
            try:
                await asyncio.sleep(cls._poll_interval_seconds)
            except asyncio.CancelledError:
                break

    @classmethod
    async def process_due_callbacks(cls):
        """
        Query callbacks with status='scheduled' and scheduled_at <= now()
        and initiate outbound calls.
        """
        now_utc = datetime.now(timezone.utc).isoformat()

        try:
            res = await asyncio.to_thread(
                supabase_admin.table("callbacks")
                .select("*")
                .eq("status", "scheduled")
                .lte("scheduled_at", now_utc)
                .order("scheduled_at", desc=False)
                .limit(5)
                .execute
            )
            callbacks = res.data or []
        except Exception as e:
            logger.error(f"[CallbackScheduler] Failed to query due callbacks: {e}")
            return

        if not callbacks:
            return

        logger.info(f"[CallbackScheduler] Found {len(callbacks)} scheduled callback(s) due for auto-dialing.")

        for cb in callbacks:
            try:
                await cls.dial_callback(cb)
            except Exception as err:
                logger.error(f"[CallbackScheduler] Failed to process callback {cb.get('id')}: {err}")

    @classmethod
    async def dial_callback(cls, cb: Dict[str, Any]):
        """
        Place the outbound call for a single callback item.
        """
        cb_id = cb["id"]
        org_id = cb.get("organization_id")
        agent_id = cb.get("agent_id")
        prospect_phone = cb.get("prospect_phone")
        prospect_name = cb.get("prospect_name") or "Prospect"
        notes = cb.get("notes") or "Scheduled callback"
        attempt_count = (cb.get("attempt_count") or 0) + 1
        max_attempts = cb.get("max_attempts") or 3

        if not prospect_phone or str(prospect_phone).lower() in ("unknown", "none", ""):
            logger.warning(f"[CallbackScheduler] Callback {cb_id} has invalid phone ({prospect_phone}). Marking as missed.")
            await asyncio.to_thread(
                supabase_admin.table("callbacks").update({
                    "status": "missed",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", cb_id).execute
            )
            return

        import re
        clean_phone = re.sub(r'[^0-9+]', '', str(prospect_phone))
        # Strip erroneous +1/1 prefix mistakenly prepended to 10-digit Indian numbers (e.g. +17818065871 -> +917818065871)
        if (clean_phone.startswith("+1") and len(clean_phone) == 12) or (clean_phone.startswith("1") and len(clean_phone) == 11):
            ten_digit = clean_phone[-10:]
            if ten_digit[0] in '6789':
                clean_phone = f"+91{ten_digit}"
        elif len(clean_phone) == 10 and clean_phone[0] in '6789':
            clean_phone = f"+91{clean_phone}"
        elif len(clean_phone) == 12 and clean_phone.startswith("91") and clean_phone[2] in '6789':
            clean_phone = f"+{clean_phone}"
        elif len(clean_phone) == 11 and clean_phone.startswith("0") and clean_phone[1] in '6789':
            clean_phone = f"+91{clean_phone[1:]}"
        elif not clean_phone.startswith("+"):
            clean_phone = f"+{clean_phone}"
        prospect_phone = clean_phone

        # Atomically claim/lock this callback to prevent concurrent duplicate calls
        claim_res = await asyncio.to_thread(
            supabase_admin.table("callbacks").update({
                "status": "in_progress",
                "attempt_count": attempt_count,
                "last_attempt_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", cb_id).eq("status", "scheduled").execute
        )
        if not claim_res.data:
            # Another process or worker claimed it
            logger.info(f"[CallbackScheduler] Callback {cb_id} was already claimed by another process.")
            return

        try:
            # 1. Resolve agent details
            agent_data = None
            if agent_id:
                try:
                    a_res = await asyncio.to_thread(
                        supabase_admin.table("agents")
                        .select("id, name, organization_id, phone_number, telephony_provider")
                        .eq("id", agent_id)
                        .maybe_single()
                        .execute
                    )
                    agent_data = a_res.data if a_res else None
                except Exception as ae:
                    logger.warning(f"[CallbackScheduler] Error fetching agent {agent_id}: {ae}")

            if not agent_data and org_id:
                a_res = await asyncio.to_thread(
                    supabase_admin.table("agents")
                    .select("id, name, organization_id, phone_number, telephony_provider")
                    .eq("organization_id", org_id)
                    .limit(1)
                    .execute
                )
                if a_res.data and len(a_res.data) > 0:
                    agent_data = a_res.data[0]
                    agent_id = agent_data["id"]

            from_phone = None
            chosen_provider = None

            # 2. Check if agent has a direct phone_number and provider configured
            if agent_data:
                if agent_data.get("phone_number"):
                    from_phone = agent_data["phone_number"]
                if agent_data.get("telephony_provider"):
                    chosen_provider = str(agent_data["telephony_provider"]).lower().strip()

            # 3. Check agent_phone_numbers mapping table if not resolved
            if not from_phone and agent_id:
                try:
                    apn_res = await asyncio.to_thread(
                        supabase_admin.table("agent_phone_numbers")
                        .select("phone_numbers(phone_number, provider)")
                        .eq("agent_id", agent_id)
                        .order("is_primary", desc=True)
                        .limit(1)
                        .execute
                    )
                    if apn_res.data and len(apn_res.data) > 0:
                        pn_row = apn_res.data[0].get("phone_numbers") or {}
                        if pn_row.get("phone_number"):
                            from_phone = pn_row["phone_number"]
                            if not chosen_provider:
                                chosen_provider = (pn_row.get("provider") or "").lower().strip()
                except Exception as apn_err:
                    logger.warning(f"[CallbackScheduler] Error querying agent_phone_numbers: {apn_err}")

            # 4. Check organization active phone numbers if not resolved
            if not from_phone and org_id:
                try:
                    num_res = await asyncio.to_thread(
                        supabase_admin.table("phone_numbers")
                        .select("phone_number, provider")
                        .eq("organization_id", org_id)
                        .eq("status", "active")
                        .limit(1)
                        .execute
                    )
                    if num_res.data and len(num_res.data) > 0:
                        from_phone = num_res.data[0]["phone_number"]
                        if not chosen_provider:
                            chosen_provider = (num_res.data[0].get("provider") or "").lower().strip()
                except Exception as ne:
                    logger.warning(f"[CallbackScheduler] Failed to query organization phone: {ne}")

            # 5. Telephony provider resolution based on assigned phone number & destination
            has_exotel = bool(ConfigService.get("EXOTEL_API_KEY") or os.getenv("EXOTEL_API_KEY"))
            has_twilio = bool(ConfigService.get("TWILIO_ACCOUNT_SID") or os.getenv("TWILIO_ACCOUNT_SID"))

            if chosen_provider in ("exotel", "twilio"):
                pass
            elif from_phone and (from_phone.startswith("+91") or from_phone.startswith("91")) and has_exotel:
                chosen_provider = "exotel"
            elif from_phone and from_phone.startswith("+1") and has_twilio:
                chosen_provider = "twilio"
            elif prospect_phone.startswith("+91") and has_exotel:
                # If calling an Indian number, prioritize Indian telephony provider (Exotel)
                chosen_provider = "exotel"
            elif has_twilio:
                chosen_provider = "twilio"
            elif has_exotel:
                chosen_provider = "exotel"
            else:
                chosen_provider = "simulated"

            # Set appropriate caller ID for the selected provider
            if not from_phone:
                if chosen_provider == "exotel":
                    from_phone = ConfigService.get("EXOTEL_CALLER_ID") or os.getenv("EXOTEL_CALLER_ID") or "+918000000000"
                else:
                    from_phone = os.getenv("TWILIO_PHONE_NUMBER") or "+12282950908"

            from app.services.telephony.factory import get_provider
            provider = get_provider(chosen_provider)

            # 6. Prepare room name and webhook URL for the chosen provider
            webhook_base = ConfigService.get("TRINETRA_WEBHOOK_BASE_URL") or os.getenv("TRINETRA_WEBHOOK_BASE_URL") or "http://localhost:8000"
            unique_room = f"{chosen_provider}--{agent_id}--callback--{cb_id[:8]}"
            webhook_url = f"{webhook_base}/api/voice/webhooks/voice/{chosen_provider}/{org_id}?agent_id={agent_id}&room_name={unique_room}&is_callback=true&callback_id={cb_id}"

            # 7. Insert initial voice_calls record
            await asyncio.to_thread(
                supabase_admin.table("voice_calls").insert({
                    "organization_id": org_id,
                    "agent_id": agent_id,
                    "caller_phone": prospect_phone,
                    "status": "in_progress",
                    "started_at": datetime.now(timezone.utc).isoformat(),
                    "metadata": {
                        "direction": "outbound",
                        "is_callback": True,
                        "callback_id": cb_id,
                        "prospect_name": prospect_name,
                        "notes": notes,
                        "room_name": unique_room,
                        "provider": chosen_provider
                    }
                }).execute
            )

            # 8. Place outbound call via Telephony Provider
            logger.info(f"[CallbackScheduler] Placing automated callback to {prospect_name} ({prospect_phone}) from {from_phone} via {chosen_provider} (Room: {unique_room})")
            call_res = await provider.make_outbound_call(
                to_number=prospect_phone,
                from_number=from_phone,
                webhook_url=webhook_url,
                custom_parameters={
                    "contact_name": prospect_name,
                    "notes": notes,
                    "agent_id": agent_id,
                    "callback_id": cb_id,
                    "is_callback": "true",
                    "room_name": unique_room
                }
            )

            # 7. Update callback to completed
            await asyncio.to_thread(
                supabase_admin.table("callbacks").update({
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", cb_id).execute
            )
            logger.info(f"[CallbackScheduler] Callback {cb_id} successfully dispatched! Call SID: {call_res.get('call_sid')}")

        except Exception as dial_err:
            logger.error(f"[CallbackScheduler] Outbound callback call failed for {cb_id}: {dial_err}")
            
            # Retry logic: If attempts remaining, reschedule for 15 minutes later; otherwise mark missed
            if attempt_count >= max_attempts:
                new_status = "missed"
                next_time = None
            else:
                new_status = "scheduled"
                next_time = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()

            update_data = {
                "status": new_status,
                "notes": f"{notes} | Last error: {str(dial_err)[:100]}"
            }
            if next_time:
                update_data["scheduled_at"] = next_time

            await asyncio.to_thread(
                supabase_admin.table("callbacks").update(update_data).eq("id", cb_id).execute
            )
