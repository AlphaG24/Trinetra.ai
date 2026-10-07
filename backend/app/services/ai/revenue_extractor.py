"""
Revenue Extraction Engine for Trinetra AI.

Extracts structured quotes and financial deal metrics from call transcripts and summaries.
Validates outputs strictly against Pydantic schemas, handles Hindi/Hinglish number words,
detects price ranges and recurring contracts, and enforces strict null-safety (never guess).
"""

import os
import re
import json
import logging
import asyncio
from typing import Optional, Literal, Tuple
from pydantic import BaseModel, Field, field_validator
import httpx

logger = logging.getLogger("RevenueExtractor")

# =====================================================================
# 1. STRICT PYDANTIC VALIDATION SCHEMA
# =====================================================================

PriceType = Literal["one_time", "monthly", "range"]
LeadStatus = Literal["hot", "warm", "cold"]
SourceType = Literal["inbound", "campaign", "callback", "reactivation", "referral"]

class RevenueExtractionResult(BaseModel):
    quoted_amount: Optional[float] = Field(None, description="Primary numeric quote in given currency. Null if no price was explicitly discussed.")
    currency: str = Field("INR", description="3-letter currency code, e.g. INR, USD.")
    service: Optional[str] = Field(None, description="The specific product, plan, or service quoted.")
    price_type: Optional[PriceType] = Field(None, description="one_time, monthly, or range.")
    amount_min: Optional[float] = Field(None, description="Lower bound for range quotes.")
    amount_max: Optional[float] = Field(None, description="Upper bound for range quotes.")
    lead_status: Optional[LeadStatus] = Field(None, description="hot, warm, or cold commercial readiness.")
    callback_time: Optional[str] = Field(None, description="ISO datetime string or human time if callback promised.")
    source: SourceType = Field("inbound", description="Call source.")
    confidence: float = Field(0.0, ge=0.0, le=1.0, description="Confidence score from 0.0 to 1.0.")
    extracted_quote_text: Optional[str] = Field(None, description="Verbatim raw sentence/quote from text containing price discussion.")

    @field_validator("quoted_amount", "amount_min", "amount_max", mode="before")
    @classmethod
    def sanitize_floats(cls, v):
        if v is None or v == "" or v == "null":
            return None
        try:
            return float(v)
        except (ValueError, TypeError):
            return None


# =====================================================================
# 2. HINDI / HINGLISH & NUMBER NORMALIZATION UTILITIES
# =====================================================================

HINDI_NUMBER_WORDS = {
    # 1 - 10
    "ek": 1, "aik": 1, "one": 1,
    "do": 2, "two": 2,
    "teen": 3, "tin": 3, "three": 3,
    "chaar": 4, "char": 4, "four": 4,
    "paanch": 5, "panch": 5, "five": 5,
    "chhe": 6, "che": 6, "six": 6,
    "saat": 7, "sat": 7, "seven": 7,
    "aath": 8, "ath": 8, "eight": 8,
    "nau": 9, "no": 9, "nine": 9,
    "das": 10, "dus": 10, "ten": 10,
    # 11 - 20
    "gyarah": 11, "barah": 12, "terah": 13, "chaudah": 14,
    "pandrah": 15, "pandra": 15, "fifteen": 15,
    "solah": 16, "satrah": 17, "atharah": 18, "unnis": 19,
    "bees": 20, "bis": 20, "twenty": 20,
    # Tens & Multipliers
    "tees": 30, "tis": 30, "thirty": 30,
    "chaalis": 40, "chalis": 40, "forty": 40,
    "pachas": 50, "fifty": 50,
    "saath": 60, "sixty": 60,
    "sattar": 70, "seventy": 70,
    "assi": 80, "eighty": 80,
    "nabbe": 90, "ninety": 90,
    "sau": 100, "so": 100, "hundred": 100,
    "dedh": 1.5, "dhai": 2.5
}

MULTIPLIERS = {
    "hazaar": 1000,
    "hazar": 1000,
    "thousand": 1000,
    "k": 1000,
    "lakh": 100000,
    "lac": 100000,
    "lakhs": 100000,
    "crore": 10000000,
    "cr": 10000000
}


