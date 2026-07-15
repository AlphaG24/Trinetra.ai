import uuid
import json
import math
import os
import httpx
import traceback
from datetime import datetime
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from database import supabase, supabase_admin
from google import genai

router = APIRouter(prefix="/api/voice", tags=["Voice Agent"])

# Initialize Gemini Client
genai_client = genai.Client()

class KeyValuePair(BaseModel):
    key: str
    value: str

class DynamicLeadExtraction(BaseModel):
    is_lead: bool
    intent_summary: str
    extracted_data: list[KeyValuePair]

def send_telegram_notification(
    phone: str,
    duration: int,
    transcript: str,
    chat_id: str | None = None,
    is_lead: bool = False,
    intent_summary: str = "",
    extracted_data: dict | list | None = None,
):
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")

    if not bot_token or not chat_id:
        print("Skipping Telegram alert: No chat ID configured or Demo call", flush=True)
        return

    # Normalize extracted_data to a flat dict (lead_data)
    lead_data = {}
    if isinstance(extracted_data, list):
        for item in extracted_data:
            if isinstance(item, dict):
                k = item.get("key", "")
                v = item.get("value", "")
            else:
                k = getattr(item, "key", "")
                v = getattr(item, "value", "")
            if k:
                lead_data[k] = v
    elif isinstance(extracted_data, dict):
        lead_data = extracted_data

    # Phone Fallback: If caller ID is Unknown, look inside Gemini's extracted JSON data.
    alert_phone = phone
    if not alert_phone or alert_phone.strip() == "" or alert_phone.lower() in ["unknown", "null", "none"]:
        for k, v in lead_data.items():
            k_lower = k.lower().replace("_", "").replace(" ", "")
            if any(term in k_lower for term in ["phone", "number", "contact"]):
                if v and str(v).strip():
                    alert_phone = str(v)
                    break

    minutes = duration // 60
    seconds = duration % 60
    duration_str = f"{minutes}m {seconds}s" if minutes > 0 else f"{seconds}s"

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"

    if is_lead:
        # Rule A: Lead Found / Positive Sentiment (Bypass all truncation limits, print entire uncut call transcript)
        dynamic_vars_list = []
        for k, v in lead_data.items():
            if k not in ["is_lead", "intent_summary"] and v:
                key_display = k.replace('_', ' ').replace('-', ' ').title()
                dynamic_vars_list.append(f"🔹 **{key_display}:** {v}")
        dynamic_vars = "\n".join(dynamic_vars_list)

        summary = lead_data.get("intent_summary", "")
        if not summary:
            summary = intent_summary or "Customer expressed interest."

        hot_lead_message = (
            f"🚨 **HOT LEAD CAPTURED!** 🚨\n\n"
            f"📱 **Phone:** {alert_phone}\n"
            f"⏱️ **Duration:** {duration_str}\n\n"
            f"{dynamic_vars}\n\n"
            f"📝 **Summary:** {summary}\n\n"
            f"📜 **Full Call Transcript**\n"
            f"{transcript or 'No transcript available.'}"
        )

        try:
            response = httpx.post(url, json={"chat_id": chat_id, "text": hot_lead_message, "parse_mode": "Markdown"}, timeout=10.0)
            if response.status_code == 200:
                print(f"[TELEGRAM SUCCESS] Hot Lead Siren sent for {alert_phone}", flush=True)
            else:
                print(f"[TELEGRAM WARNING] Hot Lead Siren markdown failed ({response.text}), retrying with plain text...", flush=True)
                response = httpx.post(url, json={"chat_id": chat_id, "text": hot_lead_message}, timeout=10.0)
                if response.status_code == 200:
                    print(f"[TELEGRAM SUCCESS] Hot Lead Siren sent as plain text for {alert_phone}", flush=True)
                else:
                    print(f"[TELEGRAM ERROR] Hot Lead Siren rejected: {response.text}", flush=True)
        except Exception as e:
            print(f"[TELEGRAM ERROR] Hot Lead Siren network failure: {str(e)}", flush=True)
            traceback.print_exc()

    else:
        # Rule B: No Lead / Neutral / Junk (Format a compact, muted notification, include truncated preview)
        snippet = transcript[:250] + "..." if transcript and len(transcript) > 250 else (transcript or "No transcript available.")
        summary_message = (
            f"📞 **New Call Log**\n"
            f"📱 **Phone:** {alert_phone}\n"
            f"⏱️ **Duration:** {duration_str}\n"
            f"📝 **Transcript Preview:** {snippet}"
        )

        try:
            response = httpx.post(url, json={"chat_id": chat_id, "text": summary_message, "parse_mode": "Markdown"}, timeout=10.0)
            if response.status_code == 200:
                print(f"[TELEGRAM SUCCESS] Call log summary sent for {alert_phone}", flush=True)
            else:
                print(f"[TELEGRAM WARNING] Call log summary markdown failed ({response.text}), retrying with plain text...", flush=True)
                response = httpx.post(url, json={"chat_id": chat_id, "text": summary_message}, timeout=10.0)
                if response.status_code == 200:
                    print(f"[TELEGRAM SUCCESS] Call log summary sent as plain text for {alert_phone}", flush=True)
                else:
                    print(f"[TELEGRAM ERROR] Call log summary rejected: {response.text}", flush=True)
        except Exception as e:
            print(f"[TELEGRAM ERROR] Call log summary network failure: {str(e)}", flush=True)
            traceback.print_exc()



