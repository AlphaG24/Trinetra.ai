import os
import logging
from typing import Optional, Dict, Any, List
import httpx
import asyncio
from datetime import datetime, timezone, timedelta
from database import supabase_admin

logger = logging.getLogger("sarvam_outbound_service")

DEFAULT_ORG_ID = "019f7b9c-0927-76b2-9fdb-0aa949d43d06"
DEFAULT_WORKSPACE_ID = "019f7b9c-093a-72bb-8d5e-0437956a1dfa"
DEFAULT_APP_ID = "Shubhansh-2127e8ff-a55f"
DEFAULT_CONNECTION_ID = "87852118-1f-fc7abbe6-a0dd"
DEFAULT_CALLER_NUMBER = "+917965481258"
DEFAULT_USER_ID = "9363a829-8d11-42ae-bfff-d8ea5c17a71b"
DEFAULT_ORGANIZATION_ID = "b1ddf1e9-abc1-4ff4-90f5-3ac66913738a"
DEFAULT_AGENT_ID = "dd4da4c1-9deb-4047-8927-5e12402e6b1f"
DEFAULT_SARVAM_WORKSPACE_API_KEY = "sk_samvaad_werdeggz_BnUoezMCwoT5iHjhMKEVNipM"


class SarvamOutboundService:
    """Service for placing instant outbound calls and syncing logs via Sarvam Voice Agents API."""

    def __init__(self):
        # Prefer workspace/samvaad API key (starts with sk_samvaad_) for Voice Agents API
        raw_ws = os.getenv("SARVAM_WORKSPACE_API_KEY", "").strip()
        raw_general = os.getenv("SARVAM_API_KEY", "").strip()
        raw_voice = os.getenv("SARVA_VOICE_AGENTS", "").strip()

        # Select the key that matches the Sarvam Voice Agent format (sk_samvaad_...)
        selected_key = ""
        for candidate in (raw_ws, raw_voice, raw_general):
            if candidate and candidate.startswith("sk_samvaad_"):
                selected_key = candidate
                break

        if not selected_key:
            selected_key = raw_ws or raw_voice or DEFAULT_SARVAM_WORKSPACE_API_KEY

        self.api_key = selected_key
        self.org_id = os.getenv("SARVAM_ORG_ID", DEFAULT_ORG_ID).strip()
        self.workspace_id = os.getenv("SARVAM_WORKSPACE_ID", DEFAULT_WORKSPACE_ID).strip()
        self.app_id = os.getenv("SARVAM_APP_ID", DEFAULT_APP_ID).strip()
        self.connection_id = os.getenv("SARVAM_CONNECTION_ID", DEFAULT_CONNECTION_ID).strip()
        self.caller_number = os.getenv("SARVAM_CALLER_NUMBER", DEFAULT_CALLER_NUMBER).strip()

    async def trigger_instant_call(
        self,
        target_phone: str,
        contact_name: Optional[str] = None,
        custom_metadata: Optional[Dict[str, Any]] = None,
        webhook_url: Optional[str] = None,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        agent_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Triggers an instant outbound phone call via Sarvam Voice Agents API
        and spawns background polling to sync the call transcript, recording, and lead data upon completion.
        """
        cleaned_phone = target_phone.strip().replace(" ", "").replace("-", "")
        if not cleaned_phone.startswith("+"):
            if len(cleaned_phone) == 10:
                cleaned_phone = f"+91{cleaned_phone}"
            elif len(cleaned_phone) == 12 and cleaned_phone.startswith("91"):
                cleaned_phone = f"+{cleaned_phone}"
            else:
                cleaned_phone = f"+{cleaned_phone}"

        url = f"https://apps.sarvam.ai/api/outbounds/v1/orgs/{self.org_id}/workspaces/{self.workspace_id}/outbounds"

        headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }

        user_config: Dict[str, Any] = {
            "user_phone_number": cleaned_phone,
            "customer_phone": cleaned_phone,
            "user_phone": cleaned_phone,
            "phone": cleaned_phone,
            "phone_number": cleaned_phone,
            "contact_phone": cleaned_phone
        }
        if contact_name and contact_name.strip():
            user_config["user_name"] = contact_name.strip()
            user_config["customer_name"] = contact_name.strip()
            user_config["name"] = contact_name.strip()

        if custom_metadata:
            user_config.update(custom_metadata)

        payload: Dict[str, Any] = {
            "app_config": {
                "app_id": self.app_id,
                "app_version": 1,
                "connection_config": {
                    "connection_id": self.connection_id,
                    "agent_phone_number": self.caller_number
                }
            },
            "user_config": user_config
        }

        if webhook_url:
            payload["webhook_config"] = {"url": webhook_url}

        logger.info(f"[SarvamOutboundService] Dialing {cleaned_phone} via agent {self.app_id}")

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                
                if res.status_code in (200, 201):
                    res_data = res.json()
                    attempt_id = res_data.get("attempt_id") or f"att_{datetime.now(timezone.utc).timestamp()}"
                    logger.info(f"[SarvamOutboundService] Call queued. Attempt ID: {attempt_id}")

                    # Spawn automatic background poller to sync call as soon as completed
                    asyncio.create_task(
                        self.poll_and_sync_attempt(
                            attempt_id=attempt_id,
                            target_phone=cleaned_phone,
                            contact_name=contact_name or "Customer",
                            user_id=user_id or DEFAULT_USER_ID,
                            org_id=org_id or DEFAULT_ORGANIZATION_ID,
                            agent_id=agent_id or DEFAULT_AGENT_ID
                        )
                    )

                    return {
                        "success": True,
                        "attempt_id": attempt_id,
                        "phone": cleaned_phone,
                        "status": "dialing",
                        "provider": "sarvam",
                        "data": res_data
                    }
                else:
                    err_text = res.text
                    logger.error(f"[SarvamOutboundService] Dial Failed ({res.status_code}): {err_text}")
                    return {
                        "success": False,
                        "status_code": res.status_code,
                        "error": f"Sarvam API error: {err_text}",
                        "phone": cleaned_phone
                    }
        except Exception as e:
            logger.error(f"[SarvamOutboundService] Exception triggering outbound call: {e}", exc_info=True)
            return {"success": False, "error": str(e), "phone": cleaned_phone}

    async def poll_and_sync_attempt(
        self,
        attempt_id: str,
        target_phone: str,
        contact_name: str,
        user_id: str,
        org_id: str,
        agent_id: str,
        max_attempts: int = 36,
        poll_interval: int = 5
    ):
        """
        Polls Sarvam Analytics API until the call is completed, then automatically
        syncs recordings, transcript, and leads into Trinetra.
        """
        logger.info(f"[Sarvam Poller] Started tracking attempt {attempt_id} for {target_phone}")
        # Wait 10 seconds before first check to let call establish
        await asyncio.sleep(10)

        for i in range(max_attempts):
            try:
                synced = await self.sync_recent_calls(
                    hours_back=24,
                    match_attempt_id=attempt_id,
                    user_id=user_id,
                    org_id=org_id,
                    agent_id=agent_id
                )
                if synced > 0:
                    logger.info(f"[Sarvam Poller] Successfully synchronized attempt {attempt_id}")
                    break
            except Exception as e:
                logger.warning(f"[Sarvam Poller Error] Attempt {i+1}: {e}")
            await asyncio.sleep(poll_interval)

    async def sync_recent_calls(
        self,
        hours_back: int = 24,
        match_attempt_id: Optional[str] = None,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        agent_id: Optional[str] = None
    ) -> int:
        """
        Pulls completed call attempts from Sarvam Analytics API and syncs to Supabase.
        """
        if not self.api_key:
            logger.warning("[Sarvam Sync] SARVAM_WORKSPACE_API_KEY is missing.")
            return 0

        now = datetime.now(timezone.utc)
        start_time = now - timedelta(hours=hours_back)
        start_str = start_time.strftime("%Y-%m-%dT00:00:00Z")
        end_str = now.strftime("%Y-%m-%dT23:59:59Z")

        base_url = f"https://apps.sarvam.ai/api/analytics/v1/{self.org_id}/{self.workspace_id}/{self.app_id}"
        headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }
        params = {
            "start_datetime": start_str,
            "end_datetime": end_str
        }

        target_user = user_id or DEFAULT_USER_ID
        target_org = org_id or DEFAULT_ORGANIZATION_ID
        target_agent = agent_id or DEFAULT_AGENT_ID

        synced_count = 0

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                res = await client.get(f"{base_url}/attempts", headers=headers, params=params)
                if res.status_code != 200:
                    logger.error(f"[Sarvam Sync] Attempts query returned {res.status_code}: {res.text}")
                    return 0

                items = res.json().get("items", [])
                for att in items:
                    try:
                        att_id = att.get("attempt_id")
                        if match_attempt_id and att_id != match_attempt_id:
                            continue

                        inter_id = att.get("interaction_id")
                        user_phone = att.get("user_contact")
                        audio_url = att.get("audio_url")
                        duration = int(float(att.get("duration_in_seconds") or 0))
                        status_raw = (att.get("connectivity_status") or "completed").lower()
                        stat_normalized = "completed" if status_raw in ("connected", "completed") else status_raw

                        agent_vars = att.get("agent_variables") or {}
                        user_name = agent_vars.get("user_name") or "Contact"
                        summary = agent_vars.get("call_summary") or "Call completed via Shubh"

                        # Handle phone length and emails safely (database column is VARCHAR(20))
                        clean_raw = str(user_phone or "").strip()
                        if "@" in clean_raw:
                            phone_for_lead = None
                            email_for_lead = clean_raw[:50]
                            caller_phone_field = clean_raw[:20]
                        else:
                            phone_for_lead = clean_raw[:20] if clean_raw else None
                            email_for_lead = None
                            caller_phone_field = clean_raw[:20] if clean_raw else "Unknown"

                        # Fetch turn-by-turn transcript
                        transcript_text = ""
                        if inter_id and inter_id != "NO_INTERACTION_ID":
                            try:
                                t_res = await client.get(f"{base_url}/transcripts/{inter_id}", headers=headers)
                                if t_res.status_code == 200:
                                    msgs = t_res.json().get("messages", [])
                                    lines = []
                                    for m in msgs:
                                        role = "Agent" if m.get("role") == "assistant" else "User"
                                        lines.append(f"{role}: {m.get('content', '')}")
                                    transcript_text = "\n".join(lines)
                            except Exception as t_err:
                                logger.warning(f"[Sarvam Sync] Error fetching transcript: {t_err}")

                        # 1. Upsert into voice_calls
                        call_payload = {
                            "user_id": target_user,
                            "organization_id": target_org,
                            "agent_id": target_agent,
                            "caller_name": user_name,
                            "caller_phone": caller_phone_field,
                            "duration_seconds": duration,
                            "status": stat_normalized,
                            "sentiment": "positive",
                            "outcome": "answered" if duration > 0 else "no_answer",
                            "recording_url": audio_url,
                            "transcript": transcript_text,
                            "call_summary": summary,
                            "language_detected": "Hindi",
                            "metadata": {
                                "provider": "sarvam",
                                "attempt_id": att_id,
                                "interaction_id": inter_id,
                                "agent_variables": agent_vars
                            }
                        }

                        existing_call = None
                        if audio_url:
                            c_res = await asyncio.to_thread(
                                supabase_admin.table("voice_calls").select("id").eq("recording_url", audio_url).limit(1).execute
                            )
                            if c_res.data:
                                existing_call = c_res.data[0]

                        if not existing_call and inter_id and inter_id != "NO_INTERACTION_ID":
                            c_res = await asyncio.to_thread(
                                supabase_admin.table("voice_calls").select("id").filter("metadata->>interaction_id", "eq", inter_id).limit(1).execute
                            )
                            if c_res.data:
                                existing_call = c_res.data[0]

                        if existing_call:
                            call_id = existing_call["id"]
                            await asyncio.to_thread(
                                supabase_admin.table("voice_calls").update(call_payload).eq("id", call_id).execute
                            )
                        else:
                            new_call = await asyncio.to_thread(
                                supabase_admin.table("voice_calls").insert(call_payload).execute
                            )
                            call_id = new_call.data[0]["id"] if (new_call and new_call.data) else None

                        # 2. Upsert into leads
                        if phone_for_lead or email_for_lead:
                            lead_payload = {
                                "user_id": target_user,
                                "agent_id": target_agent,
                                "full_name": user_name,
                                "phone": phone_for_lead,
                                "email": email_for_lead,
                                "status": "qualified",
                                "stage": "contacted",
                                "interest_level": "high",
                                "source": "voice_demo",
                                "notes": summary,
                                "call_summary": summary,
                                "call_id": call_id
                            }
                            if phone_for_lead:
                                exist_lead = await asyncio.to_thread(
                                    supabase_admin.table("leads").select("id").eq("phone", phone_for_lead).execute
                                )
                            else:
                                exist_lead = await asyncio.to_thread(
                                    supabase_admin.table("leads").select("id").eq("email", email_for_lead).execute
                                )

                            if exist_lead.data:
                                await asyncio.to_thread(
                                    supabase_admin.table("leads").update(lead_payload).eq("id", exist_lead.data[0]["id"]).execute
                                )
                            else:
                                await asyncio.to_thread(
                                    supabase_admin.table("leads").insert(lead_payload).execute
                                )

                        # 3. Upsert into customer_contacts
                        if phone_for_lead:
                            cust_payload = {
                                "organization_id": target_org,
                                "full_name": user_name,
                                "phone_number": phone_for_lead,
                                "total_calls": 1,
                                "notes": summary,
                                "tags": ["sarvam_outbound", "preview_requested"]
                            }
                            exist_cust = await asyncio.to_thread(
                                supabase_admin.table("customer_contacts").select("id").eq("phone_number", phone_for_lead).execute
                            )
                            if exist_cust.data:
                                await asyncio.to_thread(
                                    supabase_admin.table("customer_contacts").update(cust_payload).eq("id", exist_cust.data[0]["id"]).execute
                                )
                            else:
                                await asyncio.to_thread(
                                    supabase_admin.table("customer_contacts").insert(cust_payload).execute
                                )

                        # 4. Update campaign_contacts & Campaign Stats
                        if phone_for_lead:
                            await asyncio.to_thread(
                                supabase_admin.table("campaign_contacts")
                                .update({
                                    "call_status": "answered",
                                    "call_id": call_id,
                                    "notes": summary
                                })
                                .eq("phone", phone_for_lead)
                                .execute
                            )

                            # Auto-update parent campaign statistics
                            camp_lookup = await asyncio.to_thread(
                                supabase_admin.table("campaign_contacts").select("campaign_id").eq("phone", phone_for_lead).limit(1).execute
                            )
                            if camp_lookup.data and len(camp_lookup.data) > 0:
                                p_camp_id = camp_lookup.data[0]["campaign_id"]
                                contacts_all = await asyncio.to_thread(
                                    supabase_admin.table("campaign_contacts").select("call_status").eq("campaign_id", p_camp_id).execute
                                )
                                rows = contacts_all.data or []
                                num_called = sum(1 for r in rows if r.get("call_status") != "pending")
                                num_connected = sum(1 for r in rows if r.get("call_status") in ("answered", "completed"))
                                await asyncio.to_thread(
                                    supabase_admin.table("campaigns").update({
                                        "contacts_called": num_called,
                                        "contacts_connected": num_connected,
                                        "leads_generated": num_connected
                                    }).eq("id", p_camp_id).execute
                                )

                        # 5. Auto-schedule Appointment if booked in call
                        summary_lower = (summary or "").lower()
                        trans_lower = (transcript_text or "").lower()
                        if phone_for_lead and ("booked" in summary_lower or "appointment" in summary_lower or "11 am" in summary_lower or "11 am" in trans_lower or "कल 11 बजे" in trans_lower):
                            try:
                                exist_appt = await asyncio.to_thread(
                                    supabase_admin.table("appointments").select("id").eq("voice_call_id", call_id).limit(1).execute
                                )
                                if not exist_appt.data and call_id:
                                    tomorrow_11am = (datetime.now(timezone.utc) + timedelta(days=1)).replace(hour=5, minute=30, second=0).isoformat()
                                    await asyncio.to_thread(
                                        supabase_admin.table("appointments").insert({
                                            "user_id": target_user,
                                            "agent_id": target_agent,
                                            "contact_name": user_name,
                                            "contact_phone": phone_for_lead,
                                            "scheduled_at": tomorrow_11am,
                                            "duration_minutes": 15,
                                            "status": "scheduled",
                                            "booked_via": "voice_call",
                                            "notes": summary,
                                            "voice_call_id": call_id
                                        }).execute
                                    )
                                    logger.info(f"[Sarvam Sync] Automatically booked appointment for {user_name} ({phone_for_lead}) at 11 AM")
                            except Exception as appt_err:
                                logger.warning(f"[Sarvam Sync] Appointment booking error: {appt_err}")

                        synced_count += 1
                        logger.info(f"[Sarvam Sync] Successfully synced call for {caller_phone_field} ({user_name})")

                    except Exception as item_err:
                        logger.error(f"[Sarvam Sync Item Error] Failed to process attempt: {item_err}", exc_info=True)

        except Exception as e:
            logger.error(f"[Sarvam Sync] Error during sync: {e}", exc_info=True)

        return synced_count
