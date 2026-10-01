"""
Call Disclosure & Consent Engine (Phase 1)
==========================================
Enforces mandatory call disclosure and transparent caller consent across all
inbound and outbound phone calls.

COMPLIANCE & LEGAL NOTICE:
[CONFIRM WITH A LAWYER] Passive notice vs. affirmative consent requirements
vary by jurisdiction (e.g., California two-party consent under Penal Code § 632,
India Digital Personal Data Protection Act 2023 Sec 6, and EU GDPR Article 7).
Primary Sources:
- DPDP Act 2023: https://www.meity.gov.in/content/digital-personal-data-protection-act-2023
- California Penal Code § 632: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=632.&lawCode=PEN
- EU GDPR: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- FCC TCPA Declaratory Ruling: https://www.fcc.gov/document/fcc-makes-ai-generated-voices-robocalls-illegal
"""

import os
import re
import random
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger("disclosure-service")

# A/B Testing Variants (All variants unconditionally disclose AI identity and recording)
DISCLOSURE_VARIANTS = ["standard", "concise", "warm"]

# Multilingual Templates
# Keys: language -> direction -> variant -> template
DISCLOSURE_TEMPLATES: Dict[str, Dict[str, Dict[str, str]]] = {
    "en": {
        "inbound": {
            "standard": "Hello, this is {agent}, an AI assistant from {business}. This call may be recorded for service quality. How can I help you?",
            "concise": "Hi, this is {agent}, an AI assistant at {business}. This call may be recorded. How can I assist you?",
            "warm": "Hello and welcome! This is {agent}, an AI assistant with {business}. To ensure great service, this call may be recorded. How can I help you today?",
        },
        "outbound": {
            "standard": "Hello, this is {agent}, an AI assistant calling from {business} about {purpose}. This call is recorded. Is this a good time?",
            "concise": "Hi, this is {agent}, an AI assistant with {business} regarding {purpose}. This call is recorded. Do you have a moment?",
            "warm": "Hello! This is {agent}, an AI assistant reaching out from {business} about {purpose}. This call is recorded for quality. Is now a good time to speak?",
        }
    },
    "hi": {
        "inbound": {
            "standard": "नमस्ते, मैं {business} से {agent} बोल {verb} हूँ, एक AI assistant। सर्विस क्वालिटी के लिए यह कॉल रिकॉर्ड की जा सकती है। मैं आपकी क्या मदद कर {modal} हूँ?",
            "concise": "नमस्ते, मैं {business} से {agent} बोल {verb} हूँ, एक AI assistant। यह कॉल रिकॉर्ड हो सकती है। बताइए मैं क्या मदद करूँ?",
            "warm": "नमस्ते जी, {business} में आपका स्वागत है! मैं {agent} बोल {verb} हूँ, एक AI assistant। सर्विस क्वालिटी के लिए यह कॉल रिकॉर्ड की जा सकती है। मैं आपकी कैसे मदद कर {modal} हूँ?",
        },
        "outbound": {
            "standard": "नमस्ते, मैं {business} से {agent} बोल {verb} हूँ, एक AI assistant, {purpose} के सिलसिले में। यह कॉल रिकॉर्ड की जा रही है। क्या यह बात करने का सही समय है?",
            "concise": "नमस्ते, मैं {business} से {agent} बोल {verb} हूँ, एक AI assistant, {purpose} के लिए। यह कॉल रिकॉर्ड हो रही है। क्या आपके पास दो मिनट हैं?",
            "warm": "नमस्ते जी! मैं {business} से {agent} बोल {verb} हूँ, एक AI assistant, {purpose} के बारे में। यह कॉल क्वालिटी के लिए रिकॉर्ड की जा रही है। क्या अभी बात हो सकती है?",
        }
    },
    "hinglish": {
        "inbound": {
            "standard": "Hello, main {business} se {agent} bol {verb} hoon, ek AI assistant. Service quality ke liye yeh call record ki ja sakti hai. How can I help you today?",
            "concise": "Hi, main {business} se {agent}, ek AI assistant bol {verb} hoon. Yeh call record ho sakti hai. Batayein main aapki kya help kar {modal} hoon?",
            "warm": "Hello ji! {business} mein aapka swagat hai. Main {agent} bol {verb} hoon, ek AI assistant. Quality ke liye yeh call record ki ja sakti hai. Batayein aaj main aapki kaise help kar {modal} hoon?",
        },
        "outbound": {
            "standard": "Hello, main {business} se {agent} bol {verb} hoon, ek AI assistant, calling about {purpose}. Yeh call record ki ja rahi hai. Kya yeh baat karne ka sahi time hai?",
            "concise": "Hi, main {business} se {agent}, ek AI assistant, {purpose} ke liye call kar {verb} hoon. Call record ho rahi hai. Kya 2 minute baat ho sakti hai?",
            "warm": "Hello ji! Main {business} se {agent} bol {verb} hoon, ek AI assistant, {purpose} ke regarding. Quality ke liye yeh call record ki ja rahi hai. Kya abhi baat karne ke liye good time hai?",
        }
    },
    "ta": {
        "inbound": {
            "standard": "வணக்கம், நான் {business} நிறுவனத்திலிருந்து {agent}, ஓர் AI assistant. சேவைத் தரத்திற்காக இந்த அழைப்பு பதிவு செய்யப்படலாம். நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?",
            "concise": "வணக்கம், நான் {business}-லிருந்து {agent}, ஓர் AI assistant. இந்த அழைப்பு பதிவு செய்யப்படலாம். நான் எப்படி உதவலாம்?",
            "warm": "வணக்கம், {business}-க்கு தங்களை வரவேற்கிறோம்! நான் {agent}, ஓர் AI assistant. சிறந்த சேவைக்காக இந்த அழைப்பு பதிவு செய்யப்படலாம். இன்று உங்களுக்கு எவ்வாறு உதவட்டும்?",
        },
        "outbound": {
            "standard": "வணக்கம், நான் {business} நிறுவனத்திலிருந்து {agent}, ஓர் AI assistant, {purpose} தொடர்பாக அழைக்கிறேன். இந்த அழைப்பு பதிவு செய்யப்படுகிறது. பேசுவதற்கு இது சரியான நேரமா?",
            "concise": "வணக்கம், நான் {business} AI assistant {agent}, {purpose} குறித்து பேசுகிறேன். அழைப்பு பதிவு செய்யப்படுகிறது. சிறிது நேரம் பேசலாமா?",
            "warm": "வணக்கம்! நான் {business}-லிருந்து {agent}, ஓர் AI assistant, {purpose} தொடர்பாக தொடர்பு கொள்கிறேன். இந்த அழைப்பு பதிவு செய்யப்படுகிறது. இப்போது பேசுவது தங்களுக்கு சௌகரியமா?",
        }
    },
    "te": {
        "inbound": {
            "standard": "నమస్కారం, నేను {business} నుండి {agent}, ఒక AI assistant. నాణ్యత పరిశీలన కోసం ఈ కాల్ రికార్డ్ చేయబడవచ్చు. నేను మీకు ఎలా సహాయపడగలను?",
            "concise": "నమస్కారం, నేను {business} నుండి {agent}, ఒక AI assistant. ఈ కాల్ రికార్డ్ చేయబడవచ్చు. నేను ఏమి సహాయం చేయగలను?",
            "warm": "నమస్కారం, {business} కి స్వాగతం! నేను {agent}, ఒక AI assistant. నాణ్యమైన సేవ కోసం ఈ కాల్ రికార్డ్ చేయబడవచ్చు. ఈ రోజు మీకు ఎలా సహాయపడగలను?",
        },
        "outbound": {
            "standard": "నమస్కారం, నేను {business} నుండి {agent}, ఒక AI assistant, {purpose} గురించి మాట్లాడుతున్నాను. ఈ కాల్ రికార్డ్ చేయబడుతోంది. మాట్లాడటానికి ఇది సరైన సమయమేనా?",
            "concise": "నమస్కారం, నేను {business} AI assistant {agent}, {purpose} కోసం కాల్ చేస్తున్నాను. ఈ కాల్ రికార్డ్ అవుతోంది. మాట్లాడటానికి రెండు నిమిషాలు ఉంటాయా?",
            "warm": "నమస్కారమండి! నేను {business} నుండి {agent}, ఒక AI assistant, {purpose} విషయంపై సంప్రదిస్తున్నాను. ఈ కాల్ రికార్డ్ చేయబడుతోంది. ఇప్పుడు మాట్లాడటానికి అనువైన సమయమేనా?",
        }
    },
    "mr": {
        "inbound": {
            "standard": "नमस्कार, मी {business} कडून {agent} बोलत आहे, एक AI assistant. सेवेच्या गुणवत्तेसाठी हा कॉल रेकॉर्ड केला जाऊ शकतो. मी आपली काय मदत करू {modal_mr}?",
            "concise": "नमस्कार, मी {business} कडून {agent}, एक AI assistant बोलत आहे. हा कॉल रेकॉर्ड होऊ शकतो. मी कशी मदत करू?",
            "warm": "नमस्कार, {business} मध्ये आपले स्वागत आहे! मी {agent}, एक AI assistant बोलत आहे. चांगल्या सेवेसाठी हा कॉल रेकॉर्ड केला जाऊ शकतो. मी आपली काय मदत करू {modal_mr}?",
        },
        "outbound": {
            "standard": "नमस्कार, मी {business} कडून {agent} बोलत आहे, एक AI assistant, {purpose} संदर्भात. हा कॉल रेकॉर्ड केला जात आहे. ही बोलण्यासाठी योग्य वेळ आहे का?",
            "concise": "नमस्कार, मी {business} कडून {agent}, एक AI assistant, {purpose} साठी बोलत आहे. कॉल रेकॉर्ड होत आहे. दोन मिनिटे बोलू शकाल का?",
            "warm": "नमस्कार! मी {business} कडून {agent} बोलत आहे, एक AI assistant, {purpose} विषयी माहिती देण्यासाठी. हा कॉल रेकॉर्ड केला जात आहे. आता बोलणे सोयीचे होईल का?",
        }
    },
    "es": {
        "inbound": {
            "standard": "Hola, soy {agent}, un asistente de IA de {business}. Esta llamada puede ser grabada para control de calidad. ¿En qué puedo ayudarle hoy?",
            "concise": "Hola, le habla {agent}, un asistente de IA de {business}. Esta llamada puede ser grabada. ¿Cómo le puedo ayudar?",
            "warm": "¡Hola y bienvenido! Soy {agent}, un asistente de IA de {business}. Para garantizar la calidad del servicio, esta llamada puede ser grabada. ¿En qué puedo colaborarle hoy?",
        },
        "outbound": {
            "standard": "Hola, soy {agent}, un asistente de IA que llama de {business} sobre {purpose}. Esta llamada está siendo grabada. ¿Tiene un momento para hablar?",
            "concise": "Hola, le habla {agent}, un asistente de IA de {business} acerca de {purpose}. Esta llamada se graba. ¿Tiene un minuto?",
            "warm": "¡Hola! Le saluda {agent}, un asistente de IA de {business} con respecto a {purpose}. Esta llamada se graba para control de calidad. ¿Es este un buen momento para conversar?",
        }
    }
}

