---
phase: 2
plan: 1
wave: 1
---

# Plan 2.1: Dynamic Agent Authoring & Prompt Sync to Sarvam

## Objective
Automatically sync agent configuration (name, system prompt, Indian voice, greeting, and compliance disclosures) to Sarvam's App Authoring API whenever an agent is created or saved in the Trinetra dashboard.

## Context
- `.gsd/SPEC.md`
- `.gsd/ROADMAP.md`
- `backend/app/services/sarvam_agent_manager.py`
- `frontend/src/app/api/agents/[id]/route.ts`

## Tasks

<task type="auto">
  <name>Add create_or_update_app method to SarvamAgentManager</name>
  <files>backend/app/services/sarvam_agent_manager.py</files>
  <action>
    - Add `create_or_update_app(app_id, name, prompt, greeting, voice_id, language)` method.
    - Map Trinetra voices (Shubh, Ritu, Aditya, Neha) to Sarvam Bulbul voice speaker names.
    - Guarantee SEC-011 AI identity disclosure and call recording disclosure in the synced prompt.
  </action>
  <verify>.venv\Scripts\python.exe -c "from app.services.sarvam_agent_manager import SarvamAgentManager; m = SarvamAgentManager(); assert hasattr(m, 'create_or_update_app'), 'Missing create_or_update_app'"</verify>
  <done>SarvamAgentManager has create_or_update_app method implemented.</done>
</task>

<task type="auto">
  <name>Trigger Sarvam App Sync in Agent Update API Route</name>
  <files>frontend/src/app/api/agents/[id]/route.ts</files>
  <action>
    - On successful agent PATCH, dispatch background sync request to FastAPI backend (`/api/sarvam/sync-agent`).
    - Ensure sync errors never block or slow down the frontend UI save.
  </action>
  <verify>curl.exe -s http://127.0.0.1:8000/docs | grep -q "sync-agent"</verify>
  <done>Next.js PATCH route triggers background Sarvam sync on agent save.</done>
</task>

## Success Criteria
- [ ] Saving an agent in Trinetra calls Sarvam sync in background.
- [ ] Agent name and prompt are registered on Sarvam platform.
