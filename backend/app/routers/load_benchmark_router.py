"""
backend/app/routers/load_benchmark_router.py

Router for Load Testing, Webhook Throughput & Concurrency Benchmarking.
Implements Master Plan Section 18.15 Item 17 & Section 18.9 Zero In-Call Disconnect Mandate.

Endpoints:
- GET /api/benchmark/status : Get latest load and concurrency benchmark report
- POST /api/benchmark/run   : Run benchmark suite and verify pre-launch production gate
"""

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

from app.services.load_benchmark_service import LoadBenchmarkService

load_benchmark_router = APIRouter(prefix="/api/benchmark", tags=["Load & Concurrency Benchmarking"])


class RunBenchmarkRequest(BaseModel):
    concurrency: int = Field(25, ge=1, le=100)
    total_requests: int = Field(100, ge=10, le=1000)
    simulated_calls: int = Field(50, ge=1, le=200)


@load_benchmark_router.get("/status")
async def get_benchmark_status() -> Dict[str, Any]:
    """Returns the latest concurrency capacity and webhook throughput benchmark report."""
    return LoadBenchmarkService.get_latest_benchmark_status()


@load_benchmark_router.post("/run")
async def run_benchmark(
    req: RunBenchmarkRequest = RunBenchmarkRequest(),
    x_admin_role: Optional[str] = Header(None, alias="x-admin-role")
) -> Dict[str, Any]:
    """
    Privileged admin endpoint to run a live load and concurrency benchmark simulation.
    Requires role 'admin' or 'developer_tester'.
    """
    if x_admin_role not in ("admin", "developer_tester"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin or Developer/Tester role required to run benchmark drills."
        )

    wh_perf = LoadBenchmarkService.benchmark_webhook_ingestion(
        concurrency=req.concurrency,
        total_requests=req.total_requests
    )
    cc_perf = LoadBenchmarkService.benchmark_concurrency_capacity(
        simulated_calls=req.simulated_calls
    )

    all_passed = wh_perf["passed"] and cc_perf["passed"]

    return {
        "success": all_passed,
        "status": "PASSED" if all_passed else "FAILED",
        "benchmarks": {
            "telephony_webhook_ingestion": wh_perf,
            "voice_concurrency_capacity": cc_perf
        },
        "gate_compliance": {
            "throughput_ready": wh_perf["passed"],
            "concurrency_ready": cc_perf["passed"],
            "zero_disconnect_verified": cc_perf["section_18_9_zero_disconnect_invariant"]
        },
        "launch_readiness": "PRODUCTION_READY" if all_passed else "DEGRADED"
    }
