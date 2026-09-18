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
active_campaign_ids = set()

class CampaignService:
    @staticmethod
    def get_provider_for_number(phone_number: str) -> str:
        cleaned = CampaignService.clean_phone(phone_number)
        if cleaned.startswith("+91") or cleaned.startswith("91"):
            return "exotel"
        return "twilio"

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
        # Transition any contacts left in 'dialing' state to 'answered'
        try:
            await asyncio.to_thread(
                supabase_admin.table("campaign_contacts")
                .update({"call_status": "answered"})
                .eq("campaign_id", campaign_id)
                .eq("call_status", "dialing")
                .execute
            )
        except Exception as e:
            logger.warning(f"Error resetting dialing contacts on pause: {e}")
        return res.data[0] if res.data else {}

    @staticmethod
    async def resume_campaign(campaign_id: str) -> Dict:
        logger.info(f"Resuming campaign: {campaign_id}")
        
        # 1. Check if there are any pending contacts
        pending_check = await asyncio.to_thread(
            supabase_admin.table("campaign_contacts")
            .select("id")
            .eq("campaign_id", campaign_id)
            .eq("call_status", "pending")
            .limit(1)
            .execute
        )
        if not pending_check.data:
            # Check if there are unreached / failed / no_answer / cancelled contacts to retry
            unreached = await asyncio.to_thread(
                supabase_admin.table("campaign_contacts")
                .select("id")
                .eq("campaign_id", campaign_id)
                .in_("call_status", ["no_answer", "failed", "dialing", "cancelled"])
                .execute
            )
            if unreached.data:
                await asyncio.to_thread(
                    supabase_admin.table("campaign_contacts")
                    .update({"call_status": "pending"})
                    .eq("campaign_id", campaign_id)
                    .in_("call_status", ["no_answer", "failed", "dialing", "cancelled"])
                    .execute
                )
                logger.info(f"Reset {len(unreached.data)} unreached contacts to pending for campaign {campaign_id}")
            else:
                # All contacts were marked answered; reset all non-DND contacts to pending for a complete rerun
                all_contacts = await asyncio.to_thread(
                    supabase_admin.table("campaign_contacts")
                    .select("id")
                    .eq("campaign_id", campaign_id)
                    .neq("call_status", "dnd")
                    .execute
                )
                if all_contacts.data:
                    await asyncio.to_thread(
                        supabase_admin.table("campaign_contacts")
                        .update({"call_status": "pending"})
                        .eq("campaign_id", campaign_id)
                        .neq("call_status", "dnd")
                        .execute
                    )
                    logger.info(f"Reset {len(all_contacts.data)} contacts to pending for full campaign rerun {campaign_id}")

        res = await asyncio.to_thread(
            supabase_admin.table("campaigns")
            .update({"status": "running"})
            .eq("id", campaign_id)
            .execute
        )
        
        # Clear any stale active_campaign_ids lock
        active_campaign_ids.discard(campaign_id)

        # Spawn background dialer loop with bypass_hours=True for immediate execution
        task = asyncio.create_task(CampaignService.run_campaign_loop(campaign_id, bypass_hours=True))
        running_campaign_tasks.add(task)
        task.add_done_callback(running_campaign_tasks.discard)
        
        return res.data[0] if res.data else {}

    @staticmethod
    async def run_campaign_loop(campaign_id: str, bypass_hours: bool = False):
        if campaign_id in active_campaign_ids:
            logger.info(f"Campaign runner already active for {campaign_id}. Skipping duplicate spawn.")
            return
        active_campaign_ids.add(campaign_id)
        logger.info(f"Background dialing runner initialized for campaign {campaign_id}")
        is_first_iteration = True
        try:
            while True:
                try:
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
                        
                    # 2. Check calling hours (bypass on first iteration if explicitly requested via manual retry)
                    if not (bypass_hours and is_first_iteration):
                        start_hours = campaign.get("calling_hours_start") or "10:00"
                        end_hours = campaign.get("calling_hours_end") or "18:00"
                        timezone_str = campaign.get("timezone") or "Asia/Kolkata"
                        
                        within_hours, log_msg = CampaignService.is_within_calling_hours(start_hours, end_hours, timezone_str)
                        if not within_hours:
                            logger.info(f"Campaign {campaign_id} is outside calling hours. {log_msg} Sleeping 60s...")
                            await asyncio.sleep(60.0) # Check again in a minute
                            continue
                    
                    is_first_iteration = False
                        
                    # 3. Process next contact
                    try:
                        has_more = await CampaignService.process_next_contact(campaign_id, campaign)
                    except Exception as step_err:
                        logger.error(f"[Campaign Loop Error] Error processing next contact: {step_err}")
                        await asyncio.sleep(3)
                        continue

                    if not has_more:
                        # Check if there are any lingering contacts in "dialing"
                        dialing_contacts = await asyncio.to_thread(
                            supabase_admin.table("campaign_contacts")
                            .select("id, last_attempt_at")
                            .eq("campaign_id", campaign_id)
                            .eq("call_status", "dialing")
                            .execute
                        )
                        if dialing_contacts.data:
                            now = datetime.now(timezone.utc)
                            all_resolved = True
                            for dc in dialing_contacts.data:
                                last_att = dc.get("last_attempt_at")
                                if last_att:
                                    try:
                                        dt = datetime.fromisoformat(last_att.replace("Z", "+00:00"))
                                        if (now - dt).total_seconds() > 45:
                                            await asyncio.to_thread(
                                                supabase_admin.table("campaign_contacts")
                                                .update({"call_status": "no_answer"})
                                                .eq("id", dc["id"])
                                                .execute
                                            )
                                        else:
                                            all_resolved = False
                                    except Exception:
                                        pass
                            if not all_resolved:
                                await asyncio.sleep(4.0)
                                continue

                        logger.info(f"Campaign {campaign_id} completed: All contacts finished.")
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
                except Exception as loop_iter_err:
                    logger.error(f"[Campaign Loop Error] Unexpected error in iteration: {loop_iter_err}")
                    await asyncio.sleep(3.0)
        finally:
            active_campaign_ids.discard(campaign_id)

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
        
        # 4. Normalize contact phone number
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

        # 5. Dynamically resolve Telephony Provider (Exotel vs Twilio vs Simulated)
        from app.services.telephony.factory import get_provider
        from app.services.config_service import ConfigService

        exo_sid = ConfigService.get("EXOTEL_ACCOUNT_SID") or os.getenv("EXOTEL_ACCOUNT_SID")
        exo_key = ConfigService.get("EXOTEL_API_KEY") or os.getenv("EXOTEL_API_KEY")
        exo_tok = ConfigService.get("EXOTEL_API_TOKEN") or os.getenv("EXOTEL_API_TOKEN")
        has_exotel = bool(exo_sid and exo_key and exo_tok)

        twilio_sid = ConfigService.get("TWILIO_ACCOUNT_SID") or os.getenv("TWILIO_ACCOUNT_SID")
        twilio_token = ConfigService.get("TWILIO_AUTH_TOKEN") or os.getenv("TWILIO_AUTH_TOKEN")
        has_twilio = bool(twilio_sid and twilio_token)

        agent_provider = (agent.get("telephony_provider") or "").lower().strip()
        if agent_provider == "exotel" and has_exotel:
            chosen_provider = "exotel"
        elif agent_provider == "twilio" and has_twilio:
            chosen_provider = "twilio"
        elif contact_phone.startswith("+91") and has_exotel:
            chosen_provider = "exotel"
        elif has_twilio:
            chosen_provider = "twilio"
        elif has_exotel:
            chosen_provider = "exotel"
        else:
            chosen_provider = "simulated"

        is_simulated = chosen_provider == "simulated"
        provider = get_provider(chosen_provider)

        unique_room = f"{chosen_provider}--{agent_id}--{contact_id}--{uuid.uuid4().hex[:8]}" if agent_id else f"{chosen_provider}--noagent--{contact_id}--{uuid.uuid4().hex[:8]}"
        webhook_base = ConfigService.get("TRINETRA_WEBHOOK_BASE_URL") or os.getenv("TRINETRA_WEBHOOK_BASE_URL") or "http://localhost:8000"
        webhook_url = f"{webhook_base}/api/voice/webhooks/voice/{chosen_provider}/{organization_id}?agent_id={agent_id}&contact_id={contact_id}&room_name={unique_room}"

        if chosen_provider == "exotel":
            agent_phone = agent.get("phone_number") or ConfigService.get("EXOTEL_CALLER_ID") or os.getenv("EXOTEL_CALLER_ID") or "+918000000000"
        else:
            agent_phone = agent.get("phone_number") or os.getenv("TWILIO_PHONE_NUMBER") or "+12282950908"

        if agent_phone and not str(agent_phone).startswith("+"):
            agent_phone = f"+{agent_phone}"

        call_sid = None
        outcome = "failed"
        duration = 0

        contact_name = contact.get("full_name") or contact.get("name") or ""
        company_name = contact.get("company_name") or contact.get("company") or ""
        notes = contact.get("notes") or ""
        agent_name = agent.get("name") or "Agent"
        business_name = campaign_data.get("name") or "Trinetra AI"

        # Place the outbound call via Twilio or Simulated fallback
        try:
            if not is_simulated:
                call_res = await provider.make_outbound_call(
                    contact_phone, 
                    agent_phone, 
                    webhook_url,
                    custom_parameters={
                        "contact_name": contact_name,
                        "company_name": company_name,
                        "notes": notes,
                        "agent_id": agent_id,
                        "contact_id": contact_id,
                        "room_name": unique_room
                    }
                )
                call_sid = call_res.get("call_sid")
                room_name = call_res.get("room_name") or unique_room
                outcome = "connected"
                logger.info(f"[Campaign Outbound] Twilio call placed successfully: SID={call_sid} to {contact_phone}, room={room_name}. External LiveKit worker will connect agent {agent_id}.")
            else:
                call_sid = f"sim-{uuid.uuid4()}"
                room_name = f"sim-{uuid.uuid4().hex[:8]}"
                outcome = "connected"
                logger.info(f"[Campaign Outbound] Simulated call placed: SID={call_sid} to {contact_phone}")
                
                # Spawn background task to simulate call completion
                asyncio.create_task(
                    simulate_call_completion(
                        call_sid=call_sid,
                        contact_id=contact_id,
                        contact_phone=contact_phone,
                        contact_name=contact_name,
                        company_name=company_name,
                        notes=notes,
                        agent_id=agent_id,
                        user_id=agent.get("user_id"),
                        organization_id=organization_id,
                        campaign_id=campaign_id,
                        agent_name=agent_name
                    )
                )
        except Exception as dial_err:
            logger.error(f"[Campaign Outbound] Call FAILED to {contact_phone}: {dial_err}")
            outcome = "failed"
            call_sid = None
            room_name = None

        call_id = None
        lead_id = None
        
        # 5. If call placed, log the outbound call record
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
                    "transcript": "",
                    "provider_call_id": call_sid,
                    "session_id": call_sid,
                    "metadata": {
                        "from_number": agent_phone,
                        "to_number": contact["phone"],
                        "provider_call_id": call_sid,
                        "session_id": call_sid,
                        "room_name": room_name,
                        "contact_id": contact_id,
                        "campaign_id": campaign_id
                    }
                }
                call_res = await asyncio.to_thread(
                    supabase_admin.table("voice_calls").insert(call_payload).execute
                )
                if call_res.data:
                    call_id = call_res.data[0]["id"]
                    logger.info(f"[Campaign] Logged outbound call record: {call_id}")

                # Proactively sync campaign contact to customer_contacts table
                if organization_id and contact.get("phone"):
                    try:
                        from app.services.caller_lookup import CallerLookupService
                        lookup_svc = CallerLookupService(supabase_admin)
                        await lookup_svc.add_manual(organization_id, {
                            "phone_number": contact["phone"],
                            "full_name": contact.get("full_name") or contact.get("name") or "Unknown",
                            "company": contact.get("company_name") or contact.get("company") or "",
                            "notes": f"Enrolled via Campaign: {campaign_data.get('name', 'Outbound Campaign')}",
                            "import_source": "campaign",
                            "tags": ["campaign", campaign_data.get("name", "campaign-contact")]
                        })
                        logger.info(f"[Campaign] Proactively synced contact {contact['phone']} to customer_contacts")
                    except Exception as sync_err:
                        logger.warning(f"[Campaign] Notice during customer_contacts proactive sync: {sync_err}")
            except Exception as call_log_err:
                logger.error(f"Failed to log outbound call record: {call_log_err}")
                    
        # 6. Update contact status:
        # If simulated, simulate_call_completion handles final status.
        # If real telephony (Twilio), status is "dialing" until callee answers or status callback arrives.
        # If failed to place, status is "failed".
        final_call_status = "dialing" if outcome == "connected" else "failed"
        await asyncio.to_thread(
            supabase_admin.table("campaign_contacts")
            .update({
                "call_status": final_call_status,
                "call_id": call_id,
                "lead_id": lead_id,
                "last_attempt_at": datetime.now(timezone.utc).isoformat()
            })
            .eq("id", contact_id)
            .execute
        )
        
        # 7. Update campaign metrics
        campaign_update = {
            "contacts_called": campaign_data["contacts_called"] + 1,
        }
        if outcome == "connected":
            # Real connections will update contacts_connected when answered in webhook/status callback
            if is_simulated:
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
            .select("*, agents(name, phone_number, telephony_provider)")
            .eq("organization_id", organization_id)
            .order("created_at", desc=True)
            .execute
        )
        return {"success": True, "data": result.data or []}

    @staticmethod
    async def dispatch_campaign_report(campaign_id: str, campaign_data: Optional[Dict] = None) -> Dict:
        """
        Gathers comprehensive metrics for a completed campaign and dispatches a rich summary
        report to Telegram, In-App notifications, and connected WhatsApp integrations.
        """
        # 1. Fetch campaign if not provided
        if not campaign_data or not campaign_data.get("name"):
            c_res = await asyncio.to_thread(
                supabase_admin.table("campaigns").select("*").eq("id", campaign_id).limit(1).execute
            )
            campaign_data = c_res.data[0] if (c_res and c_res.data) else {}

        camp_name = campaign_data.get("name", "Outbound Campaign")
        org_id = campaign_data.get("organization_id")
        agent_id = campaign_data.get("agent_id")

        # 2. Fetch contacts outcomes
        contacts_res = await asyncio.to_thread(
            supabase_admin.table("campaign_contacts")
            .select("call_status, call_id")
            .eq("campaign_id", campaign_id)
            .execute
        )
        contacts = (contacts_res.data if contacts_res else None) or []
        total_contacts = len(contacts)

        answered = sum(1 for c in contacts if (c.get("call_status") or "").lower() in ["answered", "completed"])
        no_answer = sum(1 for c in contacts if (c.get("call_status") or "").lower() in ["no_answer", "no-answer"])
        busy = sum(1 for c in contacts if (c.get("call_status") or "").lower() == "busy")
        failed = sum(1 for c in contacts if (c.get("call_status") or "").lower() == "failed")
        dnd = sum(1 for c in contacts if (c.get("call_status") or "").lower() == "dnd")
        pending = sum(1 for c in contacts if (c.get("call_status") or "").lower() in ["pending", "dialing"])
        calls_made = total_contacts - pending

        # Compute total duration from voice_calls
        call_ids = [c.get("call_id") for c in contacts if c.get("call_id")]
        total_duration_sec = 0
        if call_ids:
            try:
                vc_res = await asyncio.to_thread(
                    supabase_admin.table("voice_calls").select("duration_seconds").in_("id", call_ids).execute
                )
                if vc_res and vc_res.data:
                    for row in vc_res.data:
                        sec = row.get("duration_seconds") or 0
                        total_duration_sec += int(sec)
            except Exception:
                pass
        duration_mins = round(total_duration_sec / 60, 1)

        # 3. Query leads count
        leads_count = campaign_data.get("leads_generated") or 0
        if not leads_count and org_id:
            try:
                l_res = await asyncio.to_thread(
                    supabase_admin.table("leads").select("id", count="exact").eq("organization_id", org_id).gte("created_at", campaign_data.get("created_at", "2000-01-01")).execute
                )
                leads_count = l_res.count or 0
            except Exception:
                pass

        # 4. Query scheduled callbacks
        callbacks_count = 0
        if org_id and agent_id:
            try:
                callbacks_res = await asyncio.to_thread(
                    supabase_admin.table("callbacks")
                    .select("id", count="exact")
                    .eq("organization_id", org_id)
                    .eq("agent_id", agent_id)
                    .execute
                )
                callbacks_count = callbacks_res.count or 0
            except Exception:
                pass

        # 5. Calculate percentages
        conn_rate = round((answered / max(1, calls_made)) * 100, 1)
        conv_rate = round((leads_count / max(1, answered)) * 100, 1) if answered > 0 else 0.0

        # 6. Retrieve user profile (owner of the campaign / organization)
        user_id = campaign_data.get("user_id")
        user_res = None
        if user_id:
            user_res = await asyncio.to_thread(
                supabase_admin.table("profiles")
                .select("id, email, telegram_chat_id, phone, full_name, timezone")
                .eq("id", user_id)
                .limit(1)
                .execute
            )
        elif org_id:
            user_res = await asyncio.to_thread(
                supabase_admin.table("profiles")
                .select("id, email, telegram_chat_id, phone, full_name, timezone")
                .eq("organization_id", org_id)
                .limit(1)
                .execute
            )

        profile = user_res.data[0] if (user_res and user_res.data) else {}
        owner_user_id = profile.get("id") or user_id
        telegram_chat_id = profile.get("telegram_chat_id")

        # 7. Construct rich executive report message
        report_text = (
            f"📊 *TRINETRA AI* | *Executive Campaign Briefing*\n\n"
            f"*Campaign:* {camp_name}\n"
            f"*Status:* Completed ✅\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"📈 *Performance Overview*\n"
            f"• *Total Contacts:* {total_contacts}\n"
            f"• *Calls Attempted:* {calls_made}\n"
            f"• *Connected Calls:* {answered} ({conn_rate}%)\n"
            f"• *Qualified Leads:* {leads_count} ({conv_rate}% conversion)\n"
            f"• *Callbacks Booked:* {callbacks_count}\n"
            f"• *Total Talk Time:* {duration_mins} mins\n\n"
            f"📋 *Disposition Breakdown*\n"
            f"• Answered: {answered}\n"
            f"• No Answer / Unreachable: {no_answer}\n"
            f"• Busy Line: {busy}\n"
            f"• DND Filtered: {dnd}\n"
            f"• Carrier Rejected / Failed: {failed}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"_Automated Intelligence by Trinetra Enterprise Voice_"
        )

        # 8. Dispatch In-App & Telegram notification via NotificationService
        if owner_user_id:
            try:
                from app.services.notification_service import NotificationService
                await NotificationService.dispatch(
                    user_id=owner_user_id,
                    event_type="weekly_report",
                    title=f"📊 Campaign Completed: {camp_name}",
                    message=report_text,
                    payload={
                        "campaign_id": campaign_id,
                        "campaign_name": camp_name,
                        "total_contacts": total_contacts,
                        "answered": answered,
                        "leads_count": leads_count,
                        "conversion_rate": conv_rate,
                        "duration_mins": duration_mins
                    }
                )
                logger.info(f"[Campaign Report] Dispatched notification for user {owner_user_id}")
            except Exception as notif_err:
                logger.error(f"[Campaign Report] NotificationService dispatch error: {notif_err}")

        # 9. Also send direct Telegram alert if chat ID is present
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        if bot_token and telegram_chat_id:
            try:
                from app.services.notification_service import NotificationService
                await NotificationService.send_telegram_notification(telegram_chat_id, report_text)
                logger.info(f"[Campaign Report] Sent direct Telegram message to chat {telegram_chat_id}")
            except Exception as tg_err:
                logger.error(f"[Campaign Report] Direct Telegram send failed: {tg_err}")

        # 10. Dispatch via WhatsApp to user's registered phone if integration is active
        try:
            from app.services.integration_executor import IntegrationExecutor
            executor = IntegrationExecutor()
            owner_name = profile.get("full_name") or "Administrator"
            owner_phone = profile.get("phone")
            await executor.dispatch_post_call(
                agent_id=agent_id,
                event_type="campaign_completed",
                context={
                    "campaign_name": camp_name,
                    "owner_name": owner_name,
                    "contact_name": owner_name,
                    "contact_phone": owner_phone,
                    "prospect_name": owner_name,
                    "prospect_phone": owner_phone,
                    "total_contacts": total_contacts,
                    "calls_attempted": calls_made,
                    "connected_count": answered,
                    "connection_rate": f"{conn_rate}%",
                    "leads_count": leads_count,
                    "conversion_rate": f"{conv_rate}%",
                    "callbacks_count": callbacks_count,
                    "total_duration_mins": duration_mins,
                    "call_summary": f"Campaign '{camp_name}' finished: {answered}/{total_contacts} connected ({conn_rate}%), {leads_count} leads generated ({conv_rate}% conversion)."
                },
                data={
                    "campaign_id": campaign_id,
                    "total_contacts": total_contacts,
                    "answered": answered,
                    "leads_count": leads_count,
                    "connection_rate": conn_rate,
                    "conversion_rate": conv_rate,
                    "callbacks_count": callbacks_count,
                    "duration_mins": duration_mins
                },
                org_id=org_id,
                user_id=owner_user_id
            )
        except Exception as wa_err:
            logger.debug(f"[Campaign Report] WhatsApp executor skipped/failed: {wa_err}")

        return {
            "success": True,
            "campaign_id": campaign_id,
            "campaign_name": camp_name,
            "total_contacts": total_contacts,
            "calls_made": calls_made,
            "answered": answered,
            "leads_count": leads_count,
            "connection_rate": conn_rate,
            "conversion_rate": conv_rate,
            "callbacks_count": callbacks_count,
            "duration_mins": duration_mins
        }