def send_quota_telegram_alert(chat_id: str, text: str):
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token or not chat_id:
        print("[QUOTA ALERT] Skipping Telegram alert: Missing credentials or chat ID", flush=True)
        return
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    try:
        response = httpx.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"}, timeout=10.0)
        if response.status_code == 200:
            print(f"[QUOTA ALERT SUCCESS] Sent alert to Telegram", flush=True)
        else:
            print(f"[QUOTA ALERT ERROR] Telegram API rejected: {response.text}", flush=True)
    except Exception as e:
        print(f"[QUOTA ALERT ERROR] Network failure: {str(e)}", flush=True)

def resolve_user_id_from_body(body: dict) -> str | None:
    message = body.get("message", {})
    call_data = message.get("call", {}) or body.get("call", {})
    
    # 1. Try metadata/assistantOverrides
    user_id = (
        call_data.get('assistantOverrides', {}).get('metadata', {}).get('userId') or
        call_data.get('assistantOverrides', {}).get('variableValues', {}).get('user_id') or
        call_data.get('assistant', {}).get('metadata', {}).get('userId') or
        call_data.get('metadata', {}).get('userId') or
        body.get('metadata', {}).get('userId')
    )
    if user_id:
        return user_id

    # 2. Try assistantId lookup in user_agents
    assistant_id = (
        call_data.get("assistantId") or
        message.get("assistantId") or
        body.get("assistantId") or
        body.get("assistant", {}).get("id")
    )
    if assistant_id:
        try:
            agent_res = supabase_admin.table("user_agents").select("user_id").eq("vapi_agent_id", assistant_id).execute()
            if agent_res.data:
                return agent_res.data[0].get("user_id")
        except Exception as e:
            print(f"[RESOLVE USER ERROR] user_agents lookup failed: {str(e)}", flush=True)

    return None

async def is_user_overusage(user_id: str) -> bool:
    if not user_id or not is_valid_uuid(user_id):
        return False
    try:
        total_limit = 100
        used_minutes = 0
        try:
            # Perform Supabase lookup
            res = supabase_admin.table("profiles").select("demo_minutes_used, total_minutes_limit").eq("id", user_id).execute()
            if res.data:
                user_data = res.data[0]
                used_minutes = user_data.get("demo_minutes_used", 0)
                total_limit = user_data.get("total_minutes_limit")
                if total_limit is None:
                    total_limit = user_data.get("demo_minutes_limit", 100)
        except Exception:
            # Fallback if total_minutes_limit column does not exist
            res = supabase_admin.table("profiles").select("demo_minutes_used, demo_minutes_limit").eq("id", user_id).execute()
            if res.data:
                user_data = res.data[0]
                used_minutes = user_data.get("demo_minutes_used", 0)
                total_limit = user_data.get("demo_minutes_limit", 100)
        
        # Ensure total_limit is positive to prevent ZeroDivisionError or weird comparison issues
        if not total_limit or total_limit <= 0:
            total_limit = 100

        if used_minutes >= total_limit:
            print(f"[KILL SWITCH] User {user_id} has exhausted minutes. used_minutes={used_minutes}, total_limit={total_limit}", flush=True)
            return True
    except Exception as e:
        print(f"[KILL SWITCH ERROR] Failed to check usage limits: {str(e)}", flush=True)
    return False

class StartDemoRequest(BaseModel):
    user_id: str
    assigned_vapi_agent_id: str | None = None
    user_email: str | None = None

def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False

