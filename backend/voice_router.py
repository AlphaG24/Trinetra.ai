import uuid
import json
import math
import smtplib
from email.message import EmailMessage
import os
from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from database import supabase, supabase_admin

router = APIRouter(prefix="/api/voice", tags=["Voice Agent"])

def send_call_summary_email(to_email: str, phone: str, duration: int, sentiment: str, transcript: str):
    smtp_email = os.getenv("SMTP_EMAIL")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if not smtp_email or not smtp_password:
        print("[EMAIL ERROR] SMTP_EMAIL or SMTP_PASSWORD environment variable is not set.", flush=True)
        return
        
    if not to_email:
        print("[EMAIL ERROR] Recipient email is empty or invalid.", flush=True)
        return

    try:
        msg = EmailMessage()
        msg["Subject"] = f"Trinetra.ai Call Summary - Phone: {phone}"
        msg["From"] = smtp_email
        msg["To"] = to_email
        
        # Format duration as minutes and seconds
        minutes = duration // 60
        seconds = duration % 60
        duration_str = f"{minutes}m {seconds}s" if minutes > 0 else f"{seconds}s"
        
        email_body = f"""Hello,

Here is the summary of the call received on your assistant:

--- CALL DETAILS ---
Customer Phone: {phone}
Duration: {duration_str}
Sentiment: {sentiment}

--- CALL TRANSCRIPT ---
{transcript if transcript else 'No transcript available.'}

Best regards,
Trinetra.ai Team
"""
        msg.set_content(email_body)
        
        # Connect to Gmail SMTP
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(smtp_email, smtp_password)
            server.send_message(msg)
            
        print(f"[EMAIL SUCCESS] Call summary sent to {to_email}", flush=True)
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send email to {to_email}: {str(e)}", flush=True)

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

