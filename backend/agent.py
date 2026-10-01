import os
import sys
import io
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass
import re
from datetime import datetime
import httpx
import json
import time
import logging
import asyncio
from typing import AsyncIterable, AsyncGenerator, Any, Tuple
import jwt
from dotenv import load_dotenv
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, JobExecutorType, cli, tts, llm
from livekit.agents.voice import Agent, AgentSession
from livekit.agents.voice.agent import ModelSettings
from database import supabase_admin
from app.services.ai.prompt_guard import enforce_prompt_ai_guard
from app.services.disclosure_service import (
    build_compliant_greeting,
    persist_call_disclosure,
    handle_caller_recording_decline,
    select_disclosure_variant,
    normalize_language_code,
    resolve_jurisdiction_consent_mode,
)

load_dotenv()

# Warm-import standard OpenAI SDK resources using importlib so it never shadows livekit.plugins.openai
try:
    import importlib
    importlib.import_module("openai.resources")
    importlib.import_module("openai.resources.chat")
    importlib.import_module("openai.resources.beta")
except Exception:
    pass

# Import livekit plugins ensuring `openai` refers to livekit.plugins.openai (with .LLM and .STT)
from livekit.plugins import sarvam, silero, openai, elevenlabs, google

def _start_health_server():
    """Lightweight HTTP server on $PORT for Render health checks and UptimeRobot keep-alive."""
    port_str = os.getenv("PORT")
    if not port_str:
        return
    try:
        import threading
        from http.server import HTTPServer, BaseHTTPRequestHandler

        class HealthHandler(BaseHTTPRequestHandler):
            def do_HEAD(self):
                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.end_headers()

            def do_GET(self):
                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"status":"healthy","service":"trinetra-livekit-agent"}')

            def log_message(self, format, *args):
                return

        port = int(port_str)
        server = HTTPServer(("0.0.0.0", port), HealthHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        print(f"[Render Health] LiveKit worker HTTP keep-alive server active on port {port}", flush=True)
    except Exception as e:
        print(f"[Render Health] Could not start HTTP keep-alive server: {e}", flush=True)


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("voice-agent")
logger.setLevel(logging.INFO)

_vad_model = None

def get_vad_model():
    """Lazy-load Silero VAD model on first use with noise-resistant activation threshold to filter background chatter."""
    global _vad_model
    if _vad_model is None:
        logger.info("Loading Silero VAD model on-demand...")
        _vad_model = silero.VAD.load(
            min_speech_duration=0.25,
            min_silence_duration=0.55,
            activation_threshold=0.6,
        )
        logger.info("Silero VAD model loaded successfully with noise-resistant activation threshold (0.6)!")
    return _vad_model
PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "prompts")


def load_system_prompt() -> str:
    """Load the Vikram Sharma professional sales agent prompt with AI truthfulness enforcement."""
    try:
        prompt_path = os.path.join(PROMPTS_DIR, "vikram_sharma.txt")
        with open(prompt_path, "r", encoding="utf-8") as f:
            return enforce_prompt_ai_guard(f.read())
    except:
        logger.warning("Could not load vikram_sharma.txt, using fallback prompt")
        fallback = """You are a professional AI sales agent.
        Speak warm, confident Hinglish. Be persuasive but never pushy.
        Handle objections professionally. Always try to convert the prospect.
        Keep responses under 2 sentences. Match the prospect's language.
        Always be transparent that you are an AI assistant if asked. Never claim to be human."""
        return enforce_prompt_ai_guard(fallback)


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

def clean_ssml(text: str, is_transcript: bool = False) -> str:
    if not text:
        return ""
    # Strip any internal system prompts, flow notes, objection handling, or conversation guidance brackets
    text = re.sub(r'\[(?:CRITICAL|FLOW NOTE|OBJECTION|CONVERSATION GUIDANCE)[^\]]*\]', '', text, flags=re.IGNORECASE)
    # Convert direction/audio emotion tags into natural spoken vocalizations for telephony TTS
    text = re.sub(r'\[(?:laughs?|chuckles?|giggles?)\]|\((?:laughs?|chuckles?|giggles?)\)|\*(?:laughs?|chuckles?|giggles?)\*', 'Haha, ', text, flags=re.IGNORECASE)
    text = re.sub(r'\[(?:sighs?|sighing)\]|\((?:sighs?|sighing)\)|\*(?:sighs?|sighing)\*', 'Ah... ', text, flags=re.IGNORECASE)
    text = re.sub(r'\[(?:gasps?|gasping)\]|\((?:gasps?|gasping)\)|\*(?:gasps?|gasping)\*', 'Oh! ', text, flags=re.IGNORECASE)
    # Remove markdown bold/italics
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = text.replace('**', '')
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    # Remove any double parenthesis tags like ((warm)), ((/warm)), ((pause)), ((slow))
    text = re.sub(r'\(\([^)]*\)\)', '', text)
    # Remove single parentheses with common tone tags like (pause), (warm)
    text = re.sub(r'\((?:warm|slow|pause|breath|whisper|emph)\)', '', text, flags=re.IGNORECASE)
    # Remove double brackets like [[...]]
    text = re.sub(r'\[\[[^\]]*\]\]', '', text)
    # Remove remaining square brackets that enclose non-spoken action tags [like this]
    text = re.sub(r'\[(?:pause|clears throat|cough|whisper|emph)\]', '', text, flags=re.IGNORECASE)
    # Ensure natural laughter markers "Haha" or "Hehe" have a trailing comma for neural pause/intonation
    text = re.sub(r'\b(Haha|Hehe)\b(?!\s*[,!])', r'\1,', text, flags=re.IGNORECASE)
    # Remove XML / SSML tags like <break>, <emphasis>
    text = re.sub(r'<[^>]+>', '', text)
    # Remove emojis
    text = re.sub(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF]', '', text)
    # Remove text emoticons
    text = text.replace(':)', '').replace(':(', '').replace(':D', '')
    # Normalize non-breaking hyphens, em-dashes and en-dashes into natural pause commas or spaces
    text = text.replace('\u2011', ' ').replace('—', ', ').replace('–', ', ')
    text = text.replace('\u00a0', ' ')
    # Clean up double punctuation and spacing before punctuation
    text = re.sub(r'[,;]\s*[,;]', ',', text)
    # Normalize 24/7 so Indian TTS speaks naturally instead of "chaubis by saat"
    text = re.sub(r'\b24/7\b', 'twenty-four seven', text)
    text = re.sub(r'24/7', 'twenty-four seven', text)
    # Eliminate accidental double AI acronyms (e.g. "Trinetra AI AI voice agents" -> "Trinetra AI voice agents")
    text = re.sub(r'\b(Trinetra\s+AI)\s+AI\b', r'\1', text, flags=re.IGNORECASE)
    text = re.sub(r'\bAI\s+AI\b', 'AI', text, flags=re.IGNORECASE)
    # Clean whitespace and strip stray enclosing quotes
    text = re.sub(r'\s+', ' ', text).strip()
    text = text.strip('"\'`“”‘’').strip()
    return text

DIGIT_WORDS = {
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
    '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine'
}

DEVA_DIGITS_MAP = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
}

ENGLISH_CARDINAL_WORDS = {
    0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five',
    6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten',
    11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen',
    16: 'sixteen', 17: 'seventeen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty',
    21: 'twenty-one', 22: 'twenty-two', 23: 'twenty-three', 24: 'twenty-four', 25: 'twenty-five',
    26: 'twenty-six', 27: 'twenty-seven', 28: 'twenty-eight', 29: 'twenty-nine', 30: 'thirty',
    31: 'thirty-one', 32: 'thirty-two', 33: 'thirty-three', 34: 'thirty-four', 35: 'thirty-five',
    36: 'thirty-six', 37: 'thirty-seven', 38: 'thirty-eight', 39: 'thirty-nine', 40: 'forty',
    41: 'forty-one', 42: 'forty-two', 43: 'forty-three', 44: 'forty-four', 45: 'forty-five',
    46: 'forty-six', 47: 'forty-seven', 48: 'forty-eight', 49: 'forty-nine', 50: 'fifty',
    55: 'fifty-five', 60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety', 100: 'one hundred'
}

