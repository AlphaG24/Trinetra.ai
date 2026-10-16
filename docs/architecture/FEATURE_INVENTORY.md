# COMPLETE FEATURE INVENTORY — TRINETRA AI (VAAKRITI)

> **Document Status**: AUTHORITATIVE BASELINE  
> **Source of Truth**: MASTER_PLAN.md (v1.2, Section 18 Overrides)  
> **Classification Tiers**:
> - **CORE**: Fundamental to production operation (voice calling, billing, auth, telephony)
> - **IMPORTANT**: Critical business capabilities (campaigns, KYC, number pool, support tickets)
> - **SECONDARY**: Ancillary dashboards and administrative tools (blog CMS, partners, developer requests)
> - **OPTIONAL**: Nice-to-have integrations (Calendly, Formspree)
> - **EXPERIMENTAL**: Feature prototypes undergoing validation
> - **DEPRECATED**: Legacy tables/features preserved for backward compatibility

---

## 1. Feature Catalog

### F-01: Real-Time LiveKit Voice Agent (VikramAgent)
- **Classification**: **CORE**
- **Purpose**: Powers interactive, turn-by-turn conversational voice sessions for inbound and outbound calls.
- **User Type**: Customer, Caller, Admin, Developer/Tester
- **Entry Point**: WebRTC in `/dashboard/agents/[slug]/demo`, Inbound Webhook (`/webhooks/voice/*`), Outbound Dialer
- **Frontend Files**: `frontend/src/app/dashboard/agents/[slug]/demo/page.tsx`, `frontend/src/components/demo/VoiceDemo.tsx`, `frontend/src/lib/livekit.ts`
- **Backend Files**: `backend/agent.py`, `backend/voice_router.py`, `backend/app/services/voice_reliability_service.py`
- **Database Tables**: `voice_calls`, `agents`, `customer_contacts`, `appointments`, `leads`
- **APIs**: `POST /api/voice/livekit-token`, `POST /livekit-token`, WebSocket `/webhooks/voice/*`
- **External Services**: LiveKit Cloud/Server, Sarvam AI, ElevenLabs, Groq, Google Gemini
- **Auth/Authz**: Authenticated session or verified carrier webhook; tenant isolation enforced via `organization_id`
- **Current Status**: **VERIFIED** in tests; pending live carrier staging validation
- **Risk Level**: **CRITICAL** (Files must NOT be modified without impact analysis)

---

### F-02: Carrier Telephony & Audio Streaming (Twilio & Exotel)
- **Classification**: **CORE**
- **Purpose**: Handles domestic Indian (Exotel) and international (Twilio) PSTN phone calls, bidirectional WebSocket audio streaming, and call recording.
- **User Type**: Caller, Customer, Admin
- **Entry Point**: Webhook endpoints: `/webhooks/voice/exotel`, `/webhooks/voice/twilio`
- **Frontend Files**: `frontend/src/app/(admin)/admin/telephony/page.tsx`, `frontend/src/app/dashboard/phone-numbers/page.tsx`
- **Backend Files**: `backend/telephony_router.py`, `backend/voice_router.py`, `backend/app/services/telephony/exotel_adapter.py`, `backend/app/services/telephony/twilio.py`
- **Database Tables**: `phone_numbers`, `system_config`, `voice_calls`, `organizations`
- **APIs**: `/webhooks/voice/exotel`, `/webhooks/voice/twilio`, `/api/telephony/outbound-call`
- **External Services**: Exotel API, Twilio Voice API
- **Auth/Authz**: Carrier webhook validation; tenant mapping via URL parameter or DID resolution
- **Current Status**: **VERIFIED**
- **Risk Level**: **CRITICAL**

---

