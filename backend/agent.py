import os
import re
from datetime import datetime
import httpx
import json
import time
import logging
import asyncio
import jwt
from dotenv import load_dotenv
from livekit.agents import JobContext, WorkerOptions, cli, AgentServer, tts
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import sarvam, silero, openai, elevenlabs
from database import supabase_admin

load_dotenv()

logger = logging.getLogger("voice-agent")
logger.setLevel(logging.INFO)

# Load Silero VAD once at startup to eliminate disk-loading latency
logger.info("Pre-loading Silero VAD model...")
vad_model = silero.VAD.load()
logger.info("Silero VAD model preloaded successfully!")


def load_system_prompt() -> str:
    """Load the Vikram Sharma professional sales agent prompt."""
    try:
        prompt_path = os.path.join(os.path.dirname(__file__), "prompts", "vikram_sharma.txt")
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    except:
        logger.warning("Could not load vikram_sharma.txt, using fallback prompt")
        return """You are Vikram Sharma, a 12-year experienced Senior Sales Manager at Trinetra AI.
        Speak warm, confident Hinglish. Be persuasive but never pushy.
        Handle objections professionally. Always try to convert the prospect.
        Keep responses under 2 sentences. Match the prospect's language.
        Never reveal you are AI unless directly asked."""


# ============================================================
# MULTI-PERSONALITY ENGINE
# ============================================================
# These helpers are ONLY called when an agent has 2+ personalities
# enabled in its `personalities` JSONB column.
# Single-personality agents never touch this code path.

def _count_enabled_personalities(personalities_raw) -> int:
    """Count how many personalities are enabled. Returns 0 for null/invalid input."""
    if not personalities_raw:
        return 0
    try:
        if isinstance(personalities_raw, str):
            personalities_raw = json.loads(personalities_raw)
        return sum(1 for v in personalities_raw.values() if v is True)
    except Exception:
        return 0


def _get_transcript_messages(agent_instance):
    """Safely extract ChatMessage list from agent_instance's chat_ctx."""
    if not agent_instance:
        return []
    chat_ctx = getattr(agent_instance, 'chat_ctx', None)
    if not chat_ctx and hasattr(agent_instance, 'session'):
        chat_ctx = getattr(agent_instance.session, 'chat_ctx', None)
    if not chat_ctx:
        return []
    raw_msgs = getattr(chat_ctx, 'messages', None)
    if not raw_msgs:
        return []
    msgs = raw_msgs() if callable(raw_msgs) else raw_msgs
    return msgs if isinstance(msgs, (list, tuple)) else []


async def apply_multi_personality_prompt(
    agent_instance,
    user_message: str,
    enabled_personalities: dict,
    base_prompt_suffix: str,
    agent_data: dict,
) -> None:
    """
    Classify intent and update the agent's system prompt if intent changed.

    SAFETY:
    - Only called when enabled_personalities has 2+ True values.
    - Fully wrapped in try/except — any failure is logged and silently ignored.
    - 500ms timeout enforced inside IntentClassifier.classify().
    - Conversation history is NEVER modified — only the system instructions change.
    """
    try:
        from app.services.intent_classifier import IntentClassifier
        from app.services.prompt_service import PromptService
        from database import supabase_admin as _supabase

        # Build context from existing chat history
        context = ""
        try:
            msgs = _get_transcript_messages(agent_instance)
            recent_msgs = msgs[-6:] if msgs else []
            context = "\n".join(
                f"{getattr(m, 'role', '')}: {getattr(m, 'content', '')}" for m in recent_msgs
                if hasattr(m, 'role') and getattr(m, 'role', '') in ("user", "assistant") and getattr(m, 'content', None)
            )
        except Exception:
            pass

        classifier = IntentClassifier()
        new_intent = await classifier.classify(user_message, enabled_personalities, context)

        previous_intent = getattr(agent_instance, '_current_multi_intent', None)

        if new_intent == previous_intent:
            return  # No change — nothing to do

        # Intent changed — load the new system prompt
        prompt_svc = PromptService(_supabase)
        new_base_prompt = await prompt_svc.get_prompt(new_intent)

        # Replace agent_name placeholder
        raw_name = agent_data.get('name', 'Agent')
        clean_name = re.sub(r'^\[[^\]]+\]\s*', '', raw_name)
        clean_name = re.sub(r'\s*-\s*(Demo|Trial)\s*$', '', clean_name, flags=re.IGNORECASE)
        new_base_prompt = new_base_prompt.replace('{{agent_name}}', clean_name)
        new_base_prompt = new_base_prompt.replace('{agentName}', clean_name)

        # Append the personality style suffix and expressive rules from main prompt
        full_new_prompt = new_base_prompt + base_prompt_suffix

        # Update the agent's live instructions if the SDK supports it
        if hasattr(agent_instance, 'update_instructions'):
            agent_instance.update_instructions(full_new_prompt)
        elif hasattr(agent_instance, '_instructions'):
            agent_instance._instructions = full_new_prompt

        agent_instance._current_multi_intent = new_intent
        logger.info(
            f"[MULTI-PERSONALITY] Intent switched: {previous_intent or 'initial'} → {new_intent}"
        )

    except Exception as e:
        logger.warning(f"[MULTI-PERSONALITY] apply_multi_personality_prompt failed (non-fatal): {e}")

def clean_ssml(text: str) -> str:
    if not text:
        return "Haan ji, main sun raha hoon."
    import re
    # Remove markdown bold/italics
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = text.replace('**', '')
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    # Remove custom speech tags like ((warm)), ((slow)), ((/warm))
    text = re.sub(r'\(\(/?[a-zA-Z0-9_-]+\)\)', '', text)
    # Remove XML / SSML tags like <break>, <emphasis>
    text = re.sub(r'<[^>]+>', '', text)
    # Remove emojis
    text = re.sub(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF]', '', text)
    # Remove text emoticons
    text = text.replace(':)', '').replace(':(', '').replace(':D', '')
    # Clean whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    # Fallback for empty text
    if len(text) < 2:
        return "Haan ji, main sun raha hoon."
    return text

def text_to_ssml(text: str, provider: str = "sarvam") -> str:
    """Convert marker-rich text to SSML for expressive TTS (legacy fallback, clean_ssml takes priority)"""
    return clean_ssml(text)

class ExpressiveTTSStream(tts.SynthesizeStream):
    def __init__(self, tts_instance, underlying_stream, provider="sarvam"):
        import re
        self._underlying = underlying_stream
        self._tts = tts_instance
        self._provider = provider
        self._buffer = ""

    async def _run(self, output_emitter) -> None:
        pass

    @property
    def tts(self):
        return self._tts

    @property
    def conn_options(self):
        return self._underlying.conn_options

    def push_text(self, text: str) -> None:
        import re
        self._buffer += text
        sentences = re.split(r'(?<=[.!?\n])\s+', self._buffer)
        if len(sentences) > 1:
            for sentence in sentences[:-1]:
                if sentence.strip():
                    cleaned = clean_ssml(sentence)
                    self._underlying.push_text(cleaned)
            self._buffer = sentences[-1]

    def flush(self) -> None:
        if self._buffer.strip():
            cleaned = clean_ssml(self._buffer)
            self._underlying.push_text(cleaned)
            self._buffer = ""
        self._underlying.flush()

    def end_input(self) -> None:
        if self._buffer.strip():
            cleaned = clean_ssml(self._buffer)
            self._underlying.push_text(cleaned)
            self._buffer = ""
        self._underlying.end_input()

    async def aclose(self, *args, **kwargs) -> None:
        await self._underlying.aclose(*args, **kwargs)

    def __aiter__(self):
        return self._underlying.__aiter__()

    async def __anext__(self):
        return await self._underlying.__anext__()

class ExpressiveTTSWrapper(tts.TTS):
    def __init__(self, underlying_tts, provider="sarvam"):
        self._underlying = underlying_tts
        self._provider = provider
        super().__init__(
            capabilities=underlying_tts.capabilities,
            sample_rate=underlying_tts.sample_rate,
            num_channels=underlying_tts.num_channels,
        )

    @property
    def label(self):
        return self._underlying.label

    @property
    def model(self):
        return self._underlying.model

    @property
    def provider(self):
        return self._underlying.provider

    def synthesize(self, text: str, *args, **kwargs):
        cleaned = clean_ssml(text)
        return self._underlying.synthesize(cleaned, *args, **kwargs)

    def stream(self, *args, **kwargs):
        underlying_stream = self._underlying.stream(*args, **kwargs)
        return ExpressiveTTSStream(self, underlying_stream, self._provider)

def generate_personalized_greeting(name: str, tags: list, last_call: str | None, notes: str | None, language: str, gender: str) -> str:
    """Generate a warm, natural personalized greeting based on customer history"""
    is_hindi = language in ['hinglish', 'hi-IN']
    bot_name = "Anushka" if gender == 'female' else "Vikram"
    
    is_vip = tags and any(t.lower() in ['vip', 'premium', 'high-value'] for t in tags)
    
    if is_hindi:
        greet = f"Namaste {name} ji" if name else "Namaste ji"
        if is_vip:
            greet += f", swagat hai aapka. Main Trinetr se {bot_name} bol {'rahi' if gender=='female' else 'raha'} hoon. Kaise hain aap?"
        else:
            greet += f", main Trinetra se {bot_name} bol {'rahi' if gender=='female' else 'raha'} hoon. Kaise help kar sakti hoon?"
    else:
        greet = f"Hello {name}" if name else "Hello"
        if is_vip:
            greet += f"! Welcome back. This is {bot_name} from Trinetra . How are you doing today?"
        else:
            greet += f"! Thank you for calling. This is {bot_name} from Trinetra . How can I help you today?"
            
    return greet

