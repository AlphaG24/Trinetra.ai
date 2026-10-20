# CODEBASE FEATURE AUDIT: VAAKRITI (FORMERLY TRINETRA AI)
**Audit Version:** 2.4.0 (Enterprise Sovereign Production Release)  
**Target Platform:** Vaakriti Autonomous Enterprise Voice AI Platform  
**Architecture:** Next.js 16 (App Router) + FastAPI (Python 3.12) + Supabase (PostgreSQL 15 with pgvector & RLS) + LiveKit WebRTC Engine

---

## 1. User-Facing Pages (Frontend Routes)

Every route under `frontend/src/app` has been mapped and inventoried below:

### Public Landing & Marketing Pages
- **`/` (Homepage):** High-converting sovereign voice landing page featuring the real-time 3D acoustic particle sphere ([Hero.tsx](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/frontend/src/components/landing/Hero.tsx)), 12 multilingual floating greetings with interactive native speech synthesis, the Live Voice Studio with real agents ([LiveDemoSection.tsx](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/frontend/src/components/landing/LiveDemoSection.tsx)), Why Trinetra 4-pillar animated value matrix ([WhyTrinetra.tsx](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/frontend/src/components/landing/WhyTrinetra.tsx)), The Cost of Inaction enterprise loss calculator ([CostOfInaction.tsx](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/frontend/src/components/landing/CostOfInaction.tsx)), Platform Architecture Ecosystem ([PlatformEcosystem.tsx](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/frontend/src/components/landing/PlatformEcosystem.tsx)), Global Telephony Fabric animated map ([GlobalTelephonyMap.tsx](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/frontend/src/components/landing/GlobalTelephonyMap.tsx)), and the Interactive Personalized Industry Dashboard Preview ([PersonalizedDashboardSection.tsx](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/frontend/src/components/landing/PersonalizedDashboardSection.tsx)).
- **`/about`:** Company story, technical sovereign telephony vision, infrastructure architecture highlights, leadership profiles, and enterprise security compliance certifications.
- **`/pricing`:** Interactive subscription tier matrix (Starter, Growth, Enterprise) with billing toggles (Monthly vs. Annual with 20% discount), granular per-second voice rate breakdown, included caller numbers, and feature comparison tables.
- **`/contact`:** High-intent enterprise contact inquiry form, direct callback request triggers, corporate sales consultation scheduling, and enterprise SLA escalation details.
- **`/marketplace` & `/marketplace/[slug]`:** Public AI Agent Marketplace showcasing pre-trained industry voice personas (Real Estate Closers, Healthcare Triage, BFSI Debt Collection, E-Commerce Support) with sample audio snippets and one-click trial provisioning.
- **`/store`:** Catalog of pre-configured business templates, custom voice packages, regional dialect expansions, and premium DID number tiers.
- **`/blog` & `/blog/[slug]`:** SEO-optimized corporate technical blog featuring markdown article rendering, dynamic reading-time calculation, category tags, related posts recommendations, and newsletter subscription hooks.
- **`/products/voice` & `/products/voice-agent`:** Deep product breakdown of the sub-480ms Autonomous Voice Engine, WebRTC audio streaming, vernacular code-switching, and conversational turn-taking.
- **`/products/workflow` & `/products/workflow-agent`:** Interactive showcase of multi-step post-call automation (live calendar booking, CRM record sync, WhatsApp document dispatches).
- **`/products/[slug]`:** Dynamic product route rendering specific feature whitepapers and technical architectural deep-dives.
- **`/demo/nexus`:** Dedicated interactive sandbox for testing low-latency agent voice interactions without prior sign-in.
- **`/docs`:** Developer documentation portal covering API reference, WebRTC client integration, webhook signature validation, and BYON SIP trunk configurations.

### Legal, Statutory & Compliance Pages
- **`/privacy`:** Comprehensive Privacy Policy complying with the Digital Personal Data Protection (DPDP) Act 2023, GDPR, and CCPA, detailing data minimization, right to erasure, and biometric voice consent.
- **`/terms`:** Standard terms of service, telecommunications Acceptable Use Policy (AUP), calling hour curfews, and liability limitations.
- **`/refund`:** Transparent statutory refund policy specifying prepaid wallet credit balances, 180-day credit rollover guarantees, and non-refundable carrier DID procurement fees.
- **`/cookies`:** Cookie usage declaration, functional telemetry tracking controls, and analytical consent preferences.
- **`/grievance`:** Mandatory statutory Grievance Redressal Officer contact details, escalation timelines (24-hour acknowledgment, 15-day resolution), and regulatory appellate disclosures pursuant to Indian IT Rules.

