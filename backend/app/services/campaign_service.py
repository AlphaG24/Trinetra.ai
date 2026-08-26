import os
import io
import re
import csv
import uuid
import asyncio
import logging
import random
from datetime import datetime, time, timezone, timedelta
from typing import Dict, List, Optional, Any, Tuple
import openpyxl

from database import supabase_admin
from app.services.telephony.simulated import SimulatedProvider

logger = logging.getLogger("CampaignService")

# Global set to hold reference to background running tasks to prevent garbage collection
running_campaign_tasks = set()

class CampaignService:
    @staticmethod
    def clean_phone(phone_str: str) -> str:
        if not phone_str:
            return ""
        cleaned = re.sub(r"[^\d+]", "", str(phone_str).strip())
        return cleaned

    @staticmethod
    def get_current_time_in_timezone(tz_name: str) -> Tuple[datetime, time]:
        now_utc = datetime.now(timezone.utc)
        tz_clean = tz_name.lower().strip()
        
        # Mapping for common offsets
        tz_offsets = {
            "asia/kolkata": timedelta(hours=5, minutes=30),
            "ist": timedelta(hours=5, minutes=30),
            "utc": timedelta(hours=0),
            "gmt": timedelta(hours=0),
            "america/new_york": timedelta(hours=-5),
            "est": timedelta(hours=-5),
            "edt": timedelta(hours=-4),
        }
        
        offset = tz_offsets.get(tz_clean)
        if offset is not None:
            local_dt = now_utc + offset
            return local_dt, local_dt.time()
            
        try:
            from zoneinfo import ZoneInfo
            local_dt = now_utc.astimezone(ZoneInfo(tz_name))
            return local_dt, local_dt.time()
        except Exception:
            try:
                import pytz
                local_dt = now_utc.astimezone(pytz.timezone(tz_name))
                return local_dt, local_dt.time()
            except Exception:
                logger.warning(f"Timezone {tz_name} not resolved. Defaulting to Asia/Kolkata (IST)")
                local_dt = now_utc + timedelta(hours=5, minutes=30)
                return local_dt, local_dt.time()

    @staticmethod
    def is_within_calling_hours(start_str: str, end_str: str, tz_name: str) -> Tuple[bool, str]:
        try:
            _, local_time = CampaignService.get_current_time_in_timezone(tz_name)
            
            # Parse start and end hours (handle HH:MM and HH:MM:SS formats)
            start_parts = start_str.split(':')
            sh, sm = int(start_parts[0]), int(start_parts[1])
            end_parts = end_str.split(':')
            eh, em = int(end_parts[0]), int(end_parts[1])
            
            start_time = time(sh, sm)
            end_time = time(eh, em)
            
            # Simple check (assumes standard day ranges, not crossing midnight)
            if start_time <= end_time:
                within = start_time <= local_time <= end_time
            else: # crosses midnight
                within = local_time >= start_time or local_time <= end_time
                
            return within, f"Current local time: {local_time.strftime('%H:%M:%S')}. Window: {start_str} - {end_str}."
        except Exception as e:
            logger.error(f"Error checking calling hours: {e}")
            return True, "Error checking calling hours. Proceeding by default."

    @staticmethod
    async def create_campaign(
        organization_id: str,
        agent_id: str,
        name: str,
        file_content: bytes,
        filename: str,
        calling_hours_start: str = "10:00",
        calling_hours_end: str = "18:00",
        timezone_str: str = "Asia/Kolkata",
        scheduled_start: Optional[str] = None
    ) -> Dict:
        logger.info(f"Creating campaign: {name} (org: {organization_id})")
        
        # Check if agent is a free demo agent
        agent_res = await asyncio.to_thread(
            supabase_admin.table("agents").select("id, name, is_demo, agent_type").eq("id", agent_id).single().execute
        )
        if not agent_res.data:
            raise ValueError("Agent not found.")
        agent = agent_res.data
        
        raw_name = agent.get("name") or ""
        clean_name = re.sub(r"^\[[^\]]+\]\s*", "", raw_name).strip().lower()
        is_name_demo = clean_name == "demo" or clean_name.startswith("demo")
        
        if agent.get("is_demo") or agent.get("agent_type") == "free_demo" or is_name_demo:
            raise ValueError("Free demo agents cannot be used in campaigns. Only paid or premium demo agents are allowed.")
        
        # 1. Generate campaign UUID
        campaign_id = str(uuid.uuid4())
        
        # 2. Upload file to Supabase Storage bucket: campaign-contacts
        contact_list_url = None
        storage_path = f"{organization_id}/{campaign_id}_{filename}"
        try:
            content_type = "text/csv" if filename.endswith(".csv") else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            
            # Async wrapper for upload
            upload_res = await asyncio.to_thread(
                supabase_admin.storage.from_("campaign-contacts").upload,
                path=storage_path,
                file=file_content,
                file_options={"content-type": content_type}
            )
            
            # Get public url
            supabase_url = os.getenv("SUPABASE_URL", "https://euoucnrjfucowzqdeqpy.supabase.co")
            contact_list_url = f"{supabase_url}/storage/v1/object/public/campaign-contacts/{storage_path}"
            logger.info(f"File uploaded successfully. URL: {contact_list_url}")
        except Exception as storage_err:
            logger.warning(f"Failed to upload spreadsheet to storage bucket: {storage_err}. Falling back to local mock URL.")
            contact_list_url = f"https://mock-storage.trinetraedu-ai.com/{storage_path}"

        # 3. Parse spreadsheet content
        contacts = []
        if filename.endswith(".csv"):
            try:
                decoded = file_content.decode("utf-8-sig")
                reader = csv.DictReader(io.StringIO(decoded))
                for row in reader:
                    # Normalize keys
                    row_norm = {k.lower().replace("_", "").replace(" ", ""): v for k, v in row.items() if k}
                    
                    # Find phone number (required)
                    phone_key = next((k for k in ["phone", "phonenumber", "mobile", "mobilenumber", "contact", "contactnumber"] if k in row_norm), None)
                    if not phone_key or not row_norm[phone_key]:
                        continue
                        
                    phone = CampaignService.clean_phone(row_norm[phone_key])
                    if not phone:
                        continue
                        
                    # Find full name
                    name_key = next((k for k in ["name", "fullname", "contactname", "prospect"] if k in row_norm), None)
                    full_name = row_norm[name_key] if name_key else ""
                    
                    # Find company
                    company_key = next((k for k in ["company", "companyname", "organization", "org"] if k in row_norm), None)
                    company = row_norm[company_key] if company_key else ""
                    
                    # Find notes
                    notes_key = next((k for k in ["notes", "note", "description", "remarks", "comment"] if k in row_norm), None)
                    notes = row_norm[notes_key] if notes_key else ""
                    
                    contacts.append({
                        "campaign_id": campaign_id,
                        "full_name": full_name,
                        "phone": phone,
                        "company_name": company,
                        "notes": notes,
                        "call_status": "pending"
                    })
            except Exception as csv_err:
                logger.error(f"Failed to parse CSV: {csv_err}")
                raise ValueError(f"Failed to parse CSV file: {csv_err}")
        else: # Excel
            try:
                wb = openpyxl.load_workbook(io.BytesIO(file_content), data_only=True)
                sheet = wb.active
                
                # Fetch header row
                headers = [str(cell.value).lower().replace("_", "").replace(" ", "") if cell.value else "" for cell in sheet[1]]
                
                phone_idx = next((i for i, h in enumerate(headers) if h in ["phone", "phonenumber", "mobile", "mobilenumber", "contact", "contactnumber"]), None)
                if phone_idx is None:
                    raise ValueError("Spreadsheet must contain a phone column (e.g. Phone, Mobile, Contact)")
                    
                name_idx = next((i for i, h in enumerate(headers) if h in ["name", "fullname", "contactname", "prospect"]), None)
                company_idx = next((i for i, h in enumerate(headers) if h in ["company", "companyname", "organization", "org"]), None)
                notes_idx = next((i for i, h in enumerate(headers) if h in ["notes", "note", "description", "remarks", "comment"]), None)
                
                # Read rows
                for r_idx in range(2, sheet.max_row + 1):
                    row_vals = [cell.value for cell in sheet[r_idx]]
                    if not row_vals or len(row_vals) <= phone_idx or not row_vals[phone_idx]:
                        continue
                        
                    phone = CampaignService.clean_phone(row_vals[phone_idx])
                    if not phone:
                        continue
                        
                    full_name = str(row_vals[name_idx]) if (name_idx is not None and len(row_vals) > name_idx and row_vals[name_idx]) else ""
                    company = str(row_vals[company_idx]) if (company_idx is not None and len(row_vals) > company_idx and row_vals[company_idx]) else ""
                    notes = str(row_vals[notes_idx]) if (notes_idx is not None and len(row_vals) > notes_idx and row_vals[notes_idx]) else ""
                    
                    contacts.append({
                        "campaign_id": campaign_id,
                        "full_name": full_name,
                        "phone": phone,
                        "company_name": company,
                        "notes": notes,
                        "call_status": "pending"
                    })
            except Exception as xlsx_err:
                logger.error(f"Failed to parse Excel: {xlsx_err}")
                raise ValueError(f"Failed to parse Excel file: {xlsx_err}")

        if not contacts:
            raise ValueError("No valid contacts with phone numbers found in the uploaded file.")

        # 4. Insert Campaign row in DB
        campaign_payload = {
            "id": campaign_id,
            "organization_id": organization_id,
            "agent_id": agent_id,
            "name": name,
            "status": "ready",
            "contact_list_url": contact_list_url,
            "total_contacts": len(contacts),
            "contacts_called": 0,
            "contacts_connected": 0,
            "leads_generated": 0,
            "calling_hours_start": calling_hours_start,
            "calling_hours_end": calling_hours_end,
            "timezone": timezone_str,
            "scheduled_start": scheduled_start
        }
        
        await asyncio.to_thread(
            supabase_admin.table("campaigns").insert(campaign_payload).execute
        )
        
        # 5. Bulk insert contacts in batches of 500
        logger.info(f"Saving {len(contacts)} contacts for campaign {campaign_id}")
        batch_size = 500
        for i in range(0, len(contacts), batch_size):
            batch = contacts[i:i+batch_size]
            await asyncio.to_thread(
                supabase_admin.table("campaign_contacts").insert(batch).execute
            )

        return campaign_payload

    @staticmethod
    async def start_campaign(campaign_id: str) -> Dict:
        logger.info(f"Starting campaign: {campaign_id}")
        
        # Bulk DND check on all pending contacts
        contacts = await asyncio.to_thread(
            supabase_admin.table("campaign_contacts")
            .select("id, phone")
            .eq("campaign_id", campaign_id)
            .eq("call_status", "pending")
            .execute
        )
        
        if contacts.data:
            from app.services.dnd_service import DNDService
            dnd_service = DNDService(supabase_admin)
            phones = [c["phone"] for c in contacts.data]
            dnd_results = await dnd_service.check_numbers_batch(phones)
            
            # Mark DND numbers immediately
            dnd_ids = [c["id"] for c in contacts.data if dnd_results.get(c["phone"], False)]
            if dnd_ids:
                await asyncio.to_thread(
                    supabase_admin.table("campaign_contacts").update({
                        "call_status": "dnd"
                    }).in_("id", dnd_ids).execute
                )
                logger.info(f"[Campaign] Pre-marked {len(dnd_ids)} DND numbers")
        
        res = await asyncio.to_thread(
            supabase_admin.table("campaigns")
            .update({"status": "running"})
            .eq("id", campaign_id)
            .execute
        )
        
        # Spawn background dialer loop
        task = asyncio.create_task(CampaignService.run_campaign_loop(campaign_id))
        running_campaign_tasks.add(task)
        task.add_done_callback(running_campaign_tasks.discard)
        
        return res.data[0] if res.data else {}

    @staticmethod
    async def pause_campaign(campaign_id: str) -> Dict:
        logger.info(f"Pausing campaign: {campaign_id}")
        res = await asyncio.to_thread(
            supabase_admin.table("campaigns")
            .update({"status": "paused"})
            .eq("id", campaign_id)
            .execute
        )
        return res.data[0] if res.data else {}

    @staticmethod
    async def resume_campaign(campaign_id: str) -> Dict:
        logger.info(f"Resuming campaign: {campaign_id}")
        res = await asyncio.to_thread(
            supabase_admin.table("campaigns")
            .update({"status": "running"})
            .eq("id", campaign_id)
            .execute
        )
        
        # Spawn background dialer loop
        task = asyncio.create_task(CampaignService.run_campaign_loop(campaign_id))
        running_campaign_tasks.add(task)
        task.add_done_callback(running_campaign_tasks.discard)
        
        return res.data[0] if res.data else {}

    @staticmethod
    async def run_campaign_loop(campaign_id: str):
        logger.info(f"Background dialing runner initialized for campaign {campaign_id}")
        while True:
            # 1. Fetch current status
            campaign_res = await asyncio.to_thread(
                supabase_admin.table("campaigns").select("*").eq("id", campaign_id).single().execute
            )
            
            if not campaign_res.data:
                logger.error(f"Campaign {campaign_id} not found. Terminating runner.")
                break
                
            campaign = campaign_res.data
            status = campaign.get("status")
            
            if status != "running":
                logger.info(f"Campaign {campaign_id} status changed to {status}. Stopping background runner.")
                break
                
            # 2. Check calling hours
            start_hours = campaign.get("calling_hours_start") or "10:00"
            end_hours = campaign.get("calling_hours_end") or "18:00"
            timezone_str = campaign.get("timezone") or "Asia/Kolkata"
            
            within_hours, log_msg = CampaignService.is_within_calling_hours(start_hours, end_hours, timezone_str)
            if not within_hours:
                logger.info(f"Campaign {campaign_id} is outside calling hours. {log_msg} Sleeping 60s...")
                await asyncio.sleep(60.0) # Check again in a minute
                continue
                
            # 3. Process next contact
            has_more = await CampaignService.process_next_contact(campaign_id, campaign)
            if not has_more:
                logger.info(f"Campaign {campaign_id} completed: No more pending contacts.")
                await asyncio.to_thread(
                    supabase_admin.table("campaigns")
                    .update({
                        "status": "completed",
                        "completed_at": datetime.now(timezone.utc).isoformat()
                    })
                    .eq("id", campaign_id)
                    .execute
                )
                # Dispatch consolidated campaign report notification
                try:
                    await CampaignService.dispatch_campaign_report(campaign_id, campaign)
                except Exception as report_err:
                    logger.error(f"Failed to dispatch campaign report: {report_err}")
                break
                
            # Simulate a calling cooldown/processing interval
            await asyncio.sleep(3.0)

    @staticmethod
    async def process_next_contact(campaign_id: str, campaign_data: Dict) -> bool:
        # 1. Find next pending contact
        contacts_res = await asyncio.to_thread(
            supabase_admin.table("campaign_contacts")
            .select("*")
            .eq("campaign_id", campaign_id)
            .eq("call_status", "pending")
            .order("created_at")
            .limit(1)
            .execute
        )
        
        if not contacts_res.data:
            return False
            
        contact = contacts_res.data[0]
        contact_id = contact["id"]
        
        # DND check before dialing
        from app.services.dnd_service import DNDService
        dnd_service = DNDService(supabase_admin)
        is_dnd = await dnd_service.check_number(contact["phone"])
        
        if is_dnd:
            await asyncio.to_thread(
                supabase_admin.table("campaign_contacts").update({
                    "call_status": "dnd",
                    "last_attempt_at": datetime.now(timezone.utc).isoformat()
                }).eq("id", contact_id).execute
            )
            logger.info(f"[Campaign] Skipped DND number: {contact['phone']}")
            return True  # Return True to continue the calling loop
        
        # 2. Update to dialing state
        await asyncio.to_thread(
            supabase_admin.table("campaign_contacts")
            .update({
                "call_status": "dialing",
                "call_attempts": contact["call_attempts"] + 1,
                "last_attempt_at": datetime.now(timezone.utc).isoformat()
            })
            .eq("id", contact_id)
            .execute
        )
        
        # 3. Fetch agent configuration to pass
        agent_id = campaign_data["agent_id"]
        organization_id = campaign_data["organization_id"]
        agent_res = await asyncio.to_thread(
            supabase_admin.table("agents").select("*").eq("id", agent_id).single().execute
        )
        
        agent = agent_res.data or {}
        
        # 4. Trigger Twilio outbound call
        from app.services.telephony.factory import get_provider
        from app.services.config_service import ConfigService

        provider = get_provider("twilio")
        webhook_base = ConfigService.get("TRINETRA_WEBHOOK_BASE_URL") or os.getenv("TRINETRA_WEBHOOK_BASE_URL") or "http://localhost:8000"
        webhook_url = f"{webhook_base}/api/voice/webhooks/voice/twilio/{organization_id}?agent_id={agent_id}&contact_id={contact_id}"
        
        agent_phone = agent.get("phone_number") or os.getenv("TWILIO_PHONE_NUMBER") or "+12282950908"
        if agent_phone and not str(agent_phone).startswith("+"):
            agent_phone = f"+{agent_phone}"
            
        contact_phone = str(contact["phone"]).strip()
        if not contact_phone.startswith("+"):
            import re
            digits = re.sub(r"\D", "", contact_phone)
            if len(digits) == 10:
                # Default to India (+91) country code since customer is using IN verified numbers
                contact_phone = f"+91{digits}"
            elif len(digits) == 12 and digits.startswith("91"):
                contact_phone = f"+{digits}"
            elif len(digits) == 11 and digits.startswith("1"):
                contact_phone = f"+{digits}"
            elif len(digits) == 11 and digits.startswith("0"):
                contact_phone = f"+91{digits[1:]}"
            else:
                contact_phone = f"+{digits}"

        call_sid = None
        outcome = "failed"
        duration = 0

        # Place the real outbound call via Twilio
        try:
            call_res = await provider.make_outbound_call(contact_phone, agent_phone, webhook_url)
            call_sid = call_res.get("call_sid")
            outcome = "connected"
            logger.info(f"[Campaign Outbound] Twilio call placed successfully: SID={call_sid} to {contact_phone}")
        except Exception as dial_err:
            logger.error(f"[Campaign Outbound] Twilio call FAILED to {contact_phone}: {dial_err}")
            outcome = "failed"
            call_sid = None

        call_id = None
        lead_id = None
        
        # 5. If call connected, log the outbound call record
        #    The actual transcript and sentiment will be populated by the voice webhook
        #    once the AI agent conversation completes.
        if outcome == "connected":
            try:
                call_payload = {
                    "user_id": agent.get("user_id"),
                    "organization_id": organization_id,
                    "agent_id": agent_id,
                    "caller_phone": contact["phone"],
                    "status": "in_progress",
                    "duration_seconds": 0,
                    "metadata": {
                        "from_number": agent_phone,
                        "to_number": contact["phone"],
                        "provider_call_id": call_sid,
                        "session_id": call_sid
                    }
                }
                call_res = await asyncio.to_thread(
                    supabase_admin.table("voice_calls").insert(call_payload).execute
                )
                if call_res.data:
                    call_id = call_res.data[0]["id"]
                    logger.info(f"[Campaign] Logged outbound call record: {call_id}")
            except Exception as call_log_err:
                logger.error(f"Failed to log outbound call record: {call_log_err}")
                    
        # 6. Finalize contact status
        final_call_status = "answered" if outcome == "connected" else outcome
        await asyncio.to_thread(
            supabase_admin.table("campaign_contacts")
            .update({
                "call_status": final_call_status,
                "call_id": call_id,
                "lead_id": lead_id
            })
            .eq("id", contact_id)
            .execute
        )
        
        # 7. Update campaign metrics
        campaign_update = {
            "contacts_called": campaign_data["contacts_called"] + 1,
        }
        if outcome == "connected":
            campaign_update["contacts_connected"] = campaign_data["contacts_connected"] + 1
            if lead_id:
                campaign_update["leads_generated"] = campaign_data["leads_generated"] + 1
                
        await asyncio.to_thread(
            supabase_admin.table("campaigns")
            .update(campaign_update)
            .eq("id", campaign_id)
            .execute
        )
        
        return True

    @staticmethod
    async def list_campaigns(organization_id: str):
        result = await asyncio.to_thread(
            supabase_admin.table("campaigns")
            .select("*, agents(name)")
            .eq("organization_id", organization_id)
            .order("created_at", desc=True)
            .execute
        )
        return {"success": True, "data": result.data or []}

    @staticmethod
    async def dispatch_campaign_report(campaign_id: str, campaign_data: Dict):
        # 1. Fetch contacts outcomes
        contacts_res = await asyncio.to_thread(
            supabase_admin.table("campaign_contacts")
            .select("call_status")
            .eq("campaign_id", campaign_id)
            .execute
        )
        contacts = contacts_res.data or []
        total_contacts = len(contacts)

        answered = sum(1 for c in contacts if c.get("call_status") == "answered")
        no_answer = sum(1 for c in contacts if c.get("call_status") == "no-answer")
        failed = sum(1 for c in contacts if c.get("call_status") == "failed")
        dnd = sum(1 for c in contacts if c.get("call_status") == "dnd")

        # 2. Query scheduled callbacks
        callbacks_res = await asyncio.to_thread(
            supabase_admin.table("callbacks")
            .select("id", count="exact")
            .eq("organization_id", campaign_data.get("organization_id"))
            .eq("agent_id", campaign_data.get("agent_id"))
            .execute
        )
        callbacks_count = callbacks_res.count or 0

        # 3. Retrieve user profile
        user_res = await asyncio.to_thread(
            supabase_admin.table("profiles")
            .select("telegram_chat_id")
            .eq("id", campaign_data.get("user_id") or "")
            .maybe_single()
            .execute
        )

        telegram_chat_id = None
        if user_res.data:
            telegram_chat_id = user_res.data.get("telegram_chat_id")

        # 4. Construct report message
        report_text = (
            f"📢 *Trinetra AI Campaign Report*\n\n"
            f"*Campaign:* {campaign_data.get('name', 'Voice Campaign')}\n"
            f"*Status:* Completed ✅\n\n"
            f"📊 *Key Statistics:*\n"
            f"- Total Contacts: {total_contacts}\n"
            f"- Connected calls: {answered}\n"
            f"- Leads Extracted: {campaign_data.get('leads_generated', 0)}\n\n"
            f"📞 *Dispositions:*\n"
            f"- Answered & Talked: {answered}\n"
            f"- Callbacks Scheduled: {callbacks_count}\n"
            f"- DND / Skipped: {dnd}\n"
            f"- Failed / Switch-Off: {failed + no_answer}\n\n"
            f"🚀 *Trinetra.ai* - Human-grade Outbound Telephony."
        )

        # 5. Dispatch Telegram alert
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        if bot_token and telegram_chat_id:
            import httpx
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            payload = {
                "chat_id": telegram_chat_id,
                "text": report_text,
                "parse_mode": "Markdown"
            }
            try:
                async with httpx.AsyncClient() as client:
                    res = await client.post(url, json=payload, timeout=10.0)
                    if res.status_code == 200:
                        logger.info(f"[Report Alert] Sent campaign completion report to Telegram: {telegram_chat_id}")
                    else:
                        logger.warning(f"[Report Alert] Telegram API rejected report message: {res.text}")
            except Exception as e:
                logger.error(f"[Report Alert] Failed to post Telegram notification: {e}")
        else:
            logger.info(f"[Report Alert] Skipping Telegram report: bot_token={bool(bot_token)}, chat_id={telegram_chat_id}")
            logger.info(f"Report Output:\n{report_text}")
