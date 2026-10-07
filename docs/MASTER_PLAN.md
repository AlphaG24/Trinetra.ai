# 📘 TRINETRA AI — MASTER PRODUCTION IMPLEMENTATION PLAN

**Version 1.2 | Locked: October 4, 2026 | Owner: Ketan Singh Rathour**

**Status:** APPROVED — Authoritative Source of Truth (Section 18 Overrides)
**Scope:** Global (not India-restricted)
**Review Cycle:** Weekly until Phase 5 complete; monthly thereafter

---

## 🎯 Section 0: Foundational Principles

These are non-negotiable rules that govern every decision below. If a future feature conflicts with any of these, the feature gets redesigned—not the principle.

1. **Global by Default:** Every feature must work for a customer in Mumbai, London, São Paulo, or Jakarta. India is the launch market, not the design constraint.
2. **Trust Before Revenue:** Grace periods, free emergency minutes, and generous refund policies take priority over short-term revenue.
3. **Compliance is Code:** KYC, consent, DND/TCPA, and data retention are enforced by the system, not by policy documents.
4. **Data Minimization:** Collect only what's needed. Delete what's not required. Mask what must be logged.
5. **Fail Safe, Not Silent:** When the AI can't reach a provider, or a payment fails, or a limit is hit—log it, alert it, and never fail silently.
6. **Verify Before Trust:** Every deployment must be verified in the running container (not just the local source) before any claim of "done."

---

## 📋 Section 1: Confirmed Decisions Log

All decisions made in this project. This is the single source of truth.

### 1.1 Product & Pricing

| # | Decision | Locked Value |
|:---|:---|:---|
| P1 | Free trial tier | 1 agent, 10 min quota, web-call only, half dashboard, no KB, no number purchase |
| P2 | ₹99 trial tier | Full dashboard, 7 days, 50 min quota, can buy & assign numbers, 2 agents limit (editable via admin panel) |
| P3 | Credit-based plans | Admin-editable pricing; prepaid wallet |
| P4 | Outcome-based plans | Admin-editable per-outcome pricing (e.g., ₹49/appointment); prepaid wallet |
| P5 | Plans are exclusively chosen per customer | Not a both-ways toggle |
| P6 | Overage rate | ₹10–₹12/min (final value in admin panel) |
| P7 | Free emergency minutes | 50 free overdraft buffer minutes when quota reaches 100%, strictly requiring Reliability Score > 80 and 30-day cooldown; admin-editable; audit logged; zero mid-call disconnect. "Reliability Score" replaces "credit score" everywhere; rules transparent and visible to the user. |
| P8 | Spend limit | ₹2,500 default; admin can override per customer |
| P9 | Onboarding fee | Not active now; enabled via admin toggle; shown in pricing plan editor |
| P10 | Number limits | Pooled across all customer numbers; no per-number cap |
| P11 | Currency | Multi-currency aware (INR, USD, EUR) — pricing editable in admin |

### 1.2 Number Lifecycle

| # | Decision | Locked Value |
|:---|:---|:---|
| N1 | Active period | 30 days |
| N2 | Grace period | 15 days (number stops answering agent calls; callers hear neutral "currently unavailable" message; alternate day reminders; owner retains number) |
| N3 | Expiry & Hold period | No 90-day cooling. At expiry, callers hear neutral "currently unavailable" message; owner keeps number through 15-day grace, then configurable administrative hold (default 14 days) before permanent pool release. Missed calls logged, counted, and summarized to owner with reactivation link. |
| N4 | Reminder schedule | Day 1, 7, 14, 21, 28 via email + WhatsApp |
| N5 | Re-activation during grace/hold | Allowed via one-click reactivation link + immediate renewal |
| N6 | Auto-pool expansion | Triggered when available numbers < 10 |
| N7 | Telephony providers | Exotel (India), Twilio (Global) |
| N8 | CLI policy | Never spoof; display assigned virtual number only |
| N9 | Call forwarding | CFU (unconditional) default; porting premium. Support ticket system in admin panel and support panel with pre-configured request types.|

### 1.3 KYC & Compliance

| # | Decision | Locked Value |
|:---|:---|:---|
| K1 | KYC required at | Number purchase only (not at signup, not for dashboard) |
| K2 | KYC documents | Country-specific (India: Masked Aadhaar/PAN/GST; Global: Passport/National ID/Company Registration). Raw Aadhaar images/numbers NOT stored by default (CONFIRM WITH A LAWYER). |
| K3 | KYC storage | AES-256 at rest, TLS 1.3 in transit |
| K4 | KYC access | Restricted strictly to admin role with privileged step-up re-authentication; developer_tester accounts forbidden from viewing. Short-lived signed URLs (<= 15 min), every view immutably audit-logged. |
| K5 | KYC auto-sync | From purchase flow to profile page (upload once, use everywhere) |
| K6 | AI disclosure | Mandatory at call start ("Arika from Trinetra, an AI assistant"); logged in `voice_calls.disclosure_played` |
| K7 | Call recording consent | Mandatory prompt ("service quality notice"); call not recorded without consent |
| K8 | Data residency | India data in Mumbai; global data in nearest region |
| K9 | Data retention | Statutory billing records kept for full statutory tax period (CONFIRM WITH CA); customer deal records/transcripts minimized after 90–180 days; audit logs immutable and never deleted. |

### 1.4 Access Control

| # | Decision | Locked Value |
|:---|:---|:---|
| A1 | Roles | Three roles: `customer`, `developer_tester`, `admin`. All exemptions handled in central policy function; developer_tester excluded from business metrics. |
| A2 | MFA | Required for admin and developer_tester; optional for customers |
| A3 | Session timeout | Admin: 30 minutes idle timeout with step-up re-authentication for sensitive actions; Users: 7 days |
| A4 | Audit logging | Every KYC view, price change, wallet adjust logged |
| A5 | Rate limits | Login: 5/10min; API: 60/min/user; Calls: 5/min/number (editable per user via admin for call center workloads) |

### 1.5 Monitoring & Operations

| # | Decision | Locked Value |
|:---|:---|:---|
| M1 | Uptime monitoring | BetterStack (chosen over Uptime Kuma, Vercel CLI, PostHog) |
| M2 | Error tracking | Sentry (backend + frontend) with strict pre-transmission PII scrubber |
| M3 | Cron monitoring | Healthchecks.io |
| M4 | Admin dashboard | Single-pane-of-glass for ops, billing, monitoring, audit |
| M5 | Alerts | Telegram + email for P1 incidents |

### 1.6 Billing & Payments

| # | Decision | Locked Value |
|:---|:---|:---|
| B1 | Wallet model | Prepaid wallet; funded via Razorpay (UPI, cards, netbanking) for launch. Zero card numbers stored. Stripe and global tax engines deferred post-launch. |
| B2 | Subscription charge | Separate from wallet; auto-debit or manual |
| B3 | Failed payment flow | 3 retries over 3 days → 15-day grace → administrative hold → release |
| B4 | Invoice delivery | Email + WhatsApp (India) + permanent in-app invoice vault |
| B5 | Credit rollover | 180 days (per refund policy revision) |
| B6 | GST invoicing | Auto-generated official GST tax invoices (VAK/ series) reviewed by CA (CONFIRM WITH CA) |

---

## 🏗️ Section 2: System Architecture (Production)