# Consent Mode Suffixes (added when mode is not pure passive notice)
CONSENT_MODE_SUFFIXES = {
    "stay_on_line": {
        "en": "By staying on the line, you consent to this recorded AI call.",
        "hi": "कॉल पर बने रहने से आप इस रिकॉर्डेड AI कॉल के लिए अपनी सहमति देते हैं।",
        "hinglish": "Call par bane rehne se aap is recorded AI call ke liye consent dete hain.",
        "ta": "இணைப்பில் தொடர்வதன் மூலம், இந்த பதிவு செய்யப்படும் AI அழைப்பிற்கு நீங்கள் ஒப்புதல் அளிக்கிறீர்கள்.",
        "te": "లైన్ లో కొనసాగడం ద్వారా, మీరు ఈ రికార్డ్ చేయబడిన AI కాల్ కు సమ్మతిని తెలియజేస్తున్నారు.",
        "mr": "कॉलवर सुरू राहून, आपण या रेकॉर्ड केलेल्या AI कॉलसाठी आपली संमती देत आहात.",
        "es": "Al permanecer en la línea, usted consiente esta llamada grabada con asistente de IA."
    },
    "spoken_or_keypress": {
        "en": "Please say 'yes' or press 1 to continue, or press 2 to decline.",
        "hi": "आगे बढ़ने के लिए 'हाँ' कहें या 1 दबाएं, अथवा अस्वीकार करने के लिए 2 दबाएं।",
        "hinglish": "Aage badhne ke liye 'haan' bolein ya 1 dabayein, ya decline karne ke liye 2 dabayein.",
        "ta": "தொடர 'ஆம்' என்று கூறவும் அல்லது 1 ஐ அழுத்தவும், நிராகரிக்க 2 ஐ அழுத்தவும்.",
        "te": "కొనసాగడానికి 'అవును' అనండి లేదా 1 నొక్కండి, తిరస్కరించడానికి 2 నొక్కండి.",
        "mr": "पुढे सुरू ठेवण्यासाठी 'होय' म्हणा किंवा 1 दाबा, नकार देण्यासाठी 2 दाबा.",
        "es": "Por favor diga 'sí' o presione 1 para continuar, o presione 2 para rechazar."
    }
}

