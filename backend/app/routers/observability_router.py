"""
backend/app/routers/observability_router.py

Router for Observability, Health/Readiness Probes & Synthetic Heartbeats.
Implements Master Plan Section 18.15 Item 16.

Endpoints:
- GET /health, /healthz : Full application health and database connectivity probe
- GET /ready, /readyz   : Kubernetes/Container readiness probe
- GET /live, /livez     : Kubernetes/Container liveness probe
- POST /api/observability/cron-heartbeat : Trigger Healthchecks.io cron heartbeat
- POST /api/observability/log            : Emit PII-scrubbed structured log to BetterStack
- GET /api/observability/status          : Get active status of all 3 observability pillars
"""

from fastapi import APIRouter, Response, status, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal

from app.services.observability_service import ObservabilityService

observability_router = APIRouter(tags=["Observability & Monitoring"])


class CronHeartbeatRequest(BaseModel):
    job: Literal["cleanup", "scheduler", "pool_expand"]
    status: Literal["success", "start", "fail"] = "success"
    duration_seconds: Optional[float] = Field(None, ge=0.0)


class LogEventRequest(BaseModel):
    message: str = Field(..., min_length=1)
    level: Literal["info", "warn", "warning", "error", "debug"] = "info"
    context: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Public Health, Readiness & Liveness Probes
# ---------------------------------------------------------------------------

@observability_router.get("/health")
@observability_router.get("/healthz")
async def get_health(response: Response):
    """Checks application and database health. Returns 503 if degraded."""
    report = ObservabilityService.check_health()
    if report["status"] != "healthy":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return report


@observability_router.get("/ready")
@observability_router.get("/readyz")
async def get_readiness(response: Response):
    """Readiness probe for load balancers and container orchestrators."""
    report = ObservabilityService.check_ready()
    if not report["ready"]:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return report


@observability_router.get("/live")
@observability_router.get("/livez")
async def get_liveness():
    """Liveness probe for container orchestrators."""
    return ObservabilityService.check_live()


# ---------------------------------------------------------------------------
# Observability APIs (Heartbeats, Logs, Status)
# ---------------------------------------------------------------------------

@observability_router.post("/api/observability/cron-heartbeat")
async def trigger_cron_heartbeat(req: CronHeartbeatRequest):
    """
    Sends a heartbeat signal to Healthchecks.io for monitored background workers:
    'cleanup', 'scheduler', or 'pool_expand'.
    """
    try:
        res = ObservabilityService.send_cron_heartbeat(
            job_name=req.job,
            status=req.status,
            duration_seconds=req.duration_seconds
        )
        return {"success": True, "result": res}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Heartbeat dispatch failed: {str(e)}")


@observability_router.post("/api/observability/log")
async def emit_log_event(req: LogEventRequest):
    """
    Emits a structured log event to BetterStack with mandatory zero-PII pre-scrubbing.
    """
    res = ObservabilityService.emit_betterstack_log(
        message=req.message,
        level=req.level,
        context=req.context
    )
    return {"success": True, "result": res}


@observability_router.get("/api/observability/status")
async def get_monitoring_status():
    """Returns active monitoring status for Sentry, BetterStack, and Healthchecks.io."""
    return ObservabilityService.get_monitoring_status()
