#!/usr/bin/env python3
"""
backend/scripts/load_concurrency_benchmark.py

CLI Runner for Load Testing & Concurrency Benchmarking.
Implements Master Plan Section 18.15 Item 17 & Section 18.9 Zero In-Call Disconnect Mandate.

Usage:
  python backend/scripts/load_concurrency_benchmark.py
  python backend/scripts/load_concurrency_benchmark.py --concurrency 50 --requests 250 --calls 50
"""

import sys
import os
import argparse
import json

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.load_benchmark_service import LoadBenchmarkService


def main():
    parser = argparse.ArgumentParser(description="Trinetra AI Load Testing & Concurrency Benchmark Engine")
    parser.add_argument("--concurrency", type=int, default=25, help="Concurrent workers for webhook ingestion")
    parser.add_argument("--requests", type=int, default=100, help="Total webhook requests to dispatch")
    parser.add_argument("--calls", type=int, default=50, help="Simultaneous voice channels to simulate")
    parser.add_argument("--verbose", action="store_true", help="Print verbose JSON output")
    args = parser.parse_args()

    print("=====================================================================")
    print("[BENCHMARK] TRINETRA AI -- LOAD TESTING & CONCURRENCY BENCHMARK")
    print("=====================================================================")
    print(f"Target Concurrency: {args.concurrency} workers")
    print(f"Total Webhook Dispatches: {args.requests} events")
    print(f"Simultaneous Channels: {args.calls} calls")
    print("---------------------------------------------------------------------")

    # 1. Telephony Webhook Ingestion Throughput
    print("[1/2] Benchmarking telephony webhook ingestion throughput...")
    wh_perf = LoadBenchmarkService.benchmark_webhook_ingestion(
        concurrency=args.concurrency,
        total_requests=args.requests
    )
    print(f"      Total Time: {wh_perf['total_time_seconds']}s")
    print(f"      Throughput: {wh_perf['throughput_rps']} req/s (Target: >={wh_perf['target_min_rps']})")
    print(f"      Latency: p50={wh_perf['p50_latency_ms']}ms, p95={wh_perf['p95_latency_ms']}ms, p99={wh_perf['p99_latency_ms']}ms")
    print(f"      Passed: {wh_perf['passed']}")

    # 2. Voice Concurrency & Section 18.9 Zero In-Call Disconnect
    print("[2/2] Benchmarking voice channels & Section 18.9 zero-disconnect gate...")
    cc_perf = LoadBenchmarkService.benchmark_concurrency_capacity(
        simulated_calls=args.calls
    )
    print(f"      Channels Sustained: {cc_perf['active_channels_sustained']}/{args.calls}")
    print(f"      Zero-Balance Events Simulated: {cc_perf['zero_balance_events_simulated']}")
    print(f"      Mid-Call Disconnects: {cc_perf['mid_call_disconnects']} (Must be 0)")
    print(f"      Subsequent Calls Gated: {cc_perf['subsequent_calls_gated']}")
    print(f"      Section 18.9 Invariant Preserved: {cc_perf['section_18_9_zero_disconnect_invariant']}")
    print(f"      Passed: {cc_perf['passed']}")

    all_passed = wh_perf["passed"] and cc_perf["passed"]

    if args.verbose:
        report = LoadBenchmarkService.generate_benchmark_report()
        print("\nFull Report:")
        print(json.dumps(report, indent=2))

    print("=====================================================================")
    if all_passed:
        print("[SUCCESS] PRE-LAUNCH GATE PASSED: System is PRODUCTION READY.")
        sys.exit(0)
    else:
        print("[FAILED] PRE-LAUNCH GATE FAILED: Performance or invariant threshold unmet.")
        sys.exit(1)


if __name__ == "__main__":
    main()