```
┌──────────────────────────────────────────────────────────────────┐
│                    VERCEL (Global Edge)                          │
│                    Frontend: Next.js 16 App Router               │
│                    + Vercel Pro ($20/mo)                         │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ├───▶ SUPABASE PRO ($25/mo) — Postgres + Auth + Storage
               │
               └───▶ VULTR MUMBAI ($48/mo, 4vCPU/8GB)
                    ├── FastAPI Backend
                    ├── Python LiveKit Agent
                    ├── Self-Hosted LiveKit Server
                    └── Postgres read-replica (optional)

External Services:
  ├── LiveKit Cloud (fallback/scale)
  ├── Exotel (India telephony) + Twilio (Global)
  ├── Sarvam AI (Indic TTS/STT) + ElevenLabs (Global TTS)
  ├── Groq (LLM, low latency)
  ├── Razorpay (Launch payments; Stripe deferred post-launch)
  ├── BetterStack (uptime) + Sentry (errors) + Healthchecks.io (cron)
  └── Redis/Upstash (caching + rate limiting)
```

**Estimated monthly run cost:** $93 fixed + AI APIs (~$50–$300 variable).

---

## 🌍 Section 3: Global Compliance Strategy

The system enforces **region-specific rules automatically** based on customer location and called-party number.

| Region | KYC Required | DND/Consent Rule | Expiry Handling (Grace & Hold) | Recording Consent | Retention |
|:---|:---|:---|:---|:---|:---|
| **India** | Masked Aadhaar/PAN/GST (raw Aadhaar prohibited) | TRAI TCCCPR; DND scrub; 09:00–21:00 | 15d grace + 14d hold (no 90d cooling; neutral unavailable message) | Audible disclosure required | Statutory billing: tax statutory period (CONFIRM WITH CA); deals: 90–180d |
| **USA** | Business EIN/ID | TCPA written consent; 08:00–21:00 local | 15d grace + hold (neutral unavailable message; UNVERIFIED, check provider terms) | 2-party consent states require explicit opt-in | Statutory billing: IRS period; deals: 90–180d |
| **EU/UK** | Company registration | GDPR consent; PECR | 15d grace + hold (neutral unavailable message; UNVERIFIED, check provider terms) | Explicit opt-in for recording | Statutory billing: statutory period; deals: 90–180d |
| **Middle East** | National ID/Trade License | Varies by country | 15d grace + hold (neutral unavailable message; UNVERIFIED, check provider terms) | Disclosure required | Statutory billing: statutory period; deals: 90–180d |
| **SEA** | Local business ID | Varies (Singapore PDPA, Indonesia PDP Law) | 15d grace + hold (neutral unavailable message; UNVERIFIED, check provider terms) | Consent required | Statutory billing: statutory period; deals: 90–180d |

**Implementation:** A `regions` table stores rules; the system looks up rules at call time based on `+country_code`. Admin can override per customer.

---

## 🚀 Section 4: The Five-Phase Implementation Plan

Each phase ends with a **validation gate**. Do not proceed until the gate passes.

---

### 🛡️ PHASE 1: Security & Compliance Foundation
**Duration:** 2 weeks | **Priority:** CRITICAL

| # | Task | Validation Criteria |
|:---|:---|:---|
| 1.1 | Verify AI disclosure prompt plays on every call (already implemented) | 5 test calls → `voice_calls.disclosure_played = true` for all |
| 1.2 | Implement region-aware AI disclosure text (multi-language) | Test India, US, EU calls → correct language variant plays |
| 1.3 | Add recording consent prompt (region-aware) | Consent refused → call not recorded; consent granted → recorded + logged |
| 1.4 | PII redaction in all logs (Python + Next.js) | Search logs for digits → phone numbers masked |
| 1.5 | Create `audit_logs` table + logging for all admin actions | KYC view, price edit, wallet adjust → logged with IP + timestamp |
| 1.6 | MFA (TOTP) for admin account | Login from new device → TOTP challenge required |
| 1.7 | Session timeout: admin 30m idle, user 7d | Idle timeout verified |
| 1.8 | Sentry DSN fixed (backend + frontend) | Triggered error appears in Sentry within 60s |
| 1.9 | BetterStack monitors live (5 endpoints) | All green on status page |
| 1.10 | Healthchecks.io for 3 cron jobs (cleanup, scheduler, pool expand) | Job stops → alert fires |
| 1.11 | Rate limiting: login (5/10min), API (60/min/user), calls (5/min/number) | 429 after threshold |
| 1.12 | `spend_limit` column added (default 2500) | Admin can override per customer |
| 1.13 | Region-aware KYC schema (India: PAN/Masked Aadhaar/GST; Global: passport/company ID) | Test account in each region can submit correct docs |

**✅ Phase 1 Gate:** Full security audit runs with zero high-severity findings. All compliance logs verifiable.

---

### 💰 PHASE 2: Wallet, Billing & Pricing Engine
**Duration:** 2 weeks | **Priority:** CRITICAL

| # | Task | Validation Criteria |
|:---|:---|:---|
| 2.1 | `wallets` table: user_id, balance, currency, last_topup | Balance reflects after top-up |
| 2.2 | Razorpay checkout (UPI, cards, netbanking; Stripe deferred) | ₹1,000 test payment succeeds |
| 2.3 | Real-time overage deduction from wallet | Simulated call → balance decrements at correct rate |
| 2.4 | Spend limit enforcement (₹2,500 default, admin override) | Set to ₹500 → subsequent calls blocked with notice; active call never cut |
| 2.5 | Free emergency minutes (50) credit on 100% quota hit (Reliability Score > 80, 30d cooldown) | Simulate → 50 min added, audit logged; zero in-call disconnect |
| 2.6 | Thoughtful "we care" message on free-minute trigger (multi-language) | Email + WhatsApp received |
| 2.7 | Credit pack purchase flow (admin-defined packs) | Manual purchase adds minutes to balance |
| 2.8 | Subscription renewal (auto-debit + manual) | Both paths tested |
| 2.9 | Outcome-based plan engine | Calendar event created → ₹49 deducted |
| 2.10 | Free trial (10 min) + ₹99 trial (50 min, 7d) | Both enforce their limits |
| 2.11 | Invoice PDF with GSTIN + region-aware tax (VAK/ series) | Download + email delivery verified; reviewed by CA (CONFIRM WITH CA) |
| 2.12 | Invoice delivery: Email + WhatsApp (India) + permanent in-app vault | Received on both channels and visible in dashboard |
| 2.13 | Failed payment flow: 3 retries → 15-day grace → admin hold → release | Simulated failure follows correct sequence |
| 2.14 | Admin pricing editor (create/edit/deactivate plans) | New plan appears in user-facing list |
| 2.15 | Credit rollover 180 days (updated from 30) | Rolling expiry tested |
| 2.16 | Admin toggle: onboarding fee (off by default) | Toggled on → appears in checkout |

**✅ Phase 2 Gate:** Complete customer journey works: signup → trial → top-up → subscription → overage → renewal → invoice → cancel → refund.

---

### 📞 PHASE 3: Number Lifecycle & Pool Management
**Duration:** 1 week | **Priority:** HIGH

| # | Task | Validation Criteria |
|:---|:---|:---|
| 3.1 | Active period (30d) + Grace (15d) + Admin Hold (14d; no 90d cooling; neutral message) | Compressed test passes; neutral audio plays upon expiry |
| 3.2 | Reminder sequence: Day 1, 7, 14, 21, 28 via email + WhatsApp | All 5 reminders received |
| 3.3 | Dashboard countdown timer for expiry | Accurate countdown displayed |
| 3.4 | Auto-purchase when pool < 10 numbers | Threshold triggers auto-order via Exotel/Twilio API |
| 3.5 | Re-activation during grace/hold (one-click reactivation + renewal) | Reactivation succeeds without lost ownership |
| 3.6 | Pool status dashboard (Available/Assigned/Grace/Hold counts) | Admin sees real-time counts |
| 3.7 | Multi-provider number assignment (Exotel India / Twilio Global) | Region-based provider selection |
| 3.8 | Pooled quota across all customer numbers | 3 numbers → 1,000 min shared |
| 3.9 | CLI integrity check (never spoof) | Attempt to spoof → blocked with audit log |
| 3.10 | CFU (call forwarding) setup wizard & support ticket system | Customer completes forwarding or requests ticket |

