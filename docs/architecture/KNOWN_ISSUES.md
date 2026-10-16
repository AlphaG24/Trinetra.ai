# KNOWN ISSUES, DEFECTS & ARCHITECTURAL VULNERABILITIES

> **Document Status**: AUTHORITATIVE BASELINE  
> **Source of Truth**: Repository Forensic Audit & Test Execution Logs  
> **Rule**: Rigorously distinguish between:
> - **Category A: ACTUAL BUGS** (objectively broken functionality)
> - **Category B: SECURITY VULNERABILITIES** (exploitable security or compliance risks)
> - **Category C: PERFORMANCE PROBLEMS** (measurable bottlenecks or deadlocks)
> - **Category D: TECHNICAL DEBT** (working code requiring eventual maintenance)
> - **Category E: ARCHITECTURAL PREFERENCES** (alternative designs; NOT a bug)

---

## 1. Category A: Actual Bugs

### ISSUE-A1: Missing `livekit-plugins-google` in Global Environment
- **Severity**: Medium (Environment / Test Isolation)
- **Impact**: Pytest fails during collection of `test_a1d_gender_resolver.py` or agent appointment tool tests when running in a Python environment where `livekit-plugins-google` is not installed (`ImportError: cannot import name 'google' from 'livekit.plugins'`).
- **Affected Files**: `backend/agent.py` (line 66), `backend/requirements.txt`
- **Mitigation / Note**: `requirements.txt` specifies `livekit-plugins-google`. Running within the project virtual environment with all requirements installed resolves the import.

### ISSUE-A2: Deprecated FastAPI Startup/Shutdown Handlers
- **Severity**: Low
- **Impact**: Deprecation warnings emitted on server launch (`@app.on_event("startup")` and `@app.on_event("shutdown")`). FastAPI / Starlette encourages migration to lifespan context managers.
- **Affected Files**: `backend/main.py` (lines 124–164)
- **Status**: Functional; does not block runtime execution.

### ISSUE-A3: Deprecated Standard Library `audioop` on Python 3.12+
- **Severity**: Low
- **Impact**: `DeprecationWarning: 'audioop' is deprecated and slated for removal in Python 3.13`.
- **Affected Files**: `backend/voice_router.py` (line 29), `backend/requirements.txt` (`audioop-lts`)
- **Status**: `backend/requirements.txt` contains `audioop-lts>=0.2.1; python_version >= "3.13"` to guarantee compatibility on Python 3.13+.

---

## 2. Category B: Security Vulnerabilities & Compliance Caveats

### ISSUE-B1: Next.js TypeScript Build Errors Suppressed
- **Severity**: High (Code Safety)
- **Impact**: `typescript: { ignoreBuildErrors: true }` in `frontend/next.config.ts`. Suppressing type errors can hide null pointer exceptions, unchecked API parameters, or typing mismatches during production builds.
- **Affected Files**: `frontend/next.config.ts` (lines 40–44)
- **Mitigation**: Perform strict typecheck audits incrementally without disabling the flag until all legacy typing inconsistencies are cleaned up.

### ISSUE-B2: CSP `unsafe-eval` and `unsafe-inline` Present
- **Severity**: Medium
- **Impact**: Content Security Policy in `frontend/next.config.ts` includes `'unsafe-eval'` (required for Spline/Vapi 3D SDKs) and `'unsafe-inline'` (required for Next.js inline scripts until full nonce generation is configured).
- **Mitigation**: Mitigated by `frame-ancestors 'none'` and strict domain whitelisting. Nonce-based CSP is planned for post-launch hardening.

### ISSUE-B3: Statutory Assumptions Requiring Legal & CA Review
- **Severity**: Medium (Legal Compliance)
- **Impact**: Certain regulatory items in `MASTER_PLAN.md` must be reviewed by legal counsel or chartered accountants:
  - Raw Aadhaar prohibition and UIDAI guidelines (`CONFIRM WITH A LAWYER`).
  - Automated Reliability Score decisions under statutory frameworks (`CONFIRM WITH A LAWYER`).
  - GST invoice series and statutory retention period (`CONFIRM WITH CA`).
- **Mitigation**: Code labels strictly use `IMPLEMENTED, pending legal review` and avoid unverified `COMPLIANT` claims.

---

## 3. Category C: Performance Problems

### ISSUE-C1: Carrier Trunking Concurrency Floor
- **Severity**: Medium
- **Impact**: Default trial and standard carrier trunks (Exotel / Twilio) enforce limits of 5–10 concurrent calls. Without pre-provisioning carrier concurrency increases, outbound campaigns dialers hitting >10 calls receive carrier busy/reject codes.
- **Affected Files**: `backend/telephony_router.py`, `backend/app/services/campaign_service.py`
- **Mitigation**: Concurrency guard in `voice_router.py` enforces max 10 concurrent calls per organization to prevent carrier account suspension.

### ISSUE-C2: Direct Database Connections vs PgBouncer Pooling
- **Severity**: Medium
- **Impact**: Under high concurrency (>100 simultaneous calls), direct PostgreSQL connections to Supabase (port 5432) can exhaust the max connection limit.
- **Affected Files**: `backend/database.py`
- **Mitigation**: Production deployments should connect via Supabase Transaction Pooler (port 6543) or Supavisor.

---

## 4. Category D: Technical Debt

### ISSUE-D1: Dual Directory Mirroring (`frontend/components` vs `frontend/src/components`)
- **Severity**: Low
- **Impact**: The repository contains both `frontend/components/` and `frontend/src/components/`, as well as `frontend/lib/` and `frontend/src/lib/`. While `tsconfig.json` paths resolve `@/*` to `./src/*` first and fall back to `./*`, maintaining duplicate directory trees creates confusion for developers.
- **Affected Files**: `frontend/components/`, `frontend/src/components/`, `frontend/tsconfig.json`
- **Rule**: Do NOT delete or bulk-move files during this baseline audit. Preserve existing imports.

### ISSUE-D2: Dual Migration Trees (`database/migrations` vs `supabase/migrations`)
- **Severity**: Low
- **Impact**: Historical schema migrations exist in both `database/migrations/` (70 files) and `supabase/migrations/` (61 files).
- **Status**: The active migration directory used by Supabase CLI is `supabase/migrations/`.

---

## 5. Category E: Architectural Preferences (NOT Bugs)

### ITEM-E1: Monorepo vs Polyrepo
- **Observation**: Frontend and backend reside in one monorepo repository managed via root `package.json` workspaces. Some teams prefer separate git repositories for Next.js and FastAPI.
- **Classification**: **ARCHITECTURAL PREFERENCE**. The monorepo structure allows unified CI testing, shared TypeScript/Python schema synchronizations, and synchronized deployments.

### ITEM-E2: Tailwind CSS 4 with `@tailwindcss/postcss`
- **Observation**: Frontend uses modern Tailwind CSS 4 with PostCSS.
- **Classification**: **ARCHITECTURAL PREFERENCE**. Fully functional and compatible with Next.js 16.