def number_to_english_words(n: int) -> str:
    if n in ENGLISH_CARDINAL_WORDS:
        return ENGLISH_CARDINAL_WORDS[n]
    if 20 < n < 100:
        tens = (n // 10) * 10
        ones = n % 10
        return f"{ENGLISH_CARDINAL_WORDS.get(tens, '')}-{ENGLISH_CARDINAL_WORDS.get(ones, '')}"
    return str(n)

def verbalize_digits(text: str) -> str:
    """Convert emails, times, percentages, phone numbers, and numbers into clear English spoken words.
    - Emails: 'Ketan24475@gmail.com' -> 'Ketan two four four seven five at gmail dot com'
    - Times: '10am' -> 'ten AM', '10 baje' -> 'ten baje', '5 baje' -> 'five baje', '10:30' -> 'ten thirty'
    - Percentages: '50%' -> 'fifty percent', '10%' -> 'ten percent'
    - Phone numbers (7-15 digits): '9876543210' -> 'nine eight seven six five, four three two one zero'
    - Numbers 0-100: pronounced in English so Indian neural TTS NEVER speaks numbers in Hindi (Rule 38)."""
    if not text:
        return text

    # Convert any Devanagari numerals to standard ASCII digits first
    for deva, asc in DEVA_DIGITS_MAP.items():
        text = text.replace(deva, asc)

    # 1. 24/7 pronunciation
    text = re.sub(r'\b24/7\b', 'twenty-four seven', text)
    text = re.sub(r'24/7', 'twenty-four seven', text)
    text = re.sub(r'२४/७', '24 घंटे', text)

    # 2. Email verbalization: convert e.g. Ketan24475@gmail.com into natural spoken English
    def _verbalize_email(m):
        u, d = m.group(1), m.group(2)
        chunks = re.findall(r'[a-zA-Z]+|\d+|[._+-]', u)
        res = []
        for c in chunks:
            if c.isdigit():
                res.append(' '.join(DIGIT_WORDS.get(x, x) for x in c))
            elif c == '.':
                res.append('dot')
            elif c in ('_', '-'):
                res.append('dash')
            else:
                res.append(c)
        user_spoken = " ".join(res)
        domain_spoken = d.replace(".", " dot ")
        return f"{user_spoken} at {domain_spoken}"

    text = re.sub(r'\b([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)\b', _verbalize_email, text)

    # 3. Time verbalization (e.g. 10am, 10:00 am, 10:30 pm, 10 baje, 5 baje, 10:00, 10:30)
    HINDI_HOURS = {
        1: 'ek', 2: 'do', 3: 'teen', 4: 'chaar', 5: 'paanch', 6: 'chhe',
        7: 'saat', 8: 'aath', 9: 'nau', 10: 'das', 11: 'gyaarah', 12: 'baarah'
    }
    def _format_baje_min(m):
        hr = int(m.group(1))
        mn = int(m.group(2))
        h_word = HINDI_HOURS.get(hr, number_to_english_words(hr))
        if mn == 30:
            return f"saadhe {h_word} {m.group(3)}"
        elif mn == 15:
            return f"sawa {h_word} {m.group(3)}"
        elif mn == 45:
            next_hr = HINDI_HOURS.get((hr % 12) + 1, number_to_english_words((hr % 12) + 1))
            return f"paune {next_hr} {m.group(3)}"
        return f"{h_word} {number_to_english_words(mn)} {m.group(3)}"

    def _format_baje(m):
        hr = int(m.group(1))
        h_word = HINDI_HOURS.get(hr, number_to_english_words(hr))
        return f"{h_word} {m.group(2)}"

    text = re.sub(r'\b(\d{1,2}):(\d{2})\s*(baje|bje)\b', _format_baje_min, text, flags=re.I)
    text = re.sub(r'\b(\d{1,2})(?::00)?\s*(baje|bje)\b', _format_baje, text, flags=re.I)
    text = re.sub(r'\b(\d{1,2}):00\s*(am|pm)\b', lambda m: f"{number_to_english_words(int(m.group(1)))} {m.group(2).upper()}", text, flags=re.I)
    text = re.sub(r'\b(\d{1,2}):(\d{2})\s*(am|pm)\b', lambda m: f"{number_to_english_words(int(m.group(1)))} {number_to_english_words(int(m.group(2)))} {m.group(3).upper()}", text, flags=re.I)
    text = re.sub(r'\b(\d{1,2})\s*(am|pm)\b', lambda m: f"{number_to_english_words(int(m.group(1)))} {m.group(2).upper()}", text, flags=re.I)
    text = re.sub(r'\b(\d{1,2}):00\b', lambda m: f"{number_to_english_words(int(m.group(1)))}", text)
    text = re.sub(r'\b(\d{1,2}):(\d{2})\b', lambda m: f"{number_to_english_words(int(m.group(1)))} {number_to_english_words(int(m.group(2)))}", text)

    # 4. Percentages: 50%, 10%
    text = re.sub(r'\b(\d{1,3})\s*%', lambda m: f"{number_to_english_words(int(m.group(1)))} percent", text)

    # 5. Currency / Price: ₹500, Rs. 500
    text = re.sub(r'[₹]\s*(\d+)', lambda m: f"{m.group(1)} rupees", text)
    text = re.sub(r'\bRs\.?\s*(\d+)\b', lambda m: f"{m.group(1)} rupees", text, flags=re.I)

    # 6. Phone numbers (7-15 digits): speak digit-by-digit with a natural mid-pause comma
    def _replace_phone_chunk(match):
        digits = match.group(0)
        words = [DIGIT_WORDS.get(d, d) for d in digits]
        if len(words) == 10:
            return " ".join(words[:5]) + ", " + " ".join(words[5:])
        elif len(words) >= 4:
            mid = len(words) // 2
            return " ".join(words[:mid]) + ", " + " ".join(words[mid:])
        return " ".join(words)

    text = re.sub(r'\b\d{7,15}\b', _replace_phone_chunk, text)

    # 7. Verbalize single isolated digits in numeric contexts (e.g. 'number hai 6', 'digit 4', 'code 9')
    text = re.sub(
        r'\b(number|no\.?|code|digit|dial|hai|he|tha|thi)\s+([0-9])\b',
        lambda m: f"{m.group(1)} {DIGIT_WORDS.get(m.group(2), m.group(2))}",
        text,
        flags=re.IGNORECASE
    )

    # 8. Verbalize standalone single or 2-digit numbers in general context (e.g. '5 minute', '2 din', '10 option')
    # Ensures Sarvam in Hindi voice NEVER speaks numbers in Hindi (Rule 38)
    text = re.sub(
        r'\b(\d{1,2})\b',
        lambda m: number_to_english_words(int(m.group(1))),
        text
    )

    return text

def fix_gender_verbs(text: str, gender: str, caller_gender: str = "male") -> str:
    """Post-process LLM output and TTS text to enforce gender-consistent Hindi/Hinglish verb forms
    and natural spoken pronunciation (e.g. 24/7 -> twenty-four seven, phone numbers in English digits)."""
    if not text:
        return text

    # Strip any stray enclosing quotes from TTS/LLM output
    text = text.strip().strip('"\'`“”‘’').strip()

    # Fix phone numbers so TTS speaks digits in English instead of Hindi cardinal numbers
    text = verbalize_digits(text)

    # Fix 24/7 pronunciation so TTS never says 'chaubis by saat'
    text = re.sub(r'\b24/7\b', 'twenty-four seven', text)
    text = re.sub(r'24/7', 'twenty-four seven', text)
    text = re.sub(r'२४/७', '24 घंटे', text)

    # Fix literal mistranslations of "I see" -> "seekh rahi hoon" / "seekh raha hoon"
    text = re.sub(r'\b(?:main\s+)?seekh\s+(?:rahi|raha)\s+(?:hoon|hu|hun|hoo)\b', 'mujhe pata chala', text, flags=re.IGNORECASE)
    text = re.sub(r'\bseekh\s+rahe\s+hain\b', 'dekh rahe hain', text, flags=re.IGNORECASE)

    # Rule: Addressing the caller ('Aap') in polite Hindi/Hinglish
    # If caller is not confirmed female, 'aap' must ALWAYS take respectful masculine plural,
    # NEVER feminine ('rahi hongi', 'rahi hain', 'chahti hain', 'sakti hain')!
    if caller_gender != 'female':
        text = re.sub(r'\baap\s+([^.?!,]+?)\s+rahi\s+hongi\b', r'aap \1 rahe honge', text, flags=re.IGNORECASE)
        text = re.sub(r'\baap\s+([^.?!,]+?)\s+rahi\s+hain\b', r'aap \1 rahe hain', text, flags=re.IGNORECASE)
        text = re.sub(r'\baap\s+([^.?!,]+?)\s+sakti\s+hain\b', r'aap \1 sakte hain', text, flags=re.IGNORECASE)
        text = re.sub(r'\baap\s+([^.?!,]+?)\s+chahti\s+hain\b', r'aap \1 chahte hain', text, flags=re.IGNORECASE)
        text = re.sub(r'\baap\s+([^.?!,]+?)\s+karti\s+hain\b', r'aap \1 karte hain', text, flags=re.IGNORECASE)
        text = re.sub(r'\baap\s+call\s+kar\s+rahi\s+hongi\b', 'aap call kar rahe honge', text, flags=re.IGNORECASE)
        text = re.sub(r'\bkar\s+rahi\s+hongi\b', 'kar rahe honge', text, flags=re.IGNORECASE)

    if not gender:
        return text

    if gender == 'female':
        # male -> female verb corrections
        text = re.sub(r'\b([a-zA-Z\u0900-\u097F]+)\s+raha\s+(hoon|hu|hun|hoo)\b', r'\1 rahi \2', text, flags=re.IGNORECASE)
        text = re.sub(r'\b([a-zA-Z\u0900-\u097F]+)\s+sakta\s+(hoon|hu|hun|hoo)\b', r'\1 sakti \2', text, flags=re.IGNORECASE)
        text = re.sub(r'\b(karta|chahta|samajhta|dekhta|sochta|bolta|sunta|jaanta|maanta|batata|dikhata)\s+(hoon|hu|hun|hoo)\b', 
                       lambda m: m.group(1).rstrip('a') + 'i ' + m.group(2), text, flags=re.IGNORECASE)
        text = re.sub(r'\brha\s+(hu|hoon|hun|hoo)\b', r'rahi \1', text, flags=re.IGNORECASE)
        text = re.sub(r'\brhi\s+(hu|hoon|hun|hoo)\b', r'rahi \1', text, flags=re.IGNORECASE)
        text = re.sub(r'\bbhej\s+deta\s+(hoon|hu|hun|hoo)\b', r'bhej deti \1', text, flags=re.IGNORECASE)
        text = re.sub(r'\bcall\s+nahi\s+karunga\b', 'call nahi karungi', text, flags=re.IGNORECASE)
        text = re.sub(r'\blamba\s+time\s+nahi\s+lunga\b', 'lamba time nahi lungi', text, flags=re.IGNORECASE)
        text = re.sub(r'\bconnect\s+kar\s+lunga\b', 'connect kar lungi', text, flags=re.IGNORECASE)
        text = re.sub(r'\bseedhi\s+baat\s+karta\s+(hoon|hu|hun|hoo)\b', r'seedhi baat karti \1', text, flags=re.IGNORECASE)
    elif gender == 'male':
        # female -> male verb corrections (catches bhej rahi hoon, confirm kar rahi hoon, sakti hoon, etc.)
        text = re.sub(r'\b([a-zA-Z\u0900-\u097F]+)\s+rahi\s+(hoon|hu|hun|hoo)\b', r'\1 raha \2', text, flags=re.IGNORECASE)
        text = re.sub(r'\b([a-zA-Z\u0900-\u097F]+)\s+sakti\s+(hoon|hu|hun|hoo)\b', r'\1 sakta \2', text, flags=re.IGNORECASE)
        text = re.sub(r'\b(karti|chahti|samajhti|dekti|sochti|bolti|sunti|jaanti|maanti|batati|dikhati)\s+(hoon|hu|hun|hoo)\b', 
                       lambda m: m.group(1).rstrip('i') + 'a ' + m.group(2), text, flags=re.IGNORECASE)
        text = re.sub(r'\brha\s+(hu|hoon|hun|hoo)\b', r'raha \1', text, flags=re.IGNORECASE)
        text = re.sub(r'\brhi\s+(hu|hoon|hun|hoo)\b', r'raha \1', text, flags=re.IGNORECASE)
        text = re.sub(r'\bbhej\s+deti\s+(hoon|hu|hun|hoo)\b', r'bhej deta \1', text, flags=re.IGNORECASE)
        text = re.sub(r'\bcall\s+nahi\s+karungi\b', 'call nahi karunga', text, flags=re.IGNORECASE)
        text = re.sub(r'\blamba\s+time\s+nahi\s+lungi\b', 'lamba time nahi lunga', text, flags=re.IGNORECASE)
        text = re.sub(r'\bconnect\s+kar\s+lungi\b', 'connect kar lunga', text, flags=re.IGNORECASE)
        text = re.sub(r'\bseedhi\s+baat\s+karti\s+(hoon|hu|hun|hoo)\b', r'seedhi baat karta \1', text, flags=re.IGNORECASE)
    return text

def text_to_ssml(text: str, provider: str = "sarvam") -> str:
    """Convert marker-rich text to SSML for expressive TTS (legacy fallback, clean_ssml takes priority)"""
    return clean_ssml(text)

class ExpressiveTTSStream(tts.SynthesizeStream):
    def __init__(self, tts_instance, underlying_stream, provider="sarvam", gender="", caller_gender="male"):
        import re
        self._underlying = underlying_stream
        self._tts = tts_instance
        self._provider = provider
        self._gender = gender
        self._caller_gender = caller_gender
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
        if not text:
            return
        self._buffer += text

        # Split on natural full sentence boundaries: full stop, question mark, exclamation, or newline
        # Avoid splitting on commas or dots inside emails/times to prevent choppy audio packet pops
        parts = re.split(r'([.!?।\n]+(?:\s+|$))', self._buffer)
        if len(parts) >= 3:
            # We have at least one complete sentence
            complete_chunk = "".join(parts[:-1])
            self._buffer = parts[-1]
            cleaned = fix_gender_verbs(clean_ssml(complete_chunk), self._gender, self._caller_gender)
            if cleaned.strip():
                self._underlying.push_text(cleaned)
        elif len(self._buffer) >= 140 and " " in self._buffer:
            # If no sentence boundary after 140 chars, split on last word boundary to keep audio flowing smoothly
            last_space = self._buffer.rfind(" ")
            chunk = self._buffer[:last_space]
            self._buffer = self._buffer[last_space + 1:]
            cleaned = fix_gender_verbs(clean_ssml(chunk), self._gender, self._caller_gender)
            if cleaned.strip():
                self._underlying.push_text(cleaned + " ")

    def flush(self) -> None:
        if self._buffer.strip():
            cleaned = fix_gender_verbs(clean_ssml(self._buffer), self._gender, self._caller_gender)
            if cleaned.strip():
                self._underlying.push_text(cleaned)
            self._buffer = ""
        self._underlying.flush()

    def end_input(self) -> None:
        if self._buffer.strip():
            cleaned = fix_gender_verbs(clean_ssml(self._buffer), self._gender, self._caller_gender)
            if cleaned.strip():
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
    def __init__(self, underlying_tts, provider="sarvam", gender="", caller_gender_fn=None):
        self._underlying = underlying_tts
        self._provider = provider
        self._gender = gender
        self._caller_gender_fn = caller_gender_fn
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
        caller_g = self._caller_gender_fn() if callable(self._caller_gender_fn) else "male"
        cleaned = fix_gender_verbs(clean_ssml(text), self._gender, caller_g)
        return self._underlying.synthesize(cleaned, *args, **kwargs)

    def stream(self, *args, **kwargs):
        underlying_stream = self._underlying.stream(*args, **kwargs)
        caller_g = self._caller_gender_fn() if callable(self._caller_gender_fn) else "male"
        return ExpressiveTTSStream(self, underlying_stream, provider=self._provider, gender=self._gender, caller_gender=caller_g)

    def update_options(self, *args, **kwargs):
        """Pass through dynamic TTS option updates (e.g. target_language_code, speaker) to underlying engine."""
        if hasattr(self._underlying, "update_options"):
            return self._underlying.update_options(*args, **kwargs)

def generate_personalized_greeting(name: str, tags: list, last_call: str | None, notes: str | None, language: str, gender: str, company_name: str = "") -> str:
    """Generate a warm, natural personalized greeting based on customer history (Rule 27: First Name Only)"""
    is_hindi = language in ['hinglish', 'hi-IN']
    bot_name = "Anushka" if gender == 'female' else "Vikram"
    
    # Rule 27: Never use customer's full name, use first name only
    first_name = ""
    if name and str(name).strip():
        parts = str(name).strip().split()
        first_name = parts[0].capitalize() if parts else ""
    
    is_vip = tags and any(t.lower() in ['vip', 'premium', 'high-value'] for t in tags)
    comp_hindi = f" {company_name} se" if company_name else " humari team se"
    comp_eng = f" from {company_name}" if company_name else ""
    
    if is_hindi:
        greet = f"Namaste {first_name} ji" if first_name else "Namaste ji"
        if is_vip:
            greet += f", swagat hai aapka. Main{comp_hindi} {bot_name} bol {'rahi' if gender=='female' else 'raha'} hoon. Kaise hain aap?"
        else:
            greet += f", main{comp_hindi} {bot_name} bol {'rahi' if gender=='female' else 'raha'} hoon. Kaise help kar {'sakti' if gender=='female' else 'sakta'} hoon?"
    else:
        greet = f"Hello {first_name}" if first_name else "Hello"
        if is_vip:
            greet += f"! Welcome back. This is {bot_name}{comp_eng}. How are you doing today?"
        else:
            greet += f"! Thank you for calling. This is {bot_name}{comp_eng}. How can I help you today?"
            
    return greet


def extract_business_info(system_prompt: str, agent_data: dict | None, profile_data: dict | None) -> dict:
    """
    Dynamically extracts the user's business identity and services from:
    1. === BUSINESS CONTEXT === header in system_prompt
    2. agent_data fields (business_name, company_name)
    3. profile_data company_name
    Never defaults to 'Trinetra AI' so agents speak authentically for the user's business.
    """
    business_name = ""
    services = ""
    industry = ""
    target_audience = ""
    
    if system_prompt:
        bc_match = re.search(r'=== BUSINESS CONTEXT ===([\s\S]*?)========================', system_prompt)
        if bc_match:
            bc_text = bc_match.group(1)
            bn = re.search(r'(?:Business Name|Company Name):\s*(.+)', bc_text, re.IGNORECASE)
            if bn:
                business_name = bn.group(1).strip()
            sv = re.search(r'(?:Services Offered|Services|Business Description):\s*(.+)', bc_text, re.IGNORECASE)
            if sv:
                services = sv.group(1).strip()
            ind = re.search(r'Industry:\s*(.+)', bc_text, re.IGNORECASE)
            if ind:
                industry = ind.group(1).strip()
            ta = re.search(r'Target Audience:\s*(.+)', bc_text, re.IGNORECASE)
            if ta:
                target_audience = ta.group(1).strip()

    if not business_name and agent_data:
        business_name = agent_data.get("business_name") or agent_data.get("company_name") or ""

    if not business_name and profile_data:
        business_name = profile_data.get("company_name") or ""

    # Clean out placeholder/unknown values
    if business_name.strip().lower() in ("nhi maalum", "unknown", "none", "null", "n/a"):
        business_name = ""

    return {
        "business_name": business_name.strip(),
        "services": services.strip(),
        "industry": industry.strip(),
        "target_audience": target_audience.strip()
    }


def resolve_agent_greeting(
    raw_greeting: str | None,
    clean_name: str,
    business_name: str,
    campaign_contact: dict | None,
    customer: dict | None,
    language: str,
    gender_tag: str,
    direction: str = "outbound",
    agent_config: dict | None = None,
    purpose: str | None = None
) -> Tuple[str, str, str]:
    """
    Resolves the initial greeting message with Phase 1 Call Disclosure & Consent.
    Preserves user-defined dashboard greetings while ensuring mandatory disclosure
    (AI assistant identity, business name, recording notice, outbound purpose) is
    smoothly prepended/integrated.
    
    Returns:
        (greeting_message, selected_variant, normalized_lang)
    """
    c_name = ""
    is_name_valid = False
    if campaign_contact:
        c_name = campaign_contact.get("full_name") or ""
        is_name_valid = bool(c_name and str(c_name).strip() and str(c_name).lower() not in ("null", "unknown", "none"))
    elif customer:
        c_name = customer.get("full_name") or ""
        is_name_valid = bool(c_name and str(c_name).strip() and str(c_name).lower() not in ("null", "unknown", "none", "inbound caller"))

    # Extract first name to avoid robotic, impolite full-name addressing (e.g. "Raghav" instead of "Raghav Thakur")
    first_name = c_name.strip().split()[0].capitalize() if is_name_valid else ""

    comp_hindi = f" {business_name} se" if business_name else ""
    comp_eng = f" calling from {business_name}" if business_name else ""
    verb = "rahi" if gender_tag == "female" else "raha"
    modal = "sakti" if gender_tag == "female" else "sakta"

    # Extract disclosure configuration
    disclosure_cfg = (agent_config or {}).get("disclosure_config") or {}
    raw_consent_mode = disclosure_cfg.get("consent_mode")
    lawyer_confirmed = bool((disclosure_cfg.get("exemption_details") or {}).get("lawyer_confirmed", False))
    phone_val = (campaign_contact.get("phone_number") if campaign_contact else None) or (customer.get("phone") if customer else None)
    
    consent_mode = resolve_jurisdiction_consent_mode(
        configured_mode=raw_consent_mode,
        phone_number=phone_val,
        country_code=disclosure_cfg.get("jurisdiction"),
        call_direction=direction,
        is_marketing=True,
        lawyer_confirmed=lawyer_confirmed
    )
    variant = select_disclosure_variant(agent_config)
    recording_exempt = bool(disclosure_cfg.get("recording_notice_exempt", False))
    resolved_purpose = purpose or (campaign_contact.get("notes") if campaign_contact else None)
    
    if raw_greeting:
        gm = raw_greeting.replace('{{agent_name}}', clean_name).replace('{agentName}', clean_name).replace('{agent_name}', clean_name)
        gm = gm.replace('{{company_name}}', business_name).replace('{companyName}', business_name).replace('{company_name}', business_name)
        
        c_repl = f"{first_name} ji" if (first_name and language in ['hinglish', 'hi-IN']) else (first_name or "")
        name_tokens = [
            '{{customer_name}}', '{customerName}', '{customer_name}',
            '{{contact_name}}', '{contactName}', '{contact_name}',
            '{{name}}', '{name}', '[customer_name]', '[customerName]',
            '[name]', '[Name]', '[contact_name]', '{{prospect_name}}',
            '{prospect_name}', '[prospect_name]', '---', '___'
        ]
        has_token = any(t in gm for t in name_tokens)
        if has_token:
            for t in name_tokens:
                if t in gm:
                    gm = gm.replace(t, c_repl or "ji")
        elif first_name and first_name.lower() not in gm.lower():
            if re.search(r'^(Namaste|Hello|Hi)\b', gm, re.IGNORECASE):
                gm = re.sub(r'^(Namaste|Hello|Hi)(\s+ji)?([,!\.]|\s+)', rf'\1 {first_name} ji, ', gm, count=1, flags=re.IGNORECASE)
            else:
                gm = f"Namaste {first_name} ji! {gm}"

        # Ensure agent introduces itself with its name in its first sentence (Rule 26, 28, Issue 4)
        if clean_name and clean_name.lower() not in gm.lower():
            if language in ['hinglish', 'hi-IN']:
                if first_name:
                    clean_rest = re.sub(r'^(Namaste|Hello|Hi)\s*' + re.escape(first_name) + r'\s*ji[,!\.]?\s*', '', gm, flags=re.IGNORECASE).strip()
                    gm = f"Hello {first_name} ji! Main {clean_name} bol {verb} hoon{comp_hindi}. {clean_rest}"
                else:
                    clean_rest = re.sub(r'^(Namaste|Hello|Hi)[,!\s]*', '', gm, flags=re.IGNORECASE).strip()
                    gm = f"Hello! Main {clean_name} bol {verb} hoon{comp_hindi}. {clean_rest}"
            else:
                if first_name:
                    clean_rest = re.sub(r'^(Hello|Hi)\s*' + re.escape(first_name) + r'[,!\.]?\s*', '', gm, flags=re.IGNORECASE).strip()
                    gm = f"Hello {first_name}! This is {clean_name}{comp_eng}. {clean_rest}"
                else:
                    clean_rest = re.sub(r'^(Hello|Hi)[,!\s]*', '', gm, flags=re.IGNORECASE).strip()
                    gm = f"Hello! This is {clean_name}{comp_eng}. {clean_rest}"

        gm = re.sub(r'\s+', ' ', gm).strip()
        gm = gm.strip('"\'`“”‘’').strip()
        gm = gm.replace(" ,", ",").replace(" !", "!").replace(" .", ".")

        # Apply Phase 1 compliance add-ons while preserving owner custom pitch
        return build_compliant_greeting(
            raw_greeting=gm,
            clean_name=clean_name,
            business_name=business_name,
            direction=direction,
            language=language,
            gender_tag=gender_tag,
            purpose=resolved_purpose,
            consent_mode=consent_mode,
            variant=variant,
            recording_exempt=recording_exempt
        )
    
    # When no raw greeting is provided in dashboard, generate full multilingual disclosure
    return build_compliant_greeting(
        raw_greeting=None,
        clean_name=clean_name,
        business_name=business_name,
        direction=direction,
        language=language,
        gender_tag=gender_tag,
        purpose=resolved_purpose,
        consent_mode=consent_mode,
        variant=variant,
        recording_exempt=recording_exempt
    )


def build_outbound_sales_protocol(
    prospect_name: str,
    prospect_company: str,
    lead_notes: str,
    business_info: dict,
    bot_name: str,
    gender_tag: str,
    end_msg_text: str
) -> str:
    """
    Builds a universal, business-agnostic Master Outbound Sales Protocol.
    Adheres strictly to expert salesman psychology without hardcoding any product/business.
    Adapts 100% to the user's business, services, pricing, and campaign lead context.
    """
    b_name = business_info.get("business_name") or "your company"
    b_services = business_info.get("services") or "your products and services as configured in your prompt"
    
    comp_part = f" from {prospect_company}" if prospect_company else ""
    first_name = prospect_name.strip().split()[0].capitalize() if prospect_name else ""
    p_name = f"{first_name} ji" if first_name else "the prospect"
    notes_summary = lead_notes if lead_notes else "discussing your offerings and understanding their requirements"
    
    gender_verb_listen = "chahti" if gender_tag == "female" else "chahta"
    gender_verb_speak = "rahi" if gender_tag == "female" else "raha"
    
    protocol = (
        f"\n\n## OUTBOUND SALES PROTOCOL:\n"
        f"Target: {p_name}{comp_part} | You represent: {b_name} | Services: {b_services}\n"
        f"Lead context: {notes_summary}\n"
        f"\n"
        f"### NAME FREQUENCY GOVERNOR (STRICT):\n"
        f"- You used the prospect's name ONCE already in your greeting. That counts as your opening name-use.\n"
        f"- DURING THE CONVERSATION (all middle turns): NEVER use their name. Use 'ji', 'sir', 'bilkul', 'haanji' instead.\n"
        f"- Use their name ONE LAST TIME only in your final goodbye sentence.\n"
        f"- Total name usage in entire call: EXACTLY 2 times (greeting + goodbye). Not 3, not 4, not 5. EXACTLY 2.\n"
        f"\n"
        f"### CONVERSATION FLOW (adapt to your business):\n"
        f"1. OPENING (done): You greeted and asked for 2 minutes.\n"
        f"2. HOOK: When they say 'haan/batao/bolo' state why you called based on lead context. Ask ONE discovery question.\n"
        f"3. DISCOVER: Listen, validate with empathy, ask ONE follow-up to diagnose their need.\n"
        f"4. PITCH: 1-2 sentences on how {b_name} solves their specific need. End with a check-in question.\n"
        f"5. OBJECTIONS: Handle with empathy using your knowledge base. Quote pricing confidently if asked.\n"
        f"6. CLOSE: Propose ONE concrete next step (appointment, WhatsApp details, demo). Confirm.\n"
        f"7. END: Only when done or next step confirmed, say: '{end_msg_text}'. NEVER in turns 1-4.\n"
        f"\n"
        f"### NO-REPEAT RULE (CRITICAL):\n"
        f"- NEVER repeat the same hook, pitch angle, offer, or question you already said earlier in this call.\n"
        f"- NEVER say '15 second dijiye', 'WhatsApp pe bhej doon', 'demo bhej deta hoon', or any CTA phrase more than ONCE in the entire call.\n"
        f"- If you already pitched and they changed the subject, follow THEIR lead. Do not circle back to your pitch.\n"
        f"- If you already offered WhatsApp/demo and they agreed, confirm and close. Do not offer it again.\n"
        f"\n"
        f"### 2-NO EXIT RULE (CRITICAL):\n"
        f"- If the prospect says 'no', 'nahi chahiye', 'not interested', 'busy hoon' TWICE in the call:\n"
        f"  STOP SELLING IMMEDIATELY. Do not attempt a third angle, a third hook, or a third ask.\n"
        f"  Close with dignity: 'Bilkul sir, respect {'karti' if gender_tag == 'female' else 'karta'} hoon. Aapka time dene ke liye shukriya, have a great day!'\n"
        f"\n"
        f"### THIRD-PARTY PICKUP / PROSPECT ABSENT PROTOCOL (CRITICAL):\n"
        f"- If someone else answers or indicates that the prospect ({p_name}) is NOT available / not here (e.g. 'wo yahan nahi hain', 'phone ghar pe hai', 'bahar gaye hain', 'office mein hain', 'abhi baat nahi ho sakti', 'baad mein call karna'):\n"
        f"  1. DO NOT try to sell, pitch, or push services onto this person.\n"
        f"  2. Respond warmly, politely, and respectfully:\n"
        f"     'Theek hai, koi baat nahi ji! Jab bhi wo wapas aayein, kya aap unhe bata denge ki Trinetra se {bot_name} ka call aaya tha?'\n"
        f"  3. Ask gently when they will return or be available: 'Wo lagbhag kab tak free honge?'\n"
        f"  4. Acknowledge and wrap up: 'Bahut shukriya! Main unhe 3-4 ghante baad ya sham ko dobara connect kar {gender_verb_listen if gender_tag == 'female' else 'lunga'}. Have a great day!'\n"
        f"  5. End the call smoothly without lingering.\n"
        f"\n"
        f"### TELEPHONY RULES:\n"
        f"- 1-2 sentences max per turn (12-20 words). No monologues, no lists, no paragraphs.\n"
        f"- End every turn with a question to keep it interactive.\n"
        f"- Only represent {b_name} and services from your instructions. Never invent products.\n"
        f"\n"
        f"### EMOTIONAL EXPRESSIVENESS & SITUATIONAL LAUGHTER:\n"
        f"- LAUGH WHEN APPROPRIATE: If the prospect jokes, chuckles, or makes light/witty banter ('robot ho kya', 'paise nahi hain haha'), laugh warmly with 'Haha, ...' or 'Hehe, ...' (e.g. 'Haha, arey nahi sir! Main bilkul real hoon!'). Always laugh WITH the customer, never be stiff or robotic!\n"
        f"- EXCITEMENT & JOY: When the prospect agrees or shares positive news, express genuine delight: 'Arey waah! Bilkul sir!' or 'Kya baat hai sir!'.\n"
        f"- EMPATHY & SADNESS: If the prospect shares personal stress, business loss, or difficulty, drop all sales tone and speak softly: 'Oh... main bilkul samajh {gender_verb_listen} hoon sir...'.\n"
    )
    return protocol


def apply_gender_grammar_directives(system_prompt: str, gender_tag: str, bot_name: str, voice_id: str) -> str:
    """
    Enforces gender-consistent Hindi/Hinglish grammar directives and verb forms.
    Ensures female voices consistently use feminine endings (rahi hoon, sakti hoon, etc.)
    and male voices consistently use masculine endings (raha hoon, sakta hoon, etc.).
    """
    # Normalize 24/7 to natural speech in system prompt
    system_prompt = re.sub(r'\b24/7\b', 'twenty-four seven', system_prompt)
    system_prompt = re.sub(r'24/7', 'twenty-four seven', system_prompt)

    if gender_tag == 'female':
        # Resolve slashed alternatives to female forms
        system_prompt = re.sub(r'\b(?:raha/rahi|rahi/raha)\b', 'rahi', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\b(?:sakta/sakti|sakti/sakta)\b', 'sakti', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\b(?:karta/karti|karti/karta)\b', 'karti', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\b(?:chahta/chahti|chahti/chahta)\b', 'chahti', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\b(?:deta/deti|deti/deta)\b', 'deti', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\b(?:karunga/karungi|karungi/karunga)\b', 'karungi', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\b(?:lunga/lungi|lungi/lunga)\b', 'lungi', system_prompt, flags=re.IGNORECASE)

        system_prompt = re.sub(r'\b(samajh|bol|kar|dekh|sun|bata)\s+raha\s+(hoon|hu|hun)\b', r'\1 rahi \2', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\b(samajh|kar|dekh|bol)\s+sakta\s+(hoon|hu|hun)\b', r'\1 sakti \2', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\b(karta|chahta|samajhta|dekhta|sochta|bolta|sunta|jaanta|maanta|batata|dikhata)\s+(hoon|hu|hun)\b', lambda m: m.group(1)[:-1] + 'i ' + m.group(2), system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\bbhej\s+deta\s+(hoon|hu|hun)\b', r'bhej deti \1', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\bcall\s+nahi\s+karunga\b', 'call nahi karungi', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\brespect\s+karta\s+(hoon|hu|hun)\b', r'respect karti \1', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\bconnect\s+kar\s+lunga\b', 'connect kar lungi', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\blamba\s+time\s+nahi\s+lunga\b', 'lamba time nahi lungi', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\bseedhi\s+baat\s+karta\s+(hoon|hu|hun)\b', r'seedhi baat karti \1', system_prompt, flags=re.IGNORECASE)
        if '## CRITICAL FEMALE GENDER & HINDI GRAMMAR DIRECTIVE' not in system_prompt:
            system_prompt += (
                f"\n\n## CRITICAL FEMALE GENDER & HINDI GRAMMAR DIRECTIVE (STRICT & NON-NEGOTIABLE):\n"
                f"- You are {bot_name}, a FEMALE assistant speaking with a female voice ({voice_id}).\n"
                f"- In Hindi and Hinglish, you MUST ALWAYS use FEMININE grammatical endings for yourself:\n"
                f"  * ALWAYS say: 'Haan main samajh rahi hoon' (STRICTLY NEVER say 'samajh raha hoon' or 'samajh rha hu').\n"
                f"  * ALWAYS say: 'Main bol rahi hoon' (STRICTLY NEVER say 'bol raha hoon' or 'bol rha hu').\n"
                f"  * ALWAYS say: 'Main aapki madad kar sakti hoon' (STRICTLY NEVER say 'kar sakta hoon').\n"
                f"  * ALWAYS say: 'Main check karti hoon' (STRICTLY NEVER say 'karta hoon').\n"
                f"  * ALWAYS say: 'Main seedhi baat karti hoon' (STRICTLY NEVER say 'karta hoon').\n"
                f"  * ALWAYS say: 'Main janna chahti hoon' (STRICTLY NEVER say 'chahta hoon').\n"
                f"  * ALWAYS say: 'Main WhatsApp bhej deti hoon' (STRICTLY NEVER say 'bhej deta hoon').\n"
                f"  * ALWAYS say: 'Main call nahi karungi' (STRICTLY NEVER say 'call nahi karunga').\n"
                f"- Never use male grammatical endings ('raha', 'sakta', 'karta', 'chahta', 'lunga', 'karunga') when referring to yourself."
            )
    else:
        # Male gender voice and grammar enforcement
        system_prompt = re.sub(r'\b(?:raha/rahi|rahi/raha)\b', 'raha', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\b(?:sakta/sakti|sakti/sakta)\b', 'sakta', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\b(?:karta/karti|karti/karta)\b', 'karta', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\b(?:chahta/chahti|chahti/chahta)\b', 'chahta', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\b(?:deta/deti|deti/deta)\b', 'deta', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\b(?:karunga/karungi|karungi/karunga)\b', 'karunga', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\b(?:lunga/lungi|lungi/lunga)\b', 'lunga', system_prompt, flags=re.IGNORECASE)

        system_prompt = re.sub(r'\b(samajh|bol|kar|dekh|sun|bata|bhej|confirm|share|de|le)\s+rahi\s+(hoon|hu|hun)\b', r'\1 raha \2', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\b(samajh|kar|dekh|bol|bata|bhej|de|le)\s+sakti\s+(hoon|hu|hun)\b', r'\1 sakta \2', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\b(karti|chahti|samajhti|dekti|sochti|bolti|sunti|jaanti|maanti|batati|dikhati)\s+(hoon|hu|hun)\b', lambda m: m.group(1)[:-1] + 'a ' + m.group(2), system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\bbhej\s+deti\s+(hoon|hu|hun)\b', r'bhej deta \1', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\bcall\s+nahi\s+karungi\b', 'call nahi karunga', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\brespect\s+karti\s+(hoon|hu|hun)\b', r'respect karta \1', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\bconnect\s+kar\s+lungi\b', 'connect kar lunga', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\blamba\s+time\s+nahi\s+lungi\b', 'lamba time nahi lunga', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\bseedhi\s+baat\s+karti\s+(hoon|hu|hun)\b', r'seedhi baat karta \1', system_prompt, flags=re.IGNORECASE)
        if '## CRITICAL MALE GENDER & HINDI GRAMMAR DIRECTIVE' not in system_prompt:
            system_prompt += (
                f"\n\n## CRITICAL MALE GENDER & HINDI GRAMMAR DIRECTIVE (STRICT & NON-NEGOTIABLE):\n"
                f"- You are {bot_name}, a MALE assistant speaking with a male voice ({voice_id}).\n"
                f"- In Hindi and Hinglish, you MUST ALWAYS use MASCULINE grammatical endings for yourself:\n"
                f"  * ALWAYS say: 'Haan main samajh raha hoon' (STRICTLY NEVER say 'samajh rahi hoon' or 'samajh rhi hu').\n"
                f"  * ALWAYS say: 'Main bol raha hoon' (STRICTLY NEVER say 'bol rahi hoon' or 'bol rhi hu').\n"
                f"  * ALWAYS say: 'Main aapki madad kar sakta hoon' (STRICTLY NEVER say 'kar sakti hoon').\n"
                f"  * ALWAYS say: 'Main check karta hoon' (STRICTLY NEVER say 'karti hoon').\n"
                f"  * ALWAYS say: 'Main janna chahta hoon' (STRICTLY NEVER say 'chahti hoon').\n"
                f"  * ALWAYS say: 'Main abhi WhatsApp par bhej raha hoon' (STRICTLY NEVER say 'bhej rahi hoon' or 'bhej deti hoon').\n"
                f"  * ALWAYS say: 'Main appointment confirm kar raha hoon' (STRICTLY NEVER say 'confirm kar rahi hoon').\n"
                f"  * ALWAYS say: 'Main call nahi karunga' (STRICTLY NEVER say 'call nahi karungi').\n"
                f"- NEVER use female grammatical endings ('rahi hoon', 'sakti hoon', 'karti hoon', 'chahti hoon', 'lungi', 'karungi') when referring to yourself."
            )

    if '## CALLER ADDRESSING & GENDER RULES' not in system_prompt:
        system_prompt += (
            f"\n\n## CALLER ADDRESSING & GENDER RULES (CRITICAL & STRICT):\n"
            f"- Polite Address Rule for Caller ('Aap'):\n"
            f"  * When speaking to or addressing the caller ('Aap'), ALWAYS use respectful masculine plural forms by default:\n"
            f"    - ALWAYS say: 'Aap call kar rahe honge' (STRICTLY NEVER say 'aap call kar rahi hongi' unless the caller is definitely a woman).\n"
            f"    - ALWAYS say: 'Aap bata sakte hain' (STRICTLY NEVER 'aap bata sakti hain' unless caller is female).\n"
            f"    - ALWAYS say: 'Aap kya chahte hain?' / 'Aap keh rahe the' / 'Aap dekh sakte hain'.\n"
            f"  * Remember: Feminine verb endings ('rahi hoon', 'sakti hoon', 'karti hoon', 'bol rahi hoon') apply ONLY to YOU ({bot_name}), NEVER to the caller!\n"
            f"  * If the caller mentions a male name (e.g. Raghav, Ketan, Rahul, Amit) or uses male verbs ('main bol raha hoon', 'main soch raha tha'), treat them as male.\n"
            f"  * Only if the caller introduces herself with a female name or female self-verbs ('main bol rahi hoon'), use feminine respectful address ('aap keh rahi theen')."
        )

    if '## UNIVERSAL EQ' not in system_prompt:
        system_prompt += (
            f"\n\n## UNIVERSAL EQ & HUMAN EXPRESSIVENESS:\n"
            f"- You are a warm, emotionally intelligent human on a real phone call, NOT a robot.\n"
            f"- MIRROR emotions: Relaxed caller? Be warm ('Arey main bhi ekdum first class sir!'). Busy caller? Drop pressure ('Bilkul samajh {'sakti' if gender_tag == 'female' else 'sakta'} hoon sir'). Agreed? Show delight ('Arey waah! Bilkul!').\n"
            f"- Use natural fillers: 'Arey waah!', 'Haanji bilkul!', 'Sach kahun toh...', 'Oh achha!'. Use commas and exclamation marks for vocal melody.\n"
            f"- Casual spoken Hinglish only. No bookish terms ('customized preview', 'dhanyavaad', 'boost karega').\n"
            f"- Clean Romanized Hinglish only, no Devanagari mid-call. No hyphens, dashes, or symbols (say '5 minute' not '5‑minute')."
        )
    return system_prompt


def build_agent_expressive_rules(bot_name: str = "Agent", gender_tag: str = "female", business_name: str = "") -> str:
    """
    Returns the comprehensive, non-negotiable personality, behavioral, and talking style
    rules derived from rules.md. Injected into every agent's runtime instructions.
    """
    v_bol = "bol rahi hoon" if gender_tag == "female" else "bol raha hoon"
    v_sun = "sun rahi hoon" if gender_tag == "female" else "sun raha hoon"
    v_madad = "kar sakti hoon" if gender_tag == "female" else "kar sakta hoon"
    v_karti = "karti hoon" if gender_tag == "female" else "karta hoon"
    v_chahti = "chahti hoon" if gender_tag == "female" else "chahta hoon"
    v_karungi = "karungi" if gender_tag == "female" else "karunga"
    v_lungi = "kar lungi" if gender_tag == "female" else "kar lunga"
    v_kar = "kar doon"

    return f"""
## TRINETRA AGENT BEHAVIOR & TALKING STYLE RULES (MANDATORY & NON-NEGOTIABLE):

### 1. Demeanor & Professional Presence (Rule 2, 5-24):
- Maintain a calm, polite, respectful, and confident tone at all times. Never sound desperate, aggressive, defensive, or robotic.
- STRICT ETHICAL SPEECH DIRECTIVE: You must NEVER use any kind of slang, informal street words, abusive language, offensive language, discriminatory language, violent language, sexually explicit language, threatening language, harassing language, misleading language, false language, deceptive language, manipulative language, harmful language, dangerous language, illegal language, unethical language, immoral language, inappropriate language, unprofessional language, or disrespectful language.

### 2. Conversational Brevity & Conciseness (Rule 3 & 41):
- Keep every response strictly to 1 to 2 sentences maximum (12 to 20 words).
- Speak concisely and to the point. Deliver value, then ask one crisp, interactive question.
- Never repeat yourself. Do NOT repeat the same point, hook, offer, or question again.

### 3. Natural Human Speech Rhythm, Pauses & Fillers (Rule 4, 39, 45, 46):
- Sound like a real human in a natural conversation. Your voice must be smooth, clear, confident, energetic, and engaging—never flat, monotonous, machine-gun fast, or artificially slow.
- Use natural pauses (`...`) for realistic breath pauses before important details.
- Use natural conversational fillers time to time: "um", "ah", "like", "you know", "actually", "dekhiye...", "hmm...", "bilkul...".
- Emotional intelligence and sentiment mirroring:
  * When the caller jokes, laughs, or banters: ALWAYS react with a light, warm human laugh starting with "Haha, ..." or "Hehe, ...". Never give a stiff, cold, or defensive response to humor!
  * When the caller agrees or shares good news: Express genuine delight and enthusiasm ("Arey waah! Bilkul!", "Kya baat hai!").
  * When the caller shares personal difficulty, grief, illness, or emergency: Drop all business momentum immediately. Speak softly and gently with deep empathy ("Oh... main bilkul samajh {v_madad}...").

### 4. Zero Re-Introduction Governor (Rule 26):
- Introduce yourself EXACTLY ONCE during your opening greeting.
- Throughout the entire rest of the call, NEVER re-introduce yourself or repeat "Main {bot_name} {v_bol}".
- If the caller says "Hello?", "Hello", "Sun rahe ho?", "Are you there?", or after silence: STRICTLY NEVER re-introduce yourself! Simply confirm you are on the line ("Ji sir, main bilkul {v_sun}, boliye na?").
- You may state your name again ONLY if the caller explicitly asks "Aap kaun bol rahe ho?" / "Who is this?", or if the call dropped and was reconnected.

### 5. Customer Name Governor (Rule 27):
- Address the customer by name at most TWICE in the entire call: once at START (greeting) and once at END (closing sign-off).
- ZERO name repetition during the middle of the call. Use respectful conversational anchors ("ji", "sir", "bilkul") instead.
- ALWAYS use the customer's First Name only (+ "ji" in Hinglish/Hindi, e.g. "Raghav ji"). NEVER use their full legal name (NEVER say "Raghav Thakur ji").

### 6. First-Speaker & Silence Handling (Rule 28):
- The agent speaks first upon connection.
- If the caller does not respond or goes silent, gently repeat your question or statement with warmth ("Ji, kya aap sun pa rahe hain? Bataiye, main kaise help {v_madad}?").

### 7. Zero Redundant Data Asking & Context Memory (Rule 1, 36, 50):
- If the caller provided their name, phone number, or any detail earlier in the call, NEVER ask for it again later (e.g. when confirming appointment or callback).
- If the customer's details exist in the database, use them seamlessly for frictionless confirmation ("Ok Raghav ji, main aapka appointment 2 PM par confirm {v_bol.replace('bol', 'kar')}, is this correct?").
- For returning customers: Reference their history/past resolved problem warmly ("Hello Rahul ji, kaise hain ab? Aapki problem solve ho gayi thi na? Batayein ab kaise help {v_madad}?").
- STRICT ANTI-HALLUCINATION PROTOCOL FOR APPOINTMENT CHECKING:
  * When a caller asks to check or verify an existing appointment ("mera appointment check karo", "mujhe check karna hai", "did you check my appointment"):
    1. If NO prior confirmed appointment is in your database context or verified tool result for this caller:
       DO NOT EVER pretend, lie, or hallucinate that an appointment exists!
       STRICTLY NEVER say "Haan, maine dekh liya, aapka appointment kal 10 baje ka hai" when no prior booking exists in the database!
    2. Truthfully state: "Ek second, main check {v_karti}... [Name] ji, maine aapke number par check kiya, lekin mujhe koi pehle se booked appointment nahi mila. Kya main aapke liye [requested time] par naya appointment book {v_kar}?"
  * Only confirm an existing appointment if it is verified and present in your database records!

### 8. Dynamic Sentence Formation & Anti-Cliché Rule (Rule 51):
- NEVER repeat identical canned phrases across calls (e.g., robotic "Bahut badhiya! Main Arika bol rahi hoon, Trinetra se. Aap appointment book, check, ya cancel karwana chahte hain?"). This is strictly forbidden.
- Sentence openings and phrasing must be dynamic, expressive, and varied every time ("Arre wah", "Accha sun kar khushi hui", "Great to hear", "Bilkul sir", "Haan ji, boliye").

### 9. Respectful Pronouns & Strict Prohibition of "tu/teri" (Rule 42):
- Always address the caller with utmost respect using "aap", "aapki", "aapko", "aapka", "aapne".
- "tu", "teri", "tujhe", "tera", "tune" are STRICTLY PROHIBITED under all circumstances.
- Self-referential Hindi/Hinglish verbs must strictly match assigned gender (Female: "bol rahi hoon", "kar sakti hoon", "karti hoon", "chahti hoon", "karungi", "kar lungi"; Male: "bol raha hoon", "kar sakta hoon", "karta hoon", "chahta hoon", "karunga", "kar lunga").

### 10. Out-of-Context Redirection (Rule 30):
- If the caller asks anything not related to the business or services, politely decline to answer and guide the conversation back: "Main is baare mein baat karne ke liye trained nahi hoon, chaliye aapke requirements / inquiry par baat karte hain."

### 11. Objection Handling & Cold Calling Protocol (Rule 31 & 32):
- Busy / In-transit / Walking: Use Saad's 15-second walking hook ("Arre bilkul sir, main samajh {v_madad} aap bahar hain. Bas 15 second dijiye chalte-chalte—ek zaruri point share kar doon, agar relevant na lage toh aap turant mana kar dena. Fair enough sir?").
- Hesitation / "Nahi chahiye": Use Saad's Wall Breaker ("Sach kahun sir, mujhe abhi yeh bhi nahi pata ki aapko iski zaroorat hai ya nahi! Mujhe bas 15 second dijiye—agar 1% bhi aapke kaam ka na lage, toh main dubara call nahi {v_karungi}. Deal sir?").

### 12. Strict Callback Protocol (Rule 33):
- When the caller asks to call back later ("baad mein call karo", "busy hoon"), ask for a specific time or offer 2 specific times (e.g. today at 5 PM or tomorrow at 11 AM) and lock it in.
- IN NO CIRCUMSTANCES ask the caller to call you back or ask them to connect later. The agent will always make the callback.

### 13. English Numbers & Clean Spoken Script (Rule 38):
- ALWAYS write and speak all numbers, phone digits, dates, times, amounts, and quantities in ENGLISH digits/words ("two PM", "nine eight seven...", "twenty-four seven").
- NEVER write numbers in Devanagari script (छह, दो) and never vocalize Hindi cardinal numbers (सात अरब, चौरानवे) unless explicitly requested by the caller.
- Output ONLY plain, natural conversational dialogue meant to be spoken out loud. NEVER output tone tags like ((warm)), ((slow)), or markdown bold/bullets.

### 14. Professional Representation (Rule 37):
- Use "we" / "hum" instead of "I" / "main" where appropriate to represent the company professionally.

### 15. Real-World Business Context (Rule 40):
- Use concrete examples, caller's industry context, and specific company offerings to explain points clearly.

### 16. Disinterest & DND Protocol vs. Call Wrap-Up (Rule 43, 54.4, 55):
- STRICT SEPARATION BETWEEN REJECTION (DND) AND NORMAL CALL WRAP-UP:
  * REJECTION / DND: Apologize for disturbing ("Maaf kariyega disturb karne ke liye, main note kar {'leti' if gender_tag == 'female' else 'leta'} hoon aur ensure {'karti' if gender_tag == 'female' else 'karta'} hoon ki aage se call na aaye. Have a good day!") ONLY when the customer rejects or objects ("nahi chahiye", "not interested", "wrong number", "don't call again").
  * NORMAL CALL WRAP-UP & USER HANG-UP COMMAND: If the customer agreed, booked an appointment, confirmed email/WhatsApp, or says "cut the call", "you can cut the call", "cut kar do", "phone rakh do", "goodbye", "have a good day", DO NOT EVER say "Maaf kariyega disturb karne ke liye"! The call was a SUCCESS!
  * Instead, acknowledge crisply in ONE short sentence: "Ji bilkul, thank you so much! Have a wonderful day!" or "Ji bilkul, aapse baat karke achha laga! Have a great day!" and wrap up cleanly.

### 17. WhatsApp & Email Confirmation and Reminders (Rule 47, 52, 53):
- We fully support automated email and WhatsApp/SMS booking confirmations and reminders.
- If the customer asks for Email reminder or confirmation ("email reminder aayega?", "kya aap mujhe mail par bhej sakte ho?", "send confirmation on email"):
  ALWAYS CONFIRM ENTHUSIASTICALLY:
  "Haan bilkul! Hum aapko email aur WhatsApp dono par confirmation aur reminder bhejte hain. Aap apna email address bata dijiye, main note kar {'leti' if gender_tag == 'female' else 'leta'} hoon."
  STRICTLY NEVER claim email sending or reminder is unavailable, unsupported, or that you cannot send email!
- Confirm preference: "Main details aapke WhatsApp par share kar doon ya email par?"
- If the customer asks for Email only, respect their preference: "Ji bilkul, main sirf aapke email par confirmation aur reminder bhej {v_bol.replace('bol', 'rahi' if gender_tag == 'female' else 'raha')} hoon."

### 18. Joe Girard Referral Engine (Rule 48):
- At successful closing: "Aapse baat karke bohot achha laga! Agar aapke circle ya network me kisi ko bhi zaroorat ho, toh unka contact hume zaroor batayiyega."

### 19. Context-Appropriate Closing & No Irrelevant Fillers (Rule 54.5, 54.7):
- When the customer says "Ya, me too. Good bye." or signals closing, DO NOT blurt out random enthusiasm fillers ("Arey waah, mujhe bhi aapse...").
- Say a crisp, professional closing: "Thank you so much! Have a wonderful day, goodbye!"
- Never leave a sentence half-spoken or hanging. Complete your thought concisely.
"""


def normalize_user_transcript(text: str, agent_name: str = "Aditi", is_female: bool = True) -> str:
    """
    Normalizes acoustic/phonetic mishearings from STT (Sarvam/Whisper) in Indian telephony contexts.
    Fixes:
    - 'haa aditi btao' being transcribed as 'हाँ दीदी बताओ' / 'दीदी बताओ'
    - 'दीदी' (didi) -> 'अदिति' (Aditi) when addressing female agent / Aditi
    - 'हा' -> 'हाँ'
    - 'त्रिनेत्र' -> 'त्रिनेत्रा'
    """
    if not text:
        return ""
    t = text.strip()

    # Rule 54.3 & 59: Sanitize non-target South Indian & regional scripts hallucinated by STT on background noise
    # (Kannada \u0C80-\u0CFF, Telugu \u0C00-\u0C7F, Tamil \u0B80-\u0BFF, Malayalam \u0D00-\u0D7F, Bengali \u0980-\u09FF, Gujarati \u0A80-\u0AFF, Gurmukhi \u0A00-\u0A7F, Odia \u0B00-\u0B7F)
    # when conversation is conducted in Hindi, Hinglish, or English.
    non_target_scripts_pattern = r'[\u0C80-\u0CFF\u0C00-\u0C7F\u0B80-\u0BFF\u0D00-\u0D7F\u0980-\u09FF\u0A80-\u0AFF\u0A00-\u0A7F\u0B00-\u0B7F]'
    if re.search(non_target_scripts_pattern, t):
        t_cleaned = re.sub(non_target_scripts_pattern, '', t).strip()
        # If the transcript was purely or almost entirely hallucinated script (e.g. "ಚಾವಲಿ ರೂಟಿ ಬೇಡ"), discard it
        if not t_cleaned or len(t_cleaned) < 2:
            return ""
        t = t_cleaned

    # Helper for exact word replacement in Devanagari text without broken \b
    def rep_deva(s: str, target: str, repl: str) -> str:
        pattern = r'(?<![^\s,।!?.])' + re.escape(target) + r'(?![^\s,।!?.])'
        return re.sub(pattern, repl, s)

    # 0. High-priority acoustic normalization for affirmative turns misheard by STT
    # Short utterances like "hn", "hn btao", "ha btao" or faint "haan" are frequently transcribed as digit "1", "one", "वन"
    t_clean = re.sub(r'[.,!?।]', '', t).strip().lower()
    if t_clean in ("1", "one", "वन", "ek", "ek minute", "एक", "hn", "hn btao", "ha btao", "haa btao", "haan btao", "h btao", "ha btaiye", "hn btaiye", "haan btaiye", "1 btao"):
        return "हाँ बताओ"
    if t_clean.startswith(("hn btao", "ha btao", "haa btao", "haan btao", "h btao", "1 btao")):
        return "हाँ बताओ"

    # 1. Normalize 'दीदी' / 'didi' to 'अदिति' / 'aditi' when agent is female / Aditi
    if is_female or "aditi" in (agent_name or "").lower():
        # Devanagari replacements:
        t = rep_deva(t, 'हाँ दीदी बताओ', 'हाँ अदिति बताओ')
        t = rep_deva(t, 'हां दीदी बताओ', 'हाँ अदिति बताओ')
        t = rep_deva(t, 'दीदी बताओ', 'अदिति बताओ')
        t = rep_deva(t, 'हा दीदी बताओ', 'हाँ अदिति बताओ')
        t = rep_deva(t, 'हाँ दीदी', 'हाँ अदिति')
        t = rep_deva(t, 'हां दीदी', 'हाँ अदिति')
        t = rep_deva(t, 'दीदी', 'अदिति')

        # Latin script replacements:
        t = re.sub(r'\b(haa|haan|ha)\s+didi\s*(batao|btao|bataiye|bolo|bolie|kahiye)?\b', r'haan aditi \2', t, flags=re.IGNORECASE)
        t = re.sub(r'\bdidi\s+(batao|btao|bataiye|bolo|bolie|kahiye)\b', r'aditi \1', t, flags=re.IGNORECASE)
        t = re.sub(r'\bdidi\b', r'aditi', t, flags=re.IGNORECASE)
        t = re.sub(r'\bbtao\b', r'batao', t, flags=re.IGNORECASE)

    # 2. Transliterate Devanagari digits to ASCII digits
    for deva, asc in DEVA_DIGITS_MAP.items():
        t = t.replace(deva, asc)

    # 3. Transliterate spoken Devanagari phonetic number words into English digits
    # E.g. 'टू नाइन फोर' -> '2 9 4' -> '294'
    deva_num_words = {
        'शून्य': '0', 'ज़ीरो': '0', 'जीरो': '0',
        'वन': '1', 'एक': '1',
        'टू': '2', 'दो': '2',
        'थ्री': '3', 'तीन': '3',
        'फोर': '4', 'चार': '4',
        'फाइव': '5', 'पाँच': '5', 'पांच': '5',
        'सिक्स': '6', 'छह': '6', 'छः': '6',
        'सेवन': '7', 'सात': '7',
        'एट': '8', 'आठ': '8',
        'नाइन': '9', 'नौ': '9',
    }
    for d_word, d_digit in deva_num_words.items():
        t = rep_deva(t, d_word, d_digit)

    # Transliterate spoken English number words into digits if sequence of numbers
    en_num_words = {
        'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
        'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9'
    }
    for e_word, e_digit in en_num_words.items():
        t = re.sub(rf'\b{e_word}\b', e_digit, t, flags=re.IGNORECASE)

    # Clean up spaced digits into unified numbers if sequence of digits: e.g. "2 9 4" -> "294" or "7 6 5 4 9 8 2 4" -> "76549824"
    t = re.sub(r'(?<=\b\d)\s+(?=\d\b)', '', t)
    t = re.sub(r'(?<=\b\d)\s+(?=\d\b)', '', t)

    # 4. Correct acoustic mishearings of prospect name
    t = rep_deva(t, 'रहा होगा', 'Raghav')

    # 5. Clean common transactional terms to natural Hinglish for readable transcripts
    t = rep_deva(t, 'मेरा नाम है', 'Mera naam hai')
    t = rep_deva(t, 'मेरा नाम', 'Mera naam')
    t = rep_deva(t, 'कांटेक्ट नंबर है', 'Contact number hai')
    t = rep_deva(t, 'कांटेक्ट नंबर', 'Contact number')
    t = rep_deva(t, 'अपॉइंटमेंट', 'appointment')
    t = rep_deva(t, 'शेड्यूल', 'schedule')
    t = rep_deva(t, 'कन्फर्म', 'confirm')

    # 6. General affirmative and brand normalizations
    t = rep_deva(t, 'हा बताओ', 'हाँ बताओ')
    t = rep_deva(t, 'हा', 'हाँ')
    t = rep_deva(t, 'त्रिनेत्र', 'त्रिनेत्रा')
    t = rep_deva(t, 'त्रिनेत्री', 'त्रिनेत्रा')
    t = rep_deva(t, 'त्रिनेत्रम', 'त्रिनेत्रा')
    t = re.sub(r'\b(trinetr|trinetri)\b', r'Trinetra', t, flags=re.IGNORECASE)

    return re.sub(r'\s+', ' ', t).strip()

SARVAM_MALE_VOICES = [
    'shubh', 'aditya', 'rahul', 'rohan', 'amit', 'dev', 'ratan', 'varun', 
    'manan', 'sumit', 'kabir', 'aayan', 'ashutosh', 'advait', 'anand', 
    'tarun', 'sunny', 'mani', 'gokul', 'vijay', 'mohit', 'rehan', 'soham',
    'arvind', 'neel', 'arjun', 'amol'
]
SARVAM_FEMALE_VOICES = [
    'aditi', 'ritu', 'priya', 'neha', 'pooja', 'simran', 'kavya', 'ishita', 'shreya', 
    'roopa', 'tanya', 'shruti', 'suhani', 'kavitha', 'rupali', 'amelia', 
    'sophia', 'anushka', 'maya', 'diya', 'meera', 'pavithra', 'sita', 'radha', 'leela', 
    'shimmer', 'alloy', 'nova', 'fable', 'rachel', 'domi', 'bella', 'elli', 'sarah'
]
sarvam_male = SARVAM_MALE_VOICES
sarvam_female = SARVAM_FEMALE_VOICES

# Task 2: Language to Sarvam voice mapping for dynamic mid-conversation language switching.
# Maps ISO language codes ('en' for English, 'hi' for Hindi/Hinglish) to appropriate Sarvam Bulbul v3 voice IDs.
LANGUAGE_VOICE_MAPPING = {
    'en': 'aditya',   # Clear, natural Indian-accented English voice (male)
    'hi': 'shubh',    # Fluent Hindi/Hinglish voice (male)
}

LANGUAGE_FEMALE_VOICE_MAPPING = {
    'en': 'amelia',   # Crisp, natural English voice for female agents (Anika)
    'hi': 'ritu',     # Fluent Hindi/Hinglish voice for female agents (Anika)
}

def create_appointment_tools(organization_id: str | None = None, user_id: str | None = None, agent_id: str | None = None, call_id: str | None = None) -> list:
    """
    Creates dynamic livekit.agents.llm FunctionTool instances for checking and booking appointments during live voice calls.
    """
    @llm.function_tool(description="Check whether an appointment already exists in the database for the caller using their phone number or name.")
    async def check_existing_appointment(phone_number: str = "", caller_name: str = "") -> str:
        """
        Check if an appointment exists in the database.
        Args:
            phone_number: Caller's phone number or contact digits (optional).
            caller_name: Name of the caller (optional).
        """
        try:
            cleaned = re.sub(r'\D', '', phone_number) if phone_number else ""
            if len(cleaned) > 10:
                if cleaned.startswith('91') and len(cleaned) == 12:
                    cleaned = cleaned[2:]
                elif cleaned.startswith('0') and len(cleaned) == 11:
                    cleaned = cleaned[1:]
            
            # Query appointments table
            query = supabase_admin.table("appointments").select("id, contact_name, contact_phone, scheduled_at, meeting_type, status, notes").order("created_at", desc=True)
            if caller_name and cleaned:
                query = query.or_(f"contact_phone.ilike.%{cleaned}%,contact_name.ilike.%{caller_name}%")
            elif cleaned:
                query = query.ilike("contact_phone", f"%{cleaned}%")
            elif caller_name:
                query = query.ilike("contact_name", f"%{caller_name}%")
            else:
                return "Please ask the caller for their name or registered phone number to check their appointment."
            
            res = await asyncio.to_thread(query.limit(3).execute)
            if res.data and len(res.data) > 0:
                matched = res.data[0]
                sch_time = matched.get("scheduled_at", "scheduled time")
                c_name = matched.get("contact_name") or caller_name or "Client"
                m_type = matched.get("meeting_type") or "Appointment"
                stat = matched.get("status") or "scheduled"
                return f"APPOINTMENT FOUND: {c_name} has a {m_type} appointment scheduled at {sch_time}. Status: {stat}."
            else:
                return f"NO APPOINTMENT FOUND: No existing appointment record was found in the database for {caller_name or phone_number}."
        except Exception as e:
            logger.error(f"[check_existing_appointment] Database lookup error: {e}")
            return f"NO APPOINTMENT FOUND: No appointment records found for {caller_name or phone_number}."

    @llm.function_tool(description="Book and register a new appointment slot for the customer directly into the database.")
    async def book_appointment_slot(caller_name: str = "", phone_number: str = "", scheduled_at: str = "", service_or_notes: str = "") -> str:
        """
        Book a new appointment slot.
        Args:
            caller_name: Customer's first and last name.
            phone_number: Customer's phone number.
            scheduled_at: Date and time for the appointment (e.g. 'Tomorrow 10 AM', '2026-09-28T10:00:00Z').
            service_or_notes: Details about what the appointment is for.
        """
        try:
            cleaned = re.sub(r'\D', '', phone_number) if phone_number else ""
            apt_payload = {
                "user_id": user_id,
                "agent_id": agent_id,
                "contact_name": caller_name or "Client",
                "contact_phone": cleaned or phone_number or "Online Caller",
                "scheduled_at": scheduled_at or "Upcoming",
                "duration_minutes": 30,
                "status": "scheduled",
                "booked_via": "voice",
                "meeting_type": "Appointment",
                "notes": service_or_notes or "Booked via voice agent conversation.",
                "voice_call_id": call_id,
            }
            res = await asyncio.to_thread(supabase_admin.table("appointments").insert(apt_payload).execute)
            
            # Immediately sync to customer_contacts
            if organization_id and (cleaned or phone_number):
                try:
                    from app.services.caller_lookup import CallerLookupService
                    c_svc = CallerLookupService(supabase_admin)
                    await c_svc.upsert_from_call(
                        organization_id=organization_id,
                        phone_number=cleaned or phone_number,
                        caller_name=caller_name,
                        call_summary=f"Booked appointment for {scheduled_at}. {service_or_notes}",
                        direction="inbound",
                        tags=["appointment", "customer"]
                    )
                except Exception as c_err:
                    logger.warning(f"[book_appointment_slot] Failed syncing customer contact: {c_err}")
            
            return f"APPOINTMENT CONFIRMED: Appointment successfully booked for {caller_name} at {scheduled_at}."
        except Exception as e:
            logger.error(f"[book_appointment_slot] Failed to book appointment: {e}")
            return f"Appointment noted for {caller_name} at {scheduled_at}."

    @llm.function_tool(description="Reschedule an existing appointment for the customer to a new requested date and time.")
    async def reschedule_appointment_slot(caller_name: str = "", phone_number: str = "", new_scheduled_at: str = "") -> str:
        """
        Reschedule an existing appointment slot.
        Args:
            caller_name: Customer's name.
            phone_number: Customer's phone number or contact digits.
            new_scheduled_at: The new requested date and time for the appointment.
        """
        try:
            cleaned = re.sub(r'\D', '', phone_number) if phone_number else ""
            if not new_scheduled_at:
                return "Please ask the customer for their preferred new date and time for rescheduling."

            query = supabase_admin.table("appointments").select("id, contact_name").order("created_at", desc=True)
            if cleaned:
                query = query.ilike("contact_phone", f"%{cleaned}%")
            elif caller_name:
                query = query.ilike("contact_name", f"%{caller_name}%")
            
            res = await asyncio.to_thread(query.limit(1).execute)
            if res.data and len(res.data) > 0:
                apt_id = res.data[0]["id"]
                await asyncio.to_thread(
                    supabase_admin.table("appointments")
                    .update({"scheduled_at": new_scheduled_at, "status": "rescheduled", "notes": f"Rescheduled via voice agent to {new_scheduled_at}"})
                    .eq("id", apt_id)
                    .execute
                )
                return f"APPOINTMENT RESCHEDULED: Appointment for {caller_name or 'the customer'} has been successfully moved to {new_scheduled_at}."
            else:
                return f"NO PRIOR APPOINTMENT FOUND: Could not find an existing booking for {caller_name or phone_number}. Would you like to book a new appointment slot for {new_scheduled_at}?"
        except Exception as e:
            logger.error(f"[reschedule_appointment_slot] Error: {e}")
            return f"Appointment reschedule noted for {new_scheduled_at}."

    @llm.function_tool(description="Call this immediately when the caller declines, objects to, or asks to stop call recording or consent.")
    async def decline_call_recording(reason: str = "caller_request") -> str:
        """
        Handle caller refusing or revoking recording consent.
        """
        try:
            outcome = await handle_caller_recording_decline(
                supabase_client=supabase_admin,
                room_name=call_id or "active_call",
                allow_unrecorded_continuation=True
            )
            return outcome.get("spoken_response", "Recording has been stopped at your request.")
        except Exception as err:
            logger.error(f"[decline_call_recording] Error: {err}")
            return "Recording has been stopped at your request. How can I help you?"

    @llm.function_tool(description="Call this when the caller asks to speak to a real human, customer support executive, representative, or manager.")
    async def transfer_to_human(reason: str = "caller_requested_human") -> str:
        """
        Transfer call to human operator or initiate human callback.
        """
        try:
            if call_id and supabase_admin:
                await asyncio.to_thread(
                    supabase_admin.table("voice_calls")
                    .update({"consent_outcome": "transferred", "call_status": "transferred"})
                    .eq("metadata->>room_name", call_id)
                    .execute
                )
            return "HUMAN TRANSFER INITIATED: Inform the caller warmly that you are connecting them to our human support executive, or taking down their details for an immediate callback if all lines are busy."
        except Exception as err:
            logger.error(f"[transfer_to_human] Error: {err}")
            return "Transferring you to a human representative right now."

    return [
        check_existing_appointment,
        book_appointment_slot,
        reschedule_appointment_slot,
        decline_call_recording,
        transfer_to_human
    ]

class VikramAgent(Agent):
    def __init__(
        self,
        instructions: str,
        voice_provider='sarvam',
        voice_id='shubh',
        voice_speed=1.0,
        voice_pitch=1.0,
        language='en-US',
        llm_provider: str | None = None,
        llm_model: str | None = None,
        temperature: float | None = None,
        tools: list | None = None,
    ):
        groq_api_key = os.getenv("GROQ_API_KEY", "")
        logger.info(f"[VikramAgent] __init__: GROQ_API_KEY length is {len(groq_api_key)}")
        logger.info(f"Using voice: {voice_id}")
        
        self.language = language
        # Track active TTS language state for dynamic language switching ('hi' or 'en')
        self._active_tts_language = "hi" if language in ['hinglish', 'hi-IN'] else "en"
        
        elevenlabs_male = ['pNInz6obpgDQGcFmaJgB', 'TxGEqnHWrfWFTfGW9XjX']
        self.gender = 'male' if voice_id in SARVAM_MALE_VOICES or voice_id in elevenlabs_male else 'female'

        if voice_provider == 'sarvam':
            # bulbul:v3 validation check: ensure speaker is compatible with bulbul:v3
            bulbul_v3_speakers = SARVAM_MALE_VOICES + SARVAM_FEMALE_VOICES
            if voice_id not in bulbul_v3_speakers:
                voice_id = 'ritu' if self.gender == 'female' else 'shubh'

            # Normalize pitch: Sarvam uses delta values where 0.0 is natural human voice.
            # Clamp to natural range [-0.5, 0.5]; values outside (e.g. 3.0) reset to natural 0.0.
            try:
                pitch_val = float(voice_pitch) if voice_pitch is not None else 0.0
                if abs(pitch_val) > 0.5:
                    sarvam_pitch = 0.0
                else:
                    sarvam_pitch = pitch_val
            except Exception:
                sarvam_pitch = 0.0

            sarvam_pace = voice_speed
            if sarvam_pace is None:
                sarvam_pace = 1.0
            sarvam_pace = max(0.5, min(2.0, sarvam_pace))

            # bulbul:v3 supported speakers
            bulbul_v3_speakers = {
                'aditya', 'ritu', 'ashutosh', 'priya', 'neha', 'rahul', 'pooja', 'rohan', 'simran',
                'kavya', 'amit', 'dev', 'ishita', 'shreya', 'ratan', 'varun', 'manan', 'sumit',
                'roopa', 'kabir', 'aayan', 'shubh', 'advait', 'anand', 'tanya', 'tarun', 'sunny',
                'mani', 'gokul', 'vijay', 'shruti', 'suhani', 'mohit', 'kavitha', 'rehan', 'soham', 'rupali'
            }
            # Map deprecated v2 speakers to closest v3 counterparts
            v2_to_v3_map = {
                'anushka': 'ritu',
                'manisha': 'ritu',
                'vidya': 'pooja',
                'arya': 'priya',
                'abhilash': 'aditya',
                'karun': 'rahul',
                'hitesh': 'amit'
            }
            if voice_id in v2_to_v3_map:
                sarvam_speaker = v2_to_v3_map[voice_id]
            elif voice_id in bulbul_v3_speakers:
                sarvam_speaker = voice_id
            else:
                sarvam_speaker = 'ritu' if self.gender == 'female' else 'aditya'

            model_name = "bulbul:v3"

            logger.info(f"[VikramAgent] Sarvam TTS config: model={model_name}, speaker={sarvam_speaker} (orig={voice_id}), pace={sarvam_pace}, pitch={sarvam_pitch}, lang={language}")

            # hi-IN provides fluent bilingual pronunciation for both Hindi and English words
            target_lang = "hi-IN" if language in ['hinglish', 'hi-IN', 'english'] else "en-IN"
            # WebRTC native sample rate: 24000 Hz (exact integer divisor of WebRTC 48kHz Opus)
            # linear16 sends raw uncompressed PCM, eliminating MP3 decode chunking jitter, clicks and voice breakages
            sarvam_sample_rate = int(os.getenv("SARVAM_SAMPLE_RATE", "24000"))

            # Voice crackling fix: Loudness > 1.0 pushes 16-bit linear16 PCM beyond 0 dBFS,
            # resulting in digital clipping crackle. Setting loudness=0.95 provides clean headroom
            # without digital waveform clipping distortion for both male and female voices.
            sarvam_loudness = float(os.getenv("SARVAM_LOUDNESS", "0.95"))

            # Task 1: Setting max_session_duration=0 forces a fresh WebSocket connection per TTS request,
            # eliminating audio degradation, packet jitter, and crackling caused by long-lived WebSockets.
            try:
                tts_plugin = sarvam.TTS(
                    target_language_code=target_lang,
                    model=model_name,
                    speaker=sarvam_speaker,
                    pace=sarvam_pace,
                    pitch=sarvam_pitch,
                    loudness=sarvam_loudness,
                    speech_sample_rate=sarvam_sample_rate,
                    output_audio_codec="linear16",
                    max_session_duration=0,  # type: ignore # Fresh WebSocket per request prevents connection degradation & crackling
                )
            except TypeError:
                # Fallback if installed sarvam plugin version manages max_session_duration via connection pool
                tts_plugin = sarvam.TTS(
                    target_language_code=target_lang,
                    model=model_name,
                    speaker=sarvam_speaker,
                    pace=sarvam_pace,
                    pitch=sarvam_pitch,
                    loudness=sarvam_loudness,
                    speech_sample_rate=sarvam_sample_rate,
                    output_audio_codec="linear16",
                )
                if hasattr(tts_plugin, "_pool"):
                    try:
                        tts_plugin._pool._max_session_duration = 0
                    except Exception:
                        pass
            except Exception as sarvam_err:
                logger.warning(f"[VikramAgent] Sarvam TTS custom init error ({sarvam_err}), falling back to safe linear16 defaults")
                try:
                    tts_plugin = sarvam.TTS(
                        target_language_code=target_lang,
                        model=model_name,
                        speaker=sarvam_speaker,
                        loudness=sarvam_loudness,
                        speech_sample_rate=sarvam_sample_rate,
                        output_audio_codec="linear16",
                        max_session_duration=0,  # type: ignore # Fresh WebSocket per request prevents degradation & crackling
                    )
                except TypeError:
                    tts_plugin = sarvam.TTS(
                        target_language_code=target_lang,
                        model=model_name,
                        speaker=sarvam_speaker,
                        loudness=sarvam_loudness,
                        speech_sample_rate=sarvam_sample_rate,
                        output_audio_codec="linear16",
                    )
                    if hasattr(tts_plugin, "_pool"):
                        try:
                            tts_plugin._pool._max_session_duration = 0
                        except Exception:
                            pass
        else:
            tts_plugin = elevenlabs.TTS(voice_id=voice_id)

        sarvam_api_key = os.getenv("SARVAM_API_KEY", "").strip()
        gemini_api_key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()

        # 1. Speech-to-Text: Use Sarvam Saaras v3 in codemix mode for authentic Hinglish & English digits recognition
        if sarvam_api_key and (voice_provider == 'sarvam' or language in ['hinglish', 'hi-IN']):
            stt_prompt = "Haan, batao, haanji, mera naam Raghav hai, contact number 9876543210, appointment schedule karna hai, Hello"
            try:
                stt_target_lang = "hi-IN" if language in ['hinglish', 'hi-IN'] else ("en-IN" if language in ['en', 'en-US', 'en-IN'] else language)
                stt_plugin = sarvam.STT(
                    model="saaras:v3",
                    mode="codemix",
                    language=stt_target_lang,
                    api_key=sarvam_api_key,
                    prompt=stt_prompt,
                )
                logger.info(f"[VikramAgent] Using Sarvam STT (saaras:v3, mode=codemix, language={stt_target_lang}) for Hinglish & English digits")
            except Exception as sarvam_stt_err:
                logger.warning(f"[VikramAgent] saaras:v3 codemix init failed ({sarvam_stt_err}), falling back to saarika:v2.5")
                stt_plugin = sarvam.STT(
                    model="saarika:v2.5",
                    language="hi-IN",
                    mode="transcribe",
                    api_key=sarvam_api_key,
                    prompt=stt_prompt,
                )
        else:
            stt_plugin = openai.STT(
                model="whisper-large-v3",
                base_url="https://api.groq.com/openai/v1",
                api_key=groq_api_key,
                detect_language=True,
                prompt="Namaste, Haan, Haanji, Batao, Hindi, Hinglish, English conversation.",
            )
            logger.info("[VikramAgent] Using Groq Whisper STT (whisper-large-v3, detect_language=True)")

        # Determine LLM Provider: Test Groq health if key present; automatically use Gemini 2.5 Flash if Groq invalid or unavailable
        chosen_provider = (llm_provider or os.getenv("LLM_PROVIDER", "groq")).strip().lower()
        chosen_model = (llm_model or os.getenv("LLM_MODEL", "")).strip()
        chosen_temp = float(temperature) if temperature is not None else 0.7

        global _groq_healthy
        if '_groq_healthy' not in globals():
            _groq_healthy = None

        if groq_api_key and _groq_healthy is None:
            try:
                # Fast 1.2s probe to verify Groq key validity
                with httpx.Client(timeout=1.2) as client:
                    probe_res = client.get(
                        "https://api.groq.com/openai/v1/models",
                        headers={"Authorization": f"Bearer {groq_api_key}"}
                    )
                    _groq_healthy = (probe_res.status_code == 200)
            except Exception:
                _groq_healthy = False
            logger.info(f"[VikramAgent] Groq health check result: {_groq_healthy}")

        use_groq = bool(groq_api_key) and (_groq_healthy is True) and (chosen_provider == "groq" or not gemini_api_key)

        # Telephony voice timeout: allow sufficient read time for reasoning models and tools without hanging
        llm_timeout = httpx.Timeout(connect=3.0, read=8.0, write=3.0, pool=3.0)

        if use_groq:
            valid_groq_models = (
                "openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"
            )
            if chosen_model and chosen_model.strip() and chosen_model.strip() in valid_groq_models:
                groq_model = chosen_model.strip()
            else:
                groq_model = "openai/gpt-oss-120b"

            llm_plugin = openai.LLM(
                model=groq_model,
                base_url="https://api.groq.com/openai/v1",
                api_key=groq_api_key,
                temperature=chosen_temp if temperature is not None else 0.6,
                max_completion_tokens=150,
                timeout=llm_timeout,
                max_retries=0,
            )
            logger.info(f"[VikramAgent] Using Groq LLM ({groq_model}) for zero-latency voice response")

            # Secondary failover LLM on Groq (using lightweight 20b model with low token footprint)
            fallback_model = "openai/gpt-oss-20b"
            self._fallback_llm = openai.LLM(
                model=fallback_model,
                base_url="https://api.groq.com/openai/v1",
                api_key=groq_api_key,
                temperature=chosen_temp if temperature is not None else 0.6,
                max_completion_tokens=150,
                timeout=llm_timeout,
                max_retries=1,
            )
            logger.info(f"[VikramAgent] Configured Groq ({fallback_model}) as secondary failover LLM")
        elif gemini_api_key:
            gemini_model = chosen_model if "gemini" in chosen_model.lower() else "gemini-2.5-flash"
            llm_plugin = openai.LLM(
                model=gemini_model,
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                api_key=gemini_api_key,
                temperature=chosen_temp,
                max_completion_tokens=150,
                timeout=llm_timeout,
                max_retries=0,
            )
            logger.info(f"[VikramAgent] Using Google Gemini LLM ({gemini_model}) via OpenAI-compatible endpoint")
            if groq_api_key:
                self._fallback_llm = openai.LLM(
                    model="openai/gpt-oss-120b",
                    base_url="https://api.groq.com/openai/v1",
                    api_key=groq_api_key,
                    temperature=chosen_temp if temperature is not None else 0.6,
                    max_completion_tokens=150,
                    timeout=llm_timeout,
                    max_retries=0,
                )
                logger.info("[VikramAgent] Configured Groq (openai/gpt-oss-120b) as secondary failover LLM")
            else:
                self._fallback_llm = None
        else:
            llm_plugin = openai.LLM(
                model="gpt-4o-mini",
                base_url="https://api.openai.com/v1",
                api_key=os.getenv("OPENAI_API_KEY", ""),
                temperature=chosen_temp,
                timeout=llm_timeout,
                max_retries=0,
            )
            logger.info("[VikramAgent] Using OpenAI GPT-4o-mini LLM")
            self._fallback_llm = None

        self.caller_gender = "male"
        self._has_introduced_self = False

        # Wrap TTS with ExpressiveTTSWrapper for SSML cleaning and gender-consistent verb correction
        wrapped_tts = ExpressiveTTSWrapper(
            tts_plugin,
            provider=voice_provider,
            gender=self.gender,
            caller_gender_fn=lambda: getattr(self, 'caller_gender', 'male')
        )

        # Directly pass wrapped TTS so LLM tokens stream to TTS in real time with zero buffering delay
        super().__init__(
            instructions=instructions,
            stt=stt_plugin,
            llm=llm_plugin,
            tts=wrapped_tts,
            vad=get_vad_model(),
            min_endpointing_delay=0.9,
            max_endpointing_delay=2.5,
            min_consecutive_speech_delay=0.4,
            use_tts_aligned_transcript=True,
            tools=tools or [],
        )

    def _detect_language(self, sample_text: str) -> str | None:
        """
        Lightweight language detector using langdetect with robust regex fallback for Hinglish vs English.
        Returns 'en' for English or 'hi' for Hindi/Hinglish.
        """
        if not sample_text or len(sample_text.strip()) < 5:
            return None

        # 1. Pure Devanagari script is definitely Hindi
        if re.search(r'[\u0900-\u097f]', sample_text):
            return 'hi'

        # 2. Characteristic Romanized Hindi (Hinglish) marker words
        hinglish_markers = r'\b(haan|haa|haanji|nahi|nhi|kaise|kya|aap|aapka|aapke|aapki|main|mera|meri|mere|batao|bataiye|baat|bolo|shukriya|namaste|theek|dhanyavad|karna|hoga|raha|rahi|hain|kuch|chahiye)\b'
        if re.search(hinglish_markers, sample_text, re.IGNORECASE):
            return 'hi'

        # 3. Use langdetect library for probabilistic detection
        try:
            from langdetect import detect  # type: ignore
            code = detect(sample_text)
            if code == 'en':
                return 'en'
            elif code in ('hi', 'mr', 'ne', 'gu', 'bn', 'pa'):
                return 'hi'
            elif any(w in sample_text.lower().split() for w in ['hello', 'hi', 'thank', 'thanks', 'sure', 'yes', 'welcome', 'pricing', 'service', 'demo', 'call', 'appointment', 'schedule', 'details', 'interested', 'free', 'help']):
                return 'en'
        except Exception:
            pass

        # 4. English word frequency fallback heuristic
        english_words = {'the', 'is', 'are', 'you', 'your', 'how', 'can', 'help', 'today', 'call', 'we', 'our', 'what', 'would', 'like', 'to', 'for', 'about', 'thank', 'please'}
        words = set(re.findall(r'[a-zA-Z]+', sample_text.lower()))
        if len(words.intersection(english_words)) >= 2:
            return 'en'

        return None

    async def tts_node(
        self, text: AsyncIterable[str], model_settings: ModelSettings
    ) -> AsyncGenerator[Any, None]:
        """
        Task 2: Dynamic mid-conversation language switching node.
        Overrides Agent.tts_node to accumulate the incoming text stream.
        Once >= 20 characters are gathered, runs language detection.
        If the detected language is different from active language, calls self.tts.update_options()
        with the new language code and corresponding Sarvam voice ID.
        """
        buffered_chunks: list[str] = []
        total_len = 0
        text_iter = text.__aiter__()

        # Step 1: Accumulate incoming text stream chunks until we have at least 20 characters
        while total_len < 20:
            try:
                chunk = await text_iter.__anext__()
                buffered_chunks.append(chunk)
                total_len += len(chunk)
            except StopAsyncIteration:
                break

        accumulated_text = "".join(buffered_chunks).strip()

        # Step 2: Run language detection once at least 20 characters are accumulated
        if accumulated_text:
            clean_text_sample = clean_ssml(accumulated_text)
            detected_lang = self._detect_language(clean_text_sample)

            if detected_lang:
                current_active_lang = getattr(self, '_active_tts_language', 'hi')

                # Step 3: If detected language differs from currently active language, switch voice dynamically
                if detected_lang != current_active_lang:
                    is_female = getattr(self, 'gender', 'male') == 'female'
                    voice_map = LANGUAGE_FEMALE_VOICE_MAPPING if is_female else LANGUAGE_VOICE_MAPPING
                    new_voice_id = voice_map.get(detected_lang, 'shubh' if not is_female else 'ritu')
                    new_target_lang = "en-IN" if detected_lang == "en" else "hi-IN"

                    logger.info(
                        f"[VikramAgent] Dynamic language switch triggered: {current_active_lang} -> {detected_lang}. "
                        f"Updating Sarvam TTS: speaker={new_voice_id}, target_lang={new_target_lang}"
                    )

                    try:
                        if hasattr(self.tts, "update_options"):
                            self.tts.update_options(
                                target_language_code=new_target_lang,
                                speaker=new_voice_id
                            )
                        self._active_tts_language = detected_lang
                    except Exception as switch_err:
                        logger.warning(f"[VikramAgent] Failed to update TTS options dynamically: {switch_err}")

        # Step 4: Forward the buffered chunks and subsequent streaming chunks to the underlying TTS node
        async def _forward_text_stream() -> AsyncIterable[str]:
            for chunk in buffered_chunks:
                yield chunk
            async for chunk in text_iter:
                yield chunk

        async for frame in Agent.default.tts_node(self, _forward_text_stream(), model_settings):
            yield frame

    async def on_user_turn_completed(
        self, turn_ctx: llm.ChatContext, new_message: llm.ChatMessage
    ) -> None:
        """
        Intercepts user turn right before the LLM generates a response:
        1. Normalizes phonetic mishearings in user speech ('हाँ दीदी बताओ' -> 'हाँ अदिति बताओ').
        2. Dynamically detects caller gender from their speech signals.
        3. If caller gave affirmative permission to speak ('haan', 'batao', 'bolo', etc.) in early turns:
           Injects a high-priority turn instruction to pitch the campaign reason and strictly forbids goodbye.
        """
        try:
            if new_message and new_message.content:
                raw_txt = new_message.raw_text_content or ""
                # Dynamically detect caller gender from speech signals or introductions
                if re.search(r'\b(main\s+.*?\s+(?:raha\s+hoon|raha\s+tha|sakta\s+hoon|karta\s+hoon|gaya\s+tha|aaya\s+tha)|mera\s+naam\s+(?:raghav|rahul|ketan|amit|rohit|vikram|varun|suresh|ramesh|ayush|mohit|deepak|sachin|abhishek|harsh))\b', raw_txt, re.IGNORECASE):
                    self.caller_gender = "male"
                    logger.info("[VikramAgent] Caller identified as male based on speech cues")
                elif re.search(r'\b(main\s+.*?\s+(?:rahi\s+hoon|rahi\s+thi|sakti\s+hoon|karti\s+hoon|gayi\s+thi|aayi\s+thi)|mera\s+naam\s+(?:priya|pooja|neha|ananya|aarti|shreya|simran|kavita|sunita|divya|sneha|riya))\b', raw_txt, re.IGNORECASE):
                    self.caller_gender = "female"
                    logger.info("[VikramAgent] Caller identified as female based on speech cues")

                agent_name = getattr(self, 'bot_name', None) or 'Agent'
                is_female = getattr(self, 'gender', 'male') == 'female'
                v_bol = "bol rahi hoon" if is_female else "bol raha hoon"
                v_sun = "sun rahi hoon" if is_female else "sun raha hoon"
                v_samajh = "samajh sakti hoon" if is_female else "samajh sakta hoon"
                v_call = "call nahi karungi" if is_female else "call nahi karunga"

                norm_txt = normalize_user_transcript(raw_txt, agent_name=agent_name, is_female=is_female)

                if norm_txt and norm_txt != raw_txt:
                    logger.info(f"[VikramAgent] Normalized user utterance: '{raw_txt}' -> '{norm_txt}'")
                    new_message.content = [norm_txt]

                # Check conversation turns so far
                msgs_fn = getattr(turn_ctx, 'messages', None)
                chat_messages = msgs_fn() if callable(msgs_fn) else (msgs_fn or [])
                turn_count = len([m for m in chat_messages if getattr(m, 'role', '') in ('user', 'assistant')])

                t_lower = (norm_txt or raw_txt).lower().strip()

                flow_instruction = None

                # 1. Zero Re-Introduction Guard: If caller says "hello", "sun rahe ho", "are you there" mid-call
                liveness_words = ["hello", "helo", "hello?", "are you there", "sun rahe ho", "sun rhe ho", "sunai de raha", "awaaz aa rahi", "hello hello", "sun rahe"]
                # Only treat as liveness check if utterance is short (<= 3 words), so full sentences like "Hello, main kal baat karunga" are not hijacked!
                is_liveness_check = any((t_lower == lw or t_lower.startswith(lw)) and len(t_lower.split()) <= 3 for lw in liveness_words)

                if is_liveness_check and (turn_count >= 1 or getattr(self, '_has_introduced_self', False)):
                    flow_instruction = (
                        f"[CRITICAL FLOW NOTE: The caller is checking if you are still on the line ('{norm_txt}'). "
                        f"STRICTLY DO NOT RE-INTRODUCE YOURSELF! DO NOT say 'Main {agent_name} {v_bol}' or repeat your greeting or purpose! "
                        f"Simply confirm you are listening and ask how to proceed: e.g. 'Ji sir, main bilkul {v_sun}, boliye na?' or 'Haan ji sir, main yahin hoon.']"
                    )

                # 2. Outside / In-Transit Objection Handling (Saad 15-second walking hook)
                outside_words = ["bahar hoon", "bahar hu", "market mein", "market me", "outside", "on the road", "driving", "drive kar raha", "drive kar rha", "chalte chalte", "raste mein", "raste me"]
                is_outside = any(ow in t_lower for ow in outside_words)

                if is_outside and not flow_instruction:
                    flow_instruction = (
                        f"[CRITICAL OBJECTION HANDLING: The caller mentioned they are outside / in transit ('{norm_txt}'). "
                        f"DO NOT immediately ask for callback timing! Use the Saad 15-second walking hook: "
                        f"Warmly acknowledge, say you won't take long, and ask for literally 15 seconds while they walk: "
                        f"'Arre bilkul sir, main {v_samajh} aap bahar hain. Bas 15 second dijiye chalte-chalte—ek zaruri baat share kar doon, agar relevant na lage toh aap turant mana kar dena. Chalega sir?']"
                    )

                # 2.5 Call Cut / End Command Guard (Rule 54.4 & 55)
                cut_triggers = [
                    "cut the call", "you can cut", "cut kar do", "cut kar dijiye",
                    "cut kar 2", "cut kar de", "phone rakh do", "phone rakh", "phone kaat",
                    "call cut", "disconnect kar", "call disconnect", "call kaat", "phone cut",
                    "cut kar do call", "call kaat do"
                ]
                is_user_cut = any(cut_kw in t_lower for cut_kw in cut_triggers)
                if is_user_cut and not flow_instruction:
                    self._user_demanded_cut = True
                    flow_instruction = (
                        f"[CRITICAL FLOW NOTE: The caller requested to end the call ('{norm_txt}'). "
                        f"STRICTLY DO NOT APOLOGIZE FOR DISTURBING! DO NOT SAY 'Maaf kariyega disturb karne ke liye'! "
                        f"The conversation was successful. Reply warmly in ONE short sentence (under 8 words): "
                        f"'Ji bilkul, thank you so much! Have a wonderful day!' and close immediately.]"
                    )

                # 3. Refusal / "No I don't want it" Objection Handling (Saad Wall Breaker)
                rejection_words = ["nahi chahiye", "nhi chahiye", "don't want", "dont want", "not interested", "nahi lena", "nhi lena", "koi zaroorat nahi", "koi jarurat nahi", "nahi chahiye mujhe"]
                is_rejection = any(rw in t_lower for rw in rejection_words)

                if is_rejection and not flow_instruction:
                    flow_instruction = (
                        f"[CRITICAL OBJECTION HANDLING: The caller expressed hesitation ('{norm_txt}'). "
                        f"DO NOT go silent, freeze, or say goodbye immediately! Use Saad's Wall Breaker: "
                        f"'Sach kahun sir, mujhe abhi yeh bhi nahi pata ki aapko iski zaroorat hai ya nahi! Maine toh bataya bhi nahi hum exactly kya karte hain. Mujhe bas 15 second dijiye—agar 1% bhi aapke kaam ka na lage, toh main dubara kabhi {v_call}. Deal sir?']"
                    )

                # 3.5 Callback / Reschedule Request Handling
                callback_triggers = [
                    "phone kar sakte ho", "phone kar sakte", "phone kar skte", "call kar sakte", "call kar skte",
                    "baad mein phone", "baad me phone", "baad mein call", "baad me call", "baad me bat", "baad mein baat",
                    "call later", "call me later", "call back", "callback", "shaam ko call", "kal call", "kal phone", "phir call", "fir call",
                    "call karna", "kal karna", "baje call", "kal 2 baje", "kal dopahar", "kal subah", "kal shaam", "baad mein", "baad me"
                ]
                is_callback_request = any(cb in t_lower for cb in callback_triggers)

                if is_callback_request and not flow_instruction:
                    v_connect = "connect kar lungi" if is_female else "connect kar lunga"
                    v_samajh_short = "sakti" if is_female else "sakta"
                    has_specific_time = any(kw in t_lower for kw in ["baje", "kal", "shaam", "dopahar", "subah", "tomorrow", "pm", "am", "2 baje", "11 baje", "5 baje"])
                    if has_specific_time:
                        flow_instruction = (
                            f"[CRITICAL FLOW NOTE: The caller requested a callback at a specific time ('{norm_txt}'). "
                            f"Do NOT ask for another timing! Confidently confirm that exact time requested: "
                            f"'Bilkul sir, main kal us time pe aapse {v_connect}. Aapka bohot shukriya, have a great day ahead!']"
                        )
                    else:
                        flow_instruction = (
                            f"[CRITICAL FLOW NOTE: The caller requested a callback at a later time ('{norm_txt}'). "
                            f"STRICTLY DO NOT HANG UP! Warmly agree and offer 2 specific time options to confirm: "
                            f"'Bilkul sir, main samajh {v_samajh_short} hoon. Main aapko convenient time pe {v_connect}—aaj shaam 5 baje theek rahega ya kal subah 11 baje?']"
                        )

                # 4. Affirmative permission in early turns (ONLY for outbound campaign calls, max once per call)
                is_outbound = getattr(self, 'call_direction', 'inbound') == 'outbound' or bool(getattr(self, 'campaign_contact', None))
                if is_outbound and not getattr(self, '_intro_hook_done', False):
                    affirmative_pattern = r'\b(haan|haa|batao|btao|bataiye|bolo|bolie|kahiye|yes|sure|go ahead)\b|[हाँ|हां|बताओ|बताइए|बोलो|बोलिए|कहिए]'
                    is_affirmative = bool(re.search(affirmative_pattern, t_lower, flags=re.IGNORECASE))

                    if is_affirmative and turn_count <= 3 and not is_outside and not is_rejection and not flow_instruction:
                        self._intro_hook_done = True
                        campaign_goal = getattr(self, 'campaign_goal', '') or 'Discuss our products, services, and pricing'
                        c_name = getattr(self, 'prospect_name', '')
                        name_prompt = f" to {c_name}" if c_name else ""
                        gender_instr = ""
                        if getattr(self, 'gender', '') == 'female':
                            gender_instr = " CRITICAL GRAMMAR: You are FEMALE. Use strictly feminine verb forms ('karti hoon', 'bol rahi hoon', 'kar sakti hoon', 'chahti hoon', 'bhej deti hoon', 'seedhi baat karti hoon'). NEVER use male endings ('karta hoon', 'raha hoon', 'sakta hoon')."
                        elif getattr(self, 'gender', '') == 'male':
                            gender_instr = " CRITICAL GRAMMAR: You are MALE. Use strictly masculine verb forms ('karta hoon', 'bol raha hoon', 'kar sakta hoon', 'chahta hoon', 'bhej deta hoon', 'seedhi baat karta hoon')."
                        intro_needed = ""
                        greet_msg = getattr(self, 'greeting_message', '') or ''
                        agent_name_val = getattr(self, 'bot_name', 'Aditi')
                        b_name_val = getattr(self, 'business_name', '')
                        if agent_name_val and agent_name_val.lower() not in greet_msg.lower() and not getattr(self, '_has_introduced_self', False):
                            verb_intro = "bol rahi hoon" if getattr(self, 'gender', '') == 'female' else "bol raha hoon"
                            comp_intro = f" {b_name_val} se" if b_name_val else ""
                            intro_needed = f" Since you only checked their identity in your greeting, introduce yourself now: 'Namaste{name_prompt}! Main{comp_intro} {agent_name_val} {verb_intro}.' "
                            self._has_introduced_self = True

                        flow_instruction = (
                            f"[CRITICAL FLOW NOTE: The prospect just confirmed / gave permission to speak ('{norm_txt}'). {intro_needed}"
                            f"State why you called: '{campaign_goal}'.{gender_instr} "
                            f"Keep your response strictly short (1-2 sentences), speak naturally, and ask ONE discovery question. DO NOT say goodbye, DO NOT say '{getattr(self, 'ending_message', '')}'!]"
                        )

                # Store flow instruction on agent instance for transient injection in llm_node
                if flow_instruction:
                    self._pending_flow_instruction = flow_instruction

                # Keep new_message.content strictly containing the clean user utterance!
                # NEVER append flow instructions here, otherwise they leak into the data channel transcript and DB logs.
                current_turn = norm_txt or raw_txt
                new_message.content = [current_turn]
        except Exception as e:
            logger.warning(f"[VikramAgent] on_user_turn_completed exception: {e}")

    async def on_enter(self):
        if hasattr(self, 'config_task') and self.config_task:
            try:
                await self.config_task
            except Exception as e:
                logger.error(f"Error awaiting config task in on_enter: {e}")

        # Safely resolve room object
        room = getattr(self, 'room', None)
        if not room and hasattr(self, 'session') and self.session:
            room = getattr(self.session, 'room', None)
        
        room_name = getattr(room, 'name', '') if room else ''
        logger.info(f"[VikramAgent] on_enter for room '{room_name}'. Waiting for remote participant to connect...")
        for _ in range(20): # check every 30ms up to 0.6s max for remote human/caller
            remotes = getattr(room, 'remote_participants', {}) if room else {}
            if remotes:
                has_participant = any(
                    not (getattr(p, 'identity', '').startswith("agent") or "vikram" in getattr(p, 'identity', '').lower())
                    for p in remotes.values()
                )
                if has_participant:
                    logger.info(f"[VikramAgent] Remote participant connected in room '{room_name}'!")
                    break
            await asyncio.sleep(0.03)
        # Brief settle time for browser to subscribe to audio tracks so greeting is clearly heard
        await asyncio.sleep(0.1)

        greeting = getattr(self, 'greeting_message', None)
        if not greeting or not str(greeting).strip():
            b_name = getattr(self, 'bot_name', None) or "Aditi"
            b_comp = getattr(self, 'business_name', '')
            gender = getattr(self, 'gender', 'female')
            greeting, _, _ = build_compliant_greeting(
                raw_greeting=None,
                clean_name=b_name,
                business_name=b_comp,
                direction="inbound",
                language=getattr(self, 'language', 'hinglish'),
                gender_tag=gender
            )
            logger.info(f"[VikramAgent] Constructed compliant fallback greeting: '{greeting}'")

        # If greeting already introduced the agent name, mark as introduced so agent never repeats it
        agent_name_val = getattr(self, 'bot_name', '')
        if agent_name_val and agent_name_val.lower() in str(greeting).lower():
            self._has_introduced_self = True

        logger.info(f"[VikramAgent] Speaking greeting: '{greeting}'")
        print(f"[Agent] Speaking greeting: '{greeting}'", flush=True)
        await self.session.say(
            greeting,
            allow_interruptions=False
        )

    def _clean_chunk(self, chunk):
        gender = getattr(self, 'gender', '')
        caller_g = getattr(self, 'caller_gender', 'male')
        if not gender:
            return chunk
        if isinstance(chunk, str):
            return fix_gender_verbs(clean_ssml(chunk), gender, caller_gender=caller_g)
        try:
            if hasattr(chunk, 'choices') and chunk.choices:
                choice = chunk.choices[0]
                if hasattr(choice, 'delta') and choice.delta and hasattr(choice.delta, 'content') and choice.delta.content:
                    choice.delta.content = fix_gender_verbs(clean_ssml(choice.delta.content), gender, caller_gender=caller_g)
        except Exception:
            pass
        return chunk

    async def llm_node(
        self,
        chat_ctx: llm.ChatContext,
        tools: list[llm.Tool],
        model_settings: ModelSettings,
    ):
        """
        Custom LLM node for VikramAgent:
        1. Context Sliding Window: Truncate to the last 30 conversation items while preserving
           the system prompt. Retains caller name, phone number, and conversation continuity throughout the call.
        2. Transient Flow Instruction Injection: Injects flow instructions into the truncated copy
           for this turn only, without polluting permanent conversation history or leaking to user transcripts.
        3. Dual-Tier Zero-Silence Fallback: If primary LLM encounters a 429 rate limit or network glitch,
           immediately streams from the secondary high-capacity model (e.g. Gemini 2.5 Flash or Groq llama-3.1-8b).
        4. Emergency conversational anchor: If all LLMs fail, yields a polite bridge so the call doesn't stall.
        """
        flow_instruction = getattr(self, '_pending_flow_instruction', None)
        self._pending_flow_instruction = None

        # Truncate context: preserve system message + last 12 conversation turns (keeps tokens well below Groq 8000 ITPM limit)
        truncated_ctx = chat_ctx.copy().truncate(max_items=12)

        # Inject flow instruction and continuity reminder transiently into truncated_ctx without polluting chat_ctx or user transcript
        if hasattr(truncated_ctx, '_items') and truncated_ctx._items:
            last_item = truncated_ctx._items[-1]
            if getattr(last_item, 'role', '') == 'user':
                orig_text = getattr(last_item, 'text_content', '') or (last_item.content[0] if last_item.content else '')
                guidance_parts = []
                if getattr(self, '_has_introduced_self', False):
                    guidance_parts.append("[CONTINUITY: You have ALREADY introduced yourself. STRICTLY NEVER repeat 'Hello, mai...' or re-introduce yourself. Respond directly.]")
                if flow_instruction:
                    guidance_parts.append(f"[CONVERSATION GUIDANCE FOR THIS TURN]:\n{flow_instruction}")
                if guidance_parts:
                    truncated_ctx._items[-1] = llm.ChatMessage(
                        role="user",
                        content=[f"{orig_text}\n\n" + "\n\n".join(guidance_parts)]
                    )

        try:
            async for chunk in Agent.default.llm_node(self, truncated_ctx, tools, model_settings):
                yield self._clean_chunk(chunk)
            return
        except Exception as llm_err:
            logger.warning(f"[VikramAgent] Primary LLM failed ({llm_err}). Triggering failover to secondary model...")

        # Tier 2: Secondary failover LLM
        if hasattr(self, '_fallback_llm') and self._fallback_llm:
            try:
                self._llm = self._fallback_llm  # Promote fallback LLM directly on private attribute (avoids read-only property setter crash)
                async for chunk in Agent.default.llm_node(self, truncated_ctx, tools, model_settings):
                    yield self._clean_chunk(chunk)
                logger.info("[VikramAgent] Fallback LLM streamed successfully and promoted to primary LLM!")
                return
            except Exception as fb_err:
                logger.error(f"[VikramAgent] Fallback LLM also failed: {fb_err}")

        # Tier 3: Emergency conversational anchor (instant zero-silence safety with dynamic variation)
        from livekit.agents.llm import ChatChunk, ChoiceDelta
        def _make_text_chunk(t_str: str):
            return ChatChunk(
                delta=ChoiceDelta(
                    role="assistant",
                    content=t_str
                )
            )

        is_english = getattr(self, 'language', 'hinglish').lower() in ('english', 'en', 'en-in', 'en-us')
        gender = getattr(self, 'gender', 'male')
        verb = "rahi" if gender == "female" else "raha"

        bridge_count = getattr(self, '_emergency_bridge_count', 0)
        self._emergency_bridge_count = bridge_count + 1

        if is_english:
            if bridge_count % 2 == 0:
                yield self._clean_chunk(_make_text_chunk("Yes, I'm right here! Please go ahead."))
            else:
                yield self._clean_chunk(_make_text_chunk("I'm checking the details for you right now, please give me just a moment."))
        else:
            if bridge_count % 3 == 0:
                yield self._clean_chunk(_make_text_chunk(f"Ji sir, main bilkul sun {verb} hoon, boliye na?"))
            elif bridge_count % 3 == 1:
                yield self._clean_chunk(_make_text_chunk("Haan ji, main details check kar rahi hoon. Ek second dijiyega."))
            else:
                yield self._clean_chunk(_make_text_chunk("Aapka appointment book karna hai ya check karna hai, kripya bata dijiye?"))

async def fetch_knowledge_base(agent_id: str, timeout: float = 5.0) -> list:
    """Fetch parsed documents for this agent with a strict timeout to avoid blocking agent startup."""
    try:
        data = await asyncio.wait_for(
            asyncio.to_thread(
                supabase_admin.table('agent_knowledge')
                .select('name, content_excerpt')
                .eq('agent_id', agent_id)
                .eq('status', 'ready')
                .execute
            ),
            timeout=timeout
        )
        return data.data or []
    except asyncio.TimeoutError:
        logger.warning(f"[fetch_knowledge_base] Timed out after {timeout}s for agent {agent_id} — skipping KB")
        return []
    except Exception as e:
        logger.error(f"Failed to fetch KB: {e}")
        return []


async def extract_and_save_lead(transcript: str, agent_id: str, user_id: str, organization_id: str, duration_seconds: int = 0, call_sid: str | None = None, contact_id: str | None = None, room_name: str | None = None):
    """Extract lead information and callbacks from call transcript and save to DB"""
    if not transcript or not transcript.strip():
        logger.warning("[extract_and_save_lead] Called with empty transcript, skipping.")
        return

    logger.info(f"[extract_and_save_lead] Saving call ({duration_seconds}s) for room={room_name}, call_sid={call_sid}, contact={contact_id} with transcript length {len(transcript)}...")

    # 1. ALWAYS save voice_call record FIRST with transcript so call logs are never lost
    original_call_id = None
    existing_call = None

    # Step A: Look up by room_name first (most deterministic link to the active call session)
    if room_name:
        try:
            res_room = await asyncio.to_thread(
                supabase_admin.table("voice_calls").select("id, user_id, agent_id, caller_phone, caller_name, metadata")
                .filter("metadata->>room_name", "eq", room_name)
                .order("created_at", desc=True)
                .limit(1)
                .execute
            )
            if res_room.data and len(res_room.data) > 0:
                existing_call = res_room.data[0]
                logger.info(f"[extract_and_save_lead] Matched existing voice_call {existing_call['id']} by room_name '{room_name}'")
        except Exception as e:
            logger.warning(f"Failed to lookup existing call by room_name {room_name}: {e}")

    # Step B: Fallback to call_sid
    if not existing_call and call_sid:
        try:
            res = await asyncio.to_thread(
                supabase_admin.table("voice_calls").select("id, user_id, agent_id, caller_phone, caller_name, metadata")
                .or_(f"metadata->>provider_call_id.eq.{call_sid},metadata->>session_id.eq.{call_sid},id.eq.{call_sid}")
                .order("created_at", desc=True)
                .limit(1).execute
            )
            if res.data and len(res.data) > 0:
                existing_call = res.data[0]
                logger.info(f"[extract_and_save_lead] Matched existing voice_call {existing_call['id']} by call_sid '{call_sid}'")
        except Exception as e:
            logger.error(f"Failed to lookup existing call by call_sid {call_sid}: {e}")

    # Resolve user_id and agent_id if missing to guarantee post-call notification delivery
    if not user_id and existing_call and existing_call.get("user_id"):
        user_id = existing_call.get("user_id")
    if not agent_id and existing_call and existing_call.get("agent_id"):
        agent_id = existing_call.get("agent_id")
    b_name_extracted = "Trinetra AI"
    if agent_id:
        try:
            ag_lookup = await asyncio.to_thread(
                supabase_admin.table("agents").select("user_id, organization_id, business_name, company_name, name").eq("id", agent_id).maybe_single().execute
            )
            if ag_lookup and ag_lookup.data:
                if not user_id:
                    user_id = ag_lookup.data.get("user_id")
                if not organization_id:
                    organization_id = ag_lookup.data.get("organization_id")
                b_name_extracted = ag_lookup.data.get("business_name") or ag_lookup.data.get("company_name") or ag_lookup.data.get("name") or "Trinetra AI"
        except Exception as lookup_err:
            logger.warning(f"[extract_and_save_lead] Failed to lookup user_id and business_name from agents table: {lookup_err}")

    # Resolve contact_id from existing metadata if not already passed
    if not contact_id and existing_call and existing_call.get("metadata"):
        contact_id = existing_call["metadata"].get("contact_id")

    try:
        if existing_call:
            logger.info(f"Updating existing voice_call record {existing_call['id']} with transcript ({duration_seconds}s)")
            call_res = await asyncio.to_thread(
                supabase_admin.table("voice_calls").update({
                    "transcript": transcript,
                    "status": "completed",
                    "duration_seconds": duration_seconds
                }).eq("id", existing_call["id"]).execute
            )
            original_call_id = existing_call["id"]
        else:
            logger.info(f"Inserting new voice_call record with transcript for room {room_name or 'unknown'}")
            new_meta = {}
            if room_name: new_meta["room_name"] = room_name
            if call_sid: new_meta["provider_call_id"] = call_sid; new_meta["session_id"] = call_sid
            if contact_id: new_meta["contact_id"] = contact_id
            call_res = await asyncio.to_thread(
                supabase_admin.table("voice_calls").insert({
                    "user_id": user_id,
                    "agent_id": agent_id,
                    "organization_id": organization_id,
                    "transcript": transcript,
                    "sentiment": "neutral",
                    "status": "completed",
                    "duration_seconds": duration_seconds,
                    "metadata": new_meta
                }).execute
            )
            if call_res.data:
                original_call_id = call_res.data[0].get("id")
    except Exception as e:
        logger.error(f"Failed to save initial voice call record: {e}")

    # 2. Extract Lead, Callback, and Sentiment using Gemini Flash (or Groq fallback)
    gemini_key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    
    # Detect caller country and timezone from caller_phone or room metadata
    initial_phone = (existing_call.get("caller_phone") if existing_call else "") or (call_sid or "") or ""
    phone_check = str(initial_phone)
    clean_digits = re.sub(r'\D', '', phone_check)
    if phone_check.startswith("+91") or phone_check.startswith("91") or (len(clean_digits) == 10 and clean_digits[0] in '6789'):
        caller_tz = "Asia/Kolkata"
        tz_label = "IST (UTC+05:30)"
    elif phone_check.startswith("+44"):
        caller_tz = "Europe/London"
        tz_label = "BST/GMT (UTC+00:00/+01:00)"
    elif phone_check.startswith("+1"):
        caller_tz = "America/New_York"
        tz_label = "US Eastern (UTC-04:00/05:00)"
    else:
        caller_tz = "Asia/Kolkata"
        tz_label = "IST (UTC+05:30)"

    import zoneinfo
    try:
        caller_local_now = datetime.now(zoneinfo.ZoneInfo(caller_tz)).strftime('%Y-%m-%d %I:%M %p')
    except Exception:
        caller_local_now = datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')

    current_time_str = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')

    prompt = f"""Analyze this sales call transcript and extract lead and callback information.
    
Transcript:
{transcript[:4000]}

Current UTC time is {current_time_str}.
Caller's local timezone is {caller_tz} ({tz_label}).
Caller's current local time is {caller_local_now}.

IMPORTANT TIMEZONE DIRECTIVE:
If the caller requested a callback (e.g. "kal 10 baje", "shaam 5 baje", "call tomorrow morning at 10 AM", "call in 2 hours"):
Interpret their requested time in their LOCAL timezone ({caller_tz}), and convert that exact time to UTC ISO-8601 ending in 'Z' for callback_time_iso.

Return a JSON object with:
- is_lead: boolean. MUST BE TRUE IF the caller showed genuine commercial interest in purchasing products/services, asked about pricing/features, or agreed to a sales demo/consultation/callback for buying. MUST BE FALSE IF the call was an existing customer checking status/appointment, customer support issue, billing inquiry, greeting-only, or no commercial buying intent.
- appointment_booked: boolean. MUST BE TRUE ONLY IF a NEW appointment, meeting, or demo was scheduled/booked during this call. MUST BE FALSE IF the caller was merely checking an existing appointment, verifying status, or asking about a previous booking.
- is_appointment_check: boolean. MUST BE TRUE if the caller called to check, verify, or inquire about an existing appointment without booking a new commercial sales demo.
- appointment_time_iso: a guess of the ISO-8601 datetime for the appointment (in UTC), based on the day/time mentioned (e.g. 5 PM, 10 AM, kal, parso). Format as "YYYY-MM-DDTHH:MM:SSZ". Null if appointment_booked is false.
- contact_name: the caller's name if mentioned (e.g. Raghav, Ketan)
- contact_phone: the caller's phone if mentioned (e.g. 9876543210)
- contact_email: the caller's email if mentioned (e.g. ketan24475@gmail.com)
- company: the caller's company if mentioned
- interest_level: "low", "medium", "high", or "hot"
- budget_range: any budget mentioned
- timeline: when they want to buy (immediate, 1_month, 3_months, exploring)
- call_summary: 2-sentence summary of the conversation
- extracted_data: object with any other useful fields
- sentiment: "positive", "neutral", or "negative". MUST be "positive" if the caller engaged, accepted a sample/WhatsApp/callback/appointment, or expressed interest. MUST be "negative" if annoyed, rude, or rejected. Otherwise "neutral".
- callback_scheduled: true if the caller requested a callback OR if the target prospect was absent / not available (e.g. someone else answered saying he/she is not here, out of office, phone left behind, busy, or agreed to a later callback). false otherwise.
- callback_time_iso: a guess of the ISO-8601 datetime for the callback (in UTC), based on any raw text mentioned. If prospect was absent and callback was agreed/rescheduled, default to 3 hours after current time unless a specific time was requested. Format as "YYYY-MM-DDTHH:MM:SSZ". Null if callback_scheduled is false.
- callback_reason: the context or reason for callback if callback_scheduled is true (e.g. "Prospect absent: out of office / phone at home; message left with third party" or user's requested time).
- callback_name: the prospect's name to use for the callback if callback_scheduled is true.

Only return valid JSON."""

    lead_data = {}
    if groq_key:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                    json={
                        "model": os.getenv("GROQ_LLM_MODEL", "openai/gpt-oss-120b"),
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.1,
                        "max_completion_tokens": 600,
                        "response_format": {"type": "json_object"}
                    }
                )
                if res.status_code == 200:
                    data = res.json()
                    lead_data = json.loads(data["choices"][0]["message"]["content"])
                    logger.info(f"[extract_and_save_lead] Groq lead extraction succeeded: is_lead={lead_data.get('is_lead')}, callback={lead_data.get('callback_scheduled')}")
        except Exception as groq_err:
            logger.warning(f"[extract_and_save_lead] Groq extraction failed, trying Gemini fallback: {groq_err}")

    if not lead_data and gemini_key:
        try:
            from google import genai
            g_client = genai.Client(api_key=gemini_key)
            g_res = await asyncio.to_thread(
                g_client.models.generate_content,
                model="gemini-2.5-flash",
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )
            if g_res and g_res.text:
                lead_data = json.loads(g_res.text)
                logger.info(f"[extract_and_save_lead] Gemini lead extraction succeeded: is_lead={lead_data.get('is_lead')}, callback={lead_data.get('callback_scheduled')}")
        except Exception as g_err:
            logger.warning(f"[extract_and_save_lead] Gemini extraction failed: {g_err}")

    # Check if this call was an appointment check / inquiry vs a confirmation / new booking
    t_lower = transcript.lower()
    has_check_phrase = any(term in t_lower for term in [
        "check karna", "check karni", "check kijiye", "check kar", "appointment check",
        "status dekhna", "check my appointment", "mujhe check karna", "check my booking"
    ]) or bool(lead_data.get("is_appointment_check"))

    has_confirm_intent = any(term in t_lower for term in [
        "confirm karte hain", "confirm kar", "confirm kar do", "confirm kijiye",
        "appointment confirm", "confirm hai", "naya book", "fresh book", "naya appointment",
        "new appointment", "book kar do", "book kar dijiye", "appointment book"
    ]) or bool(lead_data.get("appointment_booked"))

    if has_confirm_intent and any(k in t_lower for k in ["baje", "am", "pm", "kal", "tarikh", "date", "time", "10", "11", "12", "1", "2", "3", "4", "5", "6", "7", "8", "9"]):
        lead_data["appointment_booked"] = True
        is_check_inquiry = False
        computed_outcome = "Appointment Booked"
        if lead_data.get("sentiment") != "negative":
            lead_data["sentiment"] = "positive"
    elif has_check_phrase:
        is_check_inquiry = True
        lead_data["appointment_booked"] = False
        computed_outcome = "Appointment Checked"
        if not lead_data.get("sentiment") or lead_data.get("sentiment") not in ("negative", "positive"):
            lead_data["sentiment"] = "positive" if any(w in t_lower for w in ["dhanyavaad", "thank", "theek", "shukriya", "accha", "goodbye"]) else "neutral"
    else:
        is_check_inquiry = False
        appointment_keywords = [
            "appointment book", "demo book", "meeting book", "schedule new", "naya book", "demo set"
        ]
        has_apt_intent = any(k in t_lower for k in appointment_keywords)
        if has_apt_intent and any(k in t_lower for k in ["baje", "am", "pm", "kal", "tarikh", "date", "time"]):
            lead_data["appointment_booked"] = True
            lead_data["is_lead"] = True

    # Fallback regex extraction for contact_email, contact_phone, and contact_name if omitted by LLM
    if not lead_data.get("contact_email"):
        email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', transcript)
        if email_match:
            lead_data["contact_email"] = email_match.group(0)

    if not lead_data.get("contact_phone"):
        phone_match = re.search(r'\b(?:(?:\+?91|0)?[6-9]\d{7,10})\b', transcript)
        if not phone_match:
            phone_match = re.search(r'(?:phone|number|mobile|contact|no\.?)\s*(?:hai|is|:)?\s*(\+?\d[\d\s-]{6,14}\d)', transcript, re.IGNORECASE)
        if phone_match:
            raw_matched = phone_match.group(1) if phone_match.lastindex else phone_match.group(0)
            cleaned_p = re.sub(r'[^\d+]', '', raw_matched)
            if len(cleaned_p) >= 7:
                lead_data["contact_phone"] = cleaned_p

    if not lead_data.get("contact_name") or lead_data.get("contact_name") in ("Prospect", "Unknown", "Caller", "None"):
        name_match = re.search(r'(?:mera naam|my name is|naam hai|naam)\s*(?:hai|is|:)?\s*([A-Za-z\u0900-\u097f]+)', transcript, re.IGNORECASE)
        if name_match:
            lead_data["contact_name"] = name_match.group(1).strip()

    # Programmatic failsafe for third-party pickup & absent prospect auto-rescheduling
    absent_patterns = [
        r'\b(?:wo\s+)?(?:abhi\s+)?(?:yahan\s+)?nahi\s+(?:hai|hain)\b',
        r'\b(?:bahar|office|kaam\s+pe)\s+gaye\s+(?:hai|hain)\b',
        r'\bphone\s+ghar\s+pe\s+(?:hai|chhod)\b',
        r'\bnot\s+(?:here|available)\b',
        r'\b(?:baad\s+me|baad\s+mein)\s+(?:call|baat)\b',
        r'\bunhe\s+bata\s+denge\b'
    ]
    is_absent_pickup = any(re.search(pat, transcript, re.IGNORECASE) for pat in absent_patterns)
    if is_absent_pickup and not lead_data.get("callback_scheduled"):
        from datetime import timedelta
        lead_data["callback_scheduled"] = True
        lead_data["callback_time_iso"] = (datetime.utcnow() + timedelta(hours=3)).replace(microsecond=0).isoformat() + "Z"
        lead_data["callback_reason"] = "Prospect absent during call; phone answered by third party; rescheduled for +3 hours."
        lead_data["is_lead"] = False

    # Code-level qualification guard: If customer spoke fewer than 6 words or only greeting words, force is_lead to False
    customer_turns = [l.replace("customer:", "").strip() for l in transcript.split("\n") if l.strip().startswith("customer:")]
    total_customer_words = sum(len(t.split()) for t in customer_turns)
    if total_customer_words < 6 and not lead_data.get("callback_scheduled") and not lead_data.get("appointment_booked"):
        lead_data["is_lead"] = False
        lead_data["interest_level"] = "low"

    # Import IntegrationExecutor dynamically
    try:
        from app.services.integration_executor import IntegrationExecutor
        executor = IntegrationExecutor()
    except Exception as exec_err:
        logger.error(f"Failed to initialize IntegrationExecutor: {exec_err}")
        executor = None

    # Calculate computed outcome
    if is_check_inquiry:
        computed_outcome = "Appointment Checked"
        lead_data["is_lead"] = False
    elif lead_data.get("appointment_booked"):
        computed_outcome = "Appointment Booked"
        lead_data["is_lead"] = True
    elif lead_data.get("callback_scheduled"):
        computed_outcome = "Callback Scheduled"
    elif lead_data.get("is_lead"):
        computed_outcome = "Lead Captured"
    elif lead_data.get("sentiment") == "negative":
        computed_outcome = "Not Interested"
    else:
        computed_outcome = lead_data.get("outcome") or "Completed"

    # Fallback phone and name resolution
    fb_phone = (existing_call.get("caller_phone") if existing_call else None)
    fb_name = (existing_call.get("caller_name") if existing_call else None)

    if not fb_phone and room_name:
        for p in re.split(r'[-_]', room_name):
            cleaned = re.sub(r'[^\d+]', '', p)
            if len(cleaned) >= 10:
                if len(cleaned) == 11 and cleaned.startswith('0'):
                    cleaned = cleaned[1:]
                elif len(cleaned) == 12 and cleaned.startswith('91'):
                    cleaned = cleaned[2:]
                fb_phone = cleaned
                break

    if organization_id and (not fb_phone or not fb_name or fb_name in ("Unknown", "Prospect")):
        try:
            from app.services.caller_lookup import CallerLookupService
            c_svc = CallerLookupService(supabase_admin)
            if fb_phone:
                matched_cust = await c_svc.lookup_caller(organization_id, fb_phone)
                if matched_cust and (not fb_name or fb_name in ("Unknown", "Prospect")):
                    fb_name = matched_cust.get("full_name")
            else:
                c_list = await asyncio.to_thread(
                    supabase_admin.table("customer_contacts")
                    .select("phone_number, full_name")
                    .eq("organization_id", organization_id)
                    .limit(2)
                    .execute
                )
                if c_list.data and len(c_list.data) == 1:
                    fb_phone = c_list.data[0].get("phone_number")
                    fb_name = c_list.data[0].get("full_name")
        except Exception:
            pass

    resolved_phone = lead_data.get("contact_phone") or fb_phone or "Unknown"
    resolved_name = lead_data.get("contact_name") or fb_name or "Prospect"
    if resolved_name in ("Unknown", "None", ""):
        resolved_name = fb_name or "Prospect"

    # Update voice_calls with extracted sentiment, outcome, caller_phone, caller_name and call summary
    if original_call_id:
        try:
            raw_sentiment = str(lead_data.get("sentiment", "neutral")).lower().strip()
            if (computed_outcome in ("Lead Captured", "Callback Scheduled") or lead_data.get("is_lead")) and raw_sentiment != "negative":
                sentiment_val = "positive"
            else:
                sentiment_val = raw_sentiment if raw_sentiment in ("positive", "neutral", "negative") else "neutral"

            update_data = {
                "sentiment": sentiment_val,
                "call_summary": lead_data.get("call_summary", ""),
                "outcome": computed_outcome
            }
            if resolved_phone and resolved_phone != "Unknown":
                update_data["caller_phone"] = resolved_phone
            if resolved_name and resolved_name != "Prospect":
                update_data["caller_name"] = resolved_name

            await asyncio.to_thread(
                supabase_admin.table("voice_calls").update(update_data).eq("id", original_call_id).execute
            )
            logger.info(f"[extract_and_save_lead] Updated voice_calls with sentiment '{sentiment_val}' and outcome '{computed_outcome}' (call_id: {original_call_id})")
        except Exception as e:
            logger.error(f"Failed to update voice_call with extracted sentiment: {e}")

        from app.services.integration_executor import IntegrationExecutor
        from app.services.notification_service import NotificationService
        executor = IntegrationExecutor()

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

                lead_payload = {
                    "user_id": user_id,
                    "agent_id": agent_id,
                    "full_name": resolved_name,
                    "phone": resolved_phone if resolved_phone != "Unknown" else None,
                    "email": lead_data.get("contact_email"),
                    "company_name": lead_data.get("company"),
                    "interest_level": lead_data.get("interest_level", "medium"),
                    "budget_range": lead_data.get("budget_range"),
                    "timeline": lead_data.get("timeline"),
                    "call_summary": lead_data.get("call_summary"),
                    "extracted_data": lead_data.get("extracted_data", {}),
                    "status": initial_stage,
                    "stage": initial_stage,
                    "source": "voice_demo"
                }
                if original_call_id:
                    lead_payload["call_id"] = original_call_id

                for attempt in range(3):
                    try:
                        lead_res = await asyncio.to_thread(
                            supabase_admin.table("leads").insert(lead_payload).execute
                        )
                        if lead_res.data:
                            lead_id = lead_res.data[0].get("id")
                            logger.info(f"[extract_and_save_lead] Successfully inserted lead {lead_id} for user {user_id}")
                            break
                    except Exception as ins_err:
                        logger.warning(f"[extract_and_save_lead] Lead insert attempt {attempt+1} failed: {ins_err}")
                        if attempt < 2:
                            await asyncio.sleep(0.5)
                        else:
                            raise ins_err

                # Update voice_calls with lead_id
                if lead_id and original_call_id:
                    try:
                        await asyncio.to_thread(
                            supabase_admin.table("voice_calls").update({"lead_id": lead_id}).eq("id", original_call_id).execute
                        )
                    except Exception as v_err:
                        logger.warning(f"Failed to link lead_id to voice_call: {v_err}")

                # Trigger Lead Captured event on connected integrations
                if lead_id:
                    try:
                        asyncio.create_task(executor.on_lead_captured(agent_id, {
                            "lead_id": lead_id,
                            "agent_id": agent_id,
                            "user_id": user_id,
                            "organization_id": organization_id,
                            "contact_name": resolved_name,
                            "contact_phone": resolved_phone,
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

                # Task 4.3: Dispatch Real-time Qualified Lead Alert (Telegram + In-App Dashboard Notification Bell)
                if user_id and lead_id:
                    try:
                        lead_int = str(lead_data.get("interest_level", "warm")).capitalize()
                        c_disp = f"{resolved_name} ({resolved_phone})" if (resolved_name and resolved_name != "Unknown" and resolved_phone and resolved_phone != "Unknown") else (resolved_phone if resolved_phone != "Unknown" else resolved_name)
                        company_disp = lead_data.get("company") or "Direct Prospect"
                        lead_notif_title = f"🎯 New {lead_int} Lead: {resolved_name or 'Prospect'}"
                        lead_notif_body = (
                            f"👤 *Contact:* {c_disp}\n"
                            f"🏢 *Company:* {company_disp}\n"
                            f"🔥 *Interest Level:* {lead_int}\n"
                            f"💰 *Budget:* {lead_data.get('budget_range') or 'Flexible'} | ⏱️ *Timeline:* {lead_data.get('timeline') or 'Immediate'}\n"
                            f"📝 *Summary:* {lead_data.get('call_summary') or 'Captured from voice conversation'}"
                        )
                        asyncio.create_task(NotificationService.dispatch(
                            user_id=user_id,
                            event_type="new_lead",
                            title=lead_notif_title,
                            message=lead_notif_body,
                            payload={
                                "lead_id": lead_id,
                                "agent_id": agent_id,
                                "call_id": original_call_id,
                                "contact_name": resolved_name,
                                "contact_phone": resolved_phone,
                                "interest_level": lead_data.get("interest_level", "medium"),
                                "budget_range": lead_data.get("budget_range", ""),
                                "timeline": lead_data.get("timeline", "")
                            }
                        ))
                        logger.info(f"[extract_and_save_lead] Dispatched real-time new_lead notification for lead {lead_id}")
                    except Exception as notif_l_err:
                        logger.warning(f"[extract_and_save_lead] Failed to dispatch new_lead notification: {notif_l_err}")

                # Task 4.2: Automated Welcome & Next-Step Message to Interested Prospect via WhatsApp/SMS/Email (Rule 52, 53)
                prospect_email = lead_data.get("contact_email") or ""
                if (resolved_phone and resolved_phone != "Unknown") or prospect_email:
                    try:
                        asyncio.create_task(executor.dispatch_interested_followup(
                            agent_id=agent_id,
                            prospect_data={
                                "contact_name": resolved_name,
                                "contact_phone": resolved_phone if resolved_phone != "Unknown" else "",
                                "contact_email": prospect_email,
                                "business_name": b_name_extracted,
                                "organization_id": organization_id,
                                "user_id": user_id,
                                "call_summary": lead_data.get("call_summary", ""),
                                "callback_scheduled": lead_data.get("callback_scheduled", False),
                                "callback_time_iso": lead_data.get("callback_time_iso"),
                                "interest_level": lead_data.get("interest_level", "medium")
                            }
                        ))
                        logger.info(f"[extract_and_save_lead] Dispatched automated welcome/fulfillment task for phone={resolved_phone}, email={prospect_email}")
                    except Exception as fol_err:
                        logger.warning(f"[extract_and_save_lead] Failed to dispatch interested followup: {fol_err}")

            except Exception as e:
                logger.error(f"Failed to save lead: {e}")

        # 2b. Handle Appointment Booking
        appointment_id = None
        if lead_data.get("appointment_booked") or computed_outcome == "Appointment Booked":
            try:
                apt_time = lead_data.get("appointment_time_iso")
                if not apt_time:
                    from datetime import timedelta
                    apt_time = (datetime.utcnow() + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0).isoformat() + "Z"

                prospect_email = lead_data.get("contact_email") or ""
                apt_payload = {
                    "user_id": user_id,
                    "agent_id": agent_id,
                    "contact_name": resolved_name if resolved_name not in ("Prospect", "Unknown") else "Client",
                    "contact_phone": resolved_phone if resolved_phone != "Unknown" else "",
                    "contact_email": prospect_email or None,
                    "scheduled_at": apt_time,
                    "duration_minutes": 30,
                    "status": "scheduled",
                    "booked_via": "voice",
                    "meeting_type": "Appointment / Demo",
                    "notes": lead_data.get("call_summary") or "Booked via voice agent conversation.",
                    "extracted_data": lead_data.get("extracted_data") or {},
                    "voice_call_id": original_call_id,
                    "metadata": {
                        "source": "voice_sandbox" if "sandbox" in str(room_name or "") else "voice_call",
                        "room_name": room_name or ""
                    }
                }
                for apt_attempt in range(3):
                    try:
                        apt_res = await asyncio.to_thread(
                            supabase_admin.table("appointments").insert(apt_payload).execute
                        )
                        if apt_res.data and len(apt_res.data) > 0:
                            appointment_id = apt_res.data[0].get("id")
                            logger.info(f"[extract_and_save_lead] Successfully inserted appointment {appointment_id} for user {user_id}")
                            break
                    except Exception as ins_apt_err:
                        logger.warning(f"[extract_and_save_lead] Appointment insert attempt {apt_attempt+1} failed: {ins_apt_err}")
                        if apt_attempt < 2:
                            await asyncio.sleep(0.5)
                        else:
                            raise ins_apt_err

                    if original_call_id:
                        try:
                            await asyncio.to_thread(
                                supabase_admin.table("voice_calls").update({"appointment_id": appointment_id}).eq("id", original_call_id).execute
                            )
                        except Exception as apt_link_err:
                            logger.warning(f"Failed to link appointment_id to voice_call: {apt_link_err}")

                    # Dispatch real-time appointment notification
                    if user_id:
                        try:
                            asyncio.create_task(NotificationService.dispatch(
                                user_id=user_id,
                                event_type="appointment_scheduled",
                                title=f"📅 New Appointment: {resolved_name}",
                                message=(
                                    f"👤 Contact: {resolved_name} ({resolved_phone})\n"
                                    f"⏰ Slot: {apt_time}\n"
                                    f"📝 Details: {lead_data.get('call_summary') or 'Appointment booked via voice agent'}"
                                ),
                                payload={
                                    "appointment_id": appointment_id,
                                    "agent_id": agent_id,
                                    "call_id": original_call_id,
                                    "contact_name": resolved_name,
                                    "contact_phone": resolved_phone,
                                    "scheduled_at": apt_time
                                }
                            ))
                        except Exception as apt_notif_err:
                            logger.warning(f"Failed to dispatch appointment notification: {apt_notif_err}")
            except Exception as apt_err:
                logger.error(f"[extract_and_save_lead] Failed to insert appointment: {apt_err}")

        # Sync to customer_contacts table:
        # EVERY caller who gave their name, phone, or inquired should be synced for future recognition.
        try:
            if not organization_id and user_id:
                try:
                    prof_org = await asyncio.to_thread(
                        supabase_admin.table("profiles").select("organization_id").eq("id", user_id).maybe_single().execute
                    )
                    if prof_org and prof_org.data:
                        organization_id = prof_org.data.get("organization_id")
                except Exception as org_f_err:
                    logger.warning(f"Could not resolve organization_id from user_id: {org_f_err}")

            if not organization_id and agent_id:
                try:
                    ag_org = await asyncio.to_thread(
                        supabase_admin.table("agents").select("organization_id").eq("id", agent_id).maybe_single().execute
                    )
                    if ag_org and ag_org.data:
                        organization_id = ag_org.data.get("organization_id")
                except Exception:
                    pass

            if not organization_id:
                try:
                    any_org = await asyncio.to_thread(
                        supabase_admin.table("organizations").select("id").limit(1).execute
                    )
                    if any_org and any_org.data:
                        organization_id = any_org.data[0].get("id")
                except Exception:
                    pass

            is_outbound = bool(contact_id) or (existing_call and (existing_call.get("direction") == "outbound" or existing_call.get("metadata", {}).get("direction") == "outbound"))
            has_positive_interest = bool(
                lead_id or
                (lead_data and (
                    lead_data.get("is_lead") or 
                    lead_data.get("callback_scheduled") or 
                    lead_data.get("callback_requested") or 
                    lead_data.get("sentiment") in ("positive", "interested") or
                    lead_data.get("interest_level") in ("medium", "high", "hot")
                ))
            )
            has_caller_info = bool(resolved_name and resolved_name != "Prospect") or bool(lead_data and (lead_data.get("contact_phone") or lead_data.get("contact_email")))

            if is_outbound and not has_positive_interest and not has_caller_info:
                logger.info(f"[extract_and_save_lead] Outbound call to prospect did not result in a positive lead/callback or contact name. Skipping customer_contacts sync to keep CRM clean.")
            else:
                contact_phone_to_sync = (
                    (resolved_phone if resolved_phone != "Unknown" else None) or
                    (existing_call.get("caller_phone") if existing_call else None) or 
                    (existing_call.get("metadata", {}).get("to_number") if existing_call else None) or
                    (lead_data.get("contact_phone") if lead_data else None)
                )
                if not contact_phone_to_sync and original_call_id:
                    try:
                        call_rec = await asyncio.to_thread(
                            supabase_admin.table("voice_calls").select("caller_phone").eq("id", original_call_id).single().execute
                        )
                        if call_rec.data:
                            contact_phone_to_sync = call_rec.data.get("caller_phone")
                    except Exception:
                        pass

                if contact_phone_to_sync and contact_phone_to_sync != "Unknown" and organization_id:
                    from app.services.caller_lookup import CallerLookupService
                    c_svc = CallerLookupService(supabase_admin)
                    sync_tags = []
                    if lead_data and lead_data.get("is_lead"):
                        sync_tags.append("lead")
                    if is_check_inquiry or lead_data.get("appointment_booked"):
                        sync_tags.append("appointment")
                    if not sync_tags:
                        sync_tags.append("outbound" if is_outbound else "inbound")

                    await c_svc.upsert_from_call(
                        organization_id=organization_id,
                        phone_number=contact_phone_to_sync,
                        caller_name=resolved_name if resolved_name != "Prospect" else None,
                        email=lead_data.get("contact_email") if lead_data else None,
                        company=lead_data.get("company") if lead_data else None,
                        call_summary=lead_data.get("call_summary") if lead_data else None,
                        direction="outbound" if is_outbound else "inbound",
                        tags=sync_tags
                    )
                    logger.info(f"[extract_and_save_lead] Synced caller {contact_phone_to_sync} to customer_contacts (is_outbound={is_outbound}, tags={sync_tags})")
        except Exception as c_sync_err:
            logger.warning(f"[extract_and_save_lead] Customer contacts sync failed: {c_sync_err}")

        # 3. Handle Callbacks
        if lead_data.get("callback_scheduled"):
            try:
                cb_phone = lead_data.get("contact_phone") or (resolved_phone if resolved_phone != "Unknown" else None) or "Unknown"
                cb_name = lead_data.get("callback_name") or lead_data.get("contact_name") or (resolved_name if resolved_name != "Prospect" else None) or "Unknown"

                # Parse the ISO time
                callback_time = lead_data.get("callback_time_iso")
                if not callback_time:
                    # Default: 2 hours from now UTC
                    from datetime import timedelta
                    callback_time = (datetime.utcnow() + timedelta(hours=2)).replace(microsecond=0).isoformat() + "Z"

                # If lead_id was not just created, try searching for existing lead by phone
                if not lead_id and cb_phone != "Unknown":
                    try:
                        existing_lead = await asyncio.to_thread(
                            supabase_admin.table("leads").select("id").eq("phone", cb_phone).eq("user_id", user_id).limit(1).execute
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
                        "prospect_name": cb_name,
                        "prospect_phone": cb_phone,
                        "scheduled_at": callback_time,
                        "timezone": caller_tz if 'caller_tz' in locals() else "Asia/Kolkata",
                        "notes": lead_data.get("callback_reason") or "Callback requested by prospect during call.",
                        "status": "scheduled",
                        "priority": "normal"
                    }).execute
                )
                logger.info(f"Callback successfully detected and scheduled for prospect {cb_name} ({cb_phone}) at {callback_time}")

                # Trigger Callback Scheduled event
                if executor:
                    try:
                        asyncio.create_task(executor.on_callback_scheduled(agent_id, {
                            "agent_id": agent_id,
                            "user_id": user_id,
                            "organization_id": organization_id,
                            "prospect_name": lead_data.get("callback_name") or lead_data.get("contact_name") or "Unknown",
                            "prospect_phone": cb_phone,
                            "scheduled_at": callback_time,
                            "notes": lead_data.get("callback_reason") or "Callback requested by prospect during call."
                        }))
                    except Exception as e:
                        logger.error(f"Error triggering on_callback_scheduled: {e}")

            except Exception as e:
                logger.error(f"Failed to schedule callback: {e}")
        # Resolve contact_id from metadata or room_name if not explicitly passed
        if not contact_id and original_call_id:
            try:
                call_res = await asyncio.to_thread(
                    supabase_admin.table("voice_calls").select("metadata").eq("id", original_call_id).maybe_single().execute
                )
                if call_res.data and call_res.data.get("metadata"):
                    contact_id = call_res.data["metadata"].get("contact_id")
            except Exception as e:
                logger.error(f"Failed to resolve contact_id from voice_calls metadata in extract_and_save_lead: {e}")

        if not contact_id and call_sid:
            try:
                call_res = await asyncio.to_thread(
                    supabase_admin.table("voice_calls").select("metadata").or_(f"metadata->>provider_call_id.eq.{call_sid},metadata->>session_id.eq.{call_sid}").order("created_at", desc=True).limit(1).execute
                )
                if call_res.data and len(call_res.data) > 0 and call_res.data[0].get("metadata"):
                    contact_id = call_res.data[0]["metadata"].get("contact_id")
            except Exception as e:
                logger.error(f"Failed to resolve contact_id from voice_calls metadata by call_sid in extract_and_save_lead: {e}")

        if not contact_id and room_name and "--" in room_name:
            p = room_name.split("--")
            if len(p) >= 3:
                try:
                    import uuid as _uuid
                    _uuid.UUID(str(p[2]))
                    contact_id = p[2]
                except Exception:
                    pass

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
                    if original_call_id:
                        update_fields["call_id"] = original_call_id
                    if lead_id:
                        update_fields["lead_id"] = lead_id
                    
                    await asyncio.to_thread(
                        supabase_admin.table("campaign_contacts").update(update_fields).eq("id", contact_id).execute
                    )
                    logger.info(f"[Campaign Update] Updated campaign_contact {contact_id} call_status=answered, call_id={original_call_id}, lead_id={lead_id}")
                    
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

        # 5.5 Extract and record structured revenue events behind feature flag
        rev_event = None
        if user_id:
            try:
                from app.services.revenue_service import RevenueService
                det_source = "campaign" if campaign_id else ("callback" if lead_data.get("callback_scheduled") else "inbound")
                rev_event = await RevenueService.process_call_revenue(
                    business_id=user_id,
                    call_id=original_call_id,
                    lead_id=lead_id,
                    transcript=transcript,
                    summary=lead_data.get("call_summary", ""),
                    caller_phone=resolved_phone if resolved_phone != "Unknown" else None,
                    source=det_source,
                    groq_api_key=groq_key,
                    gemini_api_key=gemini_key
                )
            except Exception as rev_err:
                logger.warning(f"[extract_and_save_lead] Revenue event processing warning: {rev_err}")

        # 6. Dispatch post-call summary alert to Dashboard & Telegram
        if user_id:
            try:
                from app.services.notification_service import NotificationService
                c_name = lead_data.get("contact_name") or "Caller"
                c_phone = (
                    lead_data.get("contact_phone")
                    or (existing_call.get("caller_number") if existing_call else None)
                    or (existing_call.get("caller_phone") if existing_call else None)
                    or (existing_call.get("metadata", {}).get("from_number") if existing_call else None)
                    or (existing_call.get("metadata", {}).get("caller_number") if existing_call else None)
                    or (existing_call.get("metadata", {}).get("to_number") if existing_call else None)
                    or ""
                )
                c_dir_raw = (
                    (existing_call.get("metadata", {}).get("direction") if existing_call else None)
                    or (existing_call.get("direction") if existing_call else None)
                    or "Inbound"
                )
                c_dir_str = "Inbound" if "in" in str(c_dir_raw).lower() else "Outbound"
                c_summary = lead_data.get("call_summary") or "Conversation completed."
                c_sentiment = str(lead_data.get("sentiment", "neutral")).capitalize()
                
                # Format clean title without artifacts like "Caller ()"
                if c_name and c_name != "Caller":
                    notif_title = f"📞 {c_dir_str} Call: {c_name}" + (f" ({c_phone})" if c_phone else "")
                elif c_phone:
                    notif_title = f"📞 {c_dir_str} Call: {c_phone}"
                else:
                    notif_title = f"📞 {c_dir_str} Call"

                contact_display = f"{c_name} ({c_phone})" if (c_name != "Caller" and c_phone) else (c_phone or c_name if c_name != "Caller" else "Customer")

                notif_body = (
                    f"• Type: {c_dir_str} Call\n"
                    f"• Contact: {contact_display}\n"
                    f"• Duration: {duration_seconds}s | Sentiment: {c_sentiment}\n"
                    f"• Summary: {c_summary}"
                )
                if lead_data.get("is_lead"):
                    notif_body += f"\n• 🎯 Qualified Lead: {str(lead_data.get('interest_level', 'medium')).upper()}"
                if lead_data.get("callback_scheduled"):
                    notif_body += f"\n• ⏰ Callback Scheduled: {lead_data.get('callback_time_iso') or 'Later'}"

                notif_payload = {
                    "call_id": original_call_id,
                    "agent_id": agent_id,
                    "duration": duration_seconds,
                    "phone": c_phone,
                    "contact_name": c_name if c_name != "Caller" else None,
                    "summary": c_summary,
                    "sentiment": c_sentiment,
                    "direction": c_dir_str.lower()
                }

                # Add Revenue Quote & Single-Use Action Buttons if quote detected
                if rev_event and rev_event.get("quoted_amount"):
                    from app.services.revenue_service import RevenueService
                    q_amt = rev_event["quoted_amount"]
                    q_cur = rev_event.get("currency", "INR")
                    app_base = os.getenv("NEXT_PUBLIC_APP_URL", "https://trinetraedu-ai.com").rstrip("/")
                    won_token = RevenueService.generate_action_token(rev_event["id"], user_id, "won")
                    lost_token = RevenueService.generate_action_token(rev_event["id"], user_id, "lost")
                    won_url = f"{app_base}/api/revenue/action?token={won_token}"
                    lost_url = f"{app_base}/api/revenue/action?token={lost_token}"

                    notif_body += (
                        f"\n\n💰 *Quote Discussed:* {q_cur} {q_amt:,.2f}\n"
                        f"👉 [Mark Won ({q_cur} {q_amt:,.2f})]({won_url})\n"
                        f"❌ [Mark Lost]({lost_url})"
                    )
                    notif_payload["revenue_event_id"] = rev_event["id"]
                    notif_payload["quoted_amount"] = q_amt
                    notif_payload["won_url"] = won_url
                    notif_payload["lost_url"] = lost_url

                await NotificationService.dispatch(
                    user_id=user_id,
                    event_type="call_completed",
                    title=notif_title,
                    message=notif_body,
                    payload=notif_payload
                )
                logger.info(f"[extract_and_save_lead] Dispatched call_completed notification for user {user_id}")
            except Exception as notif_err:
                logger.warning(f"[extract_and_save_lead] Failed to dispatch notification: {notif_err}")

        # 6.5 Write to activity_log for real-time dashboard feed (Rule 49 & 60)
        if user_id:
            try:
                act_type = "lead_captured" if lead_data.get("is_lead") else ("appointment_booked" if lead_data.get("callback_scheduled") else "call_ended")
                act_title = (
                    f"Lead Captured: {resolved_name}" if lead_data.get("is_lead")
                    else (f"Callback Scheduled: {resolved_name}" if lead_data.get("callback_scheduled")
                    else f"Call Completed ({c_dir_str})")
                )
                act_desc = lead_data.get("call_summary") or f"{duration_seconds}s call completed with {c_sentiment} sentiment."
                act_payload = {
                    "user_id": user_id,
                    "title": act_title,
                    "description": act_desc,
                    "activity_type": act_type
                }
                if organization_id:
                    act_payload["organization_id"] = organization_id
                
                try:
                    await asyncio.to_thread(
                        supabase_admin.table("activity_log").insert(act_payload).execute
                    )
                except Exception:
                    await asyncio.to_thread(
                        supabase_admin.table("activity_log").insert({
                            "user_id": user_id,
                            "title": act_title,
                            "description": act_desc,
                            "activity_type": act_type
                        }).execute
                    )
                logger.info(f"[extract_and_save_lead] Logged activity_log item '{act_title}' ({act_type}) for user {user_id}")
            except Exception as act_err:
                logger.warning(f"[extract_and_save_lead] Failed to write activity_log: {act_err}")

        # 7. Trigger Call Completed event on connected agent integrations
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
                    "contact_name": (lead_data.get("contact_name") if lead_data.get("contact_name") not in ("Unknown", "Caller", "Prospect", None, "") else c_name) or "Customer",
                    "contact_phone": lead_data.get("contact_phone") or c_phone or "",
                    "contact_email": lead_data.get("contact_email", ""),
                    "lead_id": lead_id
                }
                asyncio.create_task(executor.on_call_completed(agent_id, call_payload))
            except Exception as e:
                logger.error(f"Error triggering on_call_completed: {e}")

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

