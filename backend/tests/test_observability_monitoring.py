"""
backend/tests/test_observability_monitoring.py

Comprehensive Test Suite for Task 18:
Observability, Monitoring, Health Probes & Synthetic Heartbeats.
"""

import os
import sys
import pytest
from unittest.mock import MagicMock, patch
from fastapi import Response

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.observability_service import ObservabilityService
from app.services.pii_scrubber import sentry_before_send, PIIScrubber
from app.routers.observability_router import (
    get_health,
    get_readiness,
    get_liveness,
    trigger_cron_heartbeat,
    emit_log_event,
    get_monitoring_status,
    CronHeartbeatRequest,
    LogEventRequest,
)


# ===========================================================================
# 1. Health, Readiness, and Liveness Service Probes
# ===========================================================================

def test_check_health_healthy():
    mock_sb = MagicMock()
    mock_table = MagicMock()
    mock_sb.table.return_value = mock_table
    mock_table.select.return_value.limit.return_value.execute.return_value = MagicMock(data=[{"key": "test"}])

    res = ObservabilityService.check_health(supabase_client=mock_sb)
    assert res["status"] == "healthy"
    assert res["database"]["status"] == "healthy"
    assert "latency_ms" in res["database"]
    assert "uptime_seconds" in res
    assert res["version"] == "2026.10"


def test_check_health_degraded_on_db_exception():
    mock_sb = MagicMock()
    mock_sb.table.side_effect = RuntimeError("Database connection timed out")

    res = ObservabilityService.check_health(supabase_client=mock_sb)
    assert res["status"] == "degraded"
    assert res["database"]["status"] == "unhealthy"


def test_check_ready_and_live():
    mock_sb = MagicMock()
    mock_table = MagicMock()
    mock_sb.table.return_value = mock_table
    mock_table.select.return_value.limit.return_value.execute.return_value = MagicMock(data=[{"key": "test"}])

    ready_res = ObservabilityService.check_ready(supabase_client=mock_sb)
    assert ready_res["ready"] is True
    assert ready_res["status"] == "healthy"

    live_res = ObservabilityService.check_live()
    assert live_res["alive"] is True
    assert "timestamp" in live_res


# ===========================================================================
# 2. Sentry Error Monitoring & PII Scrubbing Hook
# ===========================================================================

def test_init_sentry_without_dsn():
    with patch.dict(os.environ, {}, clear=True):
        active = ObservabilityService.init_sentry()
        assert active is False


def test_sentry_before_send_scrubs_pii():
    raw_event = {
        "message": "Error connecting call for prospect +919876543210 with PAN ABCDE1234F",
        "extra": {
            "caller_phone": "+919123456789",
            "caller_email": "customer@secretcorp.com",
            "bearer_token": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        }
    }

    scrubbed = sentry_before_send(raw_event, {})
    assert scrubbed is not None
    # Phone numbers and PANs should be redacted in message
    assert "+919876543210" not in scrubbed["message"]
    assert "ABCDE1234F" not in scrubbed["message"]
    # Extra dictionary values should be sanitized
    assert "+919123456789" not in str(scrubbed["extra"])
    assert "customer@secretcorp.com" not in str(scrubbed["extra"])


# ===========================================================================
# 3. BetterStack Structured Logging & PII Redaction
# ===========================================================================

def test_betterstack_log_dry_run_scrubs_pii():
    message = "Call completed for customer +919876543210, Aadhaar 234567890123"
    context = {
        "phone_number": "+919876543210",
        "api_key": "sk-proj-supersecretkey12345",
        "campaign_id": "camp-999"
    }

    with patch.dict(os.environ, {}, clear=True):
        res = ObservabilityService.emit_betterstack_log(
            message=message,
            level="warn",
            context=context
        )
        assert res["dry_run"] is True
        payload = res["payload"]
        assert "+919876543210" not in payload["message"]
        assert "234567890123" not in payload["message"]
        assert payload["level"] == "warn"
        assert payload["context"]["campaign_id"] == "camp-999"
        # Sensitive keys should be masked
        assert payload["context"]["api_key"] == "[REDACTED]"