async def simulate_call_completion(
    call_sid: str,
    contact_id: str,
    contact_phone: str,
    contact_name: str,
    company_name: str,
    notes: str,
    agent_id: str,
    user_id: str,
    organization_id: str,
    campaign_id: str,
    agent_name: str
):
    try:
        # Simulate a conversation duration of 10-30 seconds
        duration = random.randint(15, 45)
        await asyncio.sleep(5.0)  # Wait 5 seconds
        
        # 1. Generate a simulated conversation transcript
        company_part = f" from {company_name}" if company_name else ""
        greetings = f"Agent: Hello, is this {contact_name or 'there'}? I am calling from {company_name or 'Trinetra AI'}.\n"
        if notes:
            body = f"Caller: Yes, speaking. Who is this?\nAgent: I am {agent_name} from Trinetra. I saw you wanted to know about: {notes}.\n"
        else:
            body = f"Caller: Yes, speaking. Who is this?\nAgent: I am {agent_name} from Trinetra. How are you doing today?\n"
        
        body += f"Caller: Oh great! I'm interested. Let's schedule a call tomorrow.\nAgent: Perfect. I'll note that down and schedule a callback."
        transcript = greetings + body
        
        # 2. Call extract_and_save_lead from agent.py
        from agent import extract_and_save_lead
        logger.info(f"[Simulated Call] Saving lead & transcript for call {call_sid}...")
        await extract_and_save_lead(
            transcript=transcript,
            agent_id=agent_id,
            user_id=user_id,
            organization_id=organization_id,
            duration_seconds=duration,
            call_sid=call_sid,
            contact_id=contact_id
        )
    except Exception as e:
        logger.error(f"[Simulated Call] Failed to run simulate_call_completion: {e}")
