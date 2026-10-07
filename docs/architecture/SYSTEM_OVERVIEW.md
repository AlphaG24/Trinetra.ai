# SYSTEM OVERVIEW — TRINETRA AI (VAAKRITI)

> **Document Status**: AUTHORITATIVE BASELINE  
> **Repository**: Trinetra AI (evolving to Vaakriti)  
> **Source of Truth**: MASTER_PLAN.md (v1.2, Section 18 Overrides)  
> **Protected Baseline**: Any future modification must preserve existing functionality unless explicitly authorized.

---

## 1. Executive Product Summary

**Trinetra AI** (operating under the global brand name **Vaakriti**) is an enterprise-grade, multilingual Conversational Voice AI, Telephony, and Adaptive Agent Platform. Originally envisioned with adaptive educational intelligence (Trinetra Shiksha — mock exam preparation and student cognitive profiling), the platform has matured into a full-stack, carrier-integrated Voice AI receptionist and outbound campaign infrastructure for coaching institutes, educational organizations, clinics, real estate, and SMEs.

### Core Capabilities
1. **Real-Time Voice Streaming & WebRTC**:
   - Ultra-low latency voice sessions orchestrated by LiveKit Server, LiveKit Agents framework, and Python (`backend/agent.py`).
   - Browser WebRTC audio calling (`frontend/src/app/dashboard/agents/[slug]/demo/page.tsx`).
   - Carrier telephony integration with **Exotel** (domestic Indian SIP/DID trunking) and **Twilio** (global telephony).
   - Bring-Your-Own-Numbers (BYON) credential vault for Twilio & Exotel (`backend/app/services/byon_vault_service.py`).

2. **Multilingual Speech & Intelligence Stack**:
   - Speech-To-Text (STT): Sarvam AI (Indic / Hindi / Hinglish) + Deepgram (English) + Whisper fallback.
   - Text-To-Speech (TTS): Sarvam AI (Indic Bulbul v1/v2 models with expressive SSML) + ElevenLabs (English & custom voices).
   - Large Language Models: Groq (low-latency LLaMA 3.3 70B), Google Gemini 2.0 Flash (free tier 1500 req/day), and OpenAI.
   - Multi-personality intent switching (Support vs Consultative Sales) and prompt injection guards (`PromptGuard`).

3. **Telephony & Virtual Number Lifecycle**:
   - Managed number pooling, Razorpay checkout, agent assignment, 30-day renewal cycle.
   - Master Plan Section 18.7 virtual number lifecycle: immediate neutral unavailable playout upon expiration, 15-day grace period, 14-day administrative hold, and daily missed-call email/WhatsApp digests.
   - Priority bidding/auction mechanism for released virtual numbers.

4. **Billing, Wallet & Financial Governance**:
   - Prepaid customer wallets (`wallets`, `wallet_transactions`) funded via Razorpay.
   - Strict Section 18.9 quota governance: **Zero In-Call Disconnection** (active calls never terminate prematurely on quota hit; subsequent calls are politely gated).
   - Reliability Score engine (formerly Credit Score): scoring > 80 unlocks 50 free emergency overdraft minutes.
   - In-app GST Tax Invoice Vault (VAK/ series) with CA review workflows (`docs/compliance`, `invoices`, `invoice_ca_reviews`).

5. **Statutory Compliance & Security**:
   - Deterministic SHA-256 frozen compliance files (`docs/compliance/FROZEN_FILES_MANIFEST.json`).
   - Two-party AI disclosure (*"Arika from Trinetra, an AI assistant"*) and recording consent opt-out handling.
   - TRAI calling hours curfew (09:00–21:00) and national/internal DND registry scrubbing.
   - Encrypted KYC vault (AES-256-GCM, admin-only step-up re-authentication, short-lived signed URLs, no raw Aadhaar by default).
   - Three canonical roles: `customer`, `developer_tester`, `admin`, with test accounts excluded from revenue and compliance metrics.

6. **Educational & Adaptive Foundation (Trinetra Shiksha)**:
   - Educational assessment marketing and catalog architecture (`frontend/src/components/landing/TrinetraShikshaSection.tsx`, `frontend/lib/site-content.ts` with agent types: `"voice" | "chat" | "social" | "workflow" | "exam"`).
   - Coaching institute lead capture, appointment booking, course inquiry handling, and semester exam consultation workflows.

---

## 2. High-Level Architecture Topology

```
                                [ WEB CLIENTS / BROWSERS ]
                                             │
                       HTTPS / WSS (Vercel Edge & Cloudflare)
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
             [ Next.js 16 App Router ]                   [ Telephony Webhooks ]
             - Marketing & Auth Pages                    - Twilio Voice & Stream
             - Client Dashboard (/dashboard)             - Exotel Voice & Audio Stream
             - Admin Operations (/admin)                 - Razorpay Webhooks
                       │                                           │
         ┌─────────────┴─────────────┐                             │
         ▼                           ▼                             ▼
   [ Supabase ]             [ Next.js API Routes ]        [ FastAPI Backend ]
   - Auth (SSR Cookies)     - /api/admin/*                - Port 8000 (Render/Vultr)
   - Postgres 15 with RLS   - /api/billing/*              - LiveKit WebRTC Agent
   - Storage Buckets        - /api/phone-numbers/*        - Voice Pipeline
   - Realtime WebSocket     - /api/kyc/*                  - Telephony Adapters
                            - /api/campaigns/*            - Compliance & KYC Vault
                                     │                             │
                                     └──────────────┬──────────────┘
                                                    │
                                                    ▼
                                    [ External Cloud Ecosystem ]
                                    - LiveKit Cloud / Server
                                    - Sarvam AI / ElevenLabs / Groq
                                    - Twilio / Exotel Telephony
                                    - Razorpay Payment Gateway
                                    - Sentry / BetterStack / Healthchecks
```