@router.post("/start-demo")
async def check_limits_and_get_keys(req: StartDemoRequest):
    if not is_valid_uuid(req.user_id):
        raise HTTPException(status_code=400, detail="Invalid user_id format. Must be a valid UUID.")
        
    user_res = supabase_admin.table('profiles').select('demo_minutes_limit, demo_minutes_used').eq('id', req.user_id).execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="User profile not found")
        
    user_data = user_res.data[0]
    if user_data['demo_minutes_used'] >= user_data['demo_minutes_limit']:
        raise HTTPException(status_code=403, detail="Trial limit reached.")

    import os
    public_key = None
    agent_id = None
    
    try:
        config_res = supabase_admin.table('system_config').select('config_key, config_value').in_('config_key', ['VAPI_PUBLIC_KEY', 'VAPI_AGENT_ID']).execute()
        config_map = {item['config_key']: item['config_value'] for item in config_res.data}
        public_key = config_map.get('VAPI_PUBLIC_KEY')
        agent_id = config_map.get('VAPI_AGENT_ID')
    except Exception as e:
        print(f"DATABASE CONFIG RETRIEVAL WARNING/ERROR: {str(e)}")
        
    # Fallback to local environment variables if Database table values are missing or failed to fetch
    if not public_key:
        public_key = os.getenv('NEXT_PUBLIC_VAPI_PUBLIC_KEY') or os.getenv('VAPI_PUBLIC_KEY')
    if not agent_id:
        agent_id = os.getenv('NEXT_PUBLIC_VAPI_ASSISTANT_ID') or os.getenv('NEXT_PUBLIC_VAPI_AGENT_ID') or os.getenv('VAPI_AGENT_ID')
    
    print("\n--- FRONTEND CONNECTION REQUEST ---")
    print(f"Agent ID: {agent_id}")
    if public_key:
        print(f"Public Key: PRESENT (starts with: {public_key[:8]}...)")
    else:
        print("CRITICAL ERROR: PUBLIC KEY IS MISSING!")
    print("-----------------------------------\n")

    return {
        "status": "success",
        "agent_id": agent_id,
        "api_key": public_key, 
        "minutes_used": user_data['demo_minutes_used'],
        "minutes_limit": user_data['demo_minutes_limit']
    }

