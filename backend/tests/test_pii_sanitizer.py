"""
backend/tests/test_pii_sanitizer.py

Test Suite for Task 7: PII Sanitizer & External Log Scrubber.
Verifies:
1. Real-time masking of phone numbers (+91, standard 10-digit, formatted).
2. Masking of Indian 12-digit Aadhaar numbers (preserves last 4 digits per UIDAI standard).
3. Masking of US 9-digit SSN numbers.
4. Redaction of API keys, JWTs, and Bearer authorization tokens.
5. Recursive dictionary and payload scrubbing of sensitive keys (password, token, etc.).
6. Python logging.Filter integration (PIIFilter) scrubbing log emissions in real time.
7. Sentry before_send hook cleansing exception values, request headers, bodies, and breadcrumbs.
8. BetterStack log stream formatter producing sanitized JSON payloads.
"""

import io
import os
import sys
import logging
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.pii_scrubber import (
    sanitize_text,
    sanitize_data,
    mask_phone_match,
    mask_aadhaar_match,
    mask_ssn_match,
    PIIFilter,
    attach_pii_filter,
    sentry_before_send,
    betterstack_log_formatter,
)


class TestPhoneSanitization:
    """Verifies masking of various phone number patterns."""

    def test_indian_10_digit_mobile(self):
        text = "Calling contact 9876543210 regarding scheduled demo"
        sanitized = sanitize_text(text)
        assert "9876543210" not in sanitized
        assert "98******10" in sanitized

    def test_indian_plus_91_prefix(self):
        text = "Webhook incoming from +919876543210"
        sanitized = sanitize_text(text)
        assert "+919876543210" not in sanitized
        assert "+91 98******10" in sanitized

    def test_indian_formatted_with_spaces(self):
        text = "Customer phone is 98765 43210 on record"
        sanitized = sanitize_text(text)
        assert "98765 43210" not in sanitized
        assert "98******10" in sanitized


class TestNationalIdSanitization:
    """Verifies masking of Aadhaar and SSN numbers."""

    def test_aadhaar_with_spaces(self):
        text = "Aadhaar verification submitted: 2345 6789 0123 for KYC"
        sanitized = sanitize_text(text)
        assert "2345 6789 0123" not in sanitized
        assert "XXXX-XXXX-0123" in sanitized

    def test_aadhaar_continuous_digits(self):
        text = "Aadhaar number 234567890123 verified successfully"
        sanitized = sanitize_text(text)
        assert "234567890123" not in sanitized
        assert "XXXX-XXXX-0123" in sanitized

    def test_us_ssn_number(self):
        text = "Tax ID SSN 123-45-6789 on file"
        sanitized = sanitize_text(text)
        assert "123-45-6789" not in sanitized
        assert "***-**-6789" in sanitized


