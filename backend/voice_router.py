from app.services.telephony.factory import get_provider
import uuid
import json
import math
import os
import httpx
import traceback
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Header, HTTPException, Request, BackgroundTasks, File, UploadFile, Form, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from database import supabase, supabase_admin
from google import genai
import asyncio
try:
    import audioop  # Python <= 3.11 built-in
except ModuleNotFoundError:
    import audioop_lts as audioop  # type: ignore  # Python 3.12+ drop-in replacement
import base64
from livekit import rtc
from app.workers.livekit_agent import generate_agent_token



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



def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(str(val))
        return True
    except ValueError:
        return False



class LiveKitTokenRequest(BaseModel):
    room_name: str | None = "trinetra-demo-room"
    participant_name: str | None = "User"
    agent_id: str | None = None

@router.post("/livekit-token")
async def generate_livekit_token(req: LiveKitTokenRequest):
    if req.agent_id:
        try:
            # Query the agent configuration
            agent_query = supabase_admin.table("agents").select("*")
            if is_valid_uuid(req.agent_id):
                agent_query = agent_query.or_(f"id.eq.{req.agent_id},vapi_agent_id.eq.{req.agent_id}")
            else:
                agent_query = agent_query.eq("vapi_agent_id", req.agent_id)
            
            agent_res = agent_query.execute()
            if agent_res.data and len(agent_res.data) > 0:
                agent_data = agent_res.data[0]
                is_demo = agent_data.get("is_demo", False)
                agent_config = agent_data.get("config", {}) or {}
                plan_tier = agent_config.get("plan_tier", "free_demo")
                
                if is_demo or plan_tier == "free_demo":
                    # Load owner's profile to check minutes & creation date
                    user_id = agent_data.get("user_id")
                    if user_id:
                        profile_res = supabase_admin.table("profiles").select("*").eq("id", user_id).execute()
                        if profile_res.data and len(profile_res.data) > 0:
                            profile_data = profile_res.data[0]
                            demo_minutes_used = profile_data.get("demo_minutes_used", 0)
                            demo_minutes_limit = profile_data.get("demo_minutes_limit", 10)
                            
                            # Check age of the agent
                            created_at_str = agent_data.get("created_at")
                            if created_at_str:
                                try:
                                    created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                                    age_delta = datetime.now(created_at.tzinfo) - created_at
                                    days_active = age_delta.days
                                except Exception:
                                    days_active = 0
                            else:
                                days_active = 0
                            
                            print(f"[DEMO CHECK] Agent: {req.agent_id} | Days Active: {days_active}/5 | Mins Used: {demo_minutes_used}/{demo_minutes_limit}", flush=True)

                            if days_active > 5:
                                print(f"[DEMO EXPIRED] Agent {req.agent_id} is older than 5 days ({days_active} days)", flush=True)
                                raise HTTPException(
                                    status_code=403, 
                                    detail="Demo agent expired: older than 5 days. Please upgrade your plan."
                                )
                            if demo_minutes_used >= demo_minutes_limit:
                                print(f"[DEMO EXPIRED] Agent {req.agent_id} reached minutes limit ({demo_minutes_used} >= {demo_minutes_limit})", flush=True)
                                raise HTTPException(
                                    status_code=403, 
                                    detail="Demo minutes limit reached. Please upgrade your plan."
                                )
        except HTTPException:
            raise
        except Exception as err:
            print(f"[LIVEKIT TOKEN AGENT CHECK ERROR] {str(err)}", flush=True)

    api_key = (os.getenv("LIVEKIT_API_KEY") or "devkey").strip()
    api_secret = (os.getenv("LIVEKIT_API_SECRET") or "secretsecretsecretsecretsecret12").strip()
    livekit_url = (os.getenv("LIVEKIT_URL") or "ws://127.0.0.1:7880").strip()

    now = int(datetime.utcnow().timestamp())
    participant_name = req.participant_name or "User"
    identity = f"{participant_name}_{uuid.uuid4().hex[:6]}"
    room_name = req.room_name or "trinetra-demo-room"

    payload = {
        "exp": now + 86400,
        "iss": api_key,
        "nbf": now - 5,
        "sub": identity,
        "name": participant_name,
        "video": {
            "room": room_name,
            "roomJoin": True,
            "canPublish": True,
            "canSubscribe": True,
            "canPublishData": True
        }
    }

    try:
        import jwt
        token = jwt.encode(payload, api_secret, algorithm="HS256")
        if isinstance(token, bytes):
            token = token.decode("utf-8")
    except Exception as e:
        print(f"[LIVEKIT TOKEN ERROR] PyJWT generation failed: {str(e)}", flush=True)
        token = f"dev_token_{identity}_{room_name}"

    # Spawn the agent worker in the background (only if not disabled)
    if os.getenv("DISABLE_IN_PROCESS_AGENT", "false").lower() != "true":
        print(f"[LIVEKIT AGENT] Spawning agent worker to join room: {room_name} with agent_id: {req.agent_id}", flush=True)
        try:
            async def safe_run_agent(r_name: str, a_id: str):
                try:
                    from agent import run_agent
                    await run_agent(r_name, a_id)
                except Exception as run_err:
                    import traceback
                    print(f"[LIVEKIT AGENT RUN ERROR] Exception in run_agent: {run_err}", flush=True)
                    traceback.print_exc()

            asyncio.create_task(safe_run_agent(room_name, req.agent_id))
        except Exception as spawn_err:
            print(f"[LIVEKIT AGENT SPAWN ERROR] Failed to spawn agent task: {spawn_err}", flush=True)
    else:
        print(f"[LIVEKIT AGENT] Skipping in-process agent spawn (DISABLE_IN_PROCESS_AGENT is true)", flush=True)

    return {
        "status": "success",
        "token": token,
        "url": livekit_url,
        "roomName": room_name,
        "participantIdentity": identity
    }

