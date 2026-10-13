# AUTHENTICATION & AUTHORIZATION AUDIT — TRINETRA AI (VAAKRITI)

> **Document Status**: AUTHORITATIVE BASELINE  
> **Source of Truth**: MASTER_PLAN.md (v1.2, Sections 18.3 & 18.4)  
> **Rule**: Clear separation between Authentication (Identity) and Authorization (Permissions).

---

## 1. Authentication Lifecycle

```
User Registration / Login
   │
   ▼
Supabase Auth (GoTrue API)
   - Issues JWT Access Token & Refresh Token
   - In Next.js SSR, tokens stored in HttpOnly, SameSite=Lax, Secure cookies
   │
   ▼
Next.js Edge Middleware (`frontend/src/middleware.ts`)
   - Intercepts all requests matching non-static paths
   - Extracts session cookies (`sb-*-auth-token`)
   - Executes session refresh via `supabase.auth.getUser()`
   - Features 8-second timeout race guard to prevent 504 gateway deadlocks
   - Resolves multi-domain cookie isolation (`.trinetraedu-ai.com` vs `.trinetra.ai`)
   - Unauthenticated requests to `/dashboard/*` or `/admin/*` redirected to `/login`
   │
   ▼
Server-Side Session Validation
   - Next.js Server Components / API Routes extract user session using `createClient` from `@/utils/supabase/server`
   - Validates user identity and retrieves linked row from `profiles`
   │
   ▼
FastAPI Backend Authentication (`backend/main.py` & services)
   - Verifies incoming Supabase JWT token bearer header or internal service role header
   - Service-to-service operations use `supabase_admin` (Service Role Key) within isolated backend contexts
```

---

## 2. Authentication vs Authorization Separation

| Dimension | Authentication (Who You Are) | Authorization (What You Can Do) |
| :--- | :--- | :--- |
| **Authority** | Supabase Auth (`auth.users`) | Application Role Engine (`profiles.role` + `role_policy_service.py`) |
| **Token / Credential** | Encrypted JWT Session Cookie | Evaluated against Canonical Roles & RLS Policies |
| **Lifecycle** | Login -> Refresh -> Logout | Evaluated dynamically on every resource request |
| **Session Bounds** | Customer: 7-day sliding session | Admin: Strict 30-minute idle session timeout (Section 18.4) |
| **Elevated Checks** | Standard MFA / Password | Step-Up Re-Authentication (<= 15 min signed JWT token) |

---

## 3. The Three Canonical Roles (Section 18.3)

| Canonical Role | Legacy Aliases | Target Users | Permissions & Invariants |
| :--- | :--- | :--- | :--- |
| **`customer`** | `client`, `user` | End business customers, coaching institute owners | Access to `/dashboard/*`, own agents, own virtual numbers, own billing. Standard quotas and spend limits enforced. |
| **`developer_tester`** | `dev_test`, `tester` | QA engineers, internal developers (max 2 humans) | Access to `/dashboard/*`. Exempt from business limits (quota, spend limit, concurrency). **EXCLUDED from business revenue metrics, MRR/ARR, and call volume.** **STRICTLY FORBIDDEN from viewing customer KYC documents.** Uses sandbox numbers only. |
| **`admin`** | `super_admin` | Platform operators, founders | Full access to `/admin/*` single-pane-of-glass operations. Exempt from business limits. Must perform step-up re-authentication for KYC view, wallet adjustments, and pricing overrides. |

---

## 4. Central Exemption Policy Engine

Located in `backend/app/services/role_policy_service.py` (and mirrored in `frontend/src/lib/safety/rolePolicy.ts`):

```python
def can_exempt(role_raw: Optional[str], limit_or_primitive: str) -> Dict[str, Any]:
    ...
```

### 4.1 Non-Exemptible Primitives (STRICT NEVER)
These security, legal, and compliance primitives can **NEVER** be bypassed by ANY role, including `admin`:
1. `ai_disclosure`: Mandatory statutory identity announcement (*"Arika from Trinetra, an AI assistant"*).
2. `call_recording_notice`: Mandatory call recording advisory and opt-out processing.
3. `pii_redaction`: Masking of 10-12 digit phone numbers and emails in logs.
4. `audit_logging`: Immutable logging of privileged actions.
5. `mfa_requirement`: Mandatory multi-factor authentication for administrative accounts.
6. `statutory_curfew`: TRAI calling hours floor (09:00–21:00 recipient local time).
7. `dnd_scrubbing`: National and internal Do-Not-Call registry scrubbing.

### 4.2 Exemptible Business Limits
The following limits may be bypassed by `developer_tester` and `admin` solely for testing:
- `agent_creation_limit`
- `phone_number_claim_limit`
- `call_concurrency_limit`
- `monthly_minutes_quota`
- `trial_period_expiry`
- `wallet_balance_zero_block`

---

## 5. Privileged Administrative Step-Up Authentication

Under Master Plan Section 18.4, standard administrative login does NOT permit immediate access to sensitive operations.

### Step-Up Trigger Actions:
1. **KYC Document View / Decryption**: Decrypting or generating pre-signed URLs for stored Aadhaar/PAN/Passports.
2. **Wallet Balance Manual Adjustments**: Crediting or debiting customer prepaid wallets.
3. **Global Pricing & Plan Overrides**: Editing system-wide rate cards or per-customer price plans.
4. **Carrier & Telephony Credential Updates**: Viewing or modifying master Twilio / Exotel credentials.

### Step-Up Workflow:
1. Admin triggers privileged action in `/admin/*`.
2. Frontend modal requests password / TOTP confirmation.
3. Endpoint `POST /api/admin/step-up` verifies credentials and issues short-lived token (`exp: <= 15 minutes`).
4. Privileged endpoint verifies step-up token before execution.
5. Action is immutably recorded in `admin_audit_trail` and `kyc_access_audit_logs`.

---

## 6. Database Row Level Security (RLS) Implementation

RLS is enabled on all public schema tables in PostgreSQL:

1. **Tenant Isolation Pattern**:
   ```sql
   CREATE POLICY "tenant_isolation_policy" ON public.agents
   FOR ALL USING (
       organization_id IN (
           SELECT organization_id FROM public.profiles WHERE id = auth.uid()
       )
       OR EXISTS (
           SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
       )
   );
   ```

2. **Immutable Audit Trails**:
   - `admin_audit_trail` and `kyc_access_audit_logs` have `INSERT` policies only.
   - `UPDATE` and `DELETE` policies are explicitly disabled (revoked from public and authenticated roles).

3. **Backend Service Role Usage**:
   - Background daemon workers (`agent.py`, `number_lifecycle_service.py`, `callback_scheduler.py`) use the Supabase Service Role client (`supabase_admin`).
   - All tenant queries executed by services explicitly inject `organization_id = ...` where clauses to guarantee tenant isolation even when operating under elevated database privileges.

---

## 7. Security-Critical Files List

The following files govern authentication, authorization, and tenant isolation:
- `frontend/src/middleware.ts`
- `frontend/src/lib/safety/rolePolicy.ts`
- `frontend/src/lib/safety/adminAuthService.ts`
- `backend/app/services/role_policy_service.py`
- `backend/app/services/admin_auth_service.py`
- `backend/app/routers/admin_auth_router.py`
- `supabase/migrations/20260810_security_audit_fixes.sql`
- `supabase/migrations/20260823143000_secure_default_user_role.sql`
- `supabase/migrations/20261004240000_create_essential_admin_panel.sql`
