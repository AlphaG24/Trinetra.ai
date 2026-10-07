# SYSTEM DEPENDENCY MAP & TRACEABILITY GRAPH — TRINETRA AI (VAAKRITI)

> **Document Status**: AUTHORITATIVE BASELINE  
> **Source of Truth**: MASTER_PLAN.md (v1.2, Section 18 Overrides)  
> **Purpose**: Trace the end-to-end dependency chains of every critical subsystem and establish the High-Risk Dependency Registry.

---

## 1. Subsystem Traceability Graphs

### 1.1 Inbound & WebRTC Voice Engine
```
UI View:
  frontend/src/app/dashboard/agents/[slug]/demo/page.tsx
  └── Component: frontend/src/components/demo/VoiceDemo.tsx
      └── Hook / Client State: LiveKit Client Room SDK (livekit-client)
          └── API Endpoint: POST /api/voice/livekit-token
              └── Next.js Route: frontend/src/app/api/voice/livekit-token/route.ts
                  └── Backend Gateway: FastAPI /livekit-token (backend/voice_router.py)
                      └── Python Logic: backend/agent.py (VikramAgent)
                          ├── Speech Pipeline: Silero VAD -> Sarvam / Deepgram STT
                          ├── LLM Generation: Groq LLaMA 3.3 / Gemini 2.0 Flash
                          ├── TTS Synthesis: Sarvam Bulbul SSML / ElevenLabs
                          ├── Anti-Stall Guard: backend/app/services/voice_reliability_service.py
                          ├── Statutory Disclosure: backend/app/services/disclosure_service.py
                          └── Database Operations:
                              ├── Read: agents, organizations, customer_contacts
                              └── Write: voice_calls, appointments, customer_contacts
```

---

### 1.2 Inbound Carrier Telephony (PSTN Exotel / Twilio)
```
External Trigger:
  Caller places PSTN call to Carrier DID (+91-XXXXX / +1-XXXXX)
  └── Carrier Webhook: Twilio TwiML / Exotel ExoML
      └── Backend Route: POST /webhooks/voice/exotel, POST /webhooks/voice/twilio
          └── FastAPI Router: backend/voice_router.py & telephony_router.py
              ├── Carrier Adapter: backend/app/services/telephony/exotel_adapter.py
              ├── Concurrency Guard: 10-call per organization limit check
              ├── Caller Lookup: backend/app/services/caller_lookup.py
              ├── WebSocket Stream: wss://api.trinetraedu-ai.com/webhooks/voice/exotel/stream
              └── Agent Connection: backend/agent.py joins LiveKit SIP/WebRTC room
                  └── Database Operations:
                      ├── Read: phone_numbers, organizations, system_config
                      └── Write: voice_calls (duration, recording_url, sentiment)
```

---

### 1.3 Outbound Dialing Campaigns
```
UI View:
  frontend/src/app/dashboard/campaigns/[id]/page.tsx
  └── Component: frontend/src/components/campaigns/CampaignDetail.tsx
      └── Client State: SWR mutate + Supabase Realtime subscription
          └── API Endpoint: POST /api/campaigns/[id]/start
              └── Next.js Route: frontend/src/app/api/campaigns/[id]/start/route.ts
                  └── Backend Gateway: POST /api/campaigns/{id}/start (campaign_router.py)
                      └── Service Logic: backend/app/services/campaign_service.py
                          ├── Outbound Guard: backend/app/services/outbound_safety_guardrails.py
                          │   ├── TRAI Curfew (09:00 - 21:00) check
                          │   └── DND Registry scrub against dnd_registry table
                          ├── Quota / Wallet Check: backend/app/services/wallet_service.py
                          └── Carrier REST Dispatch: Exotel / Twilio Outbound Dial
                              └── Database Operations:
                                  ├── Read: campaigns, campaign_contacts, dnd_registry, wallets
                                  └── Write: campaigns (status, called_count), campaign_contacts
```

---

### 1.4 Virtual Number Lifecycle & Expiry Digest
```
Scheduled Trigger / Inbound Call Event:
  Background Lifecycle Worker (backend/app/services/number_lifecycle_service.py)
  └── Lifecycle Transition Logic:
      ├── Step 1: Active Period Expiration -> Immediate Neutral Audio Playout
      ├── Step 2: 15-Day Grace Period (owner retains reactivation rights)
      ├── Step 3: 14-Day Administrative Hold (number reserved before pool release)
      └── Step 4: Missed Call Logger & Daily Digest Generator
          └── Delivery Channels:
              ├── WhatsApp / Email Digest to Owner
              └── One-Click Reactivation Link
                  └── Database Operations:
                      ├── Read: phone_numbers, profiles
                      └── Write: number_lifecycle_missed_calls, number_lifecycle_digests
```

---

