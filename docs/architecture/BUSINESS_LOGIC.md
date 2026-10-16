# BUSINESS LOGIC & OPERATIONAL RULES BASELINE — TRINETRA AI (VAAKRITI)

> **Document Status**: AUTHORITATIVE BASELINE  
> **Source of Truth**: MASTER_PLAN.md (v1.2, Section 18 Overrides)  
> **Rule**: Every business rule has exactly one authoritative source of truth. Conflicting redundant implementations are prohibited.

---

## 1. Master Business Rules Registry

### RULE 1: Zero In-Call Disconnection (Master Plan Section 18.9)
- **Description**: The system must **NEVER** terminate, cut off, or hang up an active, in-progress voice call merely because an organization exhausts its minutes quota or hits its monthly spend limit mid-call.
- **Source of Truth**: `MASTER_PLAN.md` Section 18.9
- **Implementation Location**: `backend/app/services/wallet_service.py` (`check_pre_call_eligibility`) and `backend/agent.py`
- **Dependencies**: `wallets`, `organizations`
- **Side Effects**: Active call completes gracefully. Quota overage is recorded as negative balance or overdraft debt. Subsequent new calls are gated with an informational message until wallet top-up.

---

### RULE 2: Reliability Score & Free Emergency Overdraft Minutes
- **Description**: Replaces "credit score" permanently. Customers with `reliability_score > 80` who reach 100% quota exhaustion are granted a one-time buffer of **50 free emergency minutes** with a 30-day cooldown period.
- **Source of Truth**: `MASTER_PLAN.md` Section 1.1 (P7) & Section 18.9
- **Implementation Location**: `backend/app/services/wallet_service.py` (`claim_emergency_buffer_minutes`)
- **Dependencies**: `profiles.reliability_score`, `wallets`, `wallet_transactions`
- **Side Effects**: Appends 50 minutes to quota; records `EMERGENCY_MINUTES_GRANT` in `wallet_transactions`; sends polite "We Care" notification via Email & WhatsApp.

---

### RULE 3: Virtual Number Expiration, Grace & Administrative Hold Lifecycle
- **Description**:
  1. Active Period: 30 days.
  2. Upon Expiry: Callers immediately hear a professional, neutral "currently unavailable" message (no 90-day cooling).
  3. Grace Period: 15 days (customer retains ownership, can renew with 1-click reactivation link).
  4. Administrative Hold: 14 days (held in quarantine before permanent release back to pool).
  5. Missed Call Digest: Daily summary of callers who reached the expired number emailed/messaged to owner.
- **Source of Truth**: `MASTER_PLAN.md` Section 1.2 & Section 18.7
- **Implementation Location**: `backend/app/services/number_lifecycle_service.py`
- **Dependencies**: `phone_numbers`, `number_lifecycle_missed_calls`, `number_lifecycle_digests`
- **Side Effects**: Disables agent answering; logs inbound callers to missed call table; triggers email digests; releases number to pool upon hold expiration.

---

### RULE 4: Statutory Calling Hours Curfew (TRAI / FCC)
- **Description**: Outbound dialing campaigns are legally restricted to 09:00 to 21:00 recipient local time in India (TRAI TCCCPR) and 08:00 to 21:00 in the USA (TCPA). Calls outside these hours are strictly blocked.
- **Source of Truth**: `MASTER_PLAN.md` Section 3 & Section 18.3
- **Implementation Location**: `backend/app/services/outbound_safety_guardrails.py` (**FROZEN**)
- **Dependencies**: Recipient phone country code / timezone calculation
- **Side Effects**: Campaign dialer pauses queued contacts until legal calling window opens.

---

### RULE 5: Two-Party AI Identity Disclosure & Recording Consent
- **Description**: Every inbound and outbound voice call must play the mandatory AI identity disclosure within the first 5 seconds (*"Arika from Trinetra, an AI assistant"*). If recording is enabled, the caller is given an opt-out choice. If caller refuses recording, `recording_url` remains null.
- **Source of Truth**: `MASTER_PLAN.md` Section 1.3 & Section 18.5
- **Implementation Location**: `backend/app/services/disclosure_service.py` (**FROZEN**)
- **Dependencies**: `call_disclosure_opt_out_acknowledgments`, `voice_calls`
- **Side Effects**: Disables carrier recording callback; logs opt-out in compliance audit table.

---

### RULE 6: Customer Spend Limits (Default ₹2,500)
- **Description**: Default monthly spend cap is ₹2,500 per customer account. When total monthly spend exceeds this cap, subsequent outgoing calls are gated until top-up or admin override.
- **Source of Truth**: `MASTER_PLAN.md` Section 1.1 (P8)
- **Implementation Location**: `backend/app/services/wallet_service.py`
- **Dependencies**: `wallets.spend_limit`, `wallet_transactions`
- **Side Effects**: Admin can override spend limit per customer via `/admin/tenants`.

---

### RULE 7: Free Trial vs ₹99 Trial Tiers
- **Description**:
  - **Free Trial**: 1 agent, 10 min quota, web-call only, half dashboard, no knowledge base, no number purchase.
  - **₹99 Trial**: Full dashboard, 7 days validity, 50 min quota, can buy & assign numbers, 2 agents limit.
- **Source of Truth**: `MASTER_PLAN.md` Section 1.1 (P1, P2)
- **Implementation Location**: `backend/app/services/pricing_service.py` & `frontend/src/app/api/billing/route.ts`
- **Dependencies**: `profiles.trial_tier`, `profiles.trial_ends_at`
- **Side Effects**: Gating in frontend UI and backend agent creation routes.

---

### RULE 8: Admin 30-Minute Idle Timeout & Step-Up Re-Authentication
- **Description**: Admin sessions expire after 30 minutes of idle inactivity. Privileged actions (KYC view, wallet adjustments, global price changes, carrier credentials) require explicit password / TOTP re-authentication valid for <= 15 minutes.
- **Source of Truth**: `MASTER_PLAN.md` Section 18.4
- **Implementation Location**: `backend/app/services/admin_auth_service.py`, `frontend/src/lib/safety/adminAuthService.ts`
- **Dependencies**: `admin_audit_trail`, Supabase Auth session
- **Side Effects**: Every privileged action writes an immutable audit log with admin identity, IP, and timestamp.

---

### RULE 9: Developer / Tester Account Exemption & Metrics Exclusion
- **Description**: The `developer_tester` role is exempt from business limits (quota, spend limit, concurrency) for testing purposes, but is **programmatically excluded from business revenue (MRR/ARR), call volume, and compliance metrics**, and is **strictly forbidden from viewing customer KYC documents**.
- **Source of Truth**: `MASTER_PLAN.md` Section 18.3 & Section 18.4
- **Implementation Location**: `backend/app/services/role_policy_service.py`
- **Dependencies**: `profiles.role`
- **Side Effects**: Analytics SQL queries filter `WHERE role != 'developer_tester'`.

---

### RULE 10: Automatic Pool Expansion
- **Description**: When available virtual numbers in the pool drop below 10, the system alerts admins or triggers auto-provisioning via Exotel/Twilio API.
- **Source of Truth**: `MASTER_PLAN.md` Section 1.2 (N6)
- **Implementation Location**: `backend/app/services/number_service.py`
- **Dependencies**: `phone_numbers`, `system_config`
- **Side Effects**: Admin notification sent via Telegram bot; carrier order placed.