class TTSTestRequest(BaseModel):
    text: str
    language: str | None = "hi-IN"
    plan_tier: str | None = "starter"
    voice_id: str | None = None
    voice_provider: str | None = None
    voice_speed: float | None = None
    voice_pitch: float | None = None

@router.post("/tts-test")
async def tts_test(req: TTSTestRequest):
    try:
        from app.services.ai.tts_router import TTSRouter
        router_svc = TTSRouter()
        audio_bytes, content_type = await router_svc.synthesize(
            text=req.text,
            language=req.language or "hi-IN",
            plan_tier=req.plan_tier or "starter",
            voice_id=req.voice_id,
            voice_provider=req.voice_provider,
            voice_speed=req.voice_speed,
            voice_pitch=req.voice_pitch
        )
        return Response(content=audio_bytes, media_type=content_type)
    except Exception as e:
        err_msg = str(e)
        print(f"[TTS TEST ERROR] Failed to synthesize speech: {err_msg}", flush=True)
        if "SARVAM_API_KEY" in err_msg or "Sarvam" in err_msg or "missing" in err_msg.lower() or "key" in err_msg.lower():
            return JSONResponse(status_code=400, content={"error": "Sarvam API key not configured", "detail": err_msg})
        return JSONResponse(status_code=400, content={"error": "Sarvam API key not configured", "detail": f"TTS synthesis error: {err_msg}"})

@router.post("/stt-test")
async def stt_test(
    file: UploadFile = File(...),
    language: str = Form("hi-IN")
):
    try:
        from app.services.ai.stt_router import STTRouter
        audio_bytes = await file.read()
        router_svc = STTRouter()
        transcript = await router_svc.transcribe(
            audio_bytes=audio_bytes,
            language=language,
            filename=file.filename or "audio.wav"
        )
        return {"status": "success", "transcript": transcript}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT transcription error: {str(e)}")



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





agents_router = APIRouter(prefix="/api/agents", tags=["Agents"])

def get_config_key(key_name: str) -> str | None:
    try:
        res = supabase_admin.table("system_config").select("config_value").eq("config_key", key_name).single().execute()
        if res.data and res.data.get("config_value"):
            val = res.data["config_value"].strip()
            if val:
                return val
    except Exception:
        pass
    return os.getenv(key_name)

