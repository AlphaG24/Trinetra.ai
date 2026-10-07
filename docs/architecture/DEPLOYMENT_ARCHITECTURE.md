# DEPLOYMENT ARCHITECTURE & INFRASTRUCTURE TOPOLOGY — TRINETRA AI (VAAKRITI)

> **Document Status**: AUTHORITATIVE BASELINE  
> **Source of Truth**: MASTER_PLAN.md (v1.2, Sections 14 & 18.1)  
> **Rule**: Branch topology, zero-force-push rules, and environment mappings are strictly locked.

---

## 1. Production Hosting & Cloud Infrastructure

```
┌──────────────────────────────────────────────────────────────────┐
│                    VERCEL (Global Edge)                          │
│                    Frontend: Next.js 16 App Router               │
│                    Domains: trinetraedu-ai.com                   │
│                             app.trinetraedu-ai.com               │
│                             admin.trinetraedu-ai.com             │
└──────────────┬───────────────────────────────────────────────────┘
               │
               ├───▶ SUPABASE PRO (Mumbai ap-south-1 Region)
               │    ├── PostgreSQL 15 Database (RLS Enforced)
               │    ├── GoTrue Auth (SSR Cookie Sessions)
               │    ├── Storage (Encrypted KYC Vault & Recordings)
               │    └── Realtime WebSocket Engine
               │
               └───▶ VULTR MUMBAI VPS / RENDER (4 vCPU / 8 GB RAM)
                    ├── FastAPI Backend Service (Port 8000)
                    ├── LiveKit Voice Agent Worker (agent.py)
                    ├── Self-Hosted LiveKit Server (Port 7880)
                    └── Telephony Webhook Streaming Gateway
```

### 1.1 External Services Matrix
- **Telephony Carriers**: Exotel (India domestic virtual numbers & SIP trunking) + Twilio (Global).
- **Speech & AI Providers**: Sarvam AI (Indic STT/TTS), ElevenLabs (English TTS), Groq (LLM inference).
- **Payment Gateway**: Razorpay (India launch: UPI, credit/debit cards, netbanking).
- **Monitoring & Observability**: Sentry (Error tracking), BetterStack (Uptime & log aggregation), Healthchecks.io (Cron heartbeats).

---

## 2. Git Branching & Deployment Strategy (Section 18.1)

```
main (Production Branch — Locked to Vercel Production)
  │
  └── dev (Integration Branch — Integration & Staging Environment)
       │
       ├── feature/voice-pipeline-improvements
       ├── feature/security-phase-1
       ├── feature/wallet-billing
       ├── feature/number-lifecycle
       ├── feature/kyc-management
       ├── feature/admin-panel
       └── fix/[name]
```

### 2.1 Branch Rules
1. **`main`**: Production branch. Deployments triggered automatically upon pull request merge from `dev`.
2. **`dev`**: Integration branch. All active development branches stem from `dev`.
3. **`feature/<name>`**: Dedicated feature branches. PRs target `dev` and require:
   - Green CI checks (`verify-frozen.yml`, typecheck, unit tests).
   - Explicit written owner review and approval.
4. **Vercel Production Target**: Locked permanently to `main`. Preview deployments run on `dev` and feature PRs.

---

## 3. Zero-Destruction & Rollback Strategy

> **STRICT NON-NEGOTIABLE RULE**:  
> **NEVER run `git reset --hard` or `git push --force` on ANY branch.**

### Rollback Protocol:
1. **Primary Code Rollback**:
   - Execute `git revert <commit-sha>` to create a clean, traceable reverting commit.
   - Push reverting commit through standard PR workflow.
2. **Immediate Production Mitigation**:
   - Redeploy the previous known-good build artifact directly in the Vercel / Render hosting console (instant zero-downtime rollback).
3. **Database Safeguard**:
   - Zero AI writes to remote DB.
   - All migrations are purely additive with symmetric `down` SQL scripts manually executed by the owner on staging.

---

## 4. Domain & DNS Configuration

| Subdomain / Host | Points To | Service |
| :--- | :--- | :--- |
| `trinetraedu-ai.com` | Vercel Edge | Marketing Landing Page, Blog, Docs |
| `app.trinetraedu-ai.com` | Vercel Edge (Rewrite -> `/dashboard`) | Client Customer Dashboard |
| `admin.trinetraedu-ai.com` | Vercel Edge (Rewrite -> `/admin`) | Admin Operations Panel |
| `api.trinetraedu-ai.com` | Vultr Mumbai / Render | FastAPI Backend & Telephony Webhooks |
| `ws.trinetraedu-ai.com` | Vultr Mumbai VPS | LiveKit WebRTC Server (Port 7880) |

*Note on Rebranding to `vaakriti.com`*: As dictated by Master Plan Section 14, all code rebranding can proceed, but the production domain remains on `trinetraedu-ai.com` until `vaakriti.com` is acquired and DNS is migrated in Phase 5.5.
