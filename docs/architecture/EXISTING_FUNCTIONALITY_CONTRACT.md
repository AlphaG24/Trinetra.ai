# EXISTING FUNCTIONALITY CONTRACT & NON-BREAKING INVARIANTS

> **Authoritative Baseline Notice**:
> This document defines **WHAT ALREADY WORKS** and **WHAT MUST NOT BREAK**.
> Future modifications must preserve the behaviors documented below unless the user issues explicit written authorization to change them.

---

## 1. Primary Operating Invariant

> **"EXISTING FUNCTIONALITY HAS PRIORITY OVER NEW FUNCTIONALITY."**  
> A new feature must be added *around* the existing system using adapters, wrappers, or additive modules. Do NOT replace, rewrite, simplify, or restructure existing working functionality merely because an alternative architecture appears cleaner.

---

## 2. Invariant Contracts by Subsystem

### 2.1 Voice Pipeline & LiveKit Agent (`backend/agent.py`)
- **What Already Works**:
  - WebRTC in-browser voice demo with live audio waveform and transcript stream.
  - PSTN carrier audio streaming via Twilio and Exotel webhooks.
  - Turn-by-turn conversation using Sarvam Indic STT/TTS and Groq/Gemini LLMs.
  - Stopwatch timing instrumentation (`VoiceTimingTracker`) across all 13 lifecycle stages.
  - Anti-stall protection (`ToolExecutionGuard`): database queries exceeding 700ms emit natural speech fillers (*"Haan ji, main check kar rahi hoon..."*). Hard timeout capped at 5.0s with conversational fallback.
  - Single opening greeting guard (`_has_introduced_self`) preventing duplicate greeting playback.
- **What Must NOT Break**:
  - *Future changes must preserve this behavior unless explicitly authorized.*
  - Active voice calls must never hang up mid-sentence or drop silently during tool executions.
  - The LiveKit worker must continue to handle WebRTC participant events and gracefully decrement tenant usage upon disconnect.

---

### 2.2 Statutory Compliance & Frozen Primitives
- **What Already Works**:
  - Mandatory AI identity disclosure plays within the first 5 seconds of every voice call (*"Arika from Trinetra, an AI assistant"*).
  - Recording consent is requested; callers who opt out have recording disabled and `recording_url` remains null.
  - Outbound dialing campaigns enforce the TRAI 09:00–21:00 calling hours floor and scrub all recipients against `dnd_registry`.
  - Deterministic SHA-256 CI hash checks verify the bit-for-bit integrity of all 4 frozen compliance files.
- **What Must NOT Break**:
  - *Future changes must preserve this behavior unless explicitly authorized.*
  - The frozen files (`disclosure_service.py`, `outbound_safety_guardrails.py`, `prompt_guard.py`, `promptGuard.ts`) must never be modified without explicit owner sign-off and hash manifest recalculation.
  - Disclosure and recording notices can never be bypassed by any role, including `admin`.

---

### 2.3 Prepaid Wallet & Quota Governance
- **What Already Works**:
  - Prepaid wallet ledger (`wallets`, `wallet_transactions`) funded via Razorpay with 18% GST calculation.
  - Idempotent payment webhook processing using `processed_webhook_events` to reject replay attacks.
  - **Master Plan Section 18.9 Invariant**: Active voice calls are **NEVER terminated mid-call** when quota or spend limit is reached.
  - New subsequent calls are politely gated when balance is exhausted.
  - Reliability Score engine: customers with score > 80 unlock 50 free emergency buffer minutes with 30-day cooldown.
- **What Must NOT Break**:
  - *Future changes must preserve this behavior unless explicitly authorized.*
  - Quota checks must continue to allow active calls to finish gracefully without abrupt disconnections.
  - Razorpay webhook processing must remain strictly idempotent.

---

### 2.4 Virtual Number Lifecycle (Section 18.7)
- **What Already Works**:
  - Virtual numbers run on a 30-day active validity cycle.
  - Immediate neutral unavailable audio plays upon expiration (no 90-day cooling).
  - 15-day grace period allows owner retention and one-click reactivation.
  - 14-day administrative hold quarantines numbers before release back to the pool.
  - Daily missed-call summaries aggregate calls received during grace and hold, dispatching summaries to the owner.
  - Priority auction bidding enables users to place bids on expiring numbers.
- **What Must NOT Break**:
  - *Future changes must preserve this behavior unless explicitly authorized.*
  - The neutral unavailable message must continue to play immediately upon number expiration.
  - Numbers in grace or hold must never be prematurely reassigned to other customers before the hold duration expires.

---

### 2.5 Role Policy, Step-Up Auth & Tenant Isolation
- **What Already Works**:
  - Canonical three-role model (`customer`, `developer_tester`, `admin`) evaluated by `role_policy_service.py`.
  - Developer/tester accounts are programmatically excluded from business revenue (MRR/ARR), call volume, and compliance metrics.
  - Developer/tester accounts are strictly forbidden from viewing customer KYC documents (HTTP 403 Forbidden).
  - Admin idle session timeout is capped at 30 minutes.
  - Privileged actions (KYC view, wallet adjustments, price changes, credentials) require Step-Up Re-Authentication (<= 15 min tokens).
  - Cross-tenant data isolation enforced by PostgreSQL Row Level Security (RLS) on all tables.
- **What Must NOT Break**:
  - *Future changes must preserve this behavior unless explicitly authorized.*
  - Privileged administrative operations must never be exposed without step-up re-authentication.
  - Test accounts must never contaminate production revenue or compliance reporting.

---

### 2.6 Encrypted KYC Vault & Data Minimization
- **What Already Works**:
  - KYC documents encrypted with AES-256-GCM at rest.
  - Pre-signed viewing URLs strictly capped at <= 15 minutes.
  - Every single document decryption or view immutably logged to `kyc_access_audit_logs`.
  - Raw Aadhaar images prohibited by default (`CONFIRM WITH A LAWYER`).
- **What Must NOT Break**:
  - *Future changes must preserve this behavior unless explicitly authorized.*
  - KYC documents must never be served via permanent public URLs.
  - Audit logging of KYC access cannot be disabled or bypassed.

---

### 2.7 In-App GST Invoice Vault
- **What Already Works**:
  - Auto-generation of official GST tax invoices (VAK/ series) with itemized breakdown.
  - Permanent in-app download vault and PDF streaming.
  - CA review workflow capturing tax period audit notes in `invoice_ca_reviews`.
- **What Must NOT Break**:
  - *Future changes must preserve this behavior unless explicitly authorized.*
  - Financial tax invoices must never be deleted or purged during data retention cleanups.

---

### 2.8 Observability & PII Sanitization
- **What Already Works**:
  - Root Python logging filter (`pii_scrubber.py`) automatically intercepts log messages.
  - Regex masking replaces 10-12 digit phone numbers with `[PHONE_MASKED]` and emails with `[EMAIL_MASKED]`.
  - Pre-transmission scrubbing prevents PII leakage to Sentry and BetterStack.
- **What Must NOT Break**:
  - *Future changes must preserve this behavior unless explicitly authorized.*
  - PII scrubbing must execute before log records leave the application boundary.