async def entrypoint(ctx: JobContext):
    logger.info(f"Connecting to room: {ctx.room.name}")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.info(f"Connected to room: {ctx.room.name}")
    
    # Guard: Check if an agent participant is already connected to this room
    local_id = getattr(ctx.room.local_participant, 'identity', '') or ''
    if ctx.room and hasattr(ctx.room, 'remote_participants'):
        from livekit import rtc
        for p in ctx.room.remote_participants.values():
            p_identity = (getattr(p, 'identity', '') or '').lower()
            p_name = (getattr(p, 'name', '') or '').lower()
            p_kind = getattr(p, 'kind', None)
            is_agent = (
                p_kind == getattr(rtc.ParticipantKind, 'PARTICIPANT_KIND_AGENT', 1) or
                p_identity.startswith("agent") or
                "agent" in p_identity or
                "vikram" in p_identity or
                "agent" in p_name
            )
            if (getattr(p, 'identity', '') or '') != local_id and is_agent:
                logger.warning(f"[DUPLICATE WORKER GUARD] Room '{ctx.room.name}' already has connected agent participant '{getattr(p, 'identity', '')}'. Disconnecting duplicate worker join.")
                try:
                    await ctx.room.disconnect()
                except Exception:
                    pass
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
    bot_name = "Aditi"
    gender_tag = "female"
    is_female = True
    business_name_val = ""

    agent_id = ctx.job.metadata if ctx.job else None
    contact_id = None
    call_sid = None
    caller_number = "Unknown"

    if ctx.room and "--" in ctx.room.name:
        # Structured room name format: twilio--{agent_id}--{contact_id}--{nonce_or_sid}
        # Or exotel--{agent_id}--{caller_or_contact}--{call_sid}
        parts = ctx.room.name.split("--")
        if len(parts) == 3:
            if parts[1] not in ("noagent", "None", "", "unknown", "call"):
                agent_id = parts[1]
            call_sid = parts[2]
            logger.info(f"[Telephony Entrypoint] Parsed agent_id='{agent_id}', call_sid='{call_sid}' from room '{ctx.room.name}'")
        elif len(parts) >= 4:
            if parts[1] not in ("noagent", "None", "", "unknown", "call"):
                agent_id = parts[1]
            if parts[2] not in ("nocontact", "None", "", "unknown"):
                is_uuid = False
                try:
                    import uuid as _uuid
                    _uuid.UUID(str(parts[2]))
                    is_uuid = True
                except Exception:
                    is_uuid = False

                if is_uuid:
                    contact_id = parts[2]
                else:
                    cleaned_digits = re.sub(r'[^\d+]', '', parts[2])
                    if len(cleaned_digits) >= 10:
                        if len(cleaned_digits) == 11 and cleaned_digits.startswith('0'):
                            cleaned_digits = cleaned_digits[1:]
                        elif len(cleaned_digits) == 12 and cleaned_digits.startswith('91'):
                            cleaned_digits = cleaned_digits[2:]
                        caller_number = cleaned_digits
                    else:
                        contact_id = parts[2]
            call_sid = parts[3]
            logger.info(f"[Telephony Entrypoint] Parsed agent_id='{agent_id}', caller_number='{caller_number}', contact_id='{contact_id}', call_sid='{call_sid}' from room '{ctx.room.name}'")
    elif not agent_id and ctx.room and ctx.room.name.startswith("room-"):
        parts = ctx.room.name.split("-")
        if len(parts) >= 6:
            agent_id = "-".join(parts[1:-1])
            logger.info(f"Parsed agent_id from room name: {agent_id}")
    elif not agent_id and ctx.room and ctx.room.name.startswith("twilio-"):
        parts = ctx.room.name.split("-")
        if len(parts) >= 7:  # twilio-<5-part-UUID>-<call_sid>
            agent_id = "-".join(parts[1:-1])
            call_sid = parts[-1]
            logger.info(f"[Twilio Entrypoint] Parsed agent_id '{agent_id}' directly from room name '{ctx.room.name}'")
        elif len(parts) >= 3:
            agent_id = parts[1]
            call_sid = parts[-1]
            logger.info(f"[Twilio Entrypoint] Parsed agent_id '{agent_id}' directly from room name '{ctx.room.name}'")
        else:
            call_sid = ctx.room.name.replace("twilio-", "")

    if ctx.room and "exotel" in ctx.room.name and (not agent_id or agent_id in ("call", "noagent", "None", "unknown")):
        # Default to India Sales Agent for Exotel calls
        agent_id = "dd4da4c1-9deb-4047-8927-5e12402e6b1f"
        logger.info(f"[Exotel Entrypoint] Defaulted Exotel call to India Sales Agent: {agent_id}")

    # Fallback to database lookup if agent_id, contact_id, or call_sid is missing
    if ctx.room and (not agent_id or not contact_id or not call_sid or caller_number == "Unknown"):
        try:
            call_res = await asyncio.to_thread(
                supabase_admin.table("voice_calls")
                .select("agent_id, metadata, caller_phone, caller_name")
                .or_(f"metadata->>room_name.eq.{ctx.room.name},metadata->>provider_call_id.eq.{ctx.room.name}")
                .order("created_at", desc=True)
                .limit(1)
                .execute
            )
            if call_res and call_res.data and len(call_res.data) > 0:
                row = call_res.data[0]
                if not agent_id:
                    agent_id = row.get("agent_id")
                meta = row.get("metadata") or {}
                if not contact_id:
                    contact_id = meta.get("contact_id")
                if not call_sid:
                    call_sid = meta.get("provider_call_id") or meta.get("session_id")
                if row.get("caller_phone") and caller_number == "Unknown":
                    raw_p = row.get("caller_phone")
                    cleaned_p = re.sub(r'[^\d+]', '', raw_p)
                    if len(cleaned_p) == 11 and cleaned_p.startswith('0'):
                        cleaned_p = cleaned_p[1:]
                    elif len(cleaned_p) == 12 and cleaned_p.startswith('91'):
                        cleaned_p = cleaned_p[2:]
                    caller_number = cleaned_p if len(cleaned_p) >= 10 else raw_p
                if row.get("caller_name"):
                    db_caller_name = row.get("caller_name")
                logger.info(f"[Telephony Entrypoint] Resolved from voice_calls DB: agent_id={agent_id}, contact_id={contact_id}, call_sid={call_sid}, caller_number={caller_number}")
        except Exception as e:
            logger.error(f"Failed to resolve call metadata from voice_calls for {ctx.room.name}: {e}")

    user_id = None
    organization_id = None
    agent_data = None
    
    # 1. Fetch Agent settings from Supabase synchronously/concurrently before instantiation
    kb_task = None
    if agent_id:
        kb_task = asyncio.create_task(fetch_knowledge_base(agent_id))
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
                
                # 1. Resolve Gender and Clean Name
                is_female = (str(voice_id).lower() in SARVAM_FEMALE_VOICES or (agent_data and (agent_data.get("gender") == "female" or agent_data.get("voice_gender") == "female")))
                gender_tag = 'female' if is_female else 'male'
                
                raw_name = agent_data.get('name', 'Agent') if agent_data else 'Agent'
                clean_name = re.sub(r'^\[[^\]]+\]\s*', '', raw_name)
                clean_name = re.sub(r'\s*-\s*(Demo|Trial)\s*$', '', clean_name, flags=re.IGNORECASE).strip()
                if clean_name.lower() in ('multi agent', 'multi-agent', 'agent', 'sales agent', 'appointment agent', 'appointment booker', 'appointment booking agent', 'appointment booking', 'support agent', 'lead qualifier', 'lead qualifier agent', 'sales executive', ''):
                    v_str = str(voice_id).strip().lower()
                    if v_str in SARVAM_FEMALE_VOICES or v_str in SARVAM_MALE_VOICES:
                        clean_name = v_str.capitalize()
                    elif gender_tag == 'female':
                        clean_name = "Aditi"
                    else:
                        clean_name = "Vikram"
                bot_name = clean_name

                # 2. Fetch User Profile & Business Info
                profile_data = {}
                try:
                    prof_res = await asyncio.to_thread(
                        supabase_admin.table("profiles").select("company_name").eq("id", user_id).execute
                    )
                    if prof_res.data:
                        profile_data = prof_res.data[0]
                except Exception as e:
                    logger.error(f"Failed to fetch profile for business name in entrypoint: {e}")

                raw_system_prompt = agent_data.get("system_prompt") or ""
                business_info = extract_business_info(raw_system_prompt, agent_data, profile_data)
                business_name_val = business_info["business_name"]
                company_display = business_name_val or 'our company'

                # 3. Resolve Base Prompt (Multi-personality vs Single-personality vs Custom Prompt)
                personalities_raw = agent_data.get("personalities")
                enabled_count = _count_enabled_personalities(personalities_raw)
                base_prompt = ""
                if enabled_count == 1:
                    agent_data["_multi_personality_enabled"] = False
                    try:
                        p_dict = json.loads(personalities_raw) if isinstance(personalities_raw, str) else (personalities_raw or {})
                        active_role = next((k for k, v in p_dict.items() if v is True), None)
                        if active_role:
                            from app.services.prompt_service import PromptService
                            prompt_svc = PromptService(supabase_admin)
                            base_prompt = await prompt_svc.get_prompt(active_role)
                            logger.info(f"[SINGLE-PERSONALITY] Resolved base prompt for active role '{active_role}' for agent {agent_id}")
                    except Exception as sp_err:
                        logger.warning(f"[SINGLE-PERSONALITY] Error resolving base prompt: {sp_err}")
                elif enabled_count >= 2:
                    try:
                        enabled_personalities = (
                            json.loads(personalities_raw)
                            if isinstance(personalities_raw, str)
                            else (personalities_raw or {})
                        )
                        agent_data["_multi_personality_enabled"] = True
                        agent_data["_enabled_personalities"] = enabled_personalities
                        from app.services.prompt_service import PromptService
                        prompt_svc = PromptService(supabase_admin)
                        base_prompt = prompt_svc._load_from_file("multi_agent")
                        if not base_prompt or "You are" not in base_prompt:
                            path_m = os.path.normpath(os.path.join(PROMPTS_DIR, "multi_agent.txt"))
                            if os.path.exists(path_m):
                                with open(path_m, "r", encoding="utf-8") as mf:
                                    base_prompt = mf.read()
                        logger.info(f"[MULTI-PERSONALITY] Loaded base prompt from multi_agent.txt for agent {agent_id}")
                    except Exception as mp_err:
                        logger.warning(f"[MULTI-PERSONALITY] Setup failed: {mp_err}")
                        agent_data["_multi_personality_enabled"] = False
                else:
                    agent_data["_multi_personality_enabled"] = False

                if not base_prompt:
                    base_prompt = agent_data.get("system_prompt") or load_system_prompt()

                # 4. Substitute placeholders and scrub generic identity
                base_prompt = base_prompt.replace('{{agent_name}}', bot_name).replace('{agentName}', bot_name).replace('{{name}}', bot_name)
                base_prompt = base_prompt.replace('{{company_name}}', company_display).replace('{companyName}', company_display)
                generic_names = [
                    r'\{\{agent_name\}\}', r'\{agentName\}', r'\{agent_name\}', r'\{name\}',
                    r'\bMulti Agent\b', r'\bmulti agent\b', r'\bSales Agent\b', r'\bsales agent\b',
                    r'\bAppointment Agent\b', r'\bappointment agent\b', r'\bSupport Agent\b', r'\bsupport agent\b',
                    r'\bLead Qualifier\b', r'\blead qualifier\b'
                ]
                for pat in generic_names:
                    base_prompt = re.sub(pat, bot_name, base_prompt)

                system_prompt = base_prompt

                # 5. Append Personality style prompt
                personality = agent_data.get("personality", "friendly")
                personality_prompts = {
                    "professional": "\n\n## PERSONALITY STYLE: PROFESSIONAL\n- Speak formally, politely, and professionally.\n- Be concise and business-like.\n- Avoid excessive slang or casual language.\n- Keep your focus on efficiency and clear facts.",
                    "friendly": "\n\n## PERSONALITY STYLE: FRIENDLY\n- Speak in a warm, friendly, and conversational tone.\n- Use natural fillers and expressions (e.g., 'actually', 'hmm', 'dekhiye', 'bilkul').\n- Be enthusiastic and welcoming.",
                    "assertive": "\n\n## PERSONALITY STYLE: ASSERTIVE\n- Speak directly, confidently, and proactively.\n- Be sales-focused, persuasive, and clear about value propositions.\n- Guide the conversation proactively.",
                    "empathetic": "\n\n## PERSONALITY STYLE: EMPATHETIC\n- Speak in a caring, patient, and understanding tone.\n- Listen attentively and validate the caller's concerns with genuine warmth.\n- Keep sentences concise, natural, and fluent. Never insert artificial hesitation, trailing pauses, or stutters."
                }
                system_prompt += personality_prompts.get(personality.lower(), personality_prompts["friendly"])

                # 6. Append Expressiveness rules
                expressive_instructions = build_agent_expressive_rules(bot_name=bot_name, gender_tag=gender_tag, business_name=business_name_val)
                if "## TRINETRA AGENT BEHAVIOR" not in system_prompt and "## HUMAN EXPRESSIVENESS RULES" not in system_prompt:
                    system_prompt += expressive_instructions

                # 7. Extract default greeting from system_prompt
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

                # 8. Fetch Caller Identity & Campaign Contact
                if ctx.room and caller_number == "Unknown":
                    # 1. Check room name for any 10-digit sequence
                    for part in re.split(r'[-_]', ctx.room.name):
                        cleaned = re.sub(r'[^\d+]', '', part)
                        if len(cleaned) >= 10:
                            caller_number = cleaned
                            break

                    # 2. Check remote participants
                    if caller_number == "Unknown":
                        remote_parts = getattr(ctx.room, 'remote_participants', {})
                        for participant in remote_parts.values():
                            identity = getattr(participant, 'identity', '')
                            if identity and not identity.startswith("agent_") and not identity.startswith("Vikram"):
                                cleaned = re.sub(r'[^\d+]', '', identity)
                                if len(cleaned) >= 10:
                                    caller_number = cleaned
                                    break

                    # 3. Query voice_calls table for caller_phone
                    if caller_number == "Unknown":
                        try:
                            vc_rec = await asyncio.to_thread(
                                supabase_admin.table("voice_calls")
                                .select("caller_phone")
                                .eq("metadata->>room_name", ctx.room.name)
                                .order("started_at", desc=True)
                                .limit(1)
                                .execute
                            )
                            if vc_rec.data and vc_rec.data[0].get("caller_phone"):
                                caller_number = vc_rec.data[0]["caller_phone"]
                                logger.info(f"[Entrypoint] Resolved caller_number='{caller_number}' from voice_calls DB for room '{ctx.room.name}'")
                        except Exception as vc_err:
                            logger.warning(f"Failed to lookup caller_phone from voice_calls in EP: {vc_err}")

                campaign_contact = None
                if not contact_id and ctx.room and ctx.room.name.startswith("twilio-"):
                    call_sid = ctx.room.name.split("-")[-1]
                    try:
                        call_res = await asyncio.to_thread(
                            supabase_admin.table("voice_calls").select("metadata").or_(f"metadata->>room_name.eq.{ctx.room.name},metadata->>provider_call_id.eq.{call_sid}").maybe_single().execute
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
                        if campaign_contact:
                            if (caller_number == "Unknown" or not caller_number) and campaign_contact.get("phone"):
                                caller_number = campaign_contact["phone"]
                            if (not db_caller_name or db_caller_name == "Unknown Caller") and campaign_contact.get("full_name"):
                                db_caller_name = campaign_contact["full_name"]
                            logger.info(f"[Twilio Entrypoint] Successfully loaded campaign contact {contact_id}: Name='{campaign_contact.get('full_name')}', Phone='{campaign_contact.get('phone')}'")
                    except Exception as e:
                        logger.error(f"Failed to fetch campaign contact {contact_id}: {e}")

                # 9. Lookup Returning Customer
                customer = None
                if not campaign_contact and organization_id and caller_number != "Unknown":
                    try:
                        from app.services.caller_lookup import CallerLookupService
                        lookup_svc = CallerLookupService(supabase_admin)
                        customer = await lookup_svc.lookup_caller(organization_id, caller_number)
                        if customer:
                            cust_name = customer.get("full_name") or ""
                            cust_notes = customer.get("notes") or ""
                            cust_company = customer.get("company") or ""
                            cust_tags = customer.get("tags") or []
                            logger.info(f"[CallerLookup - EP] Recognized returning customer: {cust_name} ({caller_number})")
                            customer_context = f"\n\n## CALLER RECOGNITION (CUSTOMER DATABASE MATCH)\n- Caller Name: {cust_name}\n- Caller Phone: {caller_number}\n- Company: {cust_company}\n- Customer Tags: {', '.join(cust_tags) if cust_tags else 'None'}\n- Past Interaction History / Notes: {cust_notes or 'First recorded interaction'}\n- INSTRUCTION: Address the caller warmly by their name ({cust_name}) as a valued contact. Do not introduce yourself as a stranger!\n"
                            system_prompt += customer_context
                    except Exception as lookup_err:
                        logger.error(f"Failed to lookup caller in EP: {lookup_err}")

                # 10. Lookup Existing Appointment Records in DB
                try:
                    apt_query = supabase_admin.table("appointments").select("contact_name, contact_phone, scheduled_at, meeting_type, status").order("created_at", desc=True)
                    if caller_number and caller_number != "Unknown":
                        apt_query = apt_query.ilike("contact_phone", f"%{caller_number}%")
                    elif user_id:
                        apt_query = apt_query.eq("user_id", user_id).limit(5)
                    else:
                        apt_query = apt_query.limit(3)
                    
                    apt_res = await asyncio.to_thread(apt_query.execute)
                    if apt_res.data and len(apt_res.data) > 0:
                        apt_lines = [f"- {a.get('contact_name')}: {a.get('scheduled_at')} ({a.get('meeting_type')}, Status: {a.get('status')})" for a in apt_res.data]
                        system_prompt += f"\n\n## EXISTING APPOINTMENT RECORDS IN DATABASE\n" + "\n".join(apt_lines) + "\n- INSTRUCTION: If caller asks to check an appointment, verify against these exact records.\n"
                    else:
                        system_prompt += f"\n\n## EXISTING APPOINTMENT RECORDS IN DATABASE\n- NO existing appointments found for this caller.\n- INSTRUCTION: If caller asks to check an appointment, truthfully tell them that no booking was found for their number, and offer to schedule a new appointment for their requested date/time.\n"
                except Exception as apt_lookup_err:
                    logger.warning(f"Could not load appointment records in EP: {apt_lookup_err}")

                raw_greeting = agent_data.get('greeting_message') or default_greeting
                is_inbound_call = not bool(campaign_contact)
                call_direction = "inbound" if is_inbound_call else "outbound"

                # Resolve greeting message preserving user custom text and dynamic parameters
                greeting_message, disc_variant, disc_lang = resolve_agent_greeting(
                    raw_greeting=raw_greeting,
                    clean_name=clean_name,
                    business_name=business_name_val,
                    campaign_contact=campaign_contact,
                    customer=customer,
                    language=language,
                    gender_tag=gender_tag,
                    direction=call_direction,
                    agent_config=agent_data,
                    purpose=campaign_contact.get("notes") if campaign_contact else None
                )

                # Persist call disclosure telemetry asynchronously (Phase 1)
                disc_cfg = (agent_data.get("disclosure_config") or {}) if agent_data else {}
                disc_mode = resolve_jurisdiction_consent_mode(
                    configured_mode=disc_cfg.get("consent_mode"),
                    phone_number=campaign_contact.get("phone_number") if campaign_contact else None,
                    country_code=disc_cfg.get("jurisdiction"),
                    call_direction=call_direction,
                    is_marketing=True,
                    lawyer_confirmed=bool((disc_cfg.get("exemption_details") or {}).get("lawyer_confirmed", False))
                )
                if ctx.room and ctx.room.name:
                    asyncio.create_task(persist_call_disclosure(
                        supabase_client=supabase_admin,
                        room_name=ctx.room.name,
                        disclosure_text=greeting_message,
                        variant=disc_variant,
                        language=disc_lang,
                        consent_mode=disc_mode,
                        consent_outcome="consented"
                    ))

                if campaign_contact:
                    c_name = campaign_contact.get("full_name") or ""
                    c_company = campaign_contact.get("company_name") or ""
                    c_notes = campaign_contact.get("notes") or ""
                    end_msg_text = agent_data.get("ending_message", "") if agent_data else ""
                    personalized_context = build_outbound_sales_protocol(
                        prospect_name=c_name,
                        prospect_company=c_company,
                        lead_notes=c_notes,
                        business_info=business_info,
                        bot_name=clean_name,
                        gender_tag=gender_tag,
                        end_msg_text=end_msg_text
                    )
                    system_prompt += personalized_context

                # 11. Ending and Fallback Messages
                if agent_data and agent_data.get("ending_message"):
                    end_msg = agent_data['ending_message']
                    system_prompt += (
                        f"\n\n## CALL ENDING & ENGAGEMENT RULES (STRICT CRITICAL RULES):\n"
                        f"1. Natural Call Conclusion: When the caller explicitly wants to end the call (e.g. says goodbye, says they must hang up, or has confirmed a callback/appointment), you MUST say exactly: '{end_msg}'\n"
                        f"2. ABSOLUTE PROHIBITION: NEVER say '{end_msg}' at the start of the call or after greeting!\n"
                        f"3. Affirmative Response Handling: If the caller says yes, 'haan', 'batao', 'bolo', or gives permission to speak after your greeting, they want to hear why you called! IMMEDIATELY introduce the reason for your call, discuss products/services, or ask a helpful discovery question. NEVER say goodbye when the prospect is listening!"
                    )

                if agent_data and agent_data.get("fallback_message"):
                    fb_msg = agent_data['fallback_message']
                    system_prompt += (
                        f"\n\n## FALLBACK MESSAGE DIRECTIVE:\n"
                        f"If you ever fail to hear or understand what the caller said (or if their speech was completely unclear or garbled), "
                        f"respond naturally using your configured fallback message: '{fb_msg}'"
                    )
                
                # 12. Fetch Knowledge Base (budgeted to max 1500 chars per doc to prevent 413 token limits)
                kb_docs = (await kb_task) if kb_task else (await fetch_knowledge_base(agent_id))
                if kb_docs:
                    kb_context = "\n\n=== BUSINESS KNOWLEDGE BASE ===\n"
                    for doc in kb_docs:
                        excerpt = (doc.get('content_excerpt') or '').strip()
                        if len(excerpt) > 1500:
                            excerpt = excerpt[:1500] + "..."
                        kb_context += f"\n--- {doc.get('name', 'Document')} ---\n{excerpt}\n"
                    system_prompt += kb_context

                # 13. Critical Business Scope Grounding, 10-Digit Phone Verification, Email/WhatsApp Reminders
                if "## STRICT BUSINESS SCOPE GROUNDING" not in system_prompt:
                    system_prompt += (
                        f"\n\n## STRICT BUSINESS SCOPE GROUNDING & ANTI-HALLUCINATION:\n"
                        f"1. You represent {company_display}. You ONLY book appointments, schedule demos, and answer questions for products and services explicitly offered by {company_display} (such as AI voice agents, software automation, consultation, and technical support).\n"
                        f"2. OUT-OF-SCOPE PROHIBITION: If a caller asks to book an appointment for an unrelated or medical service (e.g. regular health checkups, doctor consultations, clinic tests, hospital visits, dental appointments, salons), you MUST politely decline:\n"
                        f"   'Maaf kariyega, hum regular health checkups ya doctor services provide nahi karte hain. {company_display} voice agents aur business automation solutions provide karti hai. Kya aap hamare AI automation ke baare mein demo ya consultation schedule karna chahenge?'\n"
                        f"3. NEVER pretend to be a doctor, hospital, or clinic. NEVER accept or confirm a medical regular checkup under any circumstances!\n"
                        f"\n## 10-DIGIT CONTACT PHONE NUMBER VALIDATION:\n"
                        f"1. Contact phone numbers in India must have exactly 10 digits.\n"
                        f"2. When the caller provides a phone number, count the digits: if they provide fewer than 10 digits (such as 9 digits like '654298356'), you MUST NOT accept or confirm it. Immediately ask: 'Yeh 9 digits hain, kripya apna poora 10-digit mobile number bata dijiye?'\n"
                        f"3. Do not proceed to confirmation until all 10 digits are provided.\n"
                        f"\n## EMAIL & WHATSAPP REMINDERS AND CONFIRMATIONS (CRITICAL RULE 52 & 53):\n"
                        f"1. Automated delivery is 100% active. If the caller asks for email or WhatsApp confirmations or reminders (e.g., 'kya aap mujhe mail par reminder bhej sakte ho?', 'email par confirmation aayega?'), ALWAYS enthusiastically assure them:\n"
                        f"   'Haan bilkul! Hum aapko email aur WhatsApp dono par confirmation aur reminder bhejte hain. Hum aapko mail reminder bhej denge.'\n"
                        f"2. STRICT PROHIBITION: You must NEVER say email sending or mail reminders are unavailable ('mere paas email par reminder bhejne ka option nahi hai'). It is fully active and supported.\n"
                    )

                # 14. Enforce Gender-consistent Hindi/Hinglish Grammar
                system_prompt = apply_gender_grammar_directives(system_prompt, gender_tag, bot_name, voice_id)

                # 14b. Mandatory Phase 1 Compliance Directives (Decline Recording & Human Transfer)
                system_prompt += (
                    f"\n\n## CALL DISCLOSURE & CONSENT DIRECTIVES (PHASE 1):\n"
                    f"1. AI & Recording Transparency: You have explicitly disclosed that you are an AI assistant and that this call is recorded.\n"
                    f"2. Right to Decline Recording: If the caller explicitly objects to being recorded, asks you to stop recording, or refuses recording consent, you MUST invoke `decline_call_recording`.\n"
                    f"3. Human Escalation: If the caller asks to speak to a human, real person, or live agent, you MUST invoke `transfer_to_human` immediately.\n"
                    f"4. Keypress/Spoken Consent: If the caller was prompted to press 1 / say yes, acknowledge their consent warmly. If they pressed 2 / said no, respect their refusal.\n"
                )

                # 14c. Enforce AI Identity Guard & Truthfulness (Step 0 compliance)
                system_prompt = enforce_prompt_ai_guard(system_prompt)

                # 15. Store prompt suffix for multi-personality mid-call transitions
                if agent_data.get("_multi_personality_enabled"):
                    agent_data["_prompt_suffix"] = system_prompt[len(base_prompt):]

        except Exception as e:
            logger.error(f"Failed to fetch config for agent: {e}")

    # Map pitch Shift specifically for Sarvam Bulbul relative shift range [-0.5, 0.5]
    sarvam_pitch = 0.0
    if provider == 'sarvam':
        try:
            p_flt = float(pitch)
            if 0.5 <= p_flt <= 1.5:
                sarvam_pitch = p_flt - 1.0
            elif abs(p_flt) <= 0.5:
                sarvam_pitch = p_flt
            else:
                sarvam_pitch = max(-0.5, min(0.5, p_flt / 24.0))
        except Exception:
            sarvam_pitch = 0.0

    # Create appointment tools for live verification and booking
    appointment_tools = create_appointment_tools(
        organization_id=organization_id,
        user_id=user_id,
        agent_id=agent_id,
        call_id=call_sid
    )

    # 2. Create the agent instance with actual settings
    agent_instance = VikramAgent(
        instructions=system_prompt,
        voice_provider=provider,
        voice_id=voice_id,
        voice_speed=speed,
        voice_pitch=sarvam_pitch,
        language=language,
        llm_provider=agent_data.get('llm_provider') if agent_data else None,
        llm_model=agent_data.get('llm_model') if agent_data else None,
        temperature=agent_data.get('temperature') if agent_data else None,
        tools=appointment_tools,
    )

    agent_instance.room = ctx.room

    if greeting_message:
        agent_instance.greeting_message = greeting_message

    male_names = {'vikram', 'shubh', 'aditya', 'rahul', 'rohan', 'amit', 'dev', 'ratan', 'varun', 'manan', 'sumit', 'kabir', 'aayan', 'ashutosh', 'advait', 'anand', 'tarun', 'sunny', 'mani', 'gokul', 'vijay', 'mohit', 'rehan', 'soham', 'arvind', 'neel', 'arjun', 'amol', 'raghav'}
    resolved_bot_name = locals().get('bot_name') or (agent_data.get('bot_name') if agent_data else None) or (agent_data.get('name') if agent_data else None) or 'Vikram'
    voice_is_male = (str(voice_id).lower() in SARVAM_MALE_VOICES) or (voice_id in ['pNInz6obpgDQGcFmaJgB', 'TxGEqnHWrfWFTfGW9XjX'])
    name_is_male = str(resolved_bot_name).lower() in male_names
    explicit_gender = locals().get('gender_tag') or (agent_data.get('gender') if agent_data else None)
    if explicit_gender in ('male', 'female'):
        resolved_gender = explicit_gender
    elif voice_is_male or name_is_male:
        resolved_gender = 'male'
    else:
        resolved_gender = 'female'

    agent_instance.bot_name = resolved_bot_name
    agent_instance.business_name = business_name_val if 'business_name_val' in dir() else (agent_data.get('business_name', '') if agent_data else '')
    agent_instance.gender = resolved_gender
    if hasattr(agent_instance, 'tts') and hasattr(agent_instance.tts, '_gender'):
        agent_instance.tts._gender = resolved_gender
    agent_instance.prospect_name = c_name if ('campaign_contact' in locals() and campaign_contact and locals().get('is_name_valid')) else (locals().get('cust_name') or "")
    agent_instance.campaign_goal = locals().get('notes_summary') if ('campaign_contact' in locals() and campaign_contact) else ""
    agent_instance.ending_message = agent_data.get("ending_message", "") if agent_data else ""
    agent_instance.fallback_message = agent_data.get("fallback_message", "") if agent_data else ""

    if agent_data and agent_data.get("status") == "paused":
        logger.warning(f"Agent {agent_id} is paused. Rejecting call.")
        
        async def play_paused_and_disconnect():
            await asyncio.sleep(1) # wait for connection
            await agent_instance.say("This service is temporarily unavailable due to limits. Please try again later.")
            await asyncio.sleep(4)
            await ctx.room.disconnect()
            
        asyncio.create_task(play_paused_and_disconnect())
        
        session = AgentSession(vad=get_vad_model())
        await session.start(agent=agent_instance, room=ctx.room)
        return

    # Configure fast local VAD turn detection with noise-resistant interruption guards (Rule 54.2, 56, 57, 58)
    session = AgentSession(
        vad=get_vad_model(),
        turn_detection="vad",
        min_endpointing_delay=0.85,
        max_endpointing_delay=2.2,
        preemptive_generation=True,
        min_interruption_duration=0.6,
        min_interruption_words=4,
        resume_false_interruption=True,
    )
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

    # --- TRANSCRIBE & INTENT-BASED CALL CUT HOOKS TO FRONTEND (entrypoint path) ---
    call_ending_in_progress = False
    call_transcript_turns: list[str] = []

    async def execute_intent_disconnect(delay_seconds: float = 6.0):
        nonlocal call_ending_in_progress
        if call_ending_in_progress:
            return
        call_ending_in_progress = True
        logger.info("[Intent Call Cut - EP] Closing intent detected. Waiting for speech synthesis and playback to complete...")

        # 1. If agent is currently thinking or preparing reply, wait for it to start speaking (up to 3.5s)
        for _ in range(35):
            state = getattr(session, 'agent_state', '')
            if state == 'speaking':
                break
            if state not in ('thinking', 'initializing'):
                break
            await asyncio.sleep(0.1)

        # 2. Wait until the agent finishes speaking completely (up to 12s)
        speech_timeout = 0
        while getattr(session, 'agent_state', '') == 'speaking' and speech_timeout < 120:
            await asyncio.sleep(0.1)
            speech_timeout += 1

        # 3. Grace period for audio stream buffer and carrier line to finish playing (0.8s)
        logger.info("[Intent Call Cut - EP] Agent finished speaking. Waiting 0.8s playback drain before disconnect...")
        await asyncio.sleep(0.8)

        # 1. Notify browser client to hang up immediately
        try:
            call_end_signal = json.dumps({
                "type": "call_ended",
                "reason": "intent_goodbye"
            }).encode("utf-8")
            if ctx.room and ctx.room.local_participant:
                await ctx.room.local_participant.publish_data(call_end_signal)
                logger.info("[Intent Call Cut] Sent 'call_ended' signal to browser")
        except Exception as sig_err:
            logger.warning(f"Error publishing call_ended signal: {sig_err}")

        # 2. Force delete room on LiveKit API to disconnect all participants
        try:
            lk_url = os.getenv("LIVEKIT_URL")
            lk_key = os.getenv("LIVEKIT_API_KEY")
            lk_sec = os.getenv("LIVEKIT_API_SECRET")
            if lk_url and lk_key and lk_sec and ctx.room:
                from livekit.api import LiveKitAPI, DeleteRoomRequest
                lk_api = LiveKitAPI(lk_url, lk_key, lk_sec)
                await lk_api.room.delete_room(DeleteRoomRequest(room=ctx.room.name))
                await lk_api.aclose()
                logger.info(f"[Intent Call Cut] LiveKit server room '{ctx.room.name}' deleted")
        except Exception as lk_err:
            logger.warning(f"LiveKit API delete room warning: {lk_err}")

        # 3. Disconnect local room
        try:
            if ctx.room:
                await ctx.room.disconnect()
        except Exception:
            pass
        session_done.set()

    user_demanded_cut = False

    def check_closing_intent(text: str) -> bool:
        if not text:
            return False
        t = text.lower().strip()

        if user_demanded_cut:
            return True

        # SAFETY GUARD 1: If caller gave affirmative permission to speak, NEVER disconnect
        user_requested_cut = False
        if call_transcript_turns:
            last_customer_turns = [turn for turn in call_transcript_turns if turn.startswith("customer:")]
            if last_customer_turns:
                last_cust = last_customer_turns[-1].lower()
                user_giving_permission = any(aff in last_cust for aff in [
                    "haan", "batao", "bolo", "btao", "yes", "sure", "kahiye",
                    "हाँ", "हां", "बताओ", "बताइए", "बोलो", "बोलिए", "कहिए", "अदिति"
                ])
                if user_giving_permission and len(call_transcript_turns) <= 4:
                    logger.warning(f"[check_closing_intent] BLOCKED false disconnect: caller gave permission ('{last_cust}') on turn {len(call_transcript_turns)}")
                    return False
                if any(cut in last_cust for cut in [
                    "call cut", "phone rakh", "phone kaat", "bye", "disconnect", "cut the call",
                    "cut kar", "kaat do", "nahi chahiye", "not interested", "wrong number",
                    "thank you", "thanks", "dhanyawad", "shukriya"
                ]):
                    user_requested_cut = True

        # SAFETY GUARD 2: Early turns (<= 2) cannot trigger disconnect unless caller explicitly demanded it
        if len(call_transcript_turns) <= 2 and not user_requested_cut and not user_demanded_cut:
            logger.warning(f"[check_closing_intent] Suppressing early disconnect attempt on turn {len(call_transcript_turns)}: '{text}'")
            return False

        configured_ending = agent_data.get("ending_message", "").lower().strip() if agent_data else ""
        if configured_ending and len(t) >= 15 and configured_ending in t:
            return True
        
        closing_phrases = [
            "goodbye", "good bye", "bye bye", "take care", "have a nice day",
            "have a good day", "have a great day", "have a wonderful day",
            "talk to you later", "see you later", "see you soon",
            "alvida", "phir milenge", "milte hain",
            "baat karke achha laga", "baat karke accha laga",
            "baat karke bohot achha laga", "baat karke bohot accha laga",
            "baat karke bahut achha laga", "baat karke bahut accha laga",
            "call cut", "phone rakh", "phone kaat",
            "call disconnect", "cut the call", "you can cut", "cut kar do",
            "cut kar dijiye", "cut kar de", "cut kar 2",
            "you're welcome", "you are welcome", "most welcome", "welcome",
            "koi baat nahi", "mention not", "dhanyavaad", "dhanyawad", "shukriya",
            "अलविदा", "गुडबाय", "गुड बाय", "बाय बाय", "फिर मिलेंगे",
            "बात करके अच्छा लगा", "बात करके बहुत अच्छा लगा", "वेलकम", "धन्यवाद", "शुक्रिया"
        ]
        if any(phrase in t for phrase in closing_phrases):
            return True
        if re.search(r'\bbye\b', t) and not re.search(r'\b(by the way|stand by|by)\b', t):
            return True
        return False

    @session.on("conversation_item_added")
    def _on_conversation_item_added_ep(event):
        nonlocal user_demanded_cut
        try:
            item = getattr(event, 'item', None)
            if not item:
                return
            role = getattr(item, 'role', '')
            text = getattr(item, 'text_content', '') or getattr(item, 'content', '')
            if isinstance(text, list):
                text = " ".join(str(t) for t in text)
            text = str(text).strip()
            if not text:
                return

            speaker = "agent" if role in ("assistant", "system") else "customer"
            clean_txt = clean_ssml(text, is_transcript=True)
            clean_txt = re.sub(r'\[(?:CRITICAL|FLOW NOTE|OBJECTION|CONVERSATION GUIDANCE)[^\]]*\]', '', clean_txt, flags=re.IGNORECASE).strip()
            if role == "user" and clean_txt:
                fem_flag = getattr(agent_instance, 'gender', 'female') == 'female' if agent_instance else locals().get('is_female', True)
                bot_nm = getattr(agent_instance, 'bot_name', None) or locals().get('bot_name') or 'Aditi'
                clean_txt = normalize_user_transcript(clean_txt, agent_name=bot_nm, is_female=fem_flag)

            if clean_txt:
                turn_label = f"{speaker}: {clean_txt}"
                if not call_transcript_turns or call_transcript_turns[-1] != turn_label:
                    call_transcript_turns.append(turn_label)
                payload = json.dumps({
                    "type": "transcript",
                    "speaker": speaker,
                    "text": clean_txt
                }).encode("utf-8")
                asyncio.create_task(ctx.room.local_participant.publish_data(payload))
                if role == "user":
                    logger.info(f"[AgentSession - EP] Customer turn transcribed: '{clean_txt}'")
                    u_lower = clean_txt.lower()
                    cust_count = sum(1 for t in call_transcript_turns if t.startswith("customer:"))
                    # Check for explicit hang up / cut commands
                    if any(k in u_lower for k in [
                        "cut the call", "you can cut", "cut kar do", "cut kar dijiye",
                        "cut kar 2", "call cut", "phone rakh do", "phone rakh dijiye",
                        "kaat do", "phone kaat", "disconnect kar", "call disconnect",
                        "call end", "end the call", "hang up", "bye bye", "alvida",
                        "kuch nahi chahiye", "kuch nahi", "sab ho gaya", "bas itna hi",
                        "that's all", "thats all", "all done", "no more help"
                    ]):
                        logger.info(f"[Intent Call Cut - EP] Customer explicitly requested call cut: '{clean_txt}' -> scheduling graceful disconnect")
                        user_demanded_cut = True
                        asyncio.create_task(execute_intent_disconnect())
                    # Check for polite closing signals like "thank you" / "thanks" / "shukriya" / "dhanyawad"
                    elif any(k in u_lower for k in [
                        "thank you", "thanks", "thx", "shukriya", "dhanyawad", "dhanyavaad",
                        "shukriyaa", "bahut shukriya", "bohot shukriya", "bye",
                        "धन्यवाद", "शुक्रिया", "थैंक यू", "थैंक्स"
                    ]):
                        if cust_count >= 2:
                            logger.info(f"[Intent Call Cut - EP] Customer signaled closing gratitude ('{clean_txt}') on turn {cust_count} -> scheduling graceful disconnect")
                            user_demanded_cut = True
                            asyncio.create_task(execute_intent_disconnect())

            # Trigger intent disconnect if assistant says goodbye or customer commanded cut
            customer_turn_count = sum(1 for t in call_transcript_turns if t.startswith("customer:"))
            if role == "assistant" and (check_closing_intent(text) or user_demanded_cut) and (customer_turn_count >= 2 or user_demanded_cut):
                logger.info(f"[Intent Call Cut] Closing utterance by assistant: '{text}' (user_demanded_cut={user_demanded_cut}) -> scheduling graceful disconnect after speech finishes")
                asyncio.create_task(execute_intent_disconnect())
        except Exception as err:
            logger.warning(f"Error in conversation_item_added hook: {err}")

    # NOTE: user_speech_committed and agent_speech_committed transcript hooks
    # removed — conversation_item_added already publishes transcripts for both
    # user and agent turns. Having separate hooks caused 2-3x duplicate messages
    # in the frontend.

    session_done = asyncio.Event()

    @session.on("close")
    def _on_session_close(event):
        logger.info(f"[AgentSession] Session closed ({getattr(event, 'reason', 'unknown')}). Setting session_done.")
        session_done.set()

    if ctx.room:
        @ctx.room.on("disconnected")
        def _on_room_disconnected(reason):
            logger.info(f"[LiveKit Room] Room disconnected ({reason}). Setting session_done.")
            session_done.set()

    try:
        await session.start(agent=agent_instance, room=ctx.room)
        # Block until the caller disconnects or the session closes
        await session_done.wait()
    except Exception as e:
        logger.error(f"Error during active session: {e}")
    finally:
        # Await lead extraction and analytics saving BEFORE worker process finishes
        try:
            if agent_id and user_id:
                duration = int(time.time() - call_start_time)
                
                # Only increment minutes and save if there was actual speech or duration >= 3s
                if duration < 3 and not (call_transcript_turns or _get_transcript_messages(agent_instance)):
                    logger.info(f"[entrypoint] Call duration {duration}s with no speech in room {ctx.room.name if ctx.room else 'unknown'}. Skipping ghost call.")
                else:
                    if duration > 0:
                        try:
                            import math
                            from app.services.usage_service import UsageService
                            usage_service = UsageService(supabase_admin)
                            await usage_service.increment_minutes(agent_id, duration)
                            logger.info(f"Incremented usage for agent {agent_id}: {duration}s call -> {math.ceil(duration / 60)} minutes charged.")
                        except Exception as usage_err:
                            logger.error(f"Failed to increment usage minutes: {usage_err}")

                    # Extract full transcript from accumulated turns or fallback
                    transcript = "\n".join(call_transcript_turns).strip()
                    if not transcript:
                        messages = _get_transcript_messages(agent_instance)
                        transcript = "\n".join([f"{getattr(m, 'role', '')}: {getattr(m, 'content', '')}" for m in messages if hasattr(m, 'role') and getattr(m, 'role', '') in ("user", "assistant")])
                    
                    if not contact_id and ctx.room:
                        try:
                            vc_res = await asyncio.to_thread(
                                supabase_admin.table("voice_calls").select("metadata").eq("metadata->>room_name", ctx.room.name).limit(1).execute
                            )
                            if vc_res and vc_res.data and len(vc_res.data) > 0:
                                meta = vc_res.data[0].get("metadata") or {}
                                contact_id = meta.get("contact_id")
                                if not call_sid:
                                    call_sid = meta.get("provider_call_id") or meta.get("session_id")
                        except Exception as e:
                            logger.warning(f"Failed to lookup metadata from voice_calls for room {ctx.room.name}: {e}")

                    if transcript or duration >= 3:
                        logger.info(f"Awaiting save/extraction of completed call details ({duration}s)...")
                        await extract_and_save_lead(
                            transcript or "Call completed.",
                            agent_id,
                            user_id,
                            organization_id,
                            duration,
                            call_sid=call_sid,
                            contact_id=contact_id,
                            room_name=ctx.room.name if ctx.room else None
                        )
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


_running_agent_rooms: set[str] = set()

async def run_agent(room_name: str, agent_id: str | None = None, contact_id: str | None = None, agent_data: dict | None = None, contact_data: dict | None = None):
    if not room_name:
        return
    if os.getenv("DISABLE_IN_PROCESS_AGENT", "false").lower() == "true":
        logger.info(f"[run_agent] In-process agent disabled (DISABLE_IN_PROCESS_AGENT=true). External LiveKit worker entrypoint will manage room '{room_name}'.")
        return
    if room_name in _running_agent_rooms:
        logger.warning(f"[AGENT RUN GUARD] Room '{room_name}' already has an active agent task. Aborting duplicate run_agent call.")
        return
    _running_agent_rooms.add(room_name)

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
    bot_name = "Vikram"
    gender_tag = "female"
    is_female = True
    business_name_val = ""

    if not agent_id and room_name.startswith("room-"):
        parts = room_name.split("-")
        if len(parts) >= 6:
            agent_id = "-".join(parts[1:-1])

    user_id = None
    organization_id = None

    if agent_id:
        if not agent_data:
            try:
                res = await asyncio.to_thread(
                    supabase_admin.table("agents").select("*, user_id, organization_id").eq("id", agent_id).execute
                )
                if res.data:
                    agent_data = res.data[0]
            except Exception as e:
                logger.error(f"Failed to fetch agent configs in background run_agent: {e}")

        try:
            if agent_data:
                user_id = agent_data.get("user_id")
                organization_id = agent_data.get("organization_id")
                if agent_data.get("voice_provider"): provider = agent_data["voice_provider"]
                if agent_data.get("voice_id"): voice_id = agent_data["voice_id"]
                
                # Sanitize voice provider and voice id for legacy/broken configurations
                fake_elevenlabs_ids = ['calm', 'energetic', 'warm', 'professional', 'anika-voice', 'nova-openai', 'shimmer-openai', 'echo-openai', 'onyx-openai', 'fable-openai']
                if provider == 'elevenlabs' and (voice_id in fake_elevenlabs_ids or '-' in voice_id):
                    provider = 'sarvam'
                    voice_id = 'anushka'

                if provider == 'sarvam' and str(voice_id).lower() == 'aditi':
                    # Sarvam bulbul:v3 uses ritu as conversational female voice
                    voice_id = 'ritu'
                    
                if agent_data.get("primary_language"): language = agent_data["primary_language"]
                if agent_data.get("voice_speed"): speed = agent_data["voice_speed"]
                if agent_data.get("voice_pitch"): pitch = agent_data["voice_pitch"]
                # 1. Resolve Gender and Clean Name
                gender_tag = 'female' if str(voice_id).lower() in SARVAM_FEMALE_VOICES else 'male'
                is_female = (gender_tag == 'female')

                raw_name = agent_data.get('name', 'Agent')
                clean_name = re.sub(r'^\[[^\]]+\]\s*', '', raw_name)
                clean_name = re.sub(r'\s*-\s*(Demo|Trial)\s*$', '', clean_name, flags=re.IGNORECASE).strip()
                if clean_name.lower() in ('multi agent', 'multi-agent', 'agent', 'sales agent', 'appointment agent', 'appointment booker', 'appointment booking agent', 'appointment booking', 'support agent', 'lead qualifier', 'lead qualifier agent', 'sales executive', ''):
                    v_str = str(voice_id).strip().lower()
                    if v_str in SARVAM_FEMALE_VOICES or v_str in SARVAM_MALE_VOICES:
                        clean_name = v_str.capitalize()
                    elif gender_tag == 'female':
                        clean_name = "Aditi"
                    else:
                        clean_name = "Vikram"
                bot_name = clean_name

                # 2. Fetch User Profile & Business Info
                profile_data = {}
                try:
                    prof_res = await asyncio.to_thread(
                        supabase_admin.table("profiles").select("company_name, country").eq("id", user_id).execute
                    )
                    if prof_res.data:
                        profile_data = prof_res.data[0]
                except Exception as e:
                    logger.error(f"Failed to fetch profile for business name in run_agent: {e}")

                if not agent_data.get("voice_provider") and profile_data:
                    country = profile_data.get("country", "")
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

                raw_system_prompt = agent_data.get("system_prompt") or ""
                business_info = extract_business_info(raw_system_prompt, agent_data, profile_data)
                business_name_val = business_info["business_name"]
                company_display = business_name_val or 'our company'

                # 3. Resolve Base Prompt (Multi-personality vs Single-personality vs Custom Prompt)
                personalities_raw = agent_data.get("personalities")
                enabled_count = _count_enabled_personalities(personalities_raw)
                base_prompt = ""
                if enabled_count == 1:
                    agent_data["_multi_personality_enabled"] = False
                    try:
                        p_dict = json.loads(personalities_raw) if isinstance(personalities_raw, str) else (personalities_raw or {})
                        active_role = next((k for k, v in p_dict.items() if v is True), None)
                        if active_role:
                            from app.services.prompt_service import PromptService
                            prompt_svc = PromptService(supabase_admin)
                            base_prompt = await prompt_svc.get_prompt(active_role)
                            logger.info(f"[SINGLE-PERSONALITY (run_agent)] Resolved base prompt for active role '{active_role}' for agent {agent_id}")
                    except Exception as sp_err:
                        logger.warning(f"[SINGLE-PERSONALITY (run_agent)] Error resolving base prompt: {sp_err}")
                elif enabled_count >= 2:
                    try:
                        _ep = (
                            json.loads(personalities_raw)
                            if isinstance(personalities_raw, str)
                            else (personalities_raw or {})
                        )
                        agent_data["_multi_personality_enabled"] = True
                        agent_data["_enabled_personalities"] = _ep
                        from app.services.prompt_service import PromptService
                        prompt_svc = PromptService(supabase_admin)
                        base_prompt = prompt_svc._load_from_file("multi_agent")
                        if not base_prompt or "You are" not in base_prompt:
                            path_m = os.path.normpath(os.path.join(PROMPTS_DIR, "multi_agent.txt"))
                            if os.path.exists(path_m):
                                with open(path_m, "r", encoding="utf-8") as mf:
                                    base_prompt = mf.read()
                        logger.info(f"[MULTI-PERSONALITY (run_agent)] Loaded base prompt from multi_agent.txt for agent {agent_id}")
                    except Exception as mp_err:
                        logger.warning(f"[MULTI-PERSONALITY (run_agent)] Setup failed: {mp_err}")
                        agent_data["_multi_personality_enabled"] = False
                else:
                    agent_data["_multi_personality_enabled"] = False

                if not base_prompt:
                    base_prompt = agent_data.get("system_prompt") or load_system_prompt()

                # 4. Substitute placeholders and scrub generic identity
                base_prompt = base_prompt.replace('{{agent_name}}', bot_name).replace('{agentName}', bot_name).replace('{{name}}', bot_name)
                base_prompt = base_prompt.replace('{{company_name}}', company_display).replace('{companyName}', company_display)
                generic_names = [
                    r'\{\{agent_name\}\}', r'\{agentName\}', r'\{agent_name\}', r'\{name\}',
                    r'\bMulti Agent\b', r'\bmulti agent\b', r'\bSales Agent\b', r'\bsales agent\b',
                    r'\bAppointment Agent\b', r'\bappointment agent\b', r'\bSupport Agent\b', r'\bsupport agent\b',
                    r'\bLead Qualifier\b', r'\blead qualifier\b'
                ]
                for pat in generic_names:
                    base_prompt = re.sub(pat, bot_name, base_prompt)

                system_prompt = base_prompt

                # 5. Append Personality style prompt
                personality = agent_data.get("personality", "friendly")
                personality_prompts = {
                    "professional": "\n\n## PERSONALITY STYLE: PROFESSIONAL\n- Speak formally, politely, and professionally.\n- Be concise and business-like.\n- Avoid excessive slang or casual language.\n- Keep your focus on efficiency and clear facts.",
                    "friendly": "\n\n## PERSONALITY STYLE: FRIENDLY\n- Speak in a warm, friendly, and conversational tone.\n- Use natural fillers and expressions (e.g., 'actually', 'hmm', 'dekhiye', 'bilkul').\n- Be enthusiastic and welcoming.",
                    "assertive": "\n\n## PERSONALITY STYLE: ASSERTIVE\n- Speak directly, confidently, and proactively.\n- Be sales-focused, persuasive, and clear about value propositions.\n- Guide the conversation proactively.",
                    "empathetic": "\n\n## PERSONALITY STYLE: EMPATHETIC\n- Speak in a highly caring, patient, and understanding tone.\n- If the caller shares problems, show deep empathy and validate their feelings.\n- Slow down and explain things step-by-step."
                }
                system_prompt += personality_prompts.get(personality.lower(), personality_prompts["friendly"])

                # 6. Append Expressiveness rules
                expressive_instructions = build_agent_expressive_rules(bot_name=bot_name, gender_tag=gender_tag, business_name=business_name_val)
                if "## TRINETRA AGENT BEHAVIOR" not in system_prompt and "## HUMAN EXPRESSIVENESS RULES" not in system_prompt:
                    system_prompt += expressive_instructions

                # 7. Extract default greeting from system_prompt
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

                # 8. Fetch Caller Identity & Campaign Contact
                caller_number = "Unknown"
                if room_name and "--" in room_name:
                    parts = room_name.split("--")
                    if len(parts) >= 3:
                        if not agent_id and parts[1] not in ("noagent", "None", "", "unknown", "call"):
                            agent_id = parts[1]
                        val = parts[2]
                        is_uuid = False
                        try:
                            import uuid as _uuid
                            _uuid.UUID(str(val))
                            is_uuid = True
                        except Exception:
                            is_uuid = False
                        if is_uuid:
                            contact_id = val
                        elif val not in ("nocontact", "None", "", "unknown"):
                            cleaned = re.sub(r'[^\d+]', '', val)
                            if len(cleaned) >= 10:
                                caller_number = cleaned

                if room_name:
                    try:
                        vc_res = await asyncio.to_thread(
                            supabase_admin.table("voice_calls")
                            .select("caller_phone, metadata")
                            .or_(f"metadata->>room_name.eq.{room_name},metadata->>provider_call_id.eq.{room_name}")
                            .order("started_at", desc=True)
                            .limit(1)
                            .execute
                        )
                        if vc_res.data and len(vc_res.data) > 0:
                            v_row = vc_res.data[0]
                            if v_row.get("caller_phone"):
                                caller_number = v_row["caller_phone"]
                            meta = v_row.get("metadata") or {}
                            if not contact_id and meta.get("contact_id"):
                                contact_id = meta.get("contact_id")
                    except Exception as vc_err:
                        logger.warning(f"Could not fetch caller_phone from voice_calls for room {room_name}: {vc_err}")

                if caller_number == "Unknown" and room_name:
                    for part in re.split(r'[-_]', room_name):
                        cleaned = re.sub(r'[^\d+]', '', part)
                        if len(cleaned) >= 10:
                            caller_number = cleaned
                            break

                campaign_contact = None
                if not contact_id and room_name and ("twilio-" in room_name or "sip-" in room_name):
                    call_sid = room_name.split("_")[0].replace("twilio-", "").replace("sip-", "")
                    try:
                        call_res = await asyncio.to_thread(
                            supabase_admin.table("voice_calls").select("metadata").eq("metadata->>provider_call_id", call_sid).maybe_single().execute
                        )
                        if call_res and getattr(call_res, "data", None) and isinstance(call_res.data, dict) and call_res.data.get("metadata"):
                            contact_id = call_res.data["metadata"].get("contact_id")
                    except Exception as e:
                        logger.error(f"Failed to resolve contact_id from voice_calls metadata in run_agent: {e}")

                if contact_data:
                    campaign_contact = contact_data
                elif contact_id:
                    try:
                        c_res = await asyncio.to_thread(
                            supabase_admin.table("campaign_contacts").select("*").eq("id", contact_id).maybe_single().execute
                        )
                        campaign_contact = c_res.data
                        if campaign_contact:
                            if (caller_number == "Unknown" or not caller_number) and campaign_contact.get("phone"):
                                caller_number = campaign_contact["phone"]
                    except Exception as e:
                        logger.error(f"Failed to fetch campaign contact {contact_id} in run_agent: {e}")

                if not campaign_contact and room_name:
                    try:
                        if 'meta' in locals() and meta and meta.get("is_callback"):
                            cb_name = meta.get("prospect_name") or "Prospect"
                            cb_notes = meta.get("notes") or "Scheduled callback"
                            campaign_contact = {
                                "full_name": cb_name,
                                "phone": caller_number,
                                "notes": f"Scheduled callback from previous conversation: {cb_notes}",
                                "company_name": ""
                            }
                            logger.info(f"[Callback Context] Recognized automated callback for {cb_name} ({caller_number})")
                    except Exception as cb_err:
                        logger.warning(f"Failed to parse callback metadata: {cb_err}")

                # 9. Lookup Returning Customer
                customer = None
                if not campaign_contact and organization_id and caller_number != "Unknown":
                    try:
                        from app.services.caller_lookup import CallerLookupService
                        lookup_svc = CallerLookupService(supabase_admin)
                        customer = await lookup_svc.lookup_caller(organization_id, caller_number)
                        if customer:
                            cust_name = customer.get("full_name") or ""
                            cust_notes = customer.get("notes") or ""
                            cust_company = customer.get("company") or ""
                            cust_tags = customer.get("tags") or []
                            logger.info(f"[CallerLookup] Recognized returning customer: {cust_name} ({caller_number})")
                            customer_context = f"\n\n## CALLER RECOGNITION (CUSTOMER DATABASE MATCH)\n- Caller Name: {cust_name}\n- Caller Phone: {caller_number}\n- Company: {cust_company}\n- Customer Tags: {', '.join(cust_tags) if cust_tags else 'None'}\n- Past Interaction History / Notes: {cust_notes or 'First recorded interaction'}\n- INSTRUCTION: Address the caller warmly by their name ({cust_name}) as a valued contact. Do not introduce yourself as a stranger!\n"
                            system_prompt += customer_context
                    except Exception as lookup_err:
                        logger.error(f"Failed to lookup caller: {lookup_err}")

                # 10. Lookup Existing Appointment Records in DB
                try:
                    apt_query = supabase_admin.table("appointments").select("contact_name, contact_phone, scheduled_at, meeting_type, status").order("created_at", desc=True)
                    if caller_number and caller_number != "Unknown":
                        apt_query = apt_query.ilike("contact_phone", f"%{caller_number}%")
                    elif user_id:
                        apt_query = apt_query.eq("user_id", user_id).limit(5)
                    else:
                        apt_query = apt_query.limit(3)
                    
                    apt_res = await asyncio.to_thread(apt_query.execute)
                    if apt_res.data and len(apt_res.data) > 0:
                        apt_lines = [f"- {a.get('contact_name')}: {a.get('scheduled_at')} ({a.get('meeting_type')}, Status: {a.get('status')})" for a in apt_res.data]
                        system_prompt += f"\n\n## EXISTING APPOINTMENT RECORDS IN DATABASE\n" + "\n".join(apt_lines) + "\n- INSTRUCTION: If caller asks to check an appointment, verify against these exact records.\n"
                    else:
                        system_prompt += f"\n\n## EXISTING APPOINTMENT RECORDS IN DATABASE\n- NO existing appointments found for this caller.\n- INSTRUCTION: If caller asks to check an appointment, truthfully tell them that no booking was found for their number, and offer to schedule a new appointment for their requested date/time.\n"
                except Exception as apt_lookup_err:
                    logger.warning(f"Could not load appointment records in run_agent: {apt_lookup_err}")

                raw_greeting = agent_data.get('greeting_message') or default_greeting
                is_inbound_call = not bool(campaign_contact)
                call_direction = "inbound" if is_inbound_call else "outbound"

                # Resolve greeting message preserving user custom text and dynamic parameters
                greeting_message, disc_variant, disc_lang = resolve_agent_greeting(
                    raw_greeting=raw_greeting,
                    clean_name=clean_name,
                    business_name=business_name_val,
                    campaign_contact=campaign_contact,
                    customer=customer,
                    language=language,
                    gender_tag=gender_tag,
                    direction=call_direction,
                    agent_config=agent_data,
                    purpose=campaign_contact.get("notes") if campaign_contact else None
                )

                # Persist call disclosure telemetry asynchronously (Phase 1)
                disc_cfg = (agent_data.get("disclosure_config") or {}) if agent_data else {}
                disc_mode = resolve_jurisdiction_consent_mode(
                    configured_mode=disc_cfg.get("consent_mode"),
                    phone_number=campaign_contact.get("phone_number") if campaign_contact else None,
                    country_code=disc_cfg.get("jurisdiction"),
                    call_direction=call_direction,
                    is_marketing=True,
                    lawyer_confirmed=bool((disc_cfg.get("exemption_details") or {}).get("lawyer_confirmed", False))
                )
                if room_name:
                    asyncio.create_task(persist_call_disclosure(
                        supabase_client=supabase_admin,
                        room_name=room_name,
                        disclosure_text=greeting_message,
                        variant=disc_variant,
                        language=disc_lang,
                        consent_mode=disc_mode,
                        consent_outcome="consented"
                    ))

                if campaign_contact:
                    c_name = campaign_contact.get("full_name") or ""
                    c_company = campaign_contact.get("company_name") or ""
                    c_notes = campaign_contact.get("notes") or ""
                    end_msg_text = agent_data.get("ending_message", "") if agent_data else ""
                    personalized_context = build_outbound_sales_protocol(
                        prospect_name=c_name,
                        prospect_company=c_company,
                        lead_notes=c_notes,
                        business_info=business_info,
                        bot_name=clean_name,
                        gender_tag=gender_tag,
                        end_msg_text=end_msg_text
                    )
                    system_prompt += personalized_context

                # 11. Ending and Fallback Messages
                if agent_data and agent_data.get("ending_message"):
                    end_msg = agent_data['ending_message']
                    system_prompt += (
                        f"\n\n## CALL ENDING & ENGAGEMENT RULES (STRICT CRITICAL RULES):\n"
                        f"1. Natural Call Conclusion: When the caller explicitly wants to end the call (e.g. says goodbye, says they must hang up, or has confirmed a callback/appointment), you MUST say exactly: '{end_msg}'\n"
                        f"2. ABSOLUTE PROHIBITION: NEVER say '{end_msg}' at the start of the call or after greeting!\n"
                        f"3. Affirmative Response Handling: If the caller says yes, 'haan', 'batao', 'bolo', or gives permission to speak after your greeting, they want to hear why you called! IMMEDIATELY introduce the reason for your call, discuss products/services, or ask a helpful discovery question. NEVER say goodbye when the prospect is listening!"
                    )

                if agent_data and agent_data.get("fallback_message"):
                    fb_msg = agent_data['fallback_message']
                    system_prompt += (
                        f"\n\n## FALLBACK MESSAGE DIRECTIVE:\n"
                        f"If you ever fail to hear or understand what the caller said (or if their speech was completely unclear or garbled), "
                        f"respond naturally using your configured fallback message: '{fb_msg}'"
                    )

                # 12. Fetch Knowledge Base (budgeted to max 1500 chars per doc to prevent 413 token limits)
                kb_docs = await fetch_knowledge_base(agent_id)
                if kb_docs:
                    kb_context = "\n\n=== BUSINESS KNOWLEDGE BASE ===\n"
                    for doc in kb_docs:
                        excerpt = (doc.get('content_excerpt') or '').strip()
                        if len(excerpt) > 1500:
                            excerpt = excerpt[:1500] + "..."
                        kb_context += f"\n--- {doc.get('name', 'Document')} ---\n{excerpt}\n"
                    system_prompt += kb_context

                # 13. Critical Business Scope Grounding, 10-Digit Phone Verification, Email/WhatsApp Reminders
                if "## STRICT BUSINESS SCOPE GROUNDING" not in system_prompt:
                    system_prompt += (
                        f"\n\n## STRICT BUSINESS SCOPE GROUNDING & ANTI-HALLUCINATION:\n"
                        f"1. You represent {company_display}. You ONLY book appointments, schedule demos, and answer questions for products and services explicitly offered by {company_display} (such as AI voice agents, software automation, consultation, and technical support).\n"
                        f"2. OUT-OF-SCOPE PROHIBITION: If a caller asks to book an appointment for an unrelated or medical service (e.g. regular health checkups, doctor consultations, clinic tests, hospital visits, dental appointments, salons), you MUST politely decline:\n"
                        f"   'Maaf kariyega, hum regular health checkups ya doctor services provide nahi karte hain. {company_display} voice agents aur business automation solutions provide karti hai. Kya aap hamare AI automation ke baare mein demo ya consultation schedule karna chahenge?'\n"
                        f"3. NEVER pretend to be a doctor, hospital, or clinic. NEVER accept or confirm a medical regular checkup under any circumstances!\n"
                        f"\n## 10-DIGIT CONTACT PHONE NUMBER VALIDATION:\n"
                        f"1. Contact phone numbers in India must have exactly 10 digits.\n"
                        f"2. When the caller provides a phone number, count the digits: if they provide fewer than 10 digits (such as 9 digits like '654298356'), you MUST NOT accept or confirm it. Immediately ask: 'Yeh 9 digits hain, kripya apna poora 10-digit mobile number bata dijiye?'\n"
                        f"3. Do not proceed to confirmation until all 10 digits are provided.\n"
                        f"\n## EMAIL & WHATSAPP REMINDERS AND CONFIRMATIONS (CRITICAL RULE 52 & 53):\n"
                        f"1. Automated delivery is 100% active. If the caller asks for email or WhatsApp confirmations or reminders (e.g., 'kya aap mujhe mail par reminder bhej sakte ho?', 'email par confirmation aayega?'), ALWAYS enthusiastically assure them:\n"
                        f"   'Haan bilkul! Hum aapko email aur WhatsApp dono par confirmation aur reminder bhejte hain. Hum aapko mail reminder bhej denge.'\n"
                        f"2. STRICT PROHIBITION: You must NEVER say email sending or mail reminders are unavailable ('mere paas email par reminder bhejne ka option nahi hai'). It is fully active and supported.\n"
                    )

                # 14. Enforce Gender-consistent Hindi/Hinglish Grammar
                system_prompt = apply_gender_grammar_directives(system_prompt, gender_tag, bot_name, voice_id)

                # 14b. Mandatory Phase 1 Compliance Directives (Decline Recording & Human Transfer)
                system_prompt += (
                    f"\n\n## CALL DISCLOSURE & CONSENT DIRECTIVES (PHASE 1):\n"
                    f"1. AI & Recording Transparency: You have explicitly disclosed that you are an AI assistant and that this call is recorded.\n"
                    f"2. Right to Decline Recording: If the caller explicitly objects to being recorded, asks you to stop recording, or refuses recording consent, you MUST invoke `decline_call_recording`.\n"
                    f"3. Human Escalation: If the caller asks to speak to a human, real person, or live agent, you MUST invoke `transfer_to_human` immediately.\n"
                    f"4. Keypress/Spoken Consent: If the caller was prompted to press 1 / say yes, acknowledge their consent warmly. If they pressed 2 / said no, respect their refusal.\n"
                )

                # 14c. Enforce AI Identity Guard & Truthfulness (Step 0 compliance)
                system_prompt = enforce_prompt_ai_guard(system_prompt)

                # 15. Store prompt suffix for multi-personality mid-call transitions
                if agent_data.get("_multi_personality_enabled"):
                    agent_data["_prompt_suffix"] = system_prompt[len(base_prompt):]
        except Exception as e:
            logger.error(f"Failed to fetch config for agent in run_agent: {e}")

    print(f"[Agent] Joining room: {room_name}", flush=True)
    logger.info(f"[In-Process Agent] Connecting to room {room_name} at {livekit_url} (provider: {provider}, voice: {voice_id})")

    room = rtc.Room()
    token = generate_agent_token(room_name)

    agent_instance = None
    safe_provider = locals().get('provider') or (agent_data.get('voice_provider') if agent_data else None) or 'sarvam'
    safe_voice_id = locals().get('voice_id') or (agent_data.get('voice_id') if agent_data else None) or 'shubh'
    safe_speed = locals().get('speed') if locals().get('speed') is not None else 1.0
    safe_pitch = locals().get('pitch') if locals().get('pitch') is not None else 1.0
    safe_sarvam_pitch = (safe_pitch - 1.0) if safe_provider == 'sarvam' else safe_pitch
    safe_language = locals().get('language') or (agent_data.get('primary_language') if agent_data else None) or 'hinglish'
    safe_system_prompt = enforce_prompt_ai_guard(locals().get('system_prompt') or load_system_prompt())

    # Create appointment tools for live verification and booking in run_agent
    appointment_tools = create_appointment_tools(
        organization_id=organization_id,
        user_id=user_id,
        agent_id=agent_id,
        call_id=room_name
    )

    from livekit.agents import utils
    async with utils.http_context.open():
        agent_instance = VikramAgent(
            instructions=safe_system_prompt,
            voice_provider=safe_provider,
            voice_id=safe_voice_id,
            voice_speed=safe_speed,
            voice_pitch=safe_sarvam_pitch,
            language=safe_language,
            llm_provider=agent_data.get('llm_provider') if agent_data else None,
            llm_model=agent_data.get('llm_model') if agent_data else None,
            temperature=agent_data.get('temperature') if agent_data else None,
            tools=appointment_tools,
        )

        if locals().get('greeting_message'):
            agent_instance.greeting_message = locals().get('greeting_message')
        agent_instance.room = room

        # Defensive fallbacks prevent UnboundLocalError and incorrect gender fallback
        male_names = {'vikram', 'shubh', 'aditya', 'rahul', 'rohan', 'amit', 'dev', 'ratan', 'varun', 'manan', 'sumit', 'kabir', 'aayan', 'ashutosh', 'advait', 'anand', 'tarun', 'sunny', 'mani', 'gokul', 'vijay', 'mohit', 'rehan', 'soham', 'arvind', 'neel', 'arjun', 'amol', 'raghav'}
        resolved_bot_name_ra = str(locals().get('bot_name') or (agent_data.get('bot_name') if agent_data else None) or (agent_data.get('name') if agent_data else None) or 'Vikram').strip()
        voice_is_male_ra = (str(safe_voice_id).lower() in SARVAM_MALE_VOICES) or (safe_voice_id in ['pNInz6obpgDQGcFmaJgB', 'TxGEqnHWrfWFTfGW9XjX'])
        name_is_male_ra = str(resolved_bot_name_ra).lower() in male_names
        explicit_gender_ra = locals().get('gender_tag') or (agent_data.get('gender') if agent_data else None)
        if explicit_gender_ra in ('male', 'female'):
            resolved_gender_ra = explicit_gender_ra
        elif voice_is_male_ra or name_is_male_ra:
            resolved_gender_ra = 'male'
        else:
            resolved_gender_ra = 'female'

        agent_instance.bot_name = resolved_bot_name_ra
        agent_instance.business_name = (
            locals().get('business_name_val')
            or (agent_data.get('business_name') if agent_data else '')
            or ''
        )
        agent_instance.gender = resolved_gender_ra
        if hasattr(agent_instance, 'tts') and hasattr(agent_instance.tts, '_gender'):
            agent_instance.tts._gender = resolved_gender_ra
        agent_instance.prospect_name = c_name if ('campaign_contact' in locals() and campaign_contact and locals().get('is_name_valid')) else (locals().get('cust_name') or "")
        agent_instance.campaign_goal = locals().get('notes_summary') if ('campaign_contact' in locals() and campaign_contact) else ""
        agent_instance.ending_message = agent_data.get("ending_message", "") if agent_data else ""
        agent_instance.fallback_message = agent_data.get("fallback_message", "") if agent_data else ""

        session = AgentSession(
            vad=get_vad_model(),
            turn_detection="vad",
            min_endpointing_delay=0.85,
            max_endpointing_delay=2.2,
            preemptive_generation=True,
            min_interruption_duration=0.6,
            min_interruption_words=4,
            resume_false_interruption=True,
        )
        done = asyncio.Event()

        @session.on("close")
        def _on_session_close_ra(event):
            logger.info(f"[In-Process Agent] Session closed ({getattr(event, 'reason', 'unknown')}). Signaling done.")
            done.set()

        @room.on("disconnected")
        def on_disconnected(reason):
            logger.info(f"[In-Process Agent] Room disconnected: {reason}")
            done.set()

        @room.on("participant_disconnected")
        def on_participant_disconnected(participant: rtc.RemoteParticipant):
            p_id = (getattr(participant, 'identity', '') or '').lower()
            p_name = (getattr(participant, 'name', '') or '').lower()
            logger.info(f"[In-Process Agent] Participant disconnected: '{p_id}' ('{p_name}')")
            is_agent = p_id.startswith("agent") or "agent" in p_id or "vikram" in p_id or "agent" in p_name
            if not is_agent:
                logger.info(f"[In-Process Agent] Human caller '{p_id}' left room '{room_name}'. Ending agent session immediately.")
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
        call_ending_in_progress_ra = False
        call_transcript_turns_ra: list[str] = []

        async def execute_intent_disconnect_ra(delay_seconds: float = 6.0):
            nonlocal call_ending_in_progress_ra
            if call_ending_in_progress_ra:
                return
            call_ending_in_progress_ra = True
            logger.info("[Intent Call Cut - RA] Closing intent detected. Waiting for speech synthesis and playback to complete...")

            # 1. If agent is currently thinking or preparing reply, wait for it to start speaking (up to 3.5s)
            for _ in range(35):
                state = getattr(session, 'agent_state', '')
                if state == 'speaking':
                    break
                if state not in ('thinking', 'initializing'):
                    break
                await asyncio.sleep(0.1)

            # 2. Wait until the agent finishes speaking completely (up to 12s)
            speech_timeout = 0
            while getattr(session, 'agent_state', '') == 'speaking' and speech_timeout < 120:
                await asyncio.sleep(0.1)
                speech_timeout += 1

            # 3. Grace period for audio stream buffer and carrier line to finish playing (0.8s)
            logger.info("[Intent Call Cut - RA] Agent finished speaking. Waiting 0.8s playback drain before disconnect...")
            await asyncio.sleep(0.8)

            try:
                call_end_signal = json.dumps({"type": "call_ended", "reason": "intent_goodbye"}).encode("utf-8")
                if room and room.local_participant:
                    await room.local_participant.publish_data(call_end_signal)
            except Exception as sig_err:
                logger.warning(f"Error publishing call_ended signal: {sig_err}")

            try:
                lk_url = os.getenv("LIVEKIT_URL")
                lk_key = os.getenv("LIVEKIT_API_KEY")
                lk_sec = os.getenv("LIVEKIT_API_SECRET")
                if lk_url and lk_key and lk_sec and room:
                    from livekit.api import LiveKitAPI, DeleteRoomRequest
                    lk_api = LiveKitAPI(lk_url, lk_key, lk_sec)
                    await lk_api.room.delete_room(DeleteRoomRequest(room=room.name))
                    await lk_api.aclose()
                    logger.info(f"[Intent Call Cut - RA] LiveKit server room '{room.name}' deleted")
            except Exception as lk_err:
                logger.warning(f"LiveKit API delete room warning: {lk_err}")

            try:
                if room:
                    await room.disconnect()
            except Exception:
                pass
            done.set()

        user_demanded_cut_ra = False

        def check_closing_intent_ra(text: str) -> bool:
            if not text:
                return False
            t = text.lower().strip()

            if user_demanded_cut_ra:
                return True

            # SAFETY GUARD 1: If caller gave affirmative permission to speak, NEVER disconnect
            user_requested_cut = False
            if call_transcript_turns_ra:
                last_customer_turns = [turn for turn in call_transcript_turns_ra if turn.startswith("customer:")]
                if last_customer_turns:
                    last_cust = last_customer_turns[-1].lower()
                    user_giving_permission = any(aff in last_cust for aff in [
                        "haan", "batao", "bolo", "btao", "yes", "sure", "kahiye",
                        "हाँ", "हां", "बताओ", "बताइए", "बोलो", "बोलिए", "कहिए", "अदिति"
                    ])
                    if user_giving_permission and len(call_transcript_turns_ra) <= 4:
                        logger.warning(f"[check_closing_intent_ra] BLOCKED false disconnect: caller gave permission ('{last_cust}') on turn {len(call_transcript_turns_ra)}")
                        return False
                    if any(cut in last_cust for cut in [
                        "call cut", "phone rakh", "phone kaat", "bye", "disconnect", "cut the call",
                        "cut kar", "kaat do", "nahi chahiye", "not interested", "wrong number",
                        "thank you", "thanks", "dhanyawad", "shukriya"
                    ]):
                        user_requested_cut = True

            # SAFETY GUARD 2: Early turns (<= 2) cannot trigger disconnect unless caller explicitly demanded it
            if len(call_transcript_turns_ra) <= 2 and not user_requested_cut and not user_demanded_cut_ra:
                logger.warning(f"[check_closing_intent_ra] Suppressing early disconnect attempt on turn {len(call_transcript_turns_ra)}: '{text}'")
                return False

            configured_ending = agent_data.get("ending_message", "").lower().strip() if agent_data else ""
            if configured_ending and len(t) >= 15 and configured_ending in t:
                return True
            
            closing_phrases = [
                "goodbye", "good bye", "bye bye", "take care", "have a nice day",
                "have a good day", "have a great day", "have a wonderful day",
                "talk to you later", "see you later", "see you soon",
                "alvida", "phir milenge", "milte hain",
                "baat karke achha laga", "baat karke accha laga",
                "baat karke bohot achha laga", "baat karke bohot accha laga",
                "baat karke bahut achha laga", "baat karke bahut accha laga",
                "call cut", "phone rakh", "phone kaat",
                "call disconnect", "cut the call", "you can cut", "cut kar do",
                "cut kar dijiye", "cut kar de", "cut kar 2",
                "you're welcome", "you are welcome", "most welcome", "welcome",
                "koi baat nahi", "mention not", "dhanyavaad", "dhanyawad", "shukriya",
                "अलविदा", "गुडबाय", "गुड बाय", "बाय बाय", "फिर मिलेंगे",
                "बात करके अच्छा लगा", "बात करके बहुत अच्छा लगा", "वेलकम", "धन्यवाद", "शुक्रिया"
            ]
            if any(phrase in t for phrase in closing_phrases):
                return True
            if re.search(r'\bbye\b', t) and not re.search(r'\b(by the way|stand by|by)\b', t):
                return True
            return False

        @session.on("user_state_changed")
        def _on_user_state_changed_ra(event):
            try:
                # If customer starts speaking while the agent is actively speaking, trigger Twilio playback buffer flush
                new_st = getattr(event, 'new_state', '')
                agent_st = getattr(session, 'agent_state', '')
                if new_st == 'speaking' and agent_st == 'speaking':
                    logger.info("[AgentSession - RA] Caller barge-in detected while agent was speaking. Emitting interruption.")
                    if room and room.local_participant:
                        interruption_payload = json.dumps({"type": "interruption"}).encode("utf-8")
                        asyncio.create_task(room.local_participant.publish_data(interruption_payload))
            except Exception as b_err:
                logger.warning(f"Error handling barge-in: {b_err}")

        @session.on("conversation_item_added")
        def _on_conversation_item_added_ra(event):
            nonlocal user_demanded_cut_ra
            try:
                item = getattr(event, 'item', None)
                if not item:
                    return
                role = getattr(item, 'role', '')
                text = getattr(item, 'text_content', '') or getattr(item, 'content', '')
                if isinstance(text, list):
                    text = " ".join(str(t) for t in text)
                text = str(text).strip()
                if not text:
                    return

                speaker = "agent" if role in ("assistant", "system") else "customer"
                clean_txt = clean_ssml(text, is_transcript=True)
                clean_txt = re.sub(r'\[(?:CRITICAL|FLOW NOTE|OBJECTION|CONVERSATION GUIDANCE)[^\]]*\]', '', clean_txt, flags=re.IGNORECASE).strip()
                if role == "user" and clean_txt:
                    agent_nm = getattr(agent_instance, 'bot_name', None) or locals().get('bot_name') or 'Vikram'
                    fem_flag = (getattr(agent_instance, 'gender', 'female') == 'female') if agent_instance else locals().get('is_female', True)
                    clean_txt = normalize_user_transcript(clean_txt, agent_name=agent_nm, is_female=fem_flag)

                if clean_txt:
                    turn_label = f"{speaker}: {clean_txt}"
                    if not call_transcript_turns_ra or call_transcript_turns_ra[-1] != turn_label:
                        call_transcript_turns_ra.append(turn_label)
                    payload = json.dumps({
                        "type": "transcript",
                        "speaker": speaker,
                        "text": clean_txt
                    }).encode("utf-8")
                    asyncio.create_task(room.local_participant.publish_data(payload))

                if role == "user":
                    logger.info(f"[AgentSession - RA] Customer turn transcribed: '{clean_txt}'")
                    u_lower = clean_txt.lower()
                    cust_count = sum(1 for t in call_transcript_turns_ra if t.startswith("customer:"))
                    if any(k in u_lower for k in [
                        "cut the call", "you can cut", "cut kar do", "cut kar dijiye",
                        "cut kar 2", "call cut", "phone rakh do", "phone rakh dijiye",
                        "kaat do", "phone kaat", "disconnect kar", "call disconnect",
                        "call end", "end the call", "hang up", "bye bye", "alvida",
                        "kuch nahi chahiye", "kuch nahi", "sab ho gaya", "bas itna hi",
                        "that's all", "thats all", "all done", "no more help"
                    ]):
                        logger.info(f"[Intent Call Cut - RA] Customer explicitly requested call cut: '{clean_txt}' -> scheduling graceful disconnect")
                        user_demanded_cut_ra = True
                        asyncio.create_task(execute_intent_disconnect_ra())
                    elif any(k in u_lower for k in [
                        "thank you", "thanks", "thx", "shukriya", "dhanyawad", "dhanyavaad",
                        "shukriyaa", "bahut shukriya", "bohot shukriya", "bye",
                        "धन्यवाद", "शुक्रिया", "थैंक यू", "थैंक्स"
                    ]):
                        if cust_count >= 2:
                            logger.info(f"[Intent Call Cut - RA] Customer signaled closing gratitude ('{clean_txt}') on turn {cust_count} -> scheduling graceful disconnect")
                            user_demanded_cut_ra = True
                            asyncio.create_task(execute_intent_disconnect_ra())

                # Trigger intent disconnect if assistant says goodbye or customer commanded cut
                customer_turn_count = sum(1 for t in call_transcript_turns_ra if t.startswith("customer:"))
                if role == "assistant" and (check_closing_intent_ra(text) or user_demanded_cut_ra) and (customer_turn_count >= 2 or user_demanded_cut_ra):
                    logger.info(f"[Intent Call Cut - RA] Closing utterance by assistant: '{text}' (demanded={user_demanded_cut_ra}) -> scheduling graceful disconnect after speech finishes")
                    asyncio.create_task(execute_intent_disconnect_ra())
            except Exception as err:
                logger.warning(f"Error in conversation_item_added RA hook: {err}")

        # NOTE: agent_speech_committed transcript hook removed — conversation_item_added
        # already publishes transcripts for agent turns. Duplicate hooks caused 2-3x
        # repeated messages in the frontend.

        try:
            connected = False
            for connect_attempt in range(2):
                try:
                    await asyncio.wait_for(room.connect(livekit_url, token), timeout=5.0)
                    connected = True
                    print(f"[Agent] Connected to LiveKit", flush=True)
                    _active_livekit_rooms.add(room)
                    break
                except asyncio.TimeoutError:
                    logger.warning(f"[Agent] LiveKit connection attempt {connect_attempt + 1} timed out after 5s. Retrying...")
                    await asyncio.sleep(0.2)
                except Exception as connect_err:
                    logger.warning(f"[Agent] LiveKit connection attempt {connect_attempt + 1} failed: {connect_err}. Retrying...")
                    await asyncio.sleep(0.2)

            if not connected:
                logger.error(f"[Agent] Failed to connect to LiveKit after 4 attempts for room {room_name}")
                return
                
            # Guard: Check if an agent participant is already connected
            yielded_to_worker = False
            if room.remote_participants:
                for p in room.remote_participants.values():
                    p_identity = (getattr(p, 'identity', '') or '').lower()
                    p_name = (getattr(p, 'name', '') or '').lower()
                    p_kind = getattr(p, 'kind', None)
                    is_agent = (
                        p_kind == getattr(rtc.ParticipantKind, 'PARTICIPANT_KIND_AGENT', 1) or
                        p_identity.startswith("agent") or
                        "agent" in p_identity or
                        "vikram" in p_identity or
                        "agent" in p_name
                    )
                    if is_agent:
                        logger.warning(f"[DUPLICATE WORKER GUARD] Room '{room_name}' already has connected agent participant '{getattr(p, 'identity', '')}'. Disconnecting duplicate in-process agent.")
                        yielded_to_worker = True
                        await room.disconnect()
                        return

            # Listen for dedicated worker joining later to yield immediately
            @room.on("participant_connected")
            def on_participant_connected_ra(participant: rtc.RemoteParticipant):
                nonlocal yielded_to_worker
                p_id = (getattr(participant, 'identity', '') or '').lower()
                p_name = (getattr(participant, 'name', '') or '').lower()
                p_kind = getattr(participant, 'kind', None)
                if (
                    p_kind == getattr(rtc.ParticipantKind, 'PARTICIPANT_KIND_AGENT', 1) or
                    p_id.startswith("agent") or
                    "agent" in p_id or
                    "vikram" in p_id or
                    "agent" in p_name
                ):
                    logger.warning(f"[DUPLICATE WORKER GUARD] Dedicated agent worker '{participant.identity}' joined room '{room_name}'. In-process agent yielding and disconnecting.")
                    yielded_to_worker = True
                    done.set()

            await session.start(agent=agent_instance, room=room)
            
            async def _room_watchdog():
                call_has_human = False
                while not done.is_set():
                    await asyncio.sleep(1.0)
                    if not room or not room.isconnected():
                        logger.info(f"[In-Process Agent] Watchdog detected room '{room_name}' is no longer connected. Signaling done.")
                        done.set()
                        break
                    remotes = list(room.remote_participants.values()) if (room and hasattr(room, 'remote_participants')) else []
                    has_human = any(
                        not (getattr(p, 'identity', '').lower().startswith('agent') or 'agent' in getattr(p, 'identity', '').lower() or 'vikram' in getattr(p, 'identity', '').lower() or 'agent' in (getattr(p, 'name', '') or '').lower())
                        for p in remotes
                    )
                    if has_human:
                        call_has_human = True
                    elif call_has_human:
                        logger.info(f"[In-Process Agent] Watchdog detected all human callers left room '{room_name}'. Concluding call.")
                        done.set()
                        break
            watchdog_task = asyncio.create_task(_room_watchdog())
            try:
                await done.wait()
            finally:
                watchdog_task.cancel()
        except Exception as e:
            logger.error(f"[In-Process Agent] Error: {e}")
        finally:
            if yielded_to_worker:
                logger.info(f"[In-Process Agent] Yielded room '{room_name}' to dedicated worker. Skipping duplicate call saving and billing.")
                try:
                    await room.disconnect()
                except Exception:
                    pass
            else:
                # Await lead extraction and analytics saving BEFORE room disconnects/exits
                try:
                    if not user_id and agent_id:
                        try:
                            ag_res = supabase_admin.table("agents").select("user_id, organization_id").eq("id", agent_id).maybe_single().execute()
                            if ag_res and ag_res.data:
                                user_id = ag_res.data.get("user_id")
                                if not organization_id:
                                    organization_id = ag_res.data.get("organization_id")
                        except Exception:
                            pass

                    if agent_id and user_id:
                        duration = int(time.time() - call_start_time)
                        if duration < 3 and not (call_transcript_turns_ra or _get_transcript_messages(agent_instance)):
                            logger.info(f"[In-Process Agent] Call duration < 3s with no speech in room '{room_name}'. Skipping ghost call save.")
                        else:
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

                            transcript = "\n".join(call_transcript_turns_ra).strip()
                            if not transcript:
                                messages = _get_transcript_messages(agent_instance)
                                transcript = "\n".join([f"{getattr(m, 'role', '')}: {getattr(m, 'content', '')}" for m in messages if hasattr(m, 'role') and getattr(m, 'role', '') in ("user", "assistant")])
                            
                            call_sid = None
                            if room_name:
                                try:
                                    vc_rec = supabase_admin.table("voice_calls").select("metadata").eq("metadata->>room_name", room_name).maybe_single().execute()
                                    if vc_rec and getattr(vc_rec, 'data', None) and isinstance(vc_rec.data, dict):
                                        meta = vc_rec.data.get("metadata") or {}
                                        call_sid = meta.get("provider_call_id") or meta.get("session_id")
                                except Exception as vc_sid_err:
                                    logger.warning(f"Failed to lookup call_sid from voice_calls for room {room_name}: {vc_sid_err}")

                            if not call_sid and room_name and ("twilio-" in room_name or "sip-" in room_name):
                                call_sid = room_name.split("_")[0].replace("twilio-", "").replace("sip-", "")

                            if transcript or duration > 0:
                                logger.info(f"[In-Process Agent] Awaiting final call save ({duration}s)...")
                                await extract_and_save_lead(
                                    transcript or "Call completed.",
                                    agent_id,
                                    user_id,
                                    organization_id,
                                    duration,
                                    call_sid=call_sid,
                                    contact_id=contact_id,
                                    room_name=room_name
                                )

                            # Safety: Update any stale in_progress voice_calls to final status
                            try:
                                final_status = "completed" if (transcript and duration > 0) else "no_answer"
                                if room_name:
                                    await asyncio.to_thread(
                                        supabase_admin.table("voice_calls")
                                        .update({"status": final_status, "duration_seconds": duration, "ended_at": datetime.utcnow().isoformat()})
                                        .eq("metadata->>room_name", room_name)
                                        .eq("status", "in_progress")
                                        .execute
                                    )
                                    logger.info(f"[In-Process Agent] Updated voice_calls in room {room_name} -> {final_status}")
                            except Exception as vc_cleanup_err:
                                logger.warning(f"[In-Process Agent] voice_calls cleanup error: {vc_cleanup_err}")

                    if contact_id:
                        try:
                            # Only mark as 'answered' if there was an actual conversation
                            final_contact_status = "answered" if (duration > 0) else "no_answer"
                            await asyncio.to_thread(
                                supabase_admin.table("campaign_contacts")
                                .update({"call_status": final_contact_status, "last_attempt_at": datetime.utcnow().isoformat()})
                                .eq("id", contact_id)
                                .execute
                            )
                            logger.info(f"[In-Process Agent] Finalized campaign contact {contact_id} status to {final_contact_status}")
                        except Exception as cc_err:
                            logger.warning(f"Error setting contact status: {cc_err}")
                except Exception as e:
                    logger.error("[In-Process Agent] Error saving stats", exc_info=True)

            try:
                _running_agent_rooms.discard(room_name)
                from voice_router import _active_agent_spawns
                _active_agent_spawns.discard(room_name)
            except Exception:
                pass

            try:
                _active_livekit_rooms.discard(room)
                await room.disconnect()
            except Exception:
                pass

if __name__ == "__main__":
    _start_health_server()
    cli.run_app(WorkerOptions(
        entrypoint_fnc=entrypoint,
        job_executor_type=JobExecutorType.THREAD,
        load_threshold=float('inf'),
        num_idle_processes=0,
    ))

