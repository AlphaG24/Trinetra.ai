# 📘 TRINETRA AI — MASTER PRODUCTION IMPLEMENTATION PLAN

**Version 1.0 | Locked: October 2, 2026 | Owner: Ketan Singh Rathour**

**Status:** APPROVED — Ready for execution
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
| P7 | Free emergency minutes | 50 free overage minutes before charging default ( editable via admin dashboard ) , limited to every user , can't use every month , admin can check and block or edit those minutes . Those free minutes will be used only when user credit history is clear . Means if user keep on failing the renewal of plans then he will not be eligible for those free minutes. SO create a credit scroe system and for every timely payment increase the credit score and user above credit scorev > 80 get those free minute offer. User can see those credit score in their profile and can check if they are eligible or not.  |
| P8 | Spend limit | ₹2,500 default; admin can override per customer |
| P9 | Onboarding fee | Not active now; enabled via admin toggle; shown in pricing plan editor |
| P10 | Number limits | Pooled across all customer numbers; no per-number cap |
| P11 | Currency | Multi-currency aware (INR, USD, EUR) — pricing editable in admin |

### 1.2 Number Lifecycle

| # | Decision | Locked Value |
|:---|:---|:---|
| N1 | Active period | 30 days |
| N2 | Grace period | 15 days (number stopped working; alternate day reminders) |
| N3 | Cooling period | 90 days (TRAI India); configurable per region |
| N4 | Reminder schedule | Day 1, 7, 14, 21, 28 via email + WhatsApp |
| N5 | Re-activation during cooling | Allowed for a one-time fee + immediate renewal |
| N6 | Auto-pool expansion | Triggered when available numbers < 10 |
| N7 | Telephony providers | Exotel (India), Twilio (Global) |
| N8 | CLI policy | Never spoof; display assigned virtual number only |
| N9 | Call forwarding | CFU (unconditional) default; porting premium . Need special system in both admin panel and show this ticket in support panel so that user can select and just request without writing it . Also add some other important tickets with their description to improve quality of support.|

### 1.3 KYC & Compliance

| # | Decision | Locked Value |
|:---|:---|:---|
| K1 | KYC required at | Number purchase only (not at signup, not for dashboard) |
| K2 | KYC documents | Country-specific (India: Aadhaar/PAN/GST; Global: Passport/National ID/Company Registration) |
| K3 | KYC storage | AES-256 at rest, TLS in transit |
| K4 | KYC access | Restricted to `admin` and `developer_tester` roles only |
| K5 | KYC auto-sync | From purchase flow to profile page (upload once, use everywhere) |
| K6 | AI disclosure | Mandatory at call start; logged in `voice_calls.disclosure_played` |
| K7 | Call recording consent | Mandatory prompt; call not recorded without consent |
| K8 | Data residency | India data in Mumbai; global data in nearest region |
| K9 | Data retention | Call audio: 90–180 days; Financial records: 8 years (anonymized after 180 days) |

### 1.4 Access Control

| # | Decision | Locked Value |
|:---|:---|:---|
| A1 | Roles | Two only: `admin` and `developer_tester` |
| A2 | MFA | Required for admin; optional for users |
| A3 | Session timeout | Admin: 24h idle; Users: 7 days |
| A4 | Audit logging | Every KYC view, price change, wallet adjust logged |
| A5 | Rate limits | Login: 5/10min; API: 60/min/user; Calls: 5/min/number ( editable per user via admin ) as if any user have call center this rate minit may affect their working system|

### 1.5 Monitoring & Operations

| # | Decision | Locked Value |
|:---|:---|:---|
| M1 | Uptime monitoring | BetterStack (chosen over Uptime Kuma, Vercel CLI, PostHog) |
| M2 | Error tracking | Sentry (backend + frontend) |
| M3 | Cron monitoring | Healthchecks.io |
| M4 | Admin dashboard | Single-pane-of-glass for ops, billing, monitoring, audit |
| M5 | Alerts | Telegram + email for P1 incidents |

### 1.6 Billing & Payments