# ===========================================================================
# 4. Healthchecks.io Cron Heartbeats
# ===========================================================================

def test_healthchecks_cron_rejects_unmonitored_job():
    with pytest.raises(ValueError) as exc:
        ObservabilityService.send_cron_heartbeat(job_name="unauthorized_miner_job")
    assert "Unknown cron job" in str(exc.value)


def test_healthchecks_cron_dry_run_when_unconfigured():
    for job in ("cleanup", "scheduler", "pool_expand"):
        with patch.dict(os.environ, {}, clear=True):
            res = ObservabilityService.send_cron_heartbeat(job_name=job, status="success")
            assert res["dry_run"] is True
            assert res["ping_url_configured"] is False
            assert res["job"] == job


def test_healthchecks_cron_ping_dispatched():
    with patch.dict(os.environ, {"HEALTHCHECKS_CLEANUP_URL": "https://hc-ping.com/fake-uuid-123"}):
        with patch("urllib.request.urlopen") as mock_urlopen:
            mock_resp = MagicMock()
            mock_resp.getcode.return_value = 200
            mock_urlopen.return_value.__enter__.return_value = mock_resp

            res = ObservabilityService.send_cron_heartbeat(
                job_name="cleanup",
                status="success",
                duration_seconds=5.2
            )
            assert res["pinged"] is True
            assert res["status_code"] == 200
            assert mock_urlopen.called


# ===========================================================================
# 5. Monitoring Status Overview
# ===========================================================================

def test_get_monitoring_status():
    status_report = ObservabilityService.get_monitoring_status()
    assert "sentry" in status_report
    assert status_report["sentry"]["pii_scrubber_enforced"] is True
    assert "betterstack" in status_report
    assert status_report["betterstack"]["pii_redaction_before_transmission"] is True
    assert "healthchecks_io" in status_report
    assert "cleanup" in status_report["healthchecks_io"]["monitored_jobs"]
    assert "scheduler" in status_report["healthchecks_io"]["monitored_jobs"]
    assert "pool_expand" in status_report["healthchecks_io"]["monitored_jobs"]


# ===========================================================================
# 6. Observability Router Handlers (Async Direct Calls)
# ===========================================================================

@pytest.mark.asyncio
async def test_router_get_health_healthy():
    resp = Response()
    with patch.object(ObservabilityService, "check_health", return_value={"status": "healthy"}):
        res = await get_health(resp)
        assert res["status"] == "healthy"
        assert resp.status_code == 200


@pytest.mark.asyncio
async def test_router_get_health_degraded_returns_503():
    resp = Response()
    with patch.object(ObservabilityService, "check_health", return_value={"status": "degraded"}):
        res = await get_health(resp)
        assert res["status"] == "degraded"
        assert resp.status_code == 503


@pytest.mark.asyncio
async def test_router_get_readiness():
    resp = Response()
    with patch.object(ObservabilityService, "check_ready", return_value={"ready": True, "status": "healthy"}):
        res = await get_readiness(resp)
        assert res["ready"] is True
        assert resp.status_code == 200


@pytest.mark.asyncio
async def test_router_get_liveness():
    res = await get_liveness()
    assert res["alive"] is True


@pytest.mark.asyncio
async def test_router_trigger_cron_heartbeat():
    req = CronHeartbeatRequest(job="scheduler", status="success", duration_seconds=1.5)
    with patch.object(ObservabilityService, "send_cron_heartbeat", return_value={"pinged": True}):
        res = await trigger_cron_heartbeat(req)
        assert res["success"] is True
        assert res["result"]["pinged"] is True


@pytest.mark.asyncio
async def test_router_emit_log_event():
    req = LogEventRequest(
        message="Prospect called: +919876543210",
        level="info",
        context={"test": True}
    )
    with patch.object(ObservabilityService, "emit_betterstack_log", return_value={"dry_run": True}):
        res = await emit_log_event(req)
        assert res["success"] is True


@pytest.mark.asyncio
async def test_router_get_monitoring_status():
    res = await get_monitoring_status()
    assert "sentry" in res
    assert "betterstack" in res
    assert "healthchecks_io" in res