@router.post("/vapi-webhook")
async def handle_vapi_webhook(request: Request, background_tasks: BackgroundTasks):
    try:
        payload = await request.json()
    except Exception:
        print("CRITICAL: VAPI SENT NON-JSON PAYLOAD", flush=True)
        return {"status": "error", "detail": "Invalid JSON"}

    message = payload.get("message", {})
    event_type = message.get("type", "UNKNOWN_EVENT")
    
    # --- DEEP SEARCH HELPER FUNCTION ---
    # This recursively scans the entire webhook to find the lead data, 
    # no matter where Vapi decides to nest it.
    def deep_search_lead(obj):
        if isinstance(obj, dict):
            # Did we find the actual lead data folder?
            if 'phone' in obj and 'is_lead' in obj:
                return obj
            # Did we find the UUID wrapper containing the 'result' folder?
            if 'result' in obj and isinstance(obj['result'], dict):
                if 'phone' in obj['result'] and 'is_lead' in obj['result']:
                    return obj['result']
            # Otherwise, keep digging deeper
            for k, v in obj.items():
                found = deep_search_lead(v)
                if found: return found
        elif isinstance(obj, list):
            for item in obj:
                found = deep_search_lead(item)
                if found: return found
        return None

    if event_type == "end-of-call-report":
        print("\n========== END OF CALL REPORT RECEIVED ==========", flush=True)
        
        call_data = message.get('call', {})
        user_id = (
            call_data.get('assistantOverrides', {}).get('metadata', {}).get('userId') or
            call_data.get('assistantOverrides', {}).get('variableValues', {}).get('user_id') or
            call_data.get('assistant', {}).get('metadata', {}).get('userId') or
            call_data.get('metadata', {}).get('userId')
        )
        
        if not user_id:
            print("ERROR: No user_id found in webhook payload.", flush=True)
            return {"status": "success", "detail": "Missing user_id ignored"}

        # Fetch the user's email from Supabase
        user_email = None
        try:
            user_email = supabase_admin.table('profiles').select('email').eq('id', user_id).execute().data[0]['email']
        except Exception as e:
            print(f"ERROR: Failed to fetch user's email from Supabase: {str(e)}", flush=True)
            
        analysis = message.get('analysis', {})
        artifact = message.get('artifact', {})
        
        # --- 1. EXTRACT ANALYTICS & ARTIFACTS ---
        recording_url = artifact.get('recordingUrl', '')
        
        transcript = message.get('transcript', '')
        if not transcript and artifact.get('messages'):
            messages_list = artifact.get('messages', [])
            transcript = "\n".join([
                f"{m.get('role', 'unknown').upper()}: {m.get('message', '')}" 
                for m in messages_list if m.get('message')
            ])
            
        summary = analysis.get('summary', '')
        raw_success = str(analysis.get('successEvaluation', 'Neutral')).lower()
        sentiment = "Positive" if raw_success == "true" else "Neutral"

        duration_seconds = int(message.get('durationSeconds') or call_data.get('durationSeconds') or message.get('duration', 0))
        quota_cost = math.ceil(duration_seconds / 60) if duration_seconds > 0 else 0
        
        if user_id and is_valid_uuid(user_id):
            # --- 2. INSERT CALL LOGS (BYPASSING RLS) ---
            try:
                supabase_admin.table("agent_call_logs").insert({
                    "user_id": user_id,
                    "duration_seconds": duration_seconds,
                    "transcript": transcript,
                    "recording_url": recording_url,
                    "sentiment": sentiment
                }).execute()
                print("   -> [SUCCESS] Call Log saved to Supabase via admin.", flush=True)
            except Exception as e:
                print(f"   -> [ERROR] Call Log Save Failed: {str(e)}", flush=True)

            # --- 2.5 TRIGGER BACKGROUND EMAIL TASK ---
            lead_data = deep_search_lead(payload)
            customer_phone = (
                call_data.get('customer', {}).get('number') or 
                call_data.get('customer', {}).get('phone') or
                call_data.get('customerPhone') or 
                message.get('customer', {}).get('number') or
                (lead_data or {}).get('phone') or
                "Unknown"
            )
            duration = duration_seconds
            
            try:
                background_tasks.add_task(
                    send_call_summary_email,
                    user_email,
                    customer_phone,
                    duration,
                    sentiment,
                    transcript
                )
                print(f"   -> [SUCCESS] Enqueued background email task for {user_email}", flush=True)
            except Exception as e:
                print(f"   -> [ERROR] Failed to queue background email task: {str(e)}", flush=True)
                
            # --- 3. DEEP NATIVE LEAD EXTRACTION ---
            print("--- RUNNING DEEP NATIVE LEAD EXTRACTION ---", flush=True)
            
            if java_lead := lead_data:
                print(f"   -> [FOUND] Deep Search extracted lead: {java_lead}", flush=True)
                
                extracted_name = java_lead.get('name', "Demo User")
                extracted_phone = java_lead.get('phone')
                extracted_email = java_lead.get('email')
                if not extracted_email or extracted_email == 'none@provided.com':
                    extracted_email = user_email or "none@provided.com"
                
                # Handle boolean safely
                raw_is_lead = java_lead.get('is_lead', False)
                is_lead = raw_is_lead is True or str(raw_is_lead).lower() == 'true'
                
                if extracted_phone and is_lead:
                    print(f"   -> [LEAD DETECTED] Saving phone: {extracted_phone}", flush=True)
                    try:
                        supabase_admin.table("leads").insert({
                            "user_id": user_id,
                            "full_name": extracted_name,
                            "contact_name": extracted_name,
                            "email": extracted_email,           
                            "contact_email": extracted_email,   
                            "contact_phone": extracted_phone,
                            "message": summary,
                            "status": "new",
                            "source": "voice_demo"
                        }).execute()
                        print("   -> [SUCCESS] Lead saved to Supabase via admin.", flush=True)
                    except Exception as e:
                        print(f"   -> [ERROR] Lead Save Failed: {str(e)}", flush=True)
                else:
                    print("   -> [INFO] is_lead was false or phone was missing.", flush=True)
            else:
                print("   -> [INFO] Deep Search found NO lead data anywhere in payload.", flush=True)

            # --- 4. UPDATE USER QUOTA (BYPASSING RLS) ---
            try:
                current_user = supabase_admin.table('profiles').select('demo_minutes_used').eq('id', user_id).execute()
                if current_user.data:
                    new_usage = current_user.data[0]['demo_minutes_used'] + quota_cost
                    supabase_admin.table('profiles').update({"demo_minutes_used": new_usage}).eq('id', user_id).execute()
                    print(f"   -> [SUCCESS] Quota updated. Used: {new_usage} mins.", flush=True)
            except Exception as e:
                print(f"   -> [ERROR] Quota Update Failed: {str(e)}", flush=True)
                
        print("========== REPORT PROCESSING COMPLETE ==========\n", flush=True)
                
    return {"status": "webhook received"}

@router.get("/history/{user_id}")
async def get_user_call_history(user_id: str):
    if not is_valid_uuid(user_id):
        return {"status": "success", "data": []}
    
    # Query database call logs bypassing RLS restrictions while strictly isolating data matching the exact user_id
    response = supabase_admin.table("agent_call_logs").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return {"status": "success", "data": response.data}