# Jurisdictions where passive consent ('stay_on_line') is legally non-compliant or questionable for outbound marketing
# [CONFIRM WITH A LAWYER] India: Digital Personal Data Protection Act 2023 Sec 6 & TRAI TCCCPR 2018 (https://trai.gov.in)
# [CONFIRM WITH A LAWYER] EU: General Data Protection Regulation (EU) 2016/679 Art 7 & EU AI Act Art 50 (https://eur-lex.europa.eu)
RESTRICTED_AFFIRMATIVE_CONSENT_PREFIXES = (
    "+91", "91", # India
    "+49", "+33", "+39", "+34", "+31", "+32", "+43", "+46", "+48", "+353",
    "+45", "+358", "+351", "+30", "+420", "+40", "+36", "+421", "+359",
    "+385", "+370", "+386", "+371", "+372", "+357", "+352", "+356", "+44"
)
RESTRICTED_AFFIRMATIVE_COUNTRY_CODES = {
    "IN", "INDIA",
    "EU", "DE", "FR", "IT", "ES", "NL", "BE", "AT", "SE", "PL", "IE", "DK",
    "FI", "PT", "GR", "CZ", "RO", "HU", "SK", "BG", "HR", "LT", "SI", "LV",
    "EE", "CY", "LU", "MT", "GB", "UK"
}


