"""
backend/app/services/observability_service.py

Unified Observability, Monitoring & Synthetic Heartbeat Engine for Trinetra AI.
Implements Master Plan Section 18.15 Item 16 & PII Scrubbing Mandates.

Integrations:
1. System Health & Readiness Probes (/health, /ready, /live).
2. Sentry Error Monitoring with deep PII scrubbing hook (sentry_before_send).
3. BetterStack Log Streaming with pre-transmission PII redactor.
4. Healthchecks.io Cron Heartbeat Monitor for background workers:
   - 'cleanup' (data retention & media minimization)
   - 'scheduler' (automated callback dispatch)
   - 'pool_expand' (virtual phone number inventory monitor)
"""

import os
import time
import logging
from typing import Dict, Any, Optional
import urllib.request
import urllib.error

from app.services.pii_scrubber import PIIScrubber, sentry_before_send
from database import supabase_admin

logger = logging.getLogger("ObservabilityService")


class ObservabilityService:
    # 3 Standard Cron Jobs monitored via Healthchecks.io per Master Plan Section 1.10
    MONITORED_CRON_JOBS = ("cleanup", "scheduler", "pool_expand")

    @classmethod
    def check_health(cls, supabase_client=None) -> Dict[str, Any]:
        """
        Executes a live health check probe against the application and database.
        Returns health status, database latency, and operational timestamp.
        """
        sb = supabase_client or supabase_admin
        start_time = time.time()
        db_status = "healthy"
        db_latency_ms = 0.0

        try:
            # Probe database using simple read query
            if hasattr(sb, "table"):
                res = sb.table("system_config").select("id").limit(1).execute()
                db_latency_ms = round((time.time() - start_time) * 1000, 2)
            else:
                db_status = "mocked"
        except Exception as e:
            logger.error(f"[HealthCheck] Database probe failed: {e}")
            db_status = "unhealthy"
            db_latency_ms = round((time.time() - start_time) * 1000, 2)

        is_healthy = db_status in ("healthy", "mocked")
        return {
            "status": "healthy" if is_healthy else "degraded",
            "uptime_seconds": int(time.time() - getattr(cls, "_process_start_time", time.time())),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "database": {
                "status": db_status,
                "latency_ms": db_latency_ms
            },
            "environment": os.environ.get("ENVIRONMENT", "production"),
            "version": "2026.10"
        }

    @classmethod
    def check_ready(cls, supabase_client=None) -> Dict[str, Any]:
        """Kubernetes/Container orchestrator readiness probe."""
        health = cls.check_health(supabase_client)
        is_ready = health["status"] == "healthy"
        return {
            "ready": is_ready,
            "status": health["status"],
            "timestamp": health["timestamp"]
        }

    @classmethod
    def check_live(cls) -> Dict[str, Any]:
        """Kubernetes/Container orchestrator liveness probe."""
        return {
            "alive": True,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }

    @classmethod
    def init_sentry(cls) -> bool:
        """
        Initializes Sentry error monitoring with the mandatory PII scrubber hook.
        Returns True if Sentry is configured and active, False otherwise.
        """
        sentry_dsn = os.environ.get("SENTRY_DSN")
        if not sentry_dsn:
            logger.info("[Observability] SENTRY_DSN not configured; Sentry monitoring inactive.")
            return False

        try:
            import sentry_sdk  # pyrefly: ignore [missing-import]  # type: ignore
            sentry_sdk.init(
                dsn=sentry_dsn,
                before_send=sentry_before_send,
                traces_sample_rate=float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.1")),
                environment=os.environ.get("ENVIRONMENT", "production"),
                send_default_pii=False  # Absolute prohibition per Master Plan Section 18
            )
            logger.info("[Observability] Sentry monitoring initialized with PII scrubber hook.")
            return True
        except ImportError:
            logger.warning("[Observability] sentry_sdk not installed in environment.")
            return False
        except Exception as e:
            logger.error(f"[Observability] Sentry init failed: {e}")
            return False

    @classmethod
    def emit_betterstack_log(
        cls,
        message: str,
        level: str = "info",
        context: Optional[Dict[str, Any]] = None,
        ingest_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transmits a structured log event to BetterStack log drain.
        CRITICAL: Deeply scrubs all PII, phone numbers, and secrets BEFORE transmission.
        """
        token = ingest_token or os.environ.get("BETTERSTACK_LOG_TOKEN")
        
        # 1. Deep PII scrubbing on message and context
        scrubbed_message = PIIScrubber.scrub_text(message)
        scrubbed_context = PIIScrubber.scrub_dict(context or {})

        payload = {
            "dt": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "level": level.lower(),
            "message": scrubbed_message,
            "context": scrubbed_context,
            "platform": "trinetra-voice-ai",
            "environment": os.environ.get("ENVIRONMENT", "production")
        }

        # If token is not set, log locally and return prepared payload for test/audit
        if not token:
            logger.debug(f"[BetterStack:DryRun] {payload}")
            return {"transmitted": False, "dry_run": True, "payload": payload}

        try:
            import json
            req = urllib.request.Request(
                "https://in.logs.betterstack.com",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                status_code = resp.getcode()
                return {"transmitted": status_code in (200, 202), "status_code": status_code, "payload": payload}
        except Exception as e:
            logger.warning(f"[Observability] BetterStack dispatch failure: {e}")
            return {"transmitted": False, "error": str(e), "payload": payload}

    @classmethod
    def send_cron_heartbeat(
        cls,
        job_name: str,
        status: str = "success",
        duration_seconds: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Sends a heartbeat ping to Healthchecks.io for background worker liveness tracking.
        Supported jobs: 'cleanup', 'scheduler', 'pool_expand'.
        Status: 'success', 'start', 'fail'.
        """
        job_clean = job_name.strip().lower()
        if job_clean not in cls.MONITORED_CRON_JOBS:
            raise ValueError(f"Unknown cron job '{job_name}'. Monitored jobs: {', '.join(cls.MONITORED_CRON_JOBS)}")

        # Check for job-specific ping URL (e.g. HEALTHCHECKS_CLEANUP_URL) or base UUID mapping
        env_var_name = f"HEALTHCHECKS_{job_clean.upper()}_URL"
        ping_url = os.environ.get(env_var_name) or os.environ.get(f"HC_PING_{job_clean.upper()}_URL")

        if not ping_url:
            logger.debug(f"[Healthchecks:DryRun] {job_clean} heartbeat ping ({status})")
            return {
                "job": job_clean,
                "status": status,
                "ping_url_configured": False,
                "pinged": False,
                "dry_run": True
            }

        # Append /start or /fail if appropriate
        final_url = ping_url
        if status == "start":
            final_url = f"{ping_url.rstrip('/')}/start"
        elif status == "fail":
            final_url = f"{ping_url.rstrip('/')}/fail"

        try:
            data = None
            if duration_seconds is not None:
                data = str(duration_seconds).encode("utf-8")
            
            req = urllib.request.Request(final_url, data=data, method="POST" if data else "GET")
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                return {
                    "job": job_clean,
                    "status": status,
                    "ping_url_configured": True,
                    "pinged": resp.getcode() == 200,
                    "status_code": resp.getcode()
                }
        except Exception as e:
            logger.warning(f"[Observability] Healthchecks.io ping failed for {job_clean}: {e}")
            return {
                "job": job_clean,
                "status": status,
                "ping_url_configured": True,
                "pinged": False,
                "error": str(e)
            }

    @classmethod
    def get_monitoring_status(cls) -> Dict[str, Any]:
        """Returns the configuration and active status of all 3 observability pillars."""
        return {
            "sentry": {
                "configured": bool(os.environ.get("SENTRY_DSN")),
                "pii_scrubber_enforced": True,
                "zero_pii_policy": "STRICT"
            },
            "betterstack": {
                "logs_configured": bool(os.environ.get("BETTERSTACK_LOG_TOKEN")),
                "uptime_probes_configured": bool(os.environ.get("BETTERSTACK_UPTIME_URL")),
                "pii_redaction_before_transmission": True
            },
            "healthchecks_io": {
                "monitored_jobs": list(cls.MONITORED_CRON_JOBS),
                "configured_jobs": [
                    job for job in cls.MONITORED_CRON_JOBS
                    if os.environ.get(f"HEALTHCHECKS_{job.upper()}_URL") or os.environ.get(f"HC_PING_{job.upper()}_URL")
                ]
            }
        }

    @classmethod
    def dispatch_p1_incident_alert(
        cls,
        title: str,
        details: str,
        component: str = "core_telephony",
        trigger_context: Optional[Dict[str, Any]] = None,
        supabase_client = None
    ) -> Dict[str, Any]:
        """
        Dispatches immediate alerts for P1 Critical Incidents via Telegram and Email.
        Implements Master Plan Section 1.5 Decision M5.
        
        Deeply scrubs all PII before transmission and writes an immutable audit record.
        """
        now_utc = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        clean_title = PIIScrubber.scrub_text(title)
        clean_details = PIIScrubber.scrub_text(details)
        clean_context = PIIScrubber.scrub_dict(trigger_context or {})

        telegram_msg = (
            f"🚨 *[P1 CRITICAL INCIDENT]*\n"
            f"*Component:* {component}\n"
            f"*Summary:* {clean_title}\n"
            f"*Details:* {clean_details}\n"
            f"*Time:* {now_utc}"
        )

        channels_dispatched = []

        # 1. Telegram Dispatch
        bot_token = os.environ.get("TELEGRAM_BOT_TOKEN")
        chat_id = os.environ.get("TELEGRAM_CHAT_ID")
        telegram_sent = False

        if bot_token and chat_id:
            try:
                import json
                tg_url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                req = urllib.request.Request(
                    tg_url,
                    data=json.dumps({
                        "chat_id": chat_id,
                        "text": telegram_msg,
                        "parse_mode": "Markdown"
                    }).encode("utf-8"),
                    headers={"Content-Type": "application/json"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=3.0) as resp:
                    if resp.getcode() == 200:
                        telegram_sent = True
                        channels_dispatched.append("telegram")
            except Exception as tg_err:
                logger.warning(f"[Observability:P1Alert] Telegram alert dispatch failed: {tg_err}")
        else:
            logger.info(f"[Observability:P1Alert:DryRun] Telegram alert: {clean_title}")
            channels_dispatched.append("telegram_dry_run")

        # 2. Email Dispatch
        alert_email = os.environ.get("ALERT_EMAIL") or os.environ.get("SMTP_USER") or "security@trinetraedu-ai.com"
        email_sent = False
        resend_key = os.environ.get("RESEND_PRIVATE_KEY") or os.environ.get("RESEND_API_KEY")

        if resend_key:
            try:
                import json
                req = urllib.request.Request(
                    "https://api.resend.com/emails",
                    data=json.dumps({
                        "from": "Trinetra Security Alerts <alerts@trinetraedu-ai.com>",
                        "to": [alert_email],
                        "subject": f"🚨 [P1 Incident] {clean_title}",
                        "text": f"P1 CRITICAL INCIDENT DETECTED\nComponent: {component}\nTime: {now_utc}\n\nDetails:\n{clean_details}"
                    }).encode("utf-8"),
                    headers={
                        "Authorization": f"Bearer {resend_key}",
                        "Content-Type": "application/json"
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=3.0) as resp:
                    if resp.getcode() in (200, 201):
                        email_sent = True
                        channels_dispatched.append("email")
            except Exception as email_err:
                logger.warning(f"[Observability:P1Alert] Email alert dispatch failed: {email_err}")
        else:
            logger.info(f"[Observability:P1Alert:DryRun] Email alert to {alert_email}: {clean_title}")
            channels_dispatched.append("email_dry_run")

        # 3. Immutable Security Audit Log
        sb = supabase_client or supabase_admin
        if hasattr(sb, "table"):
            try:
                sb.table("audit_logs").insert({
                    "action": "P1_INCIDENT_ALERT",
                    "resource_type": "system_health",
                    "details": {
                        "severity": "P1",
                        "component": component,
                        "title": clean_title,
                        "details": clean_details,
                        "context": clean_context,
                        "channels": channels_dispatched
                    },
                    "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                }).execute()
                channels_dispatched.append("audit_log")
            except Exception as audit_err:
                logger.warning(f"[Observability:P1Alert] Audit log recording failed: {audit_err}")

        return {
            "severity": "P1",
            "component": component,
            "title": clean_title,
            "details": clean_details,
            "channels_dispatched": channels_dispatched,
            "timestamp": now_utc,
            "status": "ALERT_DISPATCHED"
        }


# Record process start time on module import
ObservabilityService._process_start_time = time.time()