**✅ Phase 3 Gate:** Full lifecycle test from assignment → usage → expiry → grace → hold → re-allocation.

---

### 🔐 PHASE 4: KYC & Document Management
**Duration:** 1 week | **Priority:** HIGH

| # | Task | Validation Criteria |
|:---|:---|:---|
| 4.1 | KYC page in user profile with region-aware fields (raw Aadhaar prohibited) | India: PAN/Masked Aadhaar/GST; Global: Passport/Company ID |
| 4.2 | KYC required only at number purchase | Dashboard accessible without KYC |
| 4.3 | Auto-sync: purchase-flow upload → profile | Same doc appears in both places |
| 4.4 | AES-256 at rest, TLS 1.3 in transit | Verify via DB inspection |
| 4.5 | Access restricted strictly to `admin` with step-up auth (`developer_tester` forbidden) | Non-admin and developer_tester get 403 |
| 4.6 | KYC status tracking: pending / verified / rejected / expired | Admin can flip; user sees correct label |
| 4.7 | Provider API integration (Exotel KYC India; Twilio Trust Hub Global) | Real sandbox submission → approval flow |
| 4.8 | KYC document retention: strictly assigned number duration + provider statutory rule | Scheduled job cleans expired docs |
| 4.9 | Every KYC view logged in `audit_logs` | Admin views → immutable audit row created |
| 4.10 | Alert on KYC expiry (KYC valid 2 years typical) | 30-day reminder before expiry |

**✅ Phase 4 Gate:** Complete KYC flow end-to-end with both Exotel and Twilio sandboxes.

---

### 🎛️ PHASE 5: Admin Panel & Operations Hub
**Duration:** 2 weeks | **Priority:** CRITICAL

| # | Task | Validation Criteria |
|:---|:---|:---|
| 5.1 | Pricing plan editor (create/edit/deactivate) | New plans appear for users |
| 5.2 | Per-customer spend limit override | Override enforced |
| 5.3 | Per-customer pricing plan override | Custom plan applies |
| 5.4 | Audit log viewer with filters (user, action, date, IP) | Filter works |
| 5.5 | Uptime widget (BetterStack API poll) | Live status visible |
| 5.6 | Errors widget (Sentry API poll) | Last 10 errors shown |
| 5.7 | Customer overview: minutes used, wallet, plan, KYC status | Accurate for all test accounts |
| 5.8 | Manual pause/resume agent | Pause → calls rejected |
| 5.9 | Manual credit adjustment (+/- minutes) | Adjust +100 → user balance updates |
| 5.10 | Wallet manual credit/debit | Admin debit ₹500 → balance drops |
| 5.11 | Region config editor (DND hours, cooling period, KYC type) | Edit India → India rules change |
| 5.12 | Number pool management UI | Admin can add/remove numbers |
| 5.13 | Invoice manual send/re-send | Trigger invoice re-send to WhatsApp/email |
| 5.14 | Refund processor | Approve refund → user notified → wallet/subscription adjusted |
| 5.15 | Revenue dashboard (MRR, ARR, churn, overage) | Numbers match source data |
| 5.16 | Alert config panel (Telegram webhook, email groups) | Send test alert → received |
| 5.17 | KYC document viewer with access logging | Every view logged |

**✅ Phase 5 Gate:** You can operate the entire business from the admin panel without touching the database.

---

## 🧭 Section 5: Global-Ready Design Notes

Since the platform is **for anyone, anywhere**:

1. **Currency:** Show prices in local currency (INR ₹, USD $, EUR €, AED د.إ, etc.) using `Intl.NumberFormat`. Admin sets conversion rates or pulls daily from an FX API.
2. **Language:** UI + AI prompts support EN, HI, Hinglish, and (roadmap) ES, AR, ID, PT.
3. **Timezone:** All timestamps stored in UTC; displayed in customer's local time.
4. **Calling hours:** Enforced per customer's country, not a global window.
5. **Payment methods:** Razorpay (India: UPI, cards, netbanking), Stripe (Global: cards, SEPA, ACH), PayPal (fallback for others).
6. **KYC types:** Config-driven per country. Do not hardcode Aadhaar/PAN.
7. **Number procurement:** Exotel for India, Twilio for the rest. Future: add Telnyx for cost optimization.
8. **Data residency:** India → Mumbai region; EU → Frankfurt/Dublin; US → Ohio/California. Managed via Supabase project per region (start with Mumbai + one global fallback).

---

## 📊 Section 6: Monitoring & Alerting Stack (Final)

| Layer | Tool | Purpose | Free Tier Limits |
|:---|:---|:---|:---|
| **Uptime** | BetterStack | HTTP/TCP/WebSocket monitors | 10 monitors, 3-min interval |
| **Errors** | Sentry | Backend + Frontend exceptions | 5K errors/mo |
| **Cron jobs** | Healthchecks.io | Cleanup, scheduler, pool expand | 20 checks |
| **Log aggregation** | BetterStack Logs | Centralized log search | 1 GB/mo |
| **Alerts** | Telegram Bot + Email | P1/P2 notifications | Free |
| **Metrics (roadmap)** | Prometheus + Grafana (self-host on Vultr) | Deeper metrics | Free (uses VPS) |

**Monitors to set up Day 1:**
1. `https://trinetraedu-ai.com` — homepage
2. `https://api.trinetraedu-ai.com/health` — backend
3. LiveKit WebSocket ping
4. Supabase DB connection (every 5 min)
5. Razorpay/Stripe webhook endpoint
6. SSL cert expiry (30-day warning)
7. DNS resolution check

---

## 💼 Section 7: Legal & Financial Prerequisites

**Must complete before charging any customer:**

- [ ] Company incorporation (LLP or Pvt Ltd) — currently a proprietary concern
- [ ] GST registration (required for B2B invoicing in India)
- [ ] Business PAN (separate from personal PAN)
- [ ] Razorpay/Cashfree merchant account (India)
- [ ] Stripe merchant account (Global)
- [ ] Legal review of: Refund Policy (with 5% threshold + 180-day rollover updates), Privacy Policy, Terms of Service, DPA
- [ ] Trademark filing for "Trinetra AI" (Class 9, 42)
- [ ] Data Processing Agreements signed with: Supabase, Vultr, LiveKit, Exotel, Twilio, Sarvam, Groq, Razorpay, Stripe
- [ ] Cyber liability insurance (recommended once >500 customers)
- [ ] CERT-In empaneled auditor engagement (annual, required for India)

---

## 🗺️ Section 8: Rollout Timeline & Milestones

| Week | Phase | Milestone |
|:---|:---|:---|
| 1–2 | Phase 1 | Security audit passes; no PII in logs; monitoring live |
| 3–4 | Phase 2 | Full billing flow tested end-to-end with a real customer |
| 5 | Phase 3 | Number lifecycle automation working; pool expansion live |
| 6 | Phase 4 | KYC flow verified with Exotel + Twilio sandbox |
| 7–8 | Phase 5 | Admin panel operational; you can run the business solo |
| 9 | Pre-launch | Legal sign-off; DPA signed; SLA documented |
| 10 | **SOFT LAUNCH** | 10 founding customers onboarded |
| 11–14 | Iterate | Fix onboarding friction; collect NPS |
| 15+ | **PUBLIC LAUNCH** | Marketing begins; onboarding automated |

**Founding Customer Program:** First 100 customers get onboarding fee waived, priority support, and a public "Founding Customer" badge. In exchange: 30-minute feedback call + testimonial.

---

## 🧪 Section 9: Validation Log (Fill As You Go)

For each task completed, log:

```
[Date] | [Phase.Task#] | [Status: ✅/⚠️/❌] | [Validated by] | [Notes]
```