async def handle_vapi_webhook_logic(body: dict, background_tasks: BackgroundTasks):
    message_type = body.get("message", {}).get("type")
    if message_type != "assistant-request" and message_type != "end-of-call-report":
        return {"status": "ignored", "reason": f"Not a handled event type: {message_type}"}

    message = body.get("message", {})
    call = message.get("call", {}) or body.get("call", {})
    assistant_id = (
        call.get("assistantId") or
        message.get("assistantId") or
        body.get("assistantId") or
        body.get("assistant", {}).get("id")
    )
    provider_call_id = (
        call.get("id") or
        message.get("id") or
        body.get("id") or
        body.get("callId")
    )

    # 1. Override check: traverse the incoming JSON payload to extract the injected user ID
    payload_user_id = (
        call.get('assistantOverrides', {}).get('metadata', {}).get('userId') or
        call.get('assistantOverrides', {}).get('variableValues', {}).get('user_id') or
        call.get('assistantOverrides', {}).get('metadata', {}).get('user_id') or
        call.get('assistant', {}).get('metadata', {}).get('userId') or
        call.get('metadata', {}).get('userId') or
        message.get('metadata', {}).get('userId') or
        body.get('metadata', {}).get('userId')
    )
    if payload_user_id is None or str(payload_user_id).strip() == "" or str(payload_user_id).lower() == "none":
        payload_user_id = body.get('message', {}).get('call', {}).get('metadata', {}).get('userId')

    # 2. Determine Branch: Check if agent is Paid (exists in user_agents)
    is_paid_agent = False
    db_owner_user_id = None

    if assistant_id:
        try:
            agent_res = supabase_admin.table("user_agents").select("user_id").eq("vapi_agent_id", assistant_id).execute()
            if agent_res.data:
                is_paid_agent = True
                db_owner_user_id = agent_res.data[0].get("user_id")
        except Exception as e:
            print(f"[VAPI WEBHOOK ERROR] Supabase user_agents lookup failed: {str(e)}", flush=True)

    # 3. Apply the override logic: prioritize payload user_id strictly if it exists
    if payload_user_id and str(payload_user_id).strip() != "" and str(payload_user_id).lower() != "none":
        user_id = payload_user_id
        print(f"[VAPI ROUTING] Override exists in payload. Prioritizing user_id={user_id} over DB owner={db_owner_user_id}", flush=True)
    else:
        user_id = db_owner_user_id
        print(f"[VAPI ROUTING] Using DB owner user_id={user_id}", flush=True)

    # BRANCH A: Paid Agent
    if is_paid_agent:
        print(f"[VAPI ROUTING] BRANCH A: Paid Agent detected (assistant_id={assistant_id}, user_id={user_id})", flush=True)
        
        # --- Fallback user_id check ---
        if user_id is None or str(user_id).strip() == "" or str(user_id).lower() == "none":
            user_id = body.get('message', {}).get('call', {}).get('metadata', {}).get('userId')
            print(f"[VAPI ROUTING] Branch A: user_id was missing/invalid. Falling back to payload metadata: {user_id}", flush=True)
        
        # Guard Clause
        if user_id is None or str(user_id).strip() == "" or str(user_id).lower() == "none":
            return {"status": "error", "message": "Missing user_id in database and payload"}
            
        if not is_valid_uuid(user_id):
            print(f"[VAPI ROUTING] Branch A: user_id '{user_id}' is not a valid UUID. Failing gracefully.", flush=True)
            return {"status": "error", "message": "Invalid user_id format"}
            
        # Retrieve paid quota limits and telegram chat ID
        paid_used = 0
        paid_limit = 100
        telegram_chat_id = None
        
        try:
            try:
                # Try selecting paid columns
                profile_res = supabase_admin.table("profiles").select("paid_minutes_used, paid_minutes_limit, telegram_chat_id").eq("id", user_id).execute()
                if profile_res.data:
                    user_profile = profile_res.data[0]
                    paid_used = user_profile.get("paid_minutes_used", 0) or 0
                    paid_limit = user_profile.get("paid_minutes_limit")
                    if paid_limit is None:
                        paid_limit = user_profile.get("demo_minutes_limit", 100)
                    telegram_chat_id = user_profile.get("telegram_chat_id")
            except Exception:
                # Fallback to demo columns if paid columns do not exist
                profile_res = supabase_admin.table("profiles").select("demo_minutes_used, demo_minutes_limit, telegram_chat_id").eq("id", user_id).execute()
                if profile_res.data:
                    user_profile = profile_res.data[0]
                    paid_used = user_profile.get("demo_minutes_used", 0) or 0
                    paid_limit = user_profile.get("demo_minutes_limit", 100)
                    telegram_chat_id = user_profile.get("telegram_chat_id")
        except Exception as e:
            print(f"[VAPI WEBHOOK ERROR] Paid profile fetch failed: {str(e)}", flush=True)

        if not paid_limit or paid_limit <= 0:
            paid_limit = 100

        # For Pre-Calls (assistant-request)
        if message_type == "assistant-request":
            if paid_used >= paid_limit:
                print(f"[KILL SWITCH] Paid user {user_id} has exhausted minutes. used={paid_used}, limit={paid_limit}", flush=True)
                return JSONResponse(
                    status_code=402,
                    content={"error": "Payment Required", "message": "AI minutes limit exhausted. Please top up to reactivate your agents."}
                )
            return {}

        # For End-Calls (end-of-call-report)
        try:
            duration_seconds = int(message.get('durationSeconds') or call.get('durationSeconds') or message.get('duration', 0))
            quota_cost = math.ceil(duration_seconds / 60) if duration_seconds > 0 else 0
            
            transcript = message.get('transcript') or call.get('transcript', '')
            if not transcript and message.get('artifact', {}).get('messages'):
                messages_list = message.get('artifact', {}).get('messages', [])
                transcript = "\n".join([
                    f"{m.get('role', 'unknown').upper()}: {m.get('message', '')}" 
                    for m in messages_list if m.get('message')
                ])
            
            recording_url = message.get('artifact', {}).get('recordingUrl', '') or call.get('recordingUrl', '')

            # Save Call Log
            try:
                supabase_admin.table("agent_call_logs").insert({
                    "user_id": user_id,
                    "duration_seconds": duration_seconds,
                    "transcript": transcript,
                    "recording_url": recording_url,
                    "sentiment": "Neutral",
                    "provider_call_id": provider_call_id,
                    "vapi_agent_id": assistant_id
                }).execute()
                print(f"[VAPI WEBHOOK SUCCESS] Paid Call Log saved for User {user_id}", flush=True)
            except Exception as insert_err:
                print(f"[VAPI WEBHOOK DATABASE ERROR] Saving call logs failed: {str(insert_err)}", flush=True)
                traceback.print_exc()

            # Update paid quota
            new_paid_used = paid_used + quota_cost
            try:
                supabase_admin.table('profiles').update({"paid_minutes_used": new_paid_used}).eq('id', user_id).execute()
            except Exception:
                supabase_admin.table('profiles').update({"demo_minutes_used": new_paid_used}).eq('id', user_id).execute()
            print(f"   -> [SUCCESS] Paid quota updated. Used: {new_paid_used} mins.", flush=True)

            # Evaluate 80%/100% Paid threshold alerts
            prev_pct = (paid_used / paid_limit) * 100
            new_pct = (new_paid_used / paid_limit) * 100
            crossed_80 = (prev_pct < 80 <= new_pct)
            crossed_100 = (prev_pct < 100 <= new_pct)
            
            if telegram_chat_id and (crossed_80 or crossed_100):
                if crossed_100:
                    critical_msg = (
                        "⛔ **CRITICAL ALERT: AGENTS PAUSED**\n"
                        "Your AI minutes are 100% exhausted. Incoming calls will no longer be processed. Please top up immediately."
                    )
                    background_tasks.add_task(send_quota_telegram_alert, telegram_chat_id, critical_msg)
                elif crossed_80:
                    warning_msg = (
                        "⚠️ **USAGE WARNING**\n"
                        "You have reached 80% of your AI minutes limit. Top up soon to ensure your agents stay online!"
                    )
                    background_tasks.add_task(send_quota_telegram_alert, telegram_chat_id, warning_msg)

            # Deep JSON Lead Extraction (Gemini)
            extracted_is_lead = False
            extracted_intent_summary = ""
            extracted_dict = {}
            
            if transcript and transcript.strip():
                try:
                    print("[VAPI WEBHOOK] Starting Gemini Deep Native Lead Extraction...", flush=True)
                    
                    prompt = (
                        f"You are an advanced, multilingual lead extraction assistant. Analyze the following transcript of a voice call. "
                        f"The transcript may contain mixed-language inputs (such as English, Hindi, Hinglish, or regional Indian dialects/phrasing). "
                        f"First, translate any non-English terms, phrases, or speech into English context to accurately evaluate the conversation. "
                        f"Analyze the caller's intent. If the caller expresses interest, wants to book/schedule an appointment, or requests a service/product, "
                        f"set `is_lead` to `true`. Otherwise, set it to `false`.\n"
                        f"Compile a clear and concise `intent_summary` in English.\n"
                        f"Parse and extract any valuable custom fields mentioned in the transcript (e.g., spoken contact name, spoken phone number, appointment time, budget, symptoms, preferences, service types, timeline) "
                        f"and place them into the `extracted_data` list of objects with `key` and `value` fields where both `key` and `value` are strings.\n"
                        f"CRITICAL: Be extremely thorough. Make sure to catch spoken contact details (like spoken name, spoken phone number, or email) if the caller provides them verbally, "
                        f"and place them under descriptive keys (e.g. 'spoken_name', 'spoken_phone', 'spoken_email').\n\n"
                        f"Transcript:\n{transcript}"
                    )
                    
                    response = genai_client.models.generate_content(
                        model='gemini-2.5-flash',
                        contents=prompt,
                        config=genai.types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=DynamicLeadExtraction,
                        ),
                    )
                    extracted = response.parsed
                    print(f"[VAPI WEBHOOK] Gemini extraction result: {extracted}", flush=True)
                    
                    if extracted:
                        extracted_is_lead = extracted.is_lead
                        extracted_intent_summary = extracted.intent_summary
                        
                        extracted_dict = {}
                        if extracted.extracted_data:
                            for item in extracted.extracted_data:
                                if hasattr(item, 'key') and hasattr(item, 'value'):
                                    extracted_dict[item.key] = item.value
                                elif isinstance(item, dict):
                                    extracted_dict[item.get('key', '')] = item.get('value', '')
                        
                        if extracted_is_lead:
                            print(f"[VAPI WEBHOOK] Hot Lead detected! Saving to appointments table...", flush=True)
                            scheduled_at = datetime.utcnow().isoformat() + "Z"
                            
                            contact_name = "Valued Customer"
                            contact_phone = "Unknown"
                            contact_email = None
                            
                            for k, v in extracted_dict.items():
                                k_norm = k.lower().replace("_", "").replace(" ", "")
                                if k_norm in ["name", "contactname", "customername", "fullname", "spokenname"]:
                                    if v: contact_name = v
                                elif k_norm in ["phone", "contactphone", "customerphone", "phonenumber", "spokenphone"]:
                                    if v: contact_phone = v
                                elif k_norm in ["email", "contactemail", "customeremail", "emailaddress", "spokenemail"]:
                                    if v: contact_email = v

                            customer_phone = (
                                call.get("customer", {}).get("number") or
                                call.get("customer", {}).get("phone") or
                                call.get("customerPhone") or
                                message.get("customer", {}).get("number") or
                                "Unknown"
                            )
                            if contact_phone == "Unknown":
                                contact_phone = customer_phone

                            supabase_admin.table("appointments").insert({
                                "user_id": user_id,
                                "contact_name": contact_name,
                                "contact_phone": contact_phone,
                                "contact_email": contact_email,
                                "notes": extracted_intent_summary,
                                "extracted_data": extracted_dict,
                                "booked_via": "voice",
                                "scheduled_at": scheduled_at,
                                "status": "pending"
                            }).execute()
                            print(f"[VAPI WEBHOOK] Lead successfully saved to appointments table.", flush=True)
                except Exception as lead_err:
                    print(f"[VAPI WEBHOOK] Extraction Error: {lead_err}", flush=True)
                    traceback.print_exc()

            # Dispatch Telegram Notifications
            try:
                customer_phone = (
                    call.get("customer", {}).get("number") or
                    call.get("customer", {}).get("phone") or
                    call.get("customerPhone") or
                    message.get("customer", {}).get("number") or
                    "Unknown"
                )
                background_tasks.add_task(
                    send_telegram_notification,
                    customer_phone,
                    duration_seconds,
                    transcript,
                    telegram_chat_id,
                    extracted_is_lead,
                    extracted_intent_summary,
                    extracted_dict,
                )
                print(f"[VAPI WEBHOOK SUCCESS] Enqueued background Telegram notification for {customer_phone} (is_lead={extracted_is_lead})", flush=True)
            except Exception as tg_err:
                print(f"[VAPI WEBHOOK ERROR] Failed to queue background Telegram notification: {tg_err}", flush=True)
                traceback.print_exc()

            return {"status": "success", "message": "Webhook processed successfully"}

        except Exception as e:
            print(f"[VAPI WEBHOOK ERROR] Paid end-call process failed: {str(e)}", flush=True)
            traceback.print_exc()
            return {"status": "error", "message": "Internal server error acknowledged"}

    # BRANCH B: Demo Agent
    else:
        # Extract user_id from metadata if not already resolved
        if user_id is None or str(user_id).strip() == "" or str(user_id).lower() == "none":
            user_id = (
                call.get('assistantOverrides', {}).get('metadata', {}).get('userId') or
                call.get('assistantOverrides', {}).get('variableValues', {}).get('user_id') or
                call.get('assistant', {}).get('metadata', {}).get('userId') or
                call.get('metadata', {}).get('userId') or
                message.get('metadata', {}).get('userId') or
                body.get('metadata', {}).get('userId')
            )
            
            # Fallback Source: If user_id is None, fall back to extracting it from the webhook payload (payload.get('message', {}).get('call', {}).get('metadata', {}).get('userId')).
            if user_id is None or str(user_id).strip() == "" or str(user_id).lower() == "none":
                user_id = body.get('message', {}).get('call', {}).get('metadata', {}).get('userId')
            
        print(f"[VAPI ROUTING] BRANCH B: Demo Agent detected (assistant_id={assistant_id}, resolved_user_id={user_id})", flush=True)

        # Guard Clause
        if user_id is None or str(user_id).strip() == "" or str(user_id).lower() == "none":
            return {"status": "error", "message": "Missing user_id in database and payload"}

        # Fetch demo profile limit and used
        demo_used = 0
        demo_limit = 100
        telegram_chat_id = None
        
        if is_valid_uuid(user_id):
            try:
                profile_res = supabase_admin.table("profiles").select("demo_minutes_used, demo_minutes_limit, telegram_chat_id").eq("id", user_id).execute()
                if profile_res.data:
                    user_profile = profile_res.data[0]
                    demo_used = user_profile.get("demo_minutes_used", 0) or 0
                    demo_limit = user_profile.get("demo_minutes_limit", 100)
                    telegram_chat_id = user_profile.get("telegram_chat_id")
            except Exception as e:
                print(f"[VAPI WEBHOOK ERROR] Demo profile fetch failed: {str(e)}", flush=True)
        else:
            print(f"[VAPI ROUTING] Skipping demo profile fetch for non-UUID user_id: {user_id}", flush=True)

        if not demo_limit or demo_limit <= 0:
            demo_limit = 100

        # For Pre-Calls (assistant-request)
        if message_type == "assistant-request":
            if demo_used >= demo_limit:
                print(f"[KILL SWITCH] Demo user {user_id} has exhausted minutes. used={demo_used}, limit={demo_limit}", flush=True)
                return JSONResponse(
                    status_code=402,
                    content={"error": "Payment Required", "message": "Demo minutes limit exhausted. Please top up to reactivate your agents."}
                )
            return {}

        # For End-Calls (end-of-call-report)
        try:
            duration_seconds = int(message.get('durationSeconds') or call.get('durationSeconds') or message.get('duration', 0))
            quota_cost = math.ceil(duration_seconds / 60) if duration_seconds > 0 else 0
            
            transcript = message.get('transcript') or call.get('transcript', '')
            if not transcript and message.get('artifact', {}).get('messages'):
                messages_list = message.get('artifact', {}).get('messages', [])
                transcript = "\n".join([
                    f"{m.get('role', 'unknown').upper()}: {m.get('message', '')}" 
                    for m in messages_list if m.get('message')
                ])
            
            recording_url = message.get('artifact', {}).get('recordingUrl', '') or call.get('recordingUrl', '')

            # Save Call Log
            if is_valid_uuid(user_id):
                try:
                    supabase_admin.table("agent_call_logs").insert({
                        "user_id": user_id,
                        "duration_seconds": duration_seconds,
                        "transcript": transcript,
                        "recording_url": recording_url,
                        "sentiment": "Neutral",
                        "provider_call_id": provider_call_id,
                        "vapi_agent_id": assistant_id
                    }).execute()
                    print(f"[VAPI WEBHOOK SUCCESS] Demo Call Log saved for User {user_id}", flush=True)
                except Exception as insert_err:
                    print(f"[VAPI WEBHOOK DATABASE ERROR] Saving call logs failed: {str(insert_err)}", flush=True)
                    traceback.print_exc()
            else:
                print(f"[VAPI ROUTING] Skipping call log insertion for non-UUID user_id: {user_id}", flush=True)

            # Update demo quota
            if is_valid_uuid(user_id):
                new_demo_used = demo_used + quota_cost
                try:
                    supabase_admin.table('profiles').update({"demo_minutes_used": new_demo_used}).eq('id', user_id).execute()
                    print(f"   -> [SUCCESS] Demo quota updated. Used: {new_demo_used} mins.", flush=True)
                except Exception as e:
                    print(f"   -> [ERROR] Demo Quota Update Failed: {str(e)}", flush=True)
            else:
                print(f"[VAPI ROUTING] Skipping demo quota update for non-UUID user_id: {user_id}", flush=True)

            # Trigger the original simple Demo Telegram notification (no JSONB extraction, no paid alerts)
            if telegram_chat_id:
                try:
                    customer_phone = (
                        call.get("customer", {}).get("number") or
                        call.get("customer", {}).get("phone") or
                        call.get("customerPhone") or
                        message.get("customer", {}).get("number") or
                        "Unknown"
                    )
                    background_tasks.add_task(
                        send_telegram_notification,
                        customer_phone,
                        duration_seconds,
                        transcript,
                        telegram_chat_id,
                        False, # is_lead is always False for demo
                        "",    # intent_summary is empty
                        None,  # extracted_data is None
                    )
                    print(f"[VAPI WEBHOOK SUCCESS] Enqueued Demo Telegram notification for {customer_phone}", flush=True)
                except Exception as tg_err:
                    print(f"[VAPI WEBHOOK ERROR] Failed to queue demo Telegram alert: {tg_err}", flush=True)
                    traceback.print_exc()

            return {"status": "success", "message": "Demo webhook processed successfully"}

        except Exception as e:
            print(f"[VAPI WEBHOOK ERROR] Demo end-call process failed: {str(e)}", flush=True)
            traceback.print_exc()
            return {"status": "error", "message": "Internal server error acknowledged"}