---

## 3. Subsystem Breakdown

| Subsystem | Primary Technologies | Directory Locations | Critical Invariants |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | Next.js 16, React 19, Tailwind CSS, Lucide, Zustand, SWR, Framer Motion | `frontend/src/app`, `frontend/src/components` | 30-min admin idle timeout, cookie domain isolation, tenant isolation in all queries |
| **FastAPI Backend** | Python 3.11/3.12, FastAPI, Uvicorn, Pydantic, HTTPX, Cryptography | `backend/main.py`, `backend/app/` | IPv4 first DNS order, PII scrubber attached to root logging, frozen file check |
| **Voice Agent Worker** | LiveKit Agents Python SDK, WebRTC, Silero VAD | `backend/agent.py`, `backend/app/workers/` | Single opening greeting watchdog, tool execution guard (<5.0s), zero in-call disconnect |
| **Telephony Engine** | Twilio REST/TwiML, Exotel REST/ExoML, WebSocket Stream | `backend/telephony_router.py`, `backend/app/services/telephony/` | Strict caller ID (no spoofing), 10-call concurrency limit, DND scrubbing |
| **Database & Auth** | Supabase Postgres, Supabase Auth SSR, RLS Policies | `supabase/migrations/`, `database/migrations/` | Zero remote DDL by AI, purely additive migrations, mandatory RLS, PII encryption |
| **Compliance Vault** | AES-256-GCM, ReportLab PDF, Python Cryptography | `backend/app/services/kyc_vault_service.py`, `invoice_vault_service.py` | Admin step-up re-auth, developer_tester forbidden from KYC, immutable audit trail |
| **Observability** | Sentry, BetterStack Logs/Uptime, Healthchecks.io | `backend/app/services/observability_service.py`, `pii_scrubber.py` | PII redaction enforced BEFORE transmission to external log vendors |

---

## 4. Key Directory Structure

```
Trinetra.ai-dev/
├── backend/                  # FastAPI Application, LiveKit Agent, Python Services
│   ├── app/
│   │   ├── config/           # Constants and shared backend configs
│   │   ├── routers/          # 21 modular FastAPI route modules
│   │   ├── services/         # 41 business logic, telephony, and compliance services
│   │   └── workers/          # LiveKit agent background workers
│   ├── tests/                # 38 pytest test modules covering compliance, security, billing
│   ├── agent.py              # Authoritative LiveKit Voice Agent (VikramAgent)
│   ├── database.py           # Supabase client instantiation with IPv4 socket fallback
│   ├── main.py               # FastAPI entrypoint, router mounts, startup lifecycle
│   ├── voice_router.py       # LiveKit tokens, WebRTC webhooks, audio stream websockets
│   └── telephony_router.py   # Carrier provisioning, outbound dialer, numbers router
├── frontend/                 # Next.js 16 App Router application
│   ├── src/
│   │   ├── app/              # Routes: (admin), (auth), (marketing), dashboard, api, actions
│   │   ├── components/       # UI Components: admin, agents, campaigns, dashboard, landing
│   │   ├── lib/              # Client/server safety utilities (promptGuard, rolePolicy)
│   │   ├── middleware.ts     # Edge auth middleware, session refresh, role redirect
│   │   ├── store/            # Zustand client state management
│   │   └── utils/            # Supabase browser, server, and admin client builders
│   ├── public/               # Static assets, branding, favicons
│   ├── next.config.ts        # CSP headers, IPv4 DNS, server action limits, rewrites
│   └── package.json          # Next.js 16, React 19, Tailwind dependencies
├── supabase/
│   ├── migrations/           # 61 SQL schema migrations with RLS and triggers
│   └── config.toml           # Supabase local development configuration
├── database/
│   └── migrations/           # 70 legacy and supplemental migration SQL scripts
├── docs/
│   ├── architecture/         # Permanent Architecture Baseline & Change-Safety Audit docs
│   ├── compliance/           # Frozen files manifest, DPA, Breach Runbook, Subprocessors
│   ├── operations/           # Backup restore drill runbook, load benchmark reports
│   ├── MASTER_PLAN.md        # Authoritative master project implementation plan (v1.2)
│   ├── PROGRESS.md           # Master build & test tracker for all launch-critical tasks
│   └── VALIDATION_LOG.md     # Engineering validation log with test outputs
├── scripts/                  # CI verification scripts (verify_frozen_files.py, etc.)
└── package.json              # Monorepo root scripts (concurrently dev runner)
```
