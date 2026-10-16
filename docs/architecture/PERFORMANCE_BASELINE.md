# PERFORMANCE BASELINE & CONCURRENCY BENCHMARK — TRINETRA AI (VAAKRITI)

> **Document Status**: AUTHORITATIVE BASELINE  
> **Source of Truth**: MASTER_PLAN.md (v1.2, Section 18 Overrides) & `docs/operations/LOAD_CONCURRENCY_BENCHMARK_REPORT.md`  
> **Rule**: Distinguish THEORETICAL CAPACITY from TESTED CAPACITY. Do not claim capacity without operational validation.

---

## 1. Voice Pipeline Latency Benchmarks

| Metric / Stage | Target Bound | Automated Test Measured Value | Live Telephony Measured Value | Status |
| :--- | :--- | :--- | :--- | :--- |
| **First Audio Playout** | ~3.0s | N/A (unit tests mock audio) | **NOT YET MEASURED** | Awaiting Live Call Telephony Log |
| **Per-Turn Reply Latency** | ~2.0s | N/A (unit tests mock audio) | **NOT YET MEASURED** | Awaiting Live Call Telephony Log |
| **Tool Execution Hard Cap**| <= 5.0s | **200 ms** (configured test bound)| **5000 ms** (configured in agent) | **VERIFIED IN AUTOMATED TESTS** |
| **Conversational Filler Trigger**| ~700 ms | **100 ms** (configured test bound)| **700 ms** (configured in agent) | **VERIFIED IN AUTOMATED TESTS** |
| **In-Call Silence Watchdog**| ~5.0s | **200 ms** (configured test bound)| **5000 ms** (configured in agent) | **VERIFIED IN AUTOMATED TESTS** |
| **Opening Playout Once Guard**| 1 playout | **1 playout** (duplicates suppressed)| **NOT YET MEASURED** | **VERIFIED IN AUTOMATED TESTS** |
| **Database Contact Backgrounding**| Non-blocking| **< 1.0 ms** dispatch overhead | **NOT YET MEASURED** | **VERIFIED IN AUTOMATED TESTS** |

---

## 2. Anti-Stall Engine & Watchdog Mechanisms

Located in `backend/app/services/voice_reliability_service.py` and integrated into `backend/agent.py`:

1. **`VoiceTimingTracker`**:
   - Monotonic non-PII stopwatch measuring 13 granular stages:
     `answer`, `session_start`, `config_load`, `lookup`, `disclosure_composed`, `first_tts_byte`, `user_speech_end`, `stt_final`, `llm_first_token`, `tool_start`, `tool_end`, `tts_first_byte`, `audio_playout`.
   - Logs metrics with prefix `[VoiceTiming] room=... stage=... elapsed_ms=...`.

2. **`ToolExecutionGuard`**:
   - Wraps database tool queries (appointment checking, slot booking) with `asyncio.wait_for(timeout=5.0)`.
   - If a tool query exceeds **700ms**, automatically emits an expressive filler (*"Haan ji, main details check kar rahi hoon, ek second..."*) to eliminate uncomfortable dead air.
   - If the hard 5.0s cap is exceeded, returns a courteous fallback (*"Abhi system connect nahi ho pa raha hai..."*) without terminating the call.

3. **`InCallNoAudioWatchdog`**:
   - Monitors audio activity between speech turns.
   - Suppressed while tools are actively running (`tool_guard.is_tool_running`).
   - If silence exceeds **5.0s**, retries once and prompts the user (*"Ji, kya aap mujhe sun pa rahe hain?"*).

---

## 3. Database Connection & Network Optimizations

1. **IPv4 Socket Monkey-Patch**:
   - `_getaddrinfo_ipv4_first` in `backend/main.py`, `database.py`, and `agent.py` forces IPv4 resolution on all outbound sockets.
   - Bypasses NAT64 / broken ISP IPv6 routing issues that caused 30-second connection timeouts on Supabase and Render.

2. **Supabase Client Timeouts**:
   - PostgREST client timeout: 10 seconds.
   - Storage client timeout: 10 seconds.
   - Next.js edge auth timeout guard: 8 seconds (prevents 504 gateway deadlocks).

---

## 4. Concurrency & Capacity Analysis

The following estimates evaluate system behavior under concurrent active voice calls and simultaneous web dashboard sessions:

| Concurrent Active Calls | Tested Capacity | Theoretical Capacity | Primary Bottlenecks & Limitations |
| :--- | :--- | :--- | :--- |
| **50 Calls** | **VERIFIED** | Ready | Handled comfortably on 4 vCPU / 8 GB VPS (Vultr Mumbai). Database connection pool handles ~50 active connections. |
| **100 Calls** | **VERIFIED (Synthetic)**| Ready | Reaches carrier default concurrency limits on Exotel / Twilio (`UNVERIFIED, check provider terms`). Requires trunking limit increase. |
| **200 Calls** | **NOT TESTED** | Attainable | Requires PostgreSQL connection pooling (Supabase PgBouncer / Transaction pooler on port 6543) to prevent connection exhaustion. |
| **400 Calls** | **NOT TESTED** | Scaling Needed | Groq API rate limits (LLaMA 3.3 tokens per minute) and Sarvam AI TTS concurrency limits must be upgraded to enterprise tier. |
| **1,000 Calls** | **NOT TESTED** | Cluster Needed | Requires horizontal LiveKit media node clustering (self-hosted LiveKit distributed cluster or LiveKit Cloud auto-scaling). |
| **5,000 Calls** | **NOT TESTED** | Enterprise Scale | Single VPS insufficient; requires Kubernetes microservices, multi-region LiveKit SFU mesh, and dedicated Redis caching cluster. |
| **10,000 Calls** | **NOT TESTED** | Telecom Scale | Requires carrier-grade SIP trunking, distributed database read-replicas, and multi-region LLM fallbacks. |

---

## 5. Hosting & Infrastructure Limitations

1. **Vercel Serverless Limits**:
   - Execution timeout: 15s (Hobby) / 60s (Pro). Long-running voice streams CANNOT run on Vercel; handled by Render/Vultr backend via WebSocket.
   - Server Action payload body limit configured to **10MB** (mitigates DoS via large file uploads).

2. **Render / Vultr Backend Limits**:
   - Python FastAPI runs on Uvicorn with single event loop per worker. Multiple worker processes (`workers: 4`) needed for CPU-bound tasks.
   - Audio transcoding (`audioop-lts`) utilizes CPU threads; Silero VAD runs ONNX runtime.

3. **Supabase Pro Database Limits**:
   - Default direct connection limit: ~60 connections.
   - Transaction pooler (PgBouncer) must be used for high-concurrency API and dialer operations.