@router.post("/vapi-webhook")
async def handle_vapi_webhook(request: Request, background_tasks: BackgroundTasks):
    secret = request.headers.get("x-vapi-secret")
    expected_secret = os.getenv("VAPI_WEBHOOK_SECRET")
    if expected_secret and secret != expected_secret:
        print("[VAPI WEBHOOK ERROR] Unauthorized access attempt.", flush=True)
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        body = await request.json()
    except Exception:
        print("CRITICAL: VAPI SENT NON-JSON PAYLOAD", flush=True)
        return {"status": "error", "detail": "Invalid JSON"}
    return await handle_vapi_webhook_logic(body, background_tasks)

@router.get("/history/{user_id}")
async def get_user_call_history(user_id: str):
    if not is_valid_uuid(user_id):
        return {"status": "success", "data": []}
    
    # Query database call logs bypassing RLS restrictions while strictly isolating data matching the exact user_id
    response = supabase_admin.table("agent_call_logs").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return {"status": "success", "data": response.data}


# --- TELEGRAM BOT WEBHOOK ROUTER ---

telegram_router = APIRouter(prefix="/api/v1/webhooks", tags=["Telegram Webhook"])

def is_valid_uuid4(val: str) -> bool:
    try:
        u = uuid.UUID(str(val))
        return u.version == 4
    except ValueError:
        return False