@agents_router.post("/{agent_id}/clone-voice")
async def clone_voice(
    agent_id: str,
    name: str = Form(...),
    file: UploadFile = File(...)
):
    api_key = get_config_key("ELEVENLABS_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="ElevenLabs API Key is not configured in system_config or env")

    url = "https://api.elevenlabs.io/v1/voices/add"
    headers = {
        "xi-api-key": api_key
    }
    
    file_bytes = await file.read()
    files = [
        ("files", (file.filename or "sample.mp3", file_bytes, file.content_type or "audio/mpeg"))
    ]
    data = {
        "name": name,
        "description": f"Cloned voice for agent {agent_id}"
    }

    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(url, data=data, files=files, headers=headers, timeout=60.0)
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=f"ElevenLabs error: {res.text}")
            
            res_data = res.json()
            new_voice_id = res_data.get("voice_id")
            if not new_voice_id:
                raise HTTPException(status_code=500, detail="ElevenLabs did not return a voice_id")

            # Update Supabase databases
            try:
                supabase_admin.table("agents").update({
                    "voice_id": new_voice_id,
                    "voice_provider": "elevenlabs"
                }).eq("id", agent_id).execute()
            except Exception:
                pass

            # Removed legacy user_agents update

            return {
                "status": "success",
                "voice_id": new_voice_id,
                "voice_name": name
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice cloning failed: {str(e)}")

class EnhancePromptRequest(BaseModel):
    description: str
    agent_type: str | None = "sales"
    mode: str | None = "prompt"  # "prompt", "greeting", or "fallback"
    current_prompt: str | None = None  # NEW: existing prompt to enhance

@agents_router.post("/enhance-prompt")
async def enhance_prompt(req: EnhancePromptRequest):
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
    
    if req.mode == 'greeting':
        system_prompt = """You are a Hindi/TTS pronunciation expert. Rewrite the user's greeting message to be perfectly pronounced by Indian TTS engines (Sarvam Bulbul v3).

RULES:
1. Use FULL spellings: "raha hoon" NOT "rha hu", "rahi hoon" NOT "rahi hu", "kar sakta hoon" NOT "kar sakta hu"
2. Remove unnecessary punctuation that makes TTS speak too fast (!, multiple commas)
3. Keep it natural and warm — like a real Indian salesperson
4. Maintain the original meaning and language mix (Hinglish)
5. Output ONLY the rewritten greeting, nothing else.
6. Keep it under 2 sentences."""
    elif req.mode == 'fallback':
        system_prompt = """You are a Hindi/TTS pronunciation expert. Rewrite this message for perfect TTS pronunciation.

RULES:
1. Use FULL spellings for all Hindi words
2. Keep it polite and clear
3. The user should easily understand what to do next
4. Output ONLY the rewritten message, nothing else."""
    else:
        system_prompt = """You are enhancing an EXISTING professional AI voice agent's system prompt.

CRITICAL RULE: You are NOT creating a new prompt from scratch. The agent already has a complete personality with:
- Tone of voice and speaking style
- Conversation flow and rules
- Objection handling techniques
- Closing techniques
- Language rules (Hinglish/Hindi/English)

The user wants to ADD or MODIFY specific behaviors. Your job:
1. KEEP the existing prompt INTACT
2. Add the user's requested change as a new rule or modification
3. If the user says "be more friendly", add: "IMPORTANT: Be extra warm and friendly in your responses. Use more encouraging language."
4. If the user says "always ask about budget", add: "IMPORTANT: In every conversation, ask about the prospect's budget before proceeding."
5. If the user says "speak only in Hindi", add: "CRITICAL: Always respond in Hindi, never use English."
6. NEVER remove existing rules about objection handling, closing, or language switching
7. NEVER replace the entire prompt — only append modifications

OUTPUT: Return the FULL enhanced prompt (original + additions). Keep it concise. Add new rules at the end with clear labels like 'ADDITIONAL BEHAVIOR:' or 'MODIFIED RULE:'."""

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
            json={
                "model": "groq/compound",
                "messages": [{
                    "role": "system",
                    "content": system_prompt
                }, {
                    "role": "user", 
                    "content": f"EXISTING AGENT PROMPT:\n{req.current_prompt or 'No existing prompt'}\n\nUSER REQUESTED CHANGE:\n{req.description}\n\nEnhance the existing prompt by adding/modifying only what the user requested. Keep everything else intact." if req.mode == 'prompt' else req.description
                }],
                "temperature": 0.7,
                "max_tokens": 800
            }
        )
        
        if res.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Groq error: {res.text}")
        
        data = res.json()
        enhanced = data["choices"][0]["message"]["content"]
        return {"success": True, "enhanced_prompt": enhanced}