def parse_hindi_amount_phrase(phrase: str) -> Optional[float]:
    """
    Parses phrases like:
    - 'paanch hazaar' -> 5000
    - 'pandrah hazaar' -> 15000
    - 'dedh lakh' -> 150000
    - '2.5 lakh' -> 250000
    - '10k' -> 10000
    - '5000' -> 5000
    """
    clean = phrase.lower().replace(",", "").replace("/-", "").strip()
    clean = re.sub(r'^(rs\.?|inr|₹)\s*', '', clean).strip()

    # Direct float match
    try:
        return float(clean)
    except ValueError:
        pass

    # Check '10k', '2.5lakh'
    k_match = re.match(r'^([\d\.]+)\s*(k|hazar|hazaar|thousand|lakh|lac|lakhs|crore|cr)$', clean)
    if k_match:
        val = float(k_match.group(1))
        unit = k_match.group(2)
        mult = MULTIPLIERS.get(unit, 1)
        return val * mult

    words = clean.split()
    if not words:
        return None

    # E.g. 'paanch hazaar' or 'ek lakh' or 'dedh lakh'
    if len(words) == 2:
        w1, w2 = words[0], words[1]
        mult = MULTIPLIERS.get(w2)
        if mult:
            if w1.isdigit():
                return float(w1) * mult
            elif w1 in HINDI_NUMBER_WORDS:
                return float(HINDI_NUMBER_WORDS[w1]) * mult

    # E.g. 'pachas hazaar' -> 50000
    if len(words) == 1 and words[0] in HINDI_NUMBER_WORDS:
        return float(HINDI_NUMBER_WORDS[words[0]])

    return None


def extract_amounts_heuristic(text: str) -> Tuple[Optional[float], Optional[PriceType], Optional[float], Optional[float], Optional[str]]:
    """
    Fallback deterministic parser for price ranges and amounts in text.
    Handles English, Hindi, Hinglish, ranges, and monthly rates.
    """
    if not text:
        return None, None, None, None, None

    lower = text.lower()

    # Detect price frequency
    is_monthly = bool(re.search(r'\b(per\s+month|har\s+mahine|mahina|har\s+maheene|monthly|p/m|pm)\b', lower))

    # 1. Range patterns:
    # "5 to 7 thousand", "5 se 7 hazaar", "5000 - 8000", "5k to 10k", "50k to 1 lakh"
    UNIT_REGEX = r'(?:(?<=\d)k\b|\b(?:k|hazar|hazaar|thousand|lakh|lac|lakhs|crore|cr)\b)'
    NUM_REGEX = r'(?:[\d,]+(?:\.\d+)?|ek|do|teen|tin|chaar|char|paanch|panch|chhe|che|saat|sat|aath|ath|nau|no|das|dus|gyarah|barah|terah|chaudah|pandrah|solah|satrah|atharah|unnis|bees|tees|chaalis|chalis|pachas|saath|sattar|assi|nabbe|sau|dedh|dhai)'
    CURR_REGEX = r'(?:rs\.?|inr|₹)'

    range_regex = re.compile(
        rf'(?:{CURR_REGEX}\s*)?({NUM_REGEX})\s*({UNIT_REGEX})?\s*(?:-|to|se|tak)\s*(?:{CURR_REGEX}\s*)?({NUM_REGEX})\s*({UNIT_REGEX})?',
        re.IGNORECASE
    )

    for match in range_regex.finditer(lower):
        part1 = match.group(1).replace(",", "")
        unit1 = match.group(2)
        part2 = match.group(3).replace(",", "")
        unit2 = match.group(4)

        # Skip obvious non-price ranges
        if any(skip in match.group(0) for skip in ["day", "din", "baje", "pm", "am", "hour", "ghante", "week", "month", "sal", "year"]):
            continue

        p1_str = f"{part1} {unit1}" if unit1 else (f"{part1} {unit2}" if unit2 and not part1.isdigit() else part1)
        p2_str = f"{part2} {unit2}" if unit2 else part2

        a1 = parse_hindi_amount_phrase(p1_str)
        a2 = parse_hindi_amount_phrase(p2_str)

        # Handle "5 to 7 thousand" where part1 is 5 and unit2 is thousand
        if a1 and a2 and a1 < 100 and a2 >= 1000 and not unit1 and unit2:
            mult = parse_hindi_amount_phrase(f"1 {unit2}")
            if mult and mult >= 1000:
                a1 = a1 * mult

        if a1 and a2 and a1 >= 100 and a2 >= 100:
            if a1 > a2:
                a1, a2 = a2, a1
            avg_amount = round((a1 + a2) / 2.0, 2)
            return avg_amount, "range", a1, a2, match.group(0).strip()

    # 2. Single price patterns:
    # "Rs 15000", "₹ 25,000", "paanch hazaar", "10k", "50 hazar", "2.5 lakh"
    single_regex = re.compile(
        rf'({CURR_REGEX}\s*)?({NUM_REGEX})\s*({UNIT_REGEX}|\/-)?',
        re.IGNORECASE
    )

    found_amounts = []
    for match in single_regex.finditer(lower):
        curr_prefix = match.group(1)
        num_part = match.group(2).replace(",", "")
        mult_suffix = match.group(3)
        phrase = match.group(0).strip()

        # Filter out non-financial digits (e.g. phone numbers)
        digits_only = re.sub(r'\D', '', num_part)
        if len(digits_only) >= 10:
            continue
        if any(w in phrase for w in ["min", "sec", "baje", "date", "tarikh", "call"]):
            continue

        amt = parse_hindi_amount_phrase(phrase)
        if amt and amt >= 100:
            has_marker = bool(curr_prefix or (mult_suffix and mult_suffix != "/-") or any(hw in phrase for hw in ["hazaar", "lakh", "crore"]))
            # Filter out plain bare numbers under 1000 that lack a currency or multiplier prefix (e.g. 500 minutes)
            if not has_marker and amt < 1000:
                continue
            found_amounts.append((amt, phrase, has_marker))

    if found_amounts:
        # Prioritize amounts with explicit currency prefix or multiplier
        marked = [fa for fa in found_amounts if fa[2]]
        best_amt, best_quote, _ = marked[-1] if marked else found_amounts[-1]
        price_type = "monthly" if is_monthly else "one_time"
        return best_amt, price_type, None, None, best_quote

    return None, None, None, None, None


