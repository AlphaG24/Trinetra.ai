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
import jwt
from dotenv import load_dotenv
from livekit.agents import JobContext, WorkerOptions, cli, AgentServer, tts, llm
from livekit.agents.voice import Agent, AgentSession
from livekit.plugins import sarvam, silero, openai, elevenlabs, google
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
        return """You are a professional AI sales agent.
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

def clean_ssml(text: str, is_transcript: bool = False) -> str:
    if not text:
        return ""
    # Remove markdown bold/italics
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = text.replace('**', '')
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    # Remove any double parenthesis tags like ((warm)), ((/warm)), ((pause)), ((slow))
    text = re.sub(r'\(\([^)]*\)\)', '', text)
    # Remove single parentheses with common tone tags like (pause), (warm), (laugh)
    text = re.sub(r'\((?:warm|slow|pause|laugh|chuckle|breath|sigh|whisper|emph)\)', '', text, flags=re.IGNORECASE)
    # Remove double brackets like [[...]]
    text = re.sub(r'\[\[[^\]]*\]\]', '', text)
    # Remove XML / SSML tags like <break>, <emphasis>
    text = re.sub(r'<[^>]+>', '', text)
    # Remove emojis
    text = re.sub(r'[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF]', '', text)
    # Remove text emoticons
    text = text.replace(':)', '').replace(':(', '').replace(':D', '')
    # Clean whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def fix_gender_verbs(text: str, gender: str) -> str:
    """Post-process LLM output to enforce gender-consistent Hindi/Hinglish verb forms.
    Corrects male verbs when agent is female and vice-versa."""
    if not text or not gender:
        return text
    if gender == 'female':
        # male -> female verb corrections
        text = re.sub(r'\b(samajh|bol|kar|dekh|sun|bata|soch|likh|padh|ja)\s+raha\s+(hoon|hu|hun|hoo)\b', r'\1 rahi \2', text, flags=re.IGNORECASE)
        text = re.sub(r'\brha\s+(hu|hoon|hun|hoo)\b', r'rahi \1', text, flags=re.IGNORECASE)
        text = re.sub(r'\b(samajh|kar|dekh|bol|sun|bata|soch|le|de|ja)\s+sakta\s+(hoon|hu|hun|hoo)\b', r'\1 sakti \2', text, flags=re.IGNORECASE)
        text = re.sub(r'\b(karta|chahta|samajhta|dekhta|sochta|bolta|sunta|jaanta|maanta)\s+(hoon|hu|hun|hoo)\b', 
                       lambda m: m.group(1).rstrip('a') + 'i ' + m.group(2), text, flags=re.IGNORECASE)
    elif gender == 'male':
        # female -> male verb corrections  
        text = re.sub(r'\b(samajh|bol|kar|dekh|sun|bata|soch|likh|padh|ja)\s+rahi\s+(hoon|hu|hun|hoo)\b', r'\1 raha \2', text, flags=re.IGNORECASE)
        text = re.sub(r'\b(samajh|kar|dekh|bol|sun|bata|soch|le|de|ja)\s+sakti\s+(hoon|hu|hun|hoo)\b', r'\1 sakta \2', text, flags=re.IGNORECASE)
    return text

def text_to_ssml(text: str, provider: str = "sarvam") -> str:
    """Convert marker-rich text to SSML for expressive TTS (legacy fallback, clean_ssml takes priority)"""
    return clean_ssml(text)

class ExpressiveTTSStream(tts.SynthesizeStream):
    def __init__(self, tts_instance, underlying_stream, provider="sarvam", gender=""):
        import re
        self._underlying = underlying_stream
        self._tts = tts_instance
        self._provider = provider
        self._gender = gender
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
                    cleaned = fix_gender_verbs(clean_ssml(sentence), self._gender)
                    self._underlying.push_text(cleaned)
            self._buffer = sentences[-1]

    def flush(self) -> None:
        if self._buffer.strip():
            cleaned = fix_gender_verbs(clean_ssml(self._buffer), self._gender)
            self._underlying.push_text(cleaned)
            self._buffer = ""
        self._underlying.flush()

    def end_input(self) -> None:
        if self._buffer.strip():
            cleaned = fix_gender_verbs(clean_ssml(self._buffer), self._gender)
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
    def __init__(self, underlying_tts, provider="sarvam", gender=""):
        self._underlying = underlying_tts
        self._provider = provider
        self._gender = gender
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
        cleaned = fix_gender_verbs(clean_ssml(text), self._gender)
        return self._underlying.synthesize(cleaned, *args, **kwargs)

    def stream(self, *args, **kwargs):
        underlying_stream = self._underlying.stream(*args, **kwargs)
        return ExpressiveTTSStream(self, underlying_stream, self._provider, self._gender)

def generate_personalized_greeting(name: str, tags: list, last_call: str | None, notes: str | None, language: str, gender: str, company_name: str = "") -> str:
    """Generate a warm, natural personalized greeting based on customer history"""
    is_hindi = language in ['hinglish', 'hi-IN']
    bot_name = "Anushka" if gender == 'female' else "Vikram"
    
    is_vip = tags and any(t.lower() in ['vip', 'premium', 'high-value'] for t in tags)
    comp_hindi = f" {company_name} se" if company_name else " humari team se"
    comp_eng = f" from {company_name}" if company_name else ""
    
    if is_hindi:
        greet = f"Namaste {name} ji" if name else "Namaste ji"
        if is_vip:
            greet += f", swagat hai aapka. Main{comp_hindi} {bot_name} bol {'rahi' if gender=='female' else 'raha'} hoon. Kaise hain aap?"
        else:
            greet += f", main{comp_hindi} {bot_name} bol {'rahi' if gender=='female' else 'raha'} hoon. Kaise help kar {'sakti' if gender=='female' else 'sakta'} hoon?"
    else:
        greet = f"Hello {name}" if name else "Hello"
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
    gender_tag: str
) -> str:
    """
    Resolves the initial greeting message.
    Preserves user-defined greetings while dynamically injecting the prospect's name
    and business name without overwriting their custom pitch.
    """
    c_name = ""
    is_name_valid = False
    if campaign_contact:
        c_name = campaign_contact.get("full_name") or ""
        is_name_valid = bool(c_name and str(c_name).strip() and str(c_name).lower() != "null")
    elif customer:
        c_name = customer.get("full_name") or ""
        is_name_valid = bool(c_name and str(c_name).strip() and str(c_name).lower() != "null")

    comp_hindi = f" {business_name} se" if business_name else ""
    comp_eng = f" calling from {business_name}" if business_name else ""
    
    if raw_greeting:
        gm = raw_greeting.replace('{{agent_name}}', clean_name).replace('{agentName}', clean_name)
        gm = gm.replace('{{company_name}}', business_name).replace('{companyName}', business_name)
        if '{{customer_name}}' in gm or '{customerName}' in gm:
            c_repl = f"{c_name} ji" if (is_name_valid and language in ['hinglish', 'hi-IN']) else (c_name if is_name_valid else "")
            gm = gm.replace('{{customer_name}}', c_repl).replace('{customerName}', c_repl)
        elif is_name_valid and c_name.lower() not in gm.lower():
            if re.search(r'^(Namaste|Hello|Hi)\b', gm, re.IGNORECASE):
                gm = re.sub(r'^(Namaste|Hello|Hi)(\s+ji)?([,!\.]|\s+)', rf'\1 {c_name} ji, ', gm, count=1, flags=re.IGNORECASE)
            else:
                gm = f"Namaste {c_name} ji! {gm}"
        gm = re.sub(r'\s+', ' ', gm).strip()
        gm = gm.replace(" ,", ",").replace(" !", "!").replace(" .", ".")
        return gm
    
    # Natural default consultative sales greeting
    if language in ['hinglish', 'hi-IN']:
        name_part = f"{c_name} ji! " if is_name_valid else "ji! "
        verb = "rahi" if gender_tag == "female" else "raha"
        modal = "sakti" if gender_tag == "female" else "sakta"
        return f"Namaste {name_part}Main{comp_hindi} {clean_name} bol {verb} hoon. Kya aap abhi free hain, main sirf 2 minute aapse baat kar {modal} hoon?"
    else:
        name_part = f" {c_name}" if is_name_valid else ""
        return f"Hello{name_part}, this is {clean_name}{comp_eng}. Do you have 2 minutes to speak?"


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
    p_name = prospect_name if prospect_name else "the prospect"
    notes_summary = lead_notes if lead_notes else "discussing your offerings and understanding their requirements"
    
    gender_verb_listen = "chahti" if gender_tag == "female" else "chahta"
    gender_verb_speak = "rahi" if gender_tag == "female" else "raha"
    
    protocol = (
        f"\n\n## MASTER OUTBOUND SALES CONVERSATION PROTOCOL (ELITE SALES CONSULTANT):\n"
        f"- Target Prospect: {p_name}{comp_part}\n"
        f"- Specific Lead Inquiry / Campaign Reason: {notes_summary}\n"
        f"- You Represent: {b_name}\n"
        f"- Core Services / Offerings: {b_services}\n"
        f"\n"
        f"### CONVERSATIONAL OBJECTIVE & PSYCHOLOGY:\n"
        f"You are a top-performing, consultative sales professional representing {b_name}.\n"
        f"You speak warmly, confidently, and listen actively. Everything you offer and explain MUST come from your instructions, business context, and knowledge base.\n"
        f"You NEVER sound robotic, never read canned scripts, and NEVER deliver giant monologues.\n"
        f"\n"
        f"### THE 7-STEP SALES MASTERY CONVERSATION FLOW:\n"
        f"1. STEP 1: PERMISSION & WARM OPENING (Completed in your greeting):\n"
        f"   You greeted the prospect by name and politely requested 2 minutes of their time.\n"
        f"\n"
        f"2. STEP 2: REASON FOR CALLING & COMPELLING HOOK (When prospect says 'haan', 'batao', 'bolo', 'yes', 'kahiye'):\n"
        f"   THE PROSPECT GAVE YOU PERMISSION TO TALK!\n"
        f"   - Acknowledge warmly.\n"
        f"   - IMMEDIATELY state the exact reason for your call based on their inquiry/notes: '{notes_summary}'.\n"
        f"   - Connect it to how {b_name} can help them with this, and ask an open discovery question.\n"
        f"   - Example style: 'Shukriya {prospect_name or 'ji'}! Actually aapne humare {b_services} ke regarding interest dikhaya tha / inquiry ki thi ({notes_summary}). Main bas jaanna {gender_verb_listen} thi ki aap abhi isme kya explore kar rahe hain?'\n"
        f"   - ADAPT 100% to YOUR business, services, and the prospect's lead notes!\n"
        f"\n"
        f"3. STEP 3: ACTIVE DISCOVERY (Identify Specific Need / Pain Point):\n"
        f"   - When the prospect answers, validate what they say with empathy.\n"
        f"   - Ask ONE short, relevant question to diagnose their exact requirement, timeline, or current situation before pitching solutions.\n"
        f"\n"
        f"4. STEP 4: TAILORED SOLUTION & VALUE PROPOSITION:\n"
        f"   - Present how {b_name} specifically solves their exact requirement using the facts, features, and benefits from your instructions and knowledge base.\n"
        f"   - Keep it to 1-2 crisp, punchy sentences focusing on the outcome and benefit for them.\n"
        f"   - Always end with a check-in question: 'Kya ye aapki requirement se match karta hai?' or 'Iske baare mein aapka kya sochna hai?'\n"
        f"\n"
        f"5. STEP 5: TRANSPARENT PRICING & OBJECTION HANDLING:\n"
        f"   - When the prospect asks about price, charges, fees, or packages:\n"
        f"     Quote the exact pricing, packages, or consultation model specified in your instructions or knowledge base.\n"
        f"     State it confidently and highlight the value/ROI.\n"
        f"   - If they have objections ('expensive', 'already have a provider', 'thinking about it'):\n"
        f"     Handle it with empathy, explain what makes {b_name}'s service superior or unique, and offer an easy, low-risk next step.\n"
        f"\n"
        f"6. STEP 6: CLEAR NEXT STEP / CALL TO ACTION:\n"
        f"   - Propose a concrete, low-friction next step suited to your business (e.g. booking an appointment, scheduling a consultation with a specialist, sending complete details on WhatsApp/SMS, or scheduling a demo/visit).\n"
        f"   - Confirm if they would like to proceed with that.\n"
        f"\n"
        f"7. STEP 7: NATURAL CONCLUSION:\n"
        f"   - Only when the conversation is naturally finished or the next step is confirmed, say: '{end_msg_text}'.\n"
        f"   - STRICT PROHIBITION: NEVER say '{end_msg_text}' in turns 1-4 while the prospect is listening and conversing!\n"
        f"\n"
        f"### STRICT RULES FOR NATURAL HUMAN TELEPHONY:\n"
        f"- BITE-SIZED PACING (1-2 SENTENCES MAX): Never recite paragraphs or long lists. Speak naturally, sentence by sentence.\n"
        f"- ALWAYS END WITH AN ENGAGING QUESTION: Keep the conversation interactive so the prospect never feels lectured.\n"
        f"- 100% FAITHFUL TO YOUR BUSINESS: Only represent {b_name} and the products/services defined in your instructions and knowledge base. Never invent products or mention outside companies.\n"
    )
    return protocol


def apply_gender_grammar_directives(system_prompt: str, gender_tag: str, bot_name: str, voice_id: str) -> str:
    """
    Enforces gender-consistent Hindi/Hinglish grammar directives and verb forms.
    Ensures female voices consistently use feminine endings (rahi hoon, sakti hoon)
    and male voices use masculine endings.
    """
    if gender_tag == 'female':
        system_prompt = re.sub(r'\b(samajh|bol|kar|dekh|sun|bata)\s+raha\s+(hoon|hu|hun)\b', r'\1 rahi \2', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\b(samajh|kar|dekh|bol)\s+sakta\s+(hoon|hu|hun)\b', r'\1 sakti \2', system_prompt, flags=re.IGNORECASE)
        system_prompt = re.sub(r'\b(karta|chahta|samajhta)\s+(hoon|hu|hun)\b', lambda m: m.group(1)[:-1] + 'i ' + m.group(2), system_prompt, flags=re.IGNORECASE)
        if '## CRITICAL FEMALE GENDER & HINDI GRAMMAR DIRECTIVE' not in system_prompt:
            system_prompt += (
                f"\n\n## CRITICAL FEMALE GENDER & HINDI GRAMMAR DIRECTIVE (STRICT & NON-NEGOTIABLE):\n"
                f"- You are {bot_name}, a FEMALE assistant speaking with a female voice ({voice_id}).\n"
                f"- In Hindi and Hinglish, you MUST ALWAYS use FEMININE grammatical endings for yourself:\n"
                f"  * ALWAYS say: 'Haan main samajh rahi hoon' (STRICTLY NEVER say 'samajh raha hoon' or 'samajh rha hu').\n"
                f"  * ALWAYS say: 'Main bol rahi hoon' (STRICTLY NEVER say 'bol raha hoon' or 'bol rha hu').\n"
                f"  * ALWAYS say: 'Main aapki madad kar sakti hoon' (STRICTLY NEVER say 'kar sakta hoon').\n"
                f"  * ALWAYS say: 'Main check karti hoon' (STRICTLY NEVER say 'karta hoon').\n"
                f"  * ALWAYS say: 'Main janna chahti hoon' (STRICTLY NEVER say 'chahta hoon').\n"
                f"- Never use male grammatical endings ('raha', 'sakta', 'karta', 'chahta') when referring to yourself."
            )
    else:
        if '## CRITICAL MALE GENDER & HINDI GRAMMAR DIRECTIVE' not in system_prompt:
            system_prompt += (
                f"\n\n## CRITICAL MALE GENDER & HINDI GRAMMAR DIRECTIVE:\n"
                f"- You are {bot_name}, a MALE assistant speaking with a male voice ({voice_id}).\n"
                f"- In Hindi and Hinglish, use masculine grammatical forms for yourself ('bol raha hoon', 'samajh raha hoon', 'kar sakta hoon')."
            )
    return system_prompt

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

    # Helper for exact word replacement in Devanagari text without broken \b
    def rep_deva(s: str, target: str, repl: str) -> str:
        pattern = r'(?<![^\s,।!?.])' + re.escape(target) + r'(?![^\s,।!?.])'
        return re.sub(pattern, repl, s)

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

    # 2. General affirmative and brand normalizations
    t = rep_deva(t, 'हा बताओ', 'हाँ बताओ')
    t = rep_deva(t, 'हा', 'हाँ')
    t = rep_deva(t, 'त्रिनेत्र', 'त्रिनेत्रा')
    t = rep_deva(t, 'त्रिनेत्री', 'त्रिनेत्रा')
    t = rep_deva(t, 'त्रिनेत्रम', 'त्रिनेत्रा')
    t = re.sub(r'\b(trinetr|trinetri)\b', r'Trinetra', t, flags=re.IGNORECASE)

    return re.sub(r'\s+', ' ', t).strip()

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
    ):
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
            sarvam_sample_rate = int(os.getenv("SARVAM_SAMPLE_RATE", "8000"))
            tts_plugin = sarvam.TTS(
                target_language_code=target_lang,
                model=model_name,
                speaker=sarvam_speaker,
                pace=sarvam_pace,
                pitch=sarvam_pitch,
                speech_sample_rate=sarvam_sample_rate,
                output_audio_codec="linear16",
                min_buffer_size=30,
            )
        else:
            tts_plugin = elevenlabs.TTS(voice_id=voice_id)

        sarvam_api_key = os.getenv("SARVAM_API_KEY", "").strip()
        gemini_api_key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()

        # 1. Speech-to-Text: Use Sarvam Saaras v3 in codemix mode for Hinglish with bilingual keyword priming
        if sarvam_api_key and (voice_provider == 'sarvam' or language in ['hinglish', 'hi-IN']):
            stt_prompt = "त्रिनेत्रा, अदिति, राहुल, बताओ, हाँ बताओ, हाँ अदिति बताओ, हाँजी, नमस्ते, बोलो, Trinetra, Aditi, Rahul, pricing, dental, clinic, haan batao, haan aditi batao, batao, bolo, Hello, Ha"
            stt_plugin = sarvam.STT(
                model="saaras:v3",
                language="hi-IN",
                mode="codemix",
                api_key=sarvam_api_key,
                prompt=stt_prompt,
            )
            logger.info("[VikramAgent] Using Sarvam STT (saaras:v3, mode=codemix, hi-IN, primed bilingual prompt) for Hinglish recognition")
        else:
            stt_plugin = openai.STT(
                model="whisper-large-v3",
                base_url="https://api.groq.com/openai/v1",
                api_key=groq_api_key,
                detect_language=True,
                prompt="Namaste, Haan, Haanji, Batao, Hindi, Hinglish, English conversation.",
            )
            logger.info("[VikramAgent] Using Groq Whisper STT (whisper-large-v3, detect_language=True)")

        # Determine LLM Provider: Groq is preferred for voice AI to avoid Google Free Tier 20 req/day quota limits
        chosen_provider = (llm_provider or os.getenv("LLM_PROVIDER", "groq")).strip().lower()
        chosen_model = (llm_model or os.getenv("LLM_MODEL", "")).strip()
        chosen_temp = float(temperature) if temperature is not None else 0.7

        use_groq = bool(groq_api_key) and (chosen_provider == "groq" or not gemini_api_key)

        if use_groq:
            groq_model = chosen_model if chosen_model and "qwen" in chosen_model.lower() else "qwen/qwen3.8-27b"
            llm_plugin = openai.LLM(
                model=groq_model,
                base_url="https://api.groq.com/openai/v1",
                api_key=groq_api_key,
                temperature=chosen_temp if temperature is not None else 0.6,
                max_completion_tokens=300,
            )
            logger.info(f"[VikramAgent] Using Groq LLM ({groq_model}) for lightning-fast voice response")
        elif gemini_api_key:
            gemini_model = chosen_model if "gemini" in chosen_model.lower() else "gemini-2.5-flash"
            if gemini_model in ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0"]:
                gemini_model = "gemini-2.5-flash"
            llm_plugin = google.LLM(
                model=gemini_model,
                api_key=gemini_api_key,
                temperature=chosen_temp,
            )
            logger.info(f"[VikramAgent] Using Google Gemini LLM ({gemini_model})")
        else:
            llm_plugin = openai.LLM(
                model="gpt-4o-mini",
                api_key=os.getenv("OPENAI_API_KEY", ""),
                temperature=chosen_temp,
            )
            logger.info("[VikramAgent] Using OpenAI GPT-4o-mini LLM")

        # Wrap TTS with ExpressiveTTSWrapper for SSML cleaning and gender-consistent verb correction
        wrapped_tts = ExpressiveTTSWrapper(tts_plugin, provider=voice_provider, gender=self.gender)

        # Directly pass wrapped TTS so LLM tokens stream to TTS in real time with zero buffering delay
        super().__init__(
            instructions=instructions,
            stt=stt_plugin,
            llm=llm_plugin,
            tts=wrapped_tts,
            vad=vad_model,
            min_endpointing_delay=0.3,
            max_endpointing_delay=1.0,
            min_consecutive_speech_delay=0.8,
            use_tts_aligned_transcript=True,
        )

    async def on_user_turn_completed(
        self, turn_ctx: llm.ChatContext, new_message: llm.ChatMessage
    ) -> None:
        """
        Intercepts user turn right before the LLM generates a response:
        1. Normalizes phonetic mishearings in user speech ('हाँ दीदी बताओ' -> 'हाँ अदिति बताओ').
        2. If caller gave affirmative permission to speak ('haan', 'batao', 'bolo', etc.) in early turns:
           Injects a high-priority turn instruction to pitch the campaign reason and strictly forbids goodbye.
        """
        try:
            if new_message and new_message.content:
                raw_txt = new_message.raw_text_content or ""
                agent_name = getattr(self, 'bot_name', 'Aditi')
                is_female = getattr(self, 'gender', 'female') == 'female'
                norm_txt = normalize_user_transcript(raw_txt, agent_name=agent_name, is_female=is_female)

                if norm_txt and norm_txt != raw_txt:
                    logger.info(f"[VikramAgent] Normalized user utterance: '{raw_txt}' -> '{norm_txt}'")
                    new_message.content = [norm_txt]

                # Check if caller gave affirmative permission to pitch
                t_lower = (norm_txt or raw_txt).lower().strip()
                affirmative_starters = [
                    "haan", "ha", "haa", "batao", "btao", "bataiye", "bolo", "bolie",
                    "kahiye", "yes", "sure", "go ahead",
                    "हाँ", "हां", "बताओ", "बताइए", "बोलो", "बोलिए", "कहिए", "अदिति बताओ", "अदिति बोलो"
                ]
                is_affirmative = any(aff in t_lower for aff in affirmative_starters)

                # Count conversation turns so far safely
                msgs_fn = getattr(turn_ctx, 'messages', None)
                chat_messages = msgs_fn() if callable(msgs_fn) else (msgs_fn or [])
                turn_count = len([m for m in chat_messages if getattr(m, 'role', '') in ('user', 'assistant')])

                if is_affirmative and turn_count <= 4:
                    campaign_goal = getattr(self, 'campaign_goal', '') or 'Discuss our products, services, and pricing'
                    c_name = getattr(self, 'prospect_name', '')
                    name_prompt = f" to {c_name}" if c_name else ""
                    # Add high-priority nudge to ensure LLM pitches immediately and does NOT say goodbye
                    turn_ctx.add_message(
                        role="system",
                        content=[
                            f"[CRITICAL FLOW NOTE: The prospect just gave permission to speak ('{norm_txt}'). "
                            f"IMMEDIATELY introduce the reason you called{name_prompt}: '{campaign_goal}'. "
                            f"Keep your response to 1-2 conversational sentences and ask an engaging discovery question. DO NOT say goodbye, DO NOT say '{getattr(self, 'ending_message', '')}'!]"
                        ]
                    )
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
        if "twilio-" in room_name or "sip-" in room_name:
            logger.info(f"[VikramAgent] Telephony room '{room_name}': waiting for caller to connect...")
            for _ in range(30): # wait up to 3.0s with high-frequency 100ms check
                remotes = getattr(room, 'remote_participants', {}) if room else {}
                if remotes:
                    has_caller = any(
                        "caller" in getattr(p, 'identity', '').lower() or 
                        "twilio" in getattr(p, 'identity', '').lower() or
                        "phone" in getattr(p, 'identity', '').lower()
                        for p in remotes.values()
                    )
                    if has_caller:
                        logger.info(f"[VikramAgent] Caller connected to room! Speaking greeting immediately.")
                        break
                await asyncio.sleep(0.1)
            await asyncio.sleep(0.2)
        else:
            await asyncio.sleep(0.1)

        greeting = getattr(self, 'greeting_message', None)
        if not greeting:
            if getattr(self, 'language', 'hinglish') in ['hinglish', 'hi-IN']:
                _bname = getattr(self, 'business_name', '') or ''
                _comp = f" {_bname} se" if _bname else ""
                _bn = getattr(self, 'bot_name', 'Agent')
                if getattr(self, 'gender', 'male') == 'female':
                    greeting = f"Namaste ji, main{_comp} {_bn} bol rahi hoon. Kya main 30 second ke liye aapka time le sakti hoon?"
                else:
                    greeting = f"Namaste ji, main{_comp} {_bn} bol raha hoon. Kya main 30 second ke liye aapka time le sakta hoon?"
            else:
                _bname = getattr(self, 'business_name', '') or ''
                _comp = f" from {_bname}" if _bname else ""
                _bn = getattr(self, 'bot_name', 'Agent')
                greeting = f"Hello, this is {_bn}{_comp}. How can I help you today?"
            
        logger.info(f"[VikramAgent] Speaking greeting: '{greeting}'")
        print(f"[Agent] Speaking greeting: '{greeting}'", flush=True)
        await self.session.say(
            greeting,
            allow_interruptions=False
        )

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
                supabase_admin.table("voice_calls").select("id, caller_phone, caller_name, metadata")
                .eq("metadata->>room_name", room_name)
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
                supabase_admin.table("voice_calls").select("id, caller_phone, caller_name, metadata")
                .or_(f"metadata->>provider_call_id.eq.{call_sid},metadata->>session_id.eq.{call_sid},id.eq.{call_sid}")
                .order("created_at", desc=True)
                .limit(1).execute
            )
            if res.data and len(res.data) > 0:
                existing_call = res.data[0]
                logger.info(f"[extract_and_save_lead] Matched existing voice_call {existing_call['id']} by call_sid '{call_sid}'")
        except Exception as e:
            logger.error(f"Failed to lookup existing call by call_sid {call_sid}: {e}")

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
    current_time_str = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')

    prompt = f"""Analyze this sales call transcript and extract lead and callback information.
    