| # | Decision | Locked Value |
|:---|:---|:---|
| B1 | Wallet model | Prepaid; funded via UPI (India) / card (Global) |
| B2 | Subscription charge | Separate from wallet; auto-debit or manual |
| B3 | Failed payment flow | 3 retries over 3 days → 7-day grace → suspend → cooling |
| B4 | Invoice delivery | Email + WhatsApp (India) / email (Global) or any linked app where user can download invoice |
| B5 | Credit rollover | 180 days (per refund policy revision) |
| B6 | GST invoicing | Auto-generated with GSTIN |

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
  ├── Razorpay (India payments) + Stripe (Global)
  ├── BetterStack (uptime) + Sentry (errors) + Healthchecks.io (cron)
  └── Redis/Upstash (caching + rate limiting)
```

**Estimated monthly run cost:** $93 fixed + AI APIs (~$50–$300 variable).

---

## 🌍 Section 3: Global Compliance Strategy

The system enforces **region-specific rules automatically** based on customer location and called-party number.

| Region | KYC Required | DND/Consent Rule | Cooling Period | Recording Consent | Retention |
|:---|:---|:---|:---|:---|:---|
| **India** | Aadhaar/PAN/GST | TRAI TCCCPR; DND scrub; 09:00–21:00 | 90 days | Audible disclosure required | 8 years (financial) |
| **USA** | Business EIN/ID | TCPA written consent; 08:00–21:00 local | Varies by state | 2-party consent states require explicit opt-in | 7 years (IRS) |
| **EU/UK** | Company registration | GDPR consent; PECR | 30–90 days | Explicit opt-in for recording | 6–10 years |
| **Middle East** | National ID/Trade License | Varies by country | 60–90 days | Disclosure required | 5–7 years |
| **SEA** | Local business ID | Varies (Singapore PDPA, Indonesia PDP Law) | Varies | Consent required | 5–10 years |

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
| 1.7 | Session timeout: admin 24h, user 7d | Idle timeout verified |
| 1.8 | Sentry DSN fixed (backend + frontend) | Triggered error appears in Sentry within 60s |
| 1.9 | BetterStack monitors live (5 endpoints) | All green on status page |
| 1.10 | Healthchecks.io for 3 cron jobs (cleanup, scheduler, pool expand) | Job stops → alert fires |
| 1.11 | Rate limiting: login (5/10min), API (60/min/user), calls (5/min/number) | 429 after threshold |
| 1.12 | `spend_limit` column added (default 2500) | Admin can override per customer |
| 1.13 | Region-aware KYC schema (India: PAN/Aadhaar/GST; Global: passport/company ID) | Test account in each region can submit correct docs |

**✅ Phase 1 Gate:** Full security audit runs with zero high-severity findings. All compliance logs verifiable.

---

### 💰 PHASE 2: Wallet, Billing & Pricing Engine
**Duration:** 2 weeks | **Priority:** CRITICAL

| # | Task | Validation Criteria |
|:---|:---|:---|
| 2.1 | `wallets` table: user_id, balance, currency, last_topup | Balance reflects after top-up |
| 2.2 | UPI checkout (Razorpay India) + Card (Stripe Global) | ₹1,000 / $10 test payment succeeds |
| 2.3 | Real-time overage deduction from wallet | Simulated call → balance decrements at correct rate |
| 2.4 | Spend limit enforcement (₹2,500 default, admin override) | Set to ₹500 → agent pauses after threshold |
| 2.5 | Free emergency minutes (50) credit on 100% quota hit | Simulate → 50 min added, message sent |
| 2.6 | Thoughtful "we care" message on free-minute trigger (multi-language) | Email + WhatsApp received |
| 2.7 | Credit pack purchase flow (admin-defined packs) | Manual purchase adds minutes to balance |
| 2.8 | Subscription renewal (auto-debit + manual) | Both paths tested |
| 2.9 | Outcome-based plan engine | Calendar event created → ₹49 deducted |
| 2.10 | Free trial (10 min) + ₹99 trial (50 min, 7d) | Both enforce their limits |
| 2.11 | Invoice PDF with GSTIN + region-aware tax | Download + email delivery verified |
| 2.12 | Invoice delivery: Email + WhatsApp (India) / Email (Global) | Received on both channels |
| 2.13 | Failed payment flow: 3 retries → 7-day grace → suspend → cooling | Simulated failure follows correct sequence |
| 2.14 | Admin pricing editor (create/edit/deactivate plans) | New plan appears in user-facing list |
| 2.15 | Credit rollover 180 days (updated from 30) | Rolling expiry tested |
| 2.16 | Admin toggle: onboarding fee (off by default) | Toggled on → appears in checkout |

**✅ Phase 2 Gate:** Complete customer journey works: signup → trial → top-up → subscription → overage → renewal → invoice → cancel → refund.

---

### 📞 PHASE 3: Number Lifecycle & Pool Management
**Duration:** 1 week | **Priority:** HIGH

| # | Task | Validation Criteria |
|:---|:---|:---|
| 3.1 | Active period (30d) + Grace (15d) + Cooling (90d, region-configurable) | Compressed test passes |
| 3.2 | Reminder sequence: Day 1, 7, 14, 21, 28 via email + WhatsApp | All 5 reminders received |
| 3.3 | Dashboard countdown timer for expiry | Accurate countdown displayed |
| 3.4 | Auto-purchase when pool < 10 numbers | Threshold triggers auto-order via Exotel/Twilio API |
| 3.5 | Re-activation during cooling (one-time fee + renewal) | Reactivation succeeds with fee |
| 3.6 | Pool status dashboard (Available/Assigned/Cooling counts) | Admin sees real-time counts |
| 3.7 | Multi-provider number assignment (Exotel India / Twilio Global) | Region-based provider selection |
| 3.8 | Pooled quota across all customer numbers | 3 numbers → 1,000 min shared |
| 3.9 | CLI integrity check (never spoof) | Attempt to spoof → blocked with audit log |
| 3.10 | CFU (call forwarding) setup wizard | Customer completes forwarding in 3 steps |

**✅ Phase 3 Gate:** Full lifecycle test from assignment → usage → expiry → cooling → re-allocation.

---

### 🔐 PHASE 4: KYC & Document Management
**Duration:** 1 week | **Priority:** HIGH

| # | Task | Validation Criteria |
|:---|:---|:---|
| 4.1 | KYC page in user profile with region-aware fields | India: PAN/Aadhaar/GST; Global: Passport/Company ID |
| 4.2 | KYC required only at number purchase | Dashboard accessible without KYC |
| 4.3 | Auto-sync: purchase-flow upload → profile | Same doc appears in both places |
| 4.4 | AES-256 at rest, TLS 1.3 in transit | Verify via DB inspection |
| 4.5 | Access restricted to `admin` + `developer_tester` | Non-admin gets 403 |
| 4.6 | KYC status tracking: pending / verified / rejected / expired | Admin can flip; user sees correct label |
| 4.7 | Provider API integration (Exotel KYC India; Twilio Trust Hub Global) | Real sandbox submission → approval flow |
| 4.8 | KYC document retention: 5 years, then secure delete | Scheduled job deletes old docs |
| 4.9 | Every KYC view logged in `audit_logs` | Admin views → audit row created |
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
| `backend/app/security/rate_limiter.py` | Rate limit enforcement |
| `backend/app/security/pii_redactor.py` | PII masking in logs |
| `backend/app/security/consent_manager.py` | Call consent + AI disclosure |
| `backend/app/security/kyc_handler.py` | KYC encryption, access control |
| `backend/app/security/audit_logger.py` | All admin action logging |
| `frontend/src/middleware.ts` | Auth + rate limit + tenant isolation |
| `backend/agent.py` (disclosure + consent sections only) | Call-start disclosure |
| `.env.example` | All security env vars documented |

**Step 3 — Baseline Hash File**
`docs/FROZEN_HASHES.json` stores SHA-256 hashes:
```json
{
  "backend/app/security/rate_limiter.py": "<sha256>",
  "frontend/src/middleware.ts": "<sha256>",
  "_meta": {
    "frozen_date": "2026-10-02",
    "frozen_by": "Ketan Singh Rathour",
    "verification_command": "python scripts/verify_frozen.py"
  }
}
```

**Step 4 — Pre-Commit Hook**
`.git/hooks/pre-commit` blocks commits touching frozen files unless commit message contains `[UNFREEZE-APPROVED]`.

**Step 5 — CI Verification**
GitHub Action `verify-frozen.yml` runs on every push. It compares current file hashes against the baseline and fails the build on mismatch.

**Step 6 — Unfreezing Process (Owner Only)**
1. Owner issues written instruction (email or signed doc)
2. Developer updates the frozen file
3. Developer regenerates `FROZEN_HASHES.json`
4. Developer logs change in `docs/VALIDATION_LOG.md` with reason, approver, date
5. Owner confirms; CI passes

**Why this matters:** Rapid feature development often inadvertently weakens security. This rule prevents silent regressions.

---

### 🧪 Section 12.2: RULE #2 — Developer/Tester Exemptions

**Rule:** The `developer_tester` role exists solely to build, test, and verify features. It must not be constrained by customer-facing limits, quotas, or billing rules.

#### Exemptions Matrix

| Rule | Customer | `developer_tester` | `admin` |
|:---|:---:|:---:|:---:|
| Spend limit (₹2,500 default) | ✅ Enforced | ❌ Unlimited | ❌ Unlimited |
| Quota limits (minutes) | ✅ Enforced | ❌ Unlimited | ❌ Unlimited |
| Rate limits (login/API/calls) | ✅ Enforced | ⚠️ 10x relaxed | ⚠️ 10x relaxed |
| KYC requirement | ✅ Required | ❌ Auto-verified | ❌ Bypassed |
| Number cooling period | ✅ Enforced | ❌ Bypassed | ❌ Bypassed |
| Wallet balance required | ✅ Required | ❌ Auto-funded (₹1,00,000) | ❌ Auto-funded |
| Invoice generation | ✅ Generated | ❌ Skipped | ❌ Skipped |
| Free trial duration | ✅ Enforced | ❌ Unlimited | ❌ Unlimited |
| AI disclosure at call start | ✅ Played | ✅ **Played** | ✅ Played |
| PII redaction in logs | ✅ Enforced | ✅ **Enforced** | ✅ Enforced |
| Audit logging | ✅ Enforced | ✅ **Enforced** | ✅ Enforced |
| MFA | Optional | ✅ **Required** | ✅ Required |

**Key principle:** Security primitives (disclosure, PII redaction, audit logging, MFA) are **never bypassed** — even for developer accounts. Only business limits are relaxed.

**Implementation:**
- `role` field in `user_profiles`: `customer` | `developer_tester` | `admin`
- Rule-checking functions: `if user.role in ('admin', 'developer_tester'): skip_business_limit()`
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

**Rule:** Vaakriti must rank #1 on Google, Bing, and be cited by AI engines (ChatGPT, Claude, Perplexity, Gemini) for the target keywords. This is a first-class priority, not an afterthought.

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
| P7 | Free emergency minutes | 50 min every month | 50 min **only if Credit Score > 80**; admin-editable; not automatic |
| N2 | Grace period | Number works during grace | Number **stops working immediately**; alternate-day reminders |
| N9 | Call forwarding | CFU + porting | + **Support ticket system** with predefined request types |
| K9 | Data retention | 30–180 days | Call audio: **90–180 days**; financial: 8 years |
| A5 | Rate limits | Fixed values | **Admin-editable per user** (for call-center customers) |
| B4 | Invoice delivery | Email + WhatsApp | + **In-app invoice vault** |
| P2 | ₹99 trial | Full dashboard, 7d, 50 min | + **2 agents limit (admin-editable)** |

### 13.1 New Subsystems Introduced

**Credit Score System:**
- Starts at 50 for new users
- +10 on-time payment / -20 late / -50 default
- Score > 80 unlocks free emergency minutes
- Visible in user profile with eligibility indicator
- Admin can view/edit scores with audit logging

**Support Ticket System:**
- Predefined ticket types: Call Forwarding Setup, Number Porting, KYC Issue, Billing Dispute, Feature Request, Bug Report, Other
- Each type has pre-filled description template
- User clicks → ticket created → admin notified → SLA tracked
- Admin panel: ticket queue with priority + SLA timers

**In-App Invoice Vault:**
- All invoices stored permanently in user dashboard
- Download PDF anytime
- Filterable by date, amount, plan
- "Send to WhatsApp" / "Send to Email" buttons

---

## 🌿 Section 14: Branch & Deployment Strategy (Updated)

**Rule:** `main` branch is architecturally frozen as a safe rollback. All work happens on `dev` and feature branches.

### Branch Topology

```
main (frozen, read-only, safe rollback)
  │
  └── dev (production branch — auto-deploys)
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

