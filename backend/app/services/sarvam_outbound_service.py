import os
import re
import json
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
            selected_key = raw_ws or raw_voice or raw_general

        self.api_key = selected_key
        self.org_id = os.getenv("SARVAM_ORG_ID", DEFAULT_ORG_ID).strip()
        self.workspace_id = os.getenv("SARVAM_WORKSPACE_ID", DEFAULT_WORKSPACE_ID).strip()
        self.app_id = os.getenv("SARVAM_APP_ID", DEFAULT_APP_ID).strip()
        self.connection_id = os.getenv("SARVAM_CONNECTION_ID", DEFAULT_CONNECTION_ID).strip()
        self.caller_number = os.getenv("SARVAM_CALLER_NUMBER", DEFAULT_CALLER_NUMBER).strip()
        self.gemini_key = os.getenv("GEMINI_API_KEY", "").strip() or os.getenv("GOOGLE_API_KEY", "").strip()
        self._gemini_client = None

    def _get_gemini_client(self):
        if not self._gemini_client and self.gemini_key:
            try:
                from google import genai
                self._gemini_client = genai.Client(api_key=self.gemini_key)
            except Exception as e:
                logger.warning(f"[Sarvam AI] Failed to initialize Gemini client: {e}")
        return self._gemini_client

    async def resolve_caller_name(
        self,
        phone: str,
        template_name: str,
        extracted_name: Optional[str] = None,
        target_org: Optional[str] = None
    ) -> str:
        """
        Resolves caller's display name accurately using:
        1. Campaign contacts table by phone (exact contact entered when placing call)
        2. Spoken self-introduction extracted by Gemini from transcript
        3. Customer contacts record by phone
        4. Leads record by phone
        5. Explicit template_name/provided contact name (if not a generic placeholder or test dummy)
        6. Clean fallback: 'Customer'
        """
        GENERIC_PLACEHOLDERS = {
            "unknown", "contact", "customer", "prospect", "none", "client", 
            "website visitor", "caller", "null", "undefined", "", "amar", "shubh", "ritu", "user", "test"
        }

        clean_p = re.sub(r'[^\d+]', '', phone or '')
        digits = re.sub(r'\D', '', clean_p)
        last10 = digits[-10:] if len(digits) >= 10 else digits

        # 1. First Priority: Check campaign_contacts table by caller's phone (actual name uploaded in CSV/campaign)
        if last10:
            try:
                camp_res = await asyncio.to_thread(
                    supabase_admin.table("campaign_contacts")
                    .select("full_name")
                    .ilike("phone", f"%{last10}%")
                    .order("created_at", desc=True)
                    .limit(3)
                    .execute
                )
                for row in (camp_res.data or []):
                    fn = (row.get("full_name") or "").strip()
                    if fn and fn.lower() not in GENERIC_PLACEHOLDERS and len(fn) >= 2:
                        return fn.title()
            except Exception as e:
                logger.warning(f"[resolve_caller_name] campaign_contacts lookup error: {e}")

        # 2. Second Priority: Spoken self-introduction in transcript extracted by Gemini
        if extracted_name and extracted_name.strip():
            candidate = extracted_name.strip()
            if candidate.lower() not in GENERIC_PLACEHOLDERS and len(candidate) >= 2:
                return candidate.title()

        # 3. Third Priority: Check customer_contacts table
        if last10:
            try:
                cust_res = await asyncio.to_thread(
                    supabase_admin.table("customer_contacts")
                    .select("full_name")
                    .ilike("phone_number", f"%{last10}%")
                    .order("created_at", desc=True)
                    .limit(5)
                    .execute
                )
                for row in (cust_res.data or []):
                    fn = (row.get("full_name") or "").strip()
                    if fn and fn.lower() not in GENERIC_PLACEHOLDERS and len(fn) >= 2:
                        return fn.title()
            except Exception as e:
                logger.warning(f"[resolve_caller_name] customer_contacts lookup error: {e}")

        # 4. Check leads table
        if last10:
            try:
                leads_res = await asyncio.to_thread(
                    supabase_admin.table("leads")
                    .select("full_name")
                    .ilike("phone", f"%{last10}%")
                    .order("created_at", desc=True)
                    .limit(5)
                    .execute
                )
                for row in (leads_res.data or []):
                    fn = (row.get("full_name") or "").strip()
                    if fn and fn.lower() not in GENERIC_PLACEHOLDERS and len(fn) >= 2:
                        return fn.title()
            except Exception as e:
                logger.warning(f"[resolve_caller_name] leads lookup error: {e}")

        # 5. Check explicit dial-time template_name (only if not a placeholder or test dummy)
        if template_name and template_name.strip():
            candidate = template_name.strip()
            if candidate.lower() not in GENERIC_PLACEHOLDERS and len(candidate) >= 2:
                return candidate.title()

        # 6. Fallback: Clean 'Customer'
        return "Customer"

    async def evaluate_call_intelligence(
        self,
        transcript_text: str,
        summary: str,
        duration: int,
        caller_phone: str,
        template_name: str,
        target_user: str,
        target_org: str
    ) -> Dict[str, Any]:
        """
        Uses Gemini 2.5 Flash and robust heuristics to evaluate call sentiment,
        specific business outcome (Appointment Booked, Lead Qualified, Not Interested, etc.),
        appointment timing, and real caller identity.
        """
        t_clean = (transcript_text or "").strip()
        lines = [l.strip() for l in t_clean.split("\n") if l.strip()]
        user_lines = [l for l in lines if l.lower().startswith("user:") or l.lower().startswith("customer:")]
        user_speech = " ".join([l.split(":", 1)[1].strip() for l in user_lines])
        user_words = re.findall(r'\w+', user_speech)
        user_word_count = len(user_words)

        # 1. Immediate Silence / Hangup / Dropped detection
        if duration <= 10 or user_word_count == 0:
            resolved_name = await self.resolve_caller_name(caller_phone, template_name, target_org=target_org)
            return {
                "sentiment": "neutral",
                "outcome": "Dropped / Silence" if duration > 0 else "No Answer",
                "appointment_booked": False,
                "appointment_time_iso": None,
                "appointment_notes": None,
                "caller_name": resolved_name,
                "call_summary": summary or "Call connected briefly but caller did not speak.",
                "is_lead": False
            }

        # 2. Extract with Gemini 2.5 Flash
        llm_data = {}
        g_client = self._get_gemini_client()
        if g_client:
            prompt = f"""You are an expert sales interaction intelligence analyzer for Vaakriti AI.
Analyze this phone call transcript and summary to determine the exact outcome, sentiment, caller name, and whether an appointment/meeting/demo was scheduled.

Caller Phone: {caller_phone}
Candidate Name: {template_name}
Duration: {duration} seconds
Summary: {summary}

Transcript:
{transcript_text[:4000]}

Rules:
1. SENTIMENT: Must be strictly "positive", "neutral", or "negative".
   - "positive": User was engaged, receptive, asked questions, requested samples/WhatsApp details, or agreed to an appointment/callback.
   - "negative": User was annoyed, uninterested, asked to hang up, or rejected the pitch.
   - "neutral": Non-committal or general statement.
2. OUTCOME: Must be strictly one of:
   - "Appointment Booked" (if demo, meeting, follow-up call, or appointment was agreed upon or scheduled for a specific day or time, e.g. tomorrow at 11 AM)
   - "Callback Scheduled" (if user requested a callback later)
   - "Lead Qualified" (if user expressed commercial interest or requested sample/info)
   - "Deal Closed" (if closed transaction/purchase agreed)
   - "Not Interested" (if user rejected, hung up, or asked to end the call)
   - "Wrong Number" (if wrong person/mistake dial)
   - "Inquiry Completed" (general conversation)
   - "Dropped / Silence"
3. APPOINTMENT_BOOKED: boolean (true ONLY if appointment/demo/consultation was scheduled)
4. APPOINTMENT_TIME_ISO: ISO-8601 UTC datetime for appointment if booked. If tomorrow at 11 AM mentioned, use tomorrow at 05:30:00Z.
5. APPOINTMENT_NOTES: Brief note of appointment agreement.
6. EXTRACTED_NAME: Caller's name if stated by them in the transcript.
7. CALL_SUMMARY: 2-sentence summary.

Respond ONLY with valid JSON."""

            try:
                g_res = await asyncio.to_thread(
                    g_client.models.generate_content,
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config={"response_mime_type": "application/json"}
                )
                if g_res and g_res.text:
                    raw_json = json.loads(g_res.text)
                    llm_data = {k.lower(): v for k, v in raw_json.items()}
            except Exception as g_err:
                logger.warning(f"[Sarvam AI Eval] Gemini error: {g_err}")

        # 3. Deterministic Overrides & Heuristics
        s_lower = (summary or "").lower()
        t_lower = (t_clean or "").lower()

        # Distinguish Callback vs Appointment
        is_callback = (
            any(k in s_lower for k in ["callback", "call back", "call later", "reschedule", "call again", "follow-up call", "busy", "driving"]) or
            any(k in t_lower for k in ["callback", "call back", "baad me", "baad mein", "busy hoon", "driving", "bahar hoon", "phir call", "phir se call", "dusre time", "baad me baat", "kal call", "kal phone", "shaam ko call", "sham ko call", "call kar lena", "call karna"])
        )
        is_explicit_demo = (
            any(k in s_lower for k in ["demo booked", "meeting booked", "consultation", "doctor appointment", "site visit"]) or
            any(k in t_lower for k in ["demo class", "demo session", "live demo", "doctor se milna", "site visit", "meeting schedule"])
        )

        apt_in_summary = any(k in s_lower for k in ["tomorrow at 11 am", "11 am", "appointment", "demo"])
        apt_agreed_in_trans = any(k in t_lower for k in ["eleven am", "11 am", "11:00", "tomorrow", "kal", "5 pm", "paanch baje"]) and any(k in t_lower for k in ["no problem", "sure", "theek hai", "yes", "deal", "chalega", "sometime", "bhej do"])

        appointment_booked = (bool(llm_data.get("appointment_booked")) or (apt_in_summary and "scheduled" in s_lower) or apt_agreed_in_trans) and not is_callback and is_explicit_demo

        if any(k in t_lower for k in ["गलती से गलत नंबर", "wrong number", "galti se lag gaya"]):
            outcome = "Wrong Number"
            sentiment = "neutral"
        elif any(k in s_lower for k in ["declined to talk", "asked to end the call", "not interested", "declined"]) or any(k in t_lower for k in ["nahi chahiye", "phone rakho", "mat karo call", "not interested", "kick rocks"]):
            outcome = "Not Interested"
            sentiment = "negative"
        elif is_callback or llm_data.get("outcome") == "Callback Scheduled":
            outcome = "Callback Scheduled"
            sentiment = "positive" if any(k in t_lower for k in ["theek hai", "sure", "yes", "deal", "chalega", "kar lena"]) else "neutral"
            appointment_booked = False
        elif appointment_booked or llm_data.get("outcome") == "Appointment Booked":
            outcome = "Appointment Booked"
            sentiment = "positive"
        elif any(k in s_lower for k in ["custom sample", "whatsapp", "expressed interest", "automate"]):
            outcome = "Lead Qualified"
            sentiment = "positive"
        else:
            raw_outcome = llm_data.get("outcome") or "Inquiry Completed"
            outcome = raw_outcome if raw_outcome in ("Appointment Booked", "Callback Scheduled", "Lead Qualified", "Deal Closed", "Not Interested", "Wrong Number", "Inquiry Completed", "Dropped / Silence") else "Inquiry Completed"
            raw_sent = str(llm_data.get("sentiment") or "neutral").lower()
            sentiment = raw_sent if raw_sent in ("positive", "neutral", "negative") else "neutral"

        # 4. Resolve real caller name
        extracted_name = llm_data.get("extracted_name") or llm_data.get("caller_name")
        resolved_name = await self.resolve_caller_name(
            phone=caller_phone,
            template_name=template_name,
            extracted_name=extracted_name,
            target_org=target_org
        )

        # 5. Appointment timestamp
        scheduled_iso = llm_data.get("appointment_time_iso")
        if not scheduled_iso and appointment_booked:
            tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
            scheduled_iso = tomorrow.replace(hour=5, minute=30, second=0, microsecond=0).isoformat()

        final_summary = llm_data.get("call_summary") or summary

        return {
            "sentiment": sentiment,
            "outcome": outcome,
            "appointment_booked": appointment_booked,
            "appointment_time_iso": scheduled_iso,
            "appointment_notes": llm_data.get("appointment_notes") or final_summary,
            "caller_name": resolved_name,
            "call_summary": final_summary,
            "is_lead": outcome in ("Appointment Booked", "Lead Qualified", "Deal Closed", "Callback Scheduled")
        }

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

        target_app_id = self.app_id
        resolved_agent_phone = self.caller_number
        resolved_agent_name = ""
        resolved_biz_name = ""
        resolved_user_id = user_id
        resolved_org_id = org_id

        if agent_id:
            try:
                a_row = await asyncio.to_thread(
                    supabase_admin.table("agents")
                    .select("id, name, sarvam_agent_id, phone_number, organization_id, user_id, greeting_message")
                    .eq("id", agent_id)
                    .maybe_single()
                    .execute
                )
                if a_row.data:
                    ag_data = a_row.data
                    if ag_data.get("sarvam_agent_id"):
                        target_app_id = ag_data["sarvam_agent_id"]
                    resolved_agent_name = ag_data.get("name") or ""
                    resolved_user_id = resolved_user_id or ag_data.get("user_id")
                    resolved_org_id = resolved_org_id or ag_data.get("organization_id")
                    if ag_data.get("phone_number"):
                        p_raw = str(ag_data["phone_number"]).strip().replace(" ", "").replace("-", "")
                        digits = re.sub(r"\D", "", p_raw)
                        if len(digits) == 10:
                            resolved_agent_phone = f"+91{digits}"
                        elif len(digits) == 12 and digits.startswith("91"):
                            resolved_agent_phone = f"+{digits}"
                        else:
                            resolved_agent_phone = f"+{p_raw}" if not p_raw.startswith("+") else p_raw
            except Exception as a_err:
                logger.warning(f"[SarvamOutboundService] Error checking agent sarvam_agent_id: {a_err}")

            # Check phone_numbers table if agent phone not set on agents record
            if resolved_agent_phone == self.caller_number:
                try:
                    p_lookup = await asyncio.to_thread(
                        supabase_admin.table("phone_numbers")
                        .select("phone_number")
                        .eq("assigned_agent_id", agent_id)
                        .limit(1)
                        .execute
                    )
                    if p_lookup.data and p_lookup.data[0].get("phone_number"):
                        p_raw = str(p_lookup.data[0]["phone_number"]).strip().replace(" ", "").replace("-", "")
                        digits = re.sub(r"\D", "", p_raw)
                        if len(digits) == 10:
                            resolved_agent_phone = f"+91{digits}"
                        elif len(digits) == 12 and digits.startswith("91"):
                            resolved_agent_phone = f"+{digits}"
                        else:
                            resolved_agent_phone = f"+{p_raw}" if not p_raw.startswith("+") else p_raw
                except Exception as p_err:
                    logger.warning(f"[SarvamOutboundService] Error checking phone_numbers: {p_err}")

        # Resolve organization/company name for tenant
        if resolved_org_id:
            try:
                org_row = await asyncio.to_thread(
                    supabase_admin.table("organizations")
                    .select("name")
                    .eq("id", resolved_org_id)
                    .maybe_single()
                    .execute
                )
                if org_row.data and org_row.data.get("name"):
                    resolved_biz_name = org_row.data["name"]
            except Exception:
                pass

        if not resolved_biz_name and resolved_user_id:
            try:
                prof_row = await asyncio.to_thread(
                    supabase_admin.table("profiles")
                    .select("company_name, full_name")
                    .eq("id", resolved_user_id)
                    .maybe_single()
                    .execute
                )
                if prof_row.data:
                    resolved_biz_name = prof_row.data.get("company_name") or prof_row.data.get("full_name") or ""
            except Exception:
                pass

        # Expand user_config with comprehensive aliases for Sarvam app templates
        c_name = (contact_name or user_config.get("customer_name") or user_config.get("user_name") or "").strip()
        first_name = c_name.split()[0] if c_name else ""
        salutation = f"{first_name} ji" if first_name else "sir"
        prospect_comp = (
            user_config.get("prospect_company") or 
            user_config.get("customer_company") or 
            (custom_metadata.get("prospect_company") if custom_metadata else None) or 
            ""
        ).strip()

        final_business_name = resolved_biz_name or "Purvi Roadlines"
        resolved_agent = resolved_agent_name or user_config.get("agent_name") or "Jitendra"

        user_config.update({
            # Agent Aliases
            "agent_name": resolved_agent,
            "agent": resolved_agent,
            "bot_name": resolved_agent,
            "name": resolved_agent,

            # Business / Tenant Aliases
            "company_name": final_business_name,
            "company": final_business_name,
            "business_name": final_business_name,
            "business": final_business_name,

            # Prospect / Customer Aliases
            "customer_name": c_name or "Customer",
            "prospect_name": c_name or "Customer",
            "user_name": c_name or "Customer",
            "customer_first_name": first_name or "sir",
            "first_name": first_name or "sir",
            "customer_salutation": salutation,
            "salutation": salutation,

            # Prospect Company Aliases
            "prospect_company": prospect_comp,
            "customer_company": prospect_comp,
            "client_company": prospect_comp,

            # Contact Phone Aliases
            "customer_phone": cleaned_phone,
            "user_phone_number": cleaned_phone,
            "user_phone": cleaned_phone,
            "phone": cleaned_phone,
            "phone_number": cleaned_phone,
            "contact_phone": cleaned_phone,
        })

        if not user_config.get("intent"):
            user_config["intent"] = (
                user_config.get("call_purpose") or 
                user_config.get("purpose") or 
                user_config.get("lead_intent") or 
                "consultative inquiry and freight solutions"
            )
        if not user_config.get("notes"):
            user_config["notes"] = (
                user_config.get("customer_notes") or 
                user_config.get("business_description") or 
                prospect_comp or 
                ""
            )

        # Ensure webhook_url is ALWAYS populated so Sarvam sends transcript and audio back
        if not webhook_url:
            from app.services.config_service import ConfigService
            webhook_base = ConfigService.get("TRINETRA_WEBHOOK_BASE_URL") or os.getenv("TRINETRA_WEBHOOK_BASE_URL") or "https://trinetra-ai-1-6f2n.onrender.com"
            webhook_base = webhook_base.rstrip("/")
            target_org_webhook = resolved_org_id or "default"
            webhook_url = f"{webhook_base}/webhooks/voice/sarvam/{target_org_webhook}?agent_id={agent_id or ''}"
            if custom_metadata and custom_metadata.get("contact_id"):
                webhook_url += f"&contact_id={custom_metadata['contact_id']}"

        payload: Dict[str, Any] = {
            "app_config": {
                "app_id": target_app_id,
                "app_version": 1,
                "connection_config": {
                    "connection_id": self.connection_id,
                    "agent_phone_number": resolved_agent_phone
                }
            },
            "user_config": user_config,
            "webhook_config": {"url": webhook_url}
        }

        logger.info(f"[SarvamOutboundService] Dialing {cleaned_phone} via agent {target_app_id} (CLI: {resolved_agent_phone})")

        try:
            import json
            import urllib.request

            def _send_sarvam_request():
                req_data = json.dumps(payload).encode('utf-8')
                request = urllib.request.Request(
                    url,
                    data=req_data,
                    headers=headers,
                    method="POST"
                )
                with urllib.request.urlopen(request, timeout=12.0) as response:
                    return response.status, json.loads(response.read().decode('utf-8'))

            status_code, res_data = await asyncio.to_thread(_send_sarvam_request)

            if status_code in (200, 201):
                attempt_id = res_data.get("attempt_id") or f"att_{datetime.now(timezone.utc).timestamp()}"
                logger.info(f"[SarvamOutboundService] Call queued. Attempt ID: {attempt_id}")

                # Spawn automatic background poller to sync call as soon as completed
                asyncio.create_task(
                    self.poll_and_sync_attempt(
                        attempt_id=attempt_id,
                        target_phone=cleaned_phone,
                        contact_name=contact_name or "Customer",
                        user_id=resolved_user_id or user_id or DEFAULT_USER_ID,
                        org_id=resolved_org_id or org_id or DEFAULT_ORGANIZATION_ID,
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
                logger.error(f"[SarvamOutboundService] Dial Failed ({status_code}): {res_data}")
                return {
                    "success": False,
                    "error": f"Sarvam HTTP {status_code}: {res_data}",
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
        poll_interval: int = 3
    ):
        """
        Polls Sarvam Analytics API until the call is completed, then automatically
        syncs recordings, transcript, and leads into Trinetra.
        """
        logger.info(f"[Sarvam Poller] Started tracking attempt {attempt_id} for {target_phone}")
        # Wait 3 seconds before first check to let call establish
        await asyncio.sleep(3)

        for i in range(max_attempts):
            try:
                synced = await self.sync_recent_calls(
                    hours_back=24,
                    match_attempt_id=attempt_id,
                    user_id=user_id,
                    org_id=org_id,
                    agent_id=agent_id,
                    contact_name=contact_name
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
        agent_id: Optional[str] = None,
        contact_name: Optional[str] = None,
        app_id: Optional[str] = None
    ) -> int:
        """
        Pulls completed call attempts from Sarvam Analytics API and syncs to Supabase.
        Dynamically routes analytics to the tenant's registered Sarvam agent and organization.
        """
        if not self.api_key:
            logger.warning("[Sarvam Sync] SARVAM_WORKSPACE_API_KEY is missing.")
            return 0

        target_user = user_id or DEFAULT_USER_ID
        target_org = org_id or DEFAULT_ORGANIZATION_ID
        target_agent = agent_id or DEFAULT_AGENT_ID
        target_app = app_id or self.app_id

        # Dynamically resolve target_app from agent if sarvam_agent_id is registered
        if agent_id and not app_id:
            try:
                a_row = await asyncio.to_thread(
                    supabase_admin.table("agents")
                    .select("sarvam_agent_id, organization_id, user_id")
                    .eq("id", agent_id)
                    .maybe_single()
                    .execute
                )
                if a_row.data:
                    if a_row.data.get("sarvam_agent_id"):
                        target_app = a_row.data["sarvam_agent_id"]
                    target_org = a_row.data.get("organization_id") or target_org
                    target_user = a_row.data.get("user_id") or target_user
            except Exception as e:
                logger.warning(f"[Sarvam Sync] Agent resolution notice: {e}")

        now = datetime.now(timezone.utc)
        start_time = now - timedelta(hours=hours_back)
        start_str = start_time.strftime("%Y-%m-%dT00:00:00Z")
        end_str = now.strftime("%Y-%m-%dT23:59:59Z")

        base_url = f"https://apps.sarvam.ai/api/analytics/v1/{self.org_id}/{self.workspace_id}/{target_app}"
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
                        if inter_id and inter_id != "NO_INTERACTION_ID":
                            direct_rec_url = f"https://apps.sarvam.ai/api/analytics/v1/{self.org_id}/{self.workspace_id}/{target_app}/recordings/{inter_id}"
                            if not audio_url:
                                audio_url = direct_rec_url
                        duration = int(float(att.get("duration_in_seconds") or 0))
                        status_raw = (att.get("connectivity_status") or "completed").lower()
                        stat_normalized = "completed" if status_raw in ("connected", "completed") else status_raw

                        agent_vars = att.get("agent_variables") or {}
                        raw_var_name = agent_vars.get("user_name") or agent_vars.get("customer_name") or agent_vars.get("name")
                        if raw_var_name and str(raw_var_name).strip().lower() in ("amar", "shubh", "ritu", "contact", "user", "test", "unknown"):
                            raw_var_name = None
                        user_name = contact_name or raw_var_name or ""
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

                        # Evaluate call intelligence using Gemini 2.5 Flash + robust heuristics
                        intelligence = await self.evaluate_call_intelligence(
                            transcript_text=transcript_text,
                            summary=summary,
                            duration=duration,
                            caller_phone=caller_phone_field,
                            template_name=user_name,
                            target_user=target_user,
                            target_org=target_org
                        )

                        resolved_name = intelligence["caller_name"]
                        final_sentiment = intelligence["sentiment"]
                        final_outcome = intelligence["outcome"]
                        final_summary = intelligence["call_summary"]

                        # 1. Upsert into voice_calls
                        call_payload = {
                            "user_id": target_user,
                            "organization_id": target_org,
                            "agent_id": target_agent,
                            "caller_name": resolved_name,
                            "caller_phone": caller_phone_field,
                            "duration_seconds": duration,
                            "status": stat_normalized,
                            "sentiment": final_sentiment,
                            "outcome": final_outcome,
                            "recording_url": audio_url,
                            "transcript": transcript_text,
                            "call_summary": final_summary,
                            "language_detected": "Hindi",
                            "metadata": {
                                "provider": "sarvam",
                                "attempt_id": att_id,
                                "interaction_id": inter_id,
                                "agent_variables": agent_vars,
                                "intelligence": intelligence
                            }
                        }

                        # Use true historical timestamp from Sarvam instead of server insert time
                        att_time = att.get("attempted_at") or att.get("start_datetime")
                        if att_time:
                            iso_time = att_time if (att_time.endswith("Z") or "+" in att_time) else f"{att_time}+00:00"
                            call_payload["created_at"] = iso_time
                            call_payload["started_at"] = iso_time

                        # Strict deduplication check
                        existing_call = None
                        if att_id and att_id != "NO_JOB_ID":
                            c_res = await asyncio.to_thread(
                                supabase_admin.table("voice_calls").select("id").filter("metadata->>attempt_id", "eq", att_id).limit(1).execute
                            )
                            if c_res.data:
                                existing_call = c_res.data[0]

                        if not existing_call and inter_id and inter_id != "NO_INTERACTION_ID":
                            c_res = await asyncio.to_thread(
                                supabase_admin.table("voice_calls").select("id").filter("metadata->>interaction_id", "eq", inter_id).limit(1).execute
                            )
                            if c_res.data:
                                existing_call = c_res.data[0]

                        if not existing_call and att_id and att_id != "NO_JOB_ID":
                            c_res = await asyncio.to_thread(
                                supabase_admin.table("voice_calls").select("id").filter("metadata->>provider_call_id", "eq", att_id).limit(1).execute
                            )
                            if c_res.data:
                                existing_call = c_res.data[0]

                        if not existing_call and audio_url:
                            c_res = await asyncio.to_thread(
                                supabase_admin.table("voice_calls").select("id").eq("recording_url", audio_url).limit(1).execute
                            )
                            if c_res.data:
                                existing_call = c_res.data[0]

                        # Fallback: Match any recent in_progress call record for this prospect phone
                        if not existing_call and phone_for_lead:
                            clean_p = re.sub(r"\D", "", phone_for_lead)
                            last10 = clean_p[-10:] if len(clean_p) >= 10 else clean_p
                            if last10:
                                c_res = await asyncio.to_thread(
                                    supabase_admin.table("voice_calls")
                                    .select("id")
                                    .eq("status", "in_progress")
                                    .ilike("caller_phone", f"%{last10}%")
                                    .order("created_at", desc=True)
                                    .limit(1)
                                    .execute
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
                                "full_name": resolved_name,
                                "phone": phone_for_lead,
                                "email": email_for_lead,
                                "status": "qualified" if intelligence.get("is_lead") else "contacted",
                                "stage": "contacted",
                                "interest_level": "high" if final_sentiment == "positive" else ("low" if final_sentiment == "negative" else "medium"),
                                "source": "voice_demo",
                                "notes": final_summary,
                                "call_summary": final_summary,
                                "call_id": call_id
                            }
                            if phone_for_lead:
                                exist_lead = await asyncio.to_thread(
                                    supabase_admin.table("leads").select("id").eq("phone", phone_for_lead).eq("user_id", target_user).execute
                                )
                            else:
                                exist_lead = await asyncio.to_thread(
                                    supabase_admin.table("leads").select("id").eq("email", email_for_lead).eq("user_id", target_user).execute
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
                                "full_name": resolved_name,
                                "phone_number": phone_for_lead,
                                "total_calls": 1,
                                "notes": final_summary,
                                "tags": ["sarvam_outbound", "preview_requested"]
                            }
                            exist_cust = await asyncio.to_thread(
                                supabase_admin.table("customer_contacts").select("id").eq("phone_number", phone_for_lead).eq("organization_id", target_org).execute
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
                            clean_lead_digits = re.sub(r"\D", "", phone_for_lead)
                            clean_10 = clean_lead_digits[-10:] if len(clean_lead_digits) >= 10 else clean_lead_digits
                            camp_update_data = {
                                "call_status": "answered",
                                "call_id": call_id,
                                "notes": final_summary
                            }
                            # Robust matching by phone ending with clean 10 digits or exact match
                            if clean_10:
                                await asyncio.to_thread(
                                    supabase_admin.table("campaign_contacts")
                                    .update(camp_update_data)
                                    .ilike("phone", f"%{clean_10}%")
                                    .execute
                                )

                            camp_lookup = await asyncio.to_thread(
                                supabase_admin.table("campaign_contacts")
                                .select("campaign_id")
                                .ilike("phone", f"%{clean_10}%")
                                .limit(1)
                                .execute
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
                        if intelligence.get("appointment_booked") and final_outcome == "Appointment Booked" and phone_for_lead:
                            try:
                                exist_appt = await asyncio.to_thread(
                                    supabase_admin.table("appointments").select("id").eq("voice_call_id", call_id).limit(1).execute
                                )
                                if not exist_appt.data and call_id:
                                    scheduled_iso = intelligence.get("appointment_time_iso")
                                    if not scheduled_iso:
                                        scheduled_iso = (datetime.now(timezone.utc) + timedelta(days=1)).replace(hour=5, minute=30, second=0, microsecond=0).isoformat()

                                    ins_appt = await asyncio.to_thread(
                                        supabase_admin.table("appointments").insert({
                                            "user_id": target_user,
                                            "agent_id": target_agent,
                                            "contact_name": resolved_name,
                                            "contact_phone": phone_for_lead,
                                            "scheduled_at": scheduled_iso,
                                            "duration_minutes": 15,
                                            "status": "scheduled",
                                            "booked_via": "voice_call",
                                            "meeting_type": "Appointment / Demo",
                                            "notes": intelligence.get("appointment_notes") or final_summary,
                                            "voice_call_id": call_id
                                        }).execute
                                    )
                                    if ins_appt.data and len(ins_appt.data) > 0:
                                        appt_id = ins_appt.data[0]["id"]
                                        await asyncio.to_thread(
                                            supabase_admin.table("voice_calls").update({"appointment_id": appt_id}).eq("id", call_id).execute
                                        )
                                    logger.info(f"[Sarvam Sync] Automatically booked appointment for {resolved_name} ({phone_for_lead}) at {scheduled_iso}")

                                    # Dispatch notification to Dashboard & WhatsApp
                                    try:
                                        from app.services.notification_service import NotificationService
                                        await NotificationService.dispatch(
                                            user_id=target_user,
                                            event_type="appointment_scheduled",
                                            title="New Appointment Booked",
                                            message=f"Appointment booked for {resolved_name} ({phone_for_lead}) at {scheduled_iso}.",
                                            payload={
                                                "contact_name": resolved_name,
                                                "contact_phone": phone_for_lead,
                                                "scheduled_at": scheduled_iso,
                                                "action_url": "/dashboard/appointments",
                                                "action_label": "View Appointment",
                                                "call_id": call_id
                                            }
                                        )
                                    except Exception as notif_err:
                                        logger.warning(f"[Sarvam Sync] Notification dispatch error: {notif_err}")
                            except Exception as appt_err:
                                logger.warning(f"[Sarvam Sync] Appointment booking error: {appt_err}")

                        # 6. Auto-schedule Callback if prospect requested callback or busy
                        if (final_outcome == "Callback Scheduled" or "callback" in final_summary.lower()) and phone_for_lead:
                            try:
                                exist_cb = await asyncio.to_thread(
                                    supabase_admin.table("callbacks").select("id").eq("original_call_id", call_id).limit(1).execute
                                )
                                if not exist_cb.data and call_id:
                                    cb_time = intelligence.get("appointment_time_iso") or (datetime.now(timezone.utc) + timedelta(hours=3)).replace(microsecond=0).isoformat()
                                    await asyncio.to_thread(
                                        supabase_admin.table("callbacks").insert({
                                            "organization_id": target_org,
                                            "agent_id": target_agent,
                                            "original_call_id": call_id,
                                            "prospect_name": resolved_name,
                                            "prospect_phone": phone_for_lead,
                                            "scheduled_at": cb_time,
                                            "timezone": "Asia/Kolkata",
                                            "notes": final_summary or "Scheduled callback requested by customer during call.",
                                            "status": "scheduled",
                                            "priority": "normal"
                                        }).execute
                                    )
                                    logger.info(f"[Sarvam Sync] Auto-scheduled callback for {resolved_name} ({phone_for_lead}) at {cb_time}")
                            except Exception as cb_err:
                                logger.warning(f"[Sarvam Sync] Callback auto-scheduling error: {cb_err}")

                        # 7. Token-to-Minute Safe Deduction
                        # Benchmark Metrics for Conversational Hindi/Hinglish TTS:
                        # - Avg Human speech rate: 130-150 words/min
                        # - Avg characters per word (Hinglish/Hindi): 4.8 - 5.5 characters
                        # - Actual Sarvam character consumption per minute of synthesized audio: ~750 - 850 characters
                        # - Safe-space character ceiling: 850 characters = 1 billable minute
                        try:
                            from app.services.usage_service import UsageService
                            total_chars = len(transcript_text or "")
                            total_words = len((transcript_text or "").split())
                            
                            char_mins = (total_chars + 849) // 850 if total_chars > 0 else 0
                            word_mins = (total_words + 179) // 180 if total_words > 0 else 0
                            duration_mins = (duration + 59) // 60 if duration > 0 else 0
                            
                            # Billable minutes takes the highest of actual duration, character load, or conversational word count
                            billable_minutes = max(1, duration_mins, word_mins, char_mins)

                            u_svc = UsageService(supabase_admin)
                            await u_svc.increment_minutes(target_agent, billable_minutes * 60)
                            logger.info(f"[Sarvam Sync] Deducted {billable_minutes}m for call {call_id} (duration={duration}s, chars={total_chars}, words={total_words}, rate: 850 chars or 180 words/min)")
                        except Exception as usage_err:
                            logger.warning(f"[Sarvam Sync] Usage deduction error: {usage_err}")

                        synced_count += 1
                        logger.info(f"[Sarvam Sync] Synced call {call_id}: caller={resolved_name}, phone={caller_phone_field}, sentiment={final_sentiment}, outcome='{final_outcome}'")

                    except Exception as item_err:
                        logger.error(f"[Sarvam Sync Item Error] Failed to process attempt: {item_err}", exc_info=True)

        except Exception as e:
            logger.error(f"[Sarvam Sync] Error during sync: {e}", exc_info=True)

        return synced_count
