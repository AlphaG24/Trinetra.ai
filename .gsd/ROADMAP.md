# ROADMAP: Sarvam-Managed Commercial Launch Pipeline (5-Day Target)

---

## Phase 1: Engine Foundation & Inbound Number Linking (Day 1)
- **Goal**: Implement `SarvamAgentManager` to bind Trinetra agents to Sarvam's `inbound_outbound` deployments API when claimed by customers.
- **Deliverables**:
  - `backend/app/services/sarvam_agent_manager.py` (authoring, deployment, release)
  - Backend router `/api/sarvam/link-deployment`
  - Frontend auto-trigger on number assignment (`/api/phone-numbers/[id]/assign` & `pool/purchase`)

## Phase 2: Dynamic Agent Sync & Prompt Versioning (Day 2)
- **Goal**: When customer updates their agent on Trinetra (name, prompt, voice, greeting), automatically sync changes to Sarvam App Authoring API.
- **Deliverables**:
  - Auto-sync hook on agent create/update routes (`/api/agents/[id]`)
  - Hindi & Indian voice mapping (Shubh, Ritu, Anand, Meera)
  - Compliance opening greeting enforcement (`SEC-011`)

## Phase 3: Outbound Campaigns & Real-time Live Dials (Day 3)
- **Goal**: Commercial outbound calling pipeline using Sarvam Instant Outbounds and batch scheduling.
- **Deliverables**:
  - Connect Dashboard Campaign launcher to Sarvam Outbound API
  - Direct Live Dial modal parameterization with customer custom variables
  - Non-blocking DB logging with instant connection response

## Phase 4: Webhook Ingestion, Transcripts & Lead Generation (Day 4)
- **Goal**: Ingest Sarvam call recordings, audio URLs, and transcripts into Trinetra DB with strict tenant isolation.
- **Deliverables**:
  - Polish `/webhooks/voice/sarvam` to parse completed call payload
  - Auto-create/update Leads and Activity Feed entries
  - Real-time client updates on Call History dashboard

## Phase 5: Multi-Tenant Security Verification & End-to-End Trial (Day 5)
- **Goal**: Empirical testing of the entire loop with real SIM phone numbers and cross-tenant leakage checks.
- **Deliverables**:
  - Live inbound call verification with test numbers
  - Live outbound campaign verification
  - Multi-tenant boundary audit (Customer A vs Customer B)
  - Production readiness signoff
