"""
backend/app/services/pii_scrubber.py

Centralized PII Sanitizer & External Log Scrubber.
Complies with:
- India DPDP Act 2023 Sec 8 (Data Fiduciary security safeguards & log hygiene)
- CERT-In Directions 2022 Sec 4(6) (Safe log management without credential leakage)
- EU GDPR Art 32 (Security of processing and pseudonymization)
- California CCPA/CPRA (Non-exposure of sensitive identifiers in telemetry)

Features:
1. Real-time masking of phone numbers (+91, international, 10-digit Indian).
2. Masking of national identifiers (Indian 12-digit Aadhaar, US 9-digit SSN).
3. Redaction of API keys, Bearer tokens, JWTs, and Supabase credentials.
4. Deep dictionary and nested payload sanitizer.
5. Standard library `logging.Filter` (`PIIFilter`) to scrub logger emissions.
6. Sentry `before_send` event scrubber for exception telemetry.
7. BetterStack / Logtail payload scrubber for log streaming.
"""

import re
import copy
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger("pii-scrubber")

# ---------------------------------------------------------------------------
# Regex Patterns for Sensitive Data Detection
# ---------------------------------------------------------------------------

# 1. Phone numbers:
# Indian 10-digit mobile, +91-prefixed, 91-prefixed, and formatted variants
PHONE_PATTERN = re.compile(
    r"\+91[\s\-]?[6-9]\d{9}|"
    r"(?<!\d)91[6-9]\d{9}(?!\d)|"
    r"(?<![\d\+])[6-9]\d{9}(?!\d)|"
    r"(?<!\d)[6-9]\d{4}[\s\-]\d{5}(?!\d)|"
    r"(?<!\d)[6-9]\d{2}[\s\-]\d{3}[\s\-]\d{4}(?!\d)"
)

# 2. Indian Aadhaar Number (12 digits, formatted 4-4-4 or 12 continuous digits, never with + prefix)
AADHAAR_PATTERN = re.compile(
    r"(?<![\d\+])[2-9]\d{3}[\s\-]\d{4}[\s\-]\d{4}(?!\d)|"
    r"(?<![\d\+])[2-8]\d{11}(?!\d)"
)

# 3. US Social Security Number (SSN: 3-2-4)
SSN_PATTERN = re.compile(
    r"(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)"
)

# 4. JWT Tokens (header.payload.signature)
JWT_PATTERN = re.compile(
    r"\beyJ[a-zA-Z0-9_\-]{10,}\.eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}\b"
)

# 5. Bearer tokens
BEARER_PATTERN = re.compile(
    r"\bBearer\s+[a-zA-Z0-9_\-\.]{16,}\b",
    re.IGNORECASE
)

# 6. Common API key formats (sk-..., sbp_..., key-..., etc.)
API_KEY_PATTERN = re.compile(
    r"\b(?:sk|sbp|pk|ak|key)_[a-zA-Z0-9_\-]{16,}\b|"
    r"\bAIzaSy[a-zA-Z0-9_\-]{33}\b",
    re.IGNORECASE
)

# 7. Indian PAN (5 letters, 4 digits, 1 letter)
PAN_PATTERN = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b")

# 8. Email addresses
EMAIL_PATTERN = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")

# Sensitive dictionary keys to redact automatically
SENSITIVE_KEY_NAMES = {
    "password", "secret", "token", "access_token", "refresh_token",
    "authorization", "api_key", "apikey", "private_key", "service_role_key",
    "supabase_service_role_key", "anon_key", "client_secret", "cookie",
    "set-cookie", "credit_card", "cvv", "card_number", "aadhaar", "ssn",
    "pan", "pan_number"
}


def mask_phone_match(match: re.Match) -> str:
    """
    Mask a detected phone number, showing only country prefix (if present)
    plus first 2 and last 2 digits, replacing the middle with asterisks.
    Example: '+919876543210' -> '+9198******10', '9876543210' -> '98******10'.
    """
    val = match.group(0)
    # Extract only digits to inspect
    digits_only = re.sub(r"\D", "", val)
    if len(digits_only) < 10:
        return "[REDACTED_PHONE]"
    
    # Check if there is an explicit +91 or + prefix
    prefix = ""
    if val.startswith("+91"):
        prefix = "+91 "
        d10 = digits_only[-10:]
    elif val.startswith("91") and len(digits_only) == 12:
        prefix = "+91 "
        d10 = digits_only[-10:]
    elif val.startswith("+"):
        prefix = "+"
        d10 = digits_only[1:]
    else:
        d10 = digits_only[-10:]

    if len(d10) == 10:
        masked_d10 = f"{d10[:2]}******{d10[-2:]}"
        return f"{prefix}{masked_d10}"
    return "[REDACTED_PHONE]"