1. **Feature branch** from `dev`
2. Commit + push feature branch
3. PR → `dev`
4. Review on Vercel preview deployment
5. Merge to `dev`
6. Vercel auto-deploys `dev` → production environment
7. **Only after 30 days of stable production:** `dev` → `main` fast-forward (archival only)

### Environment Mapping

| Environment | Branch | Deployed To |
|:---|:---|:---|
| **Production (live customers)** | `dev` | Vercel production + Vultr |
| **Preview (per PR)** | feature branches | Vercel preview URLs |
| **Archival / Rollback** | `main` | Not deployed |
| **Local dev** | feature branches | Localhost |

### Vercel Configuration Change

In Vercel project settings:
- **Production Branch:** `dev` (changed from `main`)
- **Preview Branches:** All other branches

### Safety Net

`main` becomes a "known-good" archive. If `dev` catastrophically breaks:
```bash
git checkout dev
git reset --hard origin/main
git push --force origin dev
```
Restores production to the last verified stable state. Only the owner can execute this.

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
- Credit Score subsystem (scoring rules + admin visibility)
- In-app Invoice Vault (permanent storage + download)
- Invoice delivery via Email + WhatsApp (India) + in-app

### Phase 3 — Additions
- Support Ticket System (predefined types + templates)
- Admin-editable rate limits per user
- Number stops working immediately on expiry; alternate-day reminders

