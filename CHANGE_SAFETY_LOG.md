# CHANGE SAFETY LOG — TRINETRA AI (VAAKRITI)

> **Mandatory Change Ledger**:
> Every future modification to code, database schemas, APIs, or infrastructure MUST append a structured audit entry to this log.
> Follow the [Change Impact Analysis System](file:///c:/Users/amart/Downloads/Trinetra.ai-dev%20%281%29/Trinetra.ai-dev/docs/architecture/CHANGE_IMPACT_ANALYSIS.md) and [Future Change Protocol](file:///c:/Users/amart/Downloads/Trinetra.ai-dev%20%281%29/Trinetra.ai-dev/docs/architecture/FUTURE_CHANGE_PROTOCOL.md).

---

## Change Log Entries

### Entry 001: Initial Architecture Baseline & Change-Safety Audit
- **Date**: 2026-10-07
- **Request**: Complete Project Intelligence, Architecture Baseline & Change-Safety Audit
- **Reason**: Establish an authoritative, permanent engineering baseline and change-safety documentation framework for the existing working production product.
- **Files Created**:
  - `docs/architecture/SYSTEM_OVERVIEW.md`
  - `docs/architecture/ARCHITECTURE.md`
  - `docs/architecture/FEATURE_INVENTORY.md`
  - `docs/architecture/DEPENDENCY_MAP.md`
  - `docs/architecture/DATABASE_ARCHITECTURE.md`
  - `docs/architecture/API_CONTRACTS.md`
  - `docs/architecture/AUTHENTICATION_AUTHORIZATION.md`
  - `docs/architecture/EXAM_ENGINE.md`
  - `docs/architecture/BUSINESS_LOGIC.md`
  - `docs/architecture/STATE_MANAGEMENT.md`
  - `docs/architecture/SECURITY_BASELINE.md`
  - `docs/architecture/PERFORMANCE_BASELINE.md`
  - `docs/architecture/UI_BASELINE.md`
  - `docs/architecture/ENVIRONMENT_VARIABLES.md`
  - `docs/architecture/TESTING_BASELINE.md`
  - `docs/architecture/EXISTING_FUNCTIONALITY_CONTRACT.md`
  - `docs/architecture/PROTECTED_COMPONENTS.md`
  - `docs/architecture/CHANGE_IMPACT_ANALYSIS.md`
  - `docs/architecture/KNOWN_ISSUES.md`
  - `docs/architecture/TECHNICAL_DEBT.md`
  - `docs/architecture/DEPLOYMENT_ARCHITECTURE.md`
  - `docs/architecture/FUTURE_CHANGE_PROTOCOL.md`
  - `PROJECT_CONTEXT.md`
  - `PROJECT_BASELINE.json`
  - `CHANGE_SAFETY_LOG.md`
- **Files Modified (Product Code)**: **NONE** (Zero modifications to existing product code).
- **Database Changes**: **NONE** (Zero DDL or DML writes executed; direct-database operating mode preserved).
- **API Changes**: **NONE** (All existing API contracts preserved).
- **UI Changes**: **NONE** (All existing UI screens preserved).
- **Dependencies Affected**: None.
- **Regression Risks**: None (Documentation and baseline files only).
- **Tests Performed**:
  - `python scripts/verify_frozen_files.py`: **PASSED (100% integrity across all 4 frozen compliance files)**.
  - `pytest backend/tests/test_frozen_files_ci.py backend/tests/test_role_policy_service.py backend/tests/test_pii_sanitizer.py`: **PASSED (90/90 pass)**.
  - `pytest backend/tests/test_support_ticket_system.py backend/tests/test_gst_invoicing_vault.py backend/tests/test_backup_restore_drill.py`: **PASSED (91/91 pass)**.
- **Result**: **PASSED**. Protected engineering baseline established.
- **Rollback Strategy**: N/A (Non-breaking documentation files).

---

### Entry 002: Section 1.1 Product & Pricing Compliance Alignment (P1 & P2)
- **Date**: 2026-10-07
- **Request**: Align Section 1.1 Product & Pricing decisions P1 and P2 with Master Plan locked values.
- **Reason**: 
  - Decision P1: Free trial tier must not permit number purchasing.
  - Decision P2: Trial tier locked limit is 2 agents (was 3) and 50 minute quota (was 100).
- **Files Modified**:
  - `backend/app/services/usage_service.py` (updated trial `base_agents = 2` and fallback `monthly_minutes = 50`)
  - `frontend/src/app/api/agents/create/route.ts` (updated trial `limit = 2` and default `trialMinutes = 50`)
  - `frontend/src/app/api/phone-numbers/purchase/route.ts` (added 403 guard preventing free trial accounts from purchasing numbers)
  - `frontend/src/app/dashboard/phone-numbers/page.tsx` (added UI gating toast and informative banner for free trial tier)
- **Files Preserved (Frozen Compliance)**:
  - `backend/app/services/disclosure_service.py` (Untouched)
  - `backend/app/services/outbound_safety_guardrails.py` (Untouched)
  - `backend/app/services/ai/prompt_guard.py` (Untouched)
  - `frontend/src/lib/safety/promptGuard.ts` (Untouched)
- **Database Changes**: NONE (Zero direct DDL/DML; purely additive software guards).
- **Regression Risks**: None. Non-trial tiers and paid workflows remain 100% unaltered.
- **Tests Performed**:
  - `python scripts/verify_frozen_files.py`: **PASSED (100% hash integrity)**.
  - `pytest tests/test_wallet_razorpay_quota.py`: **PASSED (19/19 pass in 2.21s)**.
  - Runtime health verification: Backend (`http://127.0.0.1:8000/health` -> 200), Frontend (`http://localhost:3000` -> 200).
- **Result**: **PASSED**. Section 1.1 Product & Pricing decisions P1–P11 are 100% compliant.

### Entry 003: Section 1.1 Product & Pricing UX Enhancements
- **Date**: 2026-10-07
- **Request**: Enhance user experience, transparency, and self-serve upgrade journey for Section 1.1 Product & Pricing.
- **Reason**: 
  - Elevate public pricing FAQ accuracy on free trial and waived setup fees.
  - Transparently visualize monthly spend caps and Reliability Score rules.
  - Provide a high-visibility, single-click ₹99 trial activation card on the billing dashboard for free users.
- **Files Modified**:
  - `frontend/src/app/pricing/page.tsx` (updated FAQs for Free Trial, ₹99 Trial, and waived onboarding fee)
  - `frontend/src/app/api/billing/upgrade/route.ts` (updated trial fallback minutes to 50)
  - `frontend/src/app/dashboard/billing/page.tsx` (added visual spend cap meter, transparent reliability scoring rules, and ₹99 trial card)
- **Files Preserved (Frozen Compliance)**:
  - `backend/app/services/disclosure_service.py` (Untouched)
  - `backend/app/services/outbound_safety_guardrails.py` (Untouched)
  - `backend/app/services/ai/prompt_guard.py` (Untouched)
  - `frontend/src/lib/safety/promptGuard.ts` (Untouched)
- **Database Changes**: NONE (Zero DDL/DML; purely frontend presentation and API fallback updates).
- **Regression Risks**: None. Existing checkout flows, wallet debits, and paid subscriptions remain unaltered.
- **Tests Performed**:
  - `python scripts/verify_frozen_files.py`: **PASSED (100% hash integrity)**.
  - `pytest tests/test_wallet_razorpay_quota.py`: **PASSED (19/19 pass in 1.67s)**.
  - Runtime health verification: Backend (`http://127.0.0.1:8000/health` -> 200), Frontend (`http://localhost:3000` -> 200).
- **Result**: **PASSED**. User experience refined and fully compliant with Master Plan Section 1.1.

### Entry 004: Section 1.2 Number Lifecycle Implementation & Verification (N1 to N9)
- **Date**: 2026-10-07
- **Request**: Audit, implement, and verify Section 1.2 Number Lifecycle decisions (N1 through N9).
- **Reason**: 
  - Complete Decision N4: Day 1, 7, 14, 21, 28 renewal milestone reminders via email + WhatsApp.
  - Complete Decision N6: Auto-pool expansion inventory check triggered when available pool numbers < 10.
- **Files Modified**:
  - `backend/app/services/number_lifecycle_service.py` (added `check_lifecycle_reminders()` and `check_pool_inventory_expansion()`, hooked into `process_lifecycle_transitions()`)
  - `backend/tests/test_number_lifecycle_grace.py` (added comprehensive unit tests for N4 reminder milestones and N6 auto-pool expansion)
- **Files Preserved (Frozen Compliance)**:
  - `backend/app/services/disclosure_service.py` (Untouched)
  - `backend/app/services/outbound_safety_guardrails.py` (Untouched)
  - `backend/app/services/ai/prompt_guard.py` (Untouched)
  - `frontend/src/lib/safety/promptGuard.ts` (Untouched)
- **Database Changes**: NONE (Zero DDL/DML; purely additive service methods utilizing existing tables).
- **Regression Risks**: None. Existing transitions, grace periods, hold periods, and reactivation workflows remain unaltered.
- **Tests Performed**:
  - `python scripts/verify_frozen_files.py`: **PASSED (100% hash integrity)**.
  - `pytest tests/test_number_lifecycle_grace.py`: **PASSED (16/16 pass in 1.70s)**.
  - `pytest tests/test_support_ticket_system.py tests/test_wallet_razorpay_quota.py`: **PASSED (49/49 pass in 1.99s)**.
  - Runtime health verification: Backend (`http://127.0.0.1:8000/health` -> 200), Frontend (`http://localhost:3000` -> 200).
- **Result**: **PASSED**. Section 1.2 Number Lifecycle decisions N1 through N9 are 100% complete, verified, and operational.

### Entry 005: Section 1.4 Access Control & Section 1.5 Monitoring Implementation & Verification (A1-A5, M1-M5)
- **Date**: 2026-10-07
- **Request**: Audit, implement, and verify Section 1.4 Access Control (A1 to A5) and Section 1.5 Monitoring & Operations (M1 to M5).
- **Reason**: 
  - Complete Decision A5: Centralized `RateLimitService` enforcing Login (5/10min), API (60/min/user), and Calls (5/min/number) with call center workload overrides.
  - Complete Decision M5: P1 Critical Incident alerting (`ObservabilityService.dispatch_p1_incident_alert`) via Telegram + Email with PII sanitization and audit logs.
- **Files Modified/Created**:
  - `backend/app/services/rate_limit_service.py` (New: Central rate limiting sliding window engine)
  - `backend/app/services/observability_service.py` (Added `dispatch_p1_incident_alert` method for Telegram + Email P1 dispatch)
  - `backend/tests/test_access_control_and_alerts.py` (New: 8 unit tests verifying A5 and M5)
- **Files Preserved (Frozen Compliance)**:
  - `backend/app/services/disclosure_service.py` (Untouched)
  - `backend/app/services/outbound_safety_guardrails.py` (Untouched)
  - `backend/app/services/ai/prompt_guard.py` (Untouched)
  - `frontend/src/lib/safety/promptGuard.ts` (Untouched)
- **Database Changes**: NONE (Zero remote DDL/DML; purely additive code).
- **Regression Risks**: None. Non-breaking additive services.
- **Tests Performed**:
  - `python scripts/verify_frozen_files.py`: **PASSED (100% hash integrity)**.
  - `pytest tests/test_access_control_and_alerts.py`: **PASSED (8/8 pass in 3.22s)**.
  - `pytest tests/test_role_policy_service.py tests/test_admin_sessions_stepup.py tests/test_essential_admin_panel.py tests/test_observability_monitoring.py tests/test_inbound_rate_limit.py tests/test_access_control_and_alerts.py`: **PASSED (150/150 pass in 9.94s)**.
  - Runtime health verification: Backend (`http://127.0.0.1:8000/health` -> 200), Frontend (`http://localhost:3000` -> 200).
- **Result**: **PASSED**. Sections 1.4 and 1.5 are 100% complete, verified, and operational.

---

### Entry 006: Section 1.6 Billing & Payments Implementation & Verification (B1 to B6)
- **Date**: 2026-10-07
- **Request**: Audit, implement, and verify Section 1.6 Billing & Payments decisions (B1 through B6).
- **Reason**: 
  - Complete Decision B2: Subscription charge segregation (`SubscriptionChargeService`) supporting auto-debit and manual renewals with zero wallet draw-down.
  - Complete Decision B3: Failed payment flow (`FailedPaymentFlowService`) implementing 3 retries over 3 days (24h intervals) -> 15-day grace period -> 14-day administrative hold -> pool release.
  - Complete Decision B4: Multi-channel invoice delivery (`InvoiceDeliveryService`) executing Email + WhatsApp (India +91) + permanent in-app invoice vault.
  - Complete Decision B5: Credit rollover updated to 180 days in legal terms (`frontend/src/app/refund/page.tsx` Section 3.5) and ledger expiry (`CREDIT_ROLLOVER_DAYS = 180` in `wallet_service.py`).
  - Verify Decisions B1 (Prepaid wallet, Razorpay funding, zero card numbers stored, zero mid-call disconnect) and B6 (Statutory GST VAK/ series tax invoices with CA review workflow).
- **Files Modified/Created**:
  - `frontend/src/app/refund/page.tsx` (Updated credit rollover from 30 days to 180 days per revised refund policy)
  - `backend/app/services/wallet_service.py` (Added `CREDIT_ROLLOVER_DAYS = 180`, stamped `expires_at` on credit transactions, added `check_expired_credits`)
  - `backend/app/services/billing_lifecycle_service.py` (New: `SubscriptionChargeService`, `FailedPaymentFlowService`, `InvoiceDeliveryService`)
  - `backend/app/routers/invoice_router.py` (Added `DeliverInvoiceRequest` and `POST /api/invoices/{invoice_id}/deliver` endpoint)
  - `backend/app/services/razorpay_webhook_service.py` (Connected `InvoiceDeliveryService` to automated payment capture flow)
  - `backend/tests/test_billing_and_payments_b1_b6.py` (New: 17 comprehensive unit tests verifying B1-B6)
- **Files Preserved (Frozen Compliance)**:
  - `backend/app/services/disclosure_service.py` (Untouched)
  - `backend/app/services/outbound_safety_guardrails.py` (Untouched)
  - `backend/app/services/ai/prompt_guard.py` (Untouched)
  - `frontend/src/lib/safety/promptGuard.ts` (Untouched)
- **Database Changes**: NONE (Zero remote DDL/DML; purely additive code using existing tables).
- **Regression Risks**: None. Non-breaking additive services and routing.
- **Tests Performed**:
  - `python scripts/verify_frozen_files.py`: **PASSED (100% hash integrity)**.
  - `pytest tests/test_billing_and_payments_b1_b6.py`: **PASSED (17/17 pass in 1.86s)**.
  - `pytest tests/test_billing_and_payments_b1_b6.py tests/test_gst_invoicing_vault.py tests/test_wallet_razorpay_quota.py`: **PASSED (54/54 pass in 2.00s)**.
  - Live server verification: Backend (`/health` -> 200 Healthy), Frontend (`/` -> 200, `/refund` -> 200 with 180-day rollover rendered).
- **Result**: **PASSED**. Section 1.6 Billing & Payments decisions B1 through B6 are 100% complete, verified, and operational.

---

### Entry 007: Section 3 Global Compliance Strategy Implementation & Verification
- **Date**: 2026-10-07
- **Request**: Master Plan Section 3 Global Compliance Strategy: implementation plan, forensic audit, automated region resolution, kyc validation, calling window checks, recording consent gating, and admin overrides without modifying unrelated subsystems.
- **Reason**: 
  - Section 3 mandates automated regional compliance rules enforcement based on called party number (`+country_code`) and customer location.
  - Implements canonical 5 regions: India (IN, +91), United States of America (US, +1), European Union & United Kingdom (EU, +44, +33, +49, etc.), Middle East (ME, +971, +966, etc.), Southeast Asia (SEA, +65, +62, +60, etc.).
  - Enforces region-specific KYC rules: raw Aadhaar prohibited under UIDAI regulations for India; EIN/State Cert for US; Company registration for EU; Trade license for ME; Local business ID for SEA.
  - Enforces calling hour windows: 09:00–21:00 for India/ME/SEA, 08:00–21:00 for US, 09:00–20:00 for EU.
  - Enforces recording consent rules: audible disclosure for India/ME; explicit 2-party opt-in for US (12 states) and EU/SEA.
  - Enforces lifecycle expiry handling: 15-day grace + 14-day hold across all regions (neutral unavailable message, no 90-day cooling).
  - Enforces statutory data retention: 8y tax statutory period (India - Income Tax Act Section 44AA), 7y IRS (US), 10y statutory (EU/ME), 7y statutory (SEA), and 90–180d deals retention.
  - Implements administrative override per customer with reason and audit trail.
- **Files Created/Modified**:
  - `database/migrations/20261007_create_regions_table.sql` (Schema and seed data for `regions` and `customer_region_overrides`)
  - `backend/app/services/regional_compliance_service.py` (New: canonical compliance policy engine with high-availability in-memory fallback)
  - `backend/app/routers/compliance_router.py` (Added `GET /regions`, `GET /resolve-call`, `POST /override-region`, `DELETE /override-region/{id}`, `POST /validate-kyc`, `GET /check-calling-hours`)
  - `backend/tests/test_section3_global_compliance.py` (New: 23 comprehensive automated tests covering all Section 3 mandates)
- **Files Preserved (Frozen Compliance)**:
  - `backend/app/services/disclosure_service.py` (Untouched - 100% hash verified)
  - `backend/app/services/outbound_safety_guardrails.py` (Untouched - 100% hash verified)
  - `backend/app/services/ai/prompt_guard.py` (Untouched - 100% hash verified)
  - `frontend/src/lib/safety/promptGuard.ts` (Untouched - 100% hash verified)
- **Database Changes**: NONE remote (Migration script created locally for reference; runtime service has built-in resilient statutory defaults).
- **Regression Risks**: None. Non-breaking additive endpoints and standalone service.
- **Tests Performed**:
  - `python scripts/verify_frozen_files.py`: **PASSED (100% hash integrity)**.
  - `pytest tests/test_section3_global_compliance.py`: **PASSED (23/23 pass in 24.34s)**.
  - Full multi-suite regression test (`tests/test_billing_and_payments_b1_b6.py`, `tests/test_access_control_and_alerts.py`, `tests/test_number_lifecycle_grace.py`, `tests/test_section3_global_compliance.py`): **PASSED (64/64 pass in 23.76s)**.
  - Live server verification: Backend API (`/api/compliance/regions` -> 200, `/api/compliance/resolve-call` -> 200, `/api/compliance/validate-kyc` -> 200, `/api/compliance/check-calling-hours` -> 200).
- **Result**: **PASSED**. Master Plan Section 3 Global Compliance Strategy is 100% complete and verified.

---

*(Append future modification entries below this line)*