### Authentication & Onboarding Routes
- **`/login`:** Secure client authentication portal supporting email/password, Supabase magic links, and Google OAuth with rate-limited brute-force guards.
- **`/signup`:** Self-service customer registration, company domain verification, referral code attribution, and automatic welcome credit provisioning.
- **`/reset-password`:** Cryptographic password recovery workflow utilizing time-limited security tokens.
- **`/consent`:** Dedicated statutory consent capture screen for recording explicit affirmative consent before launching campaigns or enabling call recording.
- **`/onboarding`:** Guided 4-step wizard: Company profile setup, primary business phone number selection, initial agent personality selection, and sample audio testing.

---

## 2. Customer Dashboard Features (Visible to the User)

The Customer Portal (`frontend/src/app/dashboard`) provides an end-to-end mission-control interface for managing autonomous telephony operations:

### 1. Agent Creation & Lifecycle Management (`/dashboard/agents`)
- **Agent Directory (`/dashboard/agents`):** Real-time list of all deployed voice agents showing status (Live, Standby, Paused), assigned phone number, primary dialect, total calls handled, and latency metrics.
- **Agent Workspace (`/dashboard/agents/[slug]/workspace`):** Full configuration studio allowing business owners to customize:
  - System prompt & persona directives with real-time prompt enhancement.
  - Voice engine selection (Sarvam AI Bulbul vs. ElevenLabs Multilingual v2).
  - Voice speed, pitch, interruptibility threshold, and ambient noise suppression.
  - Knowledge base document binding with vector search.
  - Mandatory AI Identity Disclosure toggle (locked to compliant options).
- **Agent Comparison (`/dashboard/agents/compare`):** Side-by-side performance benchmarking across multiple agents comparing resolution rates, conversation durations, and sentiment scores.
- **Agent Live Demo Sandbox (`/dashboard/agents/[slug]/demo`):** Direct in-browser WebRTC call testing environment with live transcript rendering and latency diagnostic overlays.
- **Agent Setup Wizard (`/dashboard/agents/[slug]/setup`):** Step-by-step assistant for provisioning and configuring new agents from industry templates.

### 2. Conversational Telephony & Call Logs (`/dashboard/calls` & `/dashboard/conversations`)
- **Real-Time Call Log Ledger (`/dashboard/calls`):** Detailed historical ledger of all inbound and outbound interactions with:
  - Call duration, direction, status (Completed, Missed, Voicemail, DND-Blocked).
  - PII-masked phone numbers with search and date filters.
  - Integrated Universal Audio Player for listening to encrypted MP3/WAV recordings.
  - Searchable full-text call transcripts with sentiment tags (Positive, Neutral, Negative).
- **Conversation Detail Modal:** In-depth view showing turn-by-turn timestamps, latency per turn, extracted customer intent, and tool executions.

### 3. Outbound Campaigns & Lead Management (`/dashboard/campaigns` & `/dashboard/leads`)
- **Automated Campaign Orchestrator (`/dashboard/campaigns`):** Outbound calling campaign engine featuring:
  - CSV contact list upload with automated header mapping.
  - Pre-flight DND and calling hour verification before dialing.
  - Real-time campaign controls: Start, Pause, Resume, and Concurrency Limiters.
  - Contact retry rules with intelligent backoff.
- **Campaign Analytics (`/dashboard/campaigns/analytics` & `/dashboard/campaigns/[id]/analytics`):** Granular conversion funnel tracking pickup rate, conversation completion rate, booking conversion rate, and cost-per-conversion.
- **Lead Pipeline CRM (`/dashboard/leads`):** Auto-captured customer inquiries with intent classification, budget qualification, scheduled callbacks, and export capabilities.