### F-03: Statutory AI Disclosure & Recording Consent
- **Classification**: **CORE (FROZEN)**
- **Purpose**: Enforces mandatory AI identity disclosure (*"Arika from Trinetra..."*) and recording consent notices at call start, handling opt-outs.
- **User Type**: Caller, All Roles
- **Entry Point**: Call initiation in `backend/agent.py`
- **Frontend Files**: `frontend/src/lib/safety/promptGuard.ts`
- **Backend Files**: `backend/app/services/disclosure_service.py` (**FROZEN**), `backend/app/services/ai/prompt_guard.py` (**FROZEN**)
- **Database Tables**: `call_disclosure_opt_out_acknowledgments`, `voice_calls`
- **APIs**: Internal agent invocation; `GET /api/compliance/summary`
- **External Services**: None
- **Auth/Authz**: Non-exemptible primitive; applies to ALL roles including `admin`
- **Current Status**: **FROZEN & VERIFIED** (Checked in CI via `scripts/verify_frozen_files.py`)
- **Risk Level**: **CRITICAL (IMMUTABLE)**

---

### F-04: Outbound Campaigns & Safety Guardrails
- **Classification**: **IMPORTANT**
- **Purpose**: Batch outbound campaign dialing with CSV contact upload, mandatory consent attestation, TRAI calling hours curfew (09:00–21:00), and DND registry scrubbing.
- **User Type**: Customer, Admin
- **Entry Point**: `/dashboard/campaigns`, `/dashboard/campaigns/[id]`
- **Frontend Files**: `frontend/src/app/dashboard/campaigns/page.tsx`, `frontend/src/app/dashboard/campaigns/[id]/page.tsx`, `frontend/src/components/campaigns/CampaignList.tsx`
- **Backend Files**: `backend/app/routers/campaign_router.py`, `backend/app/services/campaign_service.py`, `backend/app/services/outbound_safety_guardrails.py` (**FROZEN**)
- **Database Tables**: `campaigns`, `campaign_contacts`, `dnd_registry`, `callbacks`, `leads`
- **APIs**: `POST /api/campaigns`, `POST /api/campaigns/{id}/start`, `POST /api/campaigns/{id}/pause`
- **External Services**: Exotel / Twilio REST APIs
- **Auth/Authz**: Authenticated customer or admin; strictly isolates campaign contacts to tenant
- **Current Status**: **VERIFIED**
- **Risk Level**: **HIGH**

---

### F-05: Virtual Phone Number Pool & Bidding System
- **Classification**: **IMPORTANT**
- **Purpose**: Manages inventory of virtual numbers, purchase checkout, agent assignment, 30-day renewal cycle, competitive bidding on expired numbers, and auto-release.
- **User Type**: Customer, Admin
- **Entry Point**: `/dashboard/phone-numbers`, `/admin/phone-numbers`
- **Frontend Files**: `frontend/src/app/dashboard/phone-numbers/page.tsx`, `frontend/src/app/(admin)/admin/phone-numbers/page.tsx`
- **Backend Files**: `backend/app/routers/number_lifecycle_router.py`, `backend/app/services/number_lifecycle_service.py`, `backend/app/services/number_auction_service.py`
- **Database Tables**: `phone_numbers`, `phone_number_pool`, `number_bids`
- **APIs**: `/api/phone-numbers/available`, `/api/phone-numbers/purchase`, `/api/phone-numbers/{id}/renew`, `/api/phone-numbers/{id}/bid`
- **External Services**: Razorpay, Twilio / Exotel carrier APIs
- **Auth/Authz**: Customer / Admin; requires verified provider KYC before live activation
- **Current Status**: **VERIFIED**
- **Risk Level**: **HIGH**

---

