---
phase: 1
plan: 1
wave: 1
---

# Plan 1.1: Sarvam Number Deployment & Telephony Linking Bridge

## Objective
Enable automatic binding of Indian DID numbers in Trinetra to Sarvam Inbound Deployments so that whenever a customer assigns a pool number to their agent, it is immediately registered on Sarvam's platform without manual admin effort.

## Context
- `.gsd/SPEC.md`
- `.gsd/ROADMAP.md`
- `backend/app/services/sarvam_agent_manager.py`
- `backend/telephony_router.py`
- `frontend/src/app/api/phone-numbers/[id]/assign/route.ts`

## Tasks

<task type="auto">
  <name>Implement Sarvam Inbound Linker in telephony_router</name>
  <files>backend/telephony_router.py, backend/app/services/sarvam_agent_manager.py</files>
  <action>
    - Add robust LinkDeploymentRequest validation and idempotency check.
    - Check if the target phone number is already active in Sarvam deployments.
    - If active, update the deployment mapping; if not, create a new deployment via `POST /deployments`.
    - Handle network errors gracefully and return structured JSON response.
  </action>
  <verify>.venv\Scripts\python.exe -c "import asyncio; from app.services.sarvam_agent_manager import SarvamAgentManager; m = SarvamAgentManager(); deps = asyncio.run(m.list_deployments()); assert len(deps) > 0, 'No deployments found'"</verify>
  <done>Deployments API lists existing numbers and allows dynamic binding.</done>
</task>

<task type="auto">
  <name>Wire Frontend Number Assignment to Sarvam Inbound API</name>
  <files>frontend/src/app/api/phone-numbers/[id]/assign/route.ts, frontend/src/app/api/phone-numbers/pool/purchase/route.ts</files>
  <action>
    - Ensure assigning a number in Trinetra triggers a background call to `/api/sarvam/link-deployment`.
    - Ensure pool purchase also calls deployment linker if the purchased number is Sarvam/Indian (+91).
    - Ensure failures in background sync do not break the database write or fail the user transaction.
  </action>
  <verify>curl.exe -s http://127.0.0.1:8000/docs | grep -q "link-deployment"</verify>
  <done>Frontend triggers linker and backend exposes /api/sarvam/link-deployment endpoint.</done>
</task>

## Success Criteria
- [ ] Number assignment in Trinetra triggers Sarvam deployment API in background.
- [ ] Backend returns 200 with deployment ID.
- [ ] Existing custom pipeline code paths remain 100% functional.
