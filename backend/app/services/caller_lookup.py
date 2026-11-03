import re
import csv
import io
import logging
import asyncio
from datetime import datetime
from database import supabase_admin

logger = logging.getLogger("CallerLookupService")

class CallerLookupService:
    def __init__(self, supabase_client=None):
        self.supabase = supabase_client or supabase_admin

    def _clean_phone(self, phone: str) -> str:
        """Strip non-numeric characters and normalize to E.164-like standard (10 digits for lookup)"""
        if not phone:
            return ""
        cleaned = re.sub(r'\D', '', phone)
        if len(cleaned) > 10:
            if cleaned.startswith('91') and len(cleaned) == 12:
                cleaned = cleaned[2:]
            elif cleaned.startswith('0') and len(cleaned) == 11:
                cleaned = cleaned[1:]
        return cleaned

    async def lookup_caller(self, organization_id: str, phone_number: str) -> dict | None:
        """Find customer by phone number. Returns customer data or None."""
        cleaned = self._clean_phone(phone_number)
        if not cleaned:
            return None
            
        try:
            result = self.supabase.table("customer_contacts") \
                .select("*") \
                .eq("organization_id", organization_id) \
                .eq("phone_number", cleaned) \
                .execute()
                
            if result.data:
                customer = result.data[0]
                # Update last contact and call counts asynchronously
                try:
                    self.supabase.table("customer_contacts").update({
                        "last_contact_at": datetime.utcnow().isoformat(),
                        "total_calls": customer.get("total_calls", 0) + 1
                    }).eq("id", customer["id"]).execute()
                except Exception as update_err:
                    logger.error(f"Failed to update caller contact log: {update_err}")
                
                return customer
        except Exception as e:
            logger.error(f"Error in lookup_caller: {e}")
            
        return None

    async def import_csv(self, organization_id: str, file_content: bytes) -> dict:
        """Import customer contacts from CSV"""
        text = file_content.decode("utf-8", errors="ignore")
        f = io.StringIO(text)
        reader = csv.DictReader(f)
        
        success_count = 0
        error_count = 0
        
        for row in reader:
            name = row.get("full_name") or row.get("name") or "Unknown"
            raw_phone = row.get("phone_number") or row.get("phone")
            email = row.get("email")
            company = row.get("company") or row.get("company_name")
            raw_tags = row.get("tags")
            notes = row.get("notes")
            
            if not raw_phone:
                error_count += 1
                continue
                
            cleaned_phone = self._clean_phone(raw_phone)
            if not cleaned_phone:
                error_count += 1
                continue
                
            tags = [t.strip() for t in raw_tags.split(",")] if raw_tags else []
            
            try:
                self.supabase.table("customer_contacts").upsert({
                    "organization_id": organization_id,
                    "phone_number": cleaned_phone,
                    "full_name": name,
                    "email": email,
                    "company": company,
                    "tags": tags,
                    "notes": notes,
                    "import_source": "csv",
                    "updated_at": datetime.utcnow().isoformat()
                }, on_conflict="organization_id,phone_number").execute()
                success_count += 1
            except Exception as e:
                logger.error(f"Error importing row {row}: {e}")
                error_count += 1
                
        return {"success": success_count, "error": error_count}

    async def add_manual(self, organization_id: str, contact: dict):
        """Add or update single contact manually"""
        raw_phone = contact.get("phone_number") or contact.get("phone")
        if not raw_phone:
            raise ValueError("Phone number is required")
            
        cleaned_phone = self._clean_phone(raw_phone)
        if not cleaned_phone:
            raise ValueError("Invalid phone number format")
            
        payload = {
            "organization_id": organization_id,
            "phone_number": cleaned_phone,
            "full_name": contact.get("full_name") or contact.get("name") or "Unknown",
            "email": contact.get("email"),
            "company": contact.get("company") or contact.get("company_name"),
            "tags": contact.get("tags") or [],
            "notes": contact.get("notes"),
            "import_source": contact.get("import_source", "manual"),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        return self.supabase.table("customer_contacts").upsert(payload, on_conflict="organization_id,phone_number").execute()

    async def upsert_from_call(
        self,
        organization_id: str,
        phone_number: str,
        caller_name: str | None = None,
        email: str | None = None,
        company: str | None = None,
        call_summary: str | None = None,
        direction: str = "inbound",
        tags: list | None = None
    ) -> dict | None:
        """
        Upsert customer contact after a call.
        If contact exists, increment total_calls, append call summary to notes, and fill missing info.
        If new, create a new contact row.
        """
        cleaned = self._clean_phone(phone_number)
        if not cleaned or not organization_id:
            return None

        try:
            existing = await asyncio.to_thread(
                self.supabase.table("customer_contacts")
                .select("*")
                .eq("organization_id", organization_id)
                .eq("phone_number", cleaned)
                .maybe_single()
                .execute
            )

            now_iso = datetime.utcnow().isoformat()
            date_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
            summary_entry = f"[{date_str} - {direction.upper()}]: {call_summary}" if call_summary else ""

            if existing and existing.data:
                cust = existing.data
                existing_notes = cust.get("notes") or ""
                new_notes = f"{existing_notes}\n{summary_entry}".strip() if summary_entry else existing_notes
                
                update_fields = {
                    "last_contact_at": now_iso,
                    "total_calls": (cust.get("total_calls") or 0) + 1,
                    "updated_at": now_iso,
                    "notes": new_notes
                }
                if caller_name and caller_name.strip() and caller_name.lower() not in ("unknown", "prospect", "caller", "inbound caller", ""):
                    if not cust.get("full_name") or cust.get("full_name").lower() in ("unknown", "prospect", "caller", "inbound caller", ""):
                        update_fields["full_name"] = caller_name.strip()
                if email and email.strip() and not cust.get("email"):
                    update_fields["email"] = email.strip()
                if company and company.strip() and not cust.get("company"):
                    update_fields["company"] = company.strip()
                if tags:
                    existing_tags = cust.get("tags") or []
                    merged_tags = list(set(existing_tags + tags))
                    update_fields["tags"] = merged_tags

                res = await asyncio.to_thread(
                    self.supabase.table("customer_contacts").update(update_fields).eq("id", cust["id"]).execute
                )
                logger.info(f"[CallerLookupService] Updated existing contact {cust['id']} for phone {cleaned}")
                return res.data[0] if res.data else cust
            else:
                clean_contact_name = caller_name.strip() if (caller_name and caller_name.strip() and caller_name.lower() not in ("unknown", "prospect", "caller")) else "Inbound Caller"
                new_payload = {
                    "organization_id": organization_id,
                    "phone_number": cleaned,
                    "full_name": clean_contact_name,
                    "email": email.strip() if email else None,
                    "company": company.strip() if company else None,
                    "notes": summary_entry,
                    "total_calls": 1,
                    "last_contact_at": now_iso,
                    "import_source": f"{direction}_call",
                    "tags": tags or [direction],
                    "created_at": now_iso,
                    "updated_at": now_iso
                }
                res = await asyncio.to_thread(
                    self.supabase.table("customer_contacts").insert(new_payload).execute
                )
                logger.info(f"[CallerLookupService] Inserted new customer contact for phone {cleaned}")
                return res.data[0] if res.data else new_payload
        except Exception as e:
            logger.error(f"[CallerLookupService] Error in upsert_from_call: {e}")
            return None



async def lookup_caller_history_memory(
    supabase_client,
    organization_id: str | None = None,
    user_id: str | None = None,
    phone_number: str = "",
    timeout_sec: float = 0.45
) -> dict:
    """
    Fast lookup of caller's past interaction history, notes, previous call summary,
    and pending callback status for returning customer personalization.
    Strictly bounded by timeout_sec (default 450ms) to preserve zero latency greeting.
    """
    if not supabase_client or not phone_number:
        return {}

    cleaned = re.sub(r'\D', '', str(phone_number))
    if len(cleaned) > 10:
        if cleaned.startswith('91') and len(cleaned) == 12:
            cleaned = cleaned[2:]
        elif cleaned.startswith('0') and len(cleaned) == 11:
            cleaned = cleaned[1:]

    if not cleaned or len(cleaned) < 8:
        return {}

    async def _fetch_memory() -> dict:
        memory = {
            "name": None,
            "company": None,
            "is_returning": False,
            "total_calls": 0,
            "last_call_at": None,
            "last_summary": None,
            "notes": None,
            "callback_reason": None,
            "pending_appointment": None,
        }

        # 1. Check customer_contacts table
        try:
            q_cust = supabase_client.table("customer_contacts").select(
                "full_name, company, total_calls, last_contact_at, notes, tags"
            )
            if organization_id:
                q_cust = q_cust.eq("organization_id", organization_id)
            q_cust = q_cust.eq("phone_number", cleaned).limit(1)

            res_cust = await asyncio.to_thread(q_cust.execute)
            if res_cust.data and len(res_cust.data) > 0:
                c_data = res_cust.data[0]
                c_name = c_data.get("full_name")
                if c_name and c_name.lower() not in ("none", "null", "unknown", "unknown caller", "inbound caller", "client", "prospect"):
                    memory["name"] = c_name
                memory["company"] = c_data.get("company")
                memory["total_calls"] = c_data.get("total_calls") or 1
                memory["last_call_at"] = c_data.get("last_contact_at")
                memory["notes"] = c_data.get("notes")
                if memory["total_calls"] > 1:
                    memory["is_returning"] = True
        except Exception as e_c:
            logger.debug(f"[lookup_caller_history_memory] customer_contacts lookup: {e_c}")

        # 2. Check previous voice_calls summary & sentiment
        try:
            q_calls = supabase_client.table("voice_calls").select(
                "created_at, summary, notes, call_status, duration_seconds"
            ).order("created_at", desc=True)

            if organization_id:
                q_calls = q_calls.eq("organization_id", organization_id)
            elif user_id:
                q_calls = q_calls.eq("user_id", user_id)

            q_calls = q_calls.ilike("caller_number", f"%{cleaned}%").limit(2)
            res_calls = await asyncio.to_thread(q_calls.execute)
            if res_calls.data and len(res_calls.data) > 0:
                past_calls = res_calls.data
                if len(past_calls) > 1 or memory["total_calls"] > 1:
                    memory["is_returning"] = True
                
                # Fetch the most informative summary
                for call_row in past_calls:
                    sum_text = call_row.get("summary") or call_row.get("notes")
                    if sum_text and len(str(sum_text).strip()) > 5:
                        memory["last_summary"] = str(sum_text).strip()
                        if not memory["last_call_at"]:
                            memory["last_call_at"] = call_row.get("created_at")
                        break
        except Exception as e_vc:
            logger.debug(f"[lookup_caller_history_memory] voice_calls lookup: {e_vc}")

        # 3. Check for any scheduled callback
        try:
            q_cb = supabase_client.table("callbacks").select(
                "prospect_name, scheduled_at, notes, priority"
            ).eq("status", "scheduled")

            if organization_id:
                q_cb = q_cb.eq("organization_id", organization_id)

            q_cb = q_cb.ilike("prospect_phone", f"%{cleaned}%").order("scheduled_at", desc=True).limit(1)
            res_cb = await asyncio.to_thread(q_cb.execute)
            if res_cb.data and len(res_cb.data) > 0:
                cb = res_cb.data[0]
                if not memory["name"] and cb.get("prospect_name"):
                    memory["name"] = cb.get("prospect_name")
                memory["callback_reason"] = cb.get("notes") or "Requested callback inquiry"
        except Exception as e_cb:
            logger.debug(f"[lookup_caller_history_memory] callbacks lookup: {e_cb}")

        return memory

    try:
        return await asyncio.wait_for(_fetch_memory(), timeout=timeout_sec)
    except (asyncio.TimeoutError, Exception) as err:
        logger.debug(f"[lookup_caller_history_memory] Timed out or err ({err}), returning fallback")
        return {}