### F-06: Virtual Number Expiry, Grace, Hold & Missed Digests
- **Classification**: **CORE**
- **Purpose**: Enforces Section 18.7 lifecycle: immediate neutral unavailable audio upon expiration, 15-day grace period, 14-day administrative hold, and daily missed-call summaries with reactivation links.
- **User Type**: Caller, Customer, Admin
- **Entry Point**: Telephony inbound check & background lifecycle worker
- **Frontend Files**: Expiry countdown banners in `/dashboard/phone-numbers`
- **Backend Files**: `backend/app/services/number_lifecycle_service.py`, `backend/app/routers/number_lifecycle_router.py`
- **Database Tables**: `phone_numbers`, `number_lifecycle_missed_calls`, `number_lifecycle_digests`
- **APIs**: `POST /api/numbers/{id}/expire`, `POST /api/numbers/{id}/reactivate`, `GET /api/numbers/{id}/digest`
- **External Services**: WhatsApp / Email delivery
- **Auth/Authz**: System worker & authenticated owner
- **Current Status**: **VERIFIED**
- **Risk Level**: **HIGH**

---

### F-07: Prepaid Wallet, Spend Limits & Razorpay Checkout
- **Classification**: **CORE**
- **Purpose**: Prepaid wallet ledger (`wallets`), top-up checkout via Razorpay with 18% GST calculation, monthly spend limits (default ₹2,500), and Section 18.9 zero in-call disconnect invariant.
- **User Type**: Customer, Admin
- **Entry Point**: `/dashboard/billing`, `/dashboard/checkout`
- **Frontend Files**: `frontend/src/app/dashboard/billing/page.tsx`, `frontend/src/app/dashboard/checkout/page.tsx`, `frontend/src/lib/safety/walletService.ts`
- **Backend Files**: `backend/app/routers/wallet_router.py`, `backend/app/services/wallet_service.py`, `backend/app/services/razorpay_webhook_service.py`, `backend/app/services/gst_calculator.py`
- **Database Tables**: `wallets`, `wallet_transactions`, `processed_webhook_events`, `system_config`
- **APIs**: `POST /api/billing/topup`, `POST /api/billing/verify-payment`, `POST /webhooks/razorpay`
- **External Services**: Razorpay
- **Auth/Authz**: Strict tenant isolation; webhook signature validation via `RAZORPAY_WEBHOOK_SECRET`
- **Current Status**: **VERIFIED**
- **Risk Level**: **CRITICAL**

---

### F-08: Reliability Score Engine & Free Emergency Minutes
- **Classification**: **CORE**
- **Purpose**: Replaces "credit score" permanently. Scores customer account health based on payment timeliness. When quota reaches 100%, customers with Reliability Score > 80 unlock 50 free emergency buffer minutes.
- **User Type**: Customer, Admin
- **Entry Point**: Profile & Billing dashboards
- **Frontend Files**: `frontend/src/app/dashboard/profile/page.tsx`, `frontend/src/app/dashboard/billing/page.tsx`
- **Backend Files**: `backend/app/services/wallet_service.py`, `backend/app/routers/wallet_router.py`
- **Database Tables**: `profiles` (`reliability_score`, `emergency_minutes_claimed`), `wallet_transactions`
- **APIs**: `POST /api/wallet/emergency-minutes/claim`
- **External Services**: None
- **Auth/Authz**: Customer / Admin; requires 30-day cooldown between claims
- **Current Status**: **VERIFIED**
- **Risk Level**: **HIGH**

---

### F-09: In-App GST Invoice Vault & CA Review Workflows
- **Classification**: **IMPORTANT**
- **Purpose**: Auto-generates statutory GST tax invoices (VAK/ series) with CGST/SGST/IGST breakdown, permanent in-app download vault, and CA verification review workflows.
- **User Type**: Customer, Admin, CA Reviewer
- **Entry Point**: `/dashboard/billing`, `/admin/telephony`
- **Frontend Files**: `frontend/src/app/dashboard/billing/page.tsx`, `frontend/src/app/api/billing/invoices/route.ts`
- **Backend Files**: `backend/app/routers/invoice_router.py`, `backend/app/services/invoice_vault_service.py`, `backend/app/services/pdf_invoice_generator.py`
- **Database Tables**: `invoices`, `invoice_line_items`, `invoice_ca_reviews`
- **APIs**: `GET /api/invoices`, `GET /api/invoices/{id}/pdf`, `POST /api/invoices/{id}/ca-review`
- **External Services**: ReportLab PDF Generation
- **Auth/Authz**: Customer owns invoice; admin/CA can verify and sign off
- **Current Status**: **VERIFIED**
- **Risk Level**: **HIGH**