class VikramAgent(Agent):
    def __init__(self, instructions: str, voice_provider='sarvam', voice_id='shubh', voice_speed=1.0, voice_pitch=1.0, language='en-US'):
        groq_api_key = os.getenv("GROQ_API_KEY", "")
        logger.info(f"[VikramAgent] __init__: GROQ_API_KEY length is {len(groq_api_key)}")
        logger.info(f"Using voice: {voice_id}")
        
        self.language = language
        
        sarvam_male = [
            'shubh', 'aditya', 'rahul', 'rohan', 'amit', 'dev', 'ratan', 'varun', 
            'manan', 'sumit', 'kabir', 'aayan', 'ashutosh', 'advait', 'anand', 
            'tarun', 'sunny', 'mani', 'gokul', 'vijay', 'mohit', 'rehan', 'soham',
            'arvind', 'neel', 'arjun', 'amol'
        ]
        sarvam_female = [
            'ritu', 'priya', 'neha', 'pooja', 'simran', 'kavya', 'ishita', 'shreya', 
            'roopa', 'tanya', 'shruti', 'suhani', 'kavitha', 'rupali', 'amelia', 
            'sophia', 'anushka', 'maya', 'diya', 'meera', 'pavithra', 'aditi'
        ]
        elevenlabs_male = ['pNInz6obpgDQGcFmaJgB', 'TxGEqnHWrfWFTfGW9XjX']
        self.gender = 'male' if voice_id in sarvam_male or voice_id in elevenlabs_male else 'female'

        if voice_provider == 'sarvam':
            # bulbul:v3 validation check: ensure speaker is compatible with bulbul:v3
            bulbul_v3_speakers = sarvam_male + sarvam_female
            if voice_id not in bulbul_v3_speakers:
                voice_id = 'ritu' if self.gender == 'female' else 'shubh'

            # Normalize pitch/speed: dashboard stores 1.0 as "normal" (multiplier),
            # but Sarvam expects delta values where 0.0 = normal.
            # Convert: if value is around 1.0 (multiplier), treat as "normal" (0.0 delta).
            # If value is already in [-0.75, 0.75], use as-is (delta format).
            sarvam_pitch = voice_pitch
            if sarvam_pitch is None:
                sarvam_pitch = 0.0
            elif abs(sarvam_pitch) > 0.75:
                # Value like 1.0 or 1.5 — likely a multiplier, convert to delta
                sarvam_pitch = sarvam_pitch - 1.0
            sarvam_pitch = max(-0.75, min(0.75, sarvam_pitch))

            sarvam_pace = voice_speed
            if sarvam_pace is None:
                sarvam_pace = 1.0
            sarvam_pace = max(0.5, min(2.0, sarvam_pace))

            # Select model: bulbul:v2 for compatible low-latency speakers, bulbul:v3 for others
            bulbul_v2_speakers = ['anushka', 'manisha', 'vidya', 'arya', 'abhilash', 'karun', 'hitesh']
            if voice_id in bulbul_v2_speakers:
                model_name = "bulbul:v2"
            else:
                model_name = "bulbul:v3"

            logger.info(f"[VikramAgent] Sarvam TTS config: model={model_name}, speaker={voice_id}, pace={sarvam_pace}, pitch={sarvam_pitch}, lang={language}")

            target_lang = "hi-IN" if language == 'hinglish' else "en-IN"
            tts_plugin = sarvam.TTS(target_language_code=target_lang, model=model_name, speaker=voice_id, pace=sarvam_pace, pitch=sarvam_pitch)
        else:
            tts_plugin = elevenlabs.TTS(voice_id=voice_id)

        # Wrap TTS to parse SSML tags on speech synthesis
        wrapped_tts = ExpressiveTTSWrapper(tts_plugin, provider=voice_provider)

        stt_lang = "en"
        super().__init__(
            instructions=instructions,
            stt=openai.STT(
                model="whisper-large-v3",
                base_url="https://api.groq.com/openai/v1",
                api_key=groq_api_key,
                language=stt_lang,
            ),
            llm=openai.LLM(
                model=os.getenv("GROQ_LLM_MODEL", "llama-3.1-8b-instant"),
                base_url="https://api.groq.com/openai/v1",
                api_key=groq_api_key,
                temperature=0.7,
                max_completion_tokens=150,
            ),
            tts=wrapped_tts,
            vad=vad_model,
            min_endpointing_delay=0.3,
            max_endpointing_delay=1.0,
            min_consecutive_speech_delay=0.8,
            use_tts_aligned_transcript=True,
        )

    async def on_enter(self):
        if hasattr(self, 'config_task') and self.config_task:
            try:
                await self.config_task
            except Exception as e:
                logger.error(f"Error awaiting config task in on_enter: {e}")

        greeting = getattr(self, 'greeting_message', None)
        if not greeting:
            if getattr(self, 'language', 'hinglish') in ['hinglish', 'hi-IN']:
                if getattr(self, 'gender', 'male') == 'female':
                    greeting = "Namaste ji, main Trinetra AI se Anushka bol rahi hoon. Kya main 30 second ke liye aapka time le sakti hoon?"
                else:
                    greeting = "Namaste ji, main Trinetra AI se Vikram bol raha hoon. Kya main 30 second ke liye aapka time le sakta hoon?"
            else:
                greeting = "Hello, I'm an AI assistant from Trinetra. How can I help you today?"
            
        await self.session.say(
            greeting,
            allow_interruptions=False
        )

async def fetch_knowledge_base(agent_id: str) -> list:
    """Fetch parsed documents for this agent"""
    try:
        data = supabase_admin.table('agent_knowledge') \
            .select('name, content_excerpt') \
            .eq('agent_id', agent_id) \
            .eq('status', 'ready') \
            .execute()
        return data.data or []
    except Exception as e:
        logger.error(f"Failed to fetch KB: {e}")
        return []