def resolve_jurisdiction_consent_mode(
    configured_mode: Optional[str] = None,
    phone_number: Optional[str] = None,
    country_code: Optional[str] = None,
    call_direction: str = "outbound",
    is_marketing: bool = True,
    lawyer_confirmed: bool = False
) -> str:
    """
    Resolves the applicable consent mode based on jurisdiction, direction, and campaign purpose.
    
    COMPLIANCE RULES (CONFIRM WITH A LAWYER):
    1. Outbound marketing calls in India (+91) and EU default to 'spoken_or_keypress' (affirmative consent).
    2. 'stay_on_line' MUST NEVER be the default in India or the EU for outbound marketing calls.
    3. Passive 'stay_on_line' or 'notice_only' is rejected for outbound marketing in these jurisdictions
       unless formal lawyer confirmation is verified.
    """
    clean_phone = (phone_number or "").strip()
    clean_cc = (country_code or "").strip().upper()

    is_restricted_jurisdiction = False
    if clean_cc in RESTRICTED_AFFIRMATIVE_COUNTRY_CODES or clean_cc.startswith("IN-") or clean_cc.startswith("EU-"):
        is_restricted_jurisdiction = True
    elif clean_phone:
        normalized_num = clean_phone if clean_phone.startswith("+") else f"+{clean_phone}"
        if any(normalized_num.startswith(pfx) for pfx in RESTRICTED_AFFIRMATIVE_CONSENT_PREFIXES):
            is_restricted_jurisdiction = True
        elif len(clean_phone) == 10 and clean_phone.isdigit() and clean_phone[0] in "6789":
            # Standard 10-digit Indian mobile number
            is_restricted_jurisdiction = True

    # Rule: Outbound marketing in India/EU strictly defaults to spoken_or_keypress
    if call_direction.lower() == "outbound" and is_marketing and is_restricted_jurisdiction:
        if configured_mode == "stay_on_line" and not lawyer_confirmed:
            logger.warning(
                f"[Consent Guard] 'stay_on_line' is prohibited as default for outbound marketing in "
                f"India/EU jurisdiction. Overriding to 'spoken_or_keypress' [CONFIRM WITH A LAWYER]."
            )
            return "spoken_or_keypress"
        if not configured_mode or configured_mode in ["notice_only", "default"]:
            return "spoken_or_keypress"

    # Default fallback for other jurisdictions / non-marketing
    return configured_mode or "notice_only"


def normalize_language_code(language_str: Optional[str]) -> str:
    """Maps language identifiers to canonical supported keys."""
    if not language_str:
        return "hinglish"
    lang = language_str.strip().lower()
    if lang in ["hi", "hindi", "hi-in", "hi_in"]:
        return "hi"
    if lang in ["en", "english", "en-us", "en-in", "en-gb"]:
        return "en"
    if lang in ["ta", "tamil", "ta-in"]:
        return "ta"
    if lang in ["te", "telugu", "te-in"]:
        return "te"
    if lang in ["mr", "marathi", "mr-in"]:
        return "mr"
    if lang in ["es", "spanish", "es-es", "es-mx"]:
        return "es"
    return "hinglish"


def select_disclosure_variant(agent_config: Optional[dict] = None) -> str:
    """
    Picks the A/B testing variant.
    If agent specifies preferred_variant and A/B is disabled, uses preferred.
    Otherwise picks randomly from the 3 compliant variants.
    NOTE: Every variant has AI identity and recording disclosure.
    """
    if not agent_config:
        return random.choice(DISCLOSURE_VARIANTS)
    
    disclosure_cfg = agent_config.get("disclosure_config") or {}
    ab_enabled = disclosure_cfg.get("ab_testing_enabled", True)
    preferred = disclosure_cfg.get("preferred_variant")

    if not ab_enabled and preferred in DISCLOSURE_VARIANTS:
        return preferred
    return random.choice(DISCLOSURE_VARIANTS)


def validate_owner_disclosure_wording(wording: str, language: str = "en") -> Tuple[bool, list]:
    """
    Validates owner's customized disclosure wording.
    Owners CANNOT remove:
    1. AI Identity statement ('AI assistant' or language equivalent)
    2. Recording notice ('record' / 'recording' / language equivalent)
    """
    if not wording or not isinstance(wording, str):
        return False, ["Wording cannot be empty"]

    errors = []
    w_lower = wording.lower()

    # Must contain "ai assistant" or equivalent
    ai_indicators = ["ai assistant", "ai", "artificial intelligence", "asistente de ia", "ai सहायक"]
    if not any(ind in w_lower for ind in ai_indicators):
        errors.append("Wording must explicitly state 'AI assistant'. 'Virtual assistant' alone is insufficient.")

    # Must contain recording notice
    rec_indicators = ["record", "recorded", "recording", "रिकॉर्ड", "பதிவு", "రికార్డ్", "रेकॉर्ड", "grabada", "graba"]
    if not any(ind in w_lower for ind in rec_indicators):
        errors.append("Wording must explicitly state that the call is or may be recorded.")

    return (len(errors) == 0, errors)