---

### F-10: Encrypted KYC Vault & Admin Access Controls
- **Classification**: **CORE**
- **Purpose**: Collects and encrypts statutory KYC documents (AES-256-GCM at rest, short-lived signed URLs <= 15 min). Raw Aadhaar prohibited by default. Admin-only viewing with step-up re-authentication. Developer/testers strictly forbidden.
- **User Type**: Customer, Admin
- **Entry Point**: `/dashboard/kyc`, `/admin/kyc`
- **Frontend Files**: `frontend/src/app/dashboard/kyc/page.tsx`, `frontend/src/app/(admin)/admin/kyc/page.tsx`
- **Backend Files**: `backend/app/routers/kyc_router.py`, `backend/app/services/kyc_vault_service.py`
- **Database Tables**: `kyc_documents`, `kyc_access_audit_logs`
- **APIs**: `POST /api/kyc/upload`, `POST /api/kyc/documents/{id}/signed-url`, `POST /api/kyc/documents/{id}/review`
- **External Services**: Supabase Private Storage Bucket
- **Auth/Authz**: Admin only for review; `developer_tester` returns 403 Forbidden; view audit logged
- **Current Status**: **VERIFIED**
- **Risk Level**: **CRITICAL**

---

### F-11: Support Ticket System & CFU Call Forwarding
- **Classification**: **IMPORTANT**
- **Purpose**: Pre-configured support tickets for Unconditional Call Forwarding (CFU) setup, number porting, KYC issues, and billing inquiries with priority queues and SLA tracking.
- **User Type**: Customer, Admin
- **Entry Point**: `/dashboard/support`, `/admin/support`
- **Frontend Files**: `frontend/src/app/dashboard/support/page.tsx`, `frontend/src/app/(admin)/admin/support/page.tsx`
- **Backend Files**: `backend/app/routers/support_ticket_router.py`, `backend/app/services/support_ticket_service.py`
- **Database Tables**: `support_tickets`
- **APIs**: `POST /api/support/tickets/cfu`, `POST /api/support/tickets/{id}/reply`, `POST /api/support/tickets/{id}/cfu/test-call`
- **External Services**: None
- **Auth/Authz**: Customer creates/reads own tickets; admin assigns and triages
- **Current Status**: **VERIFIED**
- **Risk Level**: **MEDIUM**

---

### F-12: Bring-Your-Own Numbers (BYON - Twilio & Exotel)
- **Classification**: **IMPORTANT**
- **Purpose**: Allows enterprise customers to connect their own Twilio or Exotel accounts via an encrypted credential vault without transferring KYC or DLT compliance to Trinetra.
- **User Type**: Customer, Admin
- **Entry Point**: `/dashboard/settings?tab=integrations`, `/dashboard/phone-numbers`
- **Frontend Files**: `frontend/src/app/dashboard/settings/page.tsx`, `frontend/src/app/dashboard/phone-numbers/page.tsx`
- **Backend Files**: `backend/app/routers/byon_router.py`, `backend/app/services/byon_vault_service.py`
- **Database Tables**: `byon_carrier_credentials`, `byon_phone_numbers`
- **APIs**: `POST /api/byon/credentials`, `POST /api/byon/credentials/{id}/sync`, `POST /api/byon/numbers/{id}/assign`
- **External Services**: Customer-owned Twilio / Exotel accounts
- **Auth/Authz**: AES-256 encrypted credential vault; credentials never exposed client-side
- **Current Status**: **VERIFIED**
- **Risk Level**: **HIGH**

---

