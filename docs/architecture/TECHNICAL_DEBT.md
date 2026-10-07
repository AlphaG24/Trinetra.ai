# TECHNICAL DEBT REGISTRY & REFACTORING SAFEGUARD — TRINETRA AI (VAAKRITI)

> **Document Status**: AUTHORITATIVE BASELINE  
> **Source of Truth**: MASTER_PLAN.md (v1.2, Section 18 Overrides)  
> **Rule**: Technical debt does NOT justify unsolicited refactoring. Existing working functionality must be preserved.

---

## 1. Technical Debt Inventory

| Item ID | Component Area | Description | Current Impact | Recommended Future Action (When Authorized) |
| :--- | :--- | :--- | :--- | :--- |
| **DEBT-01** | Frontend Source Tree | Dual directory structures: `frontend/components/` and `frontend/src/components/`, `frontend/lib/` and `frontend/src/lib/`. | Imports resolve via `@/*` fallback; creates potential confusion over file source. | Consolidate legacy files strictly into `frontend/src/` via atomic import redirects after full build verification. |
| **DEBT-02** | Migration Folders | Dual migration directories: `database/migrations/` (70 legacy files) vs `supabase/migrations/` (61 active files). | Supabase CLI uses `supabase/migrations/`; `database/` retained as historical backup. | Archive `database/migrations/` to `backups/migrations/` once all environments are verified on Supabase CLI. |
| **DEBT-03** | Next.js Build Flags | `typescript.ignoreBuildErrors: true` in `next.config.ts`. | Permits Next.js builds even if minor typing warnings exist. | Resolve all TypeScript typing warnings incrementally and re-enable strict typecheck enforcement in CI. |
| **DEBT-04** | FastApi Lifespan | `@app.on_event("startup")` and `@app.on_event("shutdown")` in `backend/main.py`. | Emits Starlette deprecation warnings in logs; functional at runtime. | Migrate to `@asynccontextmanager` lifespan handler pattern in FastAPI. |
| **DEBT-05** | Brand Rebranding State | Application brand name transition: "Trinetra" to "Vaakriti". Master Plan Section 18.5 locks `BRAND_NAME = "Trinetra"` until Phase 5.5. | UI text references "Trinetra"; domain remains `trinetraedu-ai.com`. | Execute full rebranding sprint (Phase 5.5) only after `vaakriti.com` domain acquisition and DNS setup. |
| **DEBT-06** | Test Client vs HTTPX | Incompatibilities between `httpx 0.28.1` and `starlette 0.35.1` prevent Starlette `TestClient` from running in certain tests. | Route tests use direct service function calls or simulated HTTP mocks. | Pin compatible versions of Starlette / HTTPX in `requirements.txt`. |
| **DEBT-07** | Legacy Scheme Tables | 13 legacy MSME / scheme tables were cleaned up in migration `20260908000000_db_cleanup_and_validity_lifecycle.sql`. | Cleaned in database; legacy references removed from active code. | Retain migration for audit trail. |

---

## 2. Refactoring Safety Guidelines

1. **No Refactoring for Aesthetics**:
   - A piece of working code must not be refactored merely because another pattern (e.g. classes vs closures, or Redux vs Zustand) appears cleaner.
2. **Backward Compatibility First**:
   - When retiring an old API endpoint or parameter, wrap it in a backward-compatible adapter that proxies to the new implementation.
3. **Atomic Migration Verification**:
   - Technical debt cleanup must occur on a dedicated `fix/<name>` or `chore/<name>` branch, verified against the 32-point regression test suite before merging into `dev`.