class EnhanceMessagesRequest(BaseModel):
    greeting: str | None = None
    fallback: str | None = None
    ending: str | None = None

@agents_router.post("/enhance-messages")
async def enhance_messages(req: EnhanceMessagesRequest):
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
    
    prompt = """You are a Text-to-Speech pronunciation optimizer. Your job is to rewrite messages so they sound PERFECT when spoken by a voice AI.

WHAT YOU DO:
- You fix spelling, grammar, and punctuation that affect pronunciation
- You do NOT change the language, meaning, or tone of the message
- You do NOT translate between languages
- You do NOT replace the user's words with standard defaults
- If the input is English, output English. If Hinglish, output Hinglish. If Hindi, output Hindi.

PRONUNCIATION RULES FOR INDIAN TTS (Sarvam Bulbul v3):
1. Hindi words MUST use full vowel spellings:
   - "raha hoon" NOT "rha hu" or "raha hu"
   - "rahi hoon" NOT "rahi hu"  
   - "kar raha hoon" NOT "kar rha hu"
   - "bol rahi hoon" NOT "bol rahi hu"
   - "samajh" NOT "smjh" or "smajh"
   - "kripya" NOT "krpya" or "kripaya"
   - "main" NOT "mei" or "me"
   - "aap" NOT "ap"
   - "hain" NOT "hai" (when plural/formal)

2. Remove punctuation that causes unnatural pauses or speed changes:
   - Multiple exclamation marks "!!!" → remove extras
   - "..." at start of sentence → remove
   - Excessive commas → keep only grammatically necessary ones

3. Add natural pauses with a single period or comma where a human would breathe.

4. For Hinglish: Hindi words get full spellings. English words stay unchanged.

5. If the input is already perfect, return it unchanged.

OUTPUT FORMAT:
Return ONLY valid JSON with exactly these keys:
- enhanced_greeting
- enhanced_fallback  
- enhanced_ending

If a field is empty in the input, return empty string for that field.

DO NOT add any explanation. DO NOT wrap in markdown. ONLY the JSON object."""

    messages_text = f"""Enhance these messages for perfect TTS pronunciation:

GREETING: {req.greeting or '(empty)'}
FALLBACK: {req.fallback or '(empty)'}
ENDING: {req.ending or '(empty)'}"""

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
            json={
                "model": "groq/compound",
                "messages": [
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": messages_text}
                ],
                "temperature": 0.1,
                "max_tokens": 500,
                "response_format": {"type": "json_object"}
            }
        )
        
        if res.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Groq error: {res.text}")
            
        data = res.json()
        enhanced = json.loads(data["choices"][0]["message"]["content"])
        return enhanced

# --- VOICELINK WEBHOOKS ---