def strip_dashboard_self_introduction(text: str, agent_name: str = "", business_name: str = "") -> str:
    """
    Strips self-introductions, agent/company name re-announcements, and leading greetings
    from the dashboard greeting text so that the mandatory disclosure statement smoothly
    serves as the sole introduction without repeating words.
    """
    if not text or not text.strip():
        return ""
    cleaned = text.strip()

    # Replace dynamic placeholders first
    for p in ['{{agent_name}}', '{agentName}', '{agent_name}', '{{name}}', '{name}']:
        cleaned = cleaned.replace(p, agent_name or '')
    for p in ['{{company_name}}', '{companyName}', '{company_name}', '{{business_name}}', '{business_name}']:
        cleaned = cleaned.replace(p, business_name or '')
    for p in ['{{customer_name}}', '{customerName}', '{customer_name}', '{{contact_name}}', '{contactName}']:
        cleaned = cleaned.replace(p, '')

    intro_patterns = [
        # Hindi / Hinglish self-intros and greetings
        r'^(?:namaste|hello|hi|hey|नमस्ते|வணக்கம்|నమస్కారం)[\s,!\.]*',
        r'^(?:main|hum|me)\s+(?:(?:[a-zA-Z\u0900-\u097F0-9_\'\"]+\s+){0,3}(?:se|from)\s+)?(?:[a-zA-Z\u0900-\u097F0-9_\'\"]+\s+)?bol\s+(?:rahi|raha|rahe)\s+(?:hoon|hain)(?:\s+(?:(?:[a-zA-Z\u0900-\u097F0-9_\'\"]+\s+){0,3}(?:se|from)))?[.!,]?',
        r'^(?:main|hum)\s+[a-zA-Z\u0900-\u097F0-9_\'\"]+\s+bol\s+(?:rahi|raha|rahe)\s+(?:hoon|hain)[.!,]?',
        r'^(?:mera|hamara)\s+naam\s+[a-zA-Z\u0900-\u097F0-9_\'\"]+\s+hai[.!,]?',
        r'^मैं\s+(?:(?:[\u0900-\u097F0-9\s]+से\s+)?[\u0900-\u097F0-9\s]+)?बोल\s+(?:रही|रहा|रहे)\s+(?:हूँ|हैं)[.!,]?',
        r'^मेरा\s+नाम\s+[\u0900-\u097F0-9\s]+है[.!,]?',
        # English self-intros
        r'^(?:this\s+is|my\s+name\s+is|i\s+am|i\'m)\s+[a-zA-Z\s]+(?:\s+(?:from|calling\s+from|with)\s+[a-zA-Z0-9\s]+)?[.!,]?',
        r'^(?:calling\s+from|from)\s+[a-zA-Z0-9\s]+[.!,]?',
        # Pre-existing redundant declarations
        r'^(?:(?:ek|an?)\s+ai\s+assistant|virtual\s+assistant)[.!,]?',
        r'^(?:(?:yeh\s+)?call\s+(?:quality|service\s+quality)?\s*(?:ke\s+liye)?\s*record\s+(?:ki\s+ja\s+sakti\s+hai|hogi|ki\s+jayegi))[.!,]?',
        r'^(?:this\s+call\s+(?:may\s+be|is)\s+recorded(?:\s+for\s+(?:quality|service\s+quality))?)[.!,]?',
    ]

    changed = True
    while changed:
        changed = False
        cleaned = cleaned.lstrip(' ,.!-:;\"\'।|?').rstrip(' \"\'')
        for pat in intro_patterns:
            m = re.match(pat, cleaned, flags=re.IGNORECASE)
            if m:
                cleaned = cleaned[m.end():].lstrip(' ,.!-:;\"\'।|?').rstrip(' \"\'')
                changed = True
                break

    if agent_name:
        cleaned = re.sub(rf'^(?:this\s+is\s+)?{re.escape(agent_name)}[,!\.\s]*', '', cleaned, flags=re.IGNORECASE).strip()
    if cleaned:
        cleaned = cleaned[0].upper() + cleaned[1:]
    return cleaned


