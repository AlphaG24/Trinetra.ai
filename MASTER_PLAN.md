# TRINETRA AI — MASTER ARCHITECTURE v3.0

**Enterprise Voice Agent Platform — Complete MVP Specification**
**Last Updated:** 2026-07-24  
**Primary Domain:** `trinetraedu-ai.com`  
**Repository:** Monorepo (Next.js 14 + FastAPI)  
**Database:** Supabase PostgreSQL with RLS  
**Authentication:** Supabase Auth (SSR Cookie‑based JWT)

---

## 0. SYSTEM DESIGN RULES (v3 – Enhanced)

- **RULE 1: SINGLE SOURCE OF TRUTH.** One table per entity; no duplication.  
- **RULE 2: SECURITY BY DEFAULT.** No hardcoded secrets; RLS on every table; AES‑256 for PII; SHA‑256 for hashing.  
- **RULE 3: TENANT ISOLATION.** Enforced at database level; user A never sees user B’s data.  
- **RULE 4: REAL‑TIME CONFIGURATION.** All business settings (pricing, limits, trials) are controlled via the Admin System Config UI and take effect instantly – no redeploys.  
- **RULE 5: PROFESSIONAL UI/UX.** Uses shadcn/ui with a custom design system; dark/light mode for dashboard only; skeleton loaders, animations, and dynamic layouts – no generic box structures.  
- **RULE 6: COMPLIANCE FIRST.** DPDP Act consent logging is mandatory; regional adaptability (IN/US) with appropriate STT/TTS and legal frameworks.  
- **RULE 7: MULTI‑PERSONALITY AGENT (USP).** One agent can handle sales, support, and queries simultaneously via intent‑based routing.  

---

## 1. DOMAIN & SUBDOMAIN ARCHITECTURE

| Subdomain | Purpose |
|-----------|---------|
| `trinetraedu-ai.com` | Marketing site + Blog |
| `app.trinetraedu-ai.com` | Client Dashboard (all tools) |
| `admin.trinetraedu-ai.com` | Admin Dashboard (global control) |
| `api.trinetraedu-ai.com` | FastAPI backend |

*All subdomains are served by the same Next.js project via Vercel rewrites (defined in `vercel.json`).*

---

## 2. PROJECT STRUCTURE (UPDATED)
trinetra-ai/
├── frontend/
│ ├── src/
│ │ ├── middleware.ts # Auth, role routing, region detection
│ │ ├── app/
│ │ │ ├── (marketing)/ # Public pages
│ │ │ ├── (auth)/ # Login, Signup, Consent
│ │ │ ├── (dashboard)/ # Client dashboard (all protected)
│ │ │ │ ├── dashboard/
│ │ │ │ │ ├── overview/ # Main analytics
│ │ │ │ │ ├── onboarding/ # NEW – inside dashboard layout
│ │ │ │ │ ├── marketplace/ # Agent cards & detail
│ │ │ │ │ ├── agents/ # Agent config & demo
│ │ │ │ │ ├── leads/ # Kanban board
│ │ │ │ │ ├── billing/ # Dynamic pricing
│ │ │ │ │ ├── integrations/ # Telegram, WhatsApp, etc.
│ │ │ │ │ ├── support/ # Ticket system
│ │ │ │ │ └── settings/ # Profile, region, theme
│ │ │ └── (admin)/ # Admin dashboard (role‑protected)
│ │ │ └── admin/
│ │ │ ├── overview/
│ │ │ ├── marketplace/ # CRUD for platform_services
│ │ │ ├── tenants/ # User management
│ │ │ ├── templates/ # Agent prompt templates
│ │ │ ├── system/ # API keys, pricing, limits
│ │ │ ├── analytics/ # Global charts
│ │ │ ├── support/ # All support tickets
│ │ │ ├── notifications/ # Broadcast messages
│ │ │ └── audit-logs/ # Consent records & actions
│ │ ├── components/
│ │ │ ├── ui/ # shadcn/ui, theme‑toggle, skeleton
│ │ │ ├── dashboard/ # Client‑specific components
│ │ │ └── admin/ # Admin‑specific components
│ │ └── lib/ # Supabase clients, encryption, utils
├── backend/ # FastAPI
│ ├── app/
│ │ ├── core/ # security (AES‑256, SHA‑256), auth
│ │ ├── routes/ # API endpoints
│ │ ├── services/ # Telephony (LiveKit), AI (Groq/Sarvam)
│ │ └── workers/ # Background jobs
│ └── prompts/ # Personality prompts
└── infra/ # Docker, monitoring