def mask_aadhaar_match(match: re.Match) -> str:
    """
    Mask 12-digit Indian Aadhaar number, preserving only the last 4 digits
    per UIDAI masking standards (XXXX-XXXX-1234).
    """
    val = match.group(0)
    digits = re.sub(r"\D", "", val)
    if len(digits) == 12:
        return f"XXXX-XXXX-{digits[-4:]}"
    return "[REDACTED_AADHAAR]"


def mask_ssn_match(match: re.Match) -> str:
    """
    Mask US SSN, preserving only last 4 digits (***-**-1234).
    """
    val = match.group(0)
    digits = re.sub(r"\D", "", val)
    if len(digits) == 9:
        return f"***-**-{digits[-4:]}"
    return "[REDACTED_SSN]"


def sanitize_text(text: str) -> str:
    """
    Sanitize a string, masking phone numbers, Aadhaar, SSN, API keys, JWTs, and bearer tokens.
    """
    if not text or not isinstance(text, str):
        return text

    sanitized = text

    # 1. Bearer tokens
    sanitized = BEARER_PATTERN.sub("Bearer [REDACTED_TOKEN]", sanitized)

    # 2. JWTs
    sanitized = JWT_PATTERN.sub("[REDACTED_JWT]", sanitized)

    # 3. Known API keys
    sanitized = API_KEY_PATTERN.sub("[REDACTED_API_KEY]", sanitized)

    # 4. Phone numbers (run before Aadhaar to capture +91 and 91 numbers)
    sanitized = PHONE_PATTERN.sub(mask_phone_match, sanitized)

    # 5. Aadhaar numbers (12-digit Indian national identity numbers)
    sanitized = AADHAAR_PATTERN.sub(mask_aadhaar_match, sanitized)

    # 6. SSN
    sanitized = SSN_PATTERN.sub(mask_ssn_match, sanitized)

    # 7. PAN
    sanitized = PAN_PATTERN.sub("[REDACTED_PAN]", sanitized)

    # 8. Email
    sanitized = EMAIL_PATTERN.sub("[REDACTED_EMAIL]", sanitized)

    return sanitized


def sanitize_data(data: Any, depth: int = 0, max_depth: int = 10) -> Any:
    """
    Recursively sanitize dictionaries, lists, tuples, or strings.
    Replaces sensitive dictionary keys with '[REDACTED]' and sanitizes text values.
    """
    if depth > max_depth:
        return "[MAX_DEPTH_EXCEEDED]"

    if isinstance(data, str):
        return sanitize_text(data)

    if isinstance(data, dict):
        scrubbed = {}
        for k, v in data.items():
            key_str = str(k).lower().strip()
            # If the key itself is in our sensitive set, redact value directly
            if key_str in SENSITIVE_KEY_NAMES or any(s in key_str for s in ("password", "secret", "token", "auth_key")):
                scrubbed[k] = "[REDACTED]"
            else:
                scrubbed[k] = sanitize_data(v, depth + 1, max_depth)
        return scrubbed

    if isinstance(data, (list, tuple)):
        scrubbed_list = [sanitize_data(item, depth + 1, max_depth) for item in data]
        return tuple(scrubbed_list) if isinstance(data, tuple) else scrubbed_list

    return data


# ---------------------------------------------------------------------------
# Python Logging Filter
# ---------------------------------------------------------------------------

class PIIFilter(logging.Filter):
    """
    A logging filter that scrubs PII and secrets from all LogRecord messages
    and arguments before they reach any handler (console, file, stream).
    """

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            # 1. Scrub string message
            if isinstance(record.msg, str):
                record.msg = sanitize_text(record.msg)

            # 2. Scrub record args
            if record.args:
                if isinstance(record.args, dict):
                    record.args = sanitize_data(record.args)
                elif isinstance(record.args, (list, tuple)):
                    record.args = tuple(sanitize_data(a) for a in record.args)
        except Exception:
            # Never crash application due to logger filtering issue
            pass
        return True


def attach_pii_filter(target_logger: Optional[logging.Logger] = None) -> None:
    """
    Attach PIIFilter to a specific logger or to the root logger and all handlers.
    """
    f = PIIFilter()
    target = target_logger or logging.getLogger()
    target.addFilter(f)
    for handler in target.handlers:
        handler.addFilter(f)


# ---------------------------------------------------------------------------
# Sentry Exception & Breadcrumb Scrubber Hook
# ---------------------------------------------------------------------------