### 1.5 Prepaid Wallet, Spend Limits & Razorpay Checkout
```
UI View:
  frontend/src/app/dashboard/billing/page.tsx
  └── Component: frontend/src/components/dashboard/WalletWidget.tsx
      └── API Endpoint: POST /api/billing/topup
          └── Next.js Route: frontend/src/app/api/billing/topup/route.ts
              └── Razorpay Order Generation: Razorpay SDK
                  └── User completes checkout modal
                      └── Razorpay Webhook: POST /webhooks/razorpay (FastAPI)
                          └── Backend Router: backend/app/routers/wallet_router.py
                              └── Service Logic: backend/app/services/razorpay_webhook_service.py
                                  ├── Idempotency Check: processed_webhook_events
                                  ├── Wallet Ledger Credit: backend/app/services/wallet_service.py
                                  ├── GST Tax Invoice: backend/app/services/invoice_vault_service.py
                                  └── Database Operations:
                                      ├── Read: wallets, system_config
                                      └── Write: wallets, wallet_transactions, invoices, processed_webhook_events
```

---

### 1.6 Encrypted KYC Vault & Admin Access
```
UI View:
  frontend/src/app/dashboard/kyc/page.tsx (Customer Upload)
  frontend/src/app/(admin)/admin/kyc/page.tsx (Admin Review)
  └── Component: KYC Document Upload & Viewer
      └── API Endpoint: POST /api/kyc/upload, POST /api/kyc/documents/[id]/signed-url
          └── Backend Router: backend/app/routers/kyc_router.py
              └── Service Logic: backend/app/services/kyc_vault_service.py
                  ├── Role Policy Check: developer_tester forbidden (Section 18.4)
                  ├── Step-Up Re-Authentication: backend/app/services/admin_auth_service.py
                  ├── AES-256-GCM Decryption / Pre-Signed URL Generation (<= 15 min)
                  └── Immutable Audit Logger:
                      └── Database Operations:
                          ├── Read: kyc_documents
                          └── Write: kyc_documents, kyc_access_audit_logs, admin_audit_trail
```

---

## 2. Shared Cross-Cutting Dependencies

The following modules are shared across multiple critical paths and must NEVER be modified in isolation:

```
                          [ database.py / supabase_admin ]
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
      [ role_policy_service ]   [ pii_scrubber ]    [ disclosure_service ]
                 │                       │                       │
         ┌───────┴───────┐               │               ┌───────┴───────┐
         ▼               ▼               ▼               ▼               ▼
    Inbound Calls   Admin Panel    Logging/Sentry    WebRTC Demo   Telephony Calls
```

1. **`backend/database.py`**:
   - Central client factory. Enforces IPv4 DNS resolution.
   - Consumers: `backend/main.py`, `backend/agent.py`, `voice_router.py`, `telephony_router.py`, and all 41 services.

2. **`backend/app/services/role_policy_service.py`**:
   - Single source of truth for canonical roles (`customer`, `developer_tester`, `admin`).
   - Consumers: Edge middleware, admin operations, KYC vault, billing limit gates, analytics queries.

3. **`backend/app/services/pii_scrubber.py`**:
   - Intercepts root Python logging and external observability.
   - Consumers: `backend/main.py`, `observability_service.py`, `voice_reliability_service.py`.

4. **`backend/app/services/disclosure_service.py` (FROZEN)**:
   - Mandatory AI disclosure and recording consent engine.
   - Consumers: `backend/agent.py`, `voice_router.py`, `campaign_service.py`.

---

## 3. High-Risk Dependency Registry

| Dependency | Upstream Triggers | Downstream Impacts | Blast Radius | Mitigation Invariant |
| :--- | :--- | :--- | :--- | :--- |
| **`role_policy_service.py`** | Session login, API requests | All route gating, metrics exclusion, KYC access | **CRITICAL (Entire Platform)** | Unit tested in `test_role_policy_service.py` (69 tests). Frozen semantics. |
| **`disclosure_service.py`** | Inbound / Outbound calls | Call greeting, recording compliance, opt-out logs | **CRITICAL (Legal / Statutory)** | SHA-256 frozen in CI (`verify_frozen_files.py`). Cannot be bypassed. |
| **`outbound_safety_guardrails.py`** | Campaign start, dialer tick | TRAI curfew, DND scrub, carrier legal compliance | **CRITICAL (Telecom Regulatory)** | SHA-256 frozen in CI. Hardcoded TRAI 09:00–21:00 floor. |
| **`wallet_service.py`** | Call start, topup, webhook | Call gating, emergency minutes, balance deductions | **CRITICAL (Revenue & Call Continuity)** | Section 18.9: Never disconnects active calls; only gates new calls. |
| **`number_lifecycle_service.py`** | Cron job, number expiry | Virtual number dialability, carrier routing, digests | **HIGH (Telephony Operations)** | Neutral audio plays upon expiry; 15d grace + 14d hold before pool release. |
| **`kyc_vault_service.py`** | Document upload, admin review | Carrier activation, privacy audit, legal compliance | **CRITICAL (Statutory Privacy)** | AES-256-GCM encryption, admin step-up auth, developer_tester blocked. |
| **`database.py` (IPv4 socket)**| All DB operations | Supabase connection stability under ISP IPv6 routing | **CRITICAL (System Availability)** | Global monkey-patch `_getaddrinfo_ipv4_first` prevents 30s timeout storms. |
| **`frontend/src/middleware.ts`**| All browser requests | Route protection, cookie domain, session refresh | **CRITICAL (Frontend Auth)** | 8s timeout race prevents 504 gateway hangs during high DB IO. |