### F-13: Essential Operations Admin Panel & Step-Up Auth
- **Classification**: **CORE**
- **Purpose**: Single-pane-of-glass operations hub for user roles, tenant spend overrides, carrier pricing, audit trails, and ticket queues, protected by 30-min idle timeouts and step-up auth.
- **User Type**: Admin (Super Admin)
- **Entry Point**: `/admin`, `/admin/system`, `/admin/telephony`, `/admin/kyc`
- **Frontend Files**: `frontend/src/app/(admin)/admin/*`, `frontend/src/lib/safety/adminAuthService.ts`
- **Backend Files**: `backend/app/routers/admin_auth_router.py`, `backend/app/routers/admin_operations_router.py`, `backend/app/services/admin_auth_service.py`, `backend/app/services/essential_admin_service.py`
- **Database Tables**: `admin_audit_trail`, `profiles`, `system_config`, `wallets`
- **APIs**: `POST /api/admin/step-up`, `POST /api/admin/operations/users/{id}/role`, `GET /api/admin/operations/audit-trail`
- **External Services**: None
- **Auth/Authz**: Role must be `admin`; sensitive endpoints require step-up token
- **Current Status**: **VERIFIED**
- **Risk Level**: **CRITICAL**

---

### F-14: Three-Role Architecture & Central Exemption Engine
- **Classification**: **CORE**
- **Purpose**: Implements Section 18.3 canonical roles (`customer`, `developer_tester`, `admin`) and evaluates exemptions via a single policy function (`can_exempt`). Programmatically excludes test accounts from business metrics.
- **User Type**: All Users
- **Entry Point**: Edge middleware, backend dependencies, analytics queries
- **Frontend Files**: `frontend/src/middleware.ts`, `frontend/src/lib/safety/rolePolicy.ts`
- **Backend Files**: `backend/app/services/role_policy_service.py`
- **Database Tables**: `profiles` (`role`)
- **APIs**: Internal policy evaluation helper across all endpoints
- **External Services**: None
- **Auth/Authz**: Core security primitive
- **Current Status**: **VERIFIED** (69/69 passing tests in `test_role_policy_service.py`)
- **Risk Level**: **CRITICAL**

---

### F-15: PII Sanitizer & External Log Scrubber
- **Classification**: **CORE**
- **Purpose**: Automatically intercepts Python logging, error traces, and API payloads to mask 10-12 digit phone numbers, emails, and credentials before transmission to Sentry, BetterStack, or files.
- **User Type**: System
- **Entry Point**: Attached at backend startup (`attach_pii_filter()` in `backend/main.py`)
- **Frontend Files**: `frontend/src/lib/safety/piiScrubber.ts`
- **Backend Files**: `backend/app/services/pii_scrubber.py`
- **Database Tables**: None
- **APIs**: Logging middleware
- **External Services**: Sentry, BetterStack Logs
- **Auth/Authz**: System-wide filter
- **Current Status**: **VERIFIED** (13/13 passing tests in `test_pii_sanitizer.py`)
- **Risk Level**: **HIGH**

---

### F-16: Statutory Data Retention Split & Caller DSAR Erasure
- **Classification**: **CORE**
- **Purpose**: Splits financial records (retained for statutory CA tax period) from customer deal records/transcripts (scrubbed after 90–180 days). Supports caller right-to-be-forgotten (DSAR search, export, erasure).
- **User Type**: Caller, Customer, Admin
- **Entry Point**: `/api/caller-rights/*`, background retention purge cron
- **Frontend Files**: Privacy settings in `/dashboard/settings`
- **Backend Files**: `backend/app/routers/caller_rights_router.py`, `backend/app/services/caller_rights_service.py`, `backend/app/services/retention_policy_service.py`
- **Database Tables**: `voice_calls`, `customer_contacts`, `leads`, `invoices`
- **APIs**: `POST /api/caller-rights/search`, `POST /api/caller-rights/delete`, `POST /api/retention/purge`
- **External Services**: None
- **Auth/Authz**: Owner or statutory caller request; financial records remain immutable
- **Current Status**: **VERIFIED**
- **Risk Level**: **HIGH**

---