Transcript:
{transcript[:4000]}

Current time is {current_time_str}.

Return a JSON object with:
- is_lead: boolean. MUST BE TRUE ONLY IF the caller actively engaged in conversation, showed genuine commercial interest in products/services, asked about pricing/features, or agreed to a purchase/demo/callback. MUST BE FALSE if the call only consisted of greetings, pickup acknowledgments ("hello", "haan bolo", "batao"), early hangup, or if no substantive business conversation occurred.
- contact_name: the caller's name if mentioned (e.g. Raghav)
- contact_phone: the caller's phone if mentioned
- contact_email: the caller's email if mentioned
- company: the caller's company if mentioned
- interest_level: "low", "medium", "high", or "hot"
- budget_range: any budget mentioned
- timeline: when they want to buy (immediate, 1_month, 3_months, exploring)
- call_summary: 2-sentence summary of the conversation
- extracted_data: object with any other useful fields
- sentiment: "positive", "neutral", or "negative"
- callback_scheduled: true if the caller requested a callback or indicated they want to talk later (e.g., "call me 1 hr later", "kal call karna"). false otherwise.
- callback_time_iso: a guess of the ISO-8601 datetime for the callback (in UTC), based on any raw text mentioned. Use the current time provided to resolve relative times. Format as "YYYY-MM-DDTHH:MM:SSZ". Null if callback_scheduled is false.
- callback_reason: the context or reason for callback if callback_scheduled is true.
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

    # Code-level qualification guard: If customer spoke fewer than 6 words or only greeting words, force is_lead to False
    customer_turns = [l.replace("customer:", "").strip() for l in transcript.split("\n") if l.strip().startswith("customer:")]
    total_customer_words = sum(len(t.split()) for t in customer_turns)
    if total_customer_words < 6 and not lead_data.get("callback_scheduled"):
        lead_data["is_lead"] = False
        lead_data["interest_level"] = "low"

    # Import IntegrationExecutor dynamically
    try:
        from app.services.integration_executor import IntegrationExecutor
        executor = IntegrationExecutor()
    except Exception as exec_err:
        logger.error(f"Failed to initialize IntegrationExecutor: {exec_err}")
        executor = None

    # Update voice_calls with extracted sentiment and call summary
    if original_call_id:
        try:
            update_data = {
                "sentiment": lead_data.get("sentiment", "neutral"),
                "call_summary": lead_data.get("call_summary", "")
            }
            await asyncio.to_thread(
                supabase_admin.table("voice_calls").update(update_data).eq("id", original_call_id).execute
            )

            # Sync to 'calls' table for Calls History and Analytics pages
            try:
                resolved_phone = lead_data.get("contact_phone") or (existing_call.get("caller_phone") if existing_call else None) or (existing_call.get("metadata", {}).get("to_number") if existing_call else None) or "Unknown"
                calls_record = {
                    "user_id": user_id,
                    "agent_id": agent_id,
                    "session_id": call_sid or (existing_call.get("metadata", {}).get("provider_call_id") if existing_call else None) or str(original_call_id or ""),
                    "caller_phone": resolved_phone,
                    "duration_seconds": duration_seconds,
                    "transcript": transcript,
                    "sentiment": lead_data.get("sentiment", "neutral"),
                    "status": "completed"
                }
                await asyncio.to_thread(supabase_admin.table("calls").insert(calls_record).execute)
                logger.info(f"[extract_and_save_lead] Successfully synced call to 'calls' table for analytics (phone: {resolved_phone})")
            except Exception as calls_err:
                logger.warning(f"Failed to sync to calls table: {calls_err}")
        except Exception as e:
            logger.error(f"Failed to update voice_call with extracted sentiment: {e}")

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

                # Fallback to phone number from voice call or contact record
                fb_phone = (existing_call.get("caller_phone") if existing_call else None)
                fb_name = (existing_call.get("caller_name") if existing_call else None)

                lead_payload = {
                    "user_id": user_id,
                    "agent_id": agent_id,
                    "full_name": lead_data.get("contact_name") or fb_name or "Prospect",
                    "phone": lead_data.get("contact_phone") or fb_phone,
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

                # Trigger Lead Captured event
                if executor and lead_id:
                    try:
                        asyncio.create_task(executor.on_lead_captured(agent_id, {
                            "lead_id": lead_id,
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
                            supabase_admin.table("voice_calls").select("caller_phone").eq("id", original_call_id).single().execute
                        )
                        if call_rec.data:
                            phone = call_rec.data.get("caller_phone")
                    except Exception as e:
                        logger.error(f"Failed to fetch phone from call record: {e}")
                
                if not phone:
                    # Search latest active call for this agent
                    try:
                        recent_call = await asyncio.to_thread(
                            supabase_admin.table("voice_calls")
                            .select("caller_phone")
                            .eq("agent_id", agent_id)
                            .order("started_at", desc=True)
                            .limit(1)
                            .execute
                        )
                        if recent_call.data:
                            phone = recent_call.data[0].get("caller_phone")
                    except Exception as e:
                        logger.error(f"Failed to lookup active call: {e}")
                
                # If still no phone, default to "Unknown"
                phone = phone or "Unknown"

                # Parse the ISO time
                callback_time = lead_data.get("callback_time_iso")
                if not callback_time:
                    # Default: 2 hours from now UTC
                    from datetime import timedelta
                    callback_time = (datetime.utcnow() + timedelta(hours=2)).replace(microsecond=0).isoformat() + "Z"

                # If lead_id was not just created, try searching for existing lead by phone
                if not lead_id and phone != "Unknown":
                    try:
                        existing_lead = await asyncio.to_thread(
                            supabase_admin.table("leads").select("id").eq("phone", phone).eq("user_id", user_id).limit(1).execute
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

        # 5. Trigger Call Completed event now that all DB records (calls, leads, callbacks) are saved
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
                    "contact_email": lead_data.get("contact_email", ""),
                    "lead_id": lead_id
                }
                asyncio.create_task(executor.on_call_completed(agent_id, call_payload))
            except Exception as e:
                logger.error(f"Error triggering on_call_completed: {e}")

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
    contact_id = None
    call_sid = None

    if ctx.room and "--" in ctx.room.name:
        # Structured room name format: twilio--{agent_id}--{contact_id}--{nonce_or_sid}
        parts = ctx.room.name.split("--")
        if len(parts) >= 3:
            if parts[1] not in ("noagent", "None", "", "unknown"):
                agent_id = parts[1]
            if parts[2] not in ("nocontact", "None", "", "unknown"):
                contact_id = parts[2]
            if len(parts) >= 4:
                call_sid = parts[3]
            logger.info(f"[Twilio Entrypoint] Parsed agent_id='{agent_id}', contact_id='{contact_id}', call_sid='{call_sid}' from room '{ctx.room.name}'")
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

    # Fallback to database lookup if agent_id, contact_id, or call_sid is missing
    if ctx.room and (not agent_id or not contact_id or not call_sid):
        try:
            call_res = await asyncio.to_thread(
                supabase_admin.table("voice_calls")
                .select("agent_id, metadata")
                .or_(f"metadata->>room_name.eq.{ctx.room.name},metadata->>provider_call_id.eq.{ctx.room.name}")
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
                logger.info(f"[Twilio Entrypoint] Resolved from voice_calls DB: agent_id={agent_id}, contact_id={contact_id}, call_sid={call_sid}")
        except Exception as e:
            logger.error(f"Failed to resolve call metadata from voice_calls for {ctx.room.name}: {e}")

    user_id = None
    organization_id = None
    agent_data = None
    
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

### Clean Spoken Output (CRITICAL):
- Output ONLY plain, natural conversational dialogue meant to be spoken out loud.
- NEVER output tone tags, annotations, or markers like ((warm)), ((slow)), ((pause)), ((/warm)).
- NEVER output markdown formatting such as **bold**, *italic*, or bullet points.
- Match the user's language and script naturally (if user speaks Hinglish, respond in natural Hinglish).

### Natural Speech Rhythm:
- Use natural punctuation for pacing: commas, periods, or ellipses (...) for slight breath pauses.
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

                # If contact_id not yet resolved from room name, try fallback lookup from voice_calls
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
                            logger.info(f"[Twilio Entrypoint] Successfully loaded campaign contact {contact_id}: Name='{campaign_contact.get('full_name')}', Notes='{campaign_contact.get('notes')}'")
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

                sarvam_female = ['aditi', 'ritu', 'priya', 'neha', 'pooja', 'simran', 'kavya', 'ishita', 'shreya', 'roopa', 'tanya', 'shruti', 'suhani', 'kavitha', 'rupali', 'amelia', 'sophia', 'anushka', 'maya', 'diya', 'meera', 'sita', 'radha', 'leela', 'shimmer', 'alloy', 'nova', 'fable', 'rachel', 'domi', 'bella', 'elli', 'sarah']
                is_female = (str(voice_id).lower() in sarvam_female or (agent_data and (agent_data.get("gender") == "female" or agent_data.get("voice_gender") == "female")))
                gender_tag = 'female' if is_female else 'male'
                
                raw_name = agent_data.get('name', 'Agent') if agent_data else 'Agent'
                clean_name = re.sub(r'^\[[^\]]+\]\s*', '', raw_name)
                clean_name = re.sub(r'\s*-\s*(Demo|Trial)\s*$', '', clean_name, flags=re.IGNORECASE)
                if clean_name.lower() in ('multi agent', 'multi-agent', 'agent', ''):
                    if raw_greeting and re.search(r'\baditi\b', raw_greeting, re.IGNORECASE):
                        clean_name = "Aditi"
                    elif gender_tag == 'female':
                        clean_name = "Aditi" if str(voice_id).lower() == "aditi" else "Anushka"
                    else:
                        clean_name = "Vikram"
                bot_name = clean_name

                # Dynamic extraction of business name and offerings (never hardcoded to Trinetra)
                business_info = extract_business_info(system_prompt, agent_data, profile_data)
                business_name_val = business_info["business_name"]

                # Resolve greeting message preserving user custom text and dynamic parameters
                greeting_message = resolve_agent_greeting(
                    raw_greeting=raw_greeting,
                    clean_name=clean_name,
                    business_name=business_name_val,
                    campaign_contact=campaign_contact,
                    customer=customer,
                    language=language,
                    gender_tag=gender_tag
                )

                # Substitute placeholders in system_prompt
                company_display = business_name_val or 'our company'
                system_prompt = system_prompt.replace('{{agent_name}}', clean_name).replace('{agentName}', clean_name)
                system_prompt = system_prompt.replace('{{company_name}}', company_display).replace('{companyName}', company_display)

                if campaign_contact:
                    c_name = campaign_contact.get("full_name") or ""
                    c_company = campaign_contact.get("company_name") or ""
                    c_notes = campaign_contact.get("notes") or ""
                    end_msg_text = agent_data.get("ending_message", "") if agent_data else ""
                    
                    # Universal, business-agnostic Master Outbound Sales Protocol
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
                elif customer:
                    cust_name = customer.get("full_name") or ""
                    cust_tags = customer.get("tags") or []
                    cust_notes = customer.get("notes") or ""
                    cust_last = customer.get("last_contact_at")
                    customer_context = f"\n\n## CALLER RECOGNITION DETAILS:\n- Caller Name: {cust_name}\n- Tags: {', '.join(cust_tags)}\n- Last Contact: {cust_last}\n- Past Notes: {cust_notes}\n- IMPORTANT: Greet them by name and reference their past context if appropriate."
                    system_prompt += customer_context

                # Enforce Gender-consistent Hindi/Hinglish Grammar
                system_prompt = apply_gender_grammar_directives(system_prompt, gender_tag, bot_name, voice_id)

                if agent_data and agent_data.get("ending_message"):
                    end_msg = agent_data['ending_message']
                    system_prompt += (
                        f"\n\n## CALL ENDING & ENGAGEMENT RULES (STRICT CRITICAL RULES):\n"
                        f"1. Natural Call Conclusion: When the caller explicitly wants to end the call (e.g. says goodbye, says they must hang up, or has confirmed a callback/appointment), you MUST say exactly: '{end_msg}'\n"
                        f"2. ABSOLUTE PROHIBITION: NEVER say '{end_msg}' at the start of the call or after greeting!\n"
                        f"3. Affirmative Response Handling: If the caller says yes, 'haan', 'batao', 'bolo', or gives permission to speak after your greeting, they want to hear why you called! IMMEDIATELY introduce the reason for your call, discuss products/services, or ask a helpful discovery question. NEVER say goodbye when the prospect is listening!"
                    )
                
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
        language=language,
        llm_provider=agent_data.get('llm_provider') if agent_data else None,
        llm_model=agent_data.get('llm_model') if agent_data else None,
        temperature=agent_data.get('temperature') if agent_data else None,
    )

    if greeting_message:
        agent_instance.greeting_message = greeting_message

    agent_instance.bot_name = bot_name
    agent_instance.business_name = business_name_val if 'business_name_val' in dir() else (agent_data.get('business_name', '') if agent_data else '')
    agent_instance.gender = gender_tag
    agent_instance.prospect_name = c_name if ('campaign_contact' in locals() and campaign_contact and 'is_name_valid' in locals() and is_name_valid) else ('cust_name' in locals() and cust_name or "")
    agent_instance.campaign_goal = notes_summary if ('campaign_contact' in locals() and campaign_contact and 'notes_summary' in locals()) else ""
    agent_instance.ending_message = agent_data.get("ending_message", "") if agent_data else ""

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

    # Configure fast local VAD turn detection to eliminate cloud EOT model timeout latency
    session = AgentSession(
        vad=vad_model,
        turn_detection="vad",
        min_endpointing_delay=0.2,
        max_endpointing_delay=0.6,
        preemptive_generation=True,
        min_interruption_duration=0.5,
        min_interruption_words=2,
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

        # 1. Wait up to 6.0s for the agent to enter 'speaking' state if not already
        for _ in range(60):
            if getattr(session, 'agent_state', '') == 'speaking':
                break
            await asyncio.sleep(0.1)

        # 2. Wait until the agent finishes speaking completely
        while getattr(session, 'agent_state', '') == 'speaking':
            await asyncio.sleep(0.2)

        # 3. Grace period for audio stream buffer and carrier line to finish playing
        logger.info("[Intent Call Cut - EP] Agent finished speaking. Waiting 1.5s playback drain before disconnect...")
        await asyncio.sleep(1.5)

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

    def check_closing_intent(text: str) -> bool:
        if not text:
            return False
        t = text.lower().strip()

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
                if any(cut in last_cust for cut in ["call cut", "phone rakh", "phone kaat", "bye", "disconnect", "nahi chahiye", "not interested", "wrong number"]):
                    user_requested_cut = True

        # SAFETY GUARD 2: Early turns (<= 4) cannot trigger disconnect unless caller explicitly demanded it
        if len(call_transcript_turns) <= 4 and not user_requested_cut:
            logger.warning(f"[check_closing_intent] Suppressing early disconnect attempt on turn {len(call_transcript_turns)}: '{text}'")
            return False

        configured_ending = agent_data.get("ending_message", "").lower().strip() if agent_data else ""
        if configured_ending and len(t) >= 15 and configured_ending in t:
            return True
        
        closing_phrases = [
            "goodbye", "good bye", "bye bye", "take care", "have a nice day",
            "talk to you later", "see you later", "see you soon",
            "alvida", "phir milenge", "baat karke achha laga", "baat karke accha laga",
            "call cut", "phone rakh", "phone kaat",
            "call disconnect", "अलविदा", "गुडबाय", "गुड बाय", "बाय बाय", "फिर मिलेंगे"
        ]
        if any(phrase in t for phrase in closing_phrases):
            return True
        if re.search(r'\bbye\b', t) and not re.search(r'\b(by the way|stand by|by)\b', t):
            return True
        return False

    @session.on("conversation_item_added")
    def _on_conversation_item_added_ep(event):
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
            if role == "user" and clean_txt:
                clean_txt = normalize_user_transcript(clean_txt, agent_name=bot_name, is_female=is_female)

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

            # Trigger intent disconnect if assistant says goodbye
            if role == "assistant" and check_closing_intent(text):
                logger.info(f"[Intent Call Cut] Closing utterance by assistant: '{text}' -> scheduling graceful disconnect after speech finishes")
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

                if transcript or duration > 0:
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
    if os.getenv("ENABLE_IN_PROCESS_AGENT", "false").lower() != "true":
        logger.info(f"[run_agent] In-process agent disabled (ENABLE_IN_PROCESS_AGENT!=true). External LiveKit worker entrypoint will manage room '{room_name}'.")
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

### Clean Spoken Output (CRITICAL):
- Output ONLY plain, natural conversational dialogue meant to be spoken out loud.
- NEVER output tone tags, annotations, or markers like ((warm)), ((slow)), ((pause)), ((/warm)).
- NEVER output markdown formatting such as **bold**, *italic*, or bullet points.
- Match the user's language and script naturally (if user speaks Hinglish, respond in natural Hinglish).

### Natural Speech Rhythm:
- Use natural punctuation for pacing: commas, periods, or ellipses (...) for slight breath pauses.
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
                    prof_res = await asyncio.to_thread(
                        supabase_admin.table("profiles").select("company_name").eq("id", user_id).execute
                    )
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
                is_female = (gender_tag == 'female')

                raw_name = agent_data.get('name', 'Agent')
                clean_name = re.sub(r'^\[[^\]]+\]\s*', '', raw_name)
                clean_name = re.sub(r'\s*-\s*(Demo|Trial)\s*$', '', clean_name, flags=re.IGNORECASE)
                if clean_name.lower() in ('multi agent', 'multi-agent', 'agent', ''):
                    if raw_greeting and re.search(r'\baditi\b', raw_greeting, re.IGNORECASE):
                        clean_name = "Aditi"
                    elif gender_tag == 'female':
                        clean_name = "Aditi" if str(voice_id).lower() == "aditi" else "Anushka"
                    else:
                        clean_name = "Vikram"
                bot_name = clean_name

                # Dynamic extraction of business name and offerings (never hardcoded to Trinetra)
                business_info = extract_business_info(system_prompt, agent_data, profile_data)
                business_name_val = business_info["business_name"]

                # Resolve greeting message preserving user custom text and dynamic parameters
                greeting_message = resolve_agent_greeting(
                    raw_greeting=raw_greeting,
                    clean_name=clean_name,
                    business_name=business_name_val,
                    campaign_contact=campaign_contact,
                    customer=customer,
                    language=language,
                    gender_tag=gender_tag
                )

                # Substitute placeholders in system_prompt
                company_display = business_name_val or 'our company'
                system_prompt = system_prompt.replace('{{agent_name}}', clean_name).replace('{agentName}', clean_name)
                system_prompt = system_prompt.replace('{{company_name}}', company_display).replace('{companyName}', company_display)

                if campaign_contact:
                    c_name = campaign_contact.get("full_name") or ""
                    c_company = campaign_contact.get("company_name") or ""
                    c_notes = campaign_contact.get("notes") or ""
                    end_msg_text = agent_data.get("ending_message", "") if agent_data else ""
                    
                    # Universal, business-agnostic Master Outbound Sales Protocol
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
                elif customer:
                    cust_name = customer.get("full_name") or ""
                    cust_tags = customer.get("tags") or []
                    cust_notes = customer.get("notes") or ""
                    cust_last = customer.get("last_contact_at")
                    customer_context = f"\n\n## CALLER RECOGNITION DETAILS:\n- Caller Name: {cust_name}\n- Tags: {', '.join(cust_tags)}\n- Last Contact: {cust_last}\n- Past Notes: {cust_notes}\n- IMPORTANT: Greet them by name and reference their past context if appropriate."
                    system_prompt += customer_context

                # Enforce Gender-consistent Hindi/Hinglish Grammar
                system_prompt = apply_gender_grammar_directives(system_prompt, gender_tag, bot_name, voice_id)

                if agent_data and agent_data.get("ending_message"):
                    end_msg = agent_data['ending_message']
                    system_prompt += (
                        f"\n\n## CALL ENDING & ENGAGEMENT RULES (STRICT CRITICAL RULES):\n"
                        f"1. Natural Call Conclusion: When the caller explicitly wants to end the call (e.g. says goodbye, says they must hang up, or has confirmed a callback/appointment), you MUST say exactly: '{end_msg}'\n"
                        f"2. ABSOLUTE PROHIBITION: NEVER say '{end_msg}' at the start of the call or after greeting!\n"
                        f"3. Affirmative Response Handling: If the caller says yes, 'haan', 'batao', 'bolo', or gives permission to speak after your greeting, they want to hear why you called! IMMEDIATELY introduce the reason for your call, discuss products/services, or ask a helpful discovery question. NEVER say goodbye when the prospect is listening!"
                    )
                
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

    print(f"[Agent] Joining room: {room_name}", flush=True)
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
            language=language,
            llm_provider=agent_data.get('llm_provider') if agent_data else None,
            llm_model=agent_data.get('llm_model') if agent_data else None,
            temperature=agent_data.get('temperature') if agent_data else None,
        )

        if greeting_message:
            agent_instance.greeting_message = greeting_message
        agent_instance.room = room
        agent_instance.bot_name = bot_name
        agent_instance.business_name = business_name_val if 'business_name_val' in dir() else (agent_data.get('business_name', '') if agent_data else '')
        agent_instance.gender = gender_tag
        agent_instance.prospect_name = c_name if ('campaign_contact' in locals() and campaign_contact and 'is_name_valid' in locals() and is_name_valid) else ('cust_name' in locals() and cust_name or "")
        agent_instance.campaign_goal = notes_summary if ('campaign_contact' in locals() and campaign_contact and 'notes_summary' in locals()) else ""
        agent_instance.ending_message = agent_data.get("ending_message", "") if agent_data else ""

        session = AgentSession(
            vad=vad_model,
            turn_detection="vad",
            min_endpointing_delay=0.2,
            max_endpointing_delay=0.6,
            preemptive_generation=True,
            min_interruption_duration=0.5,
            min_interruption_words=2,
            resume_false_interruption=True,
        )
        done = asyncio.Event()

        @room.on("disconnected")
        def on_disconnected(reason):
            logger.info(f"[In-Process Agent] Room disconnected: {reason}")
            done.set()

        @room.on("participant_disconnected")
        def on_participant_disconnected(participant: rtc.RemoteParticipant):
            p_id = getattr(participant, 'identity', '') or ''
            logger.info(f"[In-Process Agent] Participant disconnected: {p_id}")
            if "caller" in p_id or "twilio" in p_id or not room.remote_participants:
                logger.info(f"[In-Process Agent] Phone caller left room. Ending agent session.")
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

            # 1. Wait up to 6.0s for the agent to enter 'speaking' state if not already
            for _ in range(60):
                if getattr(session, 'agent_state', '') == 'speaking':
                    break
                await asyncio.sleep(0.1)

            # 2. Wait until the agent finishes speaking completely
            while getattr(session, 'agent_state', '') == 'speaking':
                await asyncio.sleep(0.2)

            # 3. Grace period for audio stream buffer and carrier line to finish playing
            logger.info("[Intent Call Cut - RA] Agent finished speaking. Waiting 1.5s playback drain before disconnect...")
            await asyncio.sleep(1.5)

            try:
                call_end_signal = json.dumps({"type": "call_ended", "reason": "intent_goodbye"}).encode("utf-8")
                if room and room.local_participant:
                    await room.local_participant.publish_data(call_end_signal)
            except Exception as sig_err:
                logger.warning(f"Error publishing call_ended signal: {sig_err}")

            try:
                if room:
                    await room.disconnect()
            except Exception:
                pass
            done.set()

        def check_closing_intent_ra(text: str) -> bool:
            if not text:
                return False
            t = text.lower().strip()

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
                    if any(cut in last_cust for cut in ["call cut", "phone rakh", "phone kaat", "bye", "disconnect", "nahi chahiye", "not interested", "wrong number"]):
                        user_requested_cut = True

            # SAFETY GUARD 2: Early turns (<= 4) cannot trigger disconnect unless caller explicitly demanded it
            if len(call_transcript_turns_ra) <= 4 and not user_requested_cut:
                logger.warning(f"[check_closing_intent_ra] Suppressing early disconnect attempt on turn {len(call_transcript_turns_ra)}: '{text}'")
                return False

            configured_ending = agent_data.get("ending_message", "").lower().strip() if agent_data else ""
            if configured_ending and len(t) >= 15 and configured_ending in t:
                return True
            
            closing_phrases = [
                "goodbye", "good bye", "bye bye", "take care", "have a nice day",
                "talk to you later", "see you later", "see you soon",
                "alvida", "phir milenge", "baat karke achha laga", "baat karke accha laga",
                "call cut", "phone rakh", "phone kaat",
                "call disconnect", "अलविदा", "गुडबाय", "गुड बाय", "बाय बाय", "फिर मिलेंगे"
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
                if role == "user" and clean_txt:
                    clean_txt = normalize_user_transcript(clean_txt, agent_name=bot_name, is_female=is_female)

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

                if role == "assistant" and check_closing_intent_ra(text):
                    logger.info(f"[Intent Call Cut - RA] Closing utterance by assistant: '{text}' -> scheduling graceful disconnect after speech finishes")
                    asyncio.create_task(execute_intent_disconnect_ra())
            except Exception as err:
                logger.warning(f"Error in conversation_item_added RA hook: {err}")

        # NOTE: agent_speech_committed transcript hook removed — conversation_item_added
        # already publishes transcripts for agent turns. Duplicate hooks caused 2-3x
        # repeated messages in the frontend.

        try:
            connected = False
            for connect_attempt in range(3):
                try:
                    await asyncio.wait_for(room.connect(livekit_url, token), timeout=8.0)
                    connected = True
                    print(f"[Agent] Connected to LiveKit", flush=True)
                    _active_livekit_rooms.add(room)
                    break
                except asyncio.TimeoutError:
                    logger.warning(f"[Agent] LiveKit connection attempt {connect_attempt + 1} timed out after 8s. Retrying...")
                    await asyncio.sleep(0.3)
                except Exception as connect_err:
                    logger.warning(f"[Agent] LiveKit connection attempt {connect_attempt + 1} failed: {connect_err}. Retrying...")
                    await asyncio.sleep(0.3)

            if not connected:
                logger.error(f"[Agent] Failed to connect to LiveKit after 4 attempts for room {room_name}")
                return
                
            # Guard: Check if an agent participant is already connected
            if room.remote_participants:
                for p in room.remote_participants.values():
                    p_identity = getattr(p, 'identity', '') or ''
                    if p_identity.startswith("agent_") or p_identity.startswith("Vikram") or "agent" in p_identity.lower():
                        logger.warning(f"[DUPLICATE WORKER GUARD] Room '{room_name}' already has connected agent participant '{p_identity}'. Disconnecting duplicate in-process agent.")
                        await room.disconnect()
                        return

            await session.start(agent=agent_instance, room=room)
            
            async def _room_watchdog():
                while not done.is_set():
                    await asyncio.sleep(1.0)
                    if room and not room.isconnected():
                        logger.info(f"[In-Process Agent] Watchdog detected room '{room_name}' is no longer connected. Signaling done.")
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
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))