def compose_single_opening_greeting(
    dashboard_greeting: Optional[str],
    agent_name: str,
    business_name: str,
    caller_name: Optional[str] = None,
    direction: str = "inbound",
    language: str = "hinglish",
    gender_tag: str = "female",
    purpose: Optional[str] = None,
    consent_mode: str = "notice_only",
    variant: Optional[str] = None,
    recording_exempt: bool = False,
    template_mode: bool = False
) -> Tuple[str, str, str]:
    """
    Single source of truth for the call opening greeting.
    Composes ONE final opening string spoken ONCE as ONE utterance.

    Composition Rules (in order):
    1. Greeting word, with the caller's name if known (honorific-adapted).
    2. Mandatory disclosure: AI identity ("AI assistant"), business name, and
       the recording notice. For outbound calls, also the purpose.
    3. The dashboard greeting's remaining content (pitch, offer, question), with any
       duplicate self-introduction removed.
    4. If the dashboard greeting is empty, uses the default template.

    Args:
        dashboard_greeting: Raw greeting configured by owner in dashboard.
        agent_name: Name of agent (e.g. Arika, Vikram).
        business_name: Name of business.
        caller_name: Name of known caller or None.
        direction: 'inbound' or 'outbound'.
        language: Language code ('hinglish', 'en', 'hi', etc.).
        gender_tag: 'female' or 'male'.
        purpose: Outbound call purpose / campaign goal.
        consent_mode: 'notice_only', 'spoken_or_keypress', etc.
        variant: A/B disclosure variant name.
        recording_exempt: If true, recording notice is omitted (logged owner attestation).
        template_mode: If true, embeds '{caller_name_slot}' so final string can be cached.

    Returns:
        (final_opening_utterance, selected_variant, normalized_language)
    """
    norm_lang = normalize_language_code(language)
    sel_variant = variant if variant in DISCLOSURE_VARIANTS else "standard"
    agent_display = (agent_name or "Arika").strip()
    biz_display = (business_name or "Trinetra AI").strip()
    is_outbound = str(direction).lower() == "outbound"
    verb = "rahi" if gender_tag == "female" else "raha"
    verb_hi = "रही" if gender_tag == "female" else "रहा"
    modal = "sakti" if gender_tag == "female" else "sakta"
    modal_hi = "सकती" if gender_tag == "female" else "सकता"

    # 1. Caller Name & Greeting Word
    is_name_valid = bool(
        caller_name and str(caller_name).strip() and
        str(caller_name).strip().lower() not in ("none", "null", "unknown", "unknown caller", "inbound caller", "client")
    )

    addressed_name = ""
    if template_mode:
        slot = "{caller_name_slot}"
    elif is_name_valid:
        first_name = caller_name.strip().split()[0].capitalize()
        if norm_lang == "hi":
            addressed_name = f"{first_name} जी"
        elif norm_lang in ("hinglish", "mr"):
            addressed_name = f"{first_name} ji"
        elif norm_lang == "te":
            addressed_name = f"{first_name} gaaru"
        elif norm_lang == "ta":
            addressed_name = f"{first_name} avargal"
        else:
            addressed_name = first_name
        slot = f" {addressed_name}"
    else:
        slot = ""

    if norm_lang == "en":
        greeting_word = f"Hello{slot}!"
    elif norm_lang == "hi":
        greeting_word = f"नमस्ते{slot}!"
    elif norm_lang == "mr":
        greeting_word = f"नमस्कार{slot}!"
    elif norm_lang == "ta":
        greeting_word = f"வணக்கம்{slot}!"
    elif norm_lang == "te":
        greeting_word = f"నమస్కారం{slot}!"
    elif norm_lang == "es":
        greeting_word = f"¡Hola{slot}!"
    else:  # Hinglish
        greeting_word = f"Namaste{slot}!"

    # 2. Mandatory Disclosure Statement (AI identity + business name + recording notice + purpose)
    disc_parts = []
    if norm_lang == "en":
        disc_parts.append(f"This is {agent_display} from {biz_display}, an AI assistant.")
        if is_outbound and purpose:
            disc_parts.append(f"I am calling regarding {purpose}.")
        if not recording_exempt:
            disc_parts.append("This call may be recorded for service quality.")
    elif norm_lang == "hi":
        disc_parts.append(f"मैं {biz_display} से {agent_display} बोल {verb_hi} हूँ, एक AI assistant।")
        if is_outbound and purpose:
            disc_parts.append(f"मैं {purpose} के सिलसिले में कॉल कर {verb_hi} हूँ।")
        if not recording_exempt:
            disc_parts.append("सर्विस क्वालिटी के लिए यह कॉल रिकॉर्ड की जा सकती है।")
    elif norm_lang == "ta":
        disc_parts.append(f"நான் {biz_display} நிறுவனத்திலிருந்து {agent_display}, ஓர் AI assistant.")
        if not recording_exempt:
            disc_parts.append("சேவைத் தரத்திற்காக இந்த அழைப்பு பதிவு செய்யப்படலாம்.")
    elif norm_lang == "te":
        disc_parts.append(f"నేను {biz_display} నుండి {agent_display}, ఒక AI assistant.")
        if not recording_exempt:
            disc_parts.append("నాణ్యత పరిశీలన కోసం ఈ కాల్ రికార్డ్ చేయబడవచ్చు.")
    elif norm_lang == "mr":
        disc_parts.append(f"मी {biz_display} कडून {agent_display} बोलत आहे, एक AI assistant.")
        if not recording_exempt:
            disc_parts.append("सेवेच्या गुणवत्तेसाठी हा कॉल रेकॉर्ड केला जाऊ शकतो.")
    elif norm_lang == "es":
        disc_parts.append(f"Soy {agent_display}, un asistente de IA de {biz_display}.")
        if not recording_exempt:
            disc_parts.append("Esta llamada puede ser grabada para control de calidad.")
    else:  # Hinglish default
        disc_parts.append(f"Main {biz_display} se {agent_display} bol {verb} hoon, ek AI assistant.")
        if is_outbound and purpose:
            disc_parts.append(f"Main {purpose} ke regarding call kar {verb} hoon.")
        if not recording_exempt:
            disc_parts.append("Service quality ke liye yeh call record ki ja sakti hai.")

    # Append affirmative consent suffix if required by jurisdiction
    if consent_mode in CONSENT_MODE_SUFFIXES:
        suffix = CONSENT_MODE_SUFFIXES[consent_mode].get(norm_lang, CONSENT_MODE_SUFFIXES[consent_mode]["en"])
        disc_parts.append(suffix)

    mandatory_disclosure = " ".join(disc_parts)

    # 3. Strip self-intro from dashboard greeting and extract remaining pitch/question
    remainder = strip_dashboard_self_introduction(dashboard_greeting or "", agent_display, biz_display)

    # 4. If remainder is empty, use default question
    if not remainder:
        if is_outbound:
            if norm_lang == "en":
                remainder = "Do you have a couple of minutes to talk?"
            elif norm_lang == "hi":
                remainder = "क्या आपके पास बात करने के लिए दो मिनट का समय है?"
            else:
                remainder = "Kya aapke paas do minute hain baat karne ke liye?"
        else:
            if norm_lang == "en":
                remainder = "How may I help you today?"
            elif norm_lang == "hi":
                remainder = f"मैं आपकी क्या सहायता कर {modal_hi} हूँ?"
            else:
                remainder = f"Main aapki kya madad kar {modal} hoon?"

    # Assemble final single opening utterance
    final_opening = f"{greeting_word} {mandatory_disclosure} {remainder}"
    final_opening = re.sub(r'\s+', ' ', final_opening).strip()
    return final_opening, sel_variant, norm_lang