async def extract_and_save_lead(transcript: str, agent_id: str, user_id: str, organization_id: str, duration_seconds: int = 0, call_sid: str | None = None, contact_id: str | None = None):
    """Extract lead information and callbacks from call transcript and save to DB"""
    if not transcript or not transcript.strip():
        return
    
    groq_key = os.getenv("GROQ_API_KEY")
    if not groq_key:
        return
    
    current_time_str = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
    
    prompt = f"""Analyze this sales call transcript and extract lead and callback information.
    
Transcript: {transcript[:3000]}

Current time is {current_time_str}.

Return a JSON object with:
- is_lead: true if the caller showed interest, asked about pricing, or wants follow-up. false otherwise.
- contact_name: the caller's name if mentioned
- contact_phone: the caller's phone if mentioned
- contact_email: the caller's email if mentioned
- company: the caller's company if mentioned
- interest_level: "low", "medium", "high", or "hot"
- budget_range: any budget mentioned
- timeline: when they want to buy (immediate, 1_month, 3_months, exploring)
- call_summary: 2-sentence summary of the conversation
- extracted_data: object with any other useful fields (pain_points, product_interest, competitor_mentioned, etc.)
- sentiment: "positive", "neutral", or "negative"
- callback_scheduled: true if the caller indicated they are busy, cannot talk now, or explicitly requested a callback. false otherwise.
- callback_time_iso: a guess of the ISO-8601 datetime for the callback (in UTC), based on any raw text mentioned (like "tomorrow 11am", "shaam ko 5 baje", "Monday morning"). Use the current time provided to resolve relative times. If callback is scheduled but no time is specified, default to tomorrow at 10:00 AM UTC. Format as "YYYY-MM-DDTHH:MM:SSZ". Null if callback_scheduled is false.
- callback_reason: the context or reason for callback (brief note) if callback_scheduled is true.
- callback_name: the prospect's name to use for the callback if callback_scheduled is true.

Only return valid JSON. No other text."""

    async with httpx.AsyncClient(timeout=30.0) as client:
        res = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
            json={
                "model": os.getenv("GROQ_LLM_MODEL", "llama-3.1-8b-instant"),
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 600,
                "response_format": {"type": "json_object"}
            }
        )
        
        if res.status_code != 200:
            return
        
        data = res.json()
        content = data["choices"][0]["message"]["content"]
        
        try:
            lead_data = json.loads(content)
        except json.JSONDecodeError:
            return
        # Import IntegrationExecutor dynamically
        try:
            from app.services.integration_executor import IntegrationExecutor
            executor = IntegrationExecutor()
        except Exception as exec_err:
            logger.error(f"Failed to initialize IntegrationExecutor: {exec_err}")
            executor = None

        # 1. Update/Insert voice_calls with transcript and sentiment
        original_call_id = None
        existing_call = None
        if call_sid:
            try:
                res = await asyncio.to_thread(
                    supabase_admin.table("voice_calls").select("id").eq("metadata->>provider_call_id", call_sid).limit(1).execute
                )
                if res.data:
                    existing_call = res.data[0]
            except Exception as e:
                logger.error(f"Failed to lookup existing call by call_sid {call_sid}: {e}")

        try:
            if existing_call:
                logger.info(f"Updating existing voice_call record {existing_call['id']} with transcript")
                call_res = await asyncio.to_thread(
                    supabase_admin.table("voice_calls").update({
                        "transcript": transcript,
                        "sentiment": lead_data.get("sentiment", "neutral"),
                        "status": "completed",
                        "duration_seconds": duration_seconds
                    }).eq("id", existing_call["id"]).execute
                )
                original_call_id = existing_call["id"]
            else:
                logger.info("Inserting new voice_call record")
                call_res = await asyncio.to_thread(
                    supabase_admin.table("voice_calls").insert({
                        "user_id": user_id,
                        "agent_id": agent_id,
                        "organization_id": organization_id,
                        "transcript": transcript,
                        "sentiment": lead_data.get("sentiment", "neutral"),
                        "status": "completed",
                        "duration_seconds": duration_seconds
                    }).execute
                )
                if call_res.data:
                    original_call_id = call_res.data[0].get("id")
        except Exception as e:
            logger.error(f"Failed to save voice call: {e}")

        # Trigger Call Completed event
        if executor:
            try:
                call_payload = {
                    "agent_id": agent_id,
                    "user_id": user_id,
                    "organization_id": organization_id,
                    "transcript": transcript,
                    "duration_seconds": duration_seconds,
                    "call_summary": lead_data.get("call_summary", ""),
                    "sentiment": lead_data.get("sentiment", "neutral"),
                    "contact_name": lead_data.get("contact_name", "Unknown"),
                    "contact_phone": lead_data.get("contact_phone", ""),
                    "contact_email": lead_data.get("contact_email", "")
                }
                asyncio.create_task(executor.on_call_completed(agent_id, call_payload))
            except Exception as e:
                logger.error(f"Error triggering on_call_completed: {e}")
        
        # 2. Insert into leads
        lead_id = None
        if lead_data.get("is_lead"):
            try:
                interest_level_val = str(lead_data.get("interest_level", "medium")).lower()
                initial_stage = (
                    "hot" if interest_level_val == "hot"
                    else "qualified" if interest_level_val == "high"
                    else "new"
                )

                lead_res = await asyncio.to_thread(
                    supabase_admin.table("leads").insert({
                        "user_id": user_id,
                        "organization_id": organization_id,
                        "agent_id": agent_id,
                        "full_name": lead_data.get("contact_name", "Unknown"),
                        "phone": lead_data.get("contact_phone"),
                        "email": lead_data.get("contact_email"),
                        "company_name": lead_data.get("company"),
                        "interest_level": lead_data.get("interest_level", "medium"),
                        "budget_range": lead_data.get("budget_range"),
                        "timeline": lead_data.get("timeline"),
                        "call_summary": lead_data.get("call_summary"),
                        "extracted_data": lead_data.get("extracted_data", {}),
                        "status": initial_stage,
                        "stage": initial_stage,
                        "source": "voice_call"
                    }).execute
                )
                if lead_res.data:
                    lead_id = lead_res.data[0].get("id")

                # Trigger Lead Captured event
                if executor:
                    try:
                        asyncio.create_task(executor.on_lead_captured(agent_id, {
                            "agent_id": agent_id,
                            "user_id": user_id,
                            "organization_id": organization_id,
                            "contact_name": lead_data.get("contact_name", "Unknown"),
                            "contact_phone": lead_data.get("contact_phone", ""),
                            "contact_email": lead_data.get("contact_email", ""),
                            "company_name": lead_data.get("company", ""),
                            "interest_level": lead_data.get("interest_level", "medium"),
                            "budget_range": lead_data.get("budget_range", ""),
                            "timeline": lead_data.get("timeline", ""),
                            "call_summary": lead_data.get("call_summary", ""),
                            "extracted_data": lead_data.get("extracted_data", {})
                        }))
                    except Exception as e:
                        logger.error(f"Error triggering on_lead_captured: {e}")

            except Exception as e:
                logger.error(f"Failed to save lead: {e}")

        # 3. Handle Callbacks
        if lead_data.get("callback_scheduled"):
            try:
                phone = lead_data.get("contact_phone")
                
                # Fallback to active/recent voice call to grab the caller's phone if missing in transcript
                if not phone and original_call_id:
                    try:
                        call_rec = await asyncio.to_thread(
                            supabase_admin.table("voice_calls").select("caller_number").eq("id", original_call_id).single().execute
                        )
                        if call_rec.data:
                            phone = call_rec.data.get("caller_number")
                    except Exception as e:
                        logger.error(f"Failed to fetch phone from call record: {e}")
                
                if not phone:
                    # Search latest active call for this agent
                    try:
                        recent_call = await asyncio.to_thread(
                            supabase_admin.table("voice_calls")
                            .select("caller_number")
                            .eq("agent_id", agent_id)
                            .order("started_at", desc=True)
                            .limit(1)
                            .execute
                        )
                        if recent_call.data:
                            phone = recent_call.data[0].get("caller_number")
                    except Exception as e:
                        logger.error(f"Failed to lookup active call: {e}")
                
                # If still no phone, default to "Unknown"
                phone = phone or "Unknown"

                # Parse the ISO time
                callback_time = lead_data.get("callback_time_iso")
                if not callback_time:
                    # Default: tomorrow 10 AM UTC
                    from datetime import timedelta
                    callback_time = (datetime.utcnow() + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0).isoformat() + "Z"

                # If lead_id was not just created, try searching for existing lead by phone
                if not lead_id and phone != "Unknown":
                    try:
                        existing_lead = await asyncio.to_thread(
                            supabase_admin.table("leads").select("id").eq("phone", phone).eq("organization_id", organization_id).limit(1).execute
                        )
                        if existing_lead.data:
                            lead_id = existing_lead.data[0].get("id")
                    except Exception as e:
                        logger.error(f"Failed to lookup existing lead: {e}")

                await asyncio.to_thread(
                    supabase_admin.table("callbacks").insert({
                        "organization_id": organization_id,
                        "agent_id": agent_id,
                        "lead_id": lead_id,
                        "original_call_id": original_call_id,
                        "prospect_name": lead_data.get("callback_name") or lead_data.get("contact_name") or "Unknown",
                        "prospect_phone": phone,
                        "scheduled_at": callback_time,
                        "notes": lead_data.get("callback_reason") or "Callback requested by prospect during call.",
                        "status": "scheduled",
                        "priority": "normal"
                    }).execute
                )
                logger.info(f"Callback successfully detected and scheduled for prospect {phone} at {callback_time}")

                # Trigger Callback Scheduled event
                if executor:
                    try:
                        asyncio.create_task(executor.on_callback_scheduled(agent_id, {
                            "agent_id": agent_id,
                            "user_id": user_id,
                            "organization_id": organization_id,
                            "prospect_name": lead_data.get("callback_name") or lead_data.get("contact_name") or "Unknown",
                            "prospect_phone": phone,
                            "scheduled_at": callback_time,
                            "notes": lead_data.get("callback_reason") or "Callback requested by prospect during call."
                        }))
                    except Exception as e:
                        logger.error(f"Error triggering on_callback_scheduled: {e}")

            except Exception as e:
                logger.error(f"Failed to schedule callback: {e}")
        # Resolve contact_id from metadata if not explicitly passed
        if not contact_id and call_sid:
            try:
                call_res = await asyncio.to_thread(
                    supabase_admin.table("voice_calls").select("metadata").eq("metadata->>provider_call_id", call_sid).maybe_single().execute
                )
                if call_res.data and call_res.data.get("metadata"):
                    contact_id = call_res.data["metadata"].get("contact_id")
            except Exception as e:
                logger.error(f"Failed to resolve contact_id from voice_calls metadata in extract_and_save_lead: {e}")

        # 4. Update Campaign Stats and dispositions if outbound campaign call
        if contact_id:
            try:
                contact_res = await asyncio.to_thread(
                    supabase_admin.table("campaign_contacts").select("campaign_id").eq("id", contact_id).single().execute
                )
                if contact_res.data:
                    campaign_id = contact_res.data["campaign_id"]
                    
                    # Update contact status
                    update_fields = {"call_status": "answered"}
                    if lead_id:
                        update_fields["lead_id"] = lead_id
                    
                    await asyncio.to_thread(
                        supabase_admin.table("campaign_contacts").update(update_fields).eq("id", contact_id).execute
                    )
                    logger.info(f"[Campaign Update] Updated campaign_contact {contact_id} call_status=answered, lead_id={lead_id}")
                    
                    # Increment leads count on campaigns table
                    if lead_id and campaign_id:
                        camp_res = await asyncio.to_thread(
                            supabase_admin.table("campaigns").select("leads_generated").eq("id", campaign_id).single().execute
                        )
                        if camp_res.data:
                            current_leads = camp_res.data.get("leads_generated", 0) or 0
                            await asyncio.to_thread(
                                supabase_admin.table("campaigns").update({
                                    "leads_generated": current_leads + 1
                                }).eq("id", campaign_id).execute
                            )
                            logger.info(f"[Campaign Update] Incremented leads_generated for campaign {campaign_id}")
            except Exception as campaign_err:
                logger.error(f"Failed to update campaign/contact statistics: {campaign_err}")

server = AgentServer(num_idle_processes=1)

_active_livekit_rooms = set()

def _cleanup_livekit_rooms():
    logger.info("[PROCESS SHUTDOWN] Disconnecting active LiveKit agent rooms...")
    for r in list(_active_livekit_rooms):
        try:
            if hasattr(r, 'disconnect'):
                asyncio.run(r.disconnect())
        except Exception:
            pass

import atexit
import signal
atexit.register(_cleanup_livekit_rooms)
try:
    signal.signal(signal.SIGTERM, lambda s, f: (_cleanup_livekit_rooms(), os._exit(0)))
except Exception:
    pass

