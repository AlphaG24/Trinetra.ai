"""
backend/tests/test_load_concurrency_benchmark.py

Comprehensive Test Suite for Task 20:
Load Testing, Concurrency Benchmarking & Zero Mid-Call Disconnect Mandate.
Implements Master Plan Section 18.15 Item 17 & Section 18.9.
"""

import os
import sys
import pytest
from fastapi import HTTPException

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.load_benchmark_service import LoadBenchmarkService
from app.routers.load_benchmark_router import (
    get_benchmark_status,
    run_benchmark,
    RunBenchmarkRequest
)


# ===========================================================================
# 1. Telephony Webhook Ingestion Throughput Tests
# ===========================================================================

class TestWebhookIngestionBenchmark:
    def test_benchmark_webhook_ingestion_success(self):
        res = LoadBenchmarkService.benchmark_webhook_ingestion(concurrency=10, total_requests=50)
        assert res["total_requests"] == 50
        assert res["concurrency"] == 10
        assert res["throughput_rps"] > 0
        assert res["p50_latency_ms"] >= 0
        assert res["p95_latency_ms"] >= 0
        assert res["p99_latency_ms"] >= 0
        assert res["p95_latency_ms"] <= LoadBenchmarkService.TARGET_P95_LATENCY_MAX_MS
        assert res["passed"] is True

    def test_throughput_and_latency_thresholds(self):
        res = LoadBenchmarkService.benchmark_webhook_ingestion(concurrency=25, total_requests=100)
        assert res["throughput_rps"] >= LoadBenchmarkService.TARGET_THROUGHPUT_MIN_RPS
        assert res["p50_latency_ms"] <= res["p95_latency_ms"]
        assert res["p95_latency_ms"] <= res["p99_latency_ms"]
        assert res["passed"] is True


# ===========================================================================
# 2. Concurrency Capacity & Section 18.9 Zero In-Call Disconnect Tests
# ===========================================================================

class TestConcurrencyCapacityAndZeroDisconnect:
    def test_benchmark_concurrency_capacity_preserves_active_calls(self):
        res = LoadBenchmarkService.benchmark_concurrency_capacity(simulated_calls=50)
        assert res["simulated_active_calls"] == 50
        assert res["active_channels_sustained"] == 50
        assert res["zero_balance_events_simulated"] == 20
        # CRITICAL MANDATE (Section 18.9): Mid-call disconnects must strictly be 0
        assert res["mid_call_disconnects"] == 0
        assert res["section_18_9_zero_disconnect_invariant"] is True
        assert res["passed"] is True

    def test_subsequent_call_blocked_when_balance_zero(self):
        res = LoadBenchmarkService.benchmark_concurrency_capacity(simulated_calls=10)
        # Verify subsequent call was intercepted and gated
        assert res["subsequent_calls_gated"] == 1
        assert res["mid_call_disconnects"] == 0


# ===========================================================================
# 3. Pre-Launch Benchmark Report Compilation
# ===========================================================================

class TestPreLaunchBenchmarkReport:
    def test_generate_benchmark_report_production_ready(self):
        report = LoadBenchmarkService.generate_benchmark_report()
        assert report["status"] == "PASSED"
        assert report["launch_readiness"] == "PRODUCTION_READY"
        assert report["gate_compliance"]["throughput_ready"] is True
        assert report["gate_compliance"]["concurrency_ready"] is True
        assert report["gate_compliance"]["zero_disconnect_verified"] is True
        assert "telephony_webhook_ingestion" in report["benchmarks"]
        assert "voice_concurrency_capacity" in report["benchmarks"]

    def test_get_latest_benchmark_status_cached_or_generated(self):
        status = LoadBenchmarkService.get_latest_benchmark_status()
        assert status is not None
        assert "launch_readiness" in status
        assert status["status"] in ("PASSED", "FAILED")


# ===========================================================================
# 4. Load Benchmark Router Handlers
# ===========================================================================

class TestLoadBenchmarkRouter:
    @pytest.mark.asyncio
    async def test_get_benchmark_status(self):
        res = await get_benchmark_status()
        assert "status" in res
        assert "gate_compliance" in res

    @pytest.mark.asyncio
    async def test_run_benchmark_admin_success(self):
        req = RunBenchmarkRequest(concurrency=10, total_requests=30, simulated_calls=20)
        res = await run_benchmark(req=req, x_admin_role="admin")
        assert res["success"] is True
        assert res["status"] == "PASSED"
        assert res["launch_readiness"] == "PRODUCTION_READY"

    @pytest.mark.asyncio
    async def test_run_benchmark_developer_tester_success(self):
        req = RunBenchmarkRequest(concurrency=10, total_requests=30, simulated_calls=20)
        res = await run_benchmark(req=req, x_admin_role="developer_tester")
        assert res["success"] is True
        assert res["status"] == "PASSED"

    @pytest.mark.asyncio
    async def test_run_benchmark_customer_forbidden(self):
        req = RunBenchmarkRequest(concurrency=10, total_requests=30, simulated_calls=20)
        with pytest.raises(HTTPException) as exc:
            await run_benchmark(req=req, x_admin_role="customer")
        assert exc.value.status_code == 403
        assert "Forbidden" in exc.value.detail


# ===========================================================================
# 5. Documentation Completeness
# ===========================================================================

class TestLoadBenchmarkReportDocumentation:
    def test_markdown_report_exists_and_complete(self):
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        report_path = os.path.join(repo_root, "docs", "operations", "LOAD_CONCURRENCY_BENCHMARK_REPORT.md")
        assert os.path.exists(report_path), f"Report missing at {report_path}"

        with open(report_path, "r", encoding="utf-8") as f:
            content = f.read()

        assert "Simultaneous Active Calls" in content
        assert "Webhook Ingestion Throughput" in content
        assert "Section 18.9" in content
        assert "Zero mid-call drop" in content
        assert "UNVERIFIED, check provider terms" in content
        assert "PRODUCTION_READY" in content or "PASSED" in content