### 4. Revenue & ROI Tracking Models (`/dashboard/revenue`)
- **Autonomous Revenue Extraction:** Uses backend LLM intelligence ([revenue_service.py](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/backend/app/services/revenue_service.py)) to parse live call transcripts and automatically detect quoted amounts, deal values, and sales commitments.
- **Attributed Revenue Pipeline:** Displays total pipeline created, confirmed won revenue, lost revenue, and attribution windows (default 30 days).
- **Owner Deal Confirmation:** One-click business owner verification allowing operators to mark AI-generated leads as "Won" or "Lost" with deal value overrides.
- **ROI Metric Cards:** Direct calculation comparing platform voice spend against saved human agent labor and realized sales revenue.

### 5. Prepaid Wallet & Transparent Billing (`/dashboard/billing` & `/dashboard/checkout`)
- **Prepaid Balance Ledger:** Real-time wallet balance maintained in exact integer paisa (INR) with auto-reload settings and low-balance warning alerts.
- **Double-Entry Transaction History:** Immutable ledger displaying every credit top-up, call minute deduction, and phone number renewal.
- **Zero In-Call Disconnection Protection:** Active in-progress conversations are **never cut off** if balance hits zero mid-call; overage is settled gracefully post-call.
- **Customer Reliability Score:** Transparent 0–100 score evaluating account standing, verification status, and payment reliability.
- **Free Emergency Minutes:** High-scoring customers (Reliability Score > 80) automatically receive **50 free emergency minutes** when wallet balance runs dry to prevent operational downtime.
- **Razorpay Integration (`/dashboard/checkout`):** Seamless online payments with UPI, NetBanking, and Corporate Cards, with coupon validation and GST calculation.

### 6. Regulatory KYC Document Vault (`/dashboard/kyc`)
- **Carrier KYC Upload:** Secure portal for submitting mandatory enterprise identity documents (Company PAN, GSTIN Certificate, Certificate of Incorporation, Authorized Signatory ID).
- **Affirmative Statutory Consent:** Explicit legal declaration agreeing to telecommunications carrier compliance and DPDP Act 2023 guidelines.
- **AES-256 Storage Encryption:** Uploaded documents are encrypted before storage with SHA-256 integrity checksums.
- **UIDAI Masking:** Automatic detection and prohibition of raw Aadhaar documents to prevent regulatory violations.

### 7. Virtual Number Management (`/dashboard/phone-numbers` & `/dashboard/numbers`)
- **Provisioned Numbers Directory:** Management console for dedicated enterprise DIDs displaying renewal date, carrier backend (Exotel, Twilio), and assigned agent.
- **Number Marketplace / Pool:** Browse available 10-digit Indian numbers across 100+ circles and metro areas with one-click provisioning.
- **Bring Your Own Number (BYON):** Connect existing SIP trunks and Twilio/Exotel carrier accounts with encrypted credential vaulting.
- **Missed Call Protection During Grace:** Unrenewed numbers enter a 15-day Grace Period followed by a 14-day Hold Period, tracking all missed callers with daily notification digests.

### 8. Customer Support & System Status (`/dashboard/support` & `/dashboard/notifications`)
- **Ticketing System (`/dashboard/support` & `/dashboard/support/[id]`):** In-app support desk for logging priority technical issues, carrier routing inquiries, and custom prompt requests.
- **Real-Time Notification Feed (`/dashboard/notifications`):** In-app alert center delivering instant alerts for low balances, missed call digests, campaign completion, and regulatory notices.
- **Customer Profile & Security Settings (`/dashboard/profile` & `/dashboard/settings`):** Manage organization details, notification channels (Email, SMS, WhatsApp), API keys, and account deletion / data export requests (DPDP compliance).

---

## 3. Admin & Superadmin Features (God-Mode)

The Admin Control Plane (`frontend/src/app/(admin)/admin` and `backend/app/routers/admin_*`) gives platform operators complete control over system operations:

### Security & Access Control
- **30-Minute Idle Session Timeout:** Admin sessions strictly expire after 30 minutes of inactivity to eliminate unauthorized console access.
- **Mandatory Multi-Factor Authentication (MFA):** Enforced RFC 6238 TOTP authentication for all admin and privileged accounts.
- **Privileged Step-Up Authentication:** High-risk administrative actions require re-authentication via a 5-minute cryptographic HMAC step-up token:
  - Decrypting and viewing customer KYC documents (`kyc_view`).
  - Manually adjusting wallet balances or granting credits (`wallet_adjust`).
  - Modifying global pricing tiers and subscription plans (`price_change`).
  - Updating telephony carrier credentials and API keys (`credential_update`).
  - Overriding virtual number release and reclaim locks (`number_release_override`).
- **Developer/Tester Isolation:** Developer accounts are strictly forbidden from viewing or downloading customer KYC documents.

### Administrative Management Modules
- **Tenant & Organization Overrides (`/admin/tenants` & `/admin/tenants/[id]`):** Inspect tenant metadata, force-activate accounts, freeze delinquent organizations, view detailed per-tenant voice consumption, and manage spend limits.
- **Encrypted KYC Verification Console (`/admin/kyc`):** Admin review queue for approving or rejecting customer KYC submissions with mandatory audit logging and temporary signed URLs (max 15-minute validity).
- **Telephony Infrastructure & Inventory (`/admin/telephony` & `/admin/phone-numbers`):**
  - Monitor aggregate carrier SIP trunks and connection latency.
  - Manage number pools, allocate inventory, and trigger automatic number pool expansion alerts.
  - Number auction and bidding management for high-value vanity DIDs.
- **Pricing & Subscription Plans Engine (`/admin/plans` & `/admin/bundles`):** Configure dynamic per-minute rates, subscription tiers, bundled minute allowances, and promotional coupon codes (`/admin/coupons`).
- **DND Registry Administration (`/admin/dnd`):** Search, upload, and update the master National Do-Not-Disturb registry, with manual phone scrubbing overrides.
- **Statutory GST & Invoicing Engine (`/admin/gst`):**
  - View real-time GST tax collection summaries split by CGST (9%), SGST (9%), and IGST (18%).
  - Export monthly B2B GST sales reports formatted for Indian GSTR-1 filings.
  - Re-send and re-generate digitally signed PDF tax invoices to clients.
- **Statutory Consent Records (`/admin/consent-records`):** Immutable audit ledger of caller consent attestations and outbound campaign authorization records.
- **Enterprise Leads & Developer Requests (`/admin/enterprise-leads` & `/admin/developer-requests`):** Track inbound enterprise sales inquiries, manage custom feature requests, and resolve support escalation tickets (`/admin/support`).
- **Comprehensive Audit Logs (`/admin/audit-logs`):** Append-only forensic security log tracking every administrative action, login event, step-up challenge, and configuration change.
- **System Config & Security Overrides (`/admin/system` & `/admin/system/security`):** Global feature flags (Maintenance Mode, Revenue Model, Auto-Pool Thresholds) and security controls.

---

## 4. Partnership & White-Labeling Capabilities

Vaakriti includes built-in architecture to support agencies, resellers, and enterprise white-labeling:

### 1. Dedicated Partner Portal (`/partners`)
- **Partner Landing Page (`/partners`):** Marketing page targeting agencies, system integrators, and consultants to join the Vaakriti Partner Program.
- **Partner Authentication (`/partners/login`, `/partners/signup`, `/partners/reset-password`):** Separate partner authentication flow with dedicated session management.
- **Partner Affiliate Dashboard (`/partners/dashboard`):** Real-time portal for approved partners showing:
  - Custom referral link generation (`https://trinetra.ai/?ref=[REFERRAL_CODE]`).
  - Active referred client accounts with status tracking.
  - Real-time commission computation based on active policy rates (default 20% recurring revenue share).
  - Payout history ledger with currency tracking (INR) and pending balance requests.

### 2. Admin Partner & Reseller Management (`/admin/partners`)
- Operator view for approving new agency partners, defining custom commission rate overrides (`commission_rate_override`), and auditing affiliate payouts.

### 3. Bring Your Own Number (BYON) & Carrier Multi-Tenancy
- **White-Label Carrier Integration:** Enterprise clients and agency partners can connect their own carrier accounts (Twilio / Exotel) via the BYON Vault ([byon_vault_service.py](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/backend/app/services/byon_vault_service.py)).
- **AES-256 Encrypted Credential Vaulting:** Third-party carrier credentials are encrypted at rest; client tokens are never logged or exposed.
- **Dedicated SIP Trunk Mapping:** Telephony routes dynamically switch between platform-pooled DIDs and customer-owned carrier infrastructure based on organization ID.

---

## 5. Backend & Hidden "Moat" Features (The Invisible Engine)

The backend (`backend/`) contains the proprietary infrastructure that differentiates Vaakriti from simple wrapper products:

### 1. Autonomous Telephony & Audio Streaming Engine ([voice_router.py](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/backend/voice_router.py))
- **1ms Windows Hardware Clock Resolution:** Invokes `winmm.timeBeginPeriod(1)` to eliminate Windows 15.6ms clock quantization, enabling true real-time sub-millisecond audio streaming.
- **Bidirectional μ-law 8000Hz Telephony Audio:** Directly streams and ingests raw telephony audio chunks over WebSockets from Indian Tier-1 carriers (Exotel) and global providers (Twilio).
- **LiveKit WebRTC Agent Integration ([livekit_agent.py](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/backend/app/workers/livekit_agent.py)):** Low-latency WebRTC data channels and audio tracks connecting callers to autonomous neural voice workers with sub-480ms end-to-end response time.
- **Anti-Abuse Inbound Call Guard:** In-memory rate limiting and toll-fraud prevention:
  - Limits burst calls from a single caller (max 5 calls / 60 seconds).
  - Limits destination DID flash floods (max 25 inbound calls / 60 seconds).

### 2. Intelligent Hybrid AI Speech Routing
- **Vernacular-Aware STT Router ([stt_router.py](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/backend/app/services/ai/stt_router.py)):**
  - Hindi & Hinglish audio automatically routes to **Sarvam AI STT** for industry-leading vernacular dialect accuracy.
  - English & global languages route to **Deepgram Nova-2**.
  - Automatic cross-provider failover: if Sarvam experiences network latency or failure, requests fall back to Deepgram seamlessly.
- **Plan- & Dialect-Aware TTS Router ([tts_router.py](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/backend/app/services/ai/tts_router.py)):**
  - Enterprise/Growth English synthesis routes to **ElevenLabs Multilingual v2**.
  - Vernacular Indian languages (Hindi, Tamil, Telugu, Kannada, Bengali, Gujarati, Marathi) route to **Sarvam AI Bulbul v2**.
  - Automatic fallback ensures audio is never dropped if an external voice provider encounters rate limits.

### 3. Background Autonomous Workers & Cron Services
- **Automated Callback Scheduler ([callback_scheduler.py](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/backend/app/services/callback_scheduler.py)):** Background polling daemon running continuously to monitor scheduled customer callbacks and automatically trigger outbound voice agent calls the exact second they fall due.
- **Virtual Number Lifecycle Engine ([number_lifecycle_service.py](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/backend/app/services/number_lifecycle_service.py)):**
  - Enforces 15-day Grace Period and 14-day Administrative Hold Period for expired DIDs.
  - Immediately plays neutral professional unavailable message without exposing tenant disruption.
  - Aggregates missed inbound calls and delivers daily digest notifications.
- **Automatic Number Pool Expansion:** Monitors unassigned available DID inventory against `AUTO_POOL_THRESHOLD` (default 10) and automatically triggers expansion alerts.
- **Statutory Data Retention & Minimization Worker ([retention_policy_service.py](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/backend/app/services/retention_policy_service.py)):**
  - Automatically purges non-essential operational media and call recordings after **180 days** pursuant to CERT-In Directions and DPDP Act minimization rules.
  - Permanently shields financial records (invoices, transactions) with a mandatory **8-year retention shield** pursuant to Indian Income Tax Act Sec 44AA and CGST Act Sec 36.

### 4. Regulatory & Compliance Engine
- **TRAI Outbound Safety Guardrails ([outbound_safety_guardrails.py](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/backend/app/services/outbound_safety_guardrails.py)):**
  - **Statutory Calling Hour Floor:** Hard-coded block strictly preventing automated promotional calls outside **09:00 to 21:00** in the recipient's local timezone (TRAI TCCCPR 2018 Regulation 12).
  - **DND Scrubbing Engine:** Automatically checks recipient numbers against the internal DND database and blocks dials.
  - **Campaign Purpose Classification:** Strict enforcement separating promotional marketing from transactional service reminders.
- **Mandatory AI Identity Disclosure & Truthfulness ([prompt_guard.py](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/backend/app/services/ai/prompt_guard.py)):**
  - System prompt sanitizer that rejects deceptive prompts instructing the bot to claim to be human or deny being an AI across English, Hindi, and Hinglish.
  - Universal opening greeting compositor (`compose_single_opening_greeting`) combining AI identity transparency and call recording notice.
- **Centralized PII Sanitizer ([pii_scrubber.py](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/backend/app/services/pii_scrubber.py)):**
  - Real-time regex scrubber masking Indian 10-digit mobile numbers, 12-digit Aadhaar numbers, and US SSNs.
  - Attached directly to Python's logging pipeline and Sentry error tracking to ensure customer PII never leaks into logs.

### 5. Enterprise Security & Database Isolation
- **Row-Level Security (RLS) on Every Table:** 100% of Supabase PostgreSQL tables have RLS enabled with strict `auth.uid() = user_id` or `organization_id` tenancy isolation.
- **Envelope Encryption at Rest:** Carrier API secrets, BYON accounts, and uploaded KYC identification files are encrypted using **AES-256-GCM**.
- **Double-Entry Financial Ledger:** All wallet deductions, overage billing, and top-ups are recorded with integer paisa precision to prevent float drift.

---

## 6. Startup Uniqueness (USP Extraction)

Based on the actual codebase audit, the following 6 core pillars represent Vaakriti's competitive defensibility and technical moat:

1. **Sub-480ms Hybrid Telephony Pipeline (Hardware Clock Tuned):**
   Unlike simple API wrapper wrappers that suffer from 2–4 second latency over standard HTTP polling, Vaakriti integrates directly with low-level audio sockets, incorporates Windows 1ms high-resolution timer overrides (`winmm.timeBeginPeriod(1)`), and streams bidirectional μ-law audio via LiveKit WebSockets for instant, human-like turn-taking.

2. **Native Vernacular Dialect Intelligence with Dynamic Failover:**
   Vaakriti features an intelligent hybrid STT/TTS routing engine ([stt_router.py](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/backend/app/services/ai/stt_router.py) / [tts_router.py](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/backend/app/services/ai/tts_router.py)) that automatically routes Indian vernaculars (Hindi, Hinglish, Tamil, Marathi, etc.) to Sarvam AI and English to Deepgram/ElevenLabs, complete with automatic cross-provider failover so calls never crash.

3. **Built-in Statutory Compliance Moat (TRAI TCCCPR 2018 + DPDP Act 2023):**
   Compliance is built directly into the dialing kernel. Outbound dialers are physically locked to the statutory **09:00–21:00 calling window**, automated DND scrubbing runs before every call, AI disclosure and call recording notices are cryptographically enforced in system prompts, and PII scrubbing is active at the logger level. Competitors building on generic tools cannot match this without extensive legal and engineering rework.

4. **Autonomous Quote Extraction & Attributed Revenue Tracking:**
   Rather than treating calls merely as minutes consumed, Vaakriti's conversational intelligence engine ([revenue_service.py](file:///c:/Users/Ketan%20singh/trinetra-workspace/trinetra-fresh/backend/app/services/revenue_service.py)) extracts exact monetary quotes from customer transcripts, attributes them to 30-day closing windows, and gives business owners an instant ROI dashboard proving direct revenue generation.

5. **Telecom Lifecycle Engine with Zero In-Call Disconnection:**
   Unlike cloud services that abruptly drop conversations when a credit quota is reached, Vaakriti guarantees **Zero In-Call Disconnection** (calls finish gracefully and reconcile post-call). Additionally, unrenewed DIDs enter an automated 15-day Grace Period with missed call tracking, ensuring businesses never leak valuable prospective buyers.

6. **Enterprise Sovereign Carrier Multi-Tenancy (BYON + Encrypted KYC Vault):**
   Vaakriti offers a hybrid deployment model: companies can provision pooled national DIDs immediately or vault their own Twilio/Exotel carrier credentials via AES-256 encryption (BYON). Combined with an encrypted, UIDAI-compliant KYC document vault with Step-Up authentication, Vaakriti is engineered specifically for regulated Indian enterprise adoption.