@server.rtc_session()
async def entrypoint(ctx: JobContext):
    logger.info(f"User connected: {ctx.room.name}")
    
    # Guard: Check if an agent participant is already connected to this room
    if ctx.room and hasattr(ctx.room, 'remote_participants'):
        for p in ctx.room.remote_participants.values():
            p_identity = getattr(p, 'identity', '') or ''
            if p_identity.startswith("agent_") or p_identity.startswith("Vikram") or "agent" in p_identity.lower():
                logger.warning(f"[DUPLICATE WORKER GUARD] Room '{ctx.room.name}' already has connected agent participant '{p_identity}'. Skipping duplicate worker join.")
                return

    if ctx.room:
        _active_livekit_rooms.add(ctx.room)
    
    # Default fallback settings
    provider = 'sarvam'
    voice_id = 'shubh'
    language = 'hinglish'
    speed = 1.0
    pitch = 1.0
    system_prompt = load_system_prompt()
    greeting_message = None

    agent_id = ctx.job.metadata if ctx.job else None
    if not agent_id and ctx.room and ctx.room.name.startswith("room-"):
        parts = ctx.room.name.split("-")
        if len(parts) >= 6:
            agent_id = "-".join(parts[1:-1])
            logger.info(f"Parsed agent_id from room name: {agent_id}")

    user_id = None
    organization_id = None
    
    # 1. Fetch Agent settings from Supabase synchronously/concurrently before instantiation
    if agent_id:
        try:
            res = await asyncio.to_thread(
                supabase_admin.table("agents").select("*, user_id, organization_id").eq("id", agent_id).execute
            )
            if res.data:
                agent_data = res.data[0]
                user_id = agent_data.get("user_id")
                organization_id = agent_data.get("organization_id")
                
                if agent_data.get("voice_provider"): provider = agent_data["voice_provider"]
                if agent_data.get("voice_id"): voice_id = agent_data["voice_id"]
                
                # Sanitize voice provider and voice id for legacy/broken configurations
                fake_elevenlabs_ids = ['calm', 'energetic', 'warm', 'professional', 'anika-voice', 'nova-openai', 'shimmer-openai', 'echo-openai', 'onyx-openai', 'fable-openai']
                if provider == 'elevenlabs' and (voice_id in fake_elevenlabs_ids or '-' in voice_id):
                    provider = 'sarvam'
                    voice_id = 'anushka'
                    
                if agent_data.get("primary_language"): language = agent_data["primary_language"]
                if agent_data.get("voice_speed"): speed = agent_data["voice_speed"]
                if agent_data.get("voice_pitch"): pitch = agent_data["voice_pitch"]
                
                if agent_data.get("system_prompt"):
                    system_prompt = agent_data["system_prompt"]
                
                # Parse and append personality config
                personality = agent_data.get("personality", "friendly")
                personality_prompts = {
                    "professional": "\n\n## PERSONALITY STYLE: PROFESSIONAL\n- Speak formally, politely, and professionally.\n- Be concise and business-like.\n- Avoid excessive slang or casual language.\n- Keep your focus on efficiency and clear facts.",
                    "friendly": "\n\n## PERSONALITY STYLE: FRIENDLY\n- Speak in a warm, friendly, and conversational tone.\n- Use natural fillers and expressions (e.g., 'actually', 'hmm', 'dekhiye', 'bilkul').\n- Be enthusiastic and welcoming.",
                    "assertive": "\n\n## PERSONALITY STYLE: ASSERTIVE\n- Speak directly, confidently, and proactively.\n- Be sales-focused, persuasive, and clear about value propositions.\n- Guide the conversation proactively.",
                    "empathetic": "\n\n## PERSONALITY STYLE: EMPATHETIC\n- Speak in a highly caring, patient, and understanding tone.\n- If the caller shares problems, show deep empathy and validate their feelings.\n- Slow down and explain things step-by-step."
                }
                system_prompt += personality_prompts.get(personality.lower(), personality_prompts["friendly"])
                
                # Append expressiveness rules
                expressive_instructions = """
## HUMAN EXPRESSIVENESS RULES

### Pauses (Use ... for short pause, .... for longer pause):
- Before answering complex questions: "Let me check that for you...."
- Before giving important info: "Your appointment is at.... 4 PM today."
- When "thinking": "Dekhiye... actually... hmm..."

### Emphasis (Use **word** for important words):
- "That's an **excellent** question!"
- "I **highly** recommend the annual plan."
- "Your confirmation number is **A3872B** — please save this."

### Tone Variation:
- ((warm)) for empathy: "I completely understand your frustration. Let me fix this right away.((/warm))"
- ((slow)) for important details: "((slow))Your policy number is AB-9823-XYZ. Please note this down.((/slow))"

### Natural Fillers (Hindi/Hinglish):
- Thinking: "Dekhiye...", "Actually...", "Hmm..."
- Agreement: "Bilkul...", "Haan ji...", "Of course..."
- Transition: "To...", "Alright...", "Achha..."

### Emotional Intelligence:
- If customer sounds frustrated: Acknowledge → Empathize → Offer solution
  "I can hear you're frustrated, and I'm sorry about that. Let me make this right."
- If customer sounds happy: Match their energy
  "That's wonderful to hear! I'm so glad."
- If customer is confused: Slow down, simplify
  "Let me explain this step by step. First..."

### Conversation Memory:
- Reference earlier parts of this call: "As we discussed earlier..."
- Reference past calls (if customer recognized): "I see you called last week about..."
"""
                if "## HUMAN EXPRESSIVENESS RULES" not in system_prompt:
                    system_prompt += expressive_instructions

                # Extract default greeting from system_prompt
                default_greeting = None
                lines = system_prompt.split('\n')
                for idx, line in enumerate(lines):
                    if 'greeting' in line.lower() and ':' in line:
                        default_greeting = line.split(':', 1)[1].strip()
                        break
                    if '## default greeting' in line.lower() or '## greeting' in line.lower():
                        for k in range(idx + 1, min(idx + 5, len(lines))):
                            candidate = lines[k].strip()
                            if candidate and not candidate.startswith('#'):
                                default_greeting = candidate
                                break
                        if default_greeting:
                            break

                if default_greeting:
                    default_greeting = default_greeting.strip('\'"')

                # Fetch Caller identity from participants or room name
                caller_number = "Unknown"
                if ctx.room:
                    remote_parts = getattr(ctx.room, 'remote_participants', {})
                    for participant in remote_parts.values():
                        identity = getattr(participant, 'identity', '')
                        if identity and not identity.startswith("agent_") and not identity.startswith("Vikram"):
                            cleaned = re.sub(r'[^\d+]', '', identity)
                            if len(cleaned) >= 10:
                                caller_number = cleaned
                                break
                    if caller_number == "Unknown" and ctx.room.name.startswith("room-"):
                        parts = ctx.room.name.split("-")
                        for part in parts:
                            cleaned = re.sub(r'[^\d+]', '', part)
                            if len(cleaned) >= 10:
                                caller_number = cleaned
                                break

                # Fetch contact_id from voice_calls metadata if twilio room
                contact_id = None
                campaign_contact = None
                if ctx.room and ctx.room.name.startswith("twilio-"):
                    call_sid = ctx.room.name.replace("twilio-", "")
                    try:
                        call_res = await asyncio.to_thread(
                            supabase_admin.table("voice_calls").select("metadata").eq("metadata->>provider_call_id", call_sid).maybe_single().execute
                        )
                        if call_res and hasattr(call_res, 'data') and call_res.data and call_res.data.get("metadata"):
                            contact_id = call_res.data["metadata"].get("contact_id")
                    except Exception as e:
                        logger.error(f"Failed to resolve contact_id from voice_calls metadata in entrypoint: {e}")

                if contact_id:
                    try:
                        c_res = await asyncio.to_thread(
                            supabase_admin.table("campaign_contacts").select("*").eq("id", contact_id).maybe_single().execute
                        )
                        campaign_contact = c_res.data
                    except Exception as e:
                        logger.error(f"Failed to fetch campaign contact {contact_id}: {e}")

                # Lookup Caller
                customer = None
                if not campaign_contact and organization_id and caller_number != "Unknown":
                    try:
                        from app.services.caller_lookup import CallerLookupService
                        lookup_svc = CallerLookupService(supabase_admin)
                        customer = await lookup_svc.lookup_caller(organization_id, caller_number)
                    except Exception as lookup_err:
                        logger.error(f"Failed to lookup caller: {lookup_err}")

                raw_greeting = agent_data.get('greeting_message') or default_greeting

                # Fetch user profile to get company name
                profile_data = {}
                try:
                    prof_res = await asyncio.to_thread(
                        supabase_admin.table("profiles").select("company_name").eq("id", user_id).execute
                    )
                    if prof_res.data:
                        profile_data = prof_res.data[0]
                except Exception as e:
                    logger.error(f"Failed to fetch profile for greeting: {e}")

                sarvam_female = ['ritu', 'priya', 'neha', 'pooja', 'simran', 'kavya', 'ishita', 'shreya', 'roopa', 'tanya', 'shruti', 'suhani', 'kavitha', 'rupali', 'amelia', 'sophia', 'anushka', 'maya', 'diya', 'meera']
                gender_tag = 'female' if voice_id in sarvam_female else 'male'
                bot_name = "Anushka" if gender_tag == 'female' else "Vikram"

                if raw_greeting:
                    # Clean [slug] prefix and suffixes like - Demo / - Trial
                    import re
                    raw_name = agent_data.get('name', 'Agent')
                    clean_name = re.sub(r'^\[[^\]]+\]\s*', '', raw_name)
                    clean_name = re.sub(r'\s*-\s*(Demo|Trial)\s*$', '', clean_name, flags=re.IGNORECASE)
                    
                    greeting_message = raw_greeting.replace('{{agent_name}}', clean_name)
                    greeting_message = greeting_message.replace('{{company_name}}', profile_data.get('company_name') or '')
                    greeting_message = greeting_message.replace('{agentName}', clean_name)
                    greeting_message = greeting_message.replace('{companyName}', profile_data.get('company_name') or '')
                    
                    if campaign_contact:
                        c_name = campaign_contact.get("full_name") or ""
                        is_name_valid = c_name and str(c_name).strip() and str(c_name).lower() != "null"
                        c_name_replaced = c_name if is_name_valid else ""
                        greeting_message = greeting_message.replace('{{customer_name}}', c_name_replaced).replace('{customerName}', c_name_replaced)
                        # Clean up punctuation spacing if name was empty
                        if not is_name_valid:
                            greeting_message = greeting_message.replace("Namaste  ji", "Namaste ji").replace("Hello ,", "Hello,").replace("Hello  ji", "Hello ji")
                    elif customer:
                        cust_name = customer.get("full_name") or ""
                        greeting_message = greeting_message.replace('{{customer_name}}', cust_name)
                        greeting_message = greeting_message.replace('{customerName}', cust_name)
                elif campaign_contact:
                    c_name = campaign_contact.get("full_name") or ""
                    is_name_valid = c_name and str(c_name).strip() and str(c_name).lower() != "null"
                    if is_name_valid:
                        if language in ['hinglish', 'hi-IN']:
                            greeting_message = f"Namaste {c_name} ji, main Trinetra AI se {bot_name} bol {'rahi' if gender_tag=='female' else 'raha'} hoon. Kya main 30 second ke liye aapka time le {'sakti' if gender_tag=='female' else 'sakta'} hoon?"
                        else:
                            greeting_message = f"Hello {c_name}, this is {bot_name} calling from {profile_data.get('company_name') or 'Trinetra'}. I hope you are doing well. Do you have 30 seconds to speak?"
                    else:
                        if language in ['hinglish', 'hi-IN']:
                            greeting_message = f"Namaste ji, main Trinetra AI se {bot_name} bol {'rahi' if gender_tag=='female' else 'raha'} hoon. Kya main 30 second ke liye aapka time le {'sakti' if gender_tag=='female' else 'sakta'} hoon?"
                        else:
                            greeting_message = f"Hello, this is {bot_name} calling from {profile_data.get('company_name') or 'Trinetra'}. I hope you are doing well. Do you have 30 seconds to speak?"
                elif customer:
                    cust_name = customer.get("full_name") or ""
                    cust_tags = customer.get("tags") or []
                    cust_notes = customer.get("notes") or ""
                    cust_last = customer.get("last_contact_at")
                    greeting_message = generate_personalized_greeting(cust_name, cust_tags, cust_last, cust_notes, language, gender_tag)
                else:
                    if language in ['hinglish', 'hi-IN']:
                        greeting_message = "Namaste ji! Trinetra AI mein aapka swagat hai. Main aapka naam jaan sakta hoon?"
                    else:
                        greeting_message = "Hello! Thank you for calling. May I know who I'm speaking with?"

                if campaign_contact:
                    c_name = campaign_contact.get("full_name") or ""
                    is_name_valid = c_name and str(c_name).strip() and str(c_name).lower() != "null"
                    c_company = campaign_contact.get("company_name") or ""
                    is_company_valid = c_company and str(c_company).strip() and str(c_company).lower() != "null"
                    c_notes = campaign_contact.get("notes") or ""
                    is_notes_valid = c_notes and str(c_notes).strip() and str(c_notes).lower() != "null"

                    comp_part = f" from {c_company}" if is_company_valid else ""
                    notes_part = f"\nReason for calling: {c_notes}" if is_notes_valid else ""
                    
                    if is_name_valid:
                        personalized_context = (
                            f"\n\n## PERSONALIZED CALL CONTEXT:\n"
                            f"You are calling {c_name}{comp_part}.\n"
                            f"{notes_part}\n"
                            f"Greet them by name naturally."
                        )
                    else:
                        personalized_context = (
                            f"\n\n## PERSONALIZED CALL CONTEXT:\n"
                            f"You are calling a customer{comp_part}.\n"
                            f"{notes_part}\n"
                            f"Greet them naturally."
                        )
                    system_prompt += personalized_context
                elif customer:
                    cust_name = customer.get("full_name") or ""
                    cust_tags = customer.get("tags") or []
                    cust_notes = customer.get("notes") or ""
                    cust_last = customer.get("last_contact_at")
                    customer_context = f"\n\n## CALLER RECOGNITION DETAILS:\n- Caller Name: {cust_name}\n- Tags: {', '.join(cust_tags)}\n- Last Contact: {cust_last}\n- Past Notes: {cust_notes}\n- IMPORTANT: Greet them by name and reference their past context if appropriate."
                    system_prompt += customer_context

                if agent_data.get("ending_message"):
                    system_prompt += f"\n\nCRITICAL INSTRUCTION FOR ENDING CALL: When the conversation is naturally concluding, you MUST say exactly this phrase to end the call: '{agent_data['ending_message']}'"
                
                # Fetch Knowledge Base
                kb_docs = await fetch_knowledge_base(agent_id)
                if kb_docs:
                    kb_context = "\n\n=== BUSINESS KNOWLEDGE BASE ===\n"
                    for doc in kb_docs:
                        kb_context += f"\n--- {doc.get('name', 'Document')} ---\n{doc.get('content_excerpt', '')}\n"
                    system_prompt += kb_context

                # --- MULTI-PERSONALITY SETUP ---
                # Only activate if 2+ personalities are enabled. Single-personality agents skip entirely.
                personalities_raw = agent_data.get("personalities")
                enabled_count = _count_enabled_personalities(personalities_raw)
                if enabled_count >= 2:
                    try:
                        enabled_personalities = (
                            json.loads(personalities_raw)
                            if isinstance(personalities_raw, str)
                            else (personalities_raw or {})
                        )
                        # Store on agent_data for use in the session hook
                        agent_data["_multi_personality_enabled"] = True
                        agent_data["_enabled_personalities"] = enabled_personalities
                        # Build the suffix that gets appended to every personality prompt
                        # (personality style + expressive rules — already appended above)
                        # We capture everything added after the raw system_prompt base
                        agent_data["_prompt_suffix"] = system_prompt[len(agent_data.get("system_prompt") or load_system_prompt()):]
                        logger.info(
                            f"[MULTI-PERSONALITY] Agent {agent_id} has {enabled_count} personalities enabled: "
                            + str([k for k, v in enabled_personalities.items() if v])
                        )
                    except Exception as mp_err:
                        logger.warning(f"[MULTI-PERSONALITY] Setup failed (non-fatal): {mp_err}")
                        agent_data["_multi_personality_enabled"] = False
                else:
                    agent_data["_multi_personality_enabled"] = False
                # --- END MULTI-PERSONALITY SETUP ---

        except Exception as e:
            logger.error(f"Failed to fetch config for agent: {e}")

    # Map pitch Shift specifically for Sarvam Bulbul relative shift range [-0.75, 0.75]
    sarvam_pitch = pitch
    if provider == 'sarvam':
        sarvam_pitch = pitch - 1.0

    # 2. Create the agent instance with actual settings
    agent_instance = VikramAgent(
        instructions=system_prompt,
        voice_provider=provider,
        voice_id=voice_id,
        voice_speed=speed,
        voice_pitch=sarvam_pitch,
        language=language
    )

    if greeting_message:
        agent_instance.greeting_message = greeting_message

    if agent_data and agent_data.get("status") == "paused":
        logger.warning(f"Agent {agent_id} is paused. Rejecting call.")
        
        async def play_paused_and_disconnect():
            await asyncio.sleep(1) # wait for connection
            await agent_instance.say("This service is temporarily unavailable due to limits. Please try again later.")
            await asyncio.sleep(4)
            await ctx.room.disconnect()
            
        asyncio.create_task(play_paused_and_disconnect())
        
        session = AgentSession(vad=vad_model)
        await session.start(agent=agent_instance, room=ctx.room)
        return

    # Use pre-loaded global VAD model to eliminate disk load latency
    session = AgentSession(vad=vad_model)
    call_start_time = time.time()

    # --- MULTI-PERSONALITY: Register on_user_speech hook ---
    # Only activated if agent has 2+ personalities. Completely skipped for single-personality agents.
    _mp_enabled = agent_data.get("_multi_personality_enabled", False) if agent_data else False
    if _mp_enabled:
        _enabled_personalities = agent_data.get("_enabled_personalities", {})
        _prompt_suffix = agent_data.get("_prompt_suffix", "")
        _agent_data_ref = agent_data

        @session.on("user_speech_committed")
        def _on_user_speech(event):
            """Trigger intent classification on each committed user utterance."""
            try:
                transcript_text = getattr(event, 'transcript', None) or getattr(event, 'text', None) or ""
                if transcript_text and transcript_text.strip():
                    asyncio.create_task(
                        apply_multi_personality_prompt(
                            agent_instance,
                            transcript_text,
                            _enabled_personalities,
                            _prompt_suffix,
                            _agent_data_ref,
                        )
                    )
            except Exception as hook_err:
                logger.warning(f"[MULTI-PERSONALITY] Speech hook error (non-fatal): {hook_err}")
    # --- END MULTI-PERSONALITY HOOK ---

    # --- TRANSCRIBE & GOODBYE HOOKS TO FRONTEND (entrypoint path) ---
    @session.on("user_speech_committed")
    def _on_user_speech_ep(event):
        try:
            txt = getattr(event, 'transcript', None) or getattr(event, 'text', None) or ""
            if txt and txt.strip():
                payload = json.dumps({
                    "type": "transcript",
                    "speaker": "customer",
                    "text": txt
                }).encode("utf-8")
                asyncio.create_task(ctx.room.local_participant.publish_data(payload))
        except Exception as err:
            logger.warning(f"Error publishing user transcript: {err}")

    @session.on("agent_speech_committed")
    def _on_agent_speech_ep(event):
        try:
            txt = getattr(event, 'transcript', None) or getattr(event, 'text', None) or ""
            if txt and txt.strip():
                # Publish real-time transcript to room
                payload = json.dumps({
                    "type": "transcript",
                    "speaker": "agent",
                    "text": txt
                }).encode("utf-8")
                asyncio.create_task(ctx.room.local_participant.publish_data(payload))
                
                # Detect goodbye / call termination
                closing_phrases = ["thank you", "goodbye", "bye", "dhanyavad", "alvida", "phir milenge", "baat karke achha laga"]
                if any(phrase in txt.lower() for phrase in closing_phrases):
                    logger.info("Call ended after closing message")
                    async def disconnect_call():
                        await asyncio.sleep(1.0)
                        if ctx.room:
                            await ctx.room.disconnect()
                    asyncio.create_task(disconnect_call())
        except Exception as err:
            logger.warning(f"Error publishing agent transcript: {err}")

    try:
        # Blocks until session completes (i.e. client disconnects)
        await session.start(agent=agent_instance, room=ctx.room)
    except Exception as e:
        logger.error(f"Error during active session: {e}")
    finally:
        # Await lead extraction and analytics saving BEFORE worker process finishes
        try:
            if agent_id and user_id:
                duration = int(time.time() - call_start_time)
                
                # Always increment minutes/quota if duration > 0, regardless of transcript
                if duration > 0:
                    try:
                        import math
                        from app.services.usage_service import UsageService
                        usage_service = UsageService(supabase_admin)
                        await usage_service.increment_minutes(agent_id, duration)
                        logger.info(f"Incremented usage for agent {agent_id}: {duration}s call -> {math.ceil(duration / 60)} minutes charged.")
                    except Exception as usage_err:
                        logger.error(f"Failed to increment usage minutes: {usage_err}")

                messages = _get_transcript_messages(agent_instance)
                transcript = "\n".join([f"{getattr(m, 'role', '')}: {getattr(m, 'content', '')}" for m in messages if hasattr(m, 'role') and getattr(m, 'role', '') in ("user", "assistant")])
                
                call_sid = None
                contact_id = None
                if ctx.room and ctx.room.name.startswith("twilio-"):
                    call_sid = ctx.room.name.replace("twilio-", "")
                    try:
                        call_res = await asyncio.to_thread(
                            supabase_admin.table("voice_calls").select("metadata").eq("metadata->>provider_call_id", call_sid).maybe_single().execute
                        )
                        if call_res.data and call_res.data.get("metadata"):
                            contact_id = call_res.data["metadata"].get("contact_id")
                    except Exception as e:
                        logger.error(f"Failed to resolve contact_id from voice_calls metadata in entrypoint finally: {e}")

                if transcript:
                    logger.info(f"Awaiting save/extraction of completed call details ({duration}s)...")
                    await extract_and_save_lead(transcript, agent_id, user_id, organization_id, duration, call_sid=call_sid, contact_id=contact_id)
        except Exception as err:
            logger.error("Failed to execute final disconnect log save", exc_info=True)
        finally:
            if ctx.room:
                _active_livekit_rooms.discard(ctx.room)