### F-17: Lead Extraction & CRM Contacts Pipeline
- **Classification**: **CORE**
- **Purpose**: Post-call LLM extraction of lead score, sentiment, caller name, company, budget, and summary into `customer_contacts` and `leads` with real-time dashboard notifications.
- **User Type**: Customer, Admin
- **Entry Point**: Post-call background task in `agent.py` and `voice_router.py`
- **Frontend Files**: `frontend/src/app/dashboard/leads/page.tsx`, `frontend/src/app/dashboard/customers/page.tsx`
- **Backend Files**: `backend/app/services/caller_lookup.py`, `backend/app/services/notification_service.py`
- **Database Tables**: `customer_contacts`, `leads`, `voice_calls`, `notifications`
- **APIs**: `GET /api/leads`, `GET /api/customers`, `POST /api/notifications`
- **External Services**: Telegram Bot API
- **Auth/Authz**: Tenant-isolated
- **Current Status**: **VERIFIED**
- **Risk Level**: **HIGH**

---

### F-18: Adaptive Educational Intelligence (Trinetra Shiksha)
- **Classification**: **IMPORTANT (FOUNDATIONAL)**
- **Purpose**: Original adaptive assessment and mock exam catalog foundation for coaching institutes and engineering students; includes product taxonomy, course/exam consultation workflows, and student profile structures.
- **User Type**: Student, Coaching Institute Admin
- **Entry Point**: `/products/voice`, Landing Page Shiksha section (`TrinetraShikshaSection.tsx`)
- **Frontend Files**: `frontend/src/components/landing/TrinetraShikshaSection.tsx`, `frontend/src/components/landing/WhatWeBuild.tsx`, `frontend/src/components/social/SocialAgentGallery.tsx`, `frontend/lib/site-content.ts`
- **Backend Files**: Course consultation prompts in `backend/app/services/ai/prompt_templates/`
- **Database Tables**: `available_agents`, `prompt_templates`, `product_bundles`
- **APIs**: `GET /api/products`, `GET /api/agents`
- **External Services**: None
- **Auth/Authz**: Public and student views
- **Current Status**: **VERIFIED**
- **Risk Level**: **MEDIUM**

---

### F-19: Blog & Content Management Engine
- **Classification**: **SECONDARY**
- **Purpose**: Marketing blog platform with AI content generation, keyword enhancement, moderation against banned words, and comment management.
- **User Type**: Public, Admin, Author
- **Entry Point**: `/(marketing)/blog`, `/dashboard/blogs`, `/admin/blog`
- **Frontend Files**: `frontend/src/app/(marketing)/blog/page.tsx`, `frontend/src/app/dashboard/blogs/page.tsx`, `frontend/src/components/blog/RichEditor.tsx`
- **Backend Files**: `backend/app/routers/blog_ai_router.py`, `backend/app/services/content_moderation.py`
- **Database Tables**: `subscribers`, `banned_words`, `moderation_logs`
- **APIs**: `POST /api/blog/enhance`, `POST /api/blog/moderate`, `GET /api/blog`
- **External Services**: Groq LLM
- **Auth/Authz**: Public read; author create; admin moderate
- **Current Status**: **VERIFIED**
- **Risk Level**: **LOW**

---

### F-20: Partner & Affiliate Referral Program
- **Classification**: **SECONDARY**
- **Purpose**: Partner onboarding, affiliate referral tracking, commission tier calculation, and payout logging.
- **User Type**: Partner, Admin
- **Entry Point**: `/partners`, `/partners/signup`, `/partners/dashboard`
- **Frontend Files**: `frontend/src/app/partners/page.tsx`, `frontend/src/app/partners/dashboard/page.tsx`, `frontend/lib/partners.ts`
- **Backend Files**: `frontend/src/app/actions/partners.ts`
- **Database Tables**: `partners`, `partner_referrals`
- **APIs**: `/api/partners/*`
- **External Services**: None
- **Auth/Authz**: Partner login
- **Current Status**: **VERIFIED**
- **Risk Level**: **LOW**
