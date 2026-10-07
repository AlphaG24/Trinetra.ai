# TESTING BASELINE & CRITICAL REGRESSION TEST LIST — TRINETRA AI (VAAKRITI)

> **Document Status**: AUTHORITATIVE BASELINE  
> **Source of Truth**: MASTER_PLAN.md (v1.2, Section 18 Overrides) & `backend/tests/`  
> **Rule**: Never claim "Everything works" without verifiable test execution output.

---

## 1. Existing Test Infrastructure & Coverage

The repository features an automated test suite centered in `backend/tests/` comprising **38 test modules** and **216+ automated unit and integration tests**.

### 1.1 Test Suite Breakdown

| Category | Primary Test Files | Coverage & Validations |
| :--- | :--- | :--- |
| **Statutory Compliance & Frozen Files** | `test_frozen_files_ci.py`, `test_call_disclosure.py`, `test_outbound_safety_guardrails.py` | SHA-256 hash manifest integrity, mandatory AI disclosure, TRAI 09:00–21:00 calling hours curfew. |
| **Roles & Central Exemption Policy** | `test_role_policy_service.py`, `test_admin_sessions_stepup.py` | Canonical roles (`customer`, `developer_tester`, `admin`), non-exemptible primitives, step-up auth, 30-min idle timeout. |
| **Voice Reliability & Anti-Stall Engine**| `test_voice_reliability.py`, `test_single_opening_greeting.py`, `test_a4_opening_watchdog.py`| Stopwatch timing tracker, 700ms conversational filler, 5.0s tool timeout cap, dead-air watchdog. |
| **Prepaid Wallet & Spend Limits** | `test_wallet_razorpay_quota.py`, `test_gst_invoicing_vault.py` | Idempotent Razorpay webhooks, zero in-call disconnect invariant, emergency minutes claim, CA invoice workflows. |
| **Virtual Number Lifecycle** | `test_number_lifecycle_grace.py`, `test_byon_credential_vault.py` | Expiry neutrality, 15d grace, 14d administrative hold, daily missed-call summaries, encrypted BYON credentials. |
| **Tenant Isolation & Security** | `test_tenant_isolation_ci.py`, `test_service_role_safety.py`, `test_pii_sanitizer.py` | Cross-tenant RLS isolation, regex PII masking across console and Sentry logs, encrypted KYC vault. |
| **Operations, Support & Backup** | `test_support_ticket_system.py`, `test_backup_restore_drill.py`, `test_load_concurrency_benchmark.py` | CFU call forwarding workflows, synthetic backup restore drills, concurrency limits. |

---

## 2. Environment Dependencies & Execution Protocol

### 2.1 Python Testing Environment
- Test Runner: `pytest` with `pytest-asyncio`
- Execution Command:
  ```powershell
  python -m pytest backend/tests/test_frozen_files_ci.py backend/tests/test_role_policy_service.py backend/tests/test_pii_sanitizer.py -v
  ```
- **Operational Finding**:
  - Tests testing `agent.py` directly (such as `test_a1d_gender_resolver.py` or agent appointment tool tests) import `livekit.plugins.google`.
  - When running in an environment without `livekit-plugins-google` installed, tests requiring that plugin encounter an `ImportError`. The designated virtual environment (`.venv` per `requirements.txt`) resolves all required plugins.
  - Isolated compliance, billing, role policy, backup, and tenant tests pass with 100% success rate.

### 2.2 Frozen Compliance Verification
- Script: `python scripts/verify_frozen_files.py`
- Normalizes CRLF to LF to guarantee bit-for-bit hash equality across Windows and Linux environments.
- Execution output verified: **ALL 4 FROZEN COMPLIANCE MODULES PASSED (100% INTEGRITY)**.

---

## 3. Master Critical Regression Test List

Every future change to the codebase MUST execute and pass regression verifications across these 32 critical subsystems:

1. **Authentication**: Registration, Login, Session Refresh, and Logout via Supabase Auth SSR.
2. **Middleware Route Guard**: Verification that unauthenticated requests to `/dashboard/*` and `/admin/*` are intercepted and redirected to `/login`.
3. **Session Idle Timeout**: Admin session timeout capped at 30 minutes; regular users 7 days.
4. **Mandatory Step-Up Re-Authentication**: Attempted KYC view, wallet adjustment, or price change challenges for admin password/TOTP.
5. **Three-Role Normalization**: Verification that `customer`, `developer_tester`, and `admin` normalize accurately.
6. **Metrics Exclusion**: Test accounts (`developer_tester`) excluded from MRR/ARR, revenue, and statutory metrics.
7. **KYC Access Block**: Verification that `developer_tester` accounts receive HTTP 403 Forbidden when requesting customer KYC documents.
8. **Statutory AI Disclosure**: First turn of every voice call includes compliant AI identity announcement (*"Arika from Trinetra, an AI assistant"*).
9. **Recording Consent Opt-Out**: If caller declines recording, audio recording URL remains null and consent opt-out is recorded.
10. **TRAI Calling Hours Curfew**: Outbound campaign dialer rejects calls outside 09:00 to 21:00 recipient local time.
11. **DND Scrubbing**: Campaign dialer removes numbers registered in `dnd_registry`.
12. **Single Opening Greeting Guard**: Verifies that the agent never plays duplicate greetings on initial connection.
13. **Anti-Stall Conversational Filler**: Long database tool executions (>700ms) emit expressive natural speech fillers without dead air.
14. **Tool Execution Timeout Cap**: Database tools hard-capped at 5.0s, returning courteous fallbacks on timeout.
15. **In-Call Silence Watchdog**: Dead air exceeding 5.0s prompts the caller (*"Ji, kya aap mujhe sun pa rahe hain?"*).
16. **Zero In-Call Disconnection**: Quota exhaustion or spend limit hit mid-call does NOT hang up active calls.
17. **New Call Gating**: Subsequent new calls blocked when balance is zero or monthly spend limit reached.
18. **Reliability Score Calculation**: Transparent scoring rules (>80 unlocks 50 free emergency buffer minutes).
19. **Emergency Minutes 30-Day Cooldown**: Abuse prevention blocking duplicate claims within 30 days.
20. **Razorpay Webhook Idempotency**: Duplicate payment webhooks processed safely without double-crediting wallets.
21. **GST Tax Invoice Vault**: Generation of VAK/ series tax invoices with CGST/SGST breakdown.
22. **CA Review Workflow**: CA reviewer sign-off and tax period audit trails in `invoice_ca_reviews`.
23. **Virtual Number Expiry Neutrality**: Immediate neutral unavailable playout upon expiration (no 90-day cooling).
24. **Virtual Number 15-Day Grace Period**: Owner retains ownership and one-click reactivation link.
25. **Virtual Number 14-Day Administrative Hold**: Number quarantine before pool release.
26. **Missed Call Digest**: Inbound calls during grace/hold aggregated into daily digests to owner.
27. **Encrypted KYC Vault**: AES-256-GCM encryption at rest; short-lived signed URLs (<= 15 min).
28. **Raw Aadhaar Storage Block**: Raw Aadhaar image storage blocked by default without legal flag.
29. **BYON Credential Vault**: Third-party Twilio / Exotel credentials encrypted with AES-256 and masked in UI.
30. **Support Ticket System**: Unconditional Call Forwarding (CFU) setup workflow and SLA tracking.
31. **PII Log Sanitizer**: Phone numbers and emails scrubbed from console and external logs before transmission.
32. **Multi-Tenant Isolation**: Rigorous assertions ensuring customer A cannot read or modify customer B's data.