async def update_usage_and_check_limits(user_id: str, duration_seconds: int, agent_id: str):
    import math
    minutes_used = math.ceil(duration_seconds / 60)
    if minutes_used <= 0:
        return
        
    try:
        # Fetch current profile
        prof_res = await asyncio.to_thread(
            supabase_admin.table("profiles").select("*").eq("id", user_id).execute
        )
        if not prof_res.data: return
        profile = prof_res.data[0]
        
        plan_tier = profile.get("plan_tier", "free")
        is_free = plan_tier in ("free", "free_demo")
        
        limit = profile.get("demo_minutes_limit", 10) if is_free else profile.get("paid_minutes_limit", 100)
        current_used = profile.get("demo_minutes_used", 0) if is_free else profile.get("paid_minutes_used", 0)
        
        new_used = current_used + minutes_used
        
        # Update profile
        update_data = {}
        if is_free:
            update_data["demo_minutes_used"] = new_used
        else:
            update_data["paid_minutes_used"] = new_used
            
        await asyncio.to_thread(
            supabase_admin.table("profiles").update(update_data).eq("id", user_id).execute
        )
        
        # Update agent-specific minutes_used
        try:
            agent_res = await asyncio.to_thread(
                supabase_admin.table("agents").select("minutes_used").eq("id", agent_id).execute
            )
            if agent_res.data:
                current_agent_minutes = agent_res.data[0].get("minutes_used") or 0
                await asyncio.to_thread(
                    supabase_admin.table("agents").update({
                        "minutes_used": current_agent_minutes + minutes_used
                    }).eq("id", agent_id).execute
                )
        except Exception as ae:
            logger.error(f"Failed to update agent minutes_used: {ae}")
        
        # Check percentage
        percentage = (new_used / limit) * 100 if limit > 0 else 0
        
        telegram_chat_id = profile.get("telegram_chat_id")
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        
        async def send_tg(msg):
            if not telegram_chat_id or not bot_token: return
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"https://api.telegram.org/bot{bot_token}/sendMessage",
                    json={"chat_id": telegram_chat_id, "text": msg}
                )

        if percentage >= 100 and (limit == 0 or (current_used / limit) * 100 < 100):
            # Reached 100% just now
            await asyncio.to_thread(
                supabase_admin.table("agents").update({"status": "paused"}).eq("user_id", user_id).execute
            )
            await send_tg(f"?? Monthly limit reached ({new_used}/{limit} mins). Your agents are paused. Upgrade to continue.")
        elif percentage >= 80 and (limit == 0 or (current_used / limit) * 100 < 80):
            # Reached 80% just now
            await send_tg(f"?? You've used {int(percentage)}% of your monthly minutes ({new_used}/{limit} mins). Consider upgrading soon.")
            
    except Exception as e:
        logger.error(f"Failed to update usage limits: {e}")