**Examples:**
```
2026-10-05 | 1.1 | ✅ | Ketan | 5 test calls, all logged correctly
2026-10-07 | 1.4 | ⚠️ | Ketan | Redaction works but missing on 2 legacy log lines
2026-10-08 | 1.4 | ✅ | Ketan | Fixed; re-verified
```

Keep this log in `docs/VALIDATION_LOG.md` in the repo. It becomes your audit trail.

---

## 🚀 Section 10: Readiness Checklist (Sign-Off Before Phase 1)

- [ ] `feature/voice-pipeline-improvements` merged to `dev`, then `main`
- [ ] `ENABLE_HSTS=true` set in Vercel production
- [ ] Sentry DSN fixed (backend + frontend)
- [ ] Supabase Pro upgraded (Mumbai region confirmed)
- [ ] Vultr Mumbai server provisioned (4 vCPU / 8 GB)
- [ ] BetterStack account created (5 monitors)
- [ ] Healthchecks.io account created (3 checks)
- [ ] Razorpay/Cashfree merchant account approved
- [ ] Stripe account approved (Global)
- [ ] Exotel + Twilio sandbox accounts ready
- [ ] Company incorporation filed (LLP or Pvt Ltd)
- [ ] GST registration active
- [ ] Legal review of refund/privacy/ToS/DPA scheduled
- [ ] Refund Policy updated: 5% threshold + 180-day rollover
- [ ] `docs/VALIDATION_LOG.md` created in repo
- [ ] This document saved as `docs/MASTER_PLAN.md` in the repo

---

## 📌 Section 11: What This Plan Does NOT Cover (Deferred)

Explicitly out of scope for now. Revisit after public launch:

- **AI model fine-tuning** on customer data (privacy implications)
- **Voice cloning** (deepfake risk; only after strong KYC + consent)
- **On-premise deployment** for enterprise customers
- **White-label reseller program** (requires partner agreement template)
- **Marketplace for third-party agent templates**
- **Mobile apps** (iOS/Android) — web-first for now
- **Multi-tenant sub-organizations** (agencies managing multiple clients)
- **Advanced analytics** (call sentiment, competitor benchmarking)
- **International expansion beyond Twilio regions**

---

# 📘 MASTER PLAN v1.1 ADDENDUM — Sections 12–17

*Append the following sections below Section 11 of the existing master plan. These become the governing rules and updated strategy for Vaakriti (formerly Trinetra AI).*

---

## 🔒 Section 12: Four Governing Rules (v1.1 — Non-Negotiable)

These four rules sit above all other rules. They cannot be modified, bypassed, or weakened by any feature, refactor, or deployment unless the owner issues explicit written approval.

---

### 🧊 Section 12.1: RULE #1 — Frozen Security Rules

**Rule:** Once a security, compliance, or privacy rule is implemented and validated, it is **FROZEN**. No subsequent feature, refactor, or deployment may change, bypass, or weaken it.

#### Enforcement Mechanism

**Step 1 — Code Marker**
Every security file begins with a header:
```python
# ═══════════════════════════════════════════════════════════════
# FROZEN: Security & Compliance Rules — DO NOT MODIFY
# Owner: [Owner Name]
# Frozen on: [Date]
# Change requires written approval from owner.
# ═══════════════════════════════════════════════════════════════
```

**Step 2 — Frozen Files Registry**

| File Path | Purpose |
|:---|:---|
| `backend/app/services/disclosure_service.py` | Mandatory AI disclosure & consent composition |
| `backend/app/services/outbound_safety_guardrails.py` | Outbound compliance, DND scrubbing, calling hours floor |
| `backend/app/services/ai/prompt_guard.py` | Prompt injection protection & hallucination guardrails |
| `frontend/src/lib/safety/promptGuard.ts` | Frontend prompt safety guardrails |
| `docs/compliance/FROZEN_FILES_MANIFEST.json` | Deterministic SHA-256 baseline hash manifest |

*Note on Agent Architecture:* `backend/agent.py` is NOT partial-frozen. The agent cleanly imports frozen modules. Application brand names reside strictly in configuration constants, not inside frozen code files.

**Step 3 — Baseline Hash File**
`docs/compliance/FROZEN_FILES_MANIFEST.json` stores deterministic SHA-256 hashes:
```json
{
  "manifest_version": "1.0",
  "files": {
    "backend/app/services/disclosure_service.py": "<sha256>",
    "backend/app/services/outbound_safety_guardrails.py": "<sha256>",
    "backend/app/services/ai/prompt_guard.py": "<sha256>",
    "frontend/src/lib/safety/promptGuard.ts": "<sha256>"
  }
}
```

**Step 4 — CI & Code Ownership Verification**
GitHub Action `verify-frozen.yml` and `.github/CODEOWNERS` block unauthorized modifications. Any uncommitted or unauthorized edit fails the build.

**Step 5 — Emergency Unfreezing Process (Owner Only)**
1. Owner issues explicit written instruction
2. Developer updates the module and runs tests
3. Developer updates `docs/compliance/FROZEN_FILES_MANIFEST.json`
4. Developer logs change in `docs/VALIDATION_LOG.md` with reason, approver, and date
5. Owner reviews and approves; CI passes

**Why this matters:** Rapid feature development often inadvertently weakens security. This rule prevents silent regressions.

---

### 🧪 Section 12.2: RULE #2 — Developer/Tester Exemptions

**Rule:** The `developer_tester` role exists solely to build, test, and verify features. All role exemptions pass through ONE central policy function (`evaluate_role_exemptions`). Security primitives are never bypassed.

#### Exemptions Matrix

| Rule | Customer | `developer_tester` | `admin` |
|:---|:---:|:---:|:---:|
| Spend limit (₹2,500 default) | ✅ Enforced | ❌ Unlimited (test only) | ❌ Unlimited |
| Quota limits (minutes) | ✅ Enforced | ❌ Unlimited (test only) | ❌ Unlimited |
| Rate limits (login/API/calls) | ✅ Enforced | ⚠️ 10x relaxed | ⚠️ 10x relaxed |
| KYC requirement | ✅ Required | ❌ Sandbox/test numbers only (never real numbers) | ❌ Sandbox only |
| Number cooling / grace period | ✅ Enforced | ❌ Sandbox only | ❌ Sandbox only |
| Wallet balance required | ✅ Required | ❌ Auto-funded sandbox | ❌ Auto-funded sandbox |
| KYC Document Access | ✅ Own docs | ❌ **STRICTLY FORBIDDEN** | ✅ Re-auth Required |
| Metric Tracking (MRR/ARR/Calls) | ✅ Included | ❌ **EXCLUDED FROM METRICS** | ❌ **EXCLUDED** |
| AI disclosure at call start | ✅ Played | ✅ **Played** | ✅ Played |
| PII redaction in logs | ✅ Enforced | ✅ **Enforced** | ✅ Enforced |
| Audit logging | ✅ Enforced | ✅ **Enforced** | ✅ Enforced |
| MFA | Optional | ✅ **Required** | ✅ Required |

**Key principle:** Security primitives (disclosure, PII redaction, audit logging, MFA) are **never bypassed** — even for developer or admin accounts. Test accounts are programmatically excluded from business revenue and statutory compliance metrics.

**Implementation:**
- `role` field in `profiles`: `customer` | `developer_tester` | `admin`
- Central exemption function in `backend/app/services/role_policy_service.py` and `frontend/src/lib/safety/rolePolicy.ts`
- Dev/test accounts visually distinct in admin panel (purple border, "TEST" badge)

**Mandatory Test Accounts (create on Day 1):**

| Account | Role | Purpose |
|:---|:---|:---|
| `dev-test-free` | developer_tester | Verify free tier limits |
| `dev-test-paid` | developer_tester | Simulate Growth plan usage |
| `dev-test-enterprise` | developer_tester | Simulate Business plan with high volume |