text

---

## 3. DATABASE SCHEMA (v3 ADDITIONS)

All original tables are retained. The following migrations have been applied:

```sql
-- 1. Profiles: Region, theme, onboarding status
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'IN',
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- 2. Agents: Multi‑personality support (JSON)
ALTER TABLE agents 
  ADD COLUMN IF NOT EXISTS personalities JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'IN';

-- 3. Consent records (append‑only, DPDP compliant)
CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    consent_type TEXT NOT NULL,
    consent_version TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. System config (seeded with defaults)
INSERT INTO system_config (config_key, config_value, description) VALUES
    ('free_demo_minutes', '10', 'Free demo minutes'),
    ('trial_price_paisa', '9900', 'Trial price (₹99)'),
    ('trial_days', '7', 'Trial duration'),
    ('trial_minutes', '100', 'Trial minutes'),
    ('default_region', 'IN', 'Default region for new users')
ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value;
RLS Policies: All tables have RLS enabled; organization_id or user_id are used for tenant isolation.

4. ROUTE ARCHITECTURE (COMPLETE MAP)
Public Routes
Route	Page
/	Marketing landing page
/marketplace	Public agent catalog (read‑only)
/marketplace/[slug]	Public agent detail page
Auth Routes
Route	Page
/login	Login
/signup	Signup + DPDP consent form
Client Dashboard (app.trinetraedu-ai.com)
Route	Page	Status
/dashboard	Main overview with analytics	🔄 Redesign
/dashboard/onboarding	Profile & business setup (inside layout)	✅ Moved
/dashboard/marketplace	Agent marketplace (cards)	✅ Built
/dashboard/marketplace/[slug]	Agent detail (photo/video, pricing, demo CTAs)	✅ Built
/dashboard/agents	List of user’s agents	🔄 Fix empty state
/dashboard/agents/[id]	Agent configuration (5 tabs)	✅ Built
/dashboard/agents/[id]/demo	Live demo call	✅ Built
/dashboard/leads	Kanban board	✅ Built
/dashboard/billing	Pricing plans & upgrade	✅ Dynamic
/dashboard/integrations	Telegram, WhatsApp, etc.	✅ Built
/dashboard/support	Support tickets	✅ Built
/dashboard/settings	Profile, region, theme	🔄 Redesign
Admin Dashboard (admin.trinetraedu-ai.com)
Route	Page	Status
/admin	Global overview	🔄 Redesign
/admin/marketplace	Manage agents (CRUD)	☐ Build
/admin/tenants	User management	🔄 Fix suspend/delete
/admin/templates	Agent prompt templates	☐ Build
/admin/system	System config (API keys, pricing, limits)	☐ Make functional
/admin/analytics	Global charts & revenue	☐ Build
/admin/support	All support tickets	☐ Build
/admin/notifications	Broadcast messages	☐ Build
/admin/audit-logs	Consent & action logs	🔄 Build
5. AUTHENTICATION & AUTHORIZATION (FIXED)
Middleware (src/middleware.ts):

Detects profiles.role from the JWT.

If role is super_admin or admin, forces redirect to /admin on login.

All /admin/* routes require role IN ('admin', 'super_admin'); otherwise redirect to /login.

Onboarding route is now inside (dashboard) and only accessible after login.

DPDP Consent:

After signup, user must consent before accessing the dashboard.

Consent is recorded in consent_records (non‑deletable).

Admin can view all consent records in /admin/audit-logs.

6. USER FLOWS (v3 – UPDATED)
Admin Flow
Login with super_admin email → automatically lands on /admin.

Marketplace Management: Add/edit/remove agents (name, logo, description, pricing, photo/video). Changes reflect instantly on client marketplace.

Tenant Management: View all users, suspend/delete accounts, override limits, send messages.

System Configuration: Live edit of API keys, trial parameters, pricing; changes take effect without redeploy.

Global Analytics: Monitor call volume, revenue, active agents.

Support & Notifications: Manage tickets and send platform‑wide alerts.

Audit & Compliance: View permanent DPDP consent logs and admin action logs.

Client Flow
Signup + Consent → redirected to /dashboard.

Onboarding (/dashboard/onboarding) – complete business details, region, and Telegram connection (visible only if onboarding_complete = false).

Marketplace: Browse agents; click to view details (photo/video, features, pricing).

Try Agent:

Free Demo: Click “Start Demo” → basic details form → 10‑minute web call.

₹99 Trial: Click “Start Trial” → full business form → Razorpay payment → 7‑day, 100‑minute trial with dedicated number.

Post‑trial/demo: When limits are exhausted, the agent is blocked and an upgrade modal appears.

Active Agent Dashboard: Full configuration (tone, voice, knowledge base, integrations), leads board, analytics.

Multi‑Personality: User can toggle which personality modes are active (sales, support, query) or keep all active.

7. MULTI‑PERSONALITY AGENT (USP – v3)
Implementation:

When a call comes in, the LLM first classifies the user intent (sales, support, general query).

Based on classification, the system dynamically injects the appropriate persona prompt and voice ID.

The user dashboard allows toggling which personas are active.

Database storage:

json
// agents.personalities
[
  { "type": "sales", "voice_id": "vikram", "prompt_ref": "sales_prompt.txt", "active": true },
  { "type": "support", "voice_id": "priya", "prompt_ref": "support_prompt.txt", "active": true },
  { "type": "query", "voice_id": "default", "prompt_ref": "query_prompt.txt", "active": true }
]
Routing logic: Handled in the FastAPI agent worker.

8. REGIONAL & LANGUAGE SYSTEM (v3)
User selects country/region during onboarding (profiles.country, profiles.region).

Determines:

STT/TTS provider: Sarvam AI for IN (Hindi/Hinglish), Deepgram/ElevenLabs for US (US‑EN).

Currency: INR for IN, USD for US.

Legal compliance: DPDP for IN, CCPA for US (future).

Default accent and voice.

Admin can override region‑specific settings via System Config.

9. INTEGRATIONS ARCHITECTURE
Each agent can be connected to:

Telegram: Real‑time lead notifications and chat handover.

WhatsApp (Twilio): Send lead alerts.

Email (SMTP): Automated follow‑ups.

CRM (Webhook): Push qualified leads (extracted data) to external systems.

Calendar (Cal.com): Schedule appointments.

Integration credentials are stored encrypted in integrations table (AES‑256).

10. UI/UX DESIGN SYSTEM (v3 – OVERHAUL)
Fonts: Inter (body), Cal Sans (headings), JetBrains Mono (code) – defined in frontend/src/app/layout.tsx.

Colors: Custom design tokens based on deep purple and orange, with full dark/light modes.

Components: shadcn/ui with custom theming.

Data Loading: Skeleton screens everywhere; no flash of unstyled content.

Animations: Framer Motion for page transitions, hover effects, and micro‑interactions.

Layout: Clean, spacious, with consistent spacing and typography.

11. SECURITY & COMPLIANCE (v3)
Encryption: All PII (phone, email, GSTIN) encrypted with AES‑256‑GCM before storage.

Hashing: Passwords and tokens hashed with SHA‑256.

RLS: Every table has policies that enforce organization_id or user_id isolation.

Audit Logs: Admin actions (user suspension, config changes, etc.) are logged to audit_logs with timestamp and admin ID.

DPDP Consent: Consent records are immutable and stored permanently.

12. COST & PERFORMANCE
LLM: Groq (fast, free during dev) – will be replaced with Gemini/GPT in production.

STT/TTS: Sarvam (IN) / Deepgram+ElevenLabs (US) – cost managed via region routing.

Database: Supabase free tier, with monitoring to scale.

Caching: Redis (optional) for system config to reduce DB reads