### Phase 4 — No changes (KYC + region-aware)

### Phase 5 — Additions
- Admin panel: Credit Score dashboard, Rate Limit override UI, Ticket Queue, SEO dashboard
- Revenue dashboard: MRR, ARR, churn, overage, credit score distribution

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
**Plan Version:** 1.1 (Vaakriti Edition)
**Locked On:** October 2, 2026
**Supersedes:** v1.0

**Governing Rules (Non-Negotiable):**
1. Frozen Security Rules
2. Developer/Tester Exemptions
3. SEO & AI Discoverability Priority
4. Complete Rebranding (Trinetra → Vaakriti)

**Branch Strategy:**
- `dev` = production branch (auto-deploys)
- `main` = frozen archival + rollback
- Feature branches → PR → `dev`

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

**This addendum is part of the Master Plan (v1.1). Save both documents together. Reference before every session. Update the Validation Log after every completed task.**

Ready to begin Phase 1. Say the word and I'll give you the exact commands for **Task 1.1: Frozen Rules Infrastructure Setup** — the git hook, CI check, and baseline hash script.

## ✍️ Sign-Off

**Founder & Owner:** Ketan Singh Rathour
**Co-Owner / Dev Ops:** [Add second name]
**Plan Version:** 1.0
**Locked On:** October 2, 2026
**Next Review:** Every Friday until Phase 5 complete

---

**This document is now the single source of truth for Trinetra AI production buildout. Save as `docs/MASTER_PLAN.md` in the repo. Reference it before every session. Update the Validation Log after every completed task.**

**All answers confirmed. Ready to begin Phase 1, Task 1.1: AI Disclosure Verification.**

Whenever you're ready, say the word and I'll give you the exact SQL migration, Python patch, or code change for the first task.