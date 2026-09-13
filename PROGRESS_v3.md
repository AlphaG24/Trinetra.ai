### **Phase 0 — Stabilize the Voice Stack (Blocking Everything)**
> **Goal:** Make a real outbound call from a Campaign actually connect to the selected agent and speak naturally. Fix webcalls.

| # | Task | Status | Details |
|---|------|--------|---------|
| 0.1 | **Fix Twilio outbound → LiveKit agent** | ✅ COMPLETED | Twilio webhook streams call audio to LiveKit room and runs background VikramAgent. |
| 0.2 | **Fix webcall (WebRTC)** | ✅ COMPLETED | Fixed WebRTC Expressive TTS wrapper initialization and ensured usage quota decrements on disconnect. |
| 0.3 | **Verify call transcript storage** | ✅ COMPLETED | Transcript, duration, sentiment, and leads are extracted and saved on call completion, updating existing record to prevent duplicates. |
| 0.4 | **Error logging** | ✅ COMPLETED | Added rich logs in FastAPI, telephony, and agent execution. |

---

### **Phase 1 — Real Outbound Campaigns**
> **Goal:** User uploads CSV, starts campaign, agent dials numbers using Twilio (verified numbers for trial) and talks like the demo.

| # | Task | Status | Details |
|---|------|--------|---------|
| 1.1 | **Pass contact data to agent** | ✅ COMPLETED | Campaign service queries contact parameters and passes them via call query string webhooks. |
| 1.2 | **Rewrite sales/support prompts** | ✅ COMPLETED | VikramAgent includes Objection handling, feature explanations, custom trial CTA. |
| 1.3 | **Personalize every call** | ✅ COMPLETED | Prompt dynamically appends contact name, company name, notes context with safe empty fallbacks. |
| 1.4 | **Callback scheduling from campaign call** | ✅ COMPLETED | VikramAgent parses callback requests from transcript and inserts into callbacks table. |
| 1.5 | **Lead extraction** | ✅ COMPLETED | extract_and_save_lead parses transcript for intent, creates leads, and links to campaign. |
| 1.6 | **Real-time progress** | ✅ COMPLETED | Dialer updates contact statuses, increments leads_generated and called counters. |

---

### **Phase 2 — Number Pool, Bidding & Lifecycle Management**
> **Goal:** Admin lists pool numbers, users purchase or bid via Razorpay, numbers get assigned to agents, and renewal/release lifecycles are enforced.

| # | Task | Status | Details |
|---|------|--------|---------|
| 2.1 | **Number pool table & schema** | ✅ COMPLETED | `phone_numbers` table enhanced with `is_assigned`, `assigned_org_id`, `assigned_agent_id`, `retail_price_paisa`, `renewal_date`, and `bidding_enabled`. |
| 2.2 | **Admin pool management & provisioning** | ✅ COMPLETED | Admin can provision Twilio numbers, set retail prices, toggle bidding, and list them in the available pool. |
| 2.3 | **User purchase via Razorpay** | ✅ COMPLETED | Users purchase numbers from available pool via Razorpay checkout; ownership links to organization and sets 30-day `renewal_date`. |
| 2.4 | **Assignment to agent** | ✅ COMPLETED | Users can assign/unassign numbers to their voice agents directly from dashboard. |
| 2.5 | **Number Bidding / Auction system** | ✅ COMPLETED | Users can place bids on active numbers; if owner fails to renew, top bidder gets 24-hour priority purchase window. |
| 2.6 | **Bundled purchase flow** | ✅ COMPLETED | Agent + Number bundles handled via checkout and auto-provisioning. |
| 2.7 | **Manual 30-Day Renewal** | ✅ COMPLETED | Working via `/api/phone-numbers/[id]/renew` + Razorpay webhook extending `renewal_date` by +30 days. |
| 2.8 | **Universal Auto-Release on Non-Renewal** | ✅ COMPLETED | `/api/cron/process-auctions` handles both bidding auctions and universal auto-release of standard expired phone numbers back to the pool. |
| 2.9 | **Pre-Expiration Alerts & Dignity Quota Guarantee** | ✅ COMPLETED | Configurable `validity_days` in admin. Automatic 3-day and 24-hour alerts for phone numbers and voice agents via existing `notifications` table. Trinetra Dignity Quota Guarantee preserves active voice minutes even after timeline expiry. |
| 2.10 | **Domestic Telephony Architecture** | ✅ COMPLETED | Full Exotel carrier integration with dynamic DB credential management via Admin Portal (`/admin/telephony`), Indian virtual number pooling, assignment to agents, outbound calling & webhook routing. |
| 2.11 | **Database Audit & Dead Table Cleanup** | ✅ COMPLETED | Cleaned 13 legacy MSME/scheme tables (`schemes`, `msme_app_config`, `user_matches`, etc.) and structured lifecycle columns (`validity_days`, `subscription_expires_at`, `expiry_alerts_sent`). |