class TestTokenAndKeyRedaction:
    """Verifies redaction of API keys, Bearer tokens, and JWTs."""

    def test_bearer_token_redaction(self):
        text = "Header Authorization: Bearer abcdef1234567890xyz1234567890"
        sanitized = sanitize_text(text)
        assert "abcdef1234567890xyz1234567890" not in sanitized
        assert "Bearer [REDACTED_TOKEN]" in sanitized

    def test_jwt_token_redaction(self):
        jwt = (
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
            "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ."
            "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        )
        text = f"User session token is {jwt}"
        sanitized = sanitize_text(text)
        assert jwt not in sanitized
        assert "[REDACTED_JWT]" in sanitized

    def test_known_api_keys_redaction(self):
        supabase_key = "sbp_abcdef1234567890abcdef123456"
        openai_key = "sk_live_1234567890abcdef123456"
        text = f"Using keys: {supabase_key} and {openai_key}"
        sanitized = sanitize_text(text)
        assert supabase_key not in sanitized
        assert openai_key not in sanitized
        assert "[REDACTED_API_KEY]" in sanitized


class TestDictionarySanitization:
    """Verifies recursive sanitization of nested payloads."""

    def test_sensitive_keys_redacted(self):
        payload = {
            "user_id": "usr-123",
            "password": "MySuperSecretPassword123!",
            "service_role_key": "secret-service-key-xyz",
            "profile": {
                "phone": "+919876543210",
                "notes": "Contact Aadhaar 2345 6789 0123",
                "access_token": "token-1234567890",
            },
            "tags": ["admin", "caller: +919876543210"],
        }

        sanitized = sanitize_data(payload)

        # Sensitive keys values replaced with [REDACTED]
        assert sanitized["password"] == "[REDACTED]"
        assert sanitized["service_role_key"] == "[REDACTED]"
        assert sanitized["profile"]["access_token"] == "[REDACTED]"

        # Embedded PII in string values masked
        assert "+919876543210" not in sanitized["profile"]["phone"]
        assert "+91 98******10" in sanitized["profile"]["phone"]
        assert "2345 6789 0123" not in sanitized["profile"]["notes"]
        assert "XXXX-XXXX-0123" in sanitized["profile"]["notes"]
        assert "+91 98******10" in sanitized["tags"][1]

        # Non-sensitive keys intact
        assert sanitized["user_id"] == "usr-123"
        assert sanitized["tags"][0] == "admin"


class TestLoggingFilterIntegration:
    """Verifies PIIFilter integration with Python logging subsystem."""

    def test_pii_filter_scrubs_log_records(self):
        test_logger = logging.getLogger("test-scrubber-logger")
        test_logger.setLevel(logging.INFO)
        test_logger.propagate = False

        log_capture = io.StringIO()
        handler = logging.StreamHandler(log_capture)
        handler.setFormatter(logging.Formatter("%(message)s"))
        test_logger.addHandler(handler)

        attach_pii_filter(test_logger)

        raw_phone = "+919876543210"
        raw_secret = "sk_live_secretkey1234567890"

        test_logger.info(f"Incoming call from {raw_phone} using auth {raw_secret}")
        output = log_capture.getvalue()

        # Assert raw secrets and PII never reach log output
        assert raw_phone not in output
        assert raw_secret not in output
        assert "+91 98******10" in output
        assert "[REDACTED_API_KEY]" in output


class TestSentryBeforeSendHook:
    """Verifies Sentry exception and event scrubber."""

    def test_sentry_before_send_cleanses_event(self):
        event = {
            "exception": {
                "values": [
                    {
                        "value": "ConnectionError while contacting +919876543210 with sk_live_1234567890abcdef",
                        "stacktrace": {
                            "frames": [
                                {
                                    "filename": "caller.py",
                                    "vars": {
                                        "phone_num": "+919876543210",
                                        "auth_token": "secret-token-xyz-12345",
                                    }
                                }
                            ]
                        }
                    }
                ]
            },
            "request": {
                "headers": {
                    "Authorization": "Bearer sensitive-token-here-12345",
                    "Cookie": "session_id=secret_cookie_val_xyz",
                    "User-Agent": "Mozilla/5.0",
                },
                "data": {
                    "password": "ClearTextPassword!",
                    "phone": "+919876543210",
                }
            },
            "breadcrumbs": {
                "values": [
                    {
                        "message": "User dialed +919876543210",
                        "data": {"auth_key": "secret-key-abc"},
                    }
                ]
            },
            "user": {
                "ip_address": "192.168.1.1",
                "phone": "+919876543210",
                "email": "ketan.singh@example.com",
            }
        }

        cleaned = sentry_before_send(event)

        # Exception message cleansed
        exc_val = cleaned["exception"]["values"][0]["value"]
        assert "+919876543210" not in exc_val
        assert "sk_live_1234567890abcdef" not in exc_val

        # Frame vars cleansed
        frame_vars = cleaned["exception"]["values"][0]["stacktrace"]["frames"][0]["vars"]
        assert "+919876543210" not in frame_vars["phone_num"]
        assert frame_vars["auth_token"] == "[REDACTED]"

        # Request headers redacted
        assert cleaned["request"]["headers"]["Authorization"] == "[REDACTED]"
        assert cleaned["request"]["headers"]["Cookie"] == "[REDACTED]"
        assert cleaned["request"]["headers"]["User-Agent"] == "Mozilla/5.0"

        # Request data cleansed
        assert cleaned["request"]["data"]["password"] == "[REDACTED]"
        assert "+919876543210" not in cleaned["request"]["data"]["phone"]

        # Breadcrumbs cleansed
        assert "+919876543210" not in cleaned["breadcrumbs"]["values"][0]["message"]
        assert cleaned["breadcrumbs"]["values"][0]["data"]["auth_key"] == "[REDACTED]"

        # User context cleansed
        assert cleaned["user"]["ip_address"] == "[REDACTED]"
        assert cleaned["user"]["phone"] == "[REDACTED]"
        assert "k***h@example.com" in cleaned["user"]["email"]


class TestBetterStackLogFormatter:
    """Verifies BetterStack log stream payload formatter."""

    def test_formatter_produces_sanitized_payload(self):
        record = logging.LogRecord(
            name="voice-worker",
            level=logging.ERROR,
            pathname="worker.py",
            lineno=42,
            msg="Call failed for +919876543210 with sk_live_1234567890abcdef",
            args=(),
            exc_info=None,
        )
        record.extra = {
            "aadhaar": "2345 6789 0123",
            "password": "SuperSecretPassword123!",
            "call_id": "call-123",
            "notes": "Verified Aadhaar 2345 6789 0123",
        }

        payload = betterstack_log_formatter(record)

        assert payload["level"] == "ERROR"
        assert payload["logger"] == "voice-worker"
        assert "+919876543210" not in payload["message"]
        assert "+91 98******10" in payload["message"]
        assert "sk_live_1234567890abcdef" not in payload["message"]

        # Extra fields cleansed
        assert payload["extra"]["aadhaar"] == "[REDACTED]"
        assert payload["extra"]["password"] == "[REDACTED]"
        assert payload["extra"]["call_id"] == "call-123"
        assert "2345 6789 0123" not in payload["extra"]["notes"]
        assert "XXXX-XXXX-0123" in payload["extra"]["notes"]
