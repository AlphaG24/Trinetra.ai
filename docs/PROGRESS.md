# Trinetra AI - Launch Critical Schedule & Progress Tracker

> **Source of Truth**: [MASTER_PLAN.md](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/docs/MASTER_PLAN.md) (v1.2, Section 18 Overrides).  
> **Timeline**: 20 Build Days + 10 Test Days -> Production Launch.  
> **Rule**: Never claim "DONE" without real test output and operational validation. Updated after every task.

---

## 📊 Master Schedule & Task Tracker

| Task # | Task Description | Status | Target Branch | Commit SHA | Evidence & Test Output Link | Open Risks & Caveats |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Voice Pipeline Reliability, Latency Timing & Anti-Stall Engine** | **IMPLEMENTED; live validation PENDING** | `feature/voice-reliability-stall-fix` | `1711ba2` | [VALIDATION_LOG.md](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/docs/VALIDATION_LOG.md#task-1-voice-pipeline-stall-elimination--latency-instrumentation), [test_voice_reliability.py](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/backend/tests/test_voice_reliability.py) (12/12 pass) | Third-party provider jitter (`UNVERIFIED, check provider terms`). Live call verification pending owner confirmation. |
| **2** | **Frozen Compliance Files, CI SHA-256 Hashes & CODEOWNERS** | **IN PROGRESS** | `feature/frozen-files-ci` | *Pending* | CI hash verifier script, GitHub workflow, CODEOWNERS rules | Requires owner manual branch protection configuration on GitHub. |
| **3** | **Roles (customer, developer_tester, admin) & Central Exemption Policy** | **OPEN** | `feature/roles-exemption-policy` | *Pending* | Central policy function + test suite | Compliance primitives must remain non-exemptible. |
| **4** | **Disclosure & Outbound Safety Reconciliation** | **OPEN** | `feature/disclosure-reconciliation` | *Pending* | Verification audit across 9 carry-over controls | TRAI DLT registration dependency. |
| **5** | **Caller Rights & Mid-Call Human Escalation** | **OPEN** | `feature/caller-rights-escalation` | *Pending* | Transfer & decline handlers + tests | Live carrier SIP transfer capabilities (`UNVERIFIED`). |
| **6** | **Data Retention Split & Statutory Minimization** | **OPEN** | `feature/retention-split-minimization` | *Pending* | DRY_RUN purge job + audit logs | Statutory period `CONFIRM WITH CA`. |
| **7** | **PII Sanitizer & External Log Scrubber** | **OPEN** | `feature/pii-log-scrubber` | *Pending* | Sentry/BetterStack scrubbers + tests | Sensitive metadata leakage in nested exceptions. |
| **8** | **Multi-Tenant Isolation CI Test Suite** | **OPEN** | `feature/tenant-isolation-ci` | *Pending* | Cross-tenant DB & API test suite | RLS bypass risks via service role. |
| **9** | **Admin 30-Min Idle Sessions, MFA & Step-Up Auth** | **OPEN** | `feature/admin-sessions-stepup` | *Pending* | Session timers, MFA guards, re-auth modal | Edge session revocation in Supabase auth. |
| **10** | **Prepaid Wallet, Razorpay Idempotency & Spend Limits** | **OPEN** | `feature/wallet-razorpay-quota` | *Pending* | Webhook deduplication + balance locks | Webhook delivery retries and out-of-order calls. |
| **11** | **GST Invoicing Vault & CA-Reviewed Workflows** | **OPEN** | `feature/gst-invoicing-vault` | *Pending* | PDF generator + CA review sign-off | Tax rules `CONFIRM WITH CA`. |
| **12** | **Virtual Number Lifecycle (Grace, Hold & Missed Digests)** | **OPEN** | `feature/number-lifecycle-grace` | *Pending* | Expiry routing, digest job, reactivate link | Carrier quarantine rules (`UNVERIFIED`). |
| **13** | **Bring-Your-Own Numbers (BYON - Twilio & Exotel)** | **OPEN** | `feature/byon-credential-vault` | *Pending* | Encrypted vault + sync workers | Carrier webhook signature variations. |
| **14** | **Support Tickets System (CFU Call Forwarding)** | **OPEN** | `feature/support-ticket-system` | *Pending* | Predefined ticket flows + admin triage | Operator provisioning manual delays. |
| **15** | **Encrypted KYC Vault & Admin Access Controls** | **OPEN** | `feature/encrypted-kyc-vault` | *Pending* | Storage RLS, signed URLs, no raw Aadhaar | Indian UIDAI regulations `CONFIRM WITH A LAWYER`. |
| **16** | **Essential Operations Admin Panel** | **OPEN** | `feature/essential-admin-panel` | *Pending* | Admin UI routes + audit logging | Privileged role escalation prevention. |
| **17** | **DPA, Breach Runbook & Subprocessor Register** | **OPEN** | `feature/compliance-dpa-runbook` | *Pending* | Legal documentation & security runbook | `CONFIRM WITH A LAWYER`. |
| **18** | **Observability (Sentry, BetterStack, Healthchecks)** | **OPEN** | `feature/observability-monitoring` | *Pending* | Alert probes & synthetic heartbeats | Alert fatigue; PII leakage in alerts. |
| **19** | **Automated Backup & Restore Drill** | **OPEN** | `feature/backup-restore-drill` | *Pending* | Point-in-time recovery runbook & script | Backup storage egress and encryption keys. |
| **20** | **Load Testing & Concurrency Benchmarking** | **OPEN** | `feature/load-concurrency-benchmark` | *Pending* | Telephony & WebRTC benchmark reports | Provider concurrency limits (`UNVERIFIED`). |

---

## 🎯 NEXT TASK
**Task 2**: Frozen-files CI check, SHA-256 hash manifest for validated compliance modules (`disclosure_service.py`, `outbound_safety_guardrails.py`, `prompt_guard.py`, `promptGuard.ts`), emergency-fix bypass path, single `BRAND_NAME` constant, `CODEOWNERS`, and GitHub branch-protection manual configuration instructions.
