# PROTECTED COMPONENTS REGISTRY & CHANGE-TIER CLASSIFICATION

> **Document Status**: AUTHORITATIVE BASELINE  
> **Source of Truth**: MASTER_PLAN.md (v1.2, Section 18 Overrides)  
> **Rule**: Modification of protected components must follow the Future Change Protocol.

---

## 1. Classification Framework

Components across the repository are divided into four strict risk levels:

```
┌─────────────────────────────────────────────────────────────┐
│  LEVEL 1 — CRITICAL                                         │
│  Changing these requires EXPLICIT OWNER APPROVAL.           │
│  Examples: Auth, RLS, Frozen Files, Wallet Invariant        │
├─────────────────────────────────────────────────────────────┤
│  LEVEL 2 — HIGH RISK                                        │
│  Changes require DOCUMENTED IMPACT ANALYSIS.                │
│  Examples: LiveKit Agent, Number Lifecycle, KYC Vault       │
├─────────────────────────────────────────────────────────────┤
│  LEVEL 3 — MODERATE                                         │
│  Changes require REGRESSION TEST VERIFICATION.             │
│  Examples: Support Tickets, CRM Contacts, BYON Vault        │
├─────────────────────────────────────────────────────────────┤
│  LEVEL 4 — LOW RISK                                         │
│  Normal additive feature development permitted.             │
│  Examples: Blog Posts, UI Labels, Marketing Pages           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Component Protection Matrix

### 2.1 LEVEL 1 — CRITICAL (Requires Explicit Written Approval)

| Component / Module | File Path | Primary Function | Why It Is Level 1 |
| :--- | :--- | :--- | :--- |
| **Statutory Disclosure** | `backend/app/services/disclosure_service.py` | Mandatory AI identity and recording consent notices | **FROZEN**. SHA-256 baseline locked in CI. Legal compliance primitive. |
| **Outbound Guardrails** | `backend/app/services/outbound_safety_guardrails.py` | TRAI 09:00–21:00 calling hours curfew & DND scrubbing | **FROZEN**. SHA-256 baseline locked in CI. Telephony regulation primitive. |
| **Prompt Injection Guard** | `backend/app/services/ai/prompt_guard.py` & `promptGuard.ts` | Intercepts adversarial prompt jailbreaks | **FROZEN**. SHA-256 baseline locked in CI. Core AI security defense. |
| **Role & Exemption Policy**| `backend/app/services/role_policy_service.py` | Three-role engine (`customer`, `developer_tester`, `admin`)| Evaluates all permission checks and metrics exclusions across the app. |
| **Admin Step-Up Auth** | `backend/app/services/admin_auth_service.py` | Privileged re-authentication for sensitive ops | Gates KYC document access, wallet adjustments, and pricing overrides. |
| **Zero In-Call Disconnect**| `backend/app/services/wallet_service.py` | Enforces Section 18.9 quota governance | Prevents abrupt in-call drop when quota or spend limit is reached. |
| **Edge Auth Middleware** | `frontend/src/middleware.ts` | Edge route guard, cookie domain scoping, timeout race| Universal gatekeeper for all Next.js application routes. |
| **Database RLS Policies** | `supabase/migrations/*.sql` | Tenant isolation across all PostgreSQL tables | Core defense against data leakage and IDOR exploits. |
| **Database IPv4 Proxy** | `backend/database.py` (`_getaddrinfo_ipv4_first`) | Forces IPv4 socket resolution | Critical availability patch preventing 30s timeout storms. |

---

### 2.2 LEVEL 2 — HIGH RISK (Requires Documented Impact Analysis)

| Component / Module | File Path | Primary Function | Why It Is Level 2 |
| :--- | :--- | :--- | :--- |
| **LiveKit Voice Agent** | `backend/agent.py` | Full-duplex speech synthesis, STT, and turn handling | Core product engine. Tightly coupled with WebRTC and telephony carriers. |
| **Voice Anti-Stall Guard** | `backend/app/services/voice_reliability_service.py` | Monotonic timing stopwatch, 700ms filler, 5.0s cap | Directly controls call responsiveness and prevents mid-call silence. |
| **Virtual Number Lifecycle**| `backend/app/services/number_lifecycle_service.py`| 30d active, 15d grace, 14d hold, missed call digests | Prevents premature release and customer number loss. |
| **Razorpay Webhook Handler**| `backend/app/services/razorpay_webhook_service.py`| Idempotent payment capture and wallet crediting | Financial transaction processing; risk of double-crediting or lost payments. |
| **Encrypted KYC Vault** | `backend/app/services/kyc_vault_service.py` | AES-256 encryption at rest, short-lived signed URLs | Handles sensitive statutory identity documents. |
| **In-App GST Invoice Vault**| `backend/app/services/invoice_vault_service.py` | Auto-generates VAK/ series tax invoices with CA review| Statutory financial compliance under Indian tax laws. |
| **Carrier Telephony Adapter**| `backend/app/services/telephony/exotel_adapter.py` & `twilio.py` | SIP trunking, TwiML/ExoML generation, streaming | Carrier interoperability layer. |

---

### 2.3 LEVEL 3 — MODERATE (Requires Regression Test Verification)

| Component / Module | File Path | Primary Function | Verification Protocol |
| :--- | :--- | :--- | :--- |
| **Campaign Manager** | `backend/app/services/campaign_service.py` | Batch CSV dialing and progress tracking | Execute `test_campaign_purpose_attestation.py` |
| **Support Ticket System** | `backend/app/services/support_ticket_service.py` | CFU call forwarding requests and SLA tracking | Execute `test_support_ticket_system.py` |
| **BYON Credential Vault** | `backend/app/services/byon_vault_service.py` | Third-party Twilio / Exotel customer credentials| Execute `test_byon_credential_vault.py` |
| **Caller Rights DSAR** | `backend/app/services/caller_rights_service.py` | Caller search, export, and right-to-be-forgotten | Execute `test_caller_rights_service.py` |
| **PII Log Sanitizer** | `backend/app/services/pii_scrubber.py` | Masks phone numbers and emails in console logs | Execute `test_pii_sanitizer.py` |
| **Backup Restore Drill** | `backend/app/services/backup_restore_service.py` | Automated synthetic backup verification | Execute `test_backup_restore_drill.py` |

---

### 2.4 LEVEL 4 — LOW RISK (Normal Additive Development)

- Marketing landing page copy (`frontend/src/components/landing/*`)
- Documentation in `/docs/*`
- Blog editorial CMS posts and enhancements (`frontend/src/app/(marketing)/blog/*`)
- UI styling improvements that do not modify layouts or protected component structures
- Non-critical partner marketing displays