def sentry_before_send(event: Dict[str, Any], hint: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    """
    Sentry `before_send` hook that deeply scrubs PII, phone numbers, and secrets
    from exception messages, stack frame variables, request bodies, and breadcrumbs.
    """
    if not event:
        return event

    try:
        # Deep copy to avoid mutating original objects if shared
        cleaned = copy.deepcopy(event)

        # 0. Cleanse top-level message and logentry
        if "message" in cleaned and isinstance(cleaned["message"], str):
            cleaned["message"] = sanitize_text(cleaned["message"])
        if "logentry" in cleaned and isinstance(cleaned["logentry"], dict):
            if "message" in cleaned["logentry"] and isinstance(cleaned["logentry"]["message"], str):
                cleaned["logentry"]["message"] = sanitize_text(cleaned["logentry"]["message"])

        # 1. Cleanse top-level request data
        if "request" in cleaned and isinstance(cleaned["request"], dict):
            req = cleaned["request"]
            # Headers
            if "headers" in req and isinstance(req["headers"], dict):
                for h in list(req["headers"].keys()):
                    if h.lower() in ("authorization", "cookie", "set-cookie", "x-api-key"):
                        req["headers"][h] = "[REDACTED]"
                    else:
                        req["headers"][h] = sanitize_text(str(req["headers"][h]))
            # Query string
            if "query_string" in req:
                req["query_string"] = sanitize_text(str(req["query_string"]))
            # Body / Data
            if "data" in req:
                req["data"] = sanitize_data(req["data"])

        # 2. Cleanse exception messages & values
        if "exception" in cleaned and isinstance(cleaned["exception"], dict):
            values = cleaned["exception"].get("values", [])
            for val in values:
                if "value" in val and isinstance(val["value"], str):
                    val["value"] = sanitize_text(val["value"])
                # Stack traces locals
                stack = val.get("stacktrace", {})
                for frame in stack.get("frames", []):
                    if "vars" in frame and isinstance(frame["vars"], dict):
                        frame["vars"] = sanitize_data(frame["vars"])

        # 3. Cleanse breadcrumbs
        if "breadcrumbs" in cleaned and isinstance(cleaned["breadcrumbs"], dict):
            bc_values = cleaned["breadcrumbs"].get("values", [])
            for bc in bc_values:
                if "message" in bc and isinstance(bc["message"], str):
                    bc["message"] = sanitize_text(bc["message"])
                if "data" in bc:
                    bc["data"] = sanitize_data(bc["data"])

        # 4. Cleanse user context
        if "user" in cleaned and isinstance(cleaned["user"], dict):
            user_data = cleaned["user"]
            for field in ("ip_address", "phone", "username"):
                if field in user_data:
                    user_data[field] = "[REDACTED]"
            if "email" in user_data and isinstance(user_data["email"], str):
                # Mask user email: j***e@domain.com
                parts = user_data["email"].split("@")
                if len(parts) == 2 and len(parts[0]) > 2:
                    user_data["email"] = f"{parts[0][0]}***{parts[0][-1]}@{parts[1]}"

        # 5. Cleanse extra / tags
        if "extra" in cleaned:
            cleaned["extra"] = sanitize_data(cleaned["extra"])

        return cleaned
    except Exception as err:
        logger.warning(f"[PIIScrubber] Sentry before_send fallback error: {err}")
        return event


# ---------------------------------------------------------------------------
# BetterStack / External Log Stream Formatter
# ---------------------------------------------------------------------------

def betterstack_log_formatter(record: logging.LogRecord) -> Dict[str, Any]:
    """
    Format a LogRecord into a sanitized JSON dictionary payload ready for
    outbound transmission to BetterStack / Logtail HTTP ingest.
    """
    raw_message = record.getMessage() if hasattr(record, "getMessage") else str(record.msg)
    sanitized_message = sanitize_text(raw_message)

    payload = {
        "dt": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
        "level": record.levelname,
        "message": sanitized_message,
        "logger": record.name,
        "context": {
            "module": record.module,
            "line": record.lineno,
            "function": record.funcName,
        }
    }

    # If exception info present, sanitize exception string
    if record.exc_info and record.exc_text:
        payload["exception"] = sanitize_text(record.exc_text)

    # If extra fields were passed on record
    if hasattr(record, "extra") and isinstance(record.extra, dict):
        payload["extra"] = sanitize_data(record.extra)

    return payload


class PIIScrubber:
    """Wrapper class providing static helper methods for PII sanitization."""
    @staticmethod
    def scrub_text(text: str) -> str:
        return sanitize_text(text)

    @staticmethod
    def scrub_dict(data: Any) -> Any:
        return sanitize_data(data)