def render_cached_opening_greeting(cached_template: str, caller_name: Optional[str], language: str = "hinglish") -> str:
    """
    Renders a pre-cached greeting template in O(1) time at call start by substituting
    the caller's name into {caller_name_slot}, ensuring zero latency overhead in the hot path.
    """
    if not cached_template:
        return ""
    if "{caller_name_slot}" not in cached_template:
        return cached_template

    is_name_valid = bool(
        caller_name and str(caller_name).strip() and
        str(caller_name).strip().lower() not in ("none", "null", "unknown", "unknown caller", "inbound caller", "client")
    )
    if not is_name_valid:
        return cached_template.replace("{caller_name_slot}", "").replace("  ", " ").strip()

    first_name = caller_name.strip().split()[0].capitalize()
    norm_lang = normalize_language_code(language)
    if norm_lang == "hi":
        slot_val = f" {first_name} जी"
    elif norm_lang in ("hinglish", "mr"):
        slot_val = f" {first_name} ji"
    elif norm_lang == "te":
        slot_val = f" {first_name} gaaru"
    elif norm_lang == "ta":
        slot_val = f" {first_name} avargal"
    else:
        slot_val = f" {first_name}"

    return cached_template.replace("{caller_name_slot}", slot_val).replace("  ", " ").strip()


def build_compliant_greeting(
    raw_greeting: Optional[str],
    clean_name: str,
    business_name: str,
    direction: str = "outbound",
    language: str = "hinglish",
    gender_tag: str = "female",
    purpose: Optional[str] = None,
    consent_mode: str = "notice_only",
    variant: Optional[str] = None,
    recording_exempt: bool = False
) -> Tuple[str, str, str]:
    """
    Single source of truth bridge function for existing callers and tests.
    Delegates directly to compose_single_opening_greeting.
    """
    return compose_single_opening_greeting(
        dashboard_greeting=raw_greeting,
        agent_name=clean_name,
        business_name=business_name,
        caller_name=None,
        direction=direction,
        language=language,
        gender_tag=gender_tag,
        purpose=purpose,
        consent_mode=consent_mode,
        variant=variant,
        recording_exempt=recording_exempt
    )


async def lookup_caller_name_fast(
    supabase_client,
    organization_id: str,
    phone_number: str,
    timeout_sec: float = 0.30
) -> Optional[str]:
    """
    Fast, non-blocking caller lookup scoped strictly to organization_id (multi-tenant boundary).
    Times out in 300ms to guarantee zero delay to the opening greeting.
    """
    if not supabase_client or not organization_id or not phone_number:
        return None

    cleaned = re.sub(r'\D', '', str(phone_number))
    if len(cleaned) > 10:
        if cleaned.startswith('91') and len(cleaned) == 12:
            cleaned = cleaned[2:]
        elif cleaned.startswith('0') and len(cleaned) == 11:
            cleaned = cleaned[1:]

    if not cleaned or len(cleaned) < 8:
        return None

    async def _do_lookup():
        # 1. Check customer_contacts for this specific organization
        try:
            res_cust = await asyncio.to_thread(
                supabase_client.table("customer_contacts")
                .select("full_name")
                .eq("organization_id", organization_id)
                .eq("phone_number", cleaned)
                .limit(1)
                .execute
            )
            if res_cust.data and len(res_cust.data) > 0 and res_cust.data[0].get("full_name"):
                c_name = str(res_cust.data[0]["full_name"]).strip()
                if c_name.lower() not in ("none", "null", "unknown", "unknown caller", "inbound caller", "client"):
                    return c_name
        except Exception:
            pass

        # 2. Check leads for this specific organization
        try:
            res_lead = await asyncio.to_thread(
                supabase_client.table("leads")
                .select("name")
                .or_(f"organization_id.eq.{organization_id},business_id.eq.{organization_id}")
                .ilike("phone", f"%{cleaned}%")
                .limit(1)
                .execute
            )
            if res_lead.data and len(res_lead.data) > 0 and res_lead.data[0].get("name"):
                l_name = str(res_lead.data[0]["name"]).strip()
                if l_name.lower() not in ("none", "null", "unknown", "unknown caller", "inbound caller", "client"):
                    return l_name
        except Exception:
            pass

        return None

    try:
        return await asyncio.wait_for(_do_lookup(), timeout=timeout_sec)
    except (asyncio.TimeoutError, Exception) as e:
        logger.debug(f"[lookup_caller_name_fast] Lookup finished/timed out ({e}); proceeding with nameless greeting")
        return None



