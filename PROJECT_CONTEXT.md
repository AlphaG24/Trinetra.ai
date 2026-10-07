# PROJECT_CONTEXT.md — MASTER REPOSITORY CONTEXT & CHANGE-SAFETY GUIDE

# PROJECT CHANGE SAFETY NOTICE
> **"This project contains existing production functionality. Future modifications must preserve existing behavior unless the user explicitly requests a behavior change."**
> 
> **EXISTING FUNCTIONALITY HAS PRIORITY OVER NEW FUNCTIONALITY.**
> 
> Any developer or AI coding assistant interacting with this codebase MUST read this document, respect the protected baseline, and follow the [Future Change Protocol](file:///c:/Users/amart/Downloads/Trinetra.ai-dev%20%281%29/Trinetra.ai-dev/docs/architecture/FUTURE_CHANGE_PROTOCOL.md) before making any code modifications.

---

## 1. What the Product Does
**Trinetra AI** (evolving to global brand **Vaakriti**) is an enterprise, multilingual Conversational Voice AI, Telephony, and Adaptive Agent Platform. Originally built with adaptive educational intelligence (Trinetra Shiksha for mock exam preparation, student assessment, and coaching admissions), the system currently runs a carrier-grade Voice AI infrastructure providing:
- Real-time WebRTC and carrier telephony voice calling (Twilio & Exotel).
- Indic and global multilingual speech processing (Sarvam AI, ElevenLabs, Groq, Gemini).
- Virtual number pooling, bidding auctions, 30-day renewals, 15-day grace, and 14-day hold lifecycles.
- Prepaid wallet & spend limits with **Zero In-Call Disconnection** (Section 18.9).
- Reliability Score engine granting 50 free emergency buffer minutes.
- In-app GST Tax Invoice Vault (VAK/ series) with CA review workflows.
- Encrypted KYC Vault (AES-256-GCM, admin step-up auth, no raw Aadhaar by default).
- Three canonical roles (`customer`, `developer_tester`, `admin`) with metrics exclusion for test accounts.

---

## 2. Technology Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Lucide React, Zustand, SWR, Framer Motion.
- **Backend**: Python 3.11/3.12, FastAPI, Uvicorn, Pydantic, HTTPX, Cryptography.
- **Voice Agent Engine**: LiveKit Agents Python SDK, LiveKit WebRTC Server, Silero VAD.
- **Speech & AI Stack**: Sarvam AI (Indic STT/TTS), ElevenLabs (English TTS), Groq (LLaMA 3.3 70B), Google Gemini 2.0 Flash.
- **Telephony Carriers**: Exotel (India domestic SIP/DID trunking) + Twilio (Global PSTN).
- **Database & Auth**: Supabase PostgreSQL 15 with Row Level Security (RLS), Supabase Auth (SSR Cookies).
- **Payment Gateway**: Razorpay (India launch: UPI, cards, netbanking).
- **Observability**: Sentry, BetterStack Logs & Uptime, Healthchecks.io.

---

## 3. High-Level Architecture
```
User / Caller
  ↓
Edge Network (Vercel / Cloudflare) -> Next.js Middleware (Session & Role Guard)
  ↓
Application Layer:
  ├── Next.js 16 App Router (Client Dashboard / Admin Panel)
  └── FastAPI Backend (Port 8000) & LiveKit Agent Worker (agent.py)
  ↓
Core Service Layer:
  ├── Role Policy Engine (Central exemption evaluation)
  ├── Voice Reliability Service (Stopwatch timing & anti-stall guard)
  ├── Frozen Statutory Disclosure & Outbound Safety Guardrails
  ├── Prepaid Wallet & Spend Limits Engine
  └── Encrypted KYC & BYON Credential Vaults
  ↓
Data & External Providers:
  ├── Supabase PostgreSQL 15 (RLS Enforced, IPv4 Socket Monkey-Patch)
  └── Carriers (Twilio/Exotel), AI (Sarvam/ElevenLabs/Groq), Razorpay
```

---

## 4. Database Architecture
- **Provider**: Supabase PostgreSQL 15 in Mumbai (`ap-south-1`).
- **Direct-Database Mode**: Development and runtime point directly at the owner's primary Supabase project.
- **Zero AI DDL Rule**: The AI assistant MUST NEVER execute write migrations directly. Provide symmetric `up` and `down` SQL scripts for manual application by the owner.
- **Additive Migrations Only**: Never drop, rename, or retype existing columns in production tables.
- **Key Tables**: `profiles`, `organizations`, `wallets`, `wallet_transactions`, `invoices`, `phone_numbers`, `voice_calls`, `agents`, `campaigns`, `campaign_contacts`, `customer_contacts`, `kyc_documents`, `admin_audit_trail`.

---

## 5. Authentication & Authorization
- **Authentication**: Supabase Auth with SSR cookies (`sb-*-auth-token`).
- **Session Bounds**: Regular users have 7-day sliding sessions; Admin idle sessions expire after **30 minutes** (Section 18.4).
- **Three Canonical Roles**: `customer`, `developer_tester`, `admin`.
- **Exemption Engine**: Evaluated by `can_exempt()` in `backend/app/services/role_policy_service.py`.
- **Non-Exemptible Primitives**: AI disclosure, call recording notice, PII redaction, audit logging, MFA, TRAI curfew, and DND scrubbing can NEVER be bypassed by any role.
- **Step-Up Re-Authentication**: Required for admin KYC view, wallet adjustments, price overrides, and carrier credentials.

---

## 6. Major Features Catalog
1. **LiveKit Voice Agent (`agent.py`)**: Real-time WebRTC demo and carrier telephony handling.
2. **Carrier Telephony Adapter**: Inbound and outbound PSTN calls via Twilio & Exotel.
3. **Outbound Campaigns Hub**: Batch CSV dialing with mandatory consent attestation and TRAI curfew checks.
4. **Virtual Number Pool & Auctions**: Provisioning, 30-day renewals, and priority bidding.
5. **Virtual Number Lifecycle (Section 18.7)**: Expiry neutrality, 15d grace, 14d hold, missed-call digests.
6. **Prepaid Wallet & Invoicing**: Razorpay top-ups, 18% GST calculation, VAK/ tax invoice vault.
7. **Reliability Score & Emergency Minutes**: Score > 80 unlocks 50 free emergency buffer minutes.
8. **Encrypted KYC Vault**: AES-256 encryption, short-lived signed URLs, admin-only viewing.
9. **Bring-Your-Own Numbers (BYON)**: Encrypted third-party Twilio / Exotel customer credentials.
10. **Trinetra Shiksha**: Educational assessment catalog, mock exam preparation, and coaching institute admission counselor.

---

## 7. Critical Business Rules
- **Rule 1: Zero In-Call Disconnection**: Active voice calls are NEVER cut off mid-call on quota exhaustion.
- **Rule 2: Frozen Compliance**: Validated compliance files are locked with SHA-256 hashes in CI.
- **Rule 3: Developer/Tester Metrics Exclusion**: Test accounts are programmatically excluded from business revenue (MRR/ARR), call volume, and statutory compliance metrics.
- **Rule 4: Developer/Tester KYC Block**: Test accounts are strictly forbidden from viewing customer KYC documents.
- **Rule 5: Statutory Curfew**: Outbound dialing strictly prohibited outside 09:00 to 21:00 recipient local time.

---

## 8. Critical Dependencies
- `backend/database.py`: IPv4 socket patch preventing 30s connection timeout storms.
- `backend/app/services/role_policy_service.py`: Central source of truth for all role permissions.
- `backend/app/services/disclosure_service.py` (**FROZEN**): Mandatory AI identity and recording notices.
- `backend/app/services/outbound_safety_guardrails.py` (**FROZEN**): TRAI curfew and DND scrubbing.
- `frontend/src/middleware.ts`: Universal edge route guard with 8s timeout race protection.

---

## 9. Protected Components
- **Level 1 (Critical)**: Auth middleware, RLS policies, frozen compliance files, role policy engine, wallet zero-disconnect invariant.
- **Level 2 (High Risk)**: LiveKit agent worker, anti-stall timing guard, virtual number lifecycle, Razorpay webhooks, encrypted KYC vault.
- **Level 3 (Moderate)**: Campaign manager, support tickets, BYON vault, caller rights DSAR, PII log scrubber.
- **Level 4 (Low Risk)**: Landing page marketing copy, blog posts, UI styles.

---

## 10. Known Limitations
- Vercel serverless functions have a 60-second execution cap; real-time audio streams run exclusively on Render/Vultr backend via WebSocket.
- Default carrier telephony trunks enforce a 5–10 concurrent call limit without pre-provisioned increases.
- Direct PostgreSQL connections without PgBouncer should not exceed 60 simultaneous connections.

---

## 11. Known Bugs
- Missing `livekit-plugins-google` in global Python environments causes collection errors on tests that import `agent.py`; resolved by activating the project virtualenv.
- `typescript.ignoreBuildErrors: true` in `next.config.ts` allows Next.js builds despite minor legacy type mismatches.
- Deprecated FastAPI startup/shutdown handlers emit warnings but remain functional.

---

## 12. Performance Constraints
- Tool queries during voice calls must return within 700ms or trigger conversational fillers to prevent dead air.
- Hard timeout cap for database tools is 5.0 seconds.
- Dead-air watchdog triggers after 5.0 seconds of conversation silence.

---

## 13. Security Constraints
- No secrets committed to git (enforced by pre-commit hooks).
- No sensitive PII in console logs (enforced by `pii_scrubber.py`).
- Content Security Policy in `next.config.ts` restricts script and connect domains.
- All admin actions write immutable records to `admin_audit_trail`.

---

## 14. Deployment Architecture
- **Git Branches**: `main` = production (locked to Vercel), `dev` = integration. Feature branches stem from `dev`.
- **Zero-Force-Push Rule**: NEVER run `git push --force` or `git reset --hard`. Rollback via `git revert` or hosting console artifact redeploy.
- **Domain**: Production domain is `trinetraedu-ai.com`. Rebranding to `vaakriti.com` scheduled for Phase 5.5.

---

## 15. Testing Requirements
- Every change must verify compliance file integrity: `python scripts/verify_frozen_files.py`.
- Run pytest on affected test modules in `backend/tests/`.
- Verify against the 32-point Critical Regression Test List in `docs/architecture/TESTING_BASELINE.md`.

---

## 16. Rules for Future Changes
1. Understand the goal before touching code.
2. Search the existing implementation; never assume something is missing.
3. Identify the smallest safe change.
4. Prefer additive extension over refactoring.
5. Never redesign existing UI screens.
6. Follow the 12-step protocol in `docs/architecture/FUTURE_CHANGE_PROTOCOL.md`.
7. Log every modification in `CHANGE_SAFETY_LOG.md`.
