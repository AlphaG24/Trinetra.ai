# SPEC-001: Sarvam-Managed Voice Pipeline for Trinetra AI (Bridge Phase)
**Status: FINALIZED**
**Owner: Ketan Singh / Raghav Thakur**
**Target Window: 5 Days (Customer-Ready & Commercial Launch)**
**Branch: feature/sarvam-managed-pipeline**

---

## 1. Objective & Scope
Temporarily replace the unstable custom LiveKit/local SIP pipeline with **Sarvam AI (Samvaad Voice Platform)** as the real-time execution engine. 
This allows immediate onboarding of paying customers with zero local server crashes, sub-second latency in Hindi/Indian English, and automated TRAI compliance, while leaving the existing custom pipeline architecture completely intact for future migration.

---

## 2. Core Pillars & Architectural Invariants

1. **Non-Destructive Safe Switch (Invariant)**:
   - All custom Twilio/Exotel routers and local agents remain in the codebase.
   - Controlled via `TELEPHONY_ROUTING_MODE=sarvam_managed` in `.env`. Switching back to `custom_pipeline` requires only an env flip.
2. **Tenant Privacy & Multi-Tenancy (Invariant)**:
   - Each customer sees only their agents, calls, leads, and numbers on Trinetra.
   - Sarvam master account coordinates via `app_id: trinetra-<agent_id>` with custom metadata (`trinetra_org_id`, `trinetra_agent_id`).
3. **Automated Number Inventory (Pool Model)**:
   - Admin rents 2-5 pool numbers in Sarvam UI once.
   - Customers claim/buy a number in Trinetra; Trinetra calls Sarvam Inbound Deployments API (`POST /deployments`) to link the number automatically.
4. **Outbound Campaigns & Instant Dials**:
   - Trinetra dispatches instant and batch calls via `POST /api/outbounds`.
   - Sarvam webhooks stream call recordings, transcripts, and duration back to Trinetra DB.

---

## 3. Success Criteria (Measurable)
- [ ] Inbound calls to assigned pool numbers answer with the customer's Trinetra agent prompt in Hindi/English.
- [ ] Outbound direct dials from the dashboard ring prospect phones within 3 seconds.
- [ ] Post-call transcripts, durations, and audio URLs appear on the customer's Trinetra Call Logs and Leads page within 30 seconds of hangup.
- [ ] Customer A cannot see Customer B's calls or transcripts under any condition.
- [ ] Both Next.js and FastAPI run without memory leaks or unhandled 500 errors.