async def persist_call_disclosure(
    supabase_client,
    room_name: str,
    disclosure_text: str,
    variant: str,
    language: str,
    consent_mode: str = "notice_only",
    consent_outcome: str = "consented"
):
    """
    Persists disclosure telemetry to voice_calls table in Supabase.
    Called asynchronously so it never blocks audio initialization.
    """
    if not supabase_client or not room_name:
        return

    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        update_data = {
            "disclosure_played": True,
            "disclosure_text": disclosure_text,
            "disclosure_variant": variant,
            "disclosure_language": language,
            "disclosure_timestamp": now_iso,
            "consent_mode": consent_mode,
            "consent_outcome": consent_outcome
        }

        # Update voice_calls matching room_name in metadata or call_id
        await asyncio_to_thread(
            supabase_client.table("voice_calls")
            .update(update_data)
            .eq("metadata->>room_name", room_name)
            .execute
        )
        logger.info(f"[Disclosure] Successfully logged disclosure telemetry for room '{room_name}' (variant={variant}, lang={language}, mode={consent_mode})")
    except Exception as e:
        logger.warning(f"[Disclosure] Failed to persist disclosure telemetry for room '{room_name}': {e}")


async def handle_caller_recording_decline(
    supabase_client,
    room_name: str,
    livekit_room: Any = None,
    allow_unrecorded_continuation: bool = True
) -> Dict[str, Any]:
    """
    Executes caller's decline path when they refuse recording:
    - Sets consent_outcome = 'declined' and recording_stopped_at = now()
    - Halts active recording/egress if supported
    - Returns instructions for agent response
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        if supabase_client and room_name:
            await asyncio_to_thread(
                supabase_client.table("voice_calls")
                .update({
                    "consent_outcome": "declined",
                    "recording_stopped_at": now_iso
                })
                .eq("metadata->>room_name", room_name)
                .execute
            )
            logger.info(f"[Disclosure] Caller declined recording for room '{room_name}'. Logged decline event.")
    except Exception as e:
        logger.warning(f"[Disclosure] Failed to log decline event: {e}")

    if allow_unrecorded_continuation:
        return {
            "action": "continue_unrecorded",
            "spoken_response": "I have stopped recording as requested. How can I help you?",
            "spoken_response_hi": "आपकी रिक्वेस्ट पर रिकॉर्डिंग रोक दी गई है। बताइए मैं आपकी क्या मदद करूँ?"
        }
    else:
        return {
            "action": "end_call",
            "spoken_response": "Understood. As our policy requires call recording for this service, I will disconnect now. Thank you for your time.",
            "spoken_response_hi": "समझ गया। हमारी पॉलिसी के तहत इस सर्विस के लिए कॉल रिकॉर्डिंग अनिवार्य है, इसलिए मैं अभी कॉल समाप्त कर रहा हूँ। आपके समय के लिए धन्यवाद।"
        }


async def asyncio_to_thread(fn, *args, **kwargs):
    import asyncio
    return await asyncio.to_thread(fn, *args, **kwargs)


def handle_greeting_barge_in(
    disclosure_text: str,
    caller_interruption_text: Optional[str] = None,
    is_interrupted: bool = False
) -> Dict[str, Any]:
    """
    Handles edge cases where a caller speaks over the initial disclosure greeting.
    
    Requirements:
    1. Disclosure must always play before any sales pitch.
    2. If caller speaks over the greeting (barge-in):
       - Caller's utterance is captured and preserved for immediate response.
       - Disclosure is logged as initiated/delivered.
       - System handles the speech gracefully without repeating the full disclosure greeting.
    """
    cleaned_utterance = (caller_interruption_text or "").strip()
    has_barge_in = is_interrupted or bool(cleaned_utterance)

    return {
        "disclosure_text": disclosure_text,
        "disclosure_delivered": True,
        "caller_barge_in": has_barge_in,
        "caller_utterance": cleaned_utterance,
        "next_action": "respond_to_caller_utterance" if cleaned_utterance else "await_user_response"
    }