# =====================================================================
# 3. CORE EXTRACTION SERVICE (LLM + SCHEMA VALIDATION)
# =====================================================================

class RevenueExtractor:
    """
    Extracts structured quote and revenue events from transcripts and summaries
    using Groq / Gemini with strict Pydantic JSON validation.
    """

    EXTRACTION_PROMPT = """You are a senior enterprise financial analyst extracting sales deal metrics from a business call transcript or summary.
Extract ONLY commercial pricing or quotes that were explicitly discussed.

RULES:
1. NEVER guess or hallucinate numbers. If no price was explicitly discussed, set quoted_amount to null, amount_min to null, amount_max to null, and price_type to null.
2. If a price range was discussed (e.g. "5 to 7 thousand", "5 se 8 hazaar"), set:
   - price_type: "range"
   - amount_min: 5000
   - amount_max: 7000
   - quoted_amount: 6000 (midpoint)
3. If a recurring monthly price was discussed (e.g. "10,000 per month", "15 hazaar mahina"), set:
   - price_type: "monthly"
   - quoted_amount: numeric monthly value
4. If a one-time price was discussed, set:
   - price_type: "one_time"
   - quoted_amount: numeric value
5. Handle Hindi and Hinglish numbers:
   - "paanch hazaar" / "5 hazar" -> 5000
   - "dus hazaar" / "10k" -> 10000
   - "pandrah hazaar" -> 15000
   - "pachas hazaar" -> 50000
   - "ek lakh" -> 100000
   - "dedh lakh" -> 150000
6. Currency defaults to "INR" unless USD or other currency was specifically stated.
7. extracted_quote_text: Copy the verbatim snippet from the text where price was discussed. Null if none.
8. lead_status: "hot" (ready to pay/book), "warm" (interested, evaluating), "cold" (hesitant/not interested).
9. confidence: Float between 0.0 and 1.0 representing how confident you are in the quote. If unsure, return confidence < 0.4 and null amount.

Input Text:
\"\"\"
{text}
\"\"\"

Return ONLY valid JSON matching this schema:
{{
  "quoted_amount": number or null,
  "currency": "INR",
  "service": string or null,
  "price_type": "one_time" | "monthly" | "range" | null,
  "amount_min": number or null,
  "amount_max": number or null,
  "lead_status": "hot" | "warm" | "cold" | null,
  "callback_time": string or null,
  "source": "{source}",
  "confidence": number between 0.0 and 1.0,
  "extracted_quote_text": string or null
}}"""

    @classmethod
    async def extract_from_text(
        cls,
        text: str,
        source: SourceType = "inbound",
        groq_api_key: Optional[str] = None,
        gemini_api_key: Optional[str] = None,
        use_llm: bool = True
    ) -> RevenueExtractionResult:
        """
        Runs LLM extraction with fallback to deterministic parser.
        Never throws unhandled exceptions; returns safe fallback on failure.
        """
        if not text or not text.strip():
            return RevenueExtractionResult(source=source, confidence=0.0)

        groq_key = groq_api_key or os.getenv("GROQ_API_KEY")
        gemini_key = gemini_api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        prompt = cls.EXTRACTION_PROMPT.format(text=text[:3500], source=source)

        raw_json_dict = None

        if use_llm:
            # 1. Attempt Groq LLM extraction (fast JSON mode)
            if groq_key:
                try:
                    async with httpx.AsyncClient(timeout=8.0) as client:
                        resp = await client.post(
                            "https://api.groq.com/openai/v1/chat/completions",
                            headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                            json={
                                "model": os.getenv("GROQ_LLM_MODEL", "openai/gpt-oss-120b"),
                                "messages": [{"role": "user", "content": prompt}],
                                "temperature": 0.0,
                                "max_completion_tokens": 500,
                                "response_format": {"type": "json_object"}
                            }
                        )
                        if resp.status_code == 200:
                            content = resp.json()["choices"][0]["message"]["content"]
                            raw_json_dict = json.loads(content)
                            logger.info(f"[RevenueExtractor] Groq extracted: amount={raw_json_dict.get('quoted_amount')}, type={raw_json_dict.get('price_type')}")
                except Exception as e:
                    logger.warning(f"[RevenueExtractor] Groq extraction error: {e}")

            # 2. Attempt Gemini LLM fallback
            if not raw_json_dict and gemini_key:
                try:
                    from google import genai
                    from google.genai.types import GenerateContentConfig
                    g_client = genai.Client(api_key=gemini_key)
                    g_res = await asyncio.wait_for(
                        asyncio.to_thread(
                            g_client.models.generate_content,
                            model="gemini-2.5-flash",
                            contents=prompt,
                            config=GenerateContentConfig(response_mime_type="application/json")
                        ),
                        timeout=10.0
                    )
                    if g_res and g_res.text:
                        raw_json_dict = json.loads(g_res.text)
                        logger.info(f"[RevenueExtractor] Gemini fallback extracted: amount={raw_json_dict.get('quoted_amount')}")
                except Exception as e:
                    logger.warning(f"[RevenueExtractor] Gemini fallback error: {e}")

        # 3. Validate with Pydantic if LLM returned structured JSON
        if raw_json_dict and isinstance(raw_json_dict, dict):
            try:
                # Enforce source default
                if not raw_json_dict.get("source"):
                    raw_json_dict["source"] = source
                parsed = RevenueExtractionResult(**raw_json_dict)
                return parsed
            except Exception as p_err:
                logger.warning(f"[RevenueExtractor] Pydantic validation error on LLM output: {p_err}. Falling back to deterministic parser.")

        # 4. Fallback Deterministic Heuristic Extraction
        amt, p_type, a_min, a_max, quote_text = extract_amounts_heuristic(text)
        confidence = 0.85 if amt is not None else 0.0

        return RevenueExtractionResult(
            quoted_amount=amt,
            currency="INR",
            price_type=p_type,
            amount_min=a_min,
            amount_max=a_max,
            source=source,
            confidence=confidence,
            extracted_quote_text=quote_text
        )