**Access rule:** Only two humans have `admin` or `developer_tester` accounts — you and your co-developer. All others are `customer`.

---

### 🚀 Section 12.3: RULE #3 — SEO & AI Discoverability

**Rule:** Maximize organic search discoverability and AI citation without unverified marketing claims. Zero speculative guarantees (avoid unsubstantiated claims like "10x cheaper", "rank #1", or unverified language claims). Use target benchmarks, not guarantees. Maintain a truthful `/llms.txt` listing features that exist today, clearly marking roadmap items.

#### 12.3.1 Technical SEO (Phase 1 Deliverables)

| # | Task | Validation |
|:---|:---|:---|
| SEO-1 | Unique `<title>` per page with primary keyword | View source check on 10 pages |
| SEO-2 | Unique meta description (150–160 chars) per page | SEO audit tool |
| SEO-3 | Open Graph + Twitter Card tags on every page | Facebook debugger + Twitter card validator |
| SEO-4 | Canonical URLs to prevent duplicate content | View source |
| SEO-5 | Dynamic `sitemap.xml` (submitted to Google + Bing) | Search Console accepted |
| SEO-6 | `robots.txt` with `/dashboard/*` disallowed | URL check |
| SEO-7 | Schema.org: Organization, SoftwareApplication, FAQPage, BreadcrumbList | Rich Results Test passes |
| SEO-8 | Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1 | PageSpeed Insights mobile + desktop |
| SEO-9 | Mobile-first responsive | Chrome mobile emulator |
| SEO-10 | HTTPS + HSTS (production) | SSL Labs A+ rating |
| SEO-11 | Image alt text + lazy loading | Manual audit |
| SEO-12 | Internal linking: home → features → verticals → pricing → blog | Manual review |
| SEO-13 | Breadcrumbs on all secondary pages | Visual + schema check |
| SEO-14 | `/llms.txt` file for AI discoverability | Verify at /llms.txt |

#### 12.3.2 `llms.txt` Template

Place at the root domain (e.g., `https://vaakriti.com/llms.txt`):

```
# Vaakriti AI
> Zero-code, multilingual AI voice agents for businesses globally. Deploy in 60 seconds.

## What Vaakriti Does
- Voice AI agents that answer business calls in 20+ languages, including Hinglish
- Zero-code setup — non-technical business owners can deploy independently
- Vertical-specific templates for real estate, healthcare, restaurants, salons, education
- 10x cheaper than enterprise voice AI platforms

## Key Pages
- Homepage: https://vaakriti.com
- Pricing: https://vaakriti.com/pricing
- Features: https://vaakriti.com/features
- Blog: https://vaakriti.com/blog
- Docs: https://docs.vaakriti.com

## Contact
- Support: support@vaakriti.com
- Sales: hello@vaakriti.com

## Languages Supported
English, Hindi, Hinglish, Tamil, Telugu, Marathi, Bengali, Kannada, Malayalam, Gujarati, Punjabi, Spanish, Arabic, Bahasa, Swahili (roadmap)
```

#### 12.3.3 Content Strategy

| Content Type | Target | Frequency | Owner |
|:---|:---|:---|:---|
| Pillar blog posts (2,000+ words) | Target high-volume keywords | 2/month | Content |
| Vertical landing pages | Real estate, healthcare, restaurants, salons, education | 5 at launch | Content |
| Comparison posts | Vaakriti vs competitors | 1/month | Content |
| Case studies | Real customer stories with metrics | 1/month from Month 2 | Content |
| Location pages | Mumbai, Delhi, Bangalore, London, Dubai | 10 pages | SEO |
| Glossary | 20 key terms (AI agent, TAM, CAC, etc.) | 20 at launch | Content |
| Video content (YouTube) | Product demos, walkthroughs | 2/month | Marketing |

#### 12.3.4 AI-Search Optimization (GEO)

**Objective:** Be cited by ChatGPT, Claude, Perplexity, Gemini.

**Tactics:**
1. **Structured content:** FAQ pages with Q&A format, comparison tables, definition pages — LLMs prefer citable, structured content
2. **Authority signals:** Get mentioned in YourStory, Inc42, Economic Times, Medium, Dev.to, Hacker News
3. **Open-source contributions:** Publish small voice AI tools on GitHub for brand recognition
4. **Reviews:** Get listed on G2, Capterra, Product Hunt with verified reviews
5. **Backlinks:** Guest posts on industry blogs, PR mentions
6. **Author bios:** EEAT signals with verified expertise

**Monthly AI citation test:** Ask ChatGPT, Claude, Perplexity, Gemini: "What are the best AI voice agent platforms for Indian businesses?" and check if Vaakriti appears. Track month-over-month.

#### 12.3.5 SEO Tooling Stack

| Tool | Purpose | Cost |
|:---|:---|:---|
| Google Search Console | Indexing, CTR, ranking | Free |
| Bing Webmaster Tools | Bing + ChatGPT search visibility | Free |
| Ahrefs Webmaster Tools | Backlinks, site audit | Free tier |
| Google Analytics 4 | Traffic analysis | Free |
| Vercel Analytics | Core Web Vitals (RUM) | Included with Pro |
| PageSpeed Insights | Performance audit | Free |
| Schema Markup Validator | Rich results testing | Free |
| Rank tracking (Serpwatcher or similar) | Daily ranking tracking | $29/mo (Month 2+) |

#### 12.3.6 Target Keywords

