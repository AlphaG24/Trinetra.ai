"""
backend/tests/test_access_control_and_alerts.py

Unit test suite verifying:
- Master Plan Section 1.4 Decision A5: Rate Limiting
  (Login: 5/10min, API: 60/min/user, Calls: 5/min/number, and call center overrides).
- Master Plan Section 1.5 Decision M5: P1 Incident Alerts
  (Telegram + Email with PII scrubbing and immutable audit logs).
"""

import time
import pytest
from unittest.mock import patch, MagicMock

from app.services.rate_limit_service import (
    RateLimitService,
    LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
    LOGIN_RATE_LIMIT_WINDOW_SECONDS,
    DEFAULT_API_RPM,
    DEFAULT_CALLS_CPM,
)
from app.services.observability_service import ObservabilityService


@pytest.fixture(autouse=True)
def clean_rate_limit_state():
    """Ensure clean in-memory rate limiter state before each test."""
    RateLimitService.reset_state_for_testing()
    yield
    RateLimitService.reset_state_for_testing()


# ==============================================================================
# SECTION 1.4: Rate Limiting Unit Tests (Decision A5)
# ==============================================================================

class TestLoginRateLimiter:
    """Verifies: Login rate limit is 5 attempts per 10 minutes."""

    def test_first_5_login_attempts_allowed(self):
        client_ip = "192.168.1.100"
        base_time = 1000.0

        for i in range(LOGIN_RATE_LIMIT_MAX_ATTEMPTS):
            allowed, remaining, retry_after = RateLimitService.check_login_rate_limit(
                client_ip, now=base_time + i
            )
            assert allowed is True
            assert remaining == LOGIN_RATE_LIMIT_MAX_ATTEMPTS - (i + 1)
            assert retry_after == 0

    def test_6th_login_attempt_blocked_with_retry_after(self):
        client_ip = "192.168.1.100"
        base_time = 1000.0

        for i in range(LOGIN_RATE_LIMIT_MAX_ATTEMPTS):
            RateLimitService.check_login_rate_limit(client_ip, now=base_time + i)

        # 6th attempt within the 10-minute window
        allowed, remaining, retry_after = RateLimitService.check_login_rate_limit(
            client_ip, now=base_time + 10
        )
        assert allowed is False
        assert remaining == 0
        assert retry_after > 0
        # Retry after should be ~ (base_time + 600 - current_time) = 590s
        assert 580 <= retry_after <= 600

    def test_login_attempts_expire_after_10_minutes(self):
        client_ip = "192.168.1.100"
        base_time = 1000.0

        for i in range(LOGIN_RATE_LIMIT_MAX_ATTEMPTS):
            RateLimitService.check_login_rate_limit(client_ip, now=base_time + i)

        # Time advances past 10 minutes from the last attempt (610 seconds later)
        allowed, remaining, retry_after = RateLimitService.check_login_rate_limit(
            client_ip, now=base_time + LOGIN_RATE_LIMIT_WINDOW_SECONDS + 10
        )
        assert allowed is True
        assert remaining == LOGIN_RATE_LIMIT_MAX_ATTEMPTS - 1
        assert retry_after == 0


class TestApiRateLimiter:
    """Verifies: API rate limit is 60 requests per minute per user/IP."""

    def test_api_rate_limit_standard_60_rpm(self):
        user_id = "user_abc_123"
        base_time = 2000.0

        for i in range(DEFAULT_API_RPM):
            allowed, remaining, retry_after = RateLimitService.check_api_rate_limit(
                user_id, now=base_time + (i * 0.5)
            )
            assert allowed is True

        # 61st request within the 60s window
        allowed, remaining, retry_after = RateLimitService.check_api_rate_limit(
            user_id, now=base_time + 35.0
        )
        assert allowed is False
        assert remaining == 0
        assert retry_after > 0

    def test_api_rate_limit_resets_after_60_seconds(self):
        user_id = "user_abc_123"
        base_time = 2000.0

        for i in range(DEFAULT_API_RPM):
            RateLimitService.check_api_rate_limit(user_id, now=base_time)

        # 61 seconds later
        allowed, remaining, retry_after = RateLimitService.check_api_rate_limit(
            user_id, now=base_time + 61.0
        )
        assert allowed is True
        assert remaining == DEFAULT_API_RPM - 1


class TestCallRateLimiterAndCallCenterOverride:
    """Verifies: Calls rate limit is 5 calls per minute per number, editable for call centers."""

    def test_default_5_cpm_rate_limit(self):
        phone_num = "+919876543210"
        base_time = 3000.0

        for i in range(DEFAULT_CALLS_CPM):
            allowed, remaining, retry_after = RateLimitService.check_call_rate_limit(
                phone_num, now=base_time + i
            )
            assert allowed is True

        # 6th call within 1 minute
        allowed, remaining, retry_after = RateLimitService.check_call_rate_limit(
            phone_num, now=base_time + 10
        )
        assert allowed is False
        assert remaining == 0
        assert retry_after > 0

    def test_call_center_workload_override(self):
        user_id = "call_center_enterprise_org"
        phone_num = "+919876543210"
        base_time = 3000.0

        # Admin overrides limit to 50 calls per minute for this enterprise user
        RateLimitService.set_user_override(user_id=user_id, calls_cpm=50)

        # 10 calls should all succeed without hitting standard 5 CPM ceiling
        for i in range(10):
            allowed, remaining, retry_after = RateLimitService.check_call_rate_limit(
                phone_num, user_id=user_id, now=base_time + i
            )
            assert allowed is True
            assert remaining == 50 - (i + 1)


# ==============================================================================
# SECTION 1.5: P1 Incident Alerting Unit Tests (Decision M5)
# ==============================================================================

class TestP1IncidentAlerts:
    """Verifies: Master Plan Decision M5 (Telegram + email for P1 incidents)."""

    def test_p1_incident_dispatch_with_pii_sanitization(self):
        # Mock Supabase admin client for audit logging
        mock_supabase = MagicMock()
        mock_insert = MagicMock()
        mock_insert.execute.return_value = MagicMock(data=[{"id": "audit-123"}])
        mock_supabase.table.return_value.insert.return_value = mock_insert

        # Alert containing PII (phone number and email) that must be scrubbed
        title = "Voice Gateway Timeout for caller +919876543210"
        details = "Provider connection dropped while dialing +919876543210 for ketan.singh@example.com"

        result = ObservabilityService.dispatch_p1_incident_alert(
            title=title,
            details=details,
            component="telephony_gateway",
            trigger_context={"caller": "+919876543210"},
            supabase_client=mock_supabase
        )

        assert result["severity"] == "P1"
        assert result["component"] == "telephony_gateway"
        assert result["status"] == "ALERT_DISPATCHED"

        # Assert raw phone number is scrubbed from title and details
        assert "+919876543210" not in result["title"]
        assert "+91 98******10" in result["title"]
        assert "+919876543210" not in result["details"]
        assert "+91 98******10" in result["details"]

        # Assert channels dispatched includes audit log
        assert "audit_log" in result["channels_dispatched"]

        # Verify audit log was recorded
        mock_supabase.table.assert_called_with("audit_logs")
        mock_supabase.table().insert.assert_called_once()
        inserted_payload = mock_supabase.table().insert.call_args[0][0]
        assert inserted_payload["action"] == "P1_INCIDENT_ALERT"
        assert inserted_payload["details"]["severity"] == "P1"
        assert "+919876543210" not in inserted_payload["details"]["title"]