@telegram_router.post("/telegram")
async def handle_telegram_webhook(request: Request):
    try:
        payload = await request.json()
    except Exception:
        print("[TELEGRAM WEBHOOK ERROR] Received non-JSON body", flush=True)
        return {"status": "error", "message": "Invalid JSON body"}

    try:
        message = payload.get("message")
        if not message:
            print("[TELEGRAM WEBHOOK INFO] Payload missing message key", flush=True)
            return {"status": "ignored", "message": "No message in update"}

        text = message.get("text")
        chat = message.get("chat")
        if not text or not chat:
            print("[TELEGRAM WEBHOOK INFO] Message missing text or chat key", flush=True)
            return {"status": "ignored", "message": "Message text or chat missing"}

        chat_id = chat.get("id")
        if chat_id is None:
            print("[TELEGRAM WEBHOOK INFO] Chat missing id key", flush=True)
            return {"status": "ignored", "message": "Chat ID missing"}

        # Command matching: check if message.text starts with /start 
        if not text.startswith("/start "):
            print(f"[TELEGRAM WEBHOOK INFO] Text does not start with /start : '{text}'", flush=True)
            return {"status": "ignored", "message": "Not a start deep link command"}

        # Extract parameter following /start 
        uuid_candidate = text[len("/start "):].strip()

        # Validate UUID version 4
        if not is_valid_uuid4(uuid_candidate):
            print(f"[TELEGRAM WEBHOOK ERROR] Parameter '{uuid_candidate}' is not a valid UUIDv4", flush=True)
            return {"status": "error", "message": "Invalid UUID version 4"}

        chat_id_str = str(chat_id)
        print(f"[TELEGRAM WEBHOOK INFO] Processing start deep link for User {uuid_candidate} with Chat ID {chat_id_str}", flush=True)

        # Database Update: Update profiles where id matches UUID
        # Set telegram_chat_id = chat_id_str, onboarding_complete = True
        try:
            db_res = supabase_admin.table("profiles").update({
                "telegram_chat_id": chat_id_str,
                "onboarding_complete": True
            }).eq("id", uuid_candidate).execute()

            if not db_res.data:
                print(f"[TELEGRAM WEBHOOK ERROR] Profile with ID {uuid_candidate} not found in database", flush=True)
                return {"status": "error", "message": "User profile not found"}

            print(f"[TELEGRAM WEBHOOK SUCCESS] Database updated for User {uuid_candidate}", flush=True)
        except Exception as db_err:
            print(f"[TELEGRAM WEBHOOK DATABASE ERROR] Supabase update failed: {str(db_err)}", flush=True)
            traceback.print_exc()
            return {"status": "error", "message": "Database update failed"}

        # User Telegram Confirmation: Asynchronous POST message to Telegram bot API
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        if not bot_token:
            print("[TELEGRAM WEBHOOK ERROR] TELEGRAM_BOT_TOKEN environment variable not set", flush=True)
            # Still return success to Telegram
            return {"status": "success", "message": "Database updated but bot token missing"}

        telegram_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        telegram_payload = {
            "chat_id": chat_id,
            "text": "🚀 Connection successful! Your account is now linked. You will receive real-time voice agent call transcripts directly in this chat."
        }

        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(telegram_url, json=telegram_payload, timeout=10.0)
                if res.status_code == 200:
                    print(f"[TELEGRAM WEBHOOK SUCCESS] Confirmation message sent to Chat ID {chat_id_str}", flush=True)
                else:
                    print(f"[TELEGRAM WEBHOOK ERROR] Telegram API returned code {res.status_code}: {res.text}", flush=True)
        except Exception as tg_err:
            print(f"[TELEGRAM WEBHOOK ERROR] Failed to send Telegram message: {str(tg_err)}", flush=True)
            traceback.print_exc()

        return {"status": "success", "message": "Connection verified and database updated"}

    except Exception as e:
        print(f"[TELEGRAM WEBHOOK UNHANDLED ERROR] Webhook execution failed: {str(e)}", flush=True)
        traceback.print_exc()
        return {"status": "error", "message": "Internal server error"}


@telegram_router.post("/vapi")
async def handle_vapi_webhook_telegram(request: Request, background_tasks: BackgroundTasks):
    secret = request.headers.get("x-vapi-secret")
    expected_secret = os.getenv("VAPI_WEBHOOK_SECRET")
    if expected_secret and secret != expected_secret:
        print("[VAPI TELEGRAM WEBHOOK ERROR] Unauthorized access attempt.", flush=True)
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        body = await request.json()
    except Exception:
        print("[VAPI WEBHOOK ERROR] Received non-JSON body", flush=True)
        return {"status": "error", "message": "Invalid JSON body"}
    return await handle_vapi_webhook_logic(body, background_tasks)