**Tier 1 (rank #1–3 in 6 months):**
- AI voice agent India
- Hinglish AI receptionist
- Voice AI for SMEs
- Zero-code voice agent
- Vaakriti AI (brand)

**Tier 2 (top 10 in 12 months):**
- AI appointment booking platform
- Best AI calling platform 2026
- Voice bot for clinics / real estate / restaurants
- Multilingual voice agent

**Tier 3 (long-tail, 12–24 months):**
- How to set up AI receptionist
- AI agent for [vertical] in [city]
- Best Hinglish AI voice agent

#### 12.3.7 Success Metrics

| Metric | Month 3 | Month 6 | Month 12 |
|:---|:---|:---|:---|
| Organic sessions/month | 500 | 3,000 | 15,000 |
| Keywords in top 10 | 5 | 25 | 100+ |
| High-authority backlinks | 5 | 25 | 100+ |
| AI engine citations | Manual check | 3+ | 20+ |
| Brand search volume | 100/mo | 1,000/mo | 10,000/mo |

---

### 🎨 Section 12.4: RULE #4 — Complete Rebranding: Trinetra → Vaakriti

**Rule:** Zero traces of "Trinetra" in code, UI, database, infrastructure, or documentation. The platform is **Vaakriti**.

#### 12.4.1 Brand Meaning

- **वाक् (Vaak)** = Speech / Voice
- **कृति (Kriti)** = Creation / Work
- **Vaakriti** = "The Creation of Voice"

Ideal fit for a voice AI platform. Use this story in about page, pitch deck, and brand materials.

#### 12.4.2 Rebranding Scope

| Layer | Change | Verification |
|:---|:---|:---|
| Frontend UI text | All pages, nav, footer, metadata | `grep -ri "trinetra" frontend/` → 0 matches |
| Frontend assets | Logos, favicon, OG images | Files renamed + replaced |
| Backend code | Comments, log prefixes, class names | `grep -ri "trinetra" backend/` → 0 matches |
| Database | Table names, content, labels | SQL audit script |
| Environment vars | `TRINETRA_*` → `VAAKRITI_*` | Server restart verified |
| Domain | `trinetraedu-ai.com` → `vaakriti.com` | DNS + SSL |
| Supabase project | Display name, email templates | Dashboard |
| Email | Sender name, signature, domain | Test send to 3 mailboxes |
| WhatsApp | Business name, templates | Meta Business Manager |
| Invoices | Header, footer, entity name | PDF preview |
| Legal docs | Privacy, ToS, Refund, DPA | All updated |
| Docker images | `trinetra-backend` → `vaakriti-backend` | `docker ps` |
| Deploy scripts | All references | Rebuild tested |
| Analytics | Sentry/BetterStack/GA | Project names |
| Social handles | Instagram, X, LinkedIn, YouTube | All reserved |
| Trademark | File for "Vaakriti" | Legal filing |

#### 12.4.3 Verification Commands (Run Before Sign-Off)

```bash
# Frontend
grep -ri "trinetra" frontend/ --exclude-dir=node_modules --exclude-dir=.next
# Expected: 0

# Backend
grep -ri "trinetra" backend/ --exclude-dir=__pycache__ --exclude-dir=.venv
# Expected: 0

# Env
grep -ri "trinetra" .env* 2>/dev/null
# Expected: 0

# Docker
docker ps --format '{{.Names}}' | grep -i trinetra
# Expected: empty

# Database
psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%trinetra%'"
# Expected: empty
```

---

## 📋 Section 13: Updated Decisions Log (v1.1 Changes)

| # | Decision | v1.0 | v1.1 Update |
|:---|:---|:---|:---|
| P7 | Free emergency minutes | 50 min every month | 50 min **only if Reliability Score > 80**; admin-editable; not automatic |
| N2 | Grace period | Number works during grace | Number **stops working immediately**; neutral unavailable audio; 15d grace + 14d hold |
| N9 | Call forwarding | CFU + porting | + **Support ticket system** with predefined request types |
| K9 | Data retention | 30–180 days | Call audio: **90–180 days**; financial: statutory tax period (CONFIRM WITH CA) |
| A5 | Rate limits | Fixed values | **Admin-editable per user** (for call-center customers) |
| B4 | Invoice delivery | Email + WhatsApp | + **In-app invoice vault** (Razorpay launch) |
| P2 | ₹99 trial | Full dashboard, 7d, 50 min | + **2 agents limit (admin-editable)** |

### 13.1 New Subsystems Introduced

**Reliability Score System (formerly Credit Score):**
- Replaces "credit score" permanently across all UI, database schemas, and documentation
- Starts at 50 for new users
- +10 on-time payment / -20 late / -50 default
- Score > 80 unlocks free emergency minutes (50-minute buffer)
- Visible in user profile with transparent scoring rules and eligibility indicator
- Admin can view/edit scores with full audit logging
- Note: CONFIRM WITH A LAWYER regarding statutory and automated decision compliance

**Support Ticket System:**
- Predefined ticket types: Call Forwarding Setup, Number Porting, KYC Issue, Billing Dispute, Feature Request, Bug Report, Other
- Each type has pre-filled description template
- User clicks → ticket created → admin notified → SLA tracked
- Admin panel: ticket queue with priority + SLA timers

**In-App Invoice Vault:**
- All invoices stored permanently in user dashboard
- Download PDF anytime (GST-compliant invoice templates reviewed by CA)
- Filterable by date, amount, plan
- "Send to WhatsApp" / "Send to Email" buttons

---

## 🌿 Section 14: Branch & Deployment Strategy

**Rule (aligned with Section 18.1):** `main` is production; `dev` is integration. All active development occurs on dedicated feature branches stemmed from `dev`.

### Branch Topology

```
main (production — locked to Vercel production deployment)
  │
  └── dev (integration branch)
       │
       ├── feature/voice-pipeline-improvements
       ├── feature/security-phase-1
       ├── feature/wallet-billing
       ├── feature/number-lifecycle
       ├── feature/kyc-management
       ├── feature/admin-panel
       ├── feature/rebrand-vaakriti
       └── fix/[name]
```

### Workflow

1. **Feature branch** created from `dev` (`git checkout -b feature/<name> dev`)
2. Small, atomic commits with conventional commit messages
3. Pull Request (PR) targeting `dev`
4. Automated CI checks must pass (tests, frozen file integrity, typecheck, lint)
5. Explicit owner review & approval required before merge
6. Merge PR into `dev`
7. After staging verification on `dev`, owner creates release PR from `dev` into `main`
8. Merging into `main` triggers production release on Vercel

### Environment Mapping

| Environment | Branch | Deployed To |
|:---|:---|:---|
| **Production (live customers)** | `main` | Vercel production + Vultr |
| **Integration / Staging** | `dev` | Integration / test environment |
| **Preview (per PR)** | feature branches | Vercel preview URLs |
| **Local dev** | feature branches | Localhost |

### Vercel Configuration

In Vercel project settings:
- **Production Branch:** `main`
- **Preview Branches:** `dev` and all feature branches

### Zero-Destruction & Rollback Strategy

**Strict Non-Negotiable Rule:**
- **NEVER** run `git reset --hard` or `git push --force` on any branch.
- If a build or commit in `dev` or `main` breaks, **Rollback Strategy**:
  1. Primary: Execute `git revert <commit-sha>` to create a clean, traceable reverting commit.
  2. Immediate production mitigation: Redeploy the previous known-good build artifact directly in the Vercel / hosting console.
- Zero AI writes to remote DB; all DB changes are purely additive migrations with symmetric up/down scripts manually executed by the owner on staging.

### Domain & Database During Migration

**Important:** Until `vaakriti.com` is purchased and DNS is migrated:
- Database remains linked to current Supabase project (Mumbai region)
- `NEXT_PUBLIC_SITE_URL` remains `https://trinetraedu-ai.com` in production env vars
- Emails continue from current domain
- **Rebranding in code can proceed** (all UI text, assets, metadata) — the domain remains the only externally-visible holdout

**When new domain is purchased:**
1. Update DNS via Cloudflare
2. Update Supabase redirect URLs
3. Update `NEXT_PUBLIC_SITE_URL`
4. Update Vercel custom domain
5. Update email MX records
6. Set up 301 redirect from old domain → new domain
7. Verify SSL (Let's Encrypt via Cloudflare)

---

## 🌐 Section 15: Domain Strategy (Locked)

**Decision:** Go with `.com` primary; bundle with `.in` and `.online` as defensive registrations.

### Recommended Bundle

| Domain | Purpose | Priority |
|:---|:---|:---|
| `vaakriti.com` | **Primary production domain** | ✅ Highest |
| `vaakriti.in` | India-specific; defensive + marketing | ✅ Yes |
| `vaakriti.online` | Defensive; redirects to .com | ✅ Yes |
| `vaakriti.ai` | Defer until revenue allows ($80–$120/yr) | ⏳ Later |
| `vaakriti.co.in` | Defensive; redirects to .com | Optional |

**Estimated bundle cost:** ₹1,500–₹2,500/year for all three (via Cloudflare Registrar or Namecheap).

### Domain Registration Checklist

- [ ] Register `vaakriti.com` — primary
- [ ] Register `vaakriti.in` — India marketing
- [ ] Register `vaakriti.online` — defensive
- [ ] Set DNS via Cloudflare (free SSL, DDoS protection)
- [ ] Point `vaakriti.com` → Vercel
- [ ] Point `api.vaakriti.com` → Vultr VPS (backend)
- [ ] Point `docs.vaakriti.com` → Next.js docs (optional)
- [ ] Set up 301 redirect: `trinetraedu-ai.com` → `vaakriti.com`
- [ ] Verify SSL A+ rating on SSL Labs
- [ ] Set up MX records for `support@vaakriti.com`, `hello@vaakriti.com`, `legal@vaakriti.com`
- [ ] Enable HSTS (max-age: 63072000, includeSubDomains, preload)
- [ ] Add to Google Search Console + Bing Webmaster Tools
- [ ] Submit sitemap

**Deferred:** `vaakriti.ai` — purchase in Month 6 when revenue supports it ($80–$120/yr). Redirect it to `.com`.

---

## 🧭 Section 16: Updated Phase Plan (v1.1)

### Phase 1 — Additions
- Implement Frozen Rules infrastructure (git hook, CI, baseline hashes)
- Implement Developer/Tester exemption matrix
- Add `role` field to user profiles
- SEO-1 through SEO-14 (technical SEO)
- Create `/llms.txt`
- Google Search Console + Bing Webmaster setup
- **Do NOT rebrand yet** — defer to Phase 5.5

### Phase 2 — Additions
- Reliability Score subsystem (scoring rules + admin visibility)
- In-app Invoice Vault (permanent storage + download)
- Invoice delivery via Email + WhatsApp (India) + in-app

### Phase 3 — Additions
- Support Ticket System (predefined types + templates)
- Admin-editable rate limits per user
- Number stops working immediately on expiry; alternate-day reminders

### Phase 4 — No changes (KYC + region-aware)

### Phase 5 — Additions
- Admin panel: Reliability Score dashboard, Rate Limit override UI, Ticket Queue, SEO dashboard
- Revenue dashboard: MRR, ARR, churn, overage, reliability score distribution

### Phase 5.5 — Rebranding Sprint (NEW — 3–4 days)
Gate before public launch. Execute:
- All code + UI rebranding (Trinetra → Vaakriti)
- Asset replacement (logos, favicons, OG images)
- Domain purchase + DNS migration
- External touchpoints (social, email, WhatsApp)
- Verification commands pass
- Validation log entry

### Phase 6 — Public Launch
Marketing begins. SEO content publishing starts. Founding customer onboarding.

---

## ✍️ Section 17: Updated Sign-Off

**Owner:** Ketan Singh Rathour
**Plan Version:** 1.2 (Section 18 Authoritative Overrides Integrated)
**Locked On:** October 2, 2026
**Supersedes:** v1.0, v1.1

**Governing Rules (Non-Negotiable):**
1. Frozen Security Rules
2. Developer/Tester Exemptions
3. SEO & AI Discoverability Priority
4. Complete Rebranding (Trinetra → Vaakriti)

**Branch Strategy (Section 18.1):**
- `main` = production branch (locked to Vercel production)
- `dev` = integration branch
- Feature branches → PR → `dev` (requires green CI + owner approval)
- Rollback via `git revert` or previous build redeploy (NO force push, NO reset --hard)

**Domain Strategy:**
- Primary: `vaakriti.com`
- Bundle: + `vaakriti.in` + `vaakriti.online`
- Deferred: `vaakriti.ai`

**Rebranding Timeline:**
- Code rebranding: can proceed immediately
- Domain migration: after `vaakriti.com` purchase
- Full external cutover: Phase 5.5

**Next Milestone:** Phase 1 kickoff — Frozen Rules infrastructure + Developer/Tester role setup + SEO foundation

**Weekly Review:** Every Friday until Phase 5.5 complete
**Monthly Review:** Ongoing thereafter

---

**This addendum is part of the Master Plan (v1.2). Reference before every session. Update docs/PROGRESS.md and the Validation Log after every completed task.**

---

## 👑 Section 18: v1.2 Overrides (authoritative)

> **AUTHORITATIVE PRECEDENCE NOTICE**: If Section 18 conflicts with anything above it in this Master Plan, **Section 18 wins without exception**. All prior statements in Sections 0 through 17 that conflict with the policies below are hereby deemed **SUPERSEDED**.

### 18.1 Git Topology, Branching & Deployment (Replaces Section 14)
- **Branches**:
  - `production` = `main`
  - `dev` = `integration`
  - All new work must stem from `dev` as dedicated `feature/<name>` branches.
  - Pull Requests (PRs) merge from feature branches into `dev`, requiring green passing CI checks and explicit owner review & approval.
  - **Vercel Production Branch**: Stays locked to `main`.
- **Zero-Destruction Git Rules**:
  - **NEVER** run `git push --force` or `git reset --hard` on any branch.
  - **Rollback Strategy**: Always execute `git revert <commit>` or redeploy a previous verified build artifact in Vercel/Render.

### 18.2 Direct-Database Operating Mode (No Separate Staging Project)
The development and runtime environments point directly at the owner's primary Supabase project. There are no real customers yet. Therefore:
- **Zero Remote DDL/Writes by AI**: NEVER execute any write, migration, or DDL command against the database. The AI assistant must provide symmetric `up` and `down` SQL migration scripts; the owner applies them manually.
- **Additive Migrations Only**: All database migrations must be purely additive. Never drop, rename, or retype existing columns or tables in production databases.
- **Pre-Read Safeguard**: Before any database read operation, print the target project URL/ID and refuse execution if it does not match the expected project.
- **Dry-Run by Default for Destructive Jobs**: All background cleanup, data-destruction, and lifecycle jobs (retention deletion, caller erasure, number release, KYC deletion) must default to `DRY_RUN=true` and only report what they would do. The owner will manually toggle `DRY_RUN=false` after end-to-end verification.
- **Synthetic Test Isolation**: All automated tests must operate strictly on synthetic mock data and a dedicated, isolated test organization. Real production rows must never be touched.

### 18.3 Roles, Exemption Policy & Sandbox Safety (Replaces Two-Role Rule)
- **Three Core Roles**: `customer`, `developer_tester`, `admin`.
- **Central Exemption Policy**: All role exemptions must pass through a single centralized exemption policy function with dedicated unit tests.
- **Non-Exemptible Primitives**: AI identity disclosure, call recording notices, PII redaction, immutable audit logging, and Multi-Factor Authentication (MFA) can **NEVER** be bypassed by any role, including `admin`.
- **Metrics Exclusion**: Test accounts (`developer_tester`) are programmatically excluded from all business revenue, MRR/ARR, call volume, and statutory compliance metrics.
- **Sandbox Flag**: A `"sandbox"` flag exists solely for admin-added test telephony numbers, prominently labeled `TEST`, and strictly blocked from customer-facing call flows. Real numbers can never go live without verified provider KYC.

### 18.4 Admin Sessions, Idle Timeouts & Privileged Step-Up Auth
- **Session Timeout**: Admin idle session timeout is capped at **30 minutes** (replaces the older 24-hour timeout).
- **Mandatory MFA**: Enforced for both `admin` and `developer_tester` accounts.
- **Re-Authentication (Step-Up Auth)**: Mandatory password/MFA re-authentication is required before accessing or executing:
  1. KYC document decryption/view
  2. Wallet balance manual adjustments
  3. Global pricing and plan changes
  4. Telephony and platform credential changes
- **KYC Document Privacy**: `developer_tester` accounts are strictly forbidden from viewing or downloading customer KYC documents. KYC viewing is restricted to authenticated `admin` users only.

### 18.5 Frozen Compliance Files, CI Hash Checks & Brand Name Constant
- **Target Frozen Files**:
  - `backend/app/services/disclosure_service.py`
  - `backend/app/services/outbound_safety_guardrails.py`
  - `backend/app/services/ai/prompt_guard.py`
  - `frontend/src/lib/promptGuard.ts`
  - Future validated security and role-exemption modules.
- **Freezing Criteria**: A file is frozen **only after** it has undergone complete automated test verification and owner review.
- **Agent Policy**: No partial or hacky freezing of `backend/agent.py`. The agent imports frozen modules.
- **CI Verification**: Enforced via a deterministic SHA-256 hash manifest in CI. Any uncommitted or unauthorized edit fails the build.
- **Single Brand Constant**: The application brand name must reside in exactly one centralized configuration constant (`BRAND_NAME = "Trinetra"`).
- **Emergency Fix Path**: Documented emergency escape hatch requiring explicit owner sign-off and hash manifest recalculation.

### 18.6 KYC Document Vault & Data Minimization
- **Strict Data Minimization**: Collect only what the underlying telephony provider (Exotel/Twilio) legally requires.
- **Mandatory Upload Consent**: Display affirmative statutory consent notice directly on the document upload modal.
- **Encrypted Storage**: Documents encrypted with AES-256 at rest; short-lived pre-signed URLs (<= 15 minutes) for viewing.
- **Audit Logging**: Every single document access or view is immutably recorded in `audit_logs` with admin identity and timestamp.
- **Retention Lifecycle**: KYC documents retained strictly for the duration of the assigned virtual number life plus the provider's statutory requirement.
- **Raw Aadhaar Prohibition**: Raw Aadhaar images are **NOT** stored by default. Enabling raw Aadhaar image storage requires an explicit configuration flag plus documented legal counsel approval (`CONFIRM WITH A LAWYER`).

### 18.7 Virtual Number Lifecycle & Expiry Handling
- **No 90-Day Cooling**: Callers hear a neutral, professional "currently unavailable" message immediately upon number expiration.
- **15-Day Grace Period**: The customer retains ownership of the number through a 15-day grace period, followed by a configurable administrative hold (default: 14 days) before permanent pool release.
- **Missed Call Tracking**: Inbound calls received during the grace and hold periods are logged, counted, and aggregated into a missed-calls summary emailed/messaged to the owner with a one-click reactivation link.
- **No CLI Spoofing**: Caller ID spoofing is strictly prohibited; only the assigned virtual CLI is broadcast.
- **Provider Quarantine**: Third-party carrier quarantine rules are classified as `UNVERIFIED, check provider terms`.

### 18.8 Bring-Your-Own Numbers (BYON - Twilio & Exotel)
- **Encrypted Credential Vault**: Third-party API keys and tokens stored in an AES-256 encrypted credential vault; revocable subaccounts or API keys preferred over master account credentials.
- **Secret Hygiene**: BYON credentials and tokens are never printed in logs, exposed to client-side bundles, or redisplayed in plaintext in the dashboard.
- **Synchronization**: Real-time sync on account connection plus periodic background synchronization; webhook endpoints require signature verification.
- **Agent Assignment**: Seamlessly assign customer-owned synced numbers to active agents.
- **Revocation Handling**: Graceful degradation if customer credentials are revoked or expired.
- **Cross-Tenant Isolation**: Rigorous automated CI test assertions ensuring tenant credentials can never cross tenant boundaries.
- **DLT Exemption**: Distributed Ledger Technology (DLT) compliance for Indian SMS/telephony stays on the customer's own telecom account; Trinetra collects no KYC on the BYON pathway.

### 18.9 Quota, Spend Limits, Reliability Score & Emergency Minutes
- **Zero In-Call Disconnection**: The system must **never** terminate or cut off an active in-progress call when a quota or balance limit is reached.
- **New Call Gating**: Block only subsequent calls once quota is exhausted, playing a polite informational message and alerting the account owner.
- **Free Emergency Minutes**: Up to 50 emergency minutes available strictly to eligible customers; rate-limited against abuse, admin-editable, and logged in audit trails.
- **"Reliability Score" (Replaces "Credit Score")**:
  - The term "credit score" is permanently replaced by **"Reliability Score"** across all UI, database schemas, and documentation.
  - Scoring calculation rules are completely transparent and visible to the customer in their dashboard profile.

### 18.10 Payments, Billing & CA-Reviewed Invoicing (Launch-Critical)
- **Launch Provider**: **Razorpay only** for launch.
- **Zero Card Data Storage**: No credit card or debit card numbers are ever stored in the database.
- **Idempotency & Reconciliation**: All payment webhooks must be strictly idempotent with duplicate check hashes; daily automated reconciliation job detects orphaned charges.
- **Refund Workflows**: Structured refund request and processing flow with audit trails.
- **Statutory GST Invoicing**: GST-compliant invoice generation reviewed and approved by the owner's Chartered Accountant (`CONFIRM WITH CA`).
- **Deferred Global Billing**: Stripe integration and global sales tax / VAT engines are formally deferred post-launch.

### 18.11 Data Retention & Minimization Split
- **Statutory Billing Retention**: Own financial and billing records retain required identifiers for the full statutory tax period (`CONFIRM WITH CA`).
- **Customer Deal Records Minimization**: Inbound/outbound caller deal records, audio transcripts, and CRM contacts are minimized or scrubbed after the configured retention window (e.g. 90–180 days).
- **Immutable Audit Trails**: System security and compliance audit logs are write-once, append-only, and never deleted.

### 18.12 Single-Agent Architectural Focus
- **Modular Personality Routers**: Personalities implemented as modular prompt segments routed via lightweight intent classifiers into a short, robust base prompt.
- **No Proliferation of Agent Types**: Refrain from creating disparate custom agent classes; maintain the hardened `VikramAgent` engine.
- **Evaluation Benchmark**: Dedicated test evaluation set per personality segment, continuously tracking routing accuracy, prompt token consumption, and response latency.

### 18.13 PII Scrubbing Across Observability & Log Vendors
- All logs, error traces, and telemetry payloads must be scrubbed of personally identifiable information (phone numbers, full names, emails, national IDs) **before** data is transmitted to Sentry, BetterStack, Healthchecks, or any external vendor.

### 18.14 Public Claims & Marketing Integrity
- Zero unverified statistics, marketing hyperbole, or speculative guarantees in product copy or public sites (e.g., avoid unsubstantiated claims like "10x cheaper", "rank #1 voice platform", or unverified language counts).

### 18.15 Project Scope, Timeline & Delivery Schedule
- **Timeline**: **20 Build Days**, followed by **10 Test & Hardening Days**, culminating in Production Launch.
- **Launch-Critical Scope (IN)**:
  1. Voice pipeline reliability, low latency, and anti-stall engine (Task 1).
  2. Frozen compliance files CI & SHA-256 hash checks (Task 2).
  3. Three-role system, central exemption policy, and sandbox flag (Task 3).
  4. Two-party disclosure, outbound guardrails, caller recording rights, and human transfer reconciliation.
  5. PII sanitizer and log vendor scrubber.
  6. Multi-tenant isolation CI test suite.
  7. Admin 30-minute idle sessions, MFA, and privileged re-authentication step-up auth.
  8. Prepaid wallet, Razorpay webhook idempotency, spend limits, quota overage, Reliability Score, and emergency minutes.
  9. GST-compliant invoice vault and refund workflows.
  10. Virtual number lifecycle (neutral message on expiry, 15d grace, 14d hold, missed-call digests).
  11. Bring-Your-Own Numbers (BYON) for Twilio and Exotel with credential vault.
  12. Support tickets system (pre-configured CFU call forwarding requests).
  13. Encrypted KYC document vault (admin-only, short-lived signed URLs, no raw Aadhaar by default).
  14. Essential operational admin panel.
  15. Data Processing Addendum (DPA), breach runbook, and subprocessor register.
  16. Sentry, BetterStack, and Healthchecks monitoring integrations.
  17. Automated backup restore drill and load testing.
- **Deferred Scope (POST-LAUNCH)**:
  - Stripe and international VAT/sales tax automation.
  - Public brand cutover and domain migration to `vaakriti.com` (stay on `trinetraedu-ai.com`).
  - Speculative SEO content marketing pipelines.
  - Outcome-based pricing plans (pay-per-appointment).
  - Full automated Reliability Score credit algorithms.
  - Advanced analytics dashboards and multi-region distributed databases.

### 18.16 Statutory Status Labels & Caveat Taxonomy
- Code and documentation statuses must strictly use:
  - **`IMPLEMENTED, pending legal review`** (feature built, verified in tests, awaiting formal attorney review).
  - **`VERIFIED`** (feature validated end-to-end with real test output and operational confirmation).
  - **NEVER claim `COMPLIANT`**.
- Any legal assumption or threshold must be labeled: **`CONFIRM WITH A LAWYER`**.
- Any vendor statement or API capability claim must be labeled: **`UNVERIFIED, check provider terms`**.