@router.post("/webhooks/voice/voicelink/{organization_id}")
async def handle_voicelink_webhook(
    organization_id: str,
    request: Request,
    signature: str = Header(None, alias="X-VoiceLink-Signature")
):
    """
    Handle incoming webhooks from VoiceLink.
    Events: call.initiated, call.answered, call.ended, call.completed
    """
    body = await request.json()
    
    # Validate webhook
    provider = get_provider("voicelink")
    if not await provider.validate_webhook_request(body, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook")
    
    event = body.get("event")
    call_id = body.get("callId")
    
    print(f"[Webhook] VoiceLink {event} — Call: {call_id}", flush=True)
    
    # Map to our database
    if event == "call.initiated":
        await handle_call_initiated(body, organization_id)
    elif event == "call.answered":
        await handle_call_answered(body, organization_id)
    elif event == "call.ended":
        await handle_call_ended(body, organization_id)
    elif event == "call.completed":
        await handle_call_completed(body, organization_id)
    
    return {"status": "ok"}


async def handle_call_initiated(body: dict, org_id: str):
    """New call started — create voice_calls record"""
    try:
        supabase_admin.table("voice_calls").insert({
            "organization_id": org_id,
            "provider_call_id": body["callId"],
            "caller_number": body["fromNumber"],
            "agent_number": body["toNumber"],
            "direction": body.get("direction", "inbound"),
            "status": "initiated",
            "metadata": body.get("customParameters", {}),
            "started_at": datetime.utcnow().isoformat()
        }).execute()
    except Exception as e:
        print(f"[Webhook Error] Failed to handle call.initiated: {e}", flush=True)

async def handle_call_answered(body: dict, org_id: str):
    """Call connected — update status"""
    try:
        supabase_admin.table("voice_calls").update({
            "status": "in_progress"
        }).eq("provider_call_id", body["callId"]).execute()
    except Exception as e:
        print(f"[Webhook Error] Failed to handle call.answered: {e}", flush=True)

async def handle_call_ended(body: dict, org_id: str):
    """Call ended — update duration and status"""
    try:
        supabase_admin.table("voice_calls").update({
            "status": body.get("callStatus", "completed"),
            "duration_seconds": body.get("duration", 0)
        }).eq("provider_call_id", body["callId"]).execute()
    except Exception as e:
        print(f"[Webhook Error] Failed to handle call.ended: {e}", flush=True)

async def handle_call_completed(body: dict, org_id: str):
    """Call processed — save recording URL and final data"""
    try:
        supabase_admin.table("voice_calls").update({
            "status": "completed",
            "duration_seconds": body.get("duration", 0),
            "recording_url": body.get("recordingUrl"),
            "metadata": body.get("customParameters", {})
        }).eq("provider_call_id", body["callId"]).execute()
    except Exception as e:
        print(f"[Webhook Error] Failed to handle call.completed: {e}", flush=True)


# --- TWILIO INBOUND & OUTBOUND VOICE WEBHOOKS ---

@router.api_route("/webhooks/voice/twilio/{organization_id}", methods=["GET", "POST"])
@router.api_route("/webhooks/voice/twilio", methods=["GET", "POST"])
@router.api_route("/twiml/inbound", methods=["GET", "POST"])
@router.api_route("/twiml/outbound/{organization_id}", methods=["GET", "POST"])
async def handle_twilio_voice_webhook(
    request: Request,
    organization_id: Optional[str] = "default"
):
    """
    Handle incoming & outbound Twilio voice webhooks.
    Logs call in voice_calls table, spawns AI agent, and returns TwiML instructions.
    """
    try:
        form_data = {}
        content_type = request.headers.get("content-type", "")
        if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
            form = await request.form()
            form_data = dict(form)
        else:
            try:
                form_data = await request.json()
            except Exception:
                form_data = dict(request.query_params)

        call_sid = form_data.get("CallSid") or form_data.get("call_sid") or str(uuid.uuid4())
        from_number = form_data.get("From") or form_data.get("from") or "Unknown"
        to_number = form_data.get("To") or form_data.get("to") or "+12282950908"
        direction = form_data.get("Direction") or "inbound"
        call_status = form_data.get("CallStatus") or "in-progress"

        print(f"[Twilio Webhook] Received call: {call_sid} | From: {from_number} -> To: {to_number} | Direction: {direction} | Status: {call_status}", flush=True)

        # 1. Resolve agent
        agent_id = request.query_params.get("agent_id")
        agent_data = None
        if agent_id:
            try:
                agent_res = supabase_admin.table("agents").select("*").eq("id", agent_id).maybe_single().execute()
                agent_data = agent_res.data
            except Exception:
                agent_data = None

        if not agent_data:
            try:
                clean_to = to_number.replace("+", "").strip()
                agent_lookup = supabase_admin.table("agents").select("*").or_(f"phone_number.eq.{to_number},phone_number.eq.+{clean_to},phone_number.eq.{clean_to}").limit(1).execute()
                if agent_lookup.data and len(agent_lookup.data) > 0:
                    agent_data = agent_lookup.data[0]
                    agent_id = agent_data["id"]
                else:
                    # Try resolving via agent_phone_numbers / phone_numbers pool mapping
                    phone_res = supabase_admin.table("phone_numbers").select("id").or_(f"phone_number.eq.{to_number},phone_number.eq.+{clean_to},phone_number.eq.{clean_to}").limit(1).execute()
                    if phone_res.data and len(phone_res.data) > 0:
                        phone_id = phone_res.data[0]["id"]
                        mapping_res = supabase_admin.table("agent_phone_numbers").select("agent_id").eq("phone_number_id", phone_id).limit(1).execute()
                        if mapping_res.data and len(mapping_res.data) > 0:
                            agent_id = mapping_res.data[0]["agent_id"]
                            agent_res = supabase_admin.table("agents").select("*").eq("id", agent_id).maybe_single().execute()
                            agent_data = agent_res.data
            except Exception as e:
                print(f"[Twilio Lookup Error] {e}", flush=True)

        # Enforce Capabilities Matrix check
        if agent_data and direction == "inbound":
            agent_type = agent_data.get("agent_type", "voice")
            # Lead Qualifier does NOT support inbound calls
            if agent_type == "lead_qualifier":
                print(f"[Twilio Webhook] Inbound call rejected for agent {agent_id} (type: {agent_type})", flush=True)
                rejection_twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">Thank you for calling. This assistant is configured for outbound campaigns and callbacks only. Goodbye.</Say>
    <Hangup/>
</Response>"""
                return Response(content=rejection_twiml.strip(), media_type="application/xml")

        agent_name = agent_data.get("name", "Trinetra AI Assistant") if agent_data else "Trinetra AI Assistant"
        user_id = agent_data.get("user_id") if agent_data else None
        org_id = organization_id if organization_id and organization_id != "default" else (agent_data.get("organization_id") if agent_data else None)

        # Resolve contact_id from query params
        contact_id = request.query_params.get("contact_id")

        # 2. Insert or update voice_calls table
        try:
            existing = supabase_admin.table("voice_calls").select("id, metadata").eq("metadata->>provider_call_id", call_sid).limit(1).execute()
            if not existing.data:
                call_record = {
                    "agent_id": agent_id,
                    "user_id": user_id,
                    "organization_id": org_id,
                    "caller_phone": to_number if direction == "outbound-api" else from_number,
                    "status": "in_progress",
                    "started_at": datetime.utcnow().isoformat(),
                    "transcript": f"Agent: Hello! Welcome to Trinetra AI. How may I assist you today?\nCaller: {from_number}",
                    "language_detected": "english",
                    "metadata": {
                        "provider_call_id": call_sid,
                        "session_id": call_sid,
                        "direction": direction,
                        "from_number": from_number,
                        "to_number": to_number,
                        "contact_id": contact_id
                    }
                }
                supabase_admin.table("voice_calls").insert(call_record).execute()
                print(f"[Twilio Voice] Logged call record: {call_sid}", flush=True)
            else:
                # Update contact_id in metadata if present
                if contact_id:
                    existing_row = existing.data[0]
                    existing_meta = existing_row.get("metadata") or {}
                    existing_meta["contact_id"] = contact_id
                    supabase_admin.table("voice_calls").update({
                        "metadata": existing_meta
                    }).eq("id", existing_row["id"]).execute()
                    print(f"[Twilio Voice] Updated call record {existing_row['id']} metadata with contact_id: {contact_id}", flush=True)
        except Exception as db_err:
            print(f"[Twilio Voice DB Error] {db_err}", flush=True)

        # 3. Spawn background agent worker
        room_name = f"twilio-{call_sid}"
        if agent_id and os.getenv("DISABLE_IN_PROCESS_AGENT", "false").lower() != "true":
            try:
                from agent import run_agent
                asyncio.create_task(run_agent(room_name, agent_id, contact_id=contact_id))
            except Exception as spawn_err:
                print(f"[Twilio Agent Spawn] {spawn_err}", flush=True)

        # 4. Return TwiML with Connect Stream
        host = request.headers.get("host") or "localhost:8000"
        scheme = "wss" if request.url.scheme == "https" or "trycloudflare.com" in host or "ngrok-free.dev" in host else "ws"
        stream_url = f"{scheme}://{host}/api/voice/webhooks/voice/twilio/stream/{room_name}"
        
        twiml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="{stream_url}" />
    </Connect>
    <Pause length="3600" />
</Response>"""

        return Response(content=twiml_response.strip(), media_type="application/xml")
    except Exception as e:
        print(f"[Twilio Webhook Error] {e}\n{traceback.format_exc()}", flush=True)
        fallback = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Thank you for calling. Your call is connected to Trinetra AI.</Say>
</Response>"""
        return Response(content=fallback, media_type="application/xml")


@router.api_route("/webhooks/voice/twilio/status/{organization_id}", methods=["GET", "POST"])
@router.api_route("/webhooks/voice/twilio/status", methods=["GET", "POST"])
async def handle_twilio_voice_status(
    request: Request,
    organization_id: Optional[str] = "default"
):
    """
    Handle Twilio call status callback (ringing, answered, completed).
    Updates voice_calls record with duration and final status.
    """
    try:
        form_data = {}
        content_type = request.headers.get("content-type", "")
        if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
            form = await request.form()
            form_data = dict(form)
        else:
            try:
                form_data = await request.json()
            except Exception:
                form_data = dict(request.query_params)

        call_sid = form_data.get("CallSid") or form_data.get("call_sid")
        call_status = form_data.get("CallStatus") or form_data.get("status") or "completed"
        duration = int(form_data.get("CallDuration") or form_data.get("duration") or 0)
        recording_url = form_data.get("RecordingUrl")

        print(f"[Twilio Status Webhook] Call: {call_sid} | Status: {call_status} | Duration: {duration}s", flush=True)

        if call_sid:
            update_payload = {
                "status": "completed" if call_status in ["completed", "in-progress", "answered"] else call_status,
                "duration_seconds": duration,
                "ended_at": datetime.utcnow().isoformat()
            }
            if recording_url:
                update_payload["recording_url"] = recording_url

            supabase_admin.table("voice_calls").update(update_payload).eq("metadata->>provider_call_id", call_sid).execute()

        return {"status": "ok"}
    except Exception as e:
        print(f"[Twilio Status Error] {e}", flush=True)
        return {"status": "error", "message": str(e)}


# --- TWILIO BI-DIRECTIONAL WEBSOCKET AUDIO BRIDGE ---

@router.websocket("/webhooks/voice/twilio/stream/{room_name}")
async def twilio_audio_stream(websocket: WebSocket, room_name: str):
    await websocket.accept()
    print(f"[Twilio WebSocket] Connected for room: {room_name}", flush=True)
    
    # 1. Connect to LiveKit room
    room = rtc.Room()
    token = generate_agent_token(room_name)
    livekit_url = os.getenv("LIVEKIT_URL", "ws://127.0.0.1:7880").strip()
    
    try:
        await room.connect(livekit_url, token)
        print(f"[Twilio WebSocket] Connected to LiveKit room: {room_name}", flush=True)
    except Exception as conn_err:
        print(f"[Twilio WebSocket] LiveKit connection failed: {conn_err}", flush=True)
        await websocket.close()
        return

    # 2. Setup Audio Source & Track
    audio_source = rtc.AudioSource(sample_rate=16000, num_channels=1)
    audio_track = rtc.LocalAudioTrack.create_audio_track("twilio-inbound", audio_source)
    await room.local_participant.publish_track(audio_track)
    print("[Twilio WebSocket] Inbound audio track published", flush=True)
    
    stream_sid = None
    ratecv_state_in = None
    ratecv_state_out = None
    
    audio_queue = asyncio.Queue()
    track_tasks = {}

    async def read_track(track: rtc.RemoteAudioTrack):
        try:
            audio_stream = rtc.AudioStream(track)
            async for event in audio_stream:
                await audio_queue.put(event.frame)
        except Exception as read_err:
            print(f"[Twilio WebSocket] Error reading track: {read_err}", flush=True)

    @room.on("track_subscribed")
    def on_track_subscribed(track: rtc.RemoteAudioTrack, publication: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant):
        print(f"[Twilio WebSocket] Track subscribed: {track.sid} from {participant.identity} (kind: {track.kind})", flush=True)
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            task = asyncio.create_task(read_track(track))
            track_tasks[track.sid] = task

    @room.on("track_unsubscribed")
    def on_track_unsubscribed(track: rtc.RemoteAudioTrack, publication: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant):
        print(f"[Twilio WebSocket] Track unsubscribed: {track.sid}", flush=True)
        if track.sid in track_tasks:
            track_tasks[track.sid].cancel()
            del track_tasks[track.sid]

    @room.on("disconnected")
    def on_disconnected(reason=None):
        print(f"[Twilio WebSocket] LiveKit room disconnected: {reason}. Closing Twilio WebSocket.", flush=True)
        try:
            asyncio.create_task(websocket.close())
        except Exception as close_err:
            print(f"[Twilio WebSocket] Error closing websocket: {close_err}", flush=True)

    async def send_to_twilio():
        nonlocal stream_sid, ratecv_state_out
        try:
            while True:
                frame = await audio_queue.get()
                if not stream_sid:
                    continue
                
                pcm_data = frame.data
                sample_rate = frame.sample_rate
                
                pcm_8k, ratecv_state_out = audioop.ratecv(
                    pcm_data, 2, 1, sample_rate, 8000, ratecv_state_out
                )
                
                mulaw_data = audioop.lin2ulaw(pcm_8k, 2)
                payload = base64.b64encode(mulaw_data).decode("utf-8")
                await websocket.send_json({
                    "event": "media",
                    "streamSid": stream_sid,
                    "media": {
                        "payload": payload
                    }
                })
        except asyncio.CancelledError:
            pass
        except Exception as send_err:
            print(f"[Twilio WebSocket] Send task error: {send_err}", flush=True)

    send_task = asyncio.create_task(send_to_twilio())
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            event = msg.get("event")
            
            if event == "start":
                stream_sid = msg["start"]["streamSid"]
                print(f"[Twilio WebSocket] Media stream active: {stream_sid}", flush=True)
                
            elif event == "media":
                media = msg.get("media", {})
                payload_b64 = media.get("payload")
                if payload_b64:
                    mulaw_data = base64.b64decode(payload_b64)
                    
                    pcm_8k = audioop.ulaw2lin(mulaw_data, 2)
                    pcm_16k, ratecv_state_in = audioop.ratecv(
                        pcm_8k, 2, 1, 8000, 16000, ratecv_state_in
                    )
                    
                    samples_per_channel = len(pcm_16k) // 2
                    frame = rtc.AudioFrame(
                        data=pcm_16k,
                        sample_rate=16000,
                        num_channels=1,
                        samples_per_channel=samples_per_channel
                    )
                    await audio_source.capture_frame(frame)
                    
            elif event == "stop":
                print("[Twilio WebSocket] Media stream stopped by Twilio", flush=True)
                break
    except WebSocketDisconnect:
        print("[Twilio WebSocket] Client disconnected", flush=True)
    except Exception as e:
        print(f"[Twilio WebSocket] Bridge exception: {e}", flush=True)
    finally:
        send_task.cancel()
        for t in track_tasks.values():
            t.cancel()
        await room.disconnect()
        print(f"[Twilio WebSocket] Connection for room {room_name} closed & cleaned up", flush=True)