def generate_agent_token(room_name: str) -> str:
    import uuid
    from datetime import datetime

    api_key = (os.getenv("LIVEKIT_API_KEY") or "devkey").strip()
    api_secret = (os.getenv("LIVEKIT_API_SECRET") or "secretsecretsecretsecretsecret12").strip()

    now = int(datetime.utcnow().timestamp())
    identity = f"agent_vikram_{uuid.uuid4().hex[:4]}"

    payload = {
        "exp": now + 86400,
        "iss": api_key,
        "nbf": now - 5,
        "sub": identity,
        "name": "Vikram Sharma (AI Agent)",
        "video": {
            "room": room_name,
            "roomJoin": True,
            "canPublish": True,
            "canSubscribe": True,
            "canPublishData": True
        }
    }
    token = jwt.encode(payload, api_secret, algorithm="HS256")
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    return token


async def run_agent(room_name: str, agent_id: str | None = None, contact_id: str | None = None):
    # Fallback/Direct background worker runner used by voice_router.py
    from livekit import rtc
    livekit_url = os.getenv("LIVEKIT_URL", "ws://127.0.0.1:7880").strip()

    provider = 'sarvam'
    voice_id = 'shubh'
    language = 'hinglish'
    speed = 1.0
    pitch = 1.0
    system_prompt = load_system_prompt()
    greeting_message = None

    if not agent_id and room_name.startswith("room-"):
        parts = room_name.split("-")
        if len(parts) >= 6:
            agent_id = "-".join(parts[1:-1])

    user_id = None
    organization_id = None
    agent_data = None

    if agent_id:
        try:
            res = supabase_admin.table("agents").select("*, user_id, organization_id").eq("id", agent_id).execute()
            if res.data:
                agent_data = res.data[0]
                user_id = agent_data.get("user_id")
                organization_id = agent_data.get("organization_id")
                if agent_data.get("voice_provider"): provider = agent_data["voice_provider"]
                if agent_data.get("voice_id"): voice_id = agent_data["voice_id"]
                
                # Sanitize voice provider and voice id for legacy/broken configurations
                fake_elevenlabs_ids = ['calm', 'energetic', 'warm', 'professional', 'anika-voice', 'nova-openai', 'shimmer-openai', 'echo-openai', 'onyx-openai', 'fable-openai']
                if provider == 'elevenlabs' and (voice_id in fake_elevenlabs_ids or '-' in voice_id):
                    provider = 'sarvam'
                    voice_id = 'anushka'
                    
                if agent_data.get("primary_language"): language = agent_data["primary_language"]
                if agent_data.get("voice_speed"): speed = agent_data["voice_speed"]
                if agent_data.get("voice_pitch"): pitch = agent_data["voice_pitch"]
                if agent_data.get("system_prompt"): system_prompt = agent_data["system_prompt"]
                
                # Parse and append personality config
                personality = agent_data.get("personality", "friendly")
                personality_prompts = {
                    "professional": "\n\n## PERSONALITY STYLE: PROFESSIONAL\n- Speak formally, politely, and professionally.\n- Be concise and business-like.\n- Avoid excessive slang or casual language.\n- Keep your focus on efficiency and clear facts.",
                    "friendly": "\n\n## PERSONALITY STYLE: FRIENDLY\n- Speak in a warm, friendly, and conversational tone.\n- Use natural fillers and expressions (e.g., 'actually', 'hmm', 'dekhiye', 'bilkul').\n- Be enthusiastic and welcoming.",
                    "assertive": "\n\n## PERSONALITY STYLE: ASSERTIVE\n- Speak directly, confidently, and proactively.\n- Be sales-focused, persuasive, and clear about value propositions.\n- Guide the conversation proactively.",
                    "empathetic": "\n\n## PERSONALITY STYLE: EMPATHETIC\n- Speak in a highly caring, patient, and understanding tone.\n- If the caller shares problems, show deep empathy and validate their feelings.\n- Slow down and explain things step-by-step."
                }
                system_prompt += personality_prompts.get(personality.lower(), personality_prompts["friendly"])
                
                # Append expressiveness rules
                expressive_instructions = """
## HUMAN EXPRESSIVENESS RULES

### Pauses (Use ... for short pause, .... for longer pause):
- Before answering complex questions: "Let me check that for you...."
- Before giving important info: "Your appointment is at.... 4 PM today."
- When "thinking": "Dekhiye... actually... hmm..."

### Emphasis (Use **word** for important words):
- "That's an **excellent** question!"
- "I **highly** recommend the annual plan."
- "Your confirmation number is **A3872B** — please save this."

### Tone Variation:
- ((warm)) for empathy: "I completely understand your frustration. Let me fix this right away.((/warm))"
- ((slow)) for important details: "((slow))Your policy number is AB-9823-XYZ. Please note this down.((/slow))"

### Natural Fillers (Hindi/Hinglish):
- Thinking: "Dekhiye...", "Actually...", "Hmm..."
- Agreement: "Bilkul...", "Haan ji...", "Of course..."
- Transition: "To...", "Alright...", "Achha..."

### Emotional Intelligence:
- If customer sounds frustrated: Acknowledge → Empathize → Offer solution
  "I can hear you're frustrated, and I'm sorry about that. Let me make this right."
- If customer sounds happy: Match their energy
  "That's wonderful to hear! I'm so glad."
- If customer is confused: Slow down, simplify
  "Let me explain this step by step. First..."

### Conversation Memory:
- Reference earlier parts of this call: "As we discussed earlier..."
- Reference past calls (if customer recognized): "I see you called last week about..."
"""
                system_prompt += expressive_instructions

                # Use custom greeting if set, otherwise template default
                default_greeting = None
                lines = system_prompt.split('\n')
                for idx, line in enumerate(lines):
                    if 'greeting' in line.lower() and ':' in line:
                        default_greeting = line.split(':', 1)[1].strip()
                        break
                    if '## default greeting' in line.lower() or '## greeting' in line.lower():
                        for k in range(idx + 1, min(idx + 5, len(lines))):
                            candidate = lines[k].strip()
                            if candidate and not candidate.startswith('#'):
                                default_greeting = candidate
                                break
                        if default_greeting:
                            break

                if default_greeting:
                    default_greeting = default_greeting.strip('\'"')

                # Fetch Caller identity from room_name
                caller_number = "Unknown"
                if room_name and room_name.startswith("room-"):
                    parts = room_name.split("-")
                    for part in parts:
                        cleaned = re.sub(r'[^\d+]', '', part)
                        if len(cleaned) >= 10:
                            caller_number = cleaned
                            break

                # Fetch contact_id from voice_calls metadata if twilio / sip room
                campaign_contact = None
                if not contact_id and room_name and ("twilio-" in room_name or "sip-" in room_name):
                    call_sid = room_name.split("_")[0].replace("twilio-", "").replace("sip-", "")
                    try:
                        call_res = supabase_admin.table("voice_calls").select("metadata").eq("metadata->>provider_call_id", call_sid).maybe_single().execute()
                        if call_res.data and call_res.data.get("metadata"):
                            contact_id = call_res.data["metadata"].get("contact_id")
                    except Exception as e:
                        logger.error(f"Failed to resolve contact_id from voice_calls metadata in run_agent: {e}")

                if contact_id:
                    try:
                        c_res = supabase_admin.table("campaign_contacts").select("*").eq("id", contact_id).maybe_single().execute()
                        campaign_contact = c_res.data
                    except Exception as e:
                        logger.error(f"Failed to fetch campaign contact {contact_id} in run_agent: {e}")

                # Lookup Caller
                customer = None
                if not campaign_contact and organization_id and caller_number != "Unknown":
                    try:
                        from app.services.caller_lookup import CallerLookupService
                        lookup_svc = CallerLookupService(supabase_admin)
                        customer = await lookup_svc.lookup_caller(organization_id, caller_number)
                    except Exception as lookup_err:
                        logger.error(f"Failed to lookup caller: {lookup_err}")

                raw_greeting = agent_data.get('greeting_message') or default_greeting

                # Fetch user profile to get company name
                profile_data = {}
                try:
                    prof_res = supabase_admin.table("profiles").select("company_name").eq("id", user_id).execute()
                    if prof_res.data:
                        profile_data = prof_res.data[0]
                except Exception as e:
                    logger.error(f"Failed to fetch profile for greeting in run_agent: {e}")

                sarvam_female = [
                    'ritu', 'priya', 'neha', 'pooja', 'simran', 'kavya', 'ishita', 'shreya', 
                    'roopa', 'tanya', 'shruti', 'suhani', 'kavitha', 'rupali', 'amelia', 
                    'sophia', 'anushka', 'maya', 'diya', 'meera', 'pavithra', 'aditi'
                ]
                gender_tag = 'female' if voice_id in sarvam_female else 'male'
                bot_name = "Anushka" if gender_tag == 'female' else "Vikram"

                if raw_greeting:
                    # Clean [slug] prefix and suffixes like - Demo / - Trial
                    raw_name = agent_data.get('name', 'Agent')
                    clean_name = re.sub(r'^\[[^\]]+\]\s*', '', raw_name)
                    clean_name = re.sub(r'\s*-\s*(Demo|Trial)\s*$', '', clean_name, flags=re.IGNORECASE)
                    
                    greeting_message = raw_greeting.replace('{{agent_name}}', clean_name)
                    greeting_message = greeting_message.replace('{{company_name}}', profile_data.get('company_name') or '')
                    greeting_message = greeting_message.replace('{agentName}', clean_name)
                    greeting_message = greeting_message.replace('{companyName}', profile_data.get('company_name') or '')
                    
                    if campaign_contact:
                        c_name = campaign_contact.get("full_name") or ""
                        is_name_valid = c_name and str(c_name).strip() and str(c_name).lower() != "null"
                        c_name_replaced = c_name if is_name_valid else ""
                        greeting_message = greeting_message.replace('{{customer_name}}', c_name_replaced).replace('{customerName}', c_name_replaced)
                        # Clean up punctuation spacing if name was empty
                        if not is_name_valid:
                            greeting_message = greeting_message.replace("Namaste  ji", "Namaste ji").replace("Hello ,", "Hello,").replace("Hello  ji", "Hello ji")
                    elif customer:
                        cust_name = customer.get("full_name") or ""
                        greeting_message = greeting_message.replace('{{customer_name}}', cust_name)
                        greeting_message = greeting_message.replace('{customerName}', cust_name)
                elif campaign_contact:
                    c_name = campaign_contact.get("full_name") or ""
                    is_name_valid = c_name and str(c_name).strip() and str(c_name).lower() != "null"
                    if is_name_valid:
                        if language in ['hinglish', 'hi-IN']:
                            greeting_message = f"Namaste {c_name} ji, main Trinetra AI se {bot_name} bol {'rahi' if gender_tag=='female' else 'raha'} hoon. Kya main 30 second ke liye aapka time le {'sakti' if gender_tag=='female' else 'sakta'} hoon?"
                        else:
                            greeting_message = f"Hello {c_name}, this is {bot_name} calling from {profile_data.get('company_name') or 'Trinetra'}. I hope you are doing well. Do you have 30 seconds to speak?"
                    else:
                        if language in ['hinglish', 'hi-IN']:
                            greeting_message = f"Namaste ji, main Trinetra AI se {bot_name} bol {'rahi' if gender_tag=='female' else 'raha'} hoon. Kya main 30 second ke liye aapka time le {'sakti' if gender_tag=='female' else 'sakta'} hoon?"
                        else:
                            greeting_message = f"Hello, this is {bot_name} calling from {profile_data.get('company_name') or 'Trinetra'}. I hope you are doing well. Do you have 30 seconds to speak?"
                elif customer:
                    cust_name = customer.get("full_name") or ""
                    cust_tags = customer.get("tags") or []
                    cust_notes = customer.get("notes") or ""
                    cust_last = customer.get("last_contact_at")
                    greeting_message = generate_personalized_greeting(cust_name, cust_tags, cust_last, cust_notes, language, gender_tag)
                else:
                    if language in ['hinglish', 'hi-IN']:
                        greeting_message = "Namaste ji! Trinetra AI mein aapka swagat hai. Main aapka naam jaan sakta hoon?"
                    else:
                        greeting_message = "Hello! Thank you for calling. May I know who I'm speaking with?"

                if campaign_contact:
                    c_name = campaign_contact.get("full_name") or ""
                    is_name_valid = c_name and str(c_name).strip() and str(c_name).lower() != "null"
                    c_company = campaign_contact.get("company_name") or ""
                    is_company_valid = c_company and str(c_company).strip() and str(c_company).lower() != "null"
                    c_notes = campaign_contact.get("notes") or ""
                    is_notes_valid = c_notes and str(c_notes).strip() and str(c_notes).lower() != "null"

                    comp_part = f" from {c_company}" if is_company_valid else ""
                    notes_part = f"\nReason for calling: {c_notes}" if is_notes_valid else ""
                    
                    if is_name_valid:
                        personalized_context = (
                            f"\n\n## PERSONALIZED CALL CONTEXT:\n"
                            f"You are calling {c_name}{comp_part}.\n"
                            f"{notes_part}\n"
                            f"Greet them by name naturally."
                        )
                    else:
                        personalized_context = (
                            f"\n\n## PERSONALIZED CALL CONTEXT:\n"
                            f"You are calling a customer{comp_part}.\n"
                            f"{notes_part}\n"
                            f"Greet them naturally."
                        )
                    system_prompt += personalized_context
                elif customer:
                    cust_name = customer.get("full_name") or ""
                    cust_tags = customer.get("tags") or []
                    cust_notes = customer.get("notes") or ""
                    cust_last = customer.get("last_contact_at")
                    customer_context = f"\n\n## CALLER RECOGNITION DETAILS:\n- Caller Name: {cust_name}\n- Tags: {', '.join(cust_tags)}\n- Last Contact: {cust_last}\n- Past Notes: {cust_notes}\n- IMPORTANT: Greet them by name and reference their past context if appropriate."
                    system_prompt += customer_context

                if agent_data.get("ending_message"):
                    system_prompt += f"\n\nCRITICAL INSTRUCTION FOR ENDING CALL: When the conversation is naturally concluding, you MUST say exactly this phrase to end the call: '{agent_data['ending_message']}'"
                
                if not agent_data.get("voice_provider"):
                    prof_res = supabase_admin.table("profiles").select("country").eq("id", user_id).execute()
                    if prof_res.data:
                        country = prof_res.data[0].get("country", "")
                        if country == "IN":
                            provider = "sarvam"
                            voice_id = "shubh"
                            language = "hinglish"
                        elif country == "UK":
                            provider = "elevenlabs"
                            voice_id = "ErXwobaYiN019PkySvjV"
                            language = "en-GB"
                        else:
                            provider = "elevenlabs"
                            voice_id = "21m00Tcm4TlvDq8ikWAM"
                            language = "en-US"
                # --- MULTI-PERSONALITY SETUP (run_agent path) ---
                personalities_raw = agent_data.get("personalities")
                enabled_count = _count_enabled_personalities(personalities_raw)
                if enabled_count >= 2:
                    try:
                        _ep = (
                            json.loads(personalities_raw)
                            if isinstance(personalities_raw, str)
                            else (personalities_raw or {})
                        )
                        agent_data["_multi_personality_enabled"] = True
                        agent_data["_enabled_personalities"] = _ep
                        agent_data["_prompt_suffix"] = system_prompt[len(agent_data.get("system_prompt") or load_system_prompt()):]
                        logger.info(
                            f"[MULTI-PERSONALITY] run_agent: {enabled_count} personalities enabled"
                        )
                    except Exception as mp_err:
                        logger.warning(f"[MULTI-PERSONALITY] run_agent setup failed: {mp_err}")
                        agent_data["_multi_personality_enabled"] = False
                else:
                    agent_data["_multi_personality_enabled"] = False
                # --- END MULTI-PERSONALITY SETUP ---

        except Exception as e:
            logger.error(f"Failed to fetch agent configs in background run_agent: {e}")

    if agent_id:
        kb_docs = await fetch_knowledge_base(agent_id)
        if kb_docs:
            kb_context = "\n\n=== BUSINESS KNOWLEDGE BASE ===\n"
            for doc in kb_docs:
                kb_context += f"\n--- {doc.get('name', 'Document')} ---\n{doc.get('content_excerpt', '')}\n"
            system_prompt += kb_context

    logger.info(f"[In-Process Agent] Connecting to room {room_name} at {livekit_url} (provider: {provider}, voice: {voice_id})")

    room = rtc.Room()
    token = generate_agent_token(room_name)

    agent_instance = None
    from livekit.agents import utils
    async with utils.http_context.open():
        agent_instance = VikramAgent(
            instructions=system_prompt,
            voice_provider=provider,
            voice_id=voice_id,
            voice_speed=speed,
            voice_pitch=pitch,
            language=language
        )

        if greeting_message:
            async def custom_on_enter():
                await agent_instance.session.say(greeting_message, allow_interruptions=False)
            agent_instance.on_enter = custom_on_enter

        session = AgentSession(vad=vad_model)
        done = asyncio.Event()

        @room.on("disconnected")
        def on_disconnected(reason):
            logger.info(f"[In-Process Agent] Room disconnected: {reason}")
            done.set()

        call_start_time = time.time()

        # --- MULTI-PERSONALITY: Register on_user_speech hook (run_agent path) ---
        _mp_enabled_ra = agent_data.get("_multi_personality_enabled", False) if agent_data else False
        if _mp_enabled_ra:
            _ep_ra = agent_data.get("_enabled_personalities", {})
            _suffix_ra = agent_data.get("_prompt_suffix", "")
            _data_ra = agent_data

            @session.on("user_speech_committed")
            def _on_user_speech_ra(event):
                try:
                    txt = getattr(event, 'transcript', None) or getattr(event, 'text', None) or ""
                    if txt and txt.strip():
                        asyncio.create_task(
                            apply_multi_personality_prompt(
                                agent_instance, txt, _ep_ra, _suffix_ra, _data_ra
                            )
                        )
                except Exception as _err:
                    logger.warning(f"[MULTI-PERSONALITY] run_agent hook error: {_err}")
        # --- END MULTI-PERSONALITY HOOK ---
        
        # --- TRANSCRIBE HOOKS TO FRONTEND ---
        @session.on("user_speech_committed")
        def _on_user_speech(event):
            try:
                txt = getattr(event, 'transcript', None) or getattr(event, 'text', None) or ""
                if txt and txt.strip():
                    payload = json.dumps({
                        "type": "transcript",
                        "speaker": "customer",
                        "text": txt
                    }).encode("utf-8")
                    asyncio.create_task(room.local_participant.publish_data(payload))
            except Exception as err:
                logger.warning(f"Error publishing user transcript: {err}")

        @session.on("agent_speech_committed")
        def _on_agent_speech(event):
            try:
                txt = getattr(event, 'transcript', None) or getattr(event, 'text', None) or ""
                if txt and txt.strip():
                    payload = json.dumps({
                        "type": "transcript",
                        "speaker": "agent",
                        "text": txt
                    }).encode("utf-8")
                    asyncio.create_task(room.local_participant.publish_data(payload))
                    
                    # Detect goodbye / call termination
                    closing_phrases = ["thank you", "goodbye", "bye", "dhanyavad", "alvida", "phir milenge", "baat karke achha laga"]
                    if any(phrase in txt.lower() for phrase in closing_phrases):
                        logger.info("Call ended after closing message")
                        async def disconnect_call():
                            await asyncio.sleep(1.0)
                            if room:
                                await room.disconnect()
                        asyncio.create_task(disconnect_call())
            except Exception as err:
                logger.warning(f"Error publishing agent transcript: {err}")

        try:
            await room.connect(livekit_url, token)
            _active_livekit_rooms.add(room)
            
            # Guard: Check if an agent participant is already connected
            if room.remote_participants:
                for p in room.remote_participants.values():
                    p_identity = getattr(p, 'identity', '') or ''
                    if p_identity.startswith("agent_") or p_identity.startswith("Vikram") or "agent" in p_identity.lower():
                        logger.warning(f"[DUPLICATE WORKER GUARD] Room '{room_name}' already has connected agent participant '{p_identity}'. Disconnecting duplicate in-process agent.")
                        await room.disconnect()
                        return

            await session.start(agent=agent_instance, room=room)
            await done.wait()
        except Exception as e:
            logger.error(f"[In-Process Agent] Error: {e}")
        finally:
            # Await lead extraction and analytics saving BEFORE room disconnects/exits
            try:
                if agent_id and user_id:
                    duration = int(time.time() - call_start_time)
                    
                    # Always increment minutes/quota if duration > 0, regardless of transcript
                    if duration > 0:
                        try:
                            import math
                            from app.services.usage_service import UsageService
                            usage_service = UsageService(supabase_admin)
                            await usage_service.increment_minutes(agent_id, duration)
                            logger.info(f"[In-Process Agent] Incremented usage for agent {agent_id}: {duration}s call -> {math.ceil(duration / 60)} minutes charged.")
                        except Exception as usage_err:
                            logger.error(f"Failed to increment usage minutes: {usage_err}")

                    messages = _get_transcript_messages(agent_instance)
                    transcript = "\n".join([f"{getattr(m, 'role', '')}: {getattr(m, 'content', '')}" for m in messages if hasattr(m, 'role') and getattr(m, 'role', '') in ("user", "assistant")])
                    
                    call_sid = None
                    if room_name and ("twilio-" in room_name or "sip-" in room_name):
                        call_sid = room_name.split("_")[0].replace("twilio-", "").replace("sip-", "")

                    if transcript:
                        logger.info(f"[In-Process Agent] Awaiting final call save ({duration}s)...")
                        await extract_and_save_lead(transcript, agent_id, user_id, organization_id, duration, call_sid=call_sid, contact_id=contact_id)
            except Exception as e:
                logger.error("[In-Process Agent] Error saving stats", exc_info=True)

            try:
                _active_livekit_rooms.discard(room)
                await room.disconnect()
            except Exception:
                pass

if __name__ == "__main__":
    cli.run_app(server)