---

### **Phase 3 — Inbound Support Agent & Customer DB**
> **Goal:** Inbound calls to a user's number handled by their agent, with personalization and customer database updates.

| # | Task | Status | Details |
|---|------|--------|---------|
| 3.1 | **Inbound call → agent & Concurrency Guard** | ✅ COMPLETED | Twilio & Exotel inbound webhooks resolve assigned agent from `phone_numbers`. Includes 10-call concurrency limit per organization (auto-hangup with "All agents are busy" TwiML/ExoML & busy logging to prevent abuse). |
| 3.2 | **Caller recognition & Greeting Memory** | ✅ COMPLETED | On inbound call, `CallerLookupService.lookup_caller` queries `customer_contacts`. Returning callers are greeted by name (*"Namaste Rahul ji!"*) and their previous calls count, last contact date, and past inquiry notes are injected into agent memory. |
| 3.3 | **Update customer DB** | ✅ COMPLETED | Post-call pipeline (`extract_and_save_lead` + `CallerLookupService.upsert_from_call`) extracts caller details (name, email, company, summary) and upserts them into `customer_contacts`, updating `total_calls` and notes history. |
| 3.4 | **Post-call notification & Call Recording** | ✅ COMPLETED | Immediate Telegram & Dashboard post-call notification dispatched via `NotificationService.dispatch` with caller info, duration, summary, and sentiment. Twilio & Exotel call recording enabled with dedicated callbacks storing `recording_url` in `voice_calls.recording_url`. |
| 3.5 | **Support vs Sales Multi-Personality** | ✅ COMPLETED | Multi-personality intent switching via `IntentClassifier` and `PromptService` actively classifies caller utterances and dynamically transitions system prompt between support and consultative sales in real time. |

---

### **Phase 4 — Notifications & Reports**
> **Goal:** Instant lead/campaign reports via Telegram/WhatsApp + dashboard real-time updates.

| # | Task | Status | Details |
|---|------|--------|---------|
| 4.1 | **Campaign report** | ✅ COMPLETED | Upgraded `CampaignService.dispatch_campaign_report` with connection/conversion metrics and auto-dispatch upon campaign completion (Twilio & Exotel webhooks) or on-demand via `POST /api/campaigns/{id}/send-report` to Telegram, WhatsApp, and in-app bell. |
| 4.2 | **Welcome message to interested client** | ✅ COMPLETED | Implemented `IntegrationExecutor.dispatch_interested_followup`, automatically sending warm personalized welcome and next-step messages via WhatsApp/SMS to interested prospects when captured during voice calls. |
| 4.3 | **Lead alert** | ✅ COMPLETED | Triggered real-time `new_lead` alerts via `NotificationService.dispatch` with prospect name, phone, company, interest level, budget, and summary directly to user's Telegram and dashboard notification bell. |
| 4.4 | **Dashboard real-time** | ✅ COMPLETED | Connected Supabase Realtime subscriptions to `voice_calls`, `leads`, and `campaigns` tables in `dashboard/page.tsx`, automatically triggering `mutateOverview()` so KPIs, conversion charts, and recent activity reflect live changes instantly. |

---

### **Phase 5 — Developer/Marketing Account (Deferred to Post-MVP)**
> **Goal:** A second "developer" account with extra permissions to manage marketing/demo calls, forms, and numbers.

| # | Task | Status | Details |
|---|------|--------|---------|
| 5.1 | **Role-based permissions** | ⏸️ SKIPPED (Post-MVP) | Deferred to post-client acquisition release to keep team focused on core MVP pipeline. |
| 5.2 | **Homepage "Talk to Anika" form** | ⏸️ SKIPPED (Post-MVP) | Deferred to post-client acquisition release. |
| 5.3 | **Marketing dashboard** | ⏸️ SKIPPED (Post-MVP) | Deferred to post-client acquisition release. |

---

### **Phase 6 — The "Joe Girard Engine" (Top-of-Mind Lifecycle Nurturing & Referral Automation)**
> **Inspiration:** Joe Girard (Guinness World Record for World's Greatest Salesman — 13,000+ cars sold by staying top-of-mind with every lead through consistent occasion cards & relationship warmth).
> **Goal:** Transform Trinetra AI from a one-time dialer into an automated lifelong relationship & referral-generating machine for any business.

| # | Task | Status | Details |
|---|------|--------|---------|
| 6.1 | **Occasion & Festival Nurture Scheduler** | 📋 PLANNED | Scheduled engine that automatically sends personalized warm WhatsApp / SMS greetings (Diwali, New Year, Eid, Birthdays, Milestones) to *all* past leads (cold, closed, or open) with zero pitch. |
| 6.2 | **Zero-Pitch "Care Ping" Voice Call** | 📋 PLANNED | Low-friction 30-second AI check-in call scheduled 30/60 days after initial contact to keep the business top-of-mind (*"Sir, koi pitch nahi hai, bas ek quick check-in tha ki aapka kaam kaisa chal raha hai"*). |
| 6.3 | **Automated Referral Generator** | 📋 PLANNED | When lead sentiment is positive or after successful onboarding/appointment, agent naturally triggers referral request (*"Agar aapke circle me kisi ko automated voice agent ki need ho, toh unka contact zaroor share kijiyega"*). |
| 6.4 | **Reactivation Campaign Pipeline** | 📋 PLANNED | Automatic transition of "cold / not interested" leads into a 90-day re-engagement funnel with new offers or relevant value drops. |

---

### **Phase 7 — Production Hardening, Client Whitelabeling & Security**
> **Goal:** Bridge the gap from MVP prototype to enterprise-ready, white-labeled client SaaS with zero trial branding, sub-second latency, and bank-grade security.

| # | Task | Status | Details |
|---|------|--------|---------|
| 7.1 | **Client Whitelabeling (Dynamic Business Branding)** | 📋 PLANNED | Replace all fallback "Trinetra" tags in customer-facing notifications, SMS, and WhatsApp messages with dynamic `{{business_name}}` extracted from agent and profile. End customers will only see their local business name. |
| 7.2 | **Admin Dynamic Pricing & Per-Agent Price Cards** | 📋 PLANNED | Enable Super Admin to set custom price cards/amounts per agent or custom billing quotes (instead of hardcoded ₹4,999/mo). Implement strict 30-day pre-call blocking on expired subscriptions and exhausted quotas. |
| 7.3 | **Security Hardening (AES-256-GCM & Audit Logging)** | 📋 PLANNED | Upgrade AES-256-CBC to authenticated AES-256-GCM with authentication tags. Add permanent admin action audit logging (`admin_audit_logs`) capturing all config overrides and verify DPDP non-deletable consent logs. |
| 7.4 | **Real Voice Cloning Integration** | 📋 PLANNED | Replace the mock `cloned-xxxx` string generator in `/api/agents/[id]/clone-voice` with direct multipart upload to ElevenLabs `/v1/voices/add` API, returning real cloned voice IDs. |
| 7.5 | **Production Infrastructure & Domestic Telephony** | 📋 PLANNED | Transition from local ngrok to Cloud VM in India (AWS Mumbai `ap-south-1` or DigitalOcean Bangalore `blr1`) for sub-second voice latency. Connect paid Twilio / Exotel DLT numbers to eliminate carrier trial prompts, and configure LiveKit SIP trunking. |

---

### **Immediate Next Actions**
1. **Kick off Phase 6** — The "Joe Girard Engine" (Occasion nurture scheduler, zero-pitch care pings, automated referral generation, and cold lead reactivation).
2. **Execute Phase 7** — Production Hardening, Client Whitelabeling, Admin Custom Pricing, Real Voice Cloning